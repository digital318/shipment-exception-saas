import type {
  DbActivityEventWithRelations,
  DbCustomer,
  DbExceptionWithRelations,
  DbShipmentWithCustomer,
} from "@/lib/database.types";
import type {
  ActivityItem,
  ActivityType,
  Customer,
  ExceptionRecord,
  InternalNote,
  IssueStatus,
  Severity,
  Shipment,
  ShipmentStatus,
} from "@/lib/types";
import { formatDisplayDate, formatRelativeTime, subtractHours } from "./format";

const CUSTOMER_ENRICHMENT: Record<
  string,
  { tier: Customer["tier"]; region: string; displayId: string }
> = {
  "Meridian Industrial Supply": {
    tier: "Enterprise",
    region: "Southeast",
    displayId: "CUS-001",
  },
  "Summit Automotive Parts": {
    tier: "Enterprise",
    region: "Midwest",
    displayId: "CUS-002",
  },
  "Coastal Retail Group": {
    tier: "Growth",
    region: "West",
    displayId: "CUS-003",
  },
  "NorthStar Medical Devices": {
    tier: "Enterprise",
    region: "Northeast",
    displayId: "CUS-004",
  },
  "Atlas Construction Supply": {
    tier: "Growth",
    region: "Southeast",
    displayId: "CUS-005",
  },
  "Pacific Home Goods": {
    tier: "Standard",
    region: "West",
    displayId: "CUS-006",
  },
  "Greenfield Foods Co-op": {
    tier: "Growth",
    region: "West",
    displayId: "CUS-007",
  },
  "Vertex Electronics": {
    tier: "Standard",
    region: "South",
    displayId: "CUS-008",
  },
  "Harbor Textiles": {
    tier: "Standard",
    region: "Southeast",
    displayId: "CUS-009",
  },
  "Lakeside Pharma": {
    tier: "Enterprise",
    region: "Northeast",
    displayId: "CUS-010",
  },
};

function inferMode(carrier: string): string {
  if (carrier.includes("Intermodal")) return "Intermodal";
  if (carrier === "Schneider National") return "FTL";
  if (carrier === "Werner Enterprises") return "Reefer";
  return "LTL";
}

function defaultExceptionText(status: ShipmentStatus): string {
  switch (status) {
    case "Delivered":
      return "Delivery confirmed";
    case "Delayed":
      return "ETA revision pending";
    case "Exception":
      return "Exception under review";
    default:
      return "On schedule — monitoring in transit";
  }
}

function buildExceptionIdMap(rows: DbExceptionWithRelations[]): Map<string, string> {
  const sorted = [...rows].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  const map = new Map<string, string>();
  sorted.forEach((row, index) => {
    map.set(row.id, `EXC-${4381 + index}`);
  });
  return map;
}

export function mapExceptionNote(note: {
  id: string;
  author: string;
  note: string;
  created_at: string;
}): InternalNote {
  return {
    id: note.id,
    author: note.author,
    body: note.note,
    createdAt: formatDisplayDate(note.created_at),
  };
}

export function mapExceptionRecord(
  row: DbExceptionWithRelations,
  displayId: string,
): ExceptionRecord {
  const shipment = row.shipment;
  const customerName = shipment?.customer?.name ?? "Unknown customer";
  const route =
    shipment != null
      ? `${shipment.origin} → ${shipment.destination}`
      : "Route unavailable";

  return {
    id: displayId,
    dbId: row.id,
    shipmentId: shipment?.shipment_number ?? row.shipment_id,
    title: row.title,
    customer: customerName,
    carrier: shipment?.carrier ?? "Unknown carrier",
    route,
    severity: row.severity as Severity,
    status: row.status as IssueStatus,
    owner: row.owner,
    delayReason: row.delay_reason ?? "—",
    openedAt: formatDisplayDate(row.created_at),
    updatedAt: formatRelativeTime(row.updated_at),
    resolvedAt: row.resolved_at ? formatDisplayDate(row.resolved_at) : undefined,
    internalNotes: (row.exception_notes ?? [])
      .sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
      .map(mapExceptionNote),
  };
}

