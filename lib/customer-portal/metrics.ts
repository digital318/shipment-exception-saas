import { isFollowUpOverdue } from "@/lib/playbooks";
import {
  computeCustomerRiskScore,
  type CustomerRiskProfile,
} from "@/lib/services/metrics-service";
import { computeCustomerOnTimePercent } from "@/lib/sla-intelligence";
import type { Customer, ExceptionRecord, Shipment } from "@/lib/types";
import {
  filterExceptionsByCustomer,
  filterOpenExceptions,
  filterShipmentsByCustomer,
} from "./visibility";

export type CustomerPortalDashboard = {
  activeShipments: number;
  openExceptions: number;
  slaTarget: number;
  actualSla: number;
  onTimePercent: number;
  riskScore: number;
  escalationCount: number;
};

export function computeCustomerPortalDashboard(
  customer: Customer,
  shipments: Shipment[],
  exceptions: ExceptionRecord[],
): CustomerPortalDashboard {
  const customerShipments = filterShipmentsByCustomer(shipments, customer.name);
  const customerExceptions = filterExceptionsByCustomer(exceptions, customer.name);
  const openExceptions = filterOpenExceptions(customerExceptions);

  const activeShipments = customerShipments.filter((s) => s.status !== "Delivered").length;
  const { onTimePercent } = computeCustomerOnTimePercent(customerShipments);

  const openCritical = openExceptions.filter((e) => e.severity === "Critical").length;
  const escalationCount = openExceptions.filter(
    (e) => e.status === "Escalated" || (e.escalationLevel ?? 1) >= 2,
  ).length;
  const overdueFollowUps = openExceptions.filter((e) =>
    isFollowUpOverdue(e.nextFollowUpAt),
  ).length;
  const slaMiss = onTimePercent < customer.slaTarget;

  const riskScore = computeCustomerRiskScore({
    openCritical,
    escalated: escalationCount,
    slaMiss,
    overdueFollowUps,
  });

  return {
    activeShipments,
    openExceptions: openExceptions.length,
    slaTarget: customer.slaTarget,
    actualSla: onTimePercent,
    onTimePercent,
    riskScore,
    escalationCount,
  };
}

export function computeCustomerPortalScorecard(
  customer: Customer,
  shipments: Shipment[],
  exceptions: ExceptionRecord[],
): CustomerRiskProfile {
  const customerShipments = filterShipmentsByCustomer(shipments, customer.name);
  const customerExceptions = filterExceptionsByCustomer(exceptions, customer.name);
  const openExceptions = filterOpenExceptions(customerExceptions);
  const { onTimePercent } = computeCustomerOnTimePercent(customerShipments);

  const openCritical = openExceptions.filter((e) => e.severity === "Critical").length;
  const escalationCount = openExceptions.filter(
    (e) => e.status === "Escalated" || (e.escalationLevel ?? 1) >= 2,
  ).length;
  const overdueFollowUps = openExceptions.filter((e) =>
    isFollowUpOverdue(e.nextFollowUpAt),
  ).length;
  const slaMiss = onTimePercent < customer.slaTarget;

  const riskScore = computeCustomerRiskScore({
    openCritical,
    escalated: escalationCount,
    slaMiss,
    overdueFollowUps,
  });

  let riskLevel: CustomerRiskProfile["riskLevel"] = "green";
  if (onTimePercent < customer.slaTarget - 3) riskLevel = "red";
  else if (onTimePercent < customer.slaTarget) riskLevel = "yellow";

  return {
    customerId: customer.dbId ?? customer.id,
    customerName: customer.name,
    slaTarget: customer.slaTarget,
    actualSla: onTimePercent,
    openExceptions: openExceptions.length,
    escalationCount,
    overdueFollowUps,
    riskScore,
    riskLevel,
  };
}
