"use client";

import { useMemo } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { ShipmentFiltersBar } from "@/components/shipments/shipment-filters-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { MockExportButton } from "@/components/ui/mock-export-button";
import { SyncStatus } from "@/components/ui/sync-status";
import { useShipmentFilters } from "@/hooks/use-shipment-filters";
import { allCarriers, shipmentRows } from "@/lib/mock-data";
import { cardHeader, cardSurface, sectionLabel, statusBadgeStyles } from "@/lib/styles";

export function ShipmentsPage() {
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

  const filtered = useMemo(() => applyRows(shipmentRows), [applyRows]);
  const statusCounts = useMemo(
    () => getStatusCounts(shipmentRows),
    [getStatusCounts],
  );
  const severityCounts = useMemo(
    () => getSeverityCounts(shipmentRows),
    [getSeverityCounts],
  );

  return (
    <DashboardShell
      eyebrow="Fleet operations"
      title="Shipments"
      description={`${filtered.length} of ${shipmentRows.length} shipments in view${
        activeFilterCount > 0 ? ` · ${activeFilterCount} filter${activeFilterCount === 1 ? "" : "s"} active` : ""
      }`}
      actions={<SyncStatus state="live" />}
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
            disabled={filtered.length === 0}
            emptyMessage="Filter has no rows to export"
          />
        </div>

        <ShipmentFiltersBar
          filters={filters}
          activeFilterCount={activeFilterCount}
          carriers={allCarriers}
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
      </div>
    </DashboardShell>
  );
}
