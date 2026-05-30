"use client";

import { useMemo, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { NotificationFiltersBar } from "@/components/notifications/notification-filters-bar";
import { NotificationListItem } from "@/components/notifications/notification-list-item";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState, LoadingState } from "@/components/ui/data-state";
import { SyncStatus } from "@/components/ui/sync-status";
import { useNotifications } from "@/context/notifications-context";
import {
  filterNotifications,
  NOTIFICATION_PAGE_SIZE,
  paginateNotifications,
  type NotificationFilterState,
  type NotificationSeverityFilter,
  type NotificationStatusFilter,
  type NotificationTypeFilter,
} from "@/lib/notifications-utils";
import { btnSecondary, cardSurface } from "@/lib/styles";

export function NotificationsPage() {
  const {
    notifications,
    unreadCount,
    loading,
    error,
    source,
    refresh,
    markRead,
    markAllRead,
  } = useNotifications();

  const [filters, setFilters] = useState<NotificationFilterState>({
    status: "All",
    severity: "All",
    type: "All",
    query: "",
  });
  const [page, setPage] = useState(1);

  const filtered = useMemo(
    () => filterNotifications(notifications, filters),
    [notifications, filters],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / NOTIFICATION_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = useMemo(
    () => paginateNotifications(filtered, currentPage, NOTIFICATION_PAGE_SIZE),
    [filtered, currentPage],
  );

  const syncState = loading ? "syncing" : error || source === "mock" ? "error" : "live";

  const updateFilters = (patch: Partial<NotificationFilterState>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(1);
  };

  return (
    <DashboardShell
      eyebrow="Operations"
      title="Notification Center"
      description={
        loading
          ? "Loading notifications…"
          : `${filtered.length} notification${filtered.length === 1 ? "" : "s"} · ${unreadCount} unread`
      }
      actions={
        <>
          <SyncStatus state={syncState} />
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => void markAllRead()}
              disabled={loading}
              className="text-xs font-medium text-violet-400 transition hover:text-violet-300 disabled:opacity-50"
            >
              Mark all read
            </button>
          )}
          <button
            type="button"
            onClick={() => void refresh()}
            className={btnSecondary}
            disabled={loading}
          >
            Refresh
          </button>
        </>
      }
    >
      <NotificationFiltersBar
        filters={filters}
        notifications={notifications}
        onStatusChange={(status: NotificationStatusFilter) => updateFilters({ status })}
        onSeverityChange={(severity: NotificationSeverityFilter) =>
          updateFilters({ severity })
        }
        onTypeChange={(type: NotificationTypeFilter) => updateFilters({ type })}
        onQueryChange={(query) => updateFilters({ query })}
      />

      <div className="mt-5">
        {loading ? (
          <div className={cardSurface}>
            <LoadingState
              title="Loading notifications"
              description="Fetching organization-scoped alerts from Supabase…"
            />
          </div>
        ) : error ? (
          <div className={cardSurface}>
            <ErrorState
              title="Could not load notifications"
              description={error}
              onRetry={() => void refresh()}
            />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title={notifications.length === 0 ? "No notifications yet" : "No matching notifications"}
            description={
              notifications.length === 0
                ? "Critical exceptions, SLA risks, and resolutions will appear here."
                : "Adjust filters or search to find alerts."
            }
          />
        ) : (
          <>
            <div className={`${cardSurface} divide-y divide-white/[0.06]`}>
              {paged.map((notification) => (
                <NotificationListItem
                  key={notification.id}
                  notification={notification}
                  onMarkRead={(id) => void markRead(id)}
                />
              ))}
            </div>

            {filtered.length > NOTIFICATION_PAGE_SIZE && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-zinc-500">
                  Showing {(currentPage - 1) * NOTIFICATION_PAGE_SIZE + 1}–
                  {Math.min(currentPage * NOTIFICATION_PAGE_SIZE, filtered.length)} of{" "}
                  {filtered.length}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className={`${btnSecondary} disabled:opacity-40`}
                  >
                    Previous
                  </button>
                  <span className="text-xs text-zinc-500">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className={`${btnSecondary} disabled:opacity-40`}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardShell>
  );
}
