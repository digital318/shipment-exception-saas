"use client";

import {
  IconAlertCircle,
  IconCheckCircle,
  IconClock,
  IconTruck,
} from "@/components/icons";
import { useExceptions } from "@/context/exceptions-context";
import { shipmentRows } from "@/lib/mock-data";
import { badgeBase, cardSurface } from "@/lib/styles";

export function MetricsGrid() {
  const { exceptions, openCount } = useExceptions();

  const criticalCount = exceptions.filter(
    (e) => e.severity === "Critical" && e.status !== "Resolved",
  ).length;
  const delayedCount = shipmentRows.filter((s) => s.status === "Delayed").length;
  const onTimePct = (
    (shipmentRows.filter((s) => s.delayHours === null).length / shipmentRows.length) *
    100
  ).toFixed(1);

  const metrics = [
    {
      label: "Active Shipments",
      value: "1,284",
      delta: "+38",
      hint: "in network today",
      trend: "up" as const,
      gradient: "from-violet-500/20 via-indigo-500/10 to-transparent",
      icon: IconTruck,
      iconColor: "text-violet-400",
      iconBg: "bg-violet-500/10 ring-violet-500/20",
    },
    {
      label: "Delayed Shipments",
      value: String(delayedCount + 86),
      delta: `${delayedCount} on this page`,
      hint: "require ETA revision",
      trend: "down" as const,
      gradient: "from-amber-500/20 via-orange-500/10 to-transparent",
      icon: IconClock,
      iconColor: "text-amber-400",
      iconBg: "bg-amber-500/10 ring-amber-500/20",
    },
    {
      label: "Open Exceptions",
      value: String(openCount),
      delta: `${criticalCount} critical`,
      hint: "need resolution",
      trend: "neutral" as const,
      gradient: "from-rose-500/20 via-pink-500/10 to-transparent",
      icon: IconAlertCircle,
      iconColor: "text-rose-400",
      iconBg: "bg-rose-500/10 ring-rose-500/20",
    },
    {
      label: "On-Time Delivery",
      value: `${onTimePct}%`,
      delta: "97.0%",
      hint: "weekly SLA target",
      trend: "up" as const,
      gradient: "from-emerald-500/20 via-teal-500/10 to-transparent",
      icon: IconCheckCircle,
      iconColor: "text-emerald-400",
      iconBg: "bg-emerald-500/10 ring-emerald-500/20",
    },
  ];

  return (
    <section aria-label="Key metrics">
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
                      ? "bg-amber-500/10 text-amber-400 ring-amber-500/20"
                      : "bg-zinc-500/10 text-zinc-400 ring-zinc-500/20"
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
                      ? "font-medium text-amber-400"
                      : "font-medium text-zinc-400"
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
