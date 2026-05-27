"use client";

import { EmptyState } from "@/components/ui/empty-state";
import { SyncStatus } from "@/components/ui/sync-status";
import { useExceptions } from "@/context/exceptions-context";
import { activityTypeStyles, cardHeader, cardSurface } from "@/lib/styles";

export function RecentActivityPanel() {
  const { activity } = useExceptions();

  return (
    <aside className={`${cardSurface} xl:sticky xl:top-[5.5rem] xl:self-start`}>
      <div className={cardHeader}>
        <div>
          <h2 className="text-sm font-semibold text-white">Recent Activity</h2>
          <p className="mt-1 text-xs text-zinc-500">Live exception timeline</p>
        </div>
        <SyncStatus state="live" />
      </div>
      {activity.length === 0 ? (
        <EmptyState
          title="No recent activity"
          description="Exception events will appear here as they occur."
        />
      ) : (
        <ul className="scrollbar-thin max-h-[min(520px,60vh)] divide-y divide-white/[0.04] overflow-y-auto">
          {activity.map((item, idx) => (
            <li
              key={idx}
              className="px-5 py-4 transition-colors hover:bg-white/[0.02]"
            >
              <div className="flex items-center justify-between gap-3">
                <span className={activityTypeStyles[item.type]}>{item.type}</span>
                <time className="text-[11px] tabular-nums text-zinc-600">
                  {item.time}
                </time>
              </div>
              <p className="mt-2.5 text-[13px] leading-relaxed text-zinc-300">
                {item.event}
              </p>
              <p className="mt-2 text-[11px] text-zinc-600">
                {item.actor}
                {item.shipmentId && (
                  <span className="ml-2 font-mono text-zinc-500">
                    {item.shipmentId}
                  </span>
                )}
              </p>
            </li>
          ))}
        </ul>
      )}
      <div className="border-t border-white/[0.06] p-4">
        <button
          type="button"
          className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3.5 py-2 text-xs font-medium text-zinc-300 shadow-sm transition-all duration-200 hover:border-white/[0.14] hover:bg-white/[0.06] hover:text-white active:scale-[0.97]"
        >
          View full audit log
        </button>
      </div>
    </aside>
  );
}
