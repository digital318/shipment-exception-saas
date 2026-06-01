import type { CustomerSafeException } from "./visibility";
import type { Shipment } from "@/lib/types";
import type { CustomerRiskProfile } from "@/lib/services/metrics-service";

function escapeCsvValue(value: string | number | null | undefined): string {
  const str = value == null ? "" : String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function rowsToCsv(headers: string[], rows: string[][]): string {
  const lines = [headers.map(escapeCsvValue).join(",")];
  for (const row of rows) {
    lines.push(row.map(escapeCsvValue).join(","));
  }
  return lines.join("\n");
}

function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportShipmentReportCsv(
  customerName: string,
  shipments: Shipment[],
): void {
  const headers = [
    "Shipment Number",
    "Origin",
    "Destination",
    "ETA",
    "Status",
    "Carrier",
    "Mode",
  ];
  const rows = shipments.map((s) => [
    s.id,
    s.origin,
    s.destination,
    s.eta,
    s.status,
    s.carrier,
    s.mode,
  ]);
  const csv = rowsToCsv(headers, rows);
  const slug = customerName.replace(/\s+/g, "-").toLowerCase();
  downloadCsv(`${slug}-shipments-${dateStamp()}.csv`, csv);
}

export function exportExceptionReportCsv(
  customerName: string,
  exceptions: CustomerSafeException[],
): void {
  const headers = [
    "Exception ID",
    "Shipment",
    "Title",
    "Severity",
    "Status",
    "Owner",
    "Last Update",
    "Route",
    "Carrier",
  ];
  const rows = exceptions.map((e) => [
    e.id,
    e.shipmentId,
    e.title,
    e.severity,
    e.status,
    e.owner,
    e.updatedAt,
    e.route,
    e.carrier,
  ]);
  const csv = rowsToCsv(headers, rows);
  const slug = customerName.replace(/\s+/g, "-").toLowerCase();
  downloadCsv(`${slug}-exceptions-${dateStamp()}.csv`, csv);
}

export function exportSlaReportCsv(
  customerName: string,
  scorecard: CustomerRiskProfile,
): void {
  const headers = [
    "Customer",
    "SLA Target %",
    "Actual SLA %",
    "Open Exceptions",
    "Escalations",
    "Risk Score",
    "Risk Level",
  ];
  const rows = [
    [
      scorecard.customerName,
      scorecard.slaTarget.toFixed(1),
      scorecard.actualSla.toFixed(1),
      String(scorecard.openExceptions),
      String(scorecard.escalationCount),
      String(scorecard.riskScore),
      scorecard.riskLevel,
    ],
  ];
  const csv = rowsToCsv(headers, rows);
  const slug = customerName.replace(/\s+/g, "-").toLowerCase();
  downloadCsv(`${slug}-sla-${dateStamp()}.csv`, csv);
}

function dateStamp(): string {
  return new Date().toISOString().slice(0, 10);
}
