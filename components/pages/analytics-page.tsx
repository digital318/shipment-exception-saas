import { DashboardShell } from "@/components/dashboard-shell";
import { SectionHeading } from "@/components/ui/section-heading";
import { SyncStatus } from "@/components/ui/sync-status";
import {
  carrierPerformance,
  delayReasonSummary,
  weeklyExceptionTrend,
} from "@/lib/mock-data";
import { badgeBase, cardSurface, sectionLabel } from "@/lib/styles";

const maxExceptions = Math.max(...weeklyExceptionTrend.map((d) => d.exceptions));

export function AnalyticsPage() {
  return (
    <DashboardShell
      eyebrow="Performance insights"
      title="Analytics"
      description="Carrier performance, delay patterns, and weekly exception trends"
      actions={<SyncStatus state="live" />}
    >
      <div className="space-y-8">
        <section>
          <SectionHeading
            title="Carrier performance"
            description="On-time delivery and exception rates by carrier"
          />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {carrierPerformance.map((c) => (
              <article
                key={c.carrier}
                className={`${cardSurface} p-5 transition-all duration-200 hover:border-white/[0.1] hover:bg-zinc-900/55`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-white">{c.carrier}</h3>
                  <span
                    className={`${badgeBase} ${
                      c.trend === "up"
                        ? "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20"
                        : c.trend === "down"
                          ? "bg-rose-500/10 text-rose-400 ring-rose-500/20"
                          : "bg-zinc-500/10 text-zinc-400 ring-zinc-500/20"
                    }`}
                  >
                    {c.trend === "up" ? "↑" : c.trend === "down" ? "↓" : "—"}
                  </span>
                </div>
                <p className="mt-4 text-3xl font-semibold tabular-nums tracking-tight text-white">
                  {c.onTimePct}%
                </p>
                <p className="mt-1 text-xs text-zinc-500">On-time delivery</p>
                <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-white/[0.04] pt-4 text-center">
                  <div>
                    <dt className={sectionLabel}>Loads</dt>
                    <dd className="mt-1 tabular-nums text-sm font-medium text-zinc-300">
                      {c.activeLoads}
                    </dd>
                  </div>
                  <div>
                    <dt className={sectionLabel}>Exceptions</dt>
                    <dd className="mt-1 tabular-nums text-sm font-medium text-rose-400/90">
                      {c.exceptions}
                    </dd>
                  </div>
                  <div>
                    <dt className={sectionLabel}>Avg delay</dt>
                    <dd className="mt-1 tabular-nums text-sm font-medium text-amber-400/90">
                      {c.avgDelayHours}h
                    </dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className={`${cardSurface} p-5 sm:p-6`}>
            <SectionHeading
              title="Delay reasons"
              description="Top contributors to shipment delays this week"
            />
            <ul className="mt-2 space-y-4">
              {delayReasonSummary.map((d) => (
                <li key={d.reason}>
                  <div className="flex items-center justify-between gap-4 text-xs">
                    <span className="text-zinc-300">{d.reason}</span>
                    <span className="shrink-0 tabular-nums text-zinc-500">
                      {d.count} · {d.pct}%
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-600 to-indigo-500 transition-all"
                      style={{ width: `${d.pct}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className={`${cardSurface} p-5 sm:p-6`}>
            <SectionHeading
              title="Weekly exception trend"
              description="Exceptions opened per day · last 7 days"
            />
            <div className="mt-6 flex items-end justify-between gap-2 sm:gap-3">
              {weeklyExceptionTrend.map((point) => (
                <div
                  key={point.day}
                  className="flex flex-1 flex-col items-center gap-2"
                >
                  <span className="text-[10px] tabular-nums text-zinc-500">
                    {point.exceptions}
                  </span>
                  <div
                    className="w-full max-w-[40px] rounded-t-md bg-gradient-to-t from-violet-600/80 to-indigo-500/40 transition-all hover:from-violet-500 hover:to-indigo-400/60"
                    style={{
                      height: `${Math.max(12, (point.exceptions / maxExceptions) * 140)}px`,
                    }}
                    title={`${point.exceptions} exceptions`}
                  />
                  <span className="text-[11px] font-medium text-zinc-500">
                    {point.day}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </DashboardShell>
  );
}
