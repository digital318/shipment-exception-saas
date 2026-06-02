"use client";

import type { CustomerNotificationRecord } from "@/lib/types";
import {
  badgeBase,
  btnSecondary,
  customerNotificationTypeLabels,
  customerNotificationTypeStyles,
} from "@/lib/styles";

export function CustomerNotificationListItem({
  notification,
  onMarkRead,
  showCustomer = true,
}: {
  notification: CustomerNotificationRecord;
  onMarkRead: (id: string) => void;
  showCustomer?: boolean;
}) {
  const isUnread = notification.status === "Unread";

  return (
    <article
      className={`px-5 py-4 transition-colors hover:bg-white/[0.02] ${
        isUnread ? "bg-violet-500/[0.03]" : ""
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={customerNotificationTypeStyles[notification.type]}>
              {customerNotificationTypeLabels[notification.type]}
            </span>
            <span
              className={`${badgeBase} ${
                isUnread
                  ? "bg-violet-500/10 text-violet-300 ring-violet-500/20"
                  : "bg-zinc-500/10 text-zinc-400 ring-zinc-500/20"
              }`}
            >
              {notification.status}
            </span>
          </div>

          <h3 className="mt-2 text-sm font-medium text-zinc-100">{notification.title}</h3>
          <p className="mt-1 text-[13px] leading-relaxed text-zinc-400">{notification.message}</p>

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-500">
            {showCustomer && notification.customerName && (
              <span>{notification.customerName}</span>
            )}
            {(notification.shipmentNumber ?? notification.shipmentId) && (
              <span className="font-mono">
                {notification.shipmentNumber ?? notification.shipmentId}
              </span>
            )}
            <time>{notification.createdAt}</time>
          </div>
        </div>

        {isUnread && (
          <button
            type="button"
            onClick={() => onMarkRead(notification.id)}
            className={`shrink-0 ${btnSecondary} !px-3 !py-1.5 text-xs`}
          >
            Mark read
          </button>
        )}
      </div>
    </article>
  );
}
