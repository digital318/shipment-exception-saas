"use client";

import { DashboardShell } from "@/components/dashboard-shell";
import { CustomerNotificationBell } from "@/components/customer-notifications/customer-notification-bell";
import { CustomerSelector } from "@/components/portal/customer-selector";
import { PortalCommunicationHistory } from "@/components/portal/portal-communication-history";
import { PortalCustomerTimeline } from "@/components/portal/portal-customer-timeline";
import { PortalExceptionsTable } from "@/components/portal/portal-exceptions-table";
import { PortalMetricsGrid } from "@/components/portal/portal-metrics-grid";
import { PortalReportsSection } from "@/components/portal/portal-reports-section";
import { PortalShipmentsTable } from "@/components/portal/portal-shipments-table";
import { PortalSlaScorecard } from "@/components/portal/portal-sla-scorecard";
import { ErrorState, LoadingState } from "@/components/ui/data-state";
import { SyncStatus } from "@/components/ui/sync-status";
import { useCustomerNotifications } from "@/context/customer-notifications-context";
import { useCustomerPortalData } from "@/hooks/use-customer-portal-data";
import { btnPrimary, badgeBase, cardSurface } from "@/lib/styles";
import { useState } from "react";

export function PortalPage() {
  const {
    selectedCustomer,
    customer,
    customerShipments,
    openExceptions,
    customerActivity,
    customerNotifications,
    customerTimeline,
    dashboard,
    scorecard,
    loading,
    error,
    refresh,
    source,
  } = useCustomerPortalData();
  const { markRead, generateDemoNotification } = useCustomerNotifications();
  const [generating, setGenerating] = useState(false);

  const syncState = loading ? "syncing" : error && source === "mock" ? "error" : "live";

  const handleGenerateDemo = async () => {
    if (!customer) return;
    setGenerating(true);
    try {
      await generateDemoNotification(customer.dbId ?? customer.id, customer.name);
    } finally {
      setGenerating(false);
    }
  };

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
          {customer && <CustomerNotificationBell customerId={customer.dbId ?? customer.id} />}
          <button
            type="button"
            onClick={() => void handleGenerateDemo()}
            disabled={!customer || generating}
            className={btnPrimary}
          >
            {generating ? "Generating…" : "Generate Customer Alert"}
          </button>
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
              <div id="communication-history">
                <PortalCommunicationHistory
                  notifications={customerNotifications}
                  onMarkRead={(id) => void markRead(id)}
                />
              </div>
            </div>
            <PortalCustomerTimeline items={customerTimeline} />
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
