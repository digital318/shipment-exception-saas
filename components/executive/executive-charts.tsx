"use client";

import { SectionHeading } from "@/components/ui/section-heading";
import { ESCALATION_LEVEL_LABELS } from "@/lib/playbooks";
import { cardSurface, sectionLabel, severityStyles } from "@/lib/styles";
import type { EscalationLevel, Severity } from "@/lib/types";
import type { ExceptionSeverityBreakdown } from "@/lib/sla-intelligence";
import type { TrendPoint } from "@/lib/services/metrics-service";

const severityBarColors: Record<Severity, string> = {
  Critical: "bg-gradient-to-r from-rose-600 to-rose-500",
  High: "bg-gradient-to-r from-orange-600 to-orange-500",
  Medium: "bg-gradient-to-r from-amber-600 to-amber-500",
  Low: "bg-gradient-to-r from-zinc-600 to-zinc-500",
};

const levelBarColors: Record<EscalationLevel, string> = {
  1: "bg-gradient-to-r from-emerald-600 to-emerald-500",
  2: "bg-gradient-to-r from-sky-600 to-sky-500",
  3: "bg-gradient-to-r from-amber-600 to-amber-500",
  4: "bg-gradient-to-r from-rose-600 to-rose-500",
};

function TrendChart({
  title,
  description,
  points,
  accent,
  suffix = "",
}: {
  title: string;
  description: string;
  points: TrendPoint[];
  accent: string;
  suffix?: string;
}) {
  const max = Math.max(...points.map((p) => p.value), 1);

  return (
    <section className={`${cardSurface} p-5 sm:p-6`}>
      <SectionHeading title={title} description={description} />
      <div className="mt-5 flex items-end gap-2 sm:gap-3">
        {points.map((point) => (
          <div key={point.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <span className="text-[10px] tabular-nums text-zinc-500">
              {point.value}
              {suffix}
            </span>
            <div className="flex h-28 w-full items-end rounded-md bg-zinc-800/60 px-1 pb-1 pt-2">
              <div
                className={`w-full rounded-sm ${accent} transition-all`}
                style={{ height: `${Math.max(8, (point.value / max) * 100)}%` }}
              />
            </div>
            <span className="truncate text-[9px] text-zinc-600">{point.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ExceptionsBySeverityChart({
  breakdown,
}: {
  breakdown: ExceptionSeverityBreakdown[];
}) {
  const max = Math.max(...breakdown.map((s) => s.count), 1);

  return (
    <section className={`${cardSurface} p-5 sm:p-6`}>
      <SectionHeading
        title="Exceptions by severity"
        description="Open exceptions weighted by operational risk"
      />
      <ul className="mt-4 space-y-4">
        {breakdown.map((item) => (
          <li key={item.severity}>
            <div className="flex items-center justify-between gap-4 text-xs">
              <span className={severityStyles[item.severity]}>{item.severity}</span>
              <span className="shrink-0 tabular-nums text-zinc-500">
                {item.count} · {item.pct}%
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-800">
              <div
                className={`h-full rounded-full transition-all ${severityBarColors[item.severity]}`}
                style={{ width: `${Math.max(4, (item.count / max) * 100)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function EscalationsByLevelChart({
  levels,
}: {
  levels: { level: EscalationLevel; count: number }[];
}) {
  const max = Math.max(...levels.map((l) => l.count), 1);

  return (
    <section className={`${cardSurface} p-5 sm:p-6`}>
      <SectionHeading
        title="Escalations by level"
        description="Open exceptions grouped by playbook escalation tier"
      />
      <ul className="mt-4 space-y-4">
        {levels.map((item) => (
          <li key={item.level}>
            <div className="flex items-center justify-between gap-4 text-xs">
              <span className="text-zinc-300">
                L{item.level} · {ESCALATION_LEVEL_LABELS[item.level]}
              </span>
              <span className="shrink-0 tabular-nums text-zinc-500">{item.count}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-800">
              <div
                className={`h-full rounded-full transition-all ${levelBarColors[item.level]}`}
                style={{ width: `${Math.max(4, (item.count / max) * 100)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ExecutiveTrendCharts({
  slaTrend,
  exceptionCreationTrend,
  networkHealthTrend,
  escalationTrend,
}: {
  slaTrend: TrendPoint[];
  exceptionCreationTrend: TrendPoint[];
  networkHealthTrend: TrendPoint[];
  escalationTrend: TrendPoint[];
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <TrendChart
        title="SLA trend"
        description="7-day SLA compliance trajectory"
        points={slaTrend}
        accent="bg-gradient-to-t from-emerald-600/80 to-emerald-400/60"
        suffix="%"
      />
      <TrendChart
        title="Exception creation trend"
        description="New exceptions opened over the last 7 days"
        points={exceptionCreationTrend}
        accent="bg-gradient-to-t from-violet-600/80 to-violet-400/60"
      />
      <TrendChart
        title="Network health trend"
        description="Risk-adjusted operational health score"
        points={networkHealthTrend}
        accent="bg-gradient-to-t from-indigo-600/80 to-indigo-400/60"
      />
      <TrendChart
        title="Escalation trend"
        description="Active escalations over the last 7 days"
        points={escalationTrend}
        accent="bg-gradient-to-t from-amber-600/80 to-amber-400/60"
      />
    </div>
  );
}

export function FollowUpComplianceCard({
  compliancePercent,
  overdueFollowUps,
}: {
  compliancePercent: number;
  overdueFollowUps: number;
}) {
  const tone =
    compliancePercent >= 90 ? "text-emerald-400" : compliancePercent >= 70 ? "text-amber-400" : "text-rose-400";

  return (
    <article className={`${cardSurface} p-5 sm:p-6`}>
      <p className={sectionLabel}>Follow-up compliance</p>
      <p className={`mt-3 text-3xl font-semibold tabular-nums tracking-tight ${tone}`}>
        {compliancePercent}%
      </p>
      <p className="mt-2 text-xs text-zinc-500">
        {overdueFollowUps} overdue follow-up{overdueFollowUps === 1 ? "" : "s"} requiring action
      </p>
    </article>
  );
}
