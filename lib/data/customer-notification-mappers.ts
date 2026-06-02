import type { DbCustomerNotificationWithRelations } from "@/lib/database.types";
import { formatRelativeTime } from "./format";
import type { CustomerNotificationRecord, CustomerNotificationType } from "@/lib/types";

export function mapCustomerNotification(
  row: DbCustomerNotificationWithRelations,
): CustomerNotificationRecord {
  return {
    id: row.id,
    organizationId: row.organization_id,
    customerId: row.customer_id,
    shipmentId: row.shipment?.shipment_number ?? undefined,
    exceptionId: row.exception_id ?? undefined,
    type: row.type as CustomerNotificationType,
    title: row.title,
    message: row.message,
    status: row.status === "Read" ? "Read" : "Unread",
    createdAt: formatRelativeTime(row.created_at),
    readAt: row.read_at ? formatRelativeTime(row.read_at) : undefined,
    customerName: row.customer?.name ?? undefined,
    shipmentNumber: row.shipment?.shipment_number ?? undefined,
  };
}

export function mapCustomerNotifications(
  rows: DbCustomerNotificationWithRelations[],
): CustomerNotificationRecord[] {
  return rows.map(mapCustomerNotification);
}
