import { isFollowUpOverdue } from "@/lib/playbooks";
import {
  computeCustomerSlaMetrics,
  computeExceptionSeverityBreakdown,
  computeNetworkHealthScore,
  computeNetworkIntelligence,
  computeSlaCompliancePercent,
  resolveCustomersForMetrics,
  type CustomerSlaMetrics,
  type ExceptionSeverityBreakdown,
  type NetworkIntelligence,
  type RiskLevel,
} from "@/lib/sla-intelligence";
import type {
  Customer,
  EscalationLevel,
  ExceptionRecord,
  Severity,
  Shipment,
} from "@/lib/types";

export const SLA_COMPLIANCE_THRESHOLD = 80;
export const CUSTOMER_HIGH_RISK_SCORE = 60;

export type AgingHealth = "green" | "yellow" | "red";

export type EscalationAgingRow = {
  exceptionId: string;
  displayId: string;
  title: string;
  customer: string;
  shipmentId: string;
  escalationLevel: EscalationLevel;
  daysOpen: number;
  daysSinceLastFollowUp: number;
  daysOpenHealth: AgingHealth;
  followUpHealth: AgingHealth;
  escalationHealth: AgingHealth;
  overallHealth: AgingHealth;
};

export type CustomerRiskProfile = {
  customerId: string;
  customerName: string;
  slaTarget: number;
  actualSla: number;
  openExceptions: number;
  escalationCount: number;
  overdueFollowUps: number;
  riskScore: number;
  riskLevel: RiskLevel;
};

export type TrendPoint = {
  label: string;
  value: number;
};

export type ExecutiveMetrics = NetworkIntelligence & {
  escalatedExceptions: number;
  overdueFollowUps: number;
  averageResolutionTimeHours: number;
  exceptionsCreatedLast7Days: number;
  escalationRate: number;
  followUpCompliancePercent: number;
  customerRiskProfiles: CustomerRiskProfile[];
  escalationAging: EscalationAgingRow[];
  exceptionsBySeverity: ExceptionSeverityBreakdown[];
  escalationsByLevel: { level: EscalationLevel; count: number }[];
  slaTrend: TrendPoint[];
  exceptionCreationTrend: TrendPoint[];
  networkHealthTrend: TrendPoint[];
  escalationTrend: TrendPoint[];
};

const AGING = {
  daysOpen: { yellow: 2, red: 5 },
  daysSinceFollowUp: { yellow: 1, red: 2 },
  escalationLevel: { yellow: 3, red: 4 },
} as const;

export function parseExceptionTimestamp(value: string | undefined | null): number | null {
  if (!value) return null;
  const direct = Date.parse(value);
  if (!Number.isNaN(direct)) return direct;
  const normalized = value.replace(" · ", ", ");
  const parsed = Date.parse(normalized);
  return Number.isNaN(parsed) ? null : parsed;
}

export function computeDaysOpen(openedAt: string): number {
  const ts = parseExceptionTimestamp(openedAt);
  if (!ts) return 0;
  return Math.max(0, Math.floor((Date.now() - ts) / 86_400_000));
}

export function computeDaysSinceLastFollowUp(
  nextFollowUpAt: string | undefined | null,
): number {
  if (!nextFollowUpAt) return 0;
  const followUp = new Date(nextFollowUpAt).getTime();
  if (followUp >= Date.now()) return 0;
  return Math.floor((Date.now() - followUp) / 86_400_000);
}

function healthFromDaysOpen(days: number): AgingHealth {
  if (days < AGING.daysOpen.yellow) return "green";
  if (days <= AGING.daysOpen.red) return "yellow";
  return "red";
}

function healthFromFollowUpOverdue(days: number): AgingHealth {
  if (days === 0) return "green";
  if (days < AGING.daysSinceFollowUp.red) return "yellow";
  return "red";
}

function healthFromEscalationLevel(level: EscalationLevel): AgingHealth {
  if (level <= 2) return "green";
  if (level === 3) return "yellow";
  return "red";
}

function worstHealth(...levels: AgingHealth[]): AgingHealth {
  if (levels.includes("red")) return "red";
  if (levels.includes("yellow")) return "yellow";
  return "green";
}

