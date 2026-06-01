"use client";

import { SectionHeading } from "@/components/ui/section-heading";
import type { CustomerRiskProfile } from "@/lib/services/metrics-service";
import { badgeBase, cardSurface, riskLevelStyles } from "@/lib/styles";

function riskScoreColor(score: number): string {
  if (score >= 60) return "text-rose-400";
  if (score >= 35) return "text-amber-400";
  return "text-emerald-400";
}

export function PortalSlaScorecard({ scorecard }: { scorecard: CustomerRiskProfile }) {
  const items = [
    { label: "SLA Target", value: `${scorecard.slaTarget.toFixed(1)}%`, accent: "text-zinc-300" },
    { label: "Actual SLA", value: `${scorecard.actualSla.toFixed(1)}%`, accent: scorecard.actualSla >= scorecard.slaTarget ? "text-emerald-400" : "text-amber-400" },
    { label: "Open Exceptions", value: String(scorecard.openExceptions), accent: "text-rose-400/90" },
    { label: "Escalations", value: String(scorecard.escalationCount), accent: "text-amber-400/90" },
    { label: "Risk Score", value: `${scorecard.riskScore}/100`, accent: riskScoreColor(scorecard.riskScore) },
  ];

  return (
    <section aria-label="SLA scorecard">
      <SectionHeading
        title="SLA Scorecard"
        description="Performance against your agreed service level targets"
        meta={
          <span className={`${badgeBase} ${riskLevelStyles[scorecard.riskLevel]}`}>
            {scorecard.riskLevel} risk
          </span>
        }
      />
      <div className={`${cardSurface} p-5 sm:p-6`}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {items.map((item) => (
            <div
              key={item.label}
              className="rounded-lg border border-white/[0.06] bg-zinc-950/40 px-4 py-3.5"
            >
              <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                {item.label}
              </p>
              <p className={`mt-1.5 text-xl font-semibold tabular-nums ${item.accent}`}>
                {item.value}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs leading-relaxed text-zinc-500">
          Risk score reflects open critical exceptions, active escalations, SLA performance, and
          service recovery progress — calculated using the same methodology as your operations team.
        </p>
      </div>
    </section>
  );
}
