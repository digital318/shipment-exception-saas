import type {
  Customer,
  ExceptionRecord,
  Severity,
  Shipment,
} from "@/lib/types";

export type RiskLevel = "green" | "yellow" | "red";

export const EXCEPTION_RISK_SCORES: Record<Severity, number> = {
  Critical: 100,
  High: 75,
  Medium: 50,
  Low: 25,
};

export type CustomerSlaMetrics = {
  customerId: string;
  customerName: string;
  tier: Customer["tier"];
  slaTarget: number;
  totalShipments: number;
  delayedShipments: number;
  deliveredShipments: number;
  onTimePercent: number;
  riskLevel: RiskLevel;
  gapFromTarget: number;
};

export type ExceptionSeverityBreakdown = {
  severity: Severity;
  count: number;
  riskScore: number;
  pct: number;
};

export type SlaTrendCard = {
  label: string;
  value: string;
  sublabel: string;
  trend: "up" | "down" | "neutral";
  accent: "emerald" | "amber" | "rose" | "violet";
};

export type NetworkIntelligence = {
  networkHealthScore: number;
  slaCompliancePercent: number;
  customersAtRisk: number;
  criticalExceptions: number;
  openExceptions: number;
  customerMetrics: CustomerSlaMetrics[];
  atRiskCustomers: CustomerSlaMetrics[];
  exceptionSeverityBreakdown: ExceptionSeverityBreakdown[];
  slaTrendCards: SlaTrendCard[];
  overallOnTimePercent: number;
  averageSlaTarget: number;
};

function isDelayedShipment(shipment: Shipment): boolean {
  return (
    shipment.status === "Delayed" ||
    shipment.status === "Exception" ||
    shipment.delayHours !== null
  );
}

export function getCustomerRiskLevel(
  actualPercent: number,
  targetPercent: number,
): RiskLevel {
  if (actualPercent >= targetPercent) return "green";
  if (actualPercent >= targetPercent - 3) return "yellow";
  return "red";
}

export function computeCustomerOnTimePercent(
  shipments: Shipment[],
): { onTimePercent: number; total: number; delayed: number; delivered: number } {
  const total = shipments.length;
  if (total === 0) {
    return { onTimePercent: 100, total: 0, delayed: 0, delivered: 0 };
  }

  const delayed = shipments.filter(isDelayedShipment).length;
  const delivered = shipments.filter((s) => s.status === "Delivered").length;
  const onTimePercent = ((total - delayed) / total) * 100;

  return { onTimePercent, total, delayed, delivered };
}

export function computeCustomerSlaMetrics(
  customer: Customer,
  shipments: Shipment[],
): CustomerSlaMetrics {
  const customerShipments = shipments.filter((s) => s.customer === customer.name);
  const { onTimePercent, total, delayed, delivered } =
    computeCustomerOnTimePercent(customerShipments);

  return {
    customerId: customer.dbId ?? customer.id,
    customerName: customer.name,
    tier: customer.tier,
    slaTarget: customer.slaTarget,
    totalShipments: total,
    delayedShipments: delayed,
    deliveredShipments: delivered,
    onTimePercent,
    riskLevel: getCustomerRiskLevel(onTimePercent, customer.slaTarget),
    gapFromTarget: onTimePercent - customer.slaTarget,
  };
}

export function computeNetworkHealthScore(
  openExceptions: ExceptionRecord[],
): number {
  if (openExceptions.length === 0) return 100;

  const totalRisk = openExceptions.reduce(
    (sum, exc) => sum + EXCEPTION_RISK_SCORES[exc.severity],
    0,
  );
  const avgRiskImpact = totalRisk / openExceptions.length;
  return Math.max(0, Math.round(100 - avgRiskImpact));
}

export function computeSlaCompliancePercent(
  customerMetrics: CustomerSlaMetrics[],
): number {
  const withShipments = customerMetrics.filter((c) => c.totalShipments > 0);
  if (withShipments.length === 0) return 100;

  const meetingTarget = withShipments.filter((c) => c.riskLevel === "green").length;
  return Math.round((meetingTarget / withShipments.length) * 1000) / 10;
}

export function computeExceptionSeverityBreakdown(
  exceptions: ExceptionRecord[],
): ExceptionSeverityBreakdown[] {
  const open = exceptions.filter((e) => e.status !== "Resolved");
  const total = open.length;
  const severities: Severity[] = ["Critical", "High", "Medium", "Low"];

  return severities.map((severity) => {
    const count = open.filter((e) => e.severity === severity).length;
    return {
      severity,
      count,
      riskScore: EXCEPTION_RISK_SCORES[severity],
      pct: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
    };
  });
}

