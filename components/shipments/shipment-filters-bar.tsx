"use client";

import { IconSearch } from "@/components/icons";
import { FilterChip } from "@/components/ui/filter-chip";
import {
  SAVED_VIEWS,
  SHIPMENT_SEVERITIES,
  SHIPMENT_STATUSES,
  type SavedViewId,
  type ShipmentFilterState,
  type ShipmentSortField,
} from "@/lib/shipment-filters";
import { badgeBase, btnSecondary, inputBase, sectionLabel, selectBase } from "@/lib/styles";
import type { Severity, ShipmentStatus } from "@/lib/types";

const SORT_OPTIONS: { value: ShipmentSortField; label: string }[] = [
  { value: "eta", label: "ETA" },
  { value: "severity", label: "Severity" },
  { value: "delayHours", label: "Delay hours" },
];

type ShipmentFiltersBarProps = {
  filters: ShipmentFilterState;
  activeFilterCount: number;
  carriers: string[];
  statusCounts: Record<string, number>;
  severityCounts: Record<string, number>;
  onQueryChange: (query: string) => void;
  onStatusChange: (status: ShipmentStatus | "All") => void;
  onSeverityChange: (severity: Severity | "All") => void;
  onCarrierChange: (carrier: string) => void;
  onSortChange: (sortBy: ShipmentSortField) => void;
  onSortDirToggle: () => void;
  onSavedView: (id: SavedViewId) => void;
  onClearFilters: () => void;
};

export function ShipmentFiltersBar({
  filters,
  activeFilterCount,
  carriers,
  statusCounts,
  severityCounts,
  onQueryChange,
  onStatusChange,
  onSeverityChange,
  onCarrierChange,
  onSortChange,
  onSortDirToggle,
  onSavedView,
  onClearFilters,
}: ShipmentFiltersBarProps) {
  const sortLabel =
    SORT_OPTIONS.find((o) => o.value === filters.sortBy)?.label ?? "ETA";

  return (
    <div className="space-y-4 border-b border-white/[0.06] px-5 py-4 sm:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="w-full max-w-md">
          <div className="relative">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="search"
              placeholder="Search ID, customer, route, carrier, issue…"
              value={filters.query}
              onChange={(e) => onQueryChange(e.target.value)}
              className={`${inputBase} pl-9 pr-9`}
              aria-label="Search shipments"
            />
            {filters.query && (
              <button
                type="button"
                onClick={() => onQueryChange("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-[10px] font-medium text-zinc-500 transition hover:bg-white/[0.06] hover:text-zinc-300 active:scale-95"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="shipment-sort">
            Sort shipments
          </label>
          <select
            id="shipment-sort"
            value={filters.sortBy}
            onChange={(e) => onSortChange(e.target.value as ShipmentSortField)}
            className={selectBase}
            aria-label="Sort by"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                Sort: {option.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={onSortDirToggle}
            className={btnSecondary}
            aria-label={`Sort direction: ${filters.sortDir === "asc" ? "ascending" : "descending"}`}
            title={filters.sortDir === "asc" ? "Ascending" : "Descending"}
          >
            {filters.sortDir === "asc" ? "↑ Asc" : "↓ Desc"}
          </button>

          <label className="sr-only" htmlFor="shipment-carrier">
            Filter by carrier
          </label>
          <select
            id="shipment-carrier"
            value={filters.carrier}
            onChange={(e) => onCarrierChange(e.target.value)}
            className={selectBase}
            aria-label="Filter by carrier"
          >
            <option value="All">All carriers</option>
            {carriers.map((carrier) => (
              <option key={carrier} value={carrier}>
                {carrier}
              </option>
            ))}
          </select>

          {activeFilterCount > 0 && (
            <span
              className={`${badgeBase} bg-violet-500/10 text-violet-300 ring-violet-500/20`}
            >
              {activeFilterCount} filter{activeFilterCount === 1 ? "" : "s"} active
            </span>
          )}

          <button
            type="button"
            onClick={onClearFilters}
            disabled={activeFilterCount === 0 && !filters.activeSavedView}
            className={`${btnSecondary} disabled:cursor-not-allowed disabled:opacity-40`}
          >
            Clear filters
          </button>
        </div>
      </div>

      <div>
        <p className={`mb-2 ${sectionLabel}`}>Saved views</p>
        <div className="flex flex-wrap gap-2">
          {SAVED_VIEWS.map((view) => (
            <button
              key={view.id}
              type="button"
              onClick={() => onSavedView(view.id)}
              className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-xs font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/30 active:scale-[0.97] ${
                filters.activeSavedView === view.id
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200 ring-1 ring-emerald-500/20"
                  : "border-white/[0.08] bg-white/[0.03] text-zinc-400 hover:border-white/[0.14] hover:bg-white/[0.05] hover:text-zinc-200"
              }`}
            >
              {view.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className={`mb-2 ${sectionLabel}`}>Severity</p>
        <div className="flex flex-wrap gap-2">
          {SHIPMENT_SEVERITIES.map((severity) => (
            <FilterChip
              key={severity}
              label={severity}
              active={filters.severity === severity}
              count={severityCounts[severity]}
              onClick={() => onSeverityChange(severity)}
            />
          ))}
        </div>
      </div>

      <div>
        <p className={`mb-2 ${sectionLabel}`}>Status</p>
        <div className="flex flex-wrap gap-2">
          {SHIPMENT_STATUSES.map((status) => (
            <FilterChip
              key={status}
              label={status}
              active={filters.status === status}
              count={statusCounts[status]}
              onClick={() => onStatusChange(status)}
            />
          ))}
        </div>
      </div>

      <p className="text-xs text-zinc-500">
        Sorted by {sortLabel} ({filters.sortDir === "asc" ? "ascending" : "descending"})
      </p>
    </div>
  );
}
