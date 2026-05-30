"use client";

import { DashboardShell } from "@/components/dashboard-shell";
import { SectionHeading } from "@/components/ui/section-heading";
import { ErrorState, LoadingState } from "@/components/ui/data-state";
import { SyncStatus } from "@/components/ui/sync-status";
import { useExceptions } from "@/context/exceptions-context";
import { useSlaIntelligence } from "@/hooks/use-sla-intelligence";
import {
  badgeBase,
  cardSurface,
  riskLevelLabels,
  riskLevelStyles,
  sectionLabel,
  severityStyles,
} from "@/lib/styles";
import type { Severity } from "@/lib/types";
import { useMemo } from "react";

const accentStyles = {
  emerald: "from-emerald-500/20 via-teal-500/10 to-transparent",
  amber: "from-amber-500/20 via-orange-500/10 to-transparent",
  rose: "from-rose-500/20 via-pink-500/10 to-transparent",
  violet: "from-violet-500/20 via-indigo-500/10 to-transparent",
} as const;

const accentValueStyles = {
  emerald: "text-emerald-400",
  amber: "text-amber-400",
  rose: "text-rose-400",
  violet: "text-violet-400",
} as const;

function computeCarrierPerformance(shipments: ReturnType<typeof useExceptions>["shipments"]) {
  const byCarrier = new Map<
    string,
    { total: number; onTime: number; delayed: number; totalDelayHours: number }
  >();

  for (const s of shipments) {
    const current = byCarrier.get(s.carrier) ?? {
      total: 0,
      onTime: 0,
      delayed: 0,
      totalDelayHours: 0,
    };
    current.total += 1;
    if (s.delayHours !== null || s.status === "Delayed" || s.status === "Exception") {
      current.delayed += 1;
      current.totalDelayHours += s.delayHours ?? 0;
    } else {
      current.onTime += 1;
    }
    byCarrier.set(s.carrier, current);
  }

  return [...byCarrier.entries()]
    .map(([carrier, stats]) => ({
      carrier,
      onTimePct:
        stats.total > 0
          ? Math.round(((stats.total - stats.delayed) / stats.total) * 1000) / 10
          : 100,
      activeLoads: stats.total,
      exceptions: stats.delayed,
      avgDelayHours:
        stats.delayed > 0
          ? Math.round((stats.totalDelayHours / stats.delayed) * 10) / 10
          : 0,
      trend:
        stats.total > 0 && (stats.total - stats.delayed) / stats.total >= 0.95
          ? ("up" as const)
          : stats.total > 0 && (stats.total - stats.delayed) / stats.total >= 0.9
            ? ("flat" as const)
            : ("down" as const),
    }))
    .sort((a, b) => b.activeLoads - a.activeLoads);
}

