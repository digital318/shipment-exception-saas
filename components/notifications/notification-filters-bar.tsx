"use client";

import { FilterChip } from "@/components/ui/filter-chip";
import { inputBase } from "@/lib/styles";
import {
  NOTIFICATION_TYPE_FILTER_OPTIONS,
  type NotificationFilterState,
  type NotificationSeverityFilter,
  type NotificationStatusFilter,
  type NotificationTypeFilter,
} from "@/lib/notifications-utils";
import type { NotificationRecord } from "@/lib/types";

type NotificationFiltersBarProps = {
  filters: NotificationFilterState;
  notifications: NotificationRecord[];
  onStatusChange: (status: NotificationStatusFilter) => void;
  onSeverityChange: (severity: NotificationSeverityFilter) => void;
  onTypeChange: (type: NotificationTypeFilter) => void;
  onQueryChange: (query: string) => void;
};

export function NotificationFiltersBar({
  filters,
  notifications,
  onStatusChange,
  onSeverityChange,
  onTypeChange,
  onQueryChange,
}: NotificationFiltersBarProps) {
  const unreadCount = notifications.filter((n) => n.status === "Unread").length;

  return (
    <div className="space-y-3">
      <div className="relative max-w-md">
        <label className="sr-only" htmlFor="notification-search">
          Search notifications
        </label>
        <input
          id="notification-search"
          type="search"
          value={filters.query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search title or message…"
          className={inputBase}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {(["All", "Unread", "Read"] as const).map((status) => (
          <FilterChip
            key={status}
            label={status}
            active={filters.status === status}
            count={
              status === "Unread"
                ? unreadCount
                : status === "All"
                  ? notifications.length
                  : undefined
            }
            onClick={() => onStatusChange(status)}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {(["All", "Critical", "High", "Medium", "Low"] as const).map((severity) => (
          <FilterChip
            key={severity}
            label={severity}
            active={filters.severity === severity}
            onClick={() => onSeverityChange(severity)}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {NOTIFICATION_TYPE_FILTER_OPTIONS.map((option) => (
          <FilterChip
            key={option.value}
            label={option.label}
            active={filters.type === option.value}
            onClick={() => onTypeChange(option.value)}
          />
        ))}
      </div>
    </div>
  );
}
