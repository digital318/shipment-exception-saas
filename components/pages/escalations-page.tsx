"use client";

import { useMemo, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState, LoadingState } from "@/components/ui/data-state";
import { FilterChip } from "@/components/ui/filter-chip";
import { SyncStatus } from "@/components/ui/sync-status";
import { useNotifications } from "@/context/notifications-context";
import {
  cardSurface,
  notificationTypeLabels,
  notificationTypeStyles,
  sectionLabel,
  severityStyles,
} from "@/lib/styles";
import type { NotificationRecord, NotificationStatus, Severity } from "@/lib/types";

type SeverityFilter = Severity | "All";
type StatusFilter = NotificationStatus | "All";
type TypeFilter = "All" | "Escalations" | "SLA Risk" | "Resolution";

export function EscalationsPage() {
  const { notifications, escalationNotifications, loading, source, refresh, markRead } =
    useNotifications();
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("All");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("All");

  const filtered = useMemo(() => {
    let items = notifications;

    if (typeFilter === "Escalations") {
      items = escalationNotifications.filter(
        (n) => n.type === "exception_critical" || n.type === "exception_high",
      );
    } else if (typeFilter === "SLA Risk") {
      items = items.filter((n) => n.type === "sla_risk");
    } else if (typeFilter === "Resolution") {
      items = items.filter((n) => n.type === "resolution");
    }

    if (severityFilter !== "All") {
      items = items.filter((n) => n.severity === severityFilter);
    }

    if (statusFilter !== "All") {
      items = items.filter((n) => n.status === statusFilter);
    }

    return items;
  }, [notifications, escalationNotifications, typeFilter, severityFilter, statusFilter]);

  const counts = useMemo(() => {
    const unread = notifications.filter((n) => n.status === "Unread").length;
    const critical = notifications.filter((n) => n.severity === "Critical").length;
    const sla = notifications.filter((n) => n.type === "sla_risk").length;
    return { total: notifications.length, unread, critical, sla, filtered: filtered.length };
  }, [notifications, filtered.length]);

  const syncState = loading ? "syncing" : source === "mock" ? "error" : "live";

  return (
    <DashboardShell
      eyebrow="Operations alerts"
      title="Escalations"
      description={
        loading
          ? "Loading notifications…"
          : `${counts.filtered} alerts · Critical exceptions, SLA risks, and resolutions`
      }
      actions={
        <>
          <SyncStatus state={syncState} />
          <button
            type="button"
            onClick={() => void refresh()}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3.5 py-2 text-xs font-medium text-zinc-300 transition hover:border-white/[0.14] hover:bg-white/[0.06] hover:text-white"
            disabled={loading}
          >
            Refresh
          </button>
        </>
      }
    >
      <div className="mb-5 space-y-3">
        <div className="flex flex-wrap gap-2">
          {(["All", "Escalations", "SLA Risk", "Resolution"] as const).map((t) => (
            <FilterChip
              key={t}
              label={t}
              active={typeFilter === t}
              onClick={() => setTypeFilter(t)}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {(["All", "Critical", "High", "Medium", "Low"] as const).map((s) => (
            <FilterChip
              key={s}
              label={s}
              active={severityFilter === s}
              onClick={() => setSeverityFilter(s)}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {(["All", "Unread", "Read"] as const).map((s) => (
            <FilterChip
              key={s}
              label={s}
              active={statusFilter === s}
              count={
                s === "Unread"
                  ? counts.unread
                  : s === "All"
                    ? counts.total
                    : undefined
              }
              onClick={() => setStatusFilter(s)}
            />
          ))}
        </div>
      </div>

      {loading ? (
        <div className={cardSurface}>
          <LoadingState
            title="Loading escalations"
            description="Fetching in-app notifications from Supabase…"
          />
        </div>
      ) : source === "mock" && notifications.length === 0 ? (
        <div className={cardSurface}>
          <ErrorState
            title="Using mock data"
            description="Connect Supabase to persist notifications, or create critical/high exceptions to see mock alerts."
            onRetry={() => void refresh()}
          />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No matching notifications"
          description="Adjust filters or wait for new critical exceptions and SLA risk events."
        />
      ) : (
        <div className={`${cardSurface} divide-y divide-white/[0.06]`}>
          {filtered.map((notification) => (
            <EscalationRow
              key={notification.id}
              notification={notification}
              onMarkRead={(id) => void markRead(id)}
            />
          ))}
        </div>
      )}
    </DashboardShell>
  );
}

function EscalationRow({
  notification,
  onMarkRead,
}: {
  notification: NotificationRecord;
  onMarkRead: (id: string) => void;
}) {
  const isUnread = notification.status === "Unread";

  return (
    <div
      className={`flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 ${
        isUnread ? "bg-violet-500/[0.03]" : ""
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={notificationTypeStyles[notification.type]}>
            {notificationTypeLabels[notification.type]}
          </span>
          <span className={severityStyles[notification.severity]}>
            {notification.severity}
          </span>
          <span
            className={`${sectionLabel} normal-case tracking-normal ${
              isUnread ? "text-violet-400" : "text-zinc-600"
            }`}
          >
            {notification.status}
          </span>
        </div>
        <p className="mt-2 text-sm font-semibold text-white">{notification.title}</p>
        <p className="mt-1 text-sm leading-relaxed text-zinc-500">{notification.message}</p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-600">
          {notification.customerName && <span>{notification.customerName}</span>}
          {notification.shipmentId && <span>{notification.shipmentId}</span>}
          <span>{notification.createdAt}</span>
        </div>
      </div>
      {isUnread && (
        <button
          type="button"
          onClick={() => onMarkRead(notification.id)}
          className="shrink-0 self-start rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-white/[0.14] hover:bg-white/[0.06] hover:text-white sm:self-center"
        >
          Mark read
        </button>
      )}
    </div>
  );
}
