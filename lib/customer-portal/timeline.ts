import type { ActivityItem } from "@/lib/types";
import type { CustomerNotificationRecord } from "@/lib/types";
import { CUSTOMER_NOTIFICATION_TYPE_LABELS } from "@/lib/data/customer-notification-rules";

export type CustomerTimelineItem = {
  id: string;
  time: string;
  category: string;
  title: string;
  description: string;
  shipmentId: string | null;
  source: "activity" | "notification";
};

export function buildCustomerTimeline(
  activity: ActivityItem[],
  notifications: CustomerNotificationRecord[],
): CustomerTimelineItem[] {
  const items: CustomerTimelineItem[] = [];

  for (const event of activity) {
    items.push({
      id: `activity-${event.time}-${event.event.slice(0, 24)}`,
      time: event.time,
      category: event.type,
      title: event.type === "resolved" ? "Exception resolved" : "Shipment update",
      description: event.event,
      shipmentId: event.shipmentId,
      source: "activity",
    });
  }

  for (const notification of notifications) {
    items.push({
      id: `notification-${notification.id}`,
      time: notification.createdAt,
      category: notification.type,
      title: CUSTOMER_NOTIFICATION_TYPE_LABELS[notification.type],
      description: notification.message,
      shipmentId: notification.shipmentNumber ?? notification.shipmentId ?? null,
      source: "notification",
    });
  }

  return items.sort((a, b) => {
    if (a.time === b.time) return 0;
    if (a.time === "Just now") return -1;
    if (b.time === "Just now") return 1;
    return a.time < b.time ? 1 : -1;
  });
}
