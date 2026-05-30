"use client";

import Link from "next/link";
import { useMemo } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { NotificationListItem } from "@/components/notifications/notification-list-item";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState, LoadingState } from "@/components/ui/data-state";
import { SyncStatus } from "@/components/ui/sync-status";
import { useNotifications } from "@/context/notifications-context";
import { groupEscalationsByCategory } from "@/lib/notifications-utils";
import { btnSecondary, cardSurface, sectionLabel } from "@/lib/styles";

function EscalationSection({
  title,
  description,
  items,
  onMarkRead,
}: {
  title: string;
  description: string;
  items: ReturnType<typeof useNotifications>["notifications"];
  onMarkRead: (id: string) => void;
}) {
  if (items.length === 0) return null;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        <p className="mt-1 text-xs text-zinc-500">{description}</p>
      </div>
      <div className={`${cardSurface} divide-y divide-white/[0.06]`}>
        {items.map((notification) => (
          <NotificationListItem
            key={notification.id}
            notification={notification}
            onMarkRead={onMarkRead}
          />
        ))}
      </div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "rose" | "orange" | "amber" | "violet";
}) {
  const toneClasses = {
    rose: "bg-rose-500/10 text-rose-300 ring-rose-500/20",
    orange: "bg-orange-500/10 text-orange-300 ring-orange-500/20",
    amber: "bg-amber-500/10 text-amber-300 ring-amber-500/20",
    violet: "bg-violet-500/10 text-violet-300 ring-violet-500/20",
  };

  return (
    <div className={`${cardSurface} p-4`}>
      <p className={sectionLabel}>{label}</p>
      <p
        className={`mt-2 inline-flex rounded-md px-2.5 py-1 text-2xl font-semibold tabular-nums ring-1 ring-inset ${toneClasses[tone]}`}
      >
        {value}
      </p>
    </div>
  );
}

export function EscalationsPage() {
  const { notifications, loading, error, source, refresh, markRead, markAllRead } =
    useNotifications();

  const groups = useMemo(
    () => groupEscalationsByCategory(notifications),
    [notifications],
  );

  const hasEscalations =
    groups.critical.length > 0 ||
    groups.high.length > 0 ||
    groups.slaRisk.length > 0 ||
    groups.unresolved.length > 0;

  const syncState = loading ? "syncing" : error || source === "mock" ? "error" : "live";

  return (
    <DashboardShell
      eyebrow="Operations alerts"
      title="Escalations"
      description={
        loading
          ? "Loading escalations…"
          : `${groups.unresolved.length} unresolved · Critical, high, and SLA risk alerts`
      }
      actions={
        <>
          <SyncStatus state={syncState} />
          {groups.unresolved.length > 0 && (
            <button
              type="button"
              onClick={() => void markAllRead()}
              disabled={loading}
              className="text-xs font-medium text-violet-400 transition hover:text-violet-300 disabled:opacity-50"
            >
              Mark all read
            </button>
          )}
          <Link href="/notifications" className={btnSecondary}>
            All notifications
          </Link>
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
      {loading ? (
        <div className={cardSurface}>
          <LoadingState
            title="Loading escalations"
            description="Fetching critical and SLA risk notifications…"
          />
        </div>
      ) : error ? (
        <div className={cardSurface}>
          <ErrorState
            title="Could not load escalations"
            description={error}
            onRetry={() => void refresh()}
          />
        </div>
      ) : !hasEscalations ? (
        <EmptyState
          title="No active escalations"
          description="Critical exceptions, high-severity alerts, and SLA risks will appear here when detected."
        />
      ) : (
        <div className="space-y-8">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Critical" value={groups.critical.length} tone="rose" />
            <MetricCard label="High" value={groups.high.length} tone="orange" />
            <MetricCard label="SLA Risk" value={groups.slaRisk.length} tone="amber" />
            <MetricCard
              label="Unresolved"
              value={groups.unresolved.length}
              tone="violet"
            />
          </div>

          <EscalationSection
            title="Unresolved operational alerts"
            description="Unread escalations requiring ops attention."
            items={groups.unresolved}
            onMarkRead={(id) => void markRead(id)}
          />

          <EscalationSection
            title="Critical notifications"
            description="Critical-severity exceptions and SLA breaches."
            items={groups.critical}
            onMarkRead={(id) => void markRead(id)}
          />

          <EscalationSection
            title="High notifications"
            description="High-severity exception alerts."
            items={groups.high}
            onMarkRead={(id) => void markRead(id)}
          />

          <EscalationSection
            title="SLA risk notifications"
            description="Customers below on-time delivery targets."
            items={groups.slaRisk}
            onMarkRead={(id) => void markRead(id)}
          />
        </div>
      )}
    </DashboardShell>
  );
}