export function AnalyticsPage() {
  const { source, loading, error, refresh, exceptions, shipments } = useExceptions();
  const {
    slaTrendCards,
    customerMetrics,
    exceptionSeverityBreakdown,
    networkHealthScore,
    criticalExceptions,
  } = useSlaIntelligence();

  const carrierStats = useMemo(
    () => computeCarrierPerformance(shipments),
    [shipments],
  );

  const maxSeverityCount = Math.max(
    ...exceptionSeverityBreakdown.map((s) => s.count),
    1,
  );

  const syncState = loading ? "syncing" : error && source === "mock" ? "error" : "live";

  return (
    <DashboardShell
      eyebrow="Operations intelligence"
      title="Analytics"
      description="SLA performance, customer risk, and exception severity analysis"
      actions={<SyncStatus state={syncState} />}
    >
      {loading ? (
        <div className={`${cardSurface} overflow-hidden`}>
          <LoadingState
            title="Loading analytics"
            description="Computing SLA metrics and risk scores from your network data…"
          />
        </div>
      ) : error && shipments.length === 0 ? (
        <div className={`${cardSurface} overflow-hidden`}>
          <ErrorState description={error} onRetry={() => void refresh()} />
        </div>
      ) : (
        <div className="space-y-8">
          <section aria-label="SLA trend cards">
            <SectionHeading
              title="SLA performance"
              description="Network-wide delivery performance vs. customer targets"
            />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {slaTrendCards.map((card) => (
                <article
                  key={card.label}
                  className={`relative overflow-hidden ${cardSurface} p-5 transition-all duration-200 hover:border-white/[0.1] hover:bg-zinc-900/55`}
                >
                  <div
                    className={`pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b ${accentStyles[card.accent]}`}
                  />
                  <p className="relative text-xs font-medium text-zinc-500">
                    {card.label}
                  </p>
                  <p
                    className={`relative mt-2 text-3xl font-semibold tabular-nums tracking-tight ${accentValueStyles[card.accent]}`}
                  >
                    {card.value}
                  </p>
                  <p className="relative mt-2 text-xs text-zinc-500">{card.sublabel}</p>
                </article>
              ))}
            </div>
          </section>

          <section aria-label="Customer risk table">
            <SectionHeading
              title="Customer risk"
              description="Actual SLA performance compared to agreed targets"
              meta={
                <span className={`${badgeBase} bg-zinc-500/10 text-zinc-400 ring-zinc-500/20`}>
                  Health score {networkHealthScore}
                </span>
              }
            />
            <div className={`${cardSurface} overflow-hidden`}>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-zinc-900/60">
                    <tr className="border-b border-white/[0.06]">
                      {[
                        "Customer",
                        "Risk",
                        "Actual SLA",
                        "Target",
                        "Gap",
                        "Shipments",
                        "Delayed",
                        "Delivered",
                      ].map((h) => (
                        <th key={h} className={`px-6 py-3.5 text-left ${sectionLabel}`}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {customerMetrics.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-6 py-8 text-center text-sm text-zinc-500"
                        >
                          No customer data available for this organization.
                        </td>
                      </tr>
                    ) : (
                      customerMetrics.map((c) => (
                        <tr
                          key={c.customerId}
                          className="transition-colors duration-150 hover:bg-white/[0.025]"
                        >
                          <td className="px-6 py-4">
                            <p className="text-[13px] font-medium text-white">
                              {c.customerName}
                            </p>
                            <p className="mt-0.5 text-[11px] text-zinc-600">{c.tier}</p>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            <span className={riskLevelStyles[c.riskLevel]}>
                              {riskLevelLabels[c.riskLevel]}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            <span
                              className={`tabular-nums text-[13px] font-semibold ${
                                c.riskLevel === "green"
                                  ? "text-emerald-400"
                                  : c.riskLevel === "yellow"
                                    ? "text-amber-400"
                                    : "text-rose-400"
                              }`}
                            >
                              {c.onTimePercent.toFixed(1)}%
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 tabular-nums text-[13px] text-zinc-400">
                            {c.slaTarget}%
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            <span
                              className={`tabular-nums text-[13px] font-medium ${
                                c.gapFromTarget >= 0
                                  ? "text-emerald-400"
                                  : c.gapFromTarget >= -3
                                    ? "text-amber-400"
                                    : "text-rose-400"
                              }`}
                            >
                              {c.gapFromTarget >= 0 ? "+" : ""}
                              {c.gapFromTarget.toFixed(1)}%
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 tabular-nums text-[13px] text-zinc-300">
                            {c.totalShipments}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 tabular-nums text-[13px] text-amber-400/90">
                            {c.delayedShipments}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 tabular-nums text-[13px] text-emerald-400/90">
                            {c.deliveredShipments}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className={`${cardSurface} p-5 sm:p-6`}>
              <SectionHeading
                title="Exception severity breakdown"
                description={`${criticalExceptions} critical · open exceptions by risk score`}
              />
              <ul className="mt-4 space-y-4">
                {exceptionSeverityBreakdown.map((item) => (
                  <li key={item.severity}>
                    <div className="flex items-center justify-between gap-4 text-xs">
                      <span className={severityStyles[item.severity as Severity]}>
                        {item.severity}
                      </span>
                      <span className="shrink-0 tabular-nums text-zinc-500">
                        {item.count} · score {item.riskScore} · {item.pct}%
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                      <div
                        className={`h-full rounded-full transition-all ${
                          item.severity === "Critical"
                            ? "bg-gradient-to-r from-rose-600 to-rose-500"
                            : item.severity === "High"
                              ? "bg-gradient-to-r from-orange-600 to-orange-500"
                              : item.severity === "Medium"
                                ? "bg-gradient-to-r from-amber-600 to-amber-500"
                                : "bg-gradient-to-r from-zinc-600 to-zinc-500"
                        }`}
                        style={{
                          width: `${Math.max(4, (item.count / maxSeverityCount) * 100)}%`,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section className={`${cardSurface} p-5 sm:p-6`}>
              <SectionHeading
                title="Highest-risk exceptions"
                description="Open critical and high severity items"
              />
              <ul className="mt-4 divide-y divide-white/[0.04]">
                {exceptions
                  .filter(
                    (e) =>
                      e.status !== "Resolved" &&
                      (e.severity === "Critical" || e.severity === "High"),
                  )
                  .slice(0, 6)
                  .map((exc) => (
                    <li
                      key={exc.id}
                      className="flex items-start justify-between gap-3 py-3 first:pt-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-white">
                          {exc.title}
                        </p>
                        <p className="mt-0.5 text-[11px] text-zinc-500">
                          {exc.customer} · {exc.shipmentId}
                        </p>
                      </div>
                      <span className={severityStyles[exc.severity]}>{exc.severity}</span>
                    </li>
                  ))}
                {exceptions.filter(
                  (e) =>
                    e.status !== "Resolved" &&
                    (e.severity === "Critical" || e.severity === "High"),
                ).length === 0 && (
                  <li className="py-6 text-center text-sm text-zinc-500">
                    No critical or high severity exceptions open.
                  </li>
                )}
              </ul>
            </section>
          </div>

          {carrierStats.length > 0 && (
            <section>
              <SectionHeading
                title="Carrier performance"
                description="On-time delivery computed from active shipment data"
              />
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {carrierStats.map((c) => (
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
                        <dt className={sectionLabel}>Delayed</dt>
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
          )}
        </div>
      )}
    </DashboardShell>
  );
}
