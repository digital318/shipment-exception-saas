"use client";

import { SectionHeading } from "@/components/ui/section-heading";
import {
  badgeBase,
  cardSurface,
  riskLevelStyles,
  sectionLabel,
} from "@/lib/styles";
import type { CustomerRiskProfile } from "@/lib/services/metrics-service";

function riskScoreColor(score: number): string {
  if (score >= 60) return "text-rose-400";
  if (score >= 35) return "text-amber-400";
  return "text-emerald-400";
}

export function CustomerRiskSection({
  profiles,
  limit,
  showHeading = true,
}: {
  profiles: CustomerRiskProfile[];
  limit?: number;
  showHeading?: boolean;
}) {
  const rows = limit != null ? profiles.slice(0, limit) : profiles;

  return (
    <section aria-label="Customer risk">
      {showHeading && (
        <SectionHeading
          title={limit === 5 ? "Top 5 customers at risk" : "Customer risk dashboard"}
          description="Risk score from open critical exceptions, escalations, SLA misses, and overdue follow-ups"
          meta={
            <span className={`${badgeBase} bg-rose-500/10 text-rose-400 ring-rose-500/20`}>
              {profiles.filter((p) => p.riskScore >= 60).length} high risk
            </span>
          }
        />
      )}
      <div className={`${cardSurface} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-900/60">
              <tr className="border-b border-white/[0.06]">
                {[
                  "Customer",
                  "SLA target",
                  "Actual SLA",
                  "Open",
                  "Escalations",
                  "Risk score",
                ].map((h) => (
                  <th key={h} className={`px-6 py-3.5 text-left ${sectionLabel}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-zinc-500">
                    No customer risk data available.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.customerId}
                    className="transition-colors duration-150 hover:bg-white/[0.025]"
                  >
                    <td className="px-6 py-4">
                      <p className="text-[13px] font-medium text-white">{row.customerName}</p>
                      <span className={`mt-1 inline-flex ${riskLevelStyles[row.riskLevel]}`}>
                        {row.riskLevel}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 tabular-nums text-[13px] text-zinc-400">
                      {row.slaTarget.toFixed(1)}%
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 tabular-nums text-[13px] text-zinc-300">
                      {row.actualSla.toFixed(1)}%
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 tabular-nums text-[13px] text-rose-400/90">
                      {row.openExceptions}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 tabular-nums text-[13px] text-amber-400/90">
                      {row.escalationCount}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={`tabular-nums text-[13px] font-semibold ${riskScoreColor(row.riskScore)}`}
                      >
                        {row.riskScore}/100
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
