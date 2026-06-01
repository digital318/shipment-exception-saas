/** Demo customers supported in the customer portal selector (Phase 7A). */
export const PORTAL_CUSTOMER_NAMES = [
  "Atlas Construction Supply",
  "Summit Automotive Parts",
  "Coastal Retail Group",
  "Meridian Industrial Supply",
  "Pacific Home Goods",
  "Harbor Textiles",
  "NorthStar Medical Devices",
  "Greenfield Foods Co-op",
  "Lakeside Pharma",
  "Vertex Electronics",
] as const;

export type PortalCustomerName = (typeof PORTAL_CUSTOMER_NAMES)[number];

export const DEFAULT_PORTAL_CUSTOMER: PortalCustomerName = "Atlas Construction Supply";

export const PORTAL_CUSTOMER_STORAGE_KEY = "freightpulse-portal-customer";
