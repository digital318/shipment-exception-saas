import type { RiskLevel } from "@/lib/sla-intelligence";
import type { CustomerSlaMetrics } from "@/lib/sla-intelligence";
import {
  createEscalationNotification,
  findOpenExceptionForCustomer,
  hasUnreadSlaNotificationForCustomer,
  hasAnySlaRiskNotificationForCustomer,
} from "./notifications";
import { buildSlaRiskNotificationInput } from "./notification-rules";

const LOG_PREFIX = "[FreightPulse] SLA risk notification";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type SlaRiskTransitionResult = {
  created: number;
  skipped: number;
};

function isDatabaseCustomerId(customerId: string): boolean {
  return UUID_PATTERN.test(customerId);
}

function buildRiskSnapshot(customerMetrics: CustomerSlaMetrics[]): string {
  return customerMetrics
    .filter((c) => isDatabaseCustomerId(c.customerId) && c.totalShipments > 0)
    .map((c) => `${c.customerId}:${c.riskLevel}`)
    .sort()
    .join("|");
}

/**
 * Creates SLA risk notifications only when a customer's risk level transitions into red.
 * Does not run during notification fetch/load — call explicitly when SLA metrics change.
 */
export async function processSlaRiskNotificationTransitions(
  organizationId: string,
  customerMetrics: CustomerSlaMetrics[],
  previousRiskByCustomer: ReadonlyMap<string, RiskLevel>,
): Promise<{
  result: SlaRiskTransitionResult;
  nextRiskByCustomer: Map<string, RiskLevel>;
  riskSnapshot: string;
}> {
  const nextRiskByCustomer = new Map<string, RiskLevel>();
  let created = 0;
  let skipped = 0;

  for (const customer of customerMetrics) {
    if (!isDatabaseCustomerId(customer.customerId) || customer.totalShipments === 0) {
      continue;
    }
    nextRiskByCustomer.set(customer.customerId, customer.riskLevel);
  }

  for (const customer of customerMetrics) {
    if (customer.riskLevel !== "red") continue;
    if (!isDatabaseCustomerId(customer.customerId) || customer.totalShipments === 0) {
      continue;
    }

    const label = customer.customerName;
    const previousRisk = previousRiskByCustomer.get(customer.customerId);

    const hasUnread = await hasUnreadSlaNotificationForCustomer(
      organizationId,
      customer.customerId,
    );
    if (hasUnread) {
      console.info(`${LOG_PREFIX} Skipped duplicate SLA notification for customer ${label}`);
      skipped += 1;
      continue;
    }

    if (previousRisk === "red") {
      console.info(
        `${LOG_PREFIX} Skipped duplicate SLA notification for customer ${label} — still at risk since last evaluation`,
      );
      skipped += 1;
      continue;
    }

    if (previousRisk === undefined) {
      const hasPriorAlert = await hasAnySlaRiskNotificationForCustomer(
        organizationId,
        customer.customerId,
      );
      if (hasPriorAlert) {
        console.info(
          `${LOG_PREFIX} Skipped duplicate SLA notification for customer ${label} — prior SLA alert already exists`,
        );
        skipped += 1;
        continue;
      }
    }

    const exceptionId =
      (await findOpenExceptionForCustomer(organizationId, customer.customerId)) ?? undefined;

    const input = buildSlaRiskNotificationInput(organizationId, {
      customerId: customer.customerId,
      customerName: customer.customerName,
      onTimePercent: customer.onTimePercent,
      slaTarget: customer.slaTarget,
      exceptionId,
    });

    try {
      await createEscalationNotification(input);
      created += 1;
      console.info(`${LOG_PREFIX} Created notification for customer ${label}`);
    } catch (error) {
      console.error(`${LOG_PREFIX} Failed to create notification for customer ${label}`, error);
    }
  }

  return {
    result: { created, skipped },
    nextRiskByCustomer,
    riskSnapshot: buildRiskSnapshot(customerMetrics),
  };
}

export { buildRiskSnapshot };
