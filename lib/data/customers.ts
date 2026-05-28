import { customers as mockCustomers } from "@/lib/mock-data";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import type { DbCustomer, DbShipment } from "@/lib/database.types";
import type { Customer } from "@/lib/types";
import { mapCustomer } from "./mappers";
import type { DataResult } from "./types";

type CustomerStats = {
  activeShipments: number;
  exceptions: number;
};

function aggregateCustomerStats(
  shipments: DbShipment[],
  exceptionCounts: Map<string, number>,
): Map<string, CustomerStats> {
  const stats = new Map<string, CustomerStats>();

  for (const shipment of shipments) {
    const current = stats.get(shipment.customer_id) ?? {
      activeShipments: 0,
      exceptions: 0,
    };
    if (shipment.status !== "Delivered") {
      current.activeShipments += 1;
    }
    stats.set(shipment.customer_id, current);
  }

  for (const [customerId, count] of exceptionCounts) {
    const current = stats.get(customerId) ?? {
      activeShipments: 0,
      exceptions: 0,
    };
    current.exceptions = count;
    stats.set(customerId, current);
  }

  return stats;
}

async function fetchCustomersFromSupabase(): Promise<Customer[]> {
  const supabase = getSupabaseClient();

  const [customersResult, shipmentsResult, exceptionsResult] = await Promise.all([
    supabase.from("customers").select("*").order("name"),
    supabase.from("shipments").select("id, customer_id, status"),
    supabase
      .from("exceptions")
      .select("id, shipment_id, status, shipment:shipments(customer_id)")
      .neq("status", "Resolved"),
  ]);

  if (customersResult.error) throw customersResult.error;
  if (shipmentsResult.error) throw shipmentsResult.error;
  if (exceptionsResult.error) throw exceptionsResult.error;

  const exceptionCounts = new Map<string, number>();
  for (const row of exceptionsResult.data ?? []) {
    const shipment = row.shipment as { customer_id?: string } | null;
    const customerId = shipment?.customer_id;
    if (!customerId) continue;
    exceptionCounts.set(customerId, (exceptionCounts.get(customerId) ?? 0) + 1);
  }

  const stats = aggregateCustomerStats(
    (shipmentsResult.data ?? []) as DbShipment[],
    exceptionCounts,
  );

  return ((customersResult.data ?? []) as DbCustomer[]).map((row) =>
    mapCustomer(row, stats.get(row.id) ?? { activeShipments: 0, exceptions: 0 }),
  );
}

export async function fetchCustomers(): Promise<DataResult<Customer[]>> {
  if (!isSupabaseConfigured()) {
    return { data: mockCustomers, source: "mock" };
  }

  try {
    const data = await fetchCustomersFromSupabase();
    return { data, source: "supabase" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load customers.";
    return { data: mockCustomers, source: "mock", error: message };
  }
}
