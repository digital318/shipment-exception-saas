"use client";

import { DashboardShell } from "@/components/dashboard-shell";
import { CustomerRiskSection } from "@/components/executive/customer-risk-section";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState, LoadingState } from "@/components/ui/data-state";
import { SyncStatus } from "@/components/ui/sync-status";
import { useOrganization } from "@/context/organization-context";
import { useExecutiveMetrics } from "@/hooks/use-executive-metrics";
import { useSlaIntelligence } from "@/hooks/use-sla-intelligence";
import type { DbCustomer } from "@/lib/database.types";
import { getSupabaseClient } from "@/lib/supabase";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  cardSurface,
  riskLevelBadgeLabels,
  riskLevelStyles,
  sectionLabel,
} from "@/lib/styles";
import { useEffect, useMemo, useState } from "react";

/**
 * Trace — Customers page data path:
 * 1. resolveOrganizationId() → user_profiles.organization_id (snake_case DB column)
 * 2. supabase.from("customers").select("*").eq("organization_id", orgId)
 * 3. setCustomers(rawRows) → render table directly from `customers` state
 *
 * SLA columns merged from useSlaIntelligence().customerMetrics when available.
 */

type CustomerRow = {
  id: string;
  name: string;
  contactName: string;
  contactEmail: string;
  slaTarget: number;
  onTimePercent: number;
  totalShipments: number;
  delayedShipments: number;
  deliveredShipments: number;
  riskLevel: "green" | "yellow" | "red";
  gapFromTarget: number;
};

async function resolveOrganizationId(): Promise<string | null> {
  const supabase = getSupabaseClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  console.info("[FreightPulse] CustomersPage — auth user", {
    userId: user?.id ?? null,
    authError: authError?.message ?? null,
  });

  if (!user) return null;

  for (const column of ["id", "user_id"] as const) {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq(column, user.id)
      .maybeSingle();

    console.info("[FreightPulse] CustomersPage — user_profiles lookup", {
      column,
      error: error?.message ?? null,
      organization_id: data?.organization_id ?? null,
    });

    if (error) continue;
    if (data?.organization_id) return data.organization_id as string;
  }

  return null;
}

function gapColor(gap: number) {
  if (gap >= 0) return "text-emerald-400";
  if (gap >= -3) return "text-amber-400";
  return "text-rose-400";
}

function slaColor(riskLevel: CustomerRow["riskLevel"]) {
  if (riskLevel === "green") return "text-emerald-400";
  if (riskLevel === "yellow") return "text-amber-400";
  return "text-rose-400";
}

