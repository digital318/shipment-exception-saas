"use client";

import { DashboardShell } from "@/components/dashboard-shell";
import { CustomerSelector } from "@/components/portal/customer-selector";
import { PortalActivityFeed } from "@/components/portal/portal-activity-feed";
import { PortalExceptionsTable } from "@/components/portal/portal-exceptions-table";
import { PortalMetricsGrid } from "@/components/portal/portal-metrics-grid";
import { PortalReportsSection } from "@/components/portal/portal-reports-section";
import { PortalShipmentsTable } from "@/components/portal/portal-shipments-table";
import { PortalSlaScorecard } from "@/components/portal/portal-sla-scorecard";
import { ErrorState, LoadingState } from "@/components/ui/data-state";
import { SyncStatus } from "@/components/ui/sync-status";
import { useCustomerPortalData } from "@/hooks/use-customer-portal-data";
import { badgeBase, cardSurface } from "@/lib/styles";

export function PortalPage() {
  const {
    selectedCustomer,
    customer,
    customerShipments,
    openExceptions,
    customerActivity,
    dashboard,
    scorecard,
    loading,
    error,
    refresh,
    source,
  } = useCustomerPortalData();

  const syncState = loading ? "syncing" : error && source === "mock" ? "error" : "live";

  return (
    <DashboardShell
      eyebrow="Customer portal"
      title={selectedCustomer}
      description={
        loading
          ? "Loading your shipment and exception data…"
          : customer
            ? `${dashboard?.activeShipments ?? 0} active shipments · ${dashboard?.openExceptions ?? 0} open exceptions · SLA ${dashboard?.actualSla.toFixed(1) ?? "—"}%`
            : "Customer account not found in your organization"
      }
      actions={
        <>
          <CustomerSelector />
          <SyncStatus state={syncState} />
        </>
      }
    >
      {loading ? (
        <div className={`${cardSurface} overflow-hidden`}>
          <LoadingState
            title="Loading customer portal"
            description="Fetching shipments, exceptions, and SLA performance for your account…"
          />
        </div>
      ) : error ? (
        <div className={`${cardSurface} overflow-hidden`}>
          <ErrorState description={error} onRetry={() => void refresh()} />
        </div>
      ) : !customer || !dashboard || !scorecard ? (
        <div className={`${cardSurface} p-6`}>
          <p className="text-sm text-zinc-400">
            Customer &ldquo;{selectedCustomer}&rdquo; was not found in your organization data.
          </p>
          <span className={`mt-3 inline-flex ${badgeBase} bg-amber-500/10 text-amber-400 ring-amber-500/20`}>
            Select a different customer from the dropdown
          </span>
        </div>
      ) : (
        <div className="space-y-8">
          <PortalMetricsGrid dashboard={dashboard} />

          <div className="grid gap-8 xl:grid-cols-[1fr_340px]">
            <div className="space-y-8">
              <PortalShipmentsTable shipments={customerShipments} />
              <PortalExceptionsTable exceptions={openExceptions} />
            </div>
            <PortalActivityFeed activity={customerActivity} />
          </div>

          <PortalSlaScorecard scorecard={scorecard} />
          <PortalReportsSection
            customerName={selectedCustomer}
            shipments={customerShipments}
            exceptions={openExceptions}
            scorecard={scorecard}
          />
        </div>
      )}
    </DashboardShell>
  );
}
