import type { DbNotificationWithRelations } from "@/lib/database.types";
import type { NotificationRecord, NotificationStatus, NotificationType, Severity } from "@/lib/types";
import { formatRelativeTime } from "./format";

export function mapNotification(row: DbNotificationWithRelations): NotificationRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    exceptionId: row.exception_id ?? undefined,
    customerId: row.customer_id ?? undefined,
    type: row.type as NotificationType,
    title: row.title,
    message: row.message,
    severity: row.severity as Severity,
    status: row.status as NotificationStatus,
    createdAt: formatRelativeTime(row.created_at),
    readAt: row.read_at ? formatRelativeTime(row.read_at) : undefined,
    exceptionDisplayId: row.exception_id ? row.exception_id.slice(0, 8).toUpperCase() : undefined,
    customerName: row.customer?.name ?? undefined,
    shipmentId: row.exception?.shipment?.shipment_number ?? undefined,
  };
}

export function mapNotifications(rows: DbNotificationWithRelations[]): NotificationRecord[] {
  return rows
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map(mapNotification);
}
