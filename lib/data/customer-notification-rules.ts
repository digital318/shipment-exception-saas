import type { IssueStatus } from "@/lib/types";
import type {
  CreateCustomerNotificationInput,
  CustomerNotificationType,
} from "@/lib/types";

export type ShipmentStatusNotificationContext = {
  organizationId: string;
  customerId: string;
  customerName: string;
  shipmentUuid: string;
  shipmentNumber: string;
  exceptionId?: string;
};

export type ExceptionCustomerNotificationContext = {
  organizationId: string;
  customerId: string;
  customerName: string;
  shipmentUuid: string;
  shipmentNumber: string;
  exceptionId?: string;
  title: string;
  status?: IssueStatus;
};

export type SlaRiskCustomerNotificationContext = {
  organizationId: string;
  customerId: string;
  customerName: string;
  onTimePercent: number;
  slaTarget: number;
  exceptionId?: string;
};

export function buildShipmentDelayedNotificationInput(
  ctx: ShipmentStatusNotificationContext,
): CreateCustomerNotificationInput {
  return {
    organizationId: ctx.organizationId,
    customerId: ctx.customerId,
    shipmentId: ctx.shipmentUuid,
    exceptionId: ctx.exceptionId,
    type: "shipment_delayed",
    title: `Shipment delayed — ${ctx.shipmentNumber}`,
    message: `Your shipment ${ctx.shipmentNumber} is experiencing a delay. Our team is monitoring the situation and will keep you updated.`,
  };
}

export function buildShipmentExceptionNotificationInput(
  ctx: ExceptionCustomerNotificationContext,
): CreateCustomerNotificationInput {
  return {
    organizationId: ctx.organizationId,
    customerId: ctx.customerId,
    shipmentId: ctx.shipmentUuid,
    exceptionId: ctx.exceptionId,
    type: "shipment_exception",
    title: `Shipment exception — ${ctx.shipmentNumber}`,
    message: `An exception has been opened for shipment ${ctx.shipmentNumber}: ${ctx.title}. Our team is investigating.`,
  };
}

export function buildShipmentDeliveredNotificationInput(
  ctx: ShipmentStatusNotificationContext,
): CreateCustomerNotificationInput {
  return {
    organizationId: ctx.organizationId,
    customerId: ctx.customerId,
    shipmentId: ctx.shipmentUuid,
    type: "shipment_delivered",
    title: `Shipment delivered — ${ctx.shipmentNumber}`,
    message: `Your shipment ${ctx.shipmentNumber} has been delivered successfully.`,
  };
}

export function buildExceptionUpdatedNotificationInput(
  ctx: ExceptionCustomerNotificationContext,
): CreateCustomerNotificationInput {
  const statusLabel =
    ctx.status === "Escalated" ? "Investigating" : (ctx.status ?? "Updated");

  return {
    organizationId: ctx.organizationId,
    customerId: ctx.customerId,
    shipmentId: ctx.shipmentUuid,
    exceptionId: ctx.exceptionId,
    type: "exception_updated",
    title: `Exception update — ${ctx.shipmentNumber}`,
    message: `The status of your exception on shipment ${ctx.shipmentNumber} has been updated to ${statusLabel}.`,
  };
}

export function buildExceptionResolvedCustomerNotificationInput(
  ctx: ExceptionCustomerNotificationContext,
): CreateCustomerNotificationInput {
  return {
    organizationId: ctx.organizationId,
    customerId: ctx.customerId,
    shipmentId: ctx.shipmentUuid,
    exceptionId: ctx.exceptionId,
    type: "exception_resolved",
    title: `Exception resolved — ${ctx.shipmentNumber}`,
    message: `The exception on shipment ${ctx.shipmentNumber} (${ctx.title}) has been resolved.`,
  };
}

export function buildSlaRiskWarningCustomerNotificationInput(
  ctx: SlaRiskCustomerNotificationContext,
): CreateCustomerNotificationInput {
  return {
    organizationId: ctx.organizationId,
    customerId: ctx.customerId,
    exceptionId: ctx.exceptionId,
    type: "sla_risk_warning",
    title: `SLA performance notice — ${ctx.customerName}`,
    message: `Your on-time delivery rate is ${ctx.onTimePercent.toFixed(1)}%, below your ${ctx.slaTarget}% SLA target. We are actively working to improve performance on your account.`,
  };
}

export function buildDemoCustomerNotificationInput(
  organizationId: string,
  customerId: string,
  customerName: string,
  shipmentUuid?: string,
  shipmentNumber?: string,
): CreateCustomerNotificationInput {
  return {
    organizationId,
    customerId,
    shipmentId: shipmentUuid,
    type: "shipment_delayed",
    title: `Demo alert — ${shipmentNumber ?? customerName}`,
    message: `This is a demo customer notification for ${customerName}. In production, alerts are sent automatically when shipments or exceptions change.`,
  };
}

export const CUSTOMER_NOTIFICATION_TYPE_LABELS: Record<CustomerNotificationType, string> = {
  shipment_delayed: "Shipment Delayed",
  shipment_exception: "Shipment Exception",
  shipment_delivered: "Shipment Delivered",
  exception_updated: "Exception Updated",
  exception_resolved: "Exception Resolved",
  sla_risk_warning: "SLA Risk Warning",
};
