"use client";

import {
  notificationTypeLabels,
  notificationTypeStyles,
  sectionLabel,
  severityStyles,
} from "@/lib/styles";
import type { NotificationRecord } from "@/lib/types";

type NotificationListItemProps = {
  notification: NotificationRecord;
  onMarkRead?: (id: string) => void;
  compact?: boolean;
  showMarkReadButton?: boolean;
};

export function NotificationListItem({
  notification,
  onMarkRead,
  compact = false,
  showMarkReadButton = true,
}: NotificationListItemProps) {
  const isUnread = notification.status === "Unread";

  const handleClick = () => {
    if (isUnread && onMarkRead) onMarkRead(notification.id);
  };

  return (
    <div
      className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${
        compact ? "px-4 py-3" : "px-5 py-4 sm:px-6"
      } ${isUnread ? "bg-violet-500/[0.03]" : ""}`}
    >
      <button
        type="button"
        onClick={handleClick}
        className={`min-w-0 flex-1 text-left transition hover:opacity-90 ${
          isUnread ? "cursor-pointer" : "cursor-default"
        }`}
      >
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
          {isUnread && (
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400" aria-hidden />
          )}
        </div>
        <p
          className={`mt-2 font-semibold text-white ${compact ? "text-sm" : "text-sm sm:text-base"}`}
        >
          {notification.title}
        </p>
        <p
          className={`mt-1 leading-relaxed text-zinc-500 ${
            compact ? "line-clamp-2 text-xs" : "text-sm"
          }`}
        >
          {notification.message}
        </p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-600">
          {notification.customerName && <span>{notification.customerName}</span>}
          {notification.shipmentId && <span>{notification.shipmentId}</span>}
          <time dateTime={notification.createdAt}>{notification.createdAt}</time>
        </div>
      </button>
      {isUnread && showMarkReadButton && onMarkRead && (
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
