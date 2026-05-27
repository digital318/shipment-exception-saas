import type { IssueStatus, Severity, Shipment, ShipmentStatus } from "./types";

export type ShipmentSortField = "eta" | "severity" | "delayHours";
export type SortDirection = "asc" | "desc";

export type SavedViewId =
  | "critical-only"
  | "delayed"
  | "awaiting-carrier"
  | "resolved";

export type ShipmentFilterState = {
  query: string;
  status: ShipmentStatus | "All";
  severity: Severity | "All";
  carrier: string;
  issueStatus: IssueStatus | "All";
  sortBy: ShipmentSortField;
  sortDir: SortDirection;
  activeSavedView: SavedViewId | null;
};

export type FilterableShipment = Pick<
  Shipment,
  | "id"
  | "customer"
  | "carrier"
  | "origin"
  | "destination"
  | "eta"
  | "severity"
  | "status"
  | "issueStatus"
  | "delayHours"
  | "exception"
>;

export const DEFAULT_SHIPMENT_FILTERS: ShipmentFilterState = {
  query: "",
  status: "All",
  severity: "All",
  carrier: "All",
  issueStatus: "All",
  sortBy: "eta",
  sortDir: "asc",
  activeSavedView: null,
};

export const SHIPMENT_STATUSES: Array<ShipmentStatus | "All"> = [
  "All",
  "In Transit",
  "Delayed",
  "Exception",
  "Delivered",
];

export const SHIPMENT_SEVERITIES: Array<Severity | "All"> = [
  "All",
  "Critical",
  "High",
  "Medium",
  "Low",
];

export const SAVED_VIEWS: {
  id: SavedViewId;
  label: string;
  preset: Omit<ShipmentFilterState, "sortBy" | "sortDir" | "activeSavedView">;
}[] = [
  {
    id: "critical-only",
    label: "Critical Only",
    preset: {
      query: "",
      status: "All",
      severity: "Critical",
      carrier: "All",
      issueStatus: "All",
    },
  },
  {
    id: "delayed",
    label: "Delayed",
    preset: {
      query: "",
      status: "Delayed",
      severity: "All",
      carrier: "All",
      issueStatus: "All",
    },
  },
  {
    id: "awaiting-carrier",
    label: "Awaiting Carrier",
    preset: {
      query: "",
      status: "All",
      severity: "All",
      carrier: "All",
      issueStatus: "Awaiting Carrier",
    },
  },
  {
    id: "resolved",
    label: "Resolved",
    preset: {
      query: "",
      status: "All",
      severity: "All",
      carrier: "All",
      issueStatus: "Resolved",
    },
  },
];

const SEVERITY_RANK: Record<Severity, number> = {
  Critical: 4,
  High: 3,
  Medium: 2,
  Low: 1,
};

function parseEta(eta: string): number {
  const normalized = eta.replace(" · ", " ");
  const ts = Date.parse(normalized);
  return Number.isNaN(ts) ? 0 : ts;
}

function severitySortValue(shipment: FilterableShipment): number {
  if (shipment.issueStatus === "Resolved") return 0;
  return SEVERITY_RANK[shipment.severity];
}

function delaySortValue(shipment: FilterableShipment): number {
  return shipment.delayHours ?? -1;
}

export function matchesShipmentQuery(
  shipment: FilterableShipment,
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    shipment.id.toLowerCase().includes(q) ||
    shipment.customer.toLowerCase().includes(q) ||
    shipment.origin.toLowerCase().includes(q) ||
    shipment.destination.toLowerCase().includes(q) ||
    shipment.carrier.toLowerCase().includes(q) ||
    shipment.exception.toLowerCase().includes(q)
  );
}

export function matchesShipmentSeverity(
  shipment: FilterableShipment,
  severity: Severity | "All",
): boolean {
  if (severity === "All") return true;
  if (shipment.issueStatus === "Resolved") return false;
  return shipment.severity === severity;
}

export function matchesShipmentFilters(
  shipment: FilterableShipment,
  filters: ShipmentFilterState,
): boolean {
  if (!matchesShipmentQuery(shipment, filters.query)) return false;
  if (filters.status !== "All" && shipment.status !== filters.status) return false;
  if (!matchesShipmentSeverity(shipment, filters.severity)) return false;
  if (filters.carrier !== "All" && shipment.carrier !== filters.carrier) return false;
  if (
    filters.issueStatus !== "All" &&
    shipment.issueStatus !== filters.issueStatus
  ) {
    return false;
  }
  return true;
}

export function sortShipments<T extends FilterableShipment>(
  rows: T[],
  sortBy: ShipmentSortField,
  sortDir: SortDirection,
): T[] {
  const sorted = [...rows].sort((a, b) => {
    let cmp = 0;
    switch (sortBy) {
      case "eta":
        cmp = parseEta(a.eta) - parseEta(b.eta);
        break;
      case "severity":
        cmp = severitySortValue(a) - severitySortValue(b);
        break;
      case "delayHours":
        cmp = delaySortValue(a) - delaySortValue(b);
        break;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });
  return sorted;
}

export function filterAndSortShipments<T extends FilterableShipment>(
  rows: T[],
  filters: ShipmentFilterState,
): T[] {
  const filtered = rows.filter((row) => matchesShipmentFilters(row, filters));
  return sortShipments(filtered, filters.sortBy, filters.sortDir);
}

export function countActiveShipmentFilters(filters: ShipmentFilterState): number {
  let count = 0;
  if (filters.query.trim()) count++;
  if (filters.status !== "All") count++;
  if (filters.severity !== "All") count++;
  if (filters.carrier !== "All") count++;
  if (filters.issueStatus !== "All") count++;
  return count;
}

export function computeStatusCounts<T extends FilterableShipment>(
  rows: T[],
  filters: ShipmentFilterState,
): Record<string, number> {
  const scoped = rows.filter((row) => {
    const withoutStatus = { ...filters, status: "All" as const };
    return matchesShipmentFilters(row, withoutStatus);
  });
  const counts: Record<string, number> = { All: scoped.length };
  SHIPMENT_STATUSES.slice(1).forEach((status) => {
    counts[status] = scoped.filter((row) => row.status === status).length;
  });
  return counts;
}

export function computeSeverityCounts<T extends FilterableShipment>(
  rows: T[],
  filters: ShipmentFilterState,
): Record<string, number> {
  const scoped = rows.filter((row) => {
    const withoutSeverity = { ...filters, severity: "All" as const };
    return matchesShipmentFilters(row, withoutSeverity);
  });
  const counts: Record<string, number> = { All: scoped.length };
  SHIPMENT_SEVERITIES.slice(1).forEach((severity) => {
    counts[severity] = scoped.filter(
      (row) =>
        row.issueStatus !== "Resolved" && row.severity === severity,
    ).length;
  });
  return counts;
}

export function getSavedViewPreset(id: SavedViewId): ShipmentFilterState {
  const view = SAVED_VIEWS.find((v) => v.id === id);
  if (!view) return { ...DEFAULT_SHIPMENT_FILTERS };
  return {
    ...DEFAULT_SHIPMENT_FILTERS,
    ...view.preset,
    activeSavedView: id,
  };
}
