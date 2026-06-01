import type { Severity } from "@/lib/types";
import type { CreateNotificationInput, NotificationType } from "@/lib/types";

export type ExceptionNotificationContext = {
  exceptionId: string;
  shipmentNumber: string;
  title: string;
  severity: Severity;
  customerName?: string;
};

export type SlaRiskNotificationContext = {
  customerId: string;
  customerName: string;
  onTimePercent: number;
  slaTarget: number;
  exceptionId?: string;
};

export type OverdueFollowUpNotificationContext = {
  exceptionId: string;
  exceptionDisplayId: string;
  shipmentNumber: string;
  title: string;
  customerName: string;
  daysOverdue: number;
};

export type CustomerHighRiskNotificationContext = {
  customerId: string;
  customerName: string;
  riskScore: number;
  openExceptions: number;
  exceptionId?: string;
};

export type SlaThresholdNotificationContext = {
  compliancePercent: number;
  threshold: number;
};

export type ResolutionNotificationContext = {
  exceptionId: string;
  shipmentNumber: string;
  title: string;
};

export function notificationTypeForSeverity(severity: Severity): NotificationType | null {
  if (severity === "Critical") return "exception_critical";
  if (severity === "High") return "exception_high";
  return null;
}

export function buildExceptionNotificationInput(
  organizationId: string,
  ctx: ExceptionNotificationContext,
): CreateNotificationInput | null {
  const type = notificationTypeForSeverity(ctx.severity);
  if (!type) return null;

  return {
    organizationId,
    type,
    title: `${ctx.severity} exception — ${ctx.shipmentNumber}`,
    message: `${ctx.title}${ctx.customerName ? ` · ${ctx.customerName}` : ""}`,
    severity: ctx.severity,
    exceptionId: ctx.exceptionId,
  };
}

export function buildSlaRiskNotificationInput(
  organizationId: string,
  ctx: SlaRiskNotificationContext,
): CreateNotificationInput {
  const gap = (ctx.slaTarget - ctx.onTimePercent).toFixed(1);
  return {
    organizationId,
    type: "sla_risk",
    title: `SLA risk — ${ctx.customerName}`,
    message: `On-time delivery at ${ctx.onTimePercent.toFixed(1)}% vs ${ctx.slaTarget}% target (${gap}% below SLA).`,
    severity: "Critical",
    customerId: ctx.customerId,
    exceptionId: ctx.exceptionId,
  };
}

export function buildResolutionNotificationInput(
  organizationId: string,
  ctx: ResolutionNotificationContext,
): CreateNotificationInput {
  return {
    organizationId,
    type: "resolution",
    title: `Exception resolved — ${ctx.shipmentNumber}`,
    message: ctx.title,
    severity: "Low",
    exceptionId: ctx.exceptionId,
  };
}

export function buildOverdueFollowUpNotificationInput(
  organizationId: string,
  ctx: OverdueFollowUpNotificationContext,
): CreateNotificationInput {
  return {
    organizationId,
    type: "overdue_follow_up",
    title: `Overdue follow-up — ${ctx.shipmentNumber}`,
    message: `${ctx.title} · ${ctx.customerName} · ${ctx.daysOverdue} day${ctx.daysOverdue === 1 ? "" : "s"} overdue`,
    severity: "High",
    exceptionId: ctx.exceptionId,
  };
}

export function buildCustomerHighRiskNotificationInput(
  organizationId: string,
  ctx: CustomerHighRiskNotificationContext,
): CreateNotificationInput {
  return {
    organizationId,
    type: "customer_high_risk",
    title: `High-risk customer — ${ctx.customerName}`,
    message: `Risk score ${ctx.riskScore}/100 · ${ctx.openExceptions} open exception${ctx.openExceptions === 1 ? "" : "s"}`,
    severity: "Critical",
    customerId: ctx.customerId,
    exceptionId: ctx.exceptionId,
  };
}

export function buildSlaThresholdNotificationInput(
  organizationId: string,
  ctx: SlaThresholdNotificationContext,
): CreateNotificationInput {
  return {
    organizationId,
    type: "sla_threshold_breach",
    title: "SLA compliance below threshold",
    message: `Network SLA compliance at ${ctx.compliancePercent}% vs ${ctx.threshold}% target threshold.`,
    severity: "Critical",
  };
}

export function buildCarrierExceptionNotificationInput(
  organizationId: string,
  ctx: ExceptionNotificationContext,
): CreateNotificationInput {
  return {
    organizationId,
    type: "exception_high",
    title: "Carrier Exception Detected",
    message: `${ctx.title} · ${ctx.shipmentNumber}`,
    severity: "High",
    exceptionId: ctx.exceptionId,
  };
}

export function isEscalationNotification(type: NotificationType): boolean {
  return (
    type === "exception_critical" ||
    type === "exception_high" ||
    type === "sla_risk" ||
    type === "overdue_follow_up" ||
    type === "customer_high_risk" ||
    type === "sla_threshold_breach"
  );
}
