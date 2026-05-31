import type { ExceptionDetectionRule } from "@/lib/exception-engine";
import type { ExceptionSource, Severity } from "@/lib/types";

export type PlaybookType =
  | "Carrier Delay"
  | "SLA Risk"
  | "Terminal Congestion"
  | "Weather Delay"
  | "Address Issue"
  | "Delivery Confirmation"
  | "Critical Customer Impact";

export type EscalationLevel = 1 | 2 | 3 | 4;

export const PLAYBOOK_TYPES: PlaybookType[] = [
  "Carrier Delay",
  "SLA Risk",
  "Terminal Congestion",
  "Weather Delay",
  "Address Issue",
  "Delivery Confirmation",
  "Critical Customer Impact",
];

export const ESCALATION_LEVEL_LABELS: Record<EscalationLevel, string> = {
  1: "Operations Review",
  2: "Carrier Escalation",
  3: "Customer Notification",
  4: "Executive Escalation",
};

const SEVERITY_OWNERS: Record<Severity, string> = {
  Critical: "Sarah Chen",
  High: "Marcus Webb",
  Medium: "Lisa Park",
  Low: "System",
};

/** Hours until next follow-up by severity. */
const FOLLOW_UP_HOURS: Record<Severity, number> = {
  Critical: 2,
  High: 4,
  Medium: 8,
  Low: 24,
};

const PLAYBOOK_ACTIONS: Record<PlaybookType, Record<EscalationLevel, string>> = {
  "Carrier Delay": {
    1: "Review carrier tracking updates and confirm revised ETA with the operations team.",
    2: "Contact carrier account manager for status update and recovery plan.",
    3: "Notify customer of delay and provide updated delivery window.",
    4: "Escalate to executive team and carrier leadership for resolution.",
  },
  "SLA Risk": {
    1: "Assess SLA impact and identify recovery options before breach threshold.",
    2: "Coordinate with carrier on expedited routing or alternate lane.",
    3: "Proactively notify customer of SLA risk and mitigation plan.",
    4: "Executive review — customer retention and contractual obligations.",
  },
  "Terminal Congestion": {
    1: "Confirm terminal queue status and estimated departure window.",
    2: "Request priority handling from carrier terminal operations.",
    3: "Update customer on terminal delay and revised ETA.",
    4: "Escalate to carrier regional manager for terminal capacity relief.",
  },
  "Weather Delay": {
    1: "Monitor weather conditions along route and verify carrier hold status.",
    2: "Request carrier reroute assessment when corridor reopens.",
    3: "Notify customer of weather-related delay and safety hold.",
    4: "Executive escalation if delay exceeds contractual weather allowance.",
  },
  "Address Issue": {
    1: "Verify delivery address with customer contact and shipment records.",
    2: "Coordinate address correction with carrier dispatch.",
    3: "Confirm corrected address with customer before redelivery attempt.",
    4: "Executive review for repeated address failures on account.",
  },
  "Delivery Confirmation": {
    1: "Review POD status and confirm delivery attempt details with carrier.",
    2: "Request carrier proof-of-delivery documentation or redelivery.",
    3: "Contact customer to confirm receipt or schedule redelivery.",
    4: "Executive escalation for high-value or time-sensitive deliveries.",
  },
  "Critical Customer Impact": {
    1: "Immediate operations review — assess production or revenue impact.",
    2: "Engage carrier leadership for expedited recovery options.",
    3: "Direct customer outreach with executive-backed recovery plan.",
    4: "C-suite escalation — customer retention and service recovery.",
  },
};

export type PlaybookAssignmentInput = {
  title: string;
  delayReason: string;
  severity: Severity;
  source?: ExceptionSource;
  rule?: ExceptionDetectionRule;
  customerTier?: "Enterprise" | "Growth" | "Standard";
};

export type PlaybookAssignment = {
  owner: string;
  playbookType: PlaybookType;
  escalationLevel: EscalationLevel;
  recommendedAction: string;
  nextFollowUpAt: string;
};

export function assignOwnerBySeverity(severity: Severity): string {
  return SEVERITY_OWNERS[severity];
}

