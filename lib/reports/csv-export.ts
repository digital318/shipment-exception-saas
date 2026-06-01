import { dateStamp, downloadCsv, rowsToCsv } from "@/lib/export/csv-utils";
import type { ReportId } from "./types";
import {
  buildCarrierPerformanceReport,
  buildCustomerSlaReport,
  buildEscalationReport,
  buildExceptionReport,
  buildExecutiveSummaryReport,
  buildOperationsSummaryReport,
} from "./build-reports";
import type { ReportFilters } from "./types";
import type { Customer, ExceptionRecord, Shipment } from "@/lib/types";

function slug(name: string): string {
  return name.replace(/\s+/g, "-").toLowerCase();
}

export function exportReportCsv(
  reportId: ReportId,
  customers: Customer[],
  shipments: Shipment[],
  exceptions: ExceptionRecord[],
  filters: ReportFilters,
): void {
  const stamp = dateStamp();
  let filename = `freightpulse-${reportId}-${stamp}.csv`;
  let csv = "";

  switch (reportId) {
    case "operations-summary": {
      const data = buildOperationsSummaryReport(customers, shipments, exceptions, filters);
      csv = rowsToCsv(
        ["Metric", "Value"],
        [
          ["Open Exceptions", String(data.openExceptions)],
          ["Critical Exceptions", String(data.criticalExceptions)],
          ["Escalated Exceptions", String(data.escalatedExceptions)],
          ["Overdue Follow-Ups", String(data.overdueFollowUps)],
          ["Network Health Score", String(data.networkHealthScore)],
          ["Average Resolution Time (hours)", String(data.averageResolutionTimeHours)],
          ["Exceptions Created Last 7 Days", String(data.exceptionsCreatedLast7Days)],
        ],
      );
      break;
    }
    case "executive-summary": {
      const data = buildExecutiveSummaryReport(customers, shipments, exceptions, filters);
      const rows: string[][] = [
        ["SLA Compliance %", String(data.slaCompliancePercent)],
        ["Follow-Up Compliance %", String(data.followUpCompliancePercent)],
        ["", ""],
        ["Top Risk Customers", ""],
        ...data.topRiskCustomers.map((c) => [
          c.customerName,
          `${c.riskScore} (${c.riskLevel}) · ${c.openExceptions} open`,
        ]),
        ["", ""],
        ["Customer Risk Rankings", ""],
        ...data.customerRiskRankings.map((c) => [
          String(c.rank),
          `${c.customerName} · score ${c.riskScore} · ${c.riskLevel}`,
        ]),
        ["", ""],
        ["Top Critical Exceptions", ""],
        ...data.topCriticalExceptions.map((e) => [
          e.id,
          `${e.title} · ${e.customer} · ${e.severity} · ${e.status}`,
        ]),
        ["", ""],
        ["Escalation Trend (7 days)", ""],
        ...data.escalationTrend.map((p) => [p.label, String(p.value)]),
      ];
      csv = rowsToCsv(["Field", "Value"], rows);
      break;
    }
    case "customer-sla": {
      const rows = buildCustomerSlaReport(customers, shipments, exceptions, filters);
      csv = rowsToCsv(
        ["Customer", "SLA Target %", "Actual SLA %", "Risk Score", "Open Exceptions", "Escalations"],
        rows.map((r) => [
          r.customer,
          r.slaTarget.toFixed(1),
          r.actualSla.toFixed(1),
          String(r.riskScore),
          String(r.openExceptions),
          String(r.escalations),
        ]),
      );
      break;
    }
    case "exception": {
      const rows = buildExceptionReport(exceptions, filters);
      csv = rowsToCsv(
        ["Exception", "Title", "Severity", "Status", "Owner", "Days Open", "Escalation Level"],
        rows.map((r) => [
          r.exception,
          r.title,
          r.severity,
          r.status,
          r.owner,
          String(r.daysOpen),
          String(r.escalationLevel),
        ]),
      );
      break;
    }
    case "escalation": {
      const rows = buildEscalationReport(exceptions, filters);
      csv = rowsToCsv(
        [
          "Exception",
          "Title",
          "Escalation Level",
          "Assigned Owner",
          "Follow-Up Status",
          "Days Open",
          "Resolution Status",
        ],
        rows.map((r) => [
          r.exception,
          r.title,
          String(r.escalationLevel),
          r.assignedOwner,
          r.followUpStatus,
          String(r.daysOpen),
          r.resolutionStatus,
        ]),
      );
      break;
    }
    case "carrier-performance": {
      const rows = buildCarrierPerformanceReport(shipments, exceptions, filters);
      csv = rowsToCsv(
        [
          "Carrier",
          "Shipments Monitored",
          "Exceptions",
          "On-Time %",
          "Average Delay (hours)",
          "Health Status",
        ],
        rows.map((r) => [
          r.carrier,
          String(r.shipmentsMonitored),
          String(r.exceptions),
          String(r.onTimePct),
          String(r.averageDelayHours),
          r.healthStatus,
        ]),
      );
      break;
    }
  }

  downloadCsv(filename, csv);
}
