import { resolvedSeverityStyle, severityStyles } from "./styles";
import type { ExceptionRecord, InternalNote, Shipment } from "./types";

export function formatNowLabel(): string {
  return "Just now";
}

export function formatOpenedAt(): string {
  const d = new Date();
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function generateExceptionId(existing: ExceptionRecord[]): string {
  const nums = existing
    .map((e) => parseInt(e.id.replace("EXC-", ""), 10))
    .filter((n) => !Number.isNaN(n));
  const next = nums.length ? Math.max(...nums) + 1 : 4400;
  return `EXC-${next}`;
}

export function generateNoteId(): string {
  return `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function isActiveException(exc: ExceptionRecord): boolean {
  return exc.status !== "Resolved";
}

export function getActiveExceptionShipmentIds(exceptions: ExceptionRecord[]): string[] {
  return exceptions.filter(isActiveException).map((e) => e.shipmentId);
}

export function getShipmentsEligibleForException(
  shipments: Shipment[],
  exceptions: ExceptionRecord[],
): Shipment[] {
  const activeShipmentIds = new Set(getActiveExceptionShipmentIds(exceptions));
  return shipments.filter((s) => !activeShipmentIds.has(s.id));
}

export function getExceptionSeverityDisplay(exc: ExceptionRecord): {
  label: string;
  className: string;
} {
  if (exc.status === "Resolved") {
    return { label: "Resolved", className: resolvedSeverityStyle };
  }
  return { label: exc.severity, className: severityStyles[exc.severity] };
}

export function getShipmentSeverityDisplay(
  shipment: Pick<Shipment, "severity" | "issueStatus">,
): { label: string; className: string } {
  if (shipment.issueStatus === "Resolved") {
    return { label: "Resolved", className: resolvedSeverityStyle };
  }
  return { label: shipment.severity, className: severityStyles[shipment.severity] };
}

export function enrichShipmentWithException(
  shipment: Shipment,
  exception?: ExceptionRecord,
): Shipment {
  if (!exception) return shipment;
  return {
    ...shipment,
    severity: exception.severity,
    issueStatus: exception.status,
    exception:
      exception.status === "Resolved"
        ? `Resolved — ${exception.title}`
        : exception.title,
  };
}

export function buildExceptionFromShipment(
  shipment: Shipment,
  partial: Pick<ExceptionRecord, "id" | "title" | "severity" | "delayReason" | "owner" | "status">,
): Omit<ExceptionRecord, "internalNotes" | "resolvedAt"> & {
  internalNotes: InternalNote[];
} {
  return {
    ...partial,
    shipmentId: shipment.id,
    customer: shipment.customer,
    carrier: shipment.carrier,
    route: `${shipment.origin} → ${shipment.destination}`,
    openedAt: formatOpenedAt(),
    updatedAt: formatNowLabel(),
    source: "Manual",
    internalNotes: [],
  };
}
