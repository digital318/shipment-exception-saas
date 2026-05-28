"use client";

import { useMemo } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { ShipmentFiltersBar } from "@/components/shipments/shipment-filters-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState, LoadingState } from "@/components/ui/data-state";
import { MockExportButton } from "@/components/ui/mock-export-button";
import { SyncStatus } from "@/components/ui/sync-status";
import { useShipments } from "@/context/exceptions-context";
import { useShipmentFilters } from "@/hooks/use-shipment-filters";
import { cardHeader, cardSurface, sectionLabel, statusBadgeStyles } from "@/lib/styles";

export function ShipmentsPage() {
  const { shipments, carriers, loading, error, source, refresh } = useShipments();
  const {
    filters,
    activeFilterCount,
    setQuery,
    setStatus,
    setSeverity,
    setCarrier,
    setSort,
    setSortDir,
    applySavedView,
    clearFilters,
    applyRows,
    getStatusCounts,
    getSeverityCounts,
  } = useShipmentFilters();

  const filtered = useMemo(() => applyRows(shipments), [applyRows, shipments]);
  const statusCounts = useMemo(
    () => getStatusCounts(shipments),
    [getStatusCounts, shipments],
  );
  const severityCounts = useMemo(
    () => getSeverityCounts(shipments),
    [getSeverityCounts, shipments],
  );

  const syncState = loading ? "syncing" : error && source === "mock" ? "error" : "live";

  return (
    <DashboardShell
      eyebrow="Fleet operations"
      title="Shipments"
      description={
        loading
          ? "Loading shipments…"
          : `${filtered.length} of ${shipments.length} shipments in view${
              activeFilterCount > 0
                ? ` · ${activeFilterCount} filter${activeFilterCount === 1 ? "" : "s"} active`
                : ""
            }`
      }
      actions={<SyncStatus state={syncState} />}
    >
      <div className={`${cardSurface} overflow-hidden`}>
        <div className={cardHeader}>
          <div>
            <h2 className="text-sm font-semibold text-white">All shipments</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Search, filter, and sort the full fleet board
            </p>
          </div>
          <MockExportButton
            label="Export"
            disabled={loading || filtered.length === 0}
            emptyMessage="Filter has no rows to export"
          />
        </div>

        {loading ? (
          <LoadingState
            title="Loading shipments"
            description="Fetching fleet records from Supabase…"
          />
        ) : error && shipments.length === 0 ? (
          <ErrorState description={error} onRetry={() => void refresh()} />
        ) : shipments.length === 0 ? (
          <EmptyState
            title="No shipments yet"
            description="Shipments will appear here once they are synced to FreightPulse."
          />
        ) : (
          <>
            <ShipmentFiltersBar
              filters={filters}
              activeFilterCount={activeFilterCount}
              carriers={carriers}
              statusCounts={statusCounts}
              severityCounts={severityCounts}
              onQueryChange={setQuery}
              onStatusChange={setStatus}
              onSeverityChange={setSeverity}
              onCarrierChange={setCarrier}
              onSortChange={setSort}
              onSortDirToggle={() =>
                setSortDir(filters.sortDir === "asc" ? "desc" : "asc")
              }
              onSavedView={applySavedView}
              onClearFilters={clearFilters}
            />

            {filtered.length === 0 ? (
              <EmptyState
                title="No shipments match"
                description="Try adjusting your search, filters, or saved view to find shipments."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-zinc-900/60">
                    <tr className="border-b border-white/[0.06]">
                      {["Shipment", "Customer", "Route", "Carrier", "ETA", "Status"].map(
                        (h) => (
                          <th key={h} className={`px-6 py-3.5 text-left ${sectionLabel}`}>
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {filtered.map((s) => (
                      <tr
                        key={s.id}
                        className="transition-colors duration-150 hover:bg-white/[0.04] active:bg-white/[0.06]"
                      >
                        <td className="whitespace-nowrap px-6 py-4 font-mono text-[12px] font-medium text-white">
                          {s.id}
                        </td>
                        <td className="px-6 py-4 text-[13px] text-zinc-400">{s.customer}</td>
                        <td className="px-6 py-4 text-[13px] text-zinc-300">
                          {s.origin} → {s.destination}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-[13px] text-zinc-400">
                          {s.carrier}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 tabular-nums text-[13px] text-zinc-300">
                          {s.eta}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <span className={statusBadgeStyles[s.status]}>{s.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardShell>
  );
}
