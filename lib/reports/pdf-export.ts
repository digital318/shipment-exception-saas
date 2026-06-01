import type { ReportId, OperationsSummaryReport } from "./types";
import { REPORT_DEFINITIONS } from "./types";
import { buildReportData } from "./build-reports";
import type { ReportFilters } from "./types";
import type { Customer, ExceptionRecord, Shipment } from "@/lib/types";
import { dateStamp } from "@/lib/export/csv-utils";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderTable(headers: string[], rows: string[][]): string {
  const head = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("");
  const body = rows
    .map(
      (row) =>
        `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`,
    )
    .join("");
  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function renderKeyValuePairs(pairs: [string, string][]): string {
  return renderTable(
    ["Metric", "Value"],
    pairs.map(([k, v]) => [k, v]),
  );
}

function buildReportHtml(
  reportId: ReportId,
  customers: Customer[],
  shipments: Shipment[],
  exceptions: ExceptionRecord[],
  filters: ReportFilters,
): string {
  const def = REPORT_DEFINITIONS.find((r) => r.id === reportId);
  const title = def?.title ?? reportId;
  const data = buildReportData(reportId, customers, shipments, exceptions, filters);
  let body = "";

  switch (reportId) {
    case "operations-summary": {
      const d = data as OperationsSummaryReport | null;
      if (d) {
        body = renderKeyValuePairs([
          ["Open Exceptions", String(d.openExceptions)],
          ["Critical Exceptions", String(d.criticalExceptions)],
          ["Escalated Exceptions", String(d.escalatedExceptions)],
          ["Overdue Follow-Ups", String(d.overdueFollowUps)],
          ["Network Health Score", String(d.networkHealthScore)],
          ["Average Resolution Time (hours)", String(d.averageResolutionTimeHours)],
          ["Exceptions Created Last 7 Days", String(d.exceptionsCreatedLast7Days)],
        ]);
      }
      break;
    }
    case "executive-summary": {
      const d = data as {
        slaCompliancePercent: number;
        followUpCompliancePercent: number;
        topRiskCustomers: { customerName: string; riskScore: number; riskLevel: string; openExceptions: number }[];
        topCriticalExceptions: { id: string; title: string; customer: string; severity: string; status: string }[];
        customerRiskRankings: { rank: number; customerName: string; riskScore: number; riskLevel: string }[];
      };
      if (d) {
        body = [
          renderKeyValuePairs([
            ["SLA Compliance", `${d.slaCompliancePercent}%`],
            ["Follow-Up Compliance", `${d.followUpCompliancePercent}%`],
          ]),
          "<h2>Top Risk Customers</h2>",
          renderTable(
            ["Customer", "Risk Score", "Risk Level", "Open Exceptions"],
            d.topRiskCustomers.map((c) => [
              c.customerName,
              String(c.riskScore),
              c.riskLevel,
              String(c.openExceptions),
            ]),
          ),
          "<h2>Top Critical Exceptions</h2>",
          renderTable(
            ["Exception", "Title", "Customer", "Severity", "Status"],
            d.topCriticalExceptions.map((e) => [
              e.id,
              e.title,
              e.customer,
              e.severity,
              e.status,
            ]),
          ),
          "<h2>Customer Risk Rankings</h2>",
          renderTable(
            ["Rank", "Customer", "Risk Score", "Risk Level"],
            d.customerRiskRankings.map((c) => [
              String(c.rank),
              c.customerName,
              String(c.riskScore),
              c.riskLevel,
            ]),
          ),
        ].join("");
      }
      break;
    }
    case "customer-sla": {
      const rows = (data ?? []) as {
        customer: string;
        slaTarget: number;
        actualSla: number;
        riskScore: number;
        openExceptions: number;
        escalations: number;
      }[];
      body = renderTable(
        ["Customer", "SLA Target", "Actual SLA", "Risk Score", "Open Exceptions", "Escalations"],
        rows.map((r) => [
          r.customer,
          `${r.slaTarget.toFixed(1)}%`,
          `${r.actualSla.toFixed(1)}%`,
          String(r.riskScore),
          String(r.openExceptions),
          String(r.escalations),
        ]),
      );
      break;
    }
    case "exception": {
      const rows = (data ?? []) as {
        exception: string;
        title: string;
        severity: string;
        status: string;
        owner: string;
        daysOpen: number;
        escalationLevel: number;
      }[];
      body = renderTable(
        ["Exception", "Severity", "Status", "Owner", "Days Open", "Escalation Level"],
        rows.map((r) => [
          `${r.exception} — ${r.title}`,
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
      const rows = (data ?? []) as {
        exception: string;
        title: string;
        escalationLevel: number;
        assignedOwner: string;
        followUpStatus: string;
        daysOpen: number;
        resolutionStatus: string;
      }[];
      body = renderTable(
        ["Exception", "Escalation Level", "Owner", "Follow-Up", "Days Open", "Status"],
        rows.map((r) => [
          `${r.exception} — ${r.title}`,
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
      const rows = (data ?? []) as {
        carrier: string;
        shipmentsMonitored: number;
        exceptions: number;
        onTimePct: number;
        averageDelayHours: number;
        healthStatus: string;
      }[];
      body = renderTable(
        ["Carrier", "Shipments", "Exceptions", "On-Time %", "Avg Delay", "Health"],
        rows.map((r) => [
          r.carrier,
          String(r.shipmentsMonitored),
          String(r.exceptions),
          `${r.onTimePct}%`,
          `${r.averageDelayHours}h`,
          r.healthStatus,
        ]),
      );
      break;
    }
  }

  const filterSummary = [
    `Date range: ${filters.dateRange}`,
    filters.customer !== "All" ? `Customer: ${filters.customer}` : null,
    filters.carrier !== "All" ? `Carrier: ${filters.carrier}` : null,
    filters.severity !== "All" ? `Severity: ${filters.severity}` : null,
    filters.status !== "All" ? `Status: ${filters.status}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)} — FreightPulse</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 2rem; color: #18181b; }
    h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
    h2 { font-size: 1.1rem; margin-top: 1.5rem; margin-bottom: 0.5rem; }
    .meta { color: #71717a; font-size: 0.875rem; margin-bottom: 1.5rem; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 1rem; font-size: 0.8125rem; }
    th, td { border: 1px solid #e4e4e7; padding: 0.5rem 0.75rem; text-align: left; }
    th { background: #f4f4f5; font-weight: 600; }
    tr:nth-child(even) td { background: #fafafa; }
    @media print { body { margin: 1rem; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p class="meta">FreightPulse · ${dateStamp()} · ${escapeHtml(filterSummary || "All data")}</p>
  ${body || "<p>No data available for the selected filters.</p>"}
</body>
</html>`;
}

export function exportReportPdf(
  reportId: ReportId,
  customers: Customer[],
  shipments: Shipment[],
  exceptions: ExceptionRecord[],
  filters: ReportFilters,
): void {
  const html = buildReportHtml(reportId, customers, shipments, exceptions, filters);
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
  }, 300);
}
