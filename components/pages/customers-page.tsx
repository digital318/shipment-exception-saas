import { DashboardShell } from "@/components/dashboard-shell";
import { SyncStatus } from "@/components/ui/sync-status";
import { customers } from "@/lib/mock-data";
import {
  badgeBase,
  cardSurface,
  sectionLabel,
} from "@/lib/styles";

function slaColor(pct: number) {
  if (pct >= 97) return "text-emerald-400";
  if (pct >= 93) return "text-amber-400";
  return "text-rose-400";
}

const tierStyles = {
  Enterprise: `${badgeBase} bg-violet-500/10 text-violet-300 ring-violet-500/20`,
  Growth: `${badgeBase} bg-sky-500/10 text-sky-300 ring-sky-500/20`,
  Standard: `${badgeBase} bg-zinc-500/10 text-zinc-400 ring-zinc-500/20`,
};

export function CustomersPage() {
  return (
    <DashboardShell
      eyebrow="Account management"
      title="Customers"
      description={`${customers.length} active accounts · SLA and exception overview`}
      actions={<SyncStatus state="live" />}
    >
      <div className={`${cardSurface} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-900/60">
              <tr className="border-b border-white/[0.06]">
                {[
                  "Customer",
                  "Tier",
                  "Region",
                  "Active shipments",
                  "Exceptions",
                  "SLA performance",
                  "Account manager",
                ].map((h) => (
                  <th key={h} className={`px-6 py-3.5 text-left ${sectionLabel}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {customers.map((c) => (
                <tr
                  key={c.id}
                  className="transition-colors duration-150 hover:bg-white/[0.025]"
                >
                  <td className="px-6 py-4">
                    <p className="text-[13px] font-medium text-white">{c.name}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-zinc-600">
                      {c.id}
                    </p>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className={tierStyles[c.tier]}>{c.tier}</span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-[13px] text-zinc-400">
                    {c.region}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 tabular-nums text-[13px] text-zinc-300">
                    {c.activeShipments.toLocaleString()}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span
                      className={`tabular-nums text-[13px] font-medium ${
                        c.exceptions > 5 ? "text-rose-400" : "text-zinc-300"
                      }`}
                    >
                      {c.exceptions}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-zinc-800">
                        <div
                          className={`h-full rounded-full ${
                            c.slaPerformance >= 97
                              ? "bg-emerald-500"
                              : c.slaPerformance >= 93
                                ? "bg-amber-500"
                                : "bg-rose-500"
                          }`}
                          style={{ width: `${c.slaPerformance}%` }}
                        />
                      </div>
                      <span
                        className={`tabular-nums text-[13px] font-semibold ${slaColor(c.slaPerformance)}`}
                      >
                        {c.slaPerformance}%
                      </span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-[13px] text-zinc-400">
                    {c.accountManager}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardShell>
  );
}
