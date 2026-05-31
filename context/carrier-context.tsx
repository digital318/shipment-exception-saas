"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useExceptions } from "@/context/exceptions-context";
import { useToast } from "@/context/toast-context";
import { ALL_CARRIER_KEYS, CARRIER_DISPLAY_NAMES, resolveCarrierKey } from "@/lib/carriers";
import { formatRelativeTime } from "@/lib/data/format";
import type { OrganizationSyncResult } from "@/lib/services/carrier-sync";
import type { CarrierIntegration, CarrierKey } from "@/lib/types";

type CarrierContextValue = {
  integrations: CarrierIntegration[];
  syncing: boolean;
  lastOrgSyncAt: string | null;
  lastSyncResult: OrganizationSyncResult | null;
  syncAll: () => Promise<void>;
  syncCarrier: (key: CarrierKey) => Promise<void>;
};

const CarrierContext = createContext<CarrierContextValue | null>(null);

function buildIntegrations(
  shipments: ReturnType<typeof useExceptions>["shipments"],
  syncMeta: Record<
    CarrierKey,
    { lastSyncAt: string | null; syncStatus: CarrierIntegration["syncStatus"] }
  >,
): CarrierIntegration[] {
  return ALL_CARRIER_KEYS.map((key) => {
    const monitored = shipments.filter((s) => {
      const shipmentKey = resolveCarrierKey(s.carrier);
      return shipmentKey === key && s.status !== "Delivered";
    });

    const meta = syncMeta[key];
    return {
      key,
      name: CARRIER_DISPLAY_NAMES[key],
      enabled: true,
      health: meta.syncStatus === "error" ? "degraded" : "healthy",
      lastSyncAt: meta.lastSyncAt,
      shipmentsMonitored: monitored.length,
      syncStatus: meta.syncStatus,
    };
  });
}

export function CarrierProvider({ children }: { children: ReactNode }) {
  const { shipments, syncCarriers } = useExceptions();
  const { toast } = useToast();

  const [syncing, setSyncing] = useState(false);
  const [lastOrgSyncAt, setLastOrgSyncAt] = useState<string | null>(null);
  const [lastSyncResult, setLastSyncResult] = useState<OrganizationSyncResult | null>(null);
  const [syncMeta, setSyncMeta] = useState<
    Record<CarrierKey, { lastSyncAt: string | null; syncStatus: CarrierIntegration["syncStatus"] }>
  >(() =>
    Object.fromEntries(
      ALL_CARRIER_KEYS.map((key) => [key, { lastSyncAt: null, syncStatus: "idle" as const }]),
    ) as Record<CarrierKey, { lastSyncAt: string | null; syncStatus: CarrierIntegration["syncStatus"] }>,
  );

  const integrations = useMemo(
    () => buildIntegrations(shipments, syncMeta),
    [shipments, syncMeta],
  );

  const runSync = useCallback(
    async (carrierFilter?: CarrierKey) => {
      setSyncing(true);
      if (carrierFilter) {
        setSyncMeta((prev) => ({
          ...prev,
          [carrierFilter]: { ...prev[carrierFilter], syncStatus: "syncing" },
        }));
      } else {
        setSyncMeta((prev) => {
          const next = { ...prev };
          for (const key of ALL_CARRIER_KEYS) {
            next[key] = { ...next[key], syncStatus: "syncing" };
          }
          return next;
        });
      }

      try {
        const result = await syncCarriers(carrierFilter);
        setLastSyncResult(result);
        setLastOrgSyncAt(result.syncedAt);

        const affectedKeys = carrierFilter
          ? [carrierFilter]
          : ALL_CARRIER_KEYS.filter((key) =>
              result.results.some((r) => resolveCarrierKey(r.carrier) === key && !r.skipped),
            );

        setSyncMeta((prev) => {
          const next = { ...prev };
          for (const key of affectedKeys) {
            next[key] = { lastSyncAt: result.syncedAt, syncStatus: "success" };
          }
          return next;
        });

        const label = carrierFilter
          ? CARRIER_DISPLAY_NAMES[carrierFilter]
          : "All carriers";
        toast(
          `${label}: synced ${result.synced} shipment${result.synced === 1 ? "" : "s"}${result.exceptionsCreated > 0 ? ` · ${result.exceptionsCreated} exception${result.exceptionsCreated === 1 ? "" : "s"} created` : ""}`,
          result.exceptionsCreated > 0 ? "info" : "success",
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Carrier sync failed.";
        if (carrierFilter) {
          setSyncMeta((prev) => ({
            ...prev,
            [carrierFilter]: { ...prev[carrierFilter], syncStatus: "error" },
          }));
        } else {
          setSyncMeta((prev) => {
            const next = { ...prev };
            for (const key of ALL_CARRIER_KEYS) {
              next[key] = { ...next[key], syncStatus: "error" };
            }
            return next;
          });
        }
        toast(message, "error");
      } finally {
        setSyncing(false);
      }
    },
    [syncCarriers, toast],
  );

  const syncAll = useCallback(() => runSync(), [runSync]);
  const syncCarrier = useCallback((key: CarrierKey) => runSync(key), [runSync]);

  return (
    <CarrierContext.Provider
      value={{
        integrations,
        syncing,
        lastOrgSyncAt,
        lastSyncResult,
        syncAll,
        syncCarrier,
      }}
    >
      {children}
    </CarrierContext.Provider>
  );
}

export function useCarriers() {
  const ctx = useContext(CarrierContext);
  if (!ctx) {
    throw new Error("useCarriers must be used within CarrierProvider");
  }
  return ctx;
}

export function formatCarrierSyncTime(iso: string | null): string {
  if (!iso) return "Never";
  return formatRelativeTime(iso);
}
