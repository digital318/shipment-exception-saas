import type { CarrierKey } from "@/lib/types";
import type { CarrierProvider } from "./carrier-provider";
import { resolveCarrierKey } from "./carrier-provider";
import { estesProvider } from "./estes-provider";
import { fedexProvider } from "./fedex-provider";
import { odflProvider } from "./odfl-provider";
import { saiaProvider } from "./saia-provider";
import { upsProvider } from "./ups-provider";
import { xpoProvider } from "./xpo-provider";

export {
  CARRIER_DISPLAY_NAMES,
  generateTrackingNumber,
  mapCarrierStatusToShipmentStatus,
  resolveCarrierKey,
  type CarrierProvider,
  type CarrierTrackingSnapshot,
} from "./carrier-provider";

export { getTrackingSnapshot } from "./mock-responses";

const providers: Record<CarrierKey, CarrierProvider> = {
  ups: upsProvider,
  fedex: fedexProvider,
  xpo: xpoProvider,
  odfl: odflProvider,
  estes: estesProvider,
  saia: saiaProvider,
};

export const ALL_CARRIER_KEYS: CarrierKey[] = [
  "ups",
  "fedex",
  "xpo",
  "odfl",
  "estes",
  "saia",
];

export function getCarrierProvider(key: CarrierKey): CarrierProvider {
  return providers[key];
}

export function getCarrierProviderForName(carrierName: string): CarrierProvider | null {
  const key = resolveCarrierKey(carrierName);
  return key ? providers[key] : null;
}

export {
  estesProvider,
  fedexProvider,
  odflProvider,
  saiaProvider,
  upsProvider,
  xpoProvider,
};
