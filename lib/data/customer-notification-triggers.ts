import type { IssueStatus, ShipmentStatus } from "@/lib/types";
import type { CustomerSlaMetrics } from "@/lib/sla-intelligence";
import type { RiskLevel } from "@/lib/sla-intelligence";
import {
  buildExceptionResolvedCustomerNotificationInput,
  buildExceptionUpdatedNotificationInput,
  buildShipmentDelayedNotificationInput,
  buildShipmentDeliveredNotificationInput,
  buildShipmentExceptionNotificationInput,
  buildSlaRiskWarningCustomerNotificationInput,
} from "./customer-notification-rules";
import {
  createCustomerNotification,
  hasUnreadCustomerNotificationOfType,
  lookupShipmentCustomerContext,
} from "./customer-notifications";
import { findOpenExceptionForCustomer } from "./notifications";

const LOG_PREFIX = "[FreightPulse] Customer notification";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isDatabaseId(id: string): boolean {
  return UUID_PATTERN.test(id);
}

async function safeCreateCustomerNotification(
  input: Parameters<typeof createCustomerNotification>[0],
): Promise<boolean> {
  try {
    await createCustomerNotification(input);
    return true;
  } catch (err) {
    console.error(`${LOG_PREFIX} Failed to create notification`, {
      type: input.type,
      customerId: input.customerId,
      error: err instanceof Error ? err.message : err,
    });
    return false;
  }
}

export async function notifyCustomerOnShipmentStatusChange(
  organizationId: string,
  shipmentUuid: string,
  previousStatus: ShipmentStatus,
  newStatus: ShipmentStatus,
): Promise<void> {
  if (previousStatus === newStatus) return;

  const ctx = await lookupShipmentCustomerContext(shipmentUuid, organizationId);
  if (!ctx || !isDatabaseId(ctx.customerId)) return;

  const base = {
    organizationId,
    customerId: ctx.customerId,
    customerName: ctx.customerName,
    shipmentUuid,
    shipmentNumber: ctx.shipmentNumber,
  };

  if (newStatus === "Delayed" && previousStatus !== "Delayed") {
    const duplicate = await hasUnreadCustomerNotificationOfType(
      organizationId,
      ctx.customerId,
      "shipment_delayed",
      shipmentUuid,
    );
    if (duplicate) return;

    await safeCreateCustomerNotification(buildShipmentDelayedNotificationInput(base));
    return;
  }

  if (newStatus === "Exception" && previousStatus !== "Exception") {
    const duplicate = await hasUnreadCustomerNotificationOfType(
      organizationId,
      ctx.customerId,
      "shipment_exception",
      shipmentUuid,
    );
    if (duplicate) return;

    await safeCreateCustomerNotification(
      buildShipmentExceptionNotificationInput({
        ...base,
        title: "Shipment exception detected",
      }),
    );
    return;
  }

  if (newStatus === "Delivered" && previousStatus !== "Delivered") {
    const duplicate = await hasUnreadCustomerNotificationOfType(
      organizationId,
      ctx.customerId,
      "shipment_delivered",
      shipmentUuid,
    );
    if (duplicate) return;

    await safeCreateCustomerNotification(buildShipmentDeliveredNotificationInput(base));
  }
}

export async function notifyCustomerOnExceptionCreated(
  organizationId: string,
  exceptionId: string,
  shipmentUuid: string,
  title: string,
): Promise<void> {
  const ctx = await lookupShipmentCustomerContext(shipmentUuid, organizationId);
  if (!ctx || !isDatabaseId(ctx.customerId)) return;

  const duplicate = await hasUnreadCustomerNotificationOfType(
    organizationId,
    ctx.customerId,
    "shipment_exception",
    shipmentUuid,
  );
  if (duplicate) return;

  await safeCreateCustomerNotification(
    buildShipmentExceptionNotificationInput({
      organizationId,
      customerId: ctx.customerId,
      customerName: ctx.customerName,
      shipmentUuid,
      shipmentNumber: ctx.shipmentNumber,
      exceptionId,
      title,
    }),
  );
}

export async function notifyCustomerOnExceptionStatusChange(
  organizationId: string,
  exceptionId: string,
  shipmentUuid: string,
  shipmentNumber: string,
  customerId: string,
  customerName: string,
  title: string,
  newStatus: IssueStatus,
  previousStatus?: IssueStatus,
): Promise<void> {
  if (!isDatabaseId(customerId)) return;
  if (newStatus === previousStatus) return;

  if (newStatus === "Resolved") {
    await safeCreateCustomerNotification(
      buildExceptionResolvedCustomerNotificationInput({
        organizationId,
        customerId,
        customerName,
        shipmentUuid,
        shipmentNumber,
        exceptionId,
        title,
      }),
    );
    return;
  }

  await safeCreateCustomerNotification(
    buildExceptionUpdatedNotificationInput({
      organizationId,
      customerId,
      customerName,
      shipmentUuid,
      shipmentNumber,
      exceptionId,
      title,
      status: newStatus,
    }),
  );
}

export async function notifyCustomerOnExceptionResolved(
  organizationId: string,
  exceptionId: string,
  shipmentUuid: string,
  shipmentNumber: string,
  customerId: string,
  customerName: string,
  title: string,
): Promise<void> {
  if (!isDatabaseId(customerId)) return;

  await safeCreateCustomerNotification(
    buildExceptionResolvedCustomerNotificationInput({
      organizationId,
      customerId,
      customerName,
      shipmentUuid,
      shipmentNumber,
      exceptionId,
      title,
    }),
  );
}

export function buildCustomerSlaRiskSnapshot(customerMetrics: CustomerSlaMetrics[]): string {
  return customerMetrics
    .filter((c) => isDatabaseId(c.customerId) && c.totalShipments > 0)
    .map((c) => `${c.customerId}:${c.riskLevel}`)
    .sort()
    .join("|");
}

export async function processCustomerSlaRiskNotificationTransitions(
  organizationId: string,
  customerMetrics: CustomerSlaMetrics[],
  previousRiskByCustomer: ReadonlyMap<string, RiskLevel>,
): Promise<{ created: number; nextRiskByCustomer: Map<string, RiskLevel> }> {
  const nextRiskByCustomer = new Map<string, RiskLevel>();
  let created = 0;

  for (const customer of customerMetrics) {
    if (!isDatabaseId(customer.customerId) || customer.totalShipments === 0) continue;
    nextRiskByCustomer.set(customer.customerId, customer.riskLevel);
  }

  for (const customer of customerMetrics) {
    if (customer.riskLevel !== "red") continue;
    if (!isDatabaseId(customer.customerId) || customer.totalShipments === 0) continue;

    const previousRisk = previousRiskByCustomer.get(customer.customerId);
    if (previousRisk === "red") continue;

    const duplicate = await hasUnreadCustomerNotificationOfType(
      organizationId,
      customer.customerId,
      "sla_risk_warning",
    );
    if (duplicate) continue;

    const exceptionId =
      (await findOpenExceptionForCustomer(organizationId, customer.customerId)) ?? undefined;

    const ok = await safeCreateCustomerNotification(
      buildSlaRiskWarningCustomerNotificationInput({
        organizationId,
        customerId: customer.customerId,
        customerName: customer.customerName,
        onTimePercent: customer.onTimePercent,
        slaTarget: customer.slaTarget,
        exceptionId,
      }),
    );
    if (ok) created += 1;
  }

  return { created, nextRiskByCustomer };
}
