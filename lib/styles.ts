import type { IssueStatus, Severity, ShipmentStatus, CarrierStatus } from "./types";

export const badgeBase =
  "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium leading-none ring-1 ring-inset";

export const btnSecondary =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3.5 py-2 text-xs font-medium text-zinc-300 shadow-sm transition-all duration-200 hover:border-white/[0.14] hover:bg-white/[0.06] hover:text-white hover:shadow-md hover:shadow-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/30 active:scale-[0.97] active:bg-white/[0.08] disabled:pointer-events-none";

export const btnPrimary =
  "group relative inline-flex items-center justify-center gap-1.5 overflow-hidden rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-violet-500/20 transition-all duration-200 hover:from-violet-500 hover:to-indigo-500 hover:shadow-lg hover:shadow-violet-500/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 active:scale-[0.97] active:shadow-md disabled:pointer-events-none";

export const btnDisabled =
  "cursor-not-allowed opacity-40 saturate-50 hover:border-white/[0.08] hover:bg-white/[0.03] hover:text-zinc-300 hover:shadow-none active:scale-100";

export const cardSurface =
  "rounded-xl border border-white/[0.06] bg-zinc-900/40 shadow-sm shadow-black/10";

export const cardHeader =
  "flex flex-col gap-3 border-b border-white/[0.06] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5";

export const sectionLabel =
  "text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500";

export const inputBase =
  "w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3.5 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 transition focus:border-violet-500/40 focus:outline-none focus:ring-2 focus:ring-violet-500/20";

export const selectBase =
  "rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs font-medium text-zinc-300 transition hover:border-white/[0.14] focus:border-violet-500/40 focus:outline-none focus:ring-2 focus:ring-violet-500/20";

export const carrierStatusBadgeStyles: Record<CarrierStatus, string> = {
  "In Transit": `${badgeBase} bg-sky-500/10 text-sky-300 ring-sky-500/20`,
  Delayed: `${badgeBase} bg-amber-500/10 text-amber-300 ring-amber-500/20`,
  "Out for Delivery": `${badgeBase} bg-violet-500/10 text-violet-300 ring-violet-500/20`,
  Delivered: `${badgeBase} bg-emerald-500/10 text-emerald-300 ring-emerald-500/20`,
  Exception: `${badgeBase} bg-rose-500/10 text-rose-300 ring-rose-500/20`,
};

export const carrierHealthStyles = {
  healthy: `${badgeBase} bg-emerald-500/10 text-emerald-400 ring-emerald-500/20`,
  degraded: `${badgeBase} bg-amber-500/10 text-amber-400 ring-amber-500/20`,
  offline: `${badgeBase} bg-rose-500/10 text-rose-400 ring-rose-500/20`,
} as const;

export const carrierSyncStatusStyles = {
  idle: `${badgeBase} bg-zinc-500/10 text-zinc-400 ring-zinc-500/20`,
  syncing: `${badgeBase} bg-amber-500/10 text-amber-400 ring-amber-500/20`,
  success: `${badgeBase} bg-emerald-500/10 text-emerald-400 ring-emerald-500/20`,
  error: `${badgeBase} bg-rose-500/10 text-rose-400 ring-rose-500/20`,
} as const;

export const statusBadgeStyles: Record<ShipmentStatus, string> = {
  "In Transit": `${badgeBase} bg-sky-500/10 text-sky-300 ring-sky-500/20`,
  Delayed: `${badgeBase} bg-amber-500/10 text-amber-300 ring-amber-500/20`,
  Delivered: `${badgeBase} bg-emerald-500/10 text-emerald-300 ring-emerald-500/20`,
  Exception: `${badgeBase} bg-rose-500/10 text-rose-300 ring-rose-500/20`,
};

