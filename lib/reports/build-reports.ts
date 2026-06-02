import { isFollowUpOverdue } from "@/lib/playbooks";
import {
  computeCustomerRiskProfiles,
  computeDaysOpen,
  computeDaysSinceLastFollowUp,
  computeExecutiveMetrics,
  countExceptionsCreatedLast7Days,
} from "@/lib/services/metrics-service";
import type { Customer, ExceptionRecord, Shipment, CustomerNotificationRecord } from "@/lib/types";
import { computeCarrierPerformanceRows } from "./carrier-performance";
import { CUSTOMER_NOTIFICATION_TYPE_LABELS } from "@/lib/data/customer-notification-rules";
import type { ReportFilters } from "./types";
import { filterExceptions, filterShipments } from "./filters";

export function buildOperationsSummaryReport(
  customers: Customer[],
  shipments: Shipment[],
  exceptions: ExceptionRecord[],
  filters: ReportFilters,
) {
  const filteredExceptions = filterExceptions(exceptions, filters);
  const filteredShipments = filterShipments(shipments, filters, exceptions);
  const metrics = computeExecutiveMetrics(customers, filteredShipments, filteredExceptions);

  return {
    openExceptions: metrics.openExceptions,
    criticalExceptions: metrics.criticalExceptions,
    escalatedExceptions: metrics.escalatedExceptions,
    overdueFollowUps: metrics.overdueFollowUps,
    networkHealthScore: metrics.networkHealthScore,
    averageResolutionTimeHours: metrics.averageResolutionTimeHours,
    exceptionsCreatedLast7Days: countExceptionsCreatedLast7Days(filteredExceptions),
  };
}

export function buildExecutiveSummaryReport(
  customers: Customer[],
  shipments: Shipment[],
  exceptions: ExceptionRecord[],
  filters: ReportFilters,
) {
  const filteredExceptions = filterExceptions(exceptions, filters);
  const filteredShipments = filterShipments(shipments, filters, exceptions);
  const metrics = computeExecutiveMetrics(customers, filteredShipments, filteredExceptions);

  const topRiskCustomers = metrics.customerRiskProfiles.slice(0, 5).map((p) => ({
    customerName: p.customerName,
    riskScore: p.riskScore,
    riskLevel: p.riskLevel,
    openExceptions: p.openExceptions,
  }));

  const topCriticalExceptions = filteredExceptions
    .filter((e) => e.status !== "Resolved" && e.severity === "Critical")
    .slice(0, 10)
    .map((e) => ({
      id: e.id,
      title: e.title,
      customer: e.customer,
      severity: e.severity,
      status: e.status,
    }));

  const customerRiskRankings = metrics.customerRiskProfiles.map((p, index) => ({
    rank: index + 1,
    customerName: p.customerName,
    riskScore: p.riskScore,
    riskLevel: p.riskLevel,
  }));

  return {
    topRiskCustomers,
    topCriticalExceptions,
    slaCompliancePercent: metrics.slaCompliancePercent,
    escalationTrend: metrics.escalationTrend,
    followUpCompliancePercent: metrics.followUpCompliancePercent,
    customerRiskRankings,
  };
}

export function buildCustomerSlaReport(
  customers: Customer[],
  shipments: Shipment[],
  exceptions: ExceptionRecord[],
  filters: ReportFilters,
) {
  const filteredExceptions = filterExceptions(exceptions, filters);
  const filteredShipments = filterShipments(shipments, filters, exceptions);
  let profiles = computeCustomerRiskProfiles(customers, filteredShipments, filteredExceptions);

  if (filters.customer !== "All") {
    profiles = profiles.filter((p) => p.customerName === filters.customer);
  }

  return profiles.map((p) => ({
    customer: p.customerName,
    slaTarget: p.slaTarget,
    actualSla: p.actualSla,
    riskScore: p.riskScore,
    openExceptions: p.openExceptions,
    escalations: p.escalationCount,
  }));
}

export function buildExceptionReport(exceptions: ExceptionRecord[], filters: ReportFilters) {
  return filterExceptions(exceptions, filters).map((e) => ({
    exception: e.id,
    title: e.title,
    severity: e.severity,
    status: e.status,
    owner: e.owner,
    daysOpen: computeDaysOpen(e.openedAt),
    escalationLevel: e.escalationLevel ?? 1,
  }));
}