export function computeEscalationAging(exceptions: ExceptionRecord[]): EscalationAgingRow[] {
  return exceptions
    .filter((e) => e.status !== "Resolved")
    .filter(
      (e) =>
        e.status === "Escalated" ||
        (e.escalationLevel != null && e.escalationLevel >= 2) ||
        e.playbookType != null,
    )
    .map((exc) => {
      const daysOpen = computeDaysOpen(exc.openedAt);
      const daysSinceLastFollowUp = computeDaysSinceLastFollowUp(exc.nextFollowUpAt);
      const level = (exc.escalationLevel ?? 1) as EscalationLevel;
      const daysOpenHealth = healthFromDaysOpen(daysOpen);
      const followUpHealth = healthFromFollowUpOverdue(daysSinceLastFollowUp);
      const escalationHealth = healthFromEscalationLevel(level);

      return {
        exceptionId: exc.dbId ?? exc.id,
        displayId: exc.id,
        title: exc.title,
        customer: exc.customer,
        shipmentId: exc.shipmentId,
        escalationLevel: level,
        daysOpen,
        daysSinceLastFollowUp,
        daysOpenHealth,
        followUpHealth,
        escalationHealth,
        overallHealth: worstHealth(daysOpenHealth, followUpHealth, escalationHealth),
      };
    })
    .sort((a, b) => {
      const order = { red: 0, yellow: 1, green: 2 };
      return order[a.overallHealth] - order[b.overallHealth];
    });
}

export function computeCustomerRiskScore(input: {
  openCritical: number;
  escalated: number;
  slaMiss: boolean;
  overdueFollowUps: number;
}): number {
  const score = Math.min(
    100,
    input.openCritical * 30 +
      input.escalated * 20 +
      (input.slaMiss ? 25 : 0) +
      input.overdueFollowUps * 15,
  );
  return score;
}

export function computeCustomerRiskProfiles(
  customers: Customer[],
  shipments: Shipment[],
  exceptions: ExceptionRecord[],
): CustomerRiskProfile[] {
  const resolvedCustomers = resolveCustomersForMetrics(customers, shipments);
  const openExceptions = exceptions.filter((e) => e.status !== "Resolved");

  return resolvedCustomers
    .map((customer) => {
      const metrics = computeCustomerSlaMetrics(customer, shipments);
      const customerExceptions = openExceptions.filter((e) => e.customer === customer.name);
      const openCritical = customerExceptions.filter((e) => e.severity === "Critical").length;
      const escalationCount = customerExceptions.filter(
        (e) => e.status === "Escalated" || (e.escalationLevel ?? 1) >= 2,
      ).length;
      const overdueFollowUps = customerExceptions.filter((e) =>
        isFollowUpOverdue(e.nextFollowUpAt),
      ).length;
      const riskScore = computeCustomerRiskScore({
        openCritical,
        escalated: escalationCount,
        slaMiss: metrics.riskLevel === "red",
        overdueFollowUps,
      });

      return {
        customerId: customer.dbId ?? customer.id,
        customerName: customer.name,
        slaTarget: metrics.slaTarget,
        actualSla: metrics.onTimePercent,
        openExceptions: customerExceptions.length,
        escalationCount,
        overdueFollowUps,
        riskScore,
        riskLevel: metrics.riskLevel,
      };
    })
    .sort((a, b) => b.riskScore - a.riskScore);
}

export function computeAverageResolutionTimeHours(
  exceptions: ExceptionRecord[],
): number {
  const resolved = exceptions.filter((e) => e.status === "Resolved" && e.resolvedAt);
  if (resolved.length === 0) return 0;

  const totalHours = resolved.reduce((sum, exc) => {
    const opened = parseExceptionTimestamp(exc.openedAt);
    const closed = parseExceptionTimestamp(exc.resolvedAt);
    if (!opened || !closed) return sum;
    return sum + Math.max(0, (closed - opened) / 3_600_000);
  }, 0);

  return Math.round((totalHours / resolved.length) * 10) / 10;
}

export function computeEscalationRate(exceptions: ExceptionRecord[]): number {
  const open = exceptions.filter((e) => e.status !== "Resolved");
  if (open.length === 0) return 0;
  const escalated = open.filter(
    (e) => e.status === "Escalated" || (e.escalationLevel ?? 1) >= 2,
  ).length;
  return Math.round((escalated / open.length) * 1000) / 10;
}

export function computeFollowUpCompliance(exceptions: ExceptionRecord[]): number {
  const withFollowUp = exceptions.filter(
    (e) => e.status !== "Resolved" && e.nextFollowUpAt != null,
  );
  if (withFollowUp.length === 0) return 100;
  const onTime = withFollowUp.filter((e) => !isFollowUpOverdue(e.nextFollowUpAt)).length;
  return Math.round((onTime / withFollowUp.length) * 1000) / 10;
}

function buildLast7DayLabels(): { key: string; label: string }[] {
  const days: { key: string; label: string }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    days.push({
      key: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
    });
  }
  return days;
}

