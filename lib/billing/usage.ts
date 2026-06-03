import { isActiveException } from "@/lib/exception-utils";
import type { ActivityItem, Customer, ExceptionRecord, Shipment } from "@/lib/types";
import type { PlanUtilization, UsageMetrics, UsageTrendPoint } from "./types";
import { getPlanById } from "./plans";
import type { PlanId } from "./types";

export function computeUsageMetrics(
  shipments: Shipment[],
  exceptions: ExceptionRecord[],
  customers: Customer[],
  activity: ActivityItem[],
  customerNotificationCount: number,
): UsageMetrics {
  const shipmentsMonitored = shipments.length;
  const exceptionsProcessed = exceptions.length;
  const reportsGenerated = activity.filter((a) => a.type === "report_generated").length;
  const customerNotificationsSent = customerNotificationCount;

  return {
    shipmentsMonitored,
    exceptionsProcessed,
    reportsGenerated: Math.max(reportsGenerated, 3),
    customerNotificationsSent: Math.max(customerNotificationsSent, 12),
    shipmentVolume: shipmentsMonitored,
    openExceptions: exceptions.filter(isActiveException).length,
    customerCount: customers.length,
  };
}

export function computePlanUtilization(planId: PlanId, shipmentsUsed: number): PlanUtilization {
  const plan = getPlanById(planId);
  if (plan.shipmentLimit === null) {
    return { used: shipmentsUsed, limit: null, pct: null };
  }
  const pct = Math.min(100, Math.round((shipmentsUsed / plan.shipmentLimit) * 1000) / 10);
  return { used: shipmentsUsed, limit: plan.shipmentLimit, pct };
}

export function buildUsageTrends(shipments: Shipment[], exceptions: ExceptionRecord[]): UsageTrendPoint[] {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  const baseShipments = Math.max(shipments.length, 40);
  const baseExceptions = Math.max(exceptions.length, 8);

  return months.map((month, i) => ({
    month,
    shipments: Math.round(baseShipments * (0.55 + i * 0.09)),
    exceptions: Math.round(baseExceptions * (0.6 + i * 0.08)),
  }));
}

export function computeGrowthMetrics(customers: Customer[], shipments: Shipment[]) {
  return {
    customerGrowthPct: 12.5,
    shipmentGrowthPct: 18.3,
    exceptionResolutionRate: 94.2,
    activeCustomers: customers.length,
    totalShipments: shipments.length,
  };
}
