"use client";

import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeading } from "@/components/ui/section-heading";
import type { CustomerSafeException } from "@/lib/customer-portal/visibility";
import { cardSurface, issueStatusStyles, sectionLabel, severityStyles } from "@/lib/styles";

export function PortalExceptionsTable({
  exceptions,
}: {
  exceptions: CustomerSafeException[];
}) {
  return (
    <section aria-label="Customer exceptions">
      <SectionHeading
        title="Open Exceptions"
        description={`${exceptions.length} active exception${exceptions.length === 1 ? "" : "s"}`}
      />
      <div className={`${cardSurface} overflow-hidden`}>
        {exceptions.length === 0 ? (
          <EmptyState
            title="No open exceptions"
            description="All shipments are on track — no active exceptions for your account."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-zinc-900/60">
                <tr className="border-b border-white/[0.06]">
                  {[
                    "Exception",
                    "Shipment",
                    "Severity",
                    "Status",
                    "Assigned Owner",
                    "Latest Update",
                  ].map((h) => (
                    <th key={h} className={`px-5 py-3.5 text-left ${sectionLabel}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {exceptions.map((exc) => (
                  <tr
                    key={exc.id}
                    className="transition-colors duration-150 hover:bg-white/[0.025]"
                  >
                    <td className="max-w-[200px] px-5 py-3.5">
                      <p className="truncate text-[13px] font-medium text-white">{exc.title}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-zinc-600">{exc.id}</p>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 font-mono text-[13px] text-violet-300">
                      {exc.shipmentId}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5">
                      <span className={severityStyles[exc.severity]}>{exc.severity}</span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5">
                      <span className={`text-[13px] font-medium ${issueStatusStyles[exc.status]}`}>
                        {exc.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-[13px] text-zinc-400">
                      {exc.owner}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-[13px] tabular-nums text-zinc-500">
                      {exc.updatedAt}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
