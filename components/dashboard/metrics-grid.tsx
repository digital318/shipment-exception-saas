"use client";

import {
  IconAlertCircle,
  IconCheckCircle,
  IconClock,
  IconHeartPulse,
  IconTrendingUp,
  IconUsers,
  IconZap,
} from "@/components/icons";
import { ErrorState, LoadingState } from "@/components/ui/data-state";
import { useExecutiveMetrics } from "@/hooks/use-executive-metrics";
import { badgeBase, cardSurface } from "@/lib/styles";

type Trend = "up" | "down" | "neutral";

export function MetricsGrid() {
  const {
    openExceptions,
    escalatedExceptions,
    overdueFollowUps,
    customersAtRisk,
    slaCompliancePercent,
    networkHealthScore,
    averageResolutionTimeHours,
    exceptionsCreatedLast7Days,
    loading,
    error,
    refresh,
  } = useExecutiveMetrics();

  if (loading) {
    return (
      <section aria-label="Executive metrics">
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
      <section aria-label="Executive metrics">
        <div className={`${cardSurface} overflow-hidden`}>
          <ErrorState description={error} onRetry={() => void refresh()} />
        </div>
      </section>
    );
  }

  const metrics: {
    label: string;
    value: string;
    delta: string;
    hint: string;
    trend: Trend;
    gradient: string;
    icon: typeof IconHeartPulse;
    iconColor: string;
    iconBg: string;
  }[] = [
    {
      label: "Open Exceptions",
      value: String(openExceptions),
      delta: `${escalatedExceptions} escalated`,
      hint: "active across network",
      trend: openExceptions <= 3 ? "up" : openExceptions <= 8 ? "neutral" : "down",
      gradient: "from-rose-500/20 via-pink-500/10 to-transparent",
      icon: IconAlertCircle,
      iconColor: "text-rose-400",
      iconBg: "bg-rose-500/10 ring-rose-500/20",
    },
    {
      label: "Escalated Exceptions",
      value: String(escalatedExceptions),
      delta: `${openExceptions} total open`,
      hint: "level 2+ or escalated status",
      trend: escalatedExceptions === 0 ? "up" : escalatedExceptions <= 2 ? "neutral" : "down",
      gradient: "from-orange-500/20 via-amber-500/10 to-transparent",
      icon: IconZap,
      iconColor: "text-orange-400",
      iconBg: "bg-orange-500/10 ring-orange-500/20",
    },
    {
      label: "Overdue Follow-Ups",
      value: String(overdueFollowUps),
      delta: overdueFollowUps === 0 ? "All on schedule" : "playbooks past due",
      hint: "next_follow_up_at passed",
      trend: overdueFollowUps === 0 ? "up" : overdueFollowUps <= 2 ? "neutral" : "down",
      gradient: "from-amber-500/20 via-yellow-500/10 to-transparent",
      icon: IconClock,
      iconColor: "text-amber-400",
      iconBg: "bg-amber-500/10 ring-amber-500/20",
    },
    {
      label: "Customers At Risk",
      value: String(customersAtRisk),
      delta: customersAtRisk === 0 ? "All on target" : "below SLA threshold",
      hint: "yellow or red status",
      trend: customersAtRisk === 0 ? "up" : customersAtRisk <= 2 ? "neutral" : "down",
      gradient: "from-amber-500/20 via-orange-500/10 to-transparent",
      icon: IconUsers,
      iconColor: "text-amber-400",
      iconBg: "bg-amber-500/10 ring-amber-500/20",
    },
    {
      label: "SLA Compliance",
      value: `${slaCompliancePercent}%`,
      delta: slaCompliancePercent >= 80 ? "meeting threshold" : "below 80% target",
      hint: "customers on green SLA",
      trend: slaCompliancePercent >= 80 ? "up" : slaCompliancePercent >= 60 ? "neutral" : "down",
      gradient: "from-emerald-500/20 via-teal-500/10 to-transparent",
      icon: IconCheckCircle,
      iconColor: "text-emerald-400",
      iconBg: "bg-emerald-500/10 ring-emerald-500/20",
    },
    {
      label: "Network Health Score",
      value: String(networkHealthScore),
      delta: `${openExceptions} open exceptions`,
      hint: "0–100 risk-adjusted score",
      trend: networkHealthScore >= 70 ? "up" : networkHealthScore >= 50 ? "neutral" : "down",
      gradient: "from-violet-500/20 via-indigo-500/10 to-transparent",
      icon: IconHeartPulse,
      iconColor: "text-violet-400",
      iconBg: "bg-violet-500/10 ring-violet-500/20",
    },
    {
      label: "Avg Resolution Time",
      value: averageResolutionTimeHours > 0 ? `${averageResolutionTimeHours}h` : "—",
      delta: "resolved exceptions",
      hint: "open to close duration",
      trend:
        averageResolutionTimeHours <= 24
          ? "up"
          : averageResolutionTimeHours <= 72
            ? "neutral"
            : "down",
      gradient: "from-sky-500/20 via-blue-500/10 to-transparent",
      icon: IconClock,
      iconColor: "text-sky-400",
      iconBg: "bg-sky-500/10 ring-sky-500/20",
    },
    {
      label: "Exceptions (7 days)",
      value: String(exceptionsCreatedLast7Days),
      delta: "created this week",
      hint: "new operational issues",
      trend:
        exceptionsCreatedLast7Days <= 3
          ? "up"
          : exceptionsCreatedLast7Days <= 8
            ? "neutral"
            : "down",
      gradient: "from-indigo-500/20 via-violet-500/10 to-transparent",
      icon: IconTrendingUp,
      iconColor: "text-indigo-400",
      iconBg: "bg-indigo-500/10 ring-indigo-500/20",
    },
  ];

  return (
    <section aria-label="Executive metrics">
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
            <p className="relative mt-6 text-xs font-medium text-zinc-500">{metric.label}</p>
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