export function resolveCustomersForMetrics(
  customers: Customer[],
  shipments: Shipment[],
): Customer[] {
  if (customers.length > 0) return customers;

  const names = [...new Set(shipments.map((s) => s.customer).filter(Boolean))];
  return names.map((name) => ({
    id: name.slice(0, 8).toUpperCase(),
    name,
    contactName: "—",
    contactEmail: "—",
    tier: "Standard" as const,
    accountManager: "—",
    activeShipments: shipments.filter(
      (s) => s.customer === name && s.status !== "Delivered",
    ).length,
    exceptions: 0,
    slaTarget: 95,
    region: "—",
  }));
}

export function computeNetworkIntelligence(
  customers: Customer[],
  shipments: Shipment[],
  exceptions: ExceptionRecord[],
): NetworkIntelligence {
  const resolvedCustomers = resolveCustomersForMetrics(customers, shipments);
  const customerMetrics = resolvedCustomers
    .map((c) => computeCustomerSlaMetrics(c, shipments))
    .sort((a, b) => a.gapFromTarget - b.gapFromTarget);

  const atRiskCustomers = customerMetrics.filter(
    (c) => c.riskLevel !== "green" && c.totalShipments > 0,
  );

  const openExceptions = exceptions.filter((e) => e.status !== "Resolved");
  const criticalExceptions = openExceptions.filter(
    (e) => e.severity === "Critical",
  ).length;

  const networkHealthScore = computeNetworkHealthScore(openExceptions);
  const slaCompliancePercent = computeSlaCompliancePercent(customerMetrics);

  const { onTimePercent: overallOnTimePercent } =
    computeCustomerOnTimePercent(shipments);

  const customersWithTarget = resolvedCustomers.filter((c) => c.slaTarget > 0);
  const averageSlaTarget =
    customersWithTarget.length > 0
      ? customersWithTarget.reduce((sum, c) => sum + c.slaTarget, 0) /
        customersWithTarget.length
      : 95;

  const exceptionSeverityBreakdown =
    computeExceptionSeverityBreakdown(exceptions);

  const slaTrendCards: SlaTrendCard[] = [
    {
      label: "Network on-time",
      value: `${overallOnTimePercent.toFixed(1)}%`,
      sublabel: `Target avg ${averageSlaTarget.toFixed(1)}%`,
      trend:
        overallOnTimePercent >= averageSlaTarget
          ? "up"
          : overallOnTimePercent >= averageSlaTarget - 3
            ? "neutral"
            : "down",
      accent:
        overallOnTimePercent >= averageSlaTarget
          ? "emerald"
          : overallOnTimePercent >= averageSlaTarget - 3
            ? "amber"
            : "rose",
    },
    {
      label: "SLA compliance",
      value: `${slaCompliancePercent}%`,
      sublabel: `${customerMetrics.filter((c) => c.riskLevel === "green" && c.totalShipments > 0).length} of ${customerMetrics.filter((c) => c.totalShipments > 0).length} customers`,
      trend: slaCompliancePercent >= 80 ? "up" : slaCompliancePercent >= 60 ? "neutral" : "down",
      accent: slaCompliancePercent >= 80 ? "emerald" : slaCompliancePercent >= 60 ? "amber" : "rose",
    },
    {
      label: "Customers at risk",
      value: String(atRiskCustomers.length),
      sublabel: `${atRiskCustomers.filter((c) => c.riskLevel === "red").length} critical · ${atRiskCustomers.filter((c) => c.riskLevel === "yellow").length} warning`,
      trend: atRiskCustomers.length === 0 ? "up" : atRiskCustomers.length <= 2 ? "neutral" : "down",
      accent: atRiskCustomers.length === 0 ? "emerald" : atRiskCustomers.length <= 2 ? "amber" : "rose",
    },
    {
      label: "Network health",
      value: String(networkHealthScore),
      sublabel: `${openExceptions.length} open exceptions`,
      trend: networkHealthScore >= 70 ? "up" : networkHealthScore >= 50 ? "neutral" : "down",
      accent: networkHealthScore >= 70 ? "emerald" : networkHealthScore >= 50 ? "amber" : "rose",
    },
  ];

  return {
    networkHealthScore,
    slaCompliancePercent,
    customersAtRisk: atRiskCustomers.length,
    criticalExceptions,
    openExceptions: openExceptions.length,
    customerMetrics,
    atRiskCustomers,
    exceptionSeverityBreakdown,
    slaTrendCards,
    overallOnTimePercent,
    averageSlaTarget,
  };
}
