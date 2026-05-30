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

export function isEscalationNotification(type: NotificationType): boolean {
  return type === "exception_critical" || type === "exception_high" || type === "sla_risk";
}
