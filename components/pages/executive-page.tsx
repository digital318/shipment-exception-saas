"use client";

import Link from "next/link";
import { DashboardShell } from "@/components/dashboard-shell";
import { CustomerRiskSection } from "@/components/executive/customer-risk-section";
import { EscalationAgingTable } from "@/components/executive/escalation-aging-table";
import {
  EscalationsByLevelChart,
  ExceptionsBySeverityChart,
  ExecutiveTrendCharts,
  FollowUpComplianceCard,
} from "@/components/executive/executive-charts";
import { SectionHeading } from "@/components/ui/section-heading";
import { ErrorState, LoadingState } from "@/components/ui/data-state";
import { SyncStatus } from "@/components/ui/sync-status";
import { useExecutiveMetrics } from "@/hooks/use-executive-metrics";
import { useExceptions } from "@/context/exceptions-context";
import { btnSecondary, cardSurface, severityStyles } from "@/lib/styles";

export function ExecutivePage() {
  const {
    loading,
    error,
    refresh,
    customerRiskProfiles,
    escalationAging,
    exceptionsBySeverity,
    escalationsByLevel,
    slaTrend,
    exceptionCreationTrend,
    networkHealthTrend,
    escalationTrend,
    followUpCompliancePercent,
    overdueFollowUps,
    slaCompliancePercent,
    networkHealthScore,
    customersAtRisk,
    openExceptions,
    criticalExceptions,
  } = useExecutiveMetrics();
  const { exceptions } = useExceptions();

  const topCritical = exceptions
    .filter((e) => e.status !== "Resolved" && e.severity === "Critical")
    .slice(0, 5);

  const syncState = loading ? "syncing" : error ? "error" : "live";

  return (
    <DashboardShell
      eyebrow="Executive visibility"
      title="Executive Summary"
      description={
        loading
          ? "Loading executive intelligence…"
          : `${customersAtRisk} customers at risk · ${openExceptions} open exceptions · SLA ${slaCompliancePercent}% · health ${networkHealthScore}/100`
      }
      actions={
        <>
          <SyncStatus state={syncState} />
          <Link href="/analytics" className={btnSecondary}>
            Full analytics
          </Link>
        </>
      }
    >
      {loading ? (
        <div className={`${cardSurface} overflow-hidden`}>
          <LoadingState
            title="Loading executive summary"
            description="Computing SLA exposure, customer risk, and escalation aging…"
          />
        </div>
      ) : error ? (
        <div className={`${cardSurface} overflow-hidden`}>
          <ErrorState description={error} onRetry={() => void refresh()} />
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid gap-4 lg:grid-cols-3">
            <FollowUpComplianceCard
              compliancePercent={followUpCompliancePercent}
              overdueFollowUps={overdueFollowUps}
            />
            <article className={`${cardSurface} p-5 sm:p-6 lg:col-span-2`}>
              <SectionHeading
                title="Operational snapshot"
                description={`SLA ${slaCompliancePercent}% · Network health ${networkHealthScore}/100 · ${customersAtRisk} customers at risk`}
              />
              <p className="mt-3 text-sm text-zinc-400">
                Executive visibility into SLA exposure, escalation aging, and customer risk
                intelligence — organization-scoped metrics refreshed from live exception data.
              </p>
            </article>
          </div>

          <CustomerRiskSection profiles={customerRiskProfiles} limit={5} />

          <section aria-label="Top critical exceptions">
            <SectionHeading
              title="Top 5 open critical exceptions"
              description={`${criticalExceptions} critical exceptions requiring executive attention`}
            />
            <div className={`${cardSurface} divide-y divide-white/[0.04]`}>
              {topCritical.length === 0 ? (
                <p className="px-6 py-8 text-center text-sm text-zinc-500">
                  No critical exceptions open.
                </p>
              ) : (
                topCritical.map((exc) => (
                  <div
                    key={exc.id}
                    className="flex items-start justify-between gap-4 px-6 py-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-white">{exc.title}</p>
                      <p className="mt-0.5 text-[11px] text-zinc-500">
                        {exc.customer} · {exc.shipmentId}
                      </p>
                    </div>
                    <span className={severityStyles[exc.severity]}>{exc.severity}</span>
                  </div>
                ))
              )}
            </div>
          </section>

          <ExecutiveTrendCharts
            slaTrend={slaTrend}
            exceptionCreationTrend={exceptionCreationTrend}
            networkHealthTrend={networkHealthTrend}
            escalationTrend={escalationTrend}
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <ExceptionsBySeverityChart breakdown={exceptionsBySeverity} />
            <EscalationsByLevelChart levels={escalationsByLevel} />
          </div>

          <EscalationAgingTable rows={escalationAging} />

          <CustomerRiskSection profiles={customerRiskProfiles} />
        </div>
      )}
    </DashboardShell>
  );
}