export function CustomersPage() {
  const { profile } = useOrganization();
  const { customerMetrics } = useSlaIntelligence();
  const { customerRiskProfiles } = useExecutiveMetrics();

  const [customers, setCustomers] = useState<DbCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [queryOrgId, setQueryOrgId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadCustomers() {
      setLoading(true);
      setError(null);

      if (!isSupabaseConfigured()) {
        console.warn("[FreightPulse] CustomersPage — supabase not configured");
        setLoading(false);
        return;
      }

      const supabase = getSupabaseClient();

      const profileOrgId = profile?.organizationId ?? null;
      const resolvedOrgId = profileOrgId ?? (await resolveOrganizationId());

      console.info("[FreightPulse] CustomersPage — current user organization_id", {
        profileOrganizationId: profileOrgId,
        resolvedOrganizationId: resolvedOrgId,
      });

      if (!resolvedOrgId) {
        if (!cancelled) {
          setError("Could not read organization_id from user_profiles.");
          setLoading(false);
        }
        return;
      }

      if (cancelled) return;
      setQueryOrgId(resolvedOrgId);

      const { data, error: queryError, status } = await supabase
        .from("customers")
        .select("*")
        .eq("organization_id", resolvedOrgId)
        .order("name");

      console.info("[FreightPulse] CustomersPage — raw customers query result", {
        organization_id: resolvedOrgId,
        rawCount: data?.length ?? 0,
        supabaseStatus: status,
        supabaseError: queryError?.message ?? null,
        rows: data?.map((r) => ({
          id: r.id,
          name: r.name,
          organization_id: r.organization_id,
        })),
      });

      if (queryError) {
        if (!cancelled) {
          setError(queryError.message);
          setCustomers([]);
          setLoading(false);
        }
        return;
      }

      const rawRows = data ?? [];
      console.info("[FreightPulse] CustomersPage — post-query filtering", {
        beforeFilterCount: rawRows.length,
        afterFilterCount: rawRows.length,
        filterApplied: "none — rendering all rows returned by Supabase",
      });

      if (!cancelled) {
        setCustomers(rawRows);
        setLoading(false);
        console.info("[FreightPulse] CustomersPage — setCustomers count", rawRows.length);
      }
    }

    void loadCustomers();

    return () => {
      cancelled = true;
    };
  }, [profile?.organizationId]);

  const metricsByName = useMemo(
    () => new Map(customerMetrics.map((m) => [m.customerName, m])),
    [customerMetrics],
  );

  const rows: CustomerRow[] = useMemo(
    () =>
      customers.map((c) => {
        const metric = metricsByName.get(c.name);
        return {
          id: c.id,
          name: c.name,
          contactName: c.contact_name,
          contactEmail: c.contact_email,
          slaTarget: Number(c.sla_target_percent),
          onTimePercent: metric?.onTimePercent ?? 0,
          totalShipments: metric?.totalShipments ?? 0,
          delayedShipments: metric?.delayedShipments ?? 0,
          deliveredShipments: metric?.deliveredShipments ?? 0,
          riskLevel: metric?.riskLevel ?? "green",
          gapFromTarget: metric?.gapFromTarget ?? 0,
        };
      }),
    [customers, metricsByName],
  );

  useEffect(() => {
    console.info("[FreightPulse] CustomersPage — render state", {
      queryOrgId,
      customersStateCount: customers.length,
      rowCount: rows.length,
      loading,
      error,
    });
  }, [queryOrgId, customers.length, rows.length, loading, error]);

  const hasData = customers.length > 0;
  const syncState = loading ? "syncing" : error ? "error" : "live";

  return (
    <DashboardShell
      eyebrow="Account management"
      title="Customers"
      description={
        loading
          ? "Loading customer accounts…"
          : `${customers.length} accounts · SLA performance and risk overview`
      }
      actions={<SyncStatus state={syncState} />}
    >
      <div className="space-y-8">
      <div className={`${cardSurface} overflow-hidden`}>
        {loading ? (
          <LoadingState
            title="Loading customers"
            description="Fetching organization-scoped accounts and SLA metrics…"
          />
        ) : error && !hasData ? (
          <ErrorState description={error} onRetry={() => window.location.reload()} />
        ) : !hasData ? (
          <EmptyState
            title="No customers yet"
            description="Customer accounts will appear here once they are added to your organization."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-zinc-900/60">
                <tr className="border-b border-white/[0.06]">
                  {[
                    "Customer",
                    "Contact",
                    "Email",
                    "SLA target",
                    "Actual SLA",
                    "Total",
                    "Delayed",
                    "Delivered",
                    "Risk",
                    "Gap",
                  ].map((h) => (
                    <th key={h} className={`px-6 py-3.5 text-left ${sectionLabel}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="transition-colors duration-150 hover:bg-white/[0.025]"
                  >
                    <td className="px-6 py-4">
                      <p className="text-[13px] font-medium text-white">{row.name}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-zinc-600">{row.id}</p>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-[13px] text-zinc-300">
                      {row.contactName}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-[13px] text-zinc-400">
                      {row.contactEmail}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 tabular-nums text-[13px] text-zinc-400">
                      {row.slaTarget.toFixed(1)}%
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-zinc-800">
                          <div
                            className={`h-full rounded-full ${
                              row.riskLevel === "green"
                                ? "bg-emerald-500"
                                : row.riskLevel === "yellow"
                                  ? "bg-amber-500"
                                  : "bg-rose-500"
                            }`}
                            style={{ width: `${Math.min(100, row.onTimePercent)}%` }}
                          />
                        </div>
                        <span
                          className={`tabular-nums text-[13px] font-semibold ${slaColor(row.riskLevel)}`}
                        >
                          {row.onTimePercent.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 tabular-nums text-[13px] text-zinc-300">
                      {row.totalShipments}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 tabular-nums text-[13px] text-amber-400/90">
                      {row.delayedShipments}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 tabular-nums text-[13px] text-emerald-400/90">
                      {row.deliveredShipments}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className={riskLevelStyles[row.riskLevel]}>
                        {riskLevelBadgeLabels[row.riskLevel]}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={`tabular-nums text-[13px] font-semibold ${gapColor(row.gapFromTarget)}`}
                      >
                        {row.gapFromTarget >= 0 ? "+" : ""}
                        {row.gapFromTarget.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && hasData && (
        <CustomerRiskSection profiles={customerRiskProfiles} />
      )}
      </div>
    </DashboardShell>
  );
}
