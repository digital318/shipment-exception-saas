"use client";

import { SectionHeading } from "@/components/ui/section-heading";
import { formatEscalationLevel } from "@/lib/playbooks";
import {
  agingHealthLabels,
  agingHealthStyles,
  cardSurface,
  sectionLabel,
} from "@/lib/styles";
import type { EscalationAgingRow } from "@/lib/services/metrics-service";

function AgingBadge({ health }: { health: EscalationAgingRow["overallHealth"] }) {
  return (
    <span className={agingHealthStyles[health]}>{agingHealthLabels[health]}</span>
  );
}

export function EscalationAgingTable({ rows }: { rows: EscalationAgingRow[] }) {
  if (rows.length === 0) {
    return (
      <section className={`${cardSurface} p-6 text-center text-sm text-zinc-500`}>
        No active escalations with playbook assignments.
      </section>
    );
  }

  return (
    <section aria-label="Escalation aging">
      <SectionHeading
        title="Escalation aging"
        description="Days open, follow-up cadence, and escalation level health indicators"
      />
      <div className={`${cardSurface} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-900/60">
              <tr className="border-b border-white/[0.06]">
                {[
                  "Exception",
                  "Customer",
                  "Days open",
                  "Since follow-up",
                  "Escalation",
                  "Health",
                ].map((h) => (
                  <th key={h} className={`px-6 py-3.5 text-left ${sectionLabel}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {rows.map((row) => (
                <tr
                  key={row.exceptionId}
                  className="transition-colors duration-150 hover:bg-white/[0.025]"
                >
                  <td className="px-6 py-4">
                    <p className="text-[13px] font-medium text-white">{row.title}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-zinc-600">
                      {row.displayId} · {row.shipmentId}
                    </p>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-[13px] text-zinc-300">
                    {row.customer}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className={agingHealthStyles[row.daysOpenHealth]}>
                      {row.daysOpen}d
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className={agingHealthStyles[row.followUpHealth]}>
                      {row.daysSinceLastFollowUp > 0
                        ? `${row.daysSinceLastFollowUp}d overdue`
                        : "On schedule"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-[13px] text-zinc-400">
                    {formatEscalationLevel(row.escalationLevel)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <AgingBadge health={row.overallHealth} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
