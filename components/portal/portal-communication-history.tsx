"use client";

import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeading } from "@/components/ui/section-heading";
import { CustomerNotificationListItem } from "@/components/customer-notifications/customer-notification-list-item";
import { cardSurface } from "@/lib/styles";
import type { CustomerNotificationRecord } from "@/lib/types";

export function PortalCommunicationHistory({
  notifications,
  onMarkRead,
}: {
  notifications: CustomerNotificationRecord[];
  onMarkRead: (id: string) => void;
}) {
  return (
    <section aria-label="Communication history">
      <SectionHeading
        title="Communication History"
        description="All notifications sent to your account"
      />
      <div className={cardSurface}>
        {notifications.length === 0 ? (
          <EmptyState
            title="No communications yet"
            description="Alerts about your shipments and exceptions will appear here."
          />
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {notifications.map((notification) => (
              <CustomerNotificationListItem
                key={notification.id}
                notification={notification}
                onMarkRead={onMarkRead}
                showCustomer={false}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
