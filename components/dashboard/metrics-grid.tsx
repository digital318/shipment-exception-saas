"use client";

import {
  IconAlertCircle,
  IconCheckCircle,
  IconHeartPulse,
  IconUsers,
} from "@/components/icons";
import { ErrorState, LoadingState } from "@/components/ui/data-state";
import { useSlaIntelligence } from "@/hooks/use-sla-intelligence";
import { badgeBase, cardSurface } from "@/lib/styles";

export function MetricsGrid() {
  const {
    networkHealthScore,
    slaCompliancePercent,
    customersAtRisk,
    criticalExceptions,
    openExceptions,
    overallOnTimePercent,
    averageSlaTarget,
    loading,
    error,
    refresh,
  } = useSlaIntelligence();

  if (loading) {
    return (
      <section aria-label="Intelligence metrics">
        <div className={`${cardSurface} overflow-hidden`}>
          <LoadingState
            title="Loading intelligence"
            description="Calculating SLA performance and risk scores…"
          />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section aria-label="Intelligence metrics">
        <div className={`${cardSurface} overflow-hidden`}>
          <ErrorState description={error} onRetry={() => void refresh()} />
        </div>
      </section>
    );
  }

  const metrics = [
    {
      label: "Network Health Score",
      value: String(networkHealthScore),
      delta: `${openExceptions} open exceptions`,
      hint: "0–100 risk-adjusted score",
      trend:
        networkHealthScore >= 70
          ? ("up" as const)
          : networkHealthScore >= 50
            ? ("neutral" as const)
            : ("down" as const),
      gradient: "from-violet-500/20 via-indigo-500/10 to-transparent",
      icon: IconHeartPulse,
      iconColor: "text-violet-400",
      iconBg: "bg-violet-500/10 ring-violet-500/20",
    },
    {
      label: "Customers At Risk",
      value: String(customersAtRisk),
      delta: customersAtRisk === 0 ? "All on target" : "below SLA threshold",
      hint: "yellow or red status",
      trend:
        customersAtRisk === 0
          ? ("up" as const)
          : customersAtRisk <= 2
            ? ("neutral" as const)
            : ("down" as const),
      gradient: "from-amber-500/20 via-orange-500/10 to-transparent",
      icon: IconUsers,
      iconColor: "text-amber-400",
      iconBg: "bg-amber-500/10 ring-amber-500/20",
    },
    {
      label: "SLA Compliance",
      value: `${slaCompliancePercent}%`,
      delta: `${overallOnTimePercent.toFixed(1)}% on-time`,
      hint: `avg target ${averageSlaTarget.toFixed(1)}%`,
      trend:
        slaCompliancePercent >= 80
          ? ("up" as const)
          : slaCompliancePercent >= 60
            ? ("neutral" as const)
            : ("down" as const),
      gradient: "from-emerald-500/20 via-teal-500/10 to-transparent",
      icon: IconCheckCircle,
      iconColor: "text-emerald-400",
      iconBg: "bg-emerald-500/10 ring-emerald-500/20",
    },
    {
      label: "Critical Exceptions",
      value: String(criticalExceptions),
      delta: `${openExceptions} total open`,
      hint: "require immediate action",
      trend:
        criticalExceptions === 0
          ? ("up" as const)
          : criticalExceptions <= 2
            ? ("neutral" as const)
            : ("down" as const),
      gradient: "from-rose-500/20 via-pink-500/10 to-transparent",
      icon: IconAlertCircle,
      iconColor: "text-rose-400",
      iconBg: "bg-rose-500/10 ring-rose-500/20",
    },
  ];

  return (
    <section aria-label="Intelligence metrics">
      <div className="grid gap-4 sm:grid-cols-2 lg:gap-5 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className={`group relative overflow-hidden ${cardSurface} p-5 transition-all duration-300 hover:-translate-y-px hover:border-white/[0.1] hover:bg-zinc-900/60 hover:shadow-md hover:shadow-black/25 sm:p-6`}
          >
            <div
              className={`pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b ${metric.gradient}`}
            />
            <div className="relative flex items-start justify-between gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] ring-1 ${metric.iconBg}`}
              >
                <metric.icon className={`h-[18px] w-[18px] ${metric.iconColor}`} />
              </div>
              <span
                className={`${badgeBase} ${
                  metric.trend === "up"
                    ? "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20"
                    : metric.trend === "down"
                      ? "bg-rose-500/10 text-rose-400 ring-rose-500/20"
                      : "bg-amber-500/10 text-amber-400 ring-amber-500/20"
                }`}
              >
                {metric.trend === "up" ? "↑" : metric.trend === "down" ? "↓" : "•"}
              </span>
            </div>
            <p className="relative mt-6 text-xs font-medium text-zinc-500">
              {metric.label}
            </p>
            <p className="relative mt-1.5 text-[1.75rem] font-semibold tabular-nums tracking-tight text-white">
              {metric.value}
            </p>
            <p className="relative mt-2 text-xs leading-relaxed text-zinc-500">
              <span
                className={
                  metric.trend === "up"
                    ? "font-medium text-emerald-400"
                    : metric.trend === "down"
                      ? "font-medium text-rose-400"
                      : "font-medium text-amber-400"
                }
              >
                {metric.delta}
              </span>{" "}
              {metric.hint}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