export function buildEscalationReport(exceptions: ExceptionRecord[], filters: ReportFilters) {
  return filterExceptions(exceptions, filters)
    .filter(
      (e) =>
        e.status !== "Resolved" &&
        (e.status === "Escalated" ||
          (e.escalationLevel != null && e.escalationLevel >= 2) ||
          e.playbookType != null),
    )
    .map((e) => ({
      exception: e.id,
      title: e.title,
      escalationLevel: e.escalationLevel ?? 1,
      assignedOwner: e.owner,
      followUpStatus: isFollowUpOverdue(e.nextFollowUpAt)
        ? "Overdue"
        : e.nextFollowUpAt
          ? "Scheduled"
          : "None",
      daysOpen: computeDaysOpen(e.openedAt),
      resolutionStatus: e.status,
    }));
}

export function buildCarrierPerformanceReport(
  shipments: Shipment[],
  exceptions: ExceptionRecord[],
  filters: ReportFilters,
) {
  let rows = computeCarrierPerformanceRows(filterShipments(shipments, filters, exceptions));
  if (filters.carrier !== "All") {
    rows = rows.filter((r) => r.carrier === filters.carrier);
  }
  return rows;
}

export function buildCustomerCommunicationReport(
  notifications: CustomerNotificationRecord[],
  filters: ReportFilters,
) {
  let filtered = notifications;
  if (filters.customer !== "All") {
    filtered = filtered.filter((n) => n.customerName === filters.customer);
  }

  const totalNotifications = filtered.length;
  const unreadCount = filtered.filter((n) => n.status === "Unread").length;
  const readCount = totalNotifications - unreadCount;
  const readRatePercent =
    totalNotifications > 0 ? Math.round((readCount / totalNotifications) * 1000) / 10 : 100;

  const delayNotices = filtered.filter((n) => n.type === "shipment_delayed").length;
  const resolutionNotices = filtered.filter((n) => n.type === "exception_resolved").length;
  const exceptionNotices = filtered.filter(
    (n) => n.type === "shipment_exception" || n.type === "exception_updated",
  ).length;
  const slaWarnings = filtered.filter((n) => n.type === "sla_risk_warning").length;

  const customerMap = new Map<
    string,
    {
      customerName: string;
      total: number;
      unread: number;
      delayNotices: number;
      resolutionNotices: number;
    }
  >();

  for (const notification of filtered) {
    const name = notification.customerName ?? "Unknown customer";
    const current = customerMap.get(name) ?? {
      customerName: name,
      total: 0,
      unread: 0,
      delayNotices: 0,
      resolutionNotices: 0,
    };
    current.total += 1;
    if (notification.status === "Unread") current.unread += 1;
    if (notification.type === "shipment_delayed") current.delayNotices += 1;
    if (notification.type === "exception_resolved") current.resolutionNotices += 1;
    customerMap.set(name, current);
  }

  const byCustomer = [...customerMap.values()]
    .map((row) => ({
      ...row,
      readRatePercent:
        row.total > 0
          ? Math.round(((row.total - row.unread) / row.total) * 1000) / 10
          : 100,
    }))
    .sort((a, b) => b.total - a.total);

  const typeCounts = new Map<string, number>();
  for (const notification of filtered) {
    typeCounts.set(notification.type, (typeCounts.get(notification.type) ?? 0) + 1);
  }

  const byType = [...typeCounts.entries()]
    .map(([type, count]) => ({
      type,
      label:
        CUSTOMER_NOTIFICATION_TYPE_LABELS[
          type as keyof typeof CUSTOMER_NOTIFICATION_TYPE_LABELS
        ] ?? type,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    totalNotifications,
    unreadCount,
    readRatePercent,
    delayNotices,
    resolutionNotices,
    exceptionNotices,
    slaWarnings,
    byCustomer,
    byType,
  };
}

export function buildReportData(
  reportId: string,
  customers: Customer[],
  shipments: Shipment[],
  exceptions: ExceptionRecord[],
  filters: ReportFilters,
  customerNotifications: CustomerNotificationRecord[] = [],
) {
  switch (reportId) {
    case "operations-summary":
      return buildOperationsSummaryReport(customers, shipments, exceptions, filters);
    case "executive-summary":
      return buildExecutiveSummaryReport(customers, shipments, exceptions, filters);
    case "customer-sla":
      return buildCustomerSlaReport(customers, shipments, exceptions, filters);
    case "exception":
      return buildExceptionReport(exceptions, filters);
    case "escalation":
      return buildEscalationReport(exceptions, filters);
    case "carrier-performance":
      return buildCarrierPerformanceReport(shipments, exceptions, filters);
    case "customer-communication":
      return buildCustomerCommunicationReport(customerNotifications, filters);
    default:
      return null;
  }
}

export { computeDaysSinceLastFollowUp };