export const severityStyles: Record<Severity, string> = {
  Critical: `${badgeBase} bg-rose-500/10 text-rose-300 ring-rose-500/25`,
  High: `${badgeBase} bg-orange-500/10 text-orange-300 ring-orange-500/25`,
  Medium: `${badgeBase} bg-amber-500/10 text-amber-300 ring-amber-500/25`,
  Low: `${badgeBase} bg-zinc-500/10 text-zinc-400 ring-zinc-500/25`,
};

export const resolvedSeverityStyle = `${badgeBase} bg-emerald-500/10 text-emerald-400 ring-emerald-500/20`;

export const issueStatusStyles: Record<IssueStatus, string> = {
  Open: "text-zinc-400",
  Investigating: "text-sky-400",
  Escalated: "text-rose-400",
  "Pending Customer": "text-amber-400",
  "Awaiting Carrier": "text-violet-400",
  Resolved: "text-emerald-400",
};

export const activityTypeStyles: Record<string, string> = {
  escalation: `${badgeBase} bg-rose-500/10 text-rose-400 ring-rose-500/20`,
  action: `${badgeBase} bg-sky-500/10 text-sky-400 ring-sky-500/20`,
  update: `${badgeBase} bg-violet-500/10 text-violet-400 ring-violet-500/20`,
  resolved: `${badgeBase} bg-emerald-500/10 text-emerald-400 ring-emerald-500/20`,
  alert: `${badgeBase} bg-amber-500/10 text-amber-400 ring-amber-500/20`,
  overdue_follow_up: `${badgeBase} bg-orange-500/10 text-orange-400 ring-orange-500/20`,
  customer_risk: `${badgeBase} bg-rose-500/10 text-rose-400 ring-rose-500/20`,
  sla_breach: `${badgeBase} bg-amber-500/10 text-amber-400 ring-amber-500/20`,
};

export const agingHealthStyles = {
  green: `${badgeBase} bg-emerald-500/10 text-emerald-400 ring-emerald-500/20`,
  yellow: `${badgeBase} bg-amber-500/10 text-amber-400 ring-amber-500/20`,
  red: `${badgeBase} bg-rose-500/10 text-rose-400 ring-rose-500/20`,
} as const;

export const agingHealthLabels = {
  green: "Healthy",
  yellow: "Approaching",
  red: "Overdue",
} as const;

export const notificationTypeStyles: Record<string, string> = {
  exception_critical: `${badgeBase} bg-rose-500/10 text-rose-300 ring-rose-500/25`,
  exception_high: `${badgeBase} bg-orange-500/10 text-orange-300 ring-orange-500/25`,
  sla_risk: `${badgeBase} bg-amber-500/10 text-amber-300 ring-amber-500/25`,
  resolution: `${badgeBase} bg-emerald-500/10 text-emerald-400 ring-emerald-500/20`,
  overdue_follow_up: `${badgeBase} bg-orange-500/10 text-orange-300 ring-orange-500/25`,
  customer_high_risk: `${badgeBase} bg-rose-500/10 text-rose-300 ring-rose-500/25`,
  sla_threshold_breach: `${badgeBase} bg-amber-500/10 text-amber-300 ring-amber-500/25`,
};

export const notificationTypeLabels: Record<string, string> = {
  exception_critical: "Exception Critical",
  exception_high: "Alert",
  sla_risk: "SLA Risk",
  resolution: "Resolution",
  overdue_follow_up: "Overdue Follow-Up",
  customer_high_risk: "Customer High Risk",
  sla_threshold_breach: "SLA Threshold",
};

export const riskLevelStyles = {
  green: `${badgeBase} bg-emerald-500/10 text-emerald-400 ring-emerald-500/20`,
  yellow: `${badgeBase} bg-amber-500/10 text-amber-400 ring-amber-500/20`,
  red: `${badgeBase} bg-rose-500/10 text-rose-400 ring-rose-500/20`,
} as const;

export const riskLevelLabels = {
  green: "On Target",
  yellow: "At Risk",
  red: "Critical",
} as const;

export const riskLevelBadgeLabels = {
  green: "Green",
  yellow: "Yellow",
  red: "Red",
} as const;
