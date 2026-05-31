import type { CarrierKey, CarrierShipmentEvent, CarrierStatus } from "@/lib/types";

export type CarrierTrackingSnapshot = {
  status: CarrierStatus;
  estimatedDelivery: string | null;
  actualDelivery: string | null;
  events: CarrierShipmentEvent[];
  lastUpdate: string;
};

export interface CarrierProvider {
  readonly key: CarrierKey;
  readonly name: string;
  getShipmentStatus(trackingNumber: string): Promise<CarrierStatus>;
  getEstimatedDelivery(trackingNumber: string): Promise<string | null>;
  getShipmentEvents(trackingNumber: string): Promise<CarrierShipmentEvent[]>;
}

export const CARRIER_DISPLAY_NAMES: Record<CarrierKey, string> = {
  ups: "UPS Freight",
  fedex: "FedEx Freight",
  xpo: "XPO Logistics",
  odfl: "Old Dominion Freight",
  estes: "Estes Express",
  saia: "Saia LTL Freight",
};

/** Maps shipment carrier text to a registered provider key. */
export function resolveCarrierKey(carrierName: string): CarrierKey | null {
  const normalized = carrierName.trim().toLowerCase();
  if (!normalized) return null;

  for (const [key, displayName] of Object.entries(CARRIER_DISPLAY_NAMES)) {
    if (normalized === displayName.toLowerCase()) {
      return key as CarrierKey;
    }
  }

  if (normalized.includes("ups") || normalized.includes("united parcel")) return "ups";
  if (normalized.includes("fedex")) return "fedex";
  if (normalized.includes("xpo")) return "xpo";
  if (normalized.includes("old dominion") || normalized.includes("odfl")) return "odfl";
  if (normalized.includes("estes")) return "estes";
  if (normalized.includes("saia")) return "saia";
  return null;
}

export function mapCarrierStatusToShipmentStatus(
  carrierStatus: CarrierStatus,
): "In Transit" | "Delayed" | "Delivered" | "Exception" {
  switch (carrierStatus) {
    case "Exception":
      return "Exception";
    case "Delivered":
      return "Delivered";
    case "Delayed":
      return "Delayed";
    default:
      return "In Transit";
  }
}

export function generateTrackingNumber(shipmentNumber: string, carrierKey: CarrierKey): string {
  const suffix = shipmentNumber.replace(/\D/g, "").slice(-8);
  const prefixes: Record<CarrierKey, string> = {
    ups: "1Z",
    fedex: "FX",
    xpo: "XP",
    odfl: "OD",
    estes: "ES",
    saia: "SA",
  };
  return `${prefixes[carrierKey]}${suffix.padStart(10, "0")}`;
}
