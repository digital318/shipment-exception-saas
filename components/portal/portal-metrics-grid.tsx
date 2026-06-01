"use client";

import {
  IconAlertCircle,
  IconCheckCircle,
  IconClock,
  IconPackage,
  IconTrendingUp,
} from "@/components/icons";
import { cardSurface } from "@/lib/styles";
import type { CustomerPortalDashboard } from "@/lib/customer-portal/metrics";

function riskColor(score: number): string {
  if (score >= 60) return "text-rose-400";
  if (score >= 35) return "text-amber-400";
  return "text-emerald-400";
}

export function PortalMetricsGrid({ dashboard }: { dashboard: CustomerPortalDashboard }) {
  const metrics = [
    {
      label: "Active Shipments",
      value: String(dashboard.activeShipments),
      hint: "in transit or pending",
      icon: IconPackage,
      iconColor: "text-sky-400",
      iconBg: "bg-sky-500/10 ring-sky-500/20",
      gradient: "from-sky-500/20 via-blue-500/10 to-transparent",
    },
    {
      label: "Open Exceptions",
      value: String(dashboard.openExceptions),
      hint: "requiring attention",
      icon: IconAlertCircle,
      iconColor: "text-rose-400",
      iconBg: "bg-rose-500/10 ring-rose-500/20",
      gradient: "from-rose-500/20 via-pink-500/10 to-transparent",
    },
    {
      label: "SLA Performance",
      value: `${dashboard.actualSla.toFixed(1)}%`,
      hint: `target ${dashboard.slaTarget.toFixed(1)}%`,
      icon: IconTrendingUp,
      iconColor: dashboard.actualSla >= dashboard.slaTarget ? "text-emerald-400" : "text-amber-400",
      iconBg:
        dashboard.actualSla >= dashboard.slaTarget
          ? "bg-emerald-500/10 ring-emerald-500/20"
          : "bg-amber-500/10 ring-amber-500/20",
      gradient: "from-violet-500/20 via-indigo-500/10 to-transparent",
    },
    {
      label: "On-Time Delivery",
      value: `${dashboard.onTimePercent.toFixed(1)}%`,
      hint: "across your shipments",
      icon: IconCheckCircle,
      iconColor: "text-emerald-400",
      iconBg: "bg-emerald-500/10 ring-emerald-500/20",
      gradient: "from-emerald-500/20 via-teal-500/10 to-transparent",
    },
    {
      label: "Risk Score",
      value: `${dashboard.riskScore}/100`,
      hint: "service health index",
      icon: IconClock,
      iconColor: riskColor(dashboard.riskScore),
      iconBg: "bg-zinc-500/10 ring-zinc-500/20",
      gradient: "from-zinc-500/20 via-zinc-500/10 to-transparent",
    },
  ];

  return (
    <section aria-label="Customer dashboard metrics">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {metrics.map((metric) => (
          <article
            key={metric.label}
            className={`${cardSurface} relative overflow-hidden p-5`}
          >
            <div
              aria-hidden
              className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${metric.gradient}`}
            />
            <div className="relative flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                  {metric.label}
                </p>
                <p className={`mt-2 text-2xl font-semibold tabular-nums tracking-tight text-white ${metric.label === "Risk Score" ? riskColor(dashboard.riskScore) : ""}`}>
                  {metric.value}
                </p>
                <p className="mt-1 text-[11px] text-zinc-500">{metric.hint}</p>
              </div>
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ${metric.iconBg}`}
              >
                <metric.icon className={`h-[18px] w-[18px] ${metric.iconColor}`} />
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
