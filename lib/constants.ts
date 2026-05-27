import type { IssueStatus, Severity } from "./types";

export const EXCEPTION_OWNERS = [
  "Sarah Chen",
  "Marcus Webb",
  "Lisa Park",
  "Unassigned",
] as const;

export const ISSUE_STATUSES: IssueStatus[] = [
  "Open",
  "Investigating",
  "Escalated",
  "Pending Customer",
  "Awaiting Carrier",
  "Resolved",
];

export const SEVERITIES: Severity[] = ["Critical", "High", "Medium", "Low"];

export const SHIPMENT_ID_PATTERN = /^FP-\d{4}-\d{6}$/;

export const CURRENT_USER = "Sarah Chen";
