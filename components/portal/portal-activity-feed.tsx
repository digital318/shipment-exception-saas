"use client";

import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeading } from "@/components/ui/section-heading";
import { activityTypeStyles, cardSurface } from "@/lib/styles";
import type { ActivityItem } from "@/lib/types";

export function PortalActivityFeed({ activity }: { activity: ActivityItem[] }) {
  return (
    <section aria-label="Customer activity feed">
      <SectionHeading
        title="Recent Activity"
        description="Shipment and exception updates for your account"
      />
      <div className={cardSurface}>
        {activity.length === 0 ? (
          <EmptyState
            title="No recent activity"
            description="Updates to your shipments and exceptions will appear here."
          />
        ) : (
          <ul className="scrollbar-thin max-h-[min(480px,50vh)] divide-y divide-white/[0.04] overflow-y-auto">
            {activity.map((item, idx) => (
              <li
                key={idx}
                className="px-5 py-4 transition-colors hover:bg-white/[0.02]"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className={activityTypeStyles[item.type]}>{item.type}</span>
                  <time className="text-[11px] tabular-nums text-zinc-600">{item.time}</time>
                </div>
                <p className="mt-2.5 text-[13px] leading-relaxed text-zinc-300">{item.event}</p>
                {item.shipmentId && (
                  <p className="mt-2 font-mono text-[11px] text-zinc-500">{item.shipmentId}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
