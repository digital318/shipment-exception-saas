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
import { formatUnknownError, logSimulateExceptionError } from "@/lib/supabase/format-error";
import type {
  OrganizationSyncResult,
  SimulateCarrierExceptionResult,
} from "@/lib/services/carrier-sync";
import type { CarrierIntegration, CarrierKey } from "@/lib/types";

type CarrierContextValue = {
  integrations: CarrierIntegration[];
  syncing: boolean;
  lastOrgSyncAt: string | null;
  lastSyncResult: OrganizationSyncResult | null;
  syncAll: () => Promise<void>;
  syncCarrier: (key: CarrierKey) => Promise<void>;
  simulateException: (key: CarrierKey) => Promise<SimulateCarrierExceptionResult | null>;
  simulatingKey: CarrierKey | null;
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
  const { shipments, syncCarriers, simulateCarrierException } = useExceptions();
  const { toast } = useToast();

  const [syncing, setSyncing] = useState(false);
  const [simulatingKey, setSimulatingKey] = useState<CarrierKey | null>(null);
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
      console.info("[CarrierSync] runSync START (Sync button on /carriers)", {
        carrierKey: carrierFilter ?? "all",
        entrypoint: carrierFilter ? "syncCarrier" : "syncAll",
        nextCall: "syncCarriers",
      });

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
        console.info("[CarrierSync] runSync calling syncCarriers", {
          carrierKey: carrierFilter ?? "all",
        });
        const result = await syncCarriers(carrierFilter);
        console.info("[CarrierSync] runSync syncCarriers returned", {
          carrierKey: carrierFilter ?? "all",
          synced: result.synced,
          skipped: result.skipped,
          exceptionsCreated: result.exceptionsCreated,
          resultCount: result.results.length,
        });
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
        console.error("[CarrierSync] runSync FAILED", {
          carrierKey: carrierFilter ?? "all",
          error: message,
          raw: err,
        });
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

  const simulateException = useCallback(
    async (key: CarrierKey): Promise<SimulateCarrierExceptionResult | null> => {
      setSimulatingKey(key);
      try {
        const result = await simulateCarrierException(key);
        toast(
          `${CARRIER_DISPLAY_NAMES[key]}: simulated exception on ${result.shipmentId}${result.exceptionCreated ? "" : " (shipment updated, existing exception kept)"}`,
          result.exceptionCreated ? "info" : "success",
        );
        return result;
      } catch (err) {
        logSimulateExceptionError(`carriers-page carrier=${key}`, err);
        const message = formatUnknownError(err);
        toast(message, "error");
        return null;
      } finally {
        setSimulatingKey(null);
      }
    },
    [simulateCarrierException, toast],
  );

  return (
    <CarrierContext.Provider
      value={{
        integrations,
        syncing,
        lastOrgSyncAt,
        lastSyncResult,
        syncAll,
        syncCarrier,
        simulateException,
        simulatingKey,
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
