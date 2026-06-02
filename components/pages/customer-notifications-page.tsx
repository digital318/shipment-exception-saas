"use client";

import { useMemo, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { CustomerNotificationFiltersBar } from "@/components/customer-notifications/customer-notification-filters-bar";
import { CustomerNotificationListItem } from "@/components/customer-notifications/customer-notification-list-item";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState, LoadingState } from "@/components/ui/data-state";
import { SyncStatus } from "@/components/ui/sync-status";
import { useCustomerNotifications } from "@/context/customer-notifications-context";
import { useExceptions } from "@/context/exceptions-context";
import {
  CUSTOMER_NOTIFICATION_PAGE_SIZE,
  filterCustomerNotifications,
  paginateCustomerNotifications,
  type CustomerNotificationFilterState,
  type CustomerNotificationStatusFilter,
  type CustomerNotificationTypeFilter,
} from "@/lib/customer-notifications-utils";
import { btnPrimary, btnSecondary, cardSurface } from "@/lib/styles";

export function CustomerNotificationsPage() {
  const {
    notifications,
    unreadCount,
    loading,
    error,
    source,
    refresh,
    markRead,
    markAllRead,
    generateDemoNotification,
  } = useCustomerNotifications();
  const { customers } = useExceptions();

  const [filters, setFilters] = useState<CustomerNotificationFilterState>({
    status: "All",
    type: "All",
    customerId: "All",
    query: "",
  });
  const [page, setPage] = useState(1);
  const [generating, setGenerating] = useState(false);

  const filtered = useMemo(
    () => filterCustomerNotifications(notifications, filters),
    [notifications, filters],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / CUSTOMER_NOTIFICATION_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = useMemo(
    () => paginateCustomerNotifications(filtered, currentPage, CUSTOMER_NOTIFICATION_PAGE_SIZE),
    [filtered, currentPage],
  );

  const syncState = loading ? "syncing" : error || source === "mock" ? "error" : "live";

  const updateFilters = (patch: Partial<CustomerNotificationFilterState>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(1);
  };

  const handleGenerateDemo = async () => {
    const customer = customers[0];
    if (!customer) return;

    setGenerating(true);
    try {
      await generateDemoNotification(customer.dbId ?? customer.id, customer.name);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <DashboardShell
      eyebrow="Customer communications"
      title="Customer Notification Center"
      description={
        loading
          ? "Loading customer notifications…"
          : `${filtered.length} notification${filtered.length === 1 ? "" : "s"} · ${unreadCount} unread`
      }
      actions={
        <>
          <SyncStatus state={syncState} />
          <button
            type="button"
            onClick={() => void handleGenerateDemo()}
            disabled={loading || generating || customers.length === 0}
            className={btnPrimary}
          >
            {generating ? "Generating…" : "Generate Customer Alert"}
          </button>
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
      <CustomerNotificationFiltersBar
        filters={filters}
        onStatusChange={(status: CustomerNotificationStatusFilter) => updateFilters({ status })}
        onTypeChange={(type: CustomerNotificationTypeFilter) => updateFilters({ type })}
        onQueryChange={(query) => updateFilters({ query })}
      />

      <div className="mt-5">
        {loading ? (
          <div className={cardSurface}>
            <LoadingState
              title="Loading customer notifications"
              description="Fetching customer-facing alerts from Supabase…"
            />
          </div>
        ) : error ? (
          <div className={cardSurface}>
            <ErrorState
              title="Could not load customer notifications"
              description={error}
              onRetry={() => void refresh()}
            />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title={
              notifications.length === 0
                ? "No customer notifications yet"
                : "No matching notifications"
            }
            description={
              notifications.length === 0
                ? "Shipment delays, exceptions, and resolutions sent to customers will appear here."
                : "Adjust filters or search to find notifications."
            }
          />
        ) : (
          <>
            <div className={`${cardSurface} divide-y divide-white/[0.06]`}>
              {paged.map((notification) => (
                <CustomerNotificationListItem
                  key={notification.id}
                  notification={notification}
                  onMarkRead={(id) => void markRead(id)}
                />
              ))}
            </div>

            {filtered.length > CUSTOMER_NOTIFICATION_PAGE_SIZE && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-zinc-500">
                  Showing {(currentPage - 1) * CUSTOMER_NOTIFICATION_PAGE_SIZE + 1}–
                  {Math.min(currentPage * CUSTOMER_NOTIFICATION_PAGE_SIZE, filtered.length)} of{" "}
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
