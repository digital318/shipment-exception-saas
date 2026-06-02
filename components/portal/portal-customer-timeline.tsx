"use client";

import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeading } from "@/components/ui/section-heading";
import { cardSurface, customerNotificationTypeStyles } from "@/lib/styles";
import type { CustomerTimelineItem } from "@/lib/customer-portal/timeline";

export function PortalCustomerTimeline({ items }: { items: CustomerTimelineItem[] }) {
  return (
    <section aria-label="Customer activity timeline">
      <SectionHeading
        title="Activity Timeline"
        description="Shipment updates, exception changes, and resolutions for your account"
      />
      <div className={cardSurface}>
        {items.length === 0 ? (
          <EmptyState
            title="No timeline events yet"
            description="Updates to your shipments and exceptions will appear here."
          />
        ) : (
          <ul className="scrollbar-thin max-h-[min(480px,50vh)] divide-y divide-white/[0.04] overflow-y-auto">
            {items.map((item) => (
              <li
                key={item.id}
                className="px-5 py-4 transition-colors hover:bg-white/[0.02]"
              >
                <div className="flex items-center justify-between gap-3">
                  <span
                    className={
                      item.source === "notification"
                        ? (customerNotificationTypeStyles[item.category] ??
                          "text-xs text-zinc-400")
                        : "text-xs font-medium uppercase tracking-wide text-zinc-500"
                    }
                  >
                    {item.title}
                  </span>
                  <time className="text-[11px] tabular-nums text-zinc-600">{item.time}</time>
                </div>
                <p className="mt-2.5 text-[13px] leading-relaxed text-zinc-300">
                  {item.description}
                </p>
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
