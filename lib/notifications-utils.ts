import { isEscalationNotification } from "@/lib/data/notification-rules";
import type {
  NotificationRecord,
  NotificationStatus,
  NotificationType,
  Severity,
} from "@/lib/types";

/** Normalize DB status strings to app NotificationStatus. */
export function normalizeNotificationStatus(status: string): NotificationStatus {
  return status.trim().toLowerCase() === "read" ? "Read" : "Unread";
}

/** Unread count from notification rows only (no mock/cache). */
export function countUnreadNotifications(notifications: NotificationRecord[]): number {
  return notifications.filter((n) => n.status === "Unread").length;
}

export type NotificationStatusFilter = NotificationStatus | "All";
export type NotificationSeverityFilter = Severity | "All";
export type NotificationTypeFilter =
  | "All"
  | "sla_risk"
  | "exception_critical"
  | "exception_high"
  | "resolution"
  | "overdue_follow_up"
  | "customer_high_risk"
  | "sla_threshold_breach";

export const NOTIFICATION_TYPE_FILTER_OPTIONS: {
  value: NotificationTypeFilter;
  label: string;
}[] = [
  { value: "All", label: "All types" },
  { value: "sla_risk", label: "SLA Risk" },
  { value: "exception_critical", label: "Exception Critical" },
  { value: "exception_high", label: "Alert" },
  { value: "overdue_follow_up", label: "Overdue Follow-Up" },
  { value: "customer_high_risk", label: "Customer High Risk" },
  { value: "sla_threshold_breach", label: "SLA Threshold" },
  { value: "resolution", label: "Resolution" },
];

export type NotificationFilterState = {
  status: NotificationStatusFilter;
  severity: NotificationSeverityFilter;
  type: NotificationTypeFilter;
  query: string;
};

export function matchesNotificationQuery(
  notification: NotificationRecord,
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const haystack = [
    notification.title,
    notification.message,
    notification.customerName,
    notification.shipmentId,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(q);
}

export function filterNotifications(
  notifications: NotificationRecord[],
  filters: NotificationFilterState,
): NotificationRecord[] {
  let items = notifications;

  if (filters.type !== "All") {
    items = items.filter((n) => n.type === filters.type);
  }

  if (filters.severity !== "All") {
    items = items.filter((n) => n.severity === filters.severity);
  }

  if (filters.status !== "All") {
    items = items.filter((n) => n.status === filters.status);
  }

  if (filters.query.trim()) {
    items = items.filter((n) => matchesNotificationQuery(n, filters.query));
  }

  return items;
}

export function isUnresolvedOperationalAlert(
  notification: NotificationRecord,
): boolean {
  return (
    notification.status === "Unread" && isEscalationNotification(notification.type)
  );
}

export function getEscalationNotifications(
  notifications: NotificationRecord[],
): NotificationRecord[] {
  return notifications.filter((n) => isEscalationNotification(n.type));
}

export function groupEscalationsByCategory(notifications: NotificationRecord[]): {
  critical: NotificationRecord[];
  high: NotificationRecord[];
  slaRisk: NotificationRecord[];
  unresolved: NotificationRecord[];
} {
  const escalations = getEscalationNotifications(notifications);

  return {
    critical: escalations.filter(
      (n) => n.type === "exception_critical" || n.severity === "Critical",
    ),
    high: escalations.filter(
      (n) => n.type === "exception_high" || n.severity === "High",
    ),
    slaRisk: escalations.filter((n) => n.type === "sla_risk"),
    unresolved: escalations.filter(isUnresolvedOperationalAlert),
  };
}

export const NOTIFICATION_PAGE_SIZE = 20;

export function paginateNotifications<T>(items: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

export function notificationTypeToFilterLabel(type: NotificationType): string {
  const match = NOTIFICATION_TYPE_FILTER_OPTIONS.find((o) => o.value === type);
  return match?.label ?? type;
}
