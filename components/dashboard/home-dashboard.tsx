"use client";

import { DashboardShell } from "@/components/dashboard-shell";
import { AutoDetectedAlertsPanel } from "@/components/dashboard/auto-detected-alerts";
import { HomeDashboardActions } from "@/components/dashboard/home-dashboard-actions";
import { MetricsGrid } from "@/components/dashboard/metrics-grid";
import { RecentActivityPanel } from "@/components/dashboard/recent-activity-panel";
import { InteractiveShipmentTable } from "@/components/ui/interactive-shipment-table";
import { SectionHeading } from "@/components/ui/section-heading";
import { useSlaIntelligence } from "@/hooks/use-sla-intelligence";
import {
  badgeBase,
  cardSurface,
  riskLevelLabels,
  riskLevelStyles,
  sectionLabel,
} from "@/lib/styles";

export function HomeDashboard() {
  const {
    customersAtRisk,
    criticalExceptions,
    networkHealthScore,
    atRiskCustomers,
    loading,
  } = useSlaIntelligence();

  return (
    <DashboardShell
      eyebrow="Operations intelligence"
      title="Exception Operations Center"
      description={
        loading
          ? "Loading network intelligence…"
          : `${customersAtRisk} customers at risk · ${criticalExceptions} critical exceptions · health ${networkHealthScore}/100`
      }
      actions={<HomeDashboardActions />}
    >
      <div className="space-y-8">
        <MetricsGrid />

        <AutoDetectedAlertsPanel />

        {atRiskCustomers.length > 0 && (
          <section aria-label="Customers at risk">
            <SectionHeading
              title="Customers At Risk"
              description="Accounts below SLA target — immediate attention required"
              meta={
                <span className={`${badgeBase} bg-rose-500/10 text-rose-400 ring-rose-500/20`}>
                  {atRiskCustomers.length} at risk
                </span>
              }
            />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {atRiskCustomers.slice(0, 6).map((customer) => (
                <article
                  key={customer.customerId}
                  className={`group ${cardSurface} p-5 transition-all duration-200 hover:border-white/[0.1] hover:bg-zinc-900/55`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className={riskLevelStyles[customer.riskLevel]}>
                      {riskLevelLabels[customer.riskLevel]}
                    </span>
                    <span className="font-mono text-[10px] text-zinc-600">
                      {customer.customerId}
                    </span>
                  </div>
                  <h3 className="mt-4 text-sm font-semibold leading-snug text-white">
                    {customer.customerName}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                    Actual {customer.onTimePercent.toFixed(1)}% vs {customer.slaTarget}% target
                    {" · "}
                    {customer.gapFromTarget >= 0 ? "+" : ""}
                    {customer.gapFromTarget.toFixed(1)}% gap
                  </p>
                  <footer className="mt-4 flex items-center justify-between border-t border-white/[0.04] pt-3 text-[11px] text-zinc-600">
                    <span>{customer.delayedShipments} delayed</span>
                    <span>{customer.totalShipments} total shipments</span>
                  </footer>
                </article>
              ))}
            </div>
          </section>
        )}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px] xl:gap-8">
          <InteractiveShipmentTable />

          <RecentActivityPanel />
        </div>
      </div>
    </DashboardShell>
  );
}
