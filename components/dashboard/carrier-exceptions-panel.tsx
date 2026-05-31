"use client";

import { SectionHeading } from "@/components/ui/section-heading";
import { useExceptions } from "@/context/exceptions-context";
import { isActiveException } from "@/lib/exception-utils";
import { badgeBase, cardSurface, severityStyles } from "@/lib/styles";
import type { Severity } from "@/lib/types";

export function CarrierExceptionsPanel() {
  const { exceptions } = useExceptions();

  const carrierExceptions = exceptions.filter(
    (e) => e.source === "Carrier Sync" && isActiveException(e),
  );

  if (carrierExceptions.length === 0) return null;

  const highSeverity = carrierExceptions.filter((e) => e.severity === "High").length;

  return (
    <section aria-label="Carrier exceptions">
      <SectionHeading
        title="Carrier Exceptions"
        description="Operational exceptions auto-generated from carrier sync status changes"
        meta={
          <span className={`${badgeBase} bg-violet-500/10 text-violet-300 ring-violet-500/20`}>
            {highSeverity > 0
              ? `${highSeverity} high severity`
              : `${carrierExceptions.length} active`}
          </span>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {carrierExceptions.slice(0, 6).map((exc) => (
          <article
            key={exc.id}
            className={`group ${cardSurface} border-violet-500/15 p-5 transition-all duration-200 hover:border-violet-500/25 hover:bg-zinc-900/55`}
          >
            <div className="flex items-start justify-between gap-3">
              <span className={severityStyles[exc.severity as Severity]}>
                {exc.severity}
              </span>
              <span className="font-mono text-[10px] text-zinc-600">{exc.shipmentId}</span>
            </div>
            <h3 className="mt-4 text-sm font-semibold leading-snug text-white">
              {exc.title}
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-zinc-500">
              {exc.carrier} · {exc.delayReason}
            </p>
            <footer className="mt-4 flex items-center justify-between border-t border-white/[0.04] pt-3 text-[11px] text-zinc-600">
              <span>Carrier Sync · {exc.status}</span>
              <time>{exc.openedAt}</time>
            </footer>
          </article>
        ))}
      </div>
    </section>
  );
}