export function mapExceptionRecords(rows: DbExceptionWithRelations[]): ExceptionRecord[] {
  const idMap = buildExceptionIdMap(rows);
  return rows
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map((row) => mapExceptionRecord(row, idMap.get(row.id) ?? row.id.slice(0, 8)));
}

export function mapShipmentRow(
  row: DbShipmentWithCustomer,
  exception?: ExceptionRecord,
): Shipment {
  const status = row.status as ShipmentStatus;
  const delayHours = row.delay_hours;
  const originalEtaIso =
    delayHours != null && delayHours > 0
      ? subtractHours(row.eta, delayHours)
      : row.eta;

  return {
    id: row.shipment_number,
    customer: row.customer?.name ?? "Unknown customer",
    carrier: row.carrier,
    mode: inferMode(row.carrier),
    origin: row.origin,
    destination: row.destination,
    eta: formatDisplayDate(row.eta),
    originalEta: formatDisplayDate(originalEtaIso),
    delayHours,
    delayReason: exception?.delayReason ?? (delayHours != null ? "Operational delay" : "—"),
    severity:
      exception?.severity ??
      (delayHours != null && delayHours > 24
        ? "Critical"
        : delayHours != null && delayHours > 8
          ? "High"
          : "Low"),
    status,
    issueStatus: exception?.status ?? (status === "Delivered" ? "Resolved" : "Open"),
    exception:
      exception != null
        ? exception.status === "Resolved"
          ? `Resolved — ${exception.title}`
          : exception.title
        : defaultExceptionText(status),
  };
}

export function mapShipments(
  rows: DbShipmentWithCustomer[],
  exceptions: ExceptionRecord[],
): Shipment[] {
  const byShipmentId = new Map<string, ExceptionRecord>();
  for (const exc of exceptions) {
    if (!byShipmentId.has(exc.shipmentId)) {
      byShipmentId.set(exc.shipmentId, exc);
    }
  }

  return rows
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .map((row) => mapShipmentRow(row, byShipmentId.get(row.shipment_number)));
}

function inferActivityActor(
  eventType: string,
  message: string,
  owner: string,
): string {
  if (eventType === "escalation" || eventType === "alert") return "System";
  if (message.includes("FedEx") || message.includes("JB Hunt") || message.includes("Carrier")) {
    return "Carrier API";
  }
  const knownOwners = ["Sarah Chen", "Marcus Webb", "Lisa Park"];
  const matched = knownOwners.find((name) => message.includes(name));
  if (matched) return matched;
  if (owner && owner !== "System") return owner;
  return "System";
}

export function mapActivityEvent(row: DbActivityEventWithRelations): ActivityItem {
  const owner = row.exception?.owner ?? "System";
  const shipmentId = row.exception?.shipment?.shipment_number ?? null;

  return {
    time: formatRelativeTime(row.created_at),
    actor: inferActivityActor(row.event_type, row.message, owner),
    event: row.message,
    shipmentId,
    type: row.event_type as ActivityType,
  };
}

export function mapActivityEvents(rows: DbActivityEventWithRelations[]): ActivityItem[] {
  return rows
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map(mapActivityEvent);
}

export function mapCustomer(
  row: DbCustomer,
  stats: { activeShipments: number; exceptions: number },
): Customer {
  const enrichment = CUSTOMER_ENRICHMENT[row.name];
  const tier =
    enrichment?.tier ??
    (row.sla_target_percent >= 97
      ? "Enterprise"
      : row.sla_target_percent >= 93
        ? "Growth"
        : "Standard");

  return {
    id: enrichment?.displayId ?? row.id.slice(0, 8).toUpperCase(),
    dbId: row.id,
    name: row.name,
    contactName: row.contact_name,
    contactEmail: row.contact_email,
    tier,
    accountManager: row.contact_name,
    activeShipments: stats.activeShipments,
    exceptions: stats.exceptions,
    slaTarget: Number(row.sla_target_percent),
    region: enrichment?.region ?? "North America",
  };
}

export function extractCarriers(shipments: Shipment[]): string[] {
  return [...new Set(shipments.map((s) => s.carrier))].sort();
}
