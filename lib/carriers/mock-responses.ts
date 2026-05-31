import type { CarrierKey, CarrierShipmentEvent, CarrierStatus } from "@/lib/types";
import type { CarrierProvider, CarrierTrackingSnapshot } from "./carrier-provider";

const MOCK_STATUSES: CarrierStatus[] = [
  "In Transit",
  "Delayed",
  "Out for Delivery",
  "Delivered",
  "Exception",
];

const MOCK_LOCATIONS = [
  "Chicago, IL hub",
  "Nashville, TN terminal",
  "Dallas, TX cross-dock",
  "Memphis, TN sort facility",
  "Indianapolis, IN yard",
  "Atlanta, GA distribution center",
];

const EXCEPTION_DESCRIPTIONS: Record<CarrierKey, string[]> = {
  ups: [
    "Delivery attempt failed — consignee unavailable",
    "Damaged freight reported at terminal",
    "Customs hold — documentation incomplete",
  ],
  fedex: [
    "Weather delay — route suspended",
    "Address correction required",
    "Freight refused at delivery",
  ],
  xpo: [
    "Missed linehaul connection",
    "Terminal congestion — outbound delay",
    "Pro number re-rate pending",
  ],
  odfl: [
    "Appointment missed — dock closed",
    "Overweight shipment — re-weigh required",
    "Consignee contact failed",
  ],
  estes: [
    "Liftgate required — not scheduled",
    "Hazmat paperwork missing",
    "Delivery window expired",
  ],
  saia: [
    "Address verification failed",
    "Freight held for inspection",
    "Consignee refused delivery",
  ],
};

function hashCode(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function pickStatus(trackingNumber: string, carrierKey: CarrierKey): CarrierStatus {
  const hash = hashCode(`${carrierKey}:${trackingNumber}`);
  const index = hash % MOCK_STATUSES.length;
  return MOCK_STATUSES[index]!;
}

function buildEvents(
  trackingNumber: string,
  carrierKey: CarrierKey,
  status: CarrierStatus,
): CarrierShipmentEvent[] {
  const hash = hashCode(trackingNumber);
  const now = Date.now();
  const events: CarrierShipmentEvent[] = [];

  const eventCount = 3 + (hash % 3);
  for (let i = eventCount - 1; i >= 0; i--) {
    const eventStatus =
      i === 0 ? status : MOCK_STATUSES[(hash + i) % (MOCK_STATUSES.length - 1)]!;
    const hoursAgo = (eventCount - i) * 6 + (hash % 4);
    events.push({
      timestamp: new Date(now - hoursAgo * 3_600_000).toISOString(),
      status: eventStatus,
      location: MOCK_LOCATIONS[(hash + i) % MOCK_LOCATIONS.length]!,
      description:
        eventStatus === "Exception"
          ? EXCEPTION_DESCRIPTIONS[carrierKey][hash % EXCEPTION_DESCRIPTIONS[carrierKey].length]!
          : `${eventStatus} — scan recorded`,
    });
  }

  return events.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}

function buildEstimatedDelivery(status: CarrierStatus, trackingNumber: string): string | null {
  if (status === "Delivered") return null;
  const hash = hashCode(trackingNumber);
  const daysOut = 1 + (hash % 4);
  const eta = new Date();
  eta.setDate(eta.getDate() + daysOut);
  eta.setHours(9 + (hash % 8), 0, 0, 0);
  return eta.toISOString();
}

function buildActualDelivery(status: CarrierStatus, trackingNumber: string): string | null {
  if (status !== "Delivered") return null;
  const hash = hashCode(trackingNumber);
  const delivered = new Date();
  delivered.setHours(delivered.getHours() - (hash % 48));
  return delivered.toISOString();
}

export function buildMockTrackingSnapshot(
  trackingNumber: string,
  carrierKey: CarrierKey,
): CarrierTrackingSnapshot {
  const status = pickStatus(trackingNumber, carrierKey);
  const events = buildEvents(trackingNumber, carrierKey, status);

  return {
    status,
    estimatedDelivery: buildEstimatedDelivery(status, trackingNumber),
    actualDelivery: buildActualDelivery(status, trackingNumber),
    events,
    lastUpdate: new Date().toISOString(),
  };
}

export function createMockProvider(carrierKey: CarrierKey, name: string): CarrierProvider {
  async function snapshot(trackingNumber: string): Promise<CarrierTrackingSnapshot> {
    await delay(40 + (hashCode(trackingNumber) % 80));
    return buildMockTrackingSnapshot(trackingNumber, carrierKey);
  }

  return {
    key: carrierKey,
    name,
    getShipmentStatus: async (trackingNumber) => (await snapshot(trackingNumber)).status,
    getEstimatedDelivery: async (trackingNumber) =>
      (await snapshot(trackingNumber)).estimatedDelivery,
    getShipmentEvents: async (trackingNumber) => (await snapshot(trackingNumber)).events,
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getTrackingSnapshot(
  provider: CarrierProvider,
  trackingNumber: string,
): Promise<CarrierTrackingSnapshot> {
  const [status, estimatedDelivery, events] = await Promise.all([
    provider.getShipmentStatus(trackingNumber),
    provider.getEstimatedDelivery(trackingNumber),
    provider.getShipmentEvents(trackingNumber),
  ]);

  return {
    status,
    estimatedDelivery,
    actualDelivery: status === "Delivered" ? new Date().toISOString() : null,
    events,
    lastUpdate: new Date().toISOString(),
  };
}
