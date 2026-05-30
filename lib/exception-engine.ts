import type { Severity, ShipmentStatus } from "@/lib/types";

export type ExceptionDetectionRule =
  | "delay_critical"
  | "delay_high"
  | "status_delayed";

export type ShipmentForDetection = {
  shipmentNumber: string;
  shipmentUuid?: string;
  status: ShipmentStatus;
  delayHours: number | null;
  carrier: string;
  customer: string;
  origin: string;
  destination: string;
};

export type ExceptionDetectionResult = {
  shipmentNumber: string;
  shipmentUuid?: string;
  severity: Severity;
  title: string;
  delayReason: string;
  rule: ExceptionDetectionRule;
};

export type AutoDetectedAlert = {
  id: string;
  shipmentId: string;
  title: string;
  severity: Severity;
  detail: string;
  since: string;
  rule: ExceptionDetectionRule;
};

function buildDelayReason(delayHours: number, carrier: string): string {
  return `Shipment delayed ${delayHours} hours beyond original ETA — ${carrier} lane impact under review`;
}

function buildStatusDelayReason(carrier: string, origin: string, destination: string): string {
  return `${carrier} reported delayed status on ${origin} → ${destination} lane`;
}

/**
 * Evaluate a single shipment against Phase 5A detection rules.
 * Returns null when no exception should be created.
 */
export function evaluateShipmentForException(
  shipment: ShipmentForDetection,
  hasOpenException: boolean,
): ExceptionDetectionResult | null {
  if (hasOpenException) return null;
  if (shipment.status === "Delivered") return null;

  const delay = shipment.delayHours ?? 0;

  if (delay > 24) {
    return {
      shipmentNumber: shipment.shipmentNumber,
      shipmentUuid: shipment.shipmentUuid,
      severity: "Critical",
      title: `Critical delay — ${delay} hours behind schedule`,
      delayReason: buildDelayReason(delay, shipment.carrier),
      rule: "delay_critical",
    };
  }

  if (delay > 8) {
    return {
      shipmentNumber: shipment.shipmentNumber,
      shipmentUuid: shipment.shipmentUuid,
      severity: "High",
      title: `High-priority delay — ${delay} hours behind schedule`,
      delayReason: buildDelayReason(delay, shipment.carrier),
      rule: "delay_high",
    };
  }

  if (shipment.status === "Delayed") {
    return {
      shipmentNumber: shipment.shipmentNumber,
      shipmentUuid: shipment.shipmentUuid,
      severity: "Medium",
      title: "Shipment marked delayed — ETA revision pending",
      delayReason: buildStatusDelayReason(
        shipment.carrier,
        shipment.origin,
        shipment.destination,
      ),
      rule: "status_delayed",
    };
  }

  return null;
}

export function evaluateShipmentsForExceptions(
  shipments: ShipmentForDetection[],
  openExceptionShipmentNumbers: Set<string>,
): ExceptionDetectionResult[] {
  const results: ExceptionDetectionResult[] = [];

  for (const shipment of shipments) {
    const hasOpen = openExceptionShipmentNumbers.has(shipment.shipmentNumber);
    const detection = evaluateShipmentForException(shipment, hasOpen);
    if (detection) {
      results.push(detection);
    }
  }

  return results;
}

export function toAutoDetectedAlert(
  detection: ExceptionDetectionResult,
  since = "Just now",
): AutoDetectedAlert {
  return {
    id: `AUTO-${detection.shipmentNumber}`,
    shipmentId: detection.shipmentNumber,
    title: detection.title,
    severity: detection.severity,
    detail: detection.delayReason,
    since,
    rule: detection.rule,
  };
}
