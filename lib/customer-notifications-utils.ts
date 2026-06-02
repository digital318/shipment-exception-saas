import type {
  CustomerNotificationRecord,
  CustomerNotificationStatus,
  CustomerNotificationType,
} from "@/lib/types";

export const CUSTOMER_NOTIFICATION_PAGE_SIZE = 20;

export type CustomerNotificationStatusFilter = CustomerNotificationStatus | "All";

export type CustomerNotificationTypeFilter = CustomerNotificationType | "All";

export type CustomerNotificationFilterState = {
  status: CustomerNotificationStatusFilter;
  type: CustomerNotificationTypeFilter;
  customerId: string;
  query: string;
};

export const CUSTOMER_NOTIFICATION_TYPE_FILTER_OPTIONS: CustomerNotificationTypeFilter[] = [
  "All",
  "shipment_delayed",
  "shipment_exception",
  "shipment_delivered",
  "exception_updated",
  "exception_resolved",
  "sla_risk_warning",
];

export function countUnreadCustomerNotifications(
  notifications: CustomerNotificationRecord[],
): number {
  return notifications.filter((n) => n.status === "Unread").length;
}

export function filterCustomerNotificationsByCustomer(
  notifications: CustomerNotificationRecord[],
  customerId: string | undefined,
): CustomerNotificationRecord[] {
  if (!customerId) return notifications;
  return notifications.filter((n) => n.customerId === customerId);
}

export function filterCustomerNotifications(
  notifications: CustomerNotificationRecord[],
  filters: CustomerNotificationFilterState,
): CustomerNotificationRecord[] {
  let result = notifications;

  if (filters.customerId && filters.customerId !== "All") {
    result = result.filter((n) => n.customerId === filters.customerId);
  }

  if (filters.status !== "All") {
    result = result.filter((n) => n.status === filters.status);
  }

  if (filters.type !== "All") {
    result = result.filter((n) => n.type === filters.type);
  }

  const q = filters.query.trim().toLowerCase();
  if (q) {
    result = result.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.message.toLowerCase().includes(q) ||
        (n.customerName?.toLowerCase().includes(q) ?? false) ||
        (n.shipmentNumber?.toLowerCase().includes(q) ?? false) ||
        (n.shipmentId?.toLowerCase().includes(q) ?? false),
    );
  }

  return result;
}

export function paginateCustomerNotifications(
  notifications: CustomerNotificationRecord[],
  page: number,
  pageSize: number,
): CustomerNotificationRecord[] {
  const start = (page - 1) * pageSize;
  return notifications.slice(start, start + pageSize);
}
