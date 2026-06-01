"use client";

import { ISSUE_STATUSES, SEVERITIES } from "@/lib/constants";
import type { ReportFilters } from "@/lib/reports/types";
import { btnSecondary, sectionLabel, selectBase } from "@/lib/styles";

const DATE_RANGE_OPTIONS: { value: ReportFilters["dateRange"]; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "all", label: "All time" },
];

type ReportFiltersBarProps = {
  filters: ReportFilters;
  customers: string[];
  carriers: string[];
  onChange: (patch: Partial<ReportFilters>) => void;
  onClear: () => void;
};

export function ReportFiltersBar({
  filters,
  customers,
  carriers,
  onChange,
  onClear,
}: ReportFiltersBarProps) {
  const hasActiveFilters =
    filters.customer !== "All" ||
    filters.carrier !== "All" ||
    filters.severity !== "All" ||
    filters.status !== "All" ||
    filters.dateRange !== "30d";

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-white/[0.06] bg-zinc-900/40 p-4 sm:p-5">
      <div>
        <label className={`mb-1.5 block ${sectionLabel}`}>Date range</label>
        <select
          value={filters.dateRange}
          onChange={(e) =>
            onChange({ dateRange: e.target.value as ReportFilters["dateRange"] })
          }
          className={selectBase}
        >
          {DATE_RANGE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={`mb-1.5 block ${sectionLabel}`}>Customer</label>
        <select
          value={filters.customer}
          onChange={(e) => onChange({ customer: e.target.value })}
          className={selectBase}
        >
          <option value="All">All customers</option>
          {customers.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={`mb-1.5 block ${sectionLabel}`}>Carrier</label>
        <select
          value={filters.carrier}
          onChange={(e) => onChange({ carrier: e.target.value })}
          className={selectBase}
        >
          <option value="All">All carriers</option>
          {carriers.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={`mb-1.5 block ${sectionLabel}`}>Severity</label>
        <select
          value={filters.severity}
          onChange={(e) =>
            onChange({ severity: e.target.value as ReportFilters["severity"] })
          }
          className={selectBase}
        >
          <option value="All">All severities</option>
          {SEVERITIES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={`mb-1.5 block ${sectionLabel}`}>Status</label>
        <select
          value={filters.status}
          onChange={(e) =>
            onChange({ status: e.target.value as ReportFilters["status"] })
          }
          className={selectBase}
        >
          <option value="All">All statuses</option>
          {ISSUE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {hasActiveFilters && (
        <button type="button" onClick={onClear} className={btnSecondary}>
          Clear filters
        </button>
      )}
    </div>
  );
}
