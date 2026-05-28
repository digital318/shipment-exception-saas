import { shipmentRows as mockShipments } from "@/lib/mock-data";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import type { DbShipmentWithCustomer } from "@/lib/database.types";
import type { ExceptionRecord, Shipment } from "@/lib/types";
import { extractCarriers, mapShipments } from "./mappers";
import type { DataResult } from "./types";

async function fetchShipmentRowsFromSupabase(): Promise<DbShipmentWithCustomer[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("shipments")
    .select(
      `
      *,
      customer:customers (
        id,
        name,
        contact_name,
        sla_target_percent
      )
    `,
    )
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as DbShipmentWithCustomer[];
}

export async function fetchShipments(
  exceptions: ExceptionRecord[] = [],
): Promise<DataResult<Shipment[]>> {
  if (!isSupabaseConfigured()) {
    return { data: mockShipments, source: "mock" };
  }

  try {
    const rows = await fetchShipmentRowsFromSupabase();
    return { data: mapShipments(rows, exceptions), source: "supabase" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load shipments.";
    return { data: mockShipments, source: "mock", error: message };
  }
}

export async function fetchCarriers(
  shipments: Shipment[],
): Promise<string[]> {
  return extractCarriers(shipments);
}
