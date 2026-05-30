"use client";

import { SectionHeading } from "@/components/ui/section-heading";
import { useExceptions } from "@/context/exceptions-context";
import { badgeBase, cardSurface, severityStyles } from "@/lib/styles";
import type { Severity } from "@/lib/types";

export function AutoDetectedAlertsPanel() {
  const { autoDetectedAlerts } = useExceptions();

  if (autoDetectedAlerts.length === 0) return null;

  const criticalOrHigh = autoDetectedAlerts.filter(
    (a) => a.severity === "Critical" || a.severity === "High",
  ).length;

  return (
    <section aria-label="Auto-detected exceptions">
      <SectionHeading
        title="Auto-Detected Exceptions"
        description="Newly generated from shipment delay and status signals"
        meta={
          <span className={`${badgeBase} bg-amber-500/10 text-amber-300 ring-amber-500/20`}>
            {criticalOrHigh > 0 ? `${criticalOrHigh} urgent` : `${autoDetectedAlerts.length} new`}
          </span>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {autoDetectedAlerts.map((alert) => (
          <article
            key={alert.id}
            className={`group ${cardSurface} border-amber-500/15 p-5 transition-all duration-200 hover:border-amber-500/25 hover:bg-zinc-900/55`}
          >
            <div className="flex items-start justify-between gap-3">
              <span className={severityStyles[alert.severity as Severity]}>
                {alert.severity}
              </span>
              <span className="font-mono text-[10px] text-zinc-600">{alert.shipmentId}</span>
            </div>
            <h3 className="mt-4 text-sm font-semibold leading-snug text-white">
              {alert.title}
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-zinc-500">{alert.detail}</p>
            <footer className="mt-4 flex items-center justify-between border-t border-white/[0.04] pt-3 text-[11px] text-zinc-600">
              <span>Auto-detected · {alert.rule.replace("_", " ")}</span>
              <time>{alert.since}</time>
            </footer>
          </article>
        ))}
      </div>
    </section>
  );
}
