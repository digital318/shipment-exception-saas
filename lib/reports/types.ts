import type { IssueStatus, Severity } from "@/lib/types";

export type ReportId =
  | "operations-summary"
  | "executive-summary"
  | "customer-sla"
  | "exception"
  | "escalation"
  | "carrier-performance";

export type DateRangePreset = "7d" | "30d" | "90d" | "all";

export type ReportFilters = {
  dateRange: DateRangePreset;
  customer: string;
  carrier: string;
  severity: Severity | "All";
  status: IssueStatus | "All";
};

export type OperationsSummaryReport = {
  openExceptions: number;
  criticalExceptions: number;
  escalatedExceptions: number;
  overdueFollowUps: number;
  networkHealthScore: number;
  averageResolutionTimeHours: number;
  exceptionsCreatedLast7Days: number;
};

export type ExecutiveSummaryReport = {
  topRiskCustomers: {
    customerName: string;
    riskScore: number;
    riskLevel: string;
    openExceptions: number;
  }[];
  topCriticalExceptions: {
    id: string;
    title: string;
    customer: string;
    severity: Severity;
    status: IssueStatus;
  }[];
  slaCompliancePercent: number;
  escalationTrend: { label: string; value: number }[];
  followUpCompliancePercent: number;
  customerRiskRankings: {
    rank: number;
    customerName: string;
    riskScore: number;
    riskLevel: string;
  }[];
};

export type CustomerSlaRow = {
  customer: string;
  slaTarget: number;
  actualSla: number;
  riskScore: number;
  openExceptions: number;
  escalations: number;
};

export type ExceptionReportRow = {
  exception: string;
  title: string;
  severity: Severity;
  status: IssueStatus;
  owner: string;
  daysOpen: number;
  escalationLevel: number;
};

export type EscalationReportRow = {
  exception: string;
  title: string;
  escalationLevel: number;
  assignedOwner: string;
  followUpStatus: string;
  daysOpen: number;
  resolutionStatus: string;
};

export type CarrierPerformanceRow = {
  carrier: string;
  shipmentsMonitored: number;
  exceptions: number;
  onTimePct: number;
  averageDelayHours: number;
  healthStatus: string;
};

export const REPORT_DEFINITIONS: {
  id: ReportId;
  title: string;
  description: string;
}[] = [
  {
    id: "operations-summary",
    title: "Operations Summary Report",
    description: "Open exceptions, escalations, follow-ups, and network health KPIs",
  },
  {
    id: "executive-summary",
    title: "Executive Summary Report",
    description: "Customer risk, SLA compliance, escalation trends, and critical exceptions",
  },
  {
    id: "customer-sla",
    title: "Customer SLA Report",
    description: "Per-customer SLA performance, risk scores, and open exceptions",
  },
  {
    id: "exception",
    title: "Exception Report",
    description: "All exceptions with severity, status, owner, and escalation level",
  },
  {
    id: "escalation",
    title: "Escalation Report",
    description: "Escalated exceptions with follow-up status and aging",
  },
  {
    id: "carrier-performance",
    title: "Carrier Performance Report",
    description: "Carrier on-time delivery, delays, and health status",
  },
];
