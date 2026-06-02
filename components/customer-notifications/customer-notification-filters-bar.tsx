"use client";

import { FilterChip } from "@/components/ui/filter-chip";
import { inputBase } from "@/lib/styles";
import {
  CUSTOMER_NOTIFICATION_TYPE_FILTER_OPTIONS,
  type CustomerNotificationFilterState,
  type CustomerNotificationStatusFilter,
  type CustomerNotificationTypeFilter,
} from "@/lib/customer-notifications-utils";
import { CUSTOMER_NOTIFICATION_TYPE_LABELS } from "@/lib/data/customer-notification-rules";

type CustomerNotificationFiltersBarProps = {
  filters: CustomerNotificationFilterState;
  onStatusChange: (status: CustomerNotificationStatusFilter) => void;
  onTypeChange: (type: CustomerNotificationTypeFilter) => void;
  onQueryChange: (query: string) => void;
  showTypeFilter?: boolean;
};

const STATUS_OPTIONS: CustomerNotificationStatusFilter[] = ["All", "Unread", "Read"];

export function CustomerNotificationFiltersBar({
  filters,
  onStatusChange,
  onTypeChange,
  onQueryChange,
  showTypeFilter = true,
}: CustomerNotificationFiltersBarProps) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((status) => (
          <FilterChip
            key={status}
            label={status}
            active={filters.status === status}
            onClick={() => onStatusChange(status)}
          />
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {showTypeFilter && (
          <select
            value={filters.type}
            onChange={(e) => onTypeChange(e.target.value as CustomerNotificationTypeFilter)}
            className={`${inputBase} min-w-[180px]`}
            aria-label="Filter by notification type"
          >
            {CUSTOMER_NOTIFICATION_TYPE_FILTER_OPTIONS.map((type) => (
              <option key={type} value={type}>
                {type === "All" ? "All types" : CUSTOMER_NOTIFICATION_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        )}

        <input
          type="search"
          value={filters.query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search notifications…"
          className={`${inputBase} min-w-[220px]`}
          aria-label="Search customer notifications"
        />
      </div>
    </div>
  );
}
