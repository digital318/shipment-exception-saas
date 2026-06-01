import {
  CUSTOMER_HIGH_RISK_SCORE,
  SLA_COMPLIANCE_THRESHOLD,
  type CustomerRiskProfile,
} from "@/lib/services/metrics-service";
import {
  buildCustomerHighRiskNotificationInput,
  buildSlaThresholdNotificationInput,
} from "./notification-rules";
import { createNotification, findOpenExceptionForCustomer, findAnyOpenException } from "./notifications";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

const LOG_PREFIX = "[FreightPulse] Executive intelligence notification";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ExecutiveIntelligenceResult = {
  created: number;
  skipped: number;
};

function isDatabaseCustomerId(customerId: string): boolean {
  return UUID_PATTERN.test(customerId);
}

async function hasUnreadNotificationOfType(
  organizationId: string,
  type: "customer_high_risk" | "sla_threshold_breach",
  customerId?: string,
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  const supabase = getSupabaseClient();
  let query = supabase
    .from("notifications")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("type", type)
    .eq("status", "Unread");

  if (customerId) {
    query = query.eq("customer_id", customerId);
  }

  const { data, error } = await query.limit(1);
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

/**
 * Creates notifications and activity events when customers enter high-risk state
 * or network SLA compliance falls below threshold.
 */
export async function processExecutiveIntelligenceNotifications(
  organizationId: string,
  compliancePercent: number,
  customerRiskProfiles: CustomerRiskProfile[],
  previousHighRiskCustomerIds: ReadonlySet<string>,
  wasBelowSlaThreshold: boolean,
): Promise<{
  result: ExecutiveIntelligenceResult;
  nextHighRiskCustomerIds: Set<string>;
  isBelowSlaThreshold: boolean;
}> {
  let created = 0;
  let skipped = 0;

  const highRiskCustomers = customerRiskProfiles.filter(
    (c) =>
      isDatabaseCustomerId(c.customerId) &&
      (c.riskScore >= CUSTOMER_HIGH_RISK_SCORE || c.riskLevel === "red"),
  );

  const nextHighRiskCustomerIds = new Set(highRiskCustomers.map((c) => c.customerId));
  const isBelowSlaThreshold = compliancePercent < SLA_COMPLIANCE_THRESHOLD;

  for (const customer of highRiskCustomers) {
    if (previousHighRiskCustomerIds.has(customer.customerId)) {
      skipped += 1;
      continue;
    }

    const hasUnread = await hasUnreadNotificationOfType(
      organizationId,
      "customer_high_risk",
      customer.customerId,
    );
    if (hasUnread) {
      skipped += 1;
      continue;
    }

    const exceptionId =
      (await findOpenExceptionForCustomer(organizationId, customer.customerId)) ?? undefined;

    const input = buildCustomerHighRiskNotificationInput(organizationId, {
      customerId: customer.customerId,
      customerName: customer.customerName,
      riskScore: customer.riskScore,
      openExceptions: customer.openExceptions,
      exceptionId,
    });

    try {
      await createNotification(input, { activityEventType: "customer_risk" });
      created += 1;
      console.info(`${LOG_PREFIX} High-risk customer alert for ${customer.customerName}`);
    } catch (error) {
      console.error(`${LOG_PREFIX} Failed for ${customer.customerName}`, error);
    }
  }

  if (isBelowSlaThreshold && !wasBelowSlaThreshold) {
    const hasUnread = await hasUnreadNotificationOfType(
      organizationId,
      "sla_threshold_breach",
    );
    if (hasUnread) {
      skipped += 1;
    } else {
      const input = buildSlaThresholdNotificationInput(organizationId, {
        compliancePercent,
        threshold: SLA_COMPLIANCE_THRESHOLD,
      });

      const slaExceptionId = (await findAnyOpenException(organizationId)) ?? undefined;

      try {
        await createNotification(
          { ...input, exceptionId: slaExceptionId },
          { activityEventType: "sla_breach" },
        );
        created += 1;
        console.info(`${LOG_PREFIX} SLA threshold breach alert at ${compliancePercent}%`);
      } catch (error) {
        console.error(`${LOG_PREFIX} SLA threshold alert failed`, error);
      }
    }
  } else if (isBelowSlaThreshold) {
    skipped += 1;
  }

  return {
    result: { created, skipped },
    nextHighRiskCustomerIds,
    isBelowSlaThreshold,
  };
}