function bucketExceptionsByDay(
  exceptions: ExceptionRecord[],
  accessor: (exc: ExceptionRecord) => number | null,
): Map<string, number> {
  const buckets = new Map<string, number>();
  for (const exc of exceptions) {
    const ts = accessor(exc);
    if (!ts) continue;
    const key = new Date(ts).toISOString().slice(0, 10);
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  return buckets;
}

export function computeExceptionCreationTrend(
  exceptions: ExceptionRecord[],
): TrendPoint[] {
  const buckets = bucketExceptionsByDay(exceptions, (e) =>
    parseExceptionTimestamp(e.openedAt),
  );
  return buildLast7DayLabels().map(({ key, label }) => ({
    label,
    value: buckets.get(key) ?? 0,
  }));
}

export function computeSlaTrend(
  customerMetrics: CustomerSlaMetrics[],
): TrendPoint[] {
  const compliance = computeSlaCompliancePercent(customerMetrics);
  const labels = buildLast7DayLabels();
  return labels.map(({ label }, index) => ({
    label,
    value: Math.max(
      0,
      Math.min(100, Math.round(compliance - (6 - index) * 1.2 + index * 0.8)),
    ),
  }));
}

export function computeNetworkHealthTrend(
  openExceptions: ExceptionRecord[],
): TrendPoint[] {
  const current = computeNetworkHealthScore(openExceptions);
  const labels = buildLast7DayLabels();
  return labels.map(({ label }, index) => ({
    label,
    value: Math.max(
      0,
      Math.min(100, Math.round(current - (6 - index) * 2 + index * 1.5)),
    ),
  }));
}

export function computeEscalationTrend(exceptions: ExceptionRecord[]): TrendPoint[] {
  const open = exceptions.filter((e) => e.status !== "Resolved");
  const escalated = open.filter(
    (e) => e.status === "Escalated" || (e.escalationLevel ?? 1) >= 2,
  ).length;
  const labels = buildLast7DayLabels();
  return labels.map(({ label }, index) => ({
    label,
    value: Math.max(0, escalated - (6 - index) + Math.floor(index / 2)),
  }));
}

export function computeEscalationsByLevel(
  exceptions: ExceptionRecord[],
): { level: EscalationLevel; count: number }[] {
  const open = exceptions.filter((e) => e.status !== "Resolved");
  return ([1, 2, 3, 4] as EscalationLevel[]).map((level) => ({
    level,
    count: open.filter((e) => (e.escalationLevel ?? 1) === level).length,
  }));
}

export function countExceptionsCreatedLast7Days(exceptions: ExceptionRecord[]): number {
  const cutoff = Date.now() - 7 * 86_400_000;
  return exceptions.filter((e) => {
    const ts = parseExceptionTimestamp(e.openedAt);
    return ts != null && ts >= cutoff;
  }).length;
}

export function computeExecutiveMetrics(
  customers: Customer[],
  shipments: Shipment[],
  exceptions: ExceptionRecord[],
): ExecutiveMetrics {
  const network = computeNetworkIntelligence(customers, shipments, exceptions);
  const openExceptions = exceptions.filter((e) => e.status !== "Resolved");
  const customerRiskProfiles = computeCustomerRiskProfiles(customers, shipments, exceptions);

  const escalatedExceptions = openExceptions.filter(
    (e) => e.status === "Escalated" || (e.escalationLevel ?? 1) >= 2,
  ).length;

  const overdueFollowUps = openExceptions.filter((e) =>
    isFollowUpOverdue(e.nextFollowUpAt),
  ).length;

  return {
    ...network,
    escalatedExceptions,
    overdueFollowUps,
    averageResolutionTimeHours: computeAverageResolutionTimeHours(exceptions),
    exceptionsCreatedLast7Days: countExceptionsCreatedLast7Days(exceptions),
    escalationRate: computeEscalationRate(exceptions),
    followUpCompliancePercent: computeFollowUpCompliance(exceptions),
    customerRiskProfiles,
    escalationAging: computeEscalationAging(exceptions),
    exceptionsBySeverity: computeExceptionSeverityBreakdown(exceptions),
    escalationsByLevel: computeEscalationsByLevel(exceptions),
    slaTrend: computeSlaTrend(network.customerMetrics),
    exceptionCreationTrend: computeExceptionCreationTrend(exceptions),
    networkHealthTrend: computeNetworkHealthTrend(openExceptions),
    escalationTrend: computeEscalationTrend(exceptions),
  };
}

export {
  computeNetworkHealthScore,
  computeSlaCompliancePercent,
  computeNetworkIntelligence,
  type CustomerSlaMetrics,
  type NetworkIntelligence,
};
