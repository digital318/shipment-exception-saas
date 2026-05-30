"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { IconBell } from "@/components/icons";
import { useNotifications } from "@/context/notifications-context";
import {
  badgeBase,
  btnSecondary,
  cardSurface,
  notificationTypeLabels,
  notificationTypeStyles,
  sectionLabel,
  severityStyles,
} from "@/lib/styles";
import type { NotificationRecord } from "@/lib/types";

function NotificationItem({
  notification,
  onMarkRead,
}: {
  notification: NotificationRecord;
  onMarkRead: (id: string) => void;
}) {
  const isUnread = notification.status === "Unread";

  return (
    <button
      type="button"
      onClick={() => {
        if (isUnread) onMarkRead(notification.id);
      }}
      className={`w-full px-4 py-3 text-left transition hover:bg-white/[0.04] ${
        isUnread ? "bg-violet-500/[0.04]" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={notificationTypeStyles[notification.type]}>
              {notificationTypeLabels[notification.type]}
            </span>
            {isUnread && (
              <span className="h-1.5 w-1.5 rounded-full bg-violet-400" aria-hidden />
            )}
          </div>
          <p className="mt-1.5 truncate text-sm font-medium text-zinc-200">
            {notification.title}
          </p>
          <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-zinc-500">
            {notification.message}
          </p>
          <p className="mt-1.5 text-[11px] text-zinc-600">{notification.createdAt}</p>
        </div>
        <span className={severityStyles[notification.severity]}>
          {notification.severity}
        </span>
      </div>
    </button>
  );
}

export function NotificationBell() {
  const { notifications, unreadCount, loading, markRead, markAllRead } =
    useNotifications();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const recent = notifications.slice(0, 8);

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={open}
        className={`relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-zinc-400 transition hover:border-white/[0.14] hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/30 ${
          open ? "border-white/[0.14] bg-white/[0.06] text-white" : ""
        }`}
      >
        <IconBell className="h-[18px] w-[18px]" />
        {unreadCount > 0 && (
          <span
            className={`absolute -right-1 -top-1 min-w-[18px] ${badgeBase} bg-rose-500 text-white ring-rose-600/50`}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className={`absolute right-0 top-full z-50 mt-2 w-[min(100vw-2rem,380px)] overflow-hidden ${cardSurface} shadow-xl shadow-black/40`}
        >
          <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
            <div>
              <p className={sectionLabel}>Notifications</p>
              <p className="mt-0.5 text-sm font-medium text-white">
                {loading ? "Loading…" : `${unreadCount} unread`}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="text-xs font-medium text-violet-400 transition hover:text-violet-300"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[min(60vh,420px)] divide-y divide-white/[0.04] overflow-y-auto">
            {recent.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-zinc-400">No notifications yet</p>
                <p className="mt-1 text-xs text-zinc-600">
                  Critical exceptions and SLA risks will appear here.
                </p>
              </div>
            ) : (
              recent.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onMarkRead={(id) => void markRead(id)}
                />
              ))
            )}
          </div>

          <div className="border-t border-white/[0.06] p-3">
            <Link
              href="/escalations"
              onClick={() => setOpen(false)}
              className={`block w-full text-center ${btnSecondary}`}
            >
              View all escalations
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