export function getRecommendedAction(
  playbookType: PlaybookType,
  level: EscalationLevel,
): string {
  return PLAYBOOK_ACTIONS[playbookType][level];
}

export function computeNextFollowUp(severity: Severity, from = new Date()): string {
  const date = new Date(from);
  date.setHours(date.getHours() + FOLLOW_UP_HOURS[severity]);
  return date.toISOString();
}

export function determinePlaybookType(input: PlaybookAssignmentInput): PlaybookType {
  const text = `${input.title} ${input.delayReason}`.toLowerCase();

  if (
    text.includes("weather") ||
    text.includes("storm") ||
    text.includes("snow") ||
    text.includes("flood")
  ) {
    return "Weather Delay";
  }
  if (
    text.includes("address") ||
    text.includes("undeliverable") ||
    text.includes("suite") ||
    text.includes("residential")
  ) {
    return "Address Issue";
  }
  if (
    text.includes("terminal") ||
    text.includes("congestion") ||
    text.includes("port") ||
    text.includes("chassis") ||
    text.includes("demurrage") ||
    text.includes("dock")
  ) {
    return "Terminal Congestion";
  }
  if (
    text.includes("delivery confirmation") ||
    text.includes("pod") ||
    text.includes("proof of delivery") ||
    text.includes("delivered")
  ) {
    return "Delivery Confirmation";
  }
  if (
    input.severity === "Critical" &&
    (text.includes("sla") ||
      text.includes("production") ||
      text.includes("breach") ||
      input.customerTier === "Enterprise")
  ) {
    return "Critical Customer Impact";
  }
  if (
    text.includes("sla") ||
    input.rule === "delay_critical" ||
    input.rule === "delay_high"
  ) {
    return "SLA Risk";
  }
  if (input.source === "Carrier Sync" || text.includes("carrier")) {
    return "Carrier Delay";
  }

  if (input.severity === "Critical") return "Critical Customer Impact";
  if (input.severity === "High" || input.severity === "Medium") return "Carrier Delay";
  return "SLA Risk";
}

export function assignPlaybook(input: PlaybookAssignmentInput): PlaybookAssignment {
  const playbookType = determinePlaybookType(input);
  const owner = assignOwnerBySeverity(input.severity);
  const escalationLevel = 1 as EscalationLevel;
  const recommendedAction = getRecommendedAction(playbookType, escalationLevel);
  const nextFollowUpAt = computeNextFollowUp(input.severity);

  return {
    owner,
    playbookType,
    escalationLevel,
    recommendedAction,
    nextFollowUpAt,
  };
}

export function formatEscalationLevel(level: EscalationLevel): string {
  return `Level ${level}: ${ESCALATION_LEVEL_LABELS[level]}`;
}

export function isFollowUpOverdue(nextFollowUpAt: string | undefined | null): boolean {
  if (!nextFollowUpAt) return false;
  return new Date(nextFollowUpAt).getTime() < Date.now();
}

export function formatFollowUpDisplay(iso: string | undefined | null): string {
  if (!iso) return "Not scheduled";
  const target = new Date(iso).getTime();
  const now = Date.now();
  const diffMs = target - now;

  if (diffMs < 0) {
    const overdueMs = Math.abs(diffMs);
    const hours = Math.floor(overdueMs / 3_600_000);
    if (hours < 1) return "Overdue · less than 1 hr";
    if (hours < 24) return `Overdue · ${hours} hr`;
    const days = Math.floor(hours / 24);
    return `Overdue · ${days} day${days === 1 ? "" : "s"}`;
  }

  const hours = Math.ceil(diffMs / 3_600_000);
  if (hours <= 1) return "Due within 1 hr";
  if (hours < 24) return `Due in ${hours} hr`;
  const days = Math.ceil(hours / 24);
  return `Due in ${days} day${days === 1 ? "" : "s"}`;
}

export function nextEscalationLevel(current: EscalationLevel): EscalationLevel | null {
  if (current >= 4) return null;
  return (current + 1) as EscalationLevel;
}
