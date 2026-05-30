import { DashboardShell } from "@/components/dashboard-shell";
import { AutoDetectedAlertsPanel } from "@/components/dashboard/auto-detected-alerts";
import { HomeDashboardActions } from "@/components/dashboard/home-dashboard-actions";
import { MetricsGrid } from "@/components/dashboard/metrics-grid";
import { RecentActivityPanel } from "@/components/dashboard/recent-activity-panel";
import { InteractiveShipmentTable } from "@/components/ui/interactive-shipment-table";
import { SectionHeading } from "@/components/ui/section-heading";
import { operationalAlerts } from "@/lib/mock-data";
import {
  badgeBase,
  cardSurface,
  sectionLabel,
  severityStyles,
} from "@/lib/styles";
import type { Severity } from "@/lib/types";

export function HomeDashboard() {
  const activeAlerts = operationalAlerts.filter(
    (a) => a.severity === "Critical" || a.severity === "High",
  ).length;

  return (
    <DashboardShell
      eyebrow="North America · May 27, 2026"
      title="Exception Operations Center"
      description={`${activeAlerts} active network alerts · live exception board`}
      actions={<HomeDashboardActions />}
    >
      <div className="space-y-8">
        <MetricsGrid />

        <AutoDetectedAlertsPanel />

        <section aria-label="Operational alerts">
          <SectionHeading
            title="Operational Alerts"
            description="Network-wide disruptions affecting active lanes"
            meta={
              <span className={`${badgeBase} bg-zinc-500/10 text-zinc-400 ring-zinc-500/20`}>
                {operationalAlerts.length} active
              </span>
            }
          />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {operationalAlerts.map((alert) => (
              <article
                key={alert.id}
                className={`group ${cardSurface} p-5 transition-all duration-200 hover:border-white/[0.1] hover:bg-zinc-900/55`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className={severityStyles[alert.severity as Severity]}>
                    {alert.severity}
                  </span>
                  <span className="font-mono text-[10px] text-zinc-600">{alert.id}</span>
                </div>
                <h3 className="mt-4 text-sm font-semibold leading-snug text-white">
                  {alert.title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-zinc-500">{alert.detail}</p>
                <footer className="mt-4 flex items-center justify-between border-t border-white/[0.04] pt-3 text-[11px] text-zinc-600">
                  <span>{alert.affected} shipments</span>
                  <time>{alert.since}</time>
                </footer>
              </article>
            ))}
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px] xl:gap-8">
          <InteractiveShipmentTable />

          <RecentActivityPanel />
        </div>
      </div>
    </DashboardShell>
  );
}
