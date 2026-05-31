"use client";

import { DashboardShell } from "@/components/dashboard-shell";
import { IconTruck } from "@/components/icons";
import { EmptyState } from "@/components/ui/empty-state";
import { SyncStatus } from "@/components/ui/sync-status";
import { formatCarrierSyncTime, useCarriers } from "@/context/carrier-context";
import { useExceptions } from "@/context/exceptions-context";
import {
  btnDisabled,
  btnPrimary,
  btnSecondary,
  cardHeader,
  cardSurface,
  carrierHealthStyles,
  carrierSyncStatusStyles,
  sectionLabel,
} from "@/lib/styles";

const SYNC_STATUS_LABELS = {
  idle: "Idle",
  syncing: "Syncing",
  success: "Success",
  error: "Error",
} as const;

const HEALTH_LABELS = {
  healthy: "Healthy",
  degraded: "Degraded",
  offline: "Offline",
} as const;

export function CarriersPage() {
  const { loading, source } = useExceptions();
  const {
    integrations,
    syncing,
    lastOrgSyncAt,
    lastSyncResult,
    syncAll,
    syncCarrier,
  } = useCarriers();

  const totalMonitored = integrations.reduce((sum, c) => sum + c.shipmentsMonitored, 0);

  return (
    <DashboardShell
      eyebrow="Integrations"
      title="Carrier Management"
      description="Monitor carrier API connections, sync status, and tracked shipments. Mock providers active until Phase 6B live APIs."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <SyncStatus state={syncing ? "syncing" : source === "mock" ? "live" : "live"} />
          <button
            type="button"
            onClick={() => void syncAll()}
            disabled={syncing || loading}
            className={`${btnPrimary}${syncing || loading ? ` ${btnDisabled}` : ""}`}
          >
            {syncing ? "Syncing…" : "Sync All Carriers"}
          </button>
        </div>
      }
    >
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className={`${cardSurface} p-5`}>
          <p className={sectionLabel}>Configured</p>
          <p className="mt-2 text-2xl font-semibold text-white">{integrations.length}</p>
          <p className="mt-1 text-xs text-zinc-500">Mock providers ready for Phase 6B</p>
        </div>
        <div className={`${cardSurface} p-5`}>
          <p className={sectionLabel}>Shipments Monitored</p>
          <p className="mt-2 text-2xl font-semibold text-white">{totalMonitored}</p>
          <p className="mt-1 text-xs text-zinc-500">Active non-delivered loads</p>
        </div>
        <div className={`${cardSurface} p-5`}>
          <p className={sectionLabel}>Last Sync</p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {formatCarrierSyncTime(lastOrgSyncAt)}
          </p>
          {lastSyncResult && (
            <p className="mt-1 text-xs text-zinc-500">
              {lastSyncResult.synced} synced · {lastSyncResult.exceptionsCreated} exceptions
            </p>
          )}
        </div>
      </div>

      <div className={cardSurface}>
        <div className={cardHeader}>
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">Carrier Integrations</h2>
            <p className="mt-1 text-xs text-zinc-500">
              UPS, FedEx, XPO, Old Dominion, Estes, and Saia — mock responses in Phase 6A
            </p>
          </div>
        </div>

        {integrations.length === 0 ? (
          <EmptyState
            title="No carriers configured"
            description="Carrier integrations will appear here once configured."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  <th className="px-6 py-3.5">Carrier</th>
                  <th className="px-4 py-3.5">Health</th>
                  <th className="px-4 py-3.5">Last Sync</th>
                  <th className="px-4 py-3.5">Monitored</th>
                  <th className="px-4 py-3.5">Sync Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {integrations.map((carrier) => (
                  <tr
                    key={carrier.key}
                    className="transition-colors hover:bg-white/[0.02]"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 ring-1 ring-violet-500/20">
                          <IconTruck className="h-4 w-4 text-violet-400" />
                        </div>
                        <div>
                          <p className="font-medium text-zinc-200">{carrier.name}</p>
                          <p className="text-[11px] text-zinc-500">
                            {carrier.enabled ? "Enabled · Mock API" : "Disabled"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={carrierHealthStyles[carrier.health]}>
                        {HEALTH_LABELS[carrier.health]}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-zinc-400">
                      {formatCarrierSyncTime(carrier.lastSyncAt)}
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-medium text-zinc-200">
                        {carrier.shipmentsMonitored}
                      </span>
                      <span className="text-zinc-500"> shipments</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={carrierSyncStatusStyles[carrier.syncStatus]}>
                        {SYNC_STATUS_LABELS[carrier.syncStatus]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => void syncCarrier(carrier.key)}
                        disabled={syncing || carrier.shipmentsMonitored === 0}
                        className={`${btnSecondary}${syncing || carrier.shipmentsMonitored === 0 ? ` ${btnDisabled}` : ""}`}
                      >
                        Sync
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
