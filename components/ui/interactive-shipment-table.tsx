"use client";

import { useMemo, useState } from "react";
import { ExceptionDetailDrawer } from "@/components/exceptions/exception-detail-drawer";
import { ShipmentFiltersBar } from "@/components/shipments/shipment-filters-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState, LoadingState } from "@/components/ui/data-state";
import { MockExportButton } from "@/components/ui/mock-export-button";
import { useExceptions } from "@/context/exceptions-context";
import { useShipmentFilters } from "@/hooks/use-shipment-filters";
import { enrichShipmentWithException, getShipmentSeverityDisplay } from "@/lib/exception-utils";
import {
  cardHeader,
  cardSurface,
  issueStatusStyles,
  sectionLabel,
  statusBadgeStyles,
} from "@/lib/styles";

export function InteractiveShipmentTable({
  title = "Shipment Exceptions",
}: {
  title?: string;
}) {
  const {
    exceptions,
    shipments,
    carriers,
    loading,
    error,
    refresh,
    getByShipmentId,
  } = useExceptions();
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
  const [selectedExceptionId, setSelectedExceptionId] = useState<string | null>(null);
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);

  const enrichedRows = useMemo(
    () =>
      shipments.map((s) =>
        enrichShipmentWithException(s, getByShipmentId(s.id)),
      ),
    [shipments, getByShipmentId],
  );

  const filtered = useMemo(() => applyRows(enrichedRows), [applyRows, enrichedRows]);
  const statusCounts = useMemo(
    () => getStatusCounts(enrichedRows),
    [getStatusCounts, enrichedRows],
  );
  const severityCounts = useMemo(
    () => getSeverityCounts(enrichedRows),
    [getSeverityCounts, enrichedRows],
  );

  function openRow(shipmentId: string) {
    const exc = getByShipmentId(shipmentId);
    if (exc) {
      setSelectedExceptionId(exc.id);
      setSelectedShipmentId(null);
    } else {
      setSelectedShipmentId(shipmentId);
      setSelectedExceptionId(null);
    }
  }

  function closeDrawer() {
    setSelectedExceptionId(null);
    setSelectedShipmentId(null);
  }

  return (
    <>
      <div className={`overflow-hidden ${cardSurface}`}>
        <div className={cardHeader}>
          <div>
            <h2 className="text-sm font-semibold text-white">{title}</h2>
            <p className="mt-1 text-xs text-zinc-500">
              {loading
                ? "Loading shipments…"
                : `${filtered.length} of ${enrichedRows.length} shown${
                    activeFilterCount > 0
                      ? ` · ${activeFilterCount} filter${activeFilterCount === 1 ? "" : "s"} active`
                      : ""
                  } · click a row for details`}
            </p>
          </div>
          <MockExportButton
            label="Export CSV"
            disabled={loading || filtered.length === 0}
            emptyMessage="No rows to export"
          />
        </div>

        {loading ? (
          <LoadingState
            title="Loading shipments"
            description="Pulling the latest exception board from Supabase…"
          />
        ) : error && enrichedRows.length === 0 ? (
          <ErrorState description={error} onRetry={() => void refresh()} />
        ) : enrichedRows.length === 0 ? (
          <EmptyState
            title="No shipments yet"
            description="Shipments will appear here once they are added to FreightPulse."
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
                title="No matching shipments"
                description="Adjust search, filters, or saved views to see exception rows."
              />
            ) : (
              <>
                <div className="hidden overflow-x-auto lg:block">
                  <table className="min-w-full text-left text-sm">
                    <thead className="sticky top-0 z-10 bg-zinc-900/95 backdrop-blur-sm">
                      <tr className="border-b border-white/[0.06]">
                        {[
                          "Shipment",
                          "Route / Carrier",
                          "ETA",
                          "Delay",
                          "Severity",
                          "Status",
                          "Issue",
                        ].map((h) => (
                          <th key={h} className={`px-6 py-3.5 text-left ${sectionLabel}`}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {filtered.map((shipment) => (
                        <tr
                          key={shipment.id}
                          onClick={() => openRow(shipment.id)}
                          className="group cursor-pointer transition-colors duration-150 hover:bg-violet-500/[0.06] active:bg-violet-500/10"
                        >
                          <td className="px-6 py-4 align-top">
                            <p className="font-mono text-[12px] font-medium text-white group-hover:text-violet-100">
                              {shipment.id}
                            </p>
                            <p className="mt-1 max-w-[160px] truncate text-[11px] text-zinc-500">
                              {shipment.customer}
                            </p>
                          </td>
                          <td className="px-6 py-4 align-top">
                            <p className="text-[13px] text-zinc-300">
                              {shipment.origin}
                              <span className="mx-1.5 text-zinc-600">→</span>
                              {shipment.destination}
                            </p>
                            <p className="mt-1 text-[11px] text-zinc-500">
                              {shipment.carrier} · {shipment.mode}
                            </p>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 align-top tabular-nums text-[13px] text-zinc-300">
                            {shipment.eta}
                          </td>
                          <td className="max-w-[200px] px-6 py-4 align-top">
                            {shipment.delayHours !== null ? (
                              <>
                                <p className="font-semibold text-amber-400">
                                  +{shipment.delayHours}h
                                </p>
                                <p className="mt-1 line-clamp-2 text-[11px] text-zinc-500">
                                  {shipment.delayReason}
                                </p>
                              </>
                            ) : (
                              <span className="text-zinc-600">—</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 align-top">
                            {(() => {
                              const severity = getShipmentSeverityDisplay(shipment);
                              return (
                                <span className={severity.className}>{severity.label}</span>
                              );
                            })()}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 align-top">
                            <span className={statusBadgeStyles[shipment.status]}>
                              {shipment.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 align-top">
                            <p
                              className={`text-[12px] font-semibold ${issueStatusStyles[shipment.issueStatus]}`}
                            >
                              {shipment.issueStatus}
                            </p>
                            <p className="mt-1 max-w-[180px] truncate text-[11px] text-zinc-600">
                              {shipment.exception}
                            </p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="divide-y divide-white/[0.06] lg:hidden">
                  {filtered.map((shipment) => (
                    <button
                      key={shipment.id}
                      type="button"
                      onClick={() => openRow(shipment.id)}
                      className="w-full p-5 text-left transition-colors hover:bg-violet-500/[0.06] active:bg-violet-500/10"
                    >
                      <div className="flex justify-between gap-2">
                        <p className="font-mono text-sm font-medium text-white">
                          {shipment.id}
                        </p>
                        {(() => {
                          const severity = getShipmentSeverityDisplay(shipment);
                          return (
                            <span className={severity.className}>{severity.label}</span>
                          );
                        })()}
                      </div>
                      <p className="mt-2 text-xs text-zinc-500">{shipment.customer}</p>
                    </button>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      <ExceptionDetailDrawer
        exceptionId={selectedExceptionId}
        shipmentId={selectedShipmentId}
        onClose={closeDrawer}
        onExceptionCreated={(id) => {
          setSelectedExceptionId(id);
          setSelectedShipmentId(null);
        }}
      />
    </>
  );
}
