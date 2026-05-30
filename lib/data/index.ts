import { fetchCustomers } from "./customers";
import { fetchExceptionsBundle } from "./exceptions";
import { fetchCarriers, fetchShipments } from "./shipments";
import type { AppDataSnapshot, DataSource } from "./types";
import type { ActivityItem, Customer, ExceptionRecord, Shipment } from "@/lib/types";

export type { AppDataSnapshot } from "./types";
export {
  runExceptionDetection,
  runInMemoryExceptionDetection,
  type DetectionRunResult,
} from "./exception-detection";
export {
  evaluateShipmentForException,
  evaluateShipmentsForExceptions,
  type ExceptionDetectionResult,
  type AutoDetectedAlert,
} from "@/lib/exception-engine";

export async function fetchAppData(organizationId?: string): Promise<AppDataSnapshot> {
  const exceptionsBundle = await fetchExceptionsBundle();
  const shipmentsResult = await fetchShipments(exceptionsBundle.data.exceptions);
  const customersResult = await fetchCustomers(organizationId);

  const source: DataSource =
    exceptionsBundle.source === "supabase" &&
    shipmentsResult.source === "supabase" &&
    customersResult.source === "supabase"
      ? "supabase"
      : "mock";

  const errors = [
    exceptionsBundle.error,
    shipmentsResult.error,
    customersResult.error,
  ].filter(Boolean);

  return {
    shipments: shipmentsResult.data,
    customers: customersResult.data,
    carriers: await fetchCarriers(shipmentsResult.data),
    exceptions: exceptionsBundle.data.exceptions,
    activity: exceptionsBundle.data.activity,
    source,
    error: errors.length > 0 ? errors.join(" ") : undefined,
  };
}
