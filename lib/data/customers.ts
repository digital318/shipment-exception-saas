import { customers as mockCustomers } from "@/lib/mock-data";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import type { DbCustomer, DbShipment } from "@/lib/database.types";
import type { Customer } from "@/lib/types";
import { mapCustomer } from "./mappers";
import {
  logOrganizationCustomerComparison,
  readOrganizationId,
  resolveOrganizationId,
} from "./resolve-organization-id";
import type { DataResult } from "./types";

const LOG_PREFIX = "[FreightPulse] fetchCustomers";

type CustomerStats = {
  activeShipments: number;
  exceptions: number;
};

function aggregateCustomerStats(
  shipments: Pick<DbShipment, "customer_id" | "status">[],
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

function mapCustomerRows(
  rows: DbCustomer[],
  stats: Map<string, CustomerStats>,
): Customer[] {
  return rows.map((row) =>
    mapCustomer(row, stats.get(row.id) ?? { activeShipments: 0, exceptions: 0 }),
  );
}

function normalizeDbCustomer(row: Record<string, unknown>): DbCustomer {
  return {
    id: String(row.id ?? ""),
    organization_id: readOrganizationId(row as DbCustomer),
    name: String(row.name ?? ""),
    contact_name: String(row.contact_name ?? ""),
    contact_email: String(row.contact_email ?? ""),
    sla_target_percent: Number(row.sla_target_percent ?? 0),
    created_at: String(row.created_at ?? new Date().toISOString()),
  };
}

async function loadCustomerStats(
  supabase: ReturnType<typeof getSupabaseClient>,
  organizationId: string,
): Promise<Map<string, CustomerStats>> {
  try {
    const [shipmentsResult, exceptionsResult] = await Promise.all([
      supabase
        .from("shipments")
        .select("customer_id, status")
        .eq("organization_id", organizationId),
      supabase
        .from("exceptions")
        .select("id, shipment:shipments(customer_id)")
        .eq("organization_id", organizationId)
        .neq("status", "Resolved"),
    ]);

    const exceptionCounts = new Map<string, number>();
    for (const row of exceptionsResult.data ?? []) {
      const shipment = row.shipment as { customer_id?: string } | null;
      const customerId = shipment?.customer_id;
      if (!customerId) continue;
      exceptionCounts.set(customerId, (exceptionCounts.get(customerId) ?? 0) + 1);
    }

    return aggregateCustomerStats(
      (shipmentsResult.data ?? []) as Pick<DbShipment, "customer_id" | "status">[],
      exceptionCounts,
    );
  } catch (error) {
    console.warn(LOG_PREFIX, "stats queries failed — returning customers without stats", error);
    return new Map();
  }
}

async function fetchCustomersFromSupabase(
  organizationId: string,
): Promise<Customer[]> {
  const supabase = getSupabaseClient();

  console.info(LOG_PREFIX, "query start", {
    organization_id: organizationId,
    organizationId,
  });

  await logOrganizationCustomerComparison(supabase, organizationId);

  const customersResult = await supabase
    .from("customers")
    .select("*")
    .eq("organization_id", organizationId)
    .order("name");

  console.info(LOG_PREFIX, "customers query result", {
    organization_id: organizationId,
    error: customersResult.error?.message ?? null,
    status: customersResult.status,
    count: customersResult.data?.length ?? 0,
    rows: customersResult.data?.map((row) => ({
      id: row.id,
      name: row.name,
      organization_id: row.organization_id,
    })),
  });

  if (customersResult.error) {
    console.error(LOG_PREFIX, "customers query error", customersResult.error);
    throw customersResult.error;
  }

  let customerRows = (customersResult.data ?? []).map((row) =>
    normalizeDbCustomer(row as Record<string, unknown>),
  );

  if (customerRows.length === 0) {
    const rlsResult = await supabase.from("customers").select("*").order("name");
    console.info(LOG_PREFIX, "RLS-only customers fallback", {
      organization_id: organizationId,
      error: rlsResult.error?.message ?? null,
      count: rlsResult.data?.length ?? 0,
      organization_ids: [
        ...new Set((rlsResult.data ?? []).map((r) => r.organization_id)),
      ],
    });

    if (!rlsResult.error && rlsResult.data?.length) {
      customerRows = rlsResult.data
        .map((row) => normalizeDbCustomer(row as Record<string, unknown>))
        .filter(
          (row) =>
            !row.organization_id || row.organization_id === organizationId,
        );

      if (customerRows.length === 0) {
        customerRows = rlsResult.data.map((row) =>
          normalizeDbCustomer(row as Record<string, unknown>),
        );
      }
    }
  }

  const stats = await loadCustomerStats(supabase, organizationId);
  const mapped = mapCustomerRows(customerRows, stats);

  console.info(LOG_PREFIX, "mapped customers", {
    organization_id: organizationId,
    count: mapped.length,
    names: mapped.map((c) => c.name),
  });

  return mapped;
}

export async function fetchCustomers(
  organizationId?: string | null,
): Promise<DataResult<Customer[]>> {
  if (!isSupabaseConfigured()) {
    console.info(LOG_PREFIX, "using mock data (supabase not configured)");
    return { data: mockCustomers, source: "mock" };
  }

  const supabase = getSupabaseClient();
  const resolvedOrganizationId = await resolveOrganizationId(supabase, organizationId);

  console.info(LOG_PREFIX, "organization context", {
    passedOrganizationId: organizationId ?? null,
    passed_organization_id: organizationId ?? null,
    resolvedOrganizationId,
    resolved_organization_id: resolvedOrganizationId,
  });

  if (!resolvedOrganizationId) {
    console.warn(LOG_PREFIX, "no organization_id — returning empty customer list");
    return {
      data: [],
      source: "supabase",
      error: "Could not resolve organization for the signed-in user.",
    };
  }

  try {
    const data = await fetchCustomersFromSupabase(resolvedOrganizationId);
    return { data, source: "supabase" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load customers.";
    console.error(LOG_PREFIX, "fetch failed", message);
    return { data: mockCustomers, source: "mock", error: message };
  }
}
