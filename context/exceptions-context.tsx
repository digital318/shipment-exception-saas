"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { CURRENT_USER } from "@/lib/constants";
import { useOrganization } from "@/context/organization-context";
import { useToast } from "@/context/toast-context";
import { fetchAppData, type AppDataSnapshot } from "@/lib/data";
import {
  applyInMemoryDetections,
  runExceptionDetection,
  runInMemoryExceptionDetection,
} from "@/lib/data/exception-detection";
import {
  addExceptionNoteInSupabase,
  completeFollowUpInSupabase,
  createExceptionInSupabase,
  deleteExceptionInSupabase,
  deleteExceptionNoteInSupabase,
  escalatePlaybookInSupabase,
  isSupabaseWriteEnabled,
  resolveExceptionInSupabase,
  updateExceptionInSupabase,
  updateExceptionNoteInSupabase,
} from "@/lib/data/mutations";
import type { DataSource } from "@/lib/data/types";
import {
  formatNowLabel,
  formatOpenedAt,
  generateExceptionId,
  generateNoteId,
  isActiveException,
} from "@/lib/exception-utils";
import { toAutoDetectedAlert, type AutoDetectedAlert } from "@/lib/exception-engine";
import { notificationTypeForSeverity } from "@/lib/data/notification-rules";
import {
  applySimulatedExceptionToShipment,
  applySyncResultToShipment,
  buildMockExceptionFromSync,
  buildMockSimulatedException,
  simulateCarrierException,
  syncOrganizationShipments,
  type OrganizationSyncResult,
  type SimulateCarrierExceptionResult,
} from "@/lib/services/carrier-sync";
import { resolveCarrierKey } from "@/lib/carriers";
import { formatUnknownError, logSimulateExceptionError } from "@/lib/supabase/format-error";
import {
  assignPlaybook,
  computeNextFollowUp,
  formatEscalationLevel,
  getRecommendedAction,
  nextEscalationLevel,
} from "@/lib/playbooks";
import type { CarrierKey } from "@/lib/types";
import type {
  ActivityItem,
  CreateExceptionInput,
  Customer,
  ExceptionRecord,
  InternalNote,
  Shipment,
  UpdateExceptionInput,
} from "@/lib/types";

type LoadOptions = {
  silent?: boolean;
};

type ExceptionsContextValue = {
  shipments: Shipment[];
  customers: Customer[];
  carriers: string[];
  exceptions: ExceptionRecord[];
  activity: ActivityItem[];
  loading: boolean;
  error: string | null;
  source: DataSource;
  openCount: number;
  autoDetectedAlerts: AutoDetectedAlert[];
  refresh: () => Promise<void>;
  getById: (id: string) => ExceptionRecord | undefined;
  getByShipmentId: (shipmentId: string) => ExceptionRecord | undefined;
  createException: (input: CreateExceptionInput) => Promise<ExceptionRecord | null>;
  updateException: (id: string, patch: UpdateExceptionInput) => Promise<void>;
  assignOwner: (id: string, owner: string) => Promise<void>;
  updateStatus: (id: string, status: ExceptionRecord["status"]) => Promise<void>;
  addNote: (id: string, body: string, author?: string) => Promise<void>;
  updateNote: (exceptionId: string, noteId: string, body: string) => Promise<void>;
  deleteNote: (exceptionId: string, noteId: string) => Promise<void>;
  resolveException: (id: string) => Promise<void>;
  deleteException: (id: string) => Promise<void>;
  completeFollowUp: (id: string) => Promise<void>;
  escalatePlaybook: (id: string) => Promise<void>;
  syncCarriers: (carrierFilter?: CarrierKey) => Promise<OrganizationSyncResult>;
  simulateCarrierException: (carrierKey: CarrierKey) => Promise<SimulateCarrierExceptionResult>;
  logReportActivity: (
    message: string,
    type: "report_generated" | "report_exported",
  ) => void;
  logSaasActivity: (message: string, type: ActivityItem["type"]) => void;
};

const ExceptionsContext = createContext<ExceptionsContextValue | null>(null);

function applySnapshot(
  snapshot: AppDataSnapshot,
  setters: {
    setShipments: (v: Shipment[]) => void;
    setCustomers: (v: Customer[]) => void;
    setCarriers: (v: string[]) => void;
    setExceptions: (v: ExceptionRecord[]) => void;
    setActivity: (v: ActivityItem[]) => void;
    setSource: (v: DataSource) => void;
    setError: (v: string | null) => void;
  },
) {
  setters.setShipments(snapshot.shipments);
  setters.setCustomers(snapshot.customers);
  setters.setCarriers(snapshot.carriers);
  setters.setExceptions(snapshot.exceptions);
  setters.setActivity(snapshot.activity);
  setters.setSource(snapshot.source);
  if (snapshot.error && snapshot.source === "mock") {
    setters.setError(snapshot.error);
  } else {
    setters.setError(null);
  }
}

export function ExceptionsProvider({ children }: { children: ReactNode }) {
  const { organization, profile, loading: orgLoading, needsOnboarding } = useOrganization();
  const { toast } = useToast();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [carriers, setCarriers] = useState<string[]>([]);
  const [exceptions, setExceptions] = useState<ExceptionRecord[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [autoDetectedAlerts, setAutoDetectedAlerts] = useState<AutoDetectedAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<DataSource>("mock");

  const organizationId = organization?.id ?? profile?.organizationId ?? undefined;

  const notifyDetections = useCallback(
    (detections: ReturnType<typeof toAutoDetectedAlert>[]) => {
      if (detections.length === 0) return;

      setAutoDetectedAlerts((prev) => {
        const existing = new Set(prev.map((a) => a.shipmentId));
        const fresh = detections.filter((d) => !existing.has(d.shipmentId));
        return [...fresh, ...prev];
      });

      for (const alert of detections) {
        toast(
          `Auto-detected ${alert.severity} exception for ${alert.shipmentId}`,
          "info",
        );
      }
    },
    [toast],
  );

  const appendNotificationActivity = useCallback(
    (shipmentId: string, message: string) => {
      setActivity((act) => [
        {
          time: formatNowLabel(),
          actor: "System",
          event: `Notification: ${message}`,
          shipmentId,
          type: "alert",
        },
        ...act,
      ]);
    },
    [],
  );

  const logReportActivity = useCallback(
    (message: string, type: "report_generated" | "report_exported") => {
      setActivity((act) => [
        {
          time: formatNowLabel(),
          actor: CURRENT_USER,
          event: message,
          shipmentId: null,
          type,
        },
        ...act,
      ]);
    },
    [],
  );

  const logSaasActivity = useCallback((message: string, type: ActivityItem["type"]) => {
    setActivity((act) => [
      {
        time: formatNowLabel(),
        actor: CURRENT_USER,
        event: message,
        shipmentId: null,
        type,
      },
      ...act,
    ]);
  }, []);

  const loadData = useCallback(async (options?: LoadOptions): Promise<AppDataSnapshot> => {
    if (!options?.silent) {
      setLoading(true);
      setError(null);
    }

    try {
      const usingSupabase =
        isSupabaseWriteEnabled() && !!organizationId && !needsOnboarding;

      if (usingSupabase && organizationId) {
        const { created } = await runExceptionDetection(organizationId);
        notifyDetections(created.map((d) => toAutoDetectedAlert(d)));
      }

      let snapshot = await fetchAppData(organizationId);

      if (!usingSupabase) {
        const detections = runInMemoryExceptionDetection(
          snapshot.shipments,
          snapshot.exceptions,
        );
        if (detections.length > 0) {
          snapshot = applyInMemoryDetections(snapshot, detections);
          notifyDetections(detections.map((d) => toAutoDetectedAlert(d)));
        }
      }

      applySnapshot(snapshot, {
        setShipments,
        setCustomers,
        setCarriers,
        setExceptions,
        setActivity,
        setSource,
        setError,
      });
      console.info("[FreightPulse] ExceptionsProvider loaded", {
        organization_id: organizationId ?? null,
        customerCount: snapshot.customers.length,
        shipmentCount: snapshot.shipments.length,
        source: snapshot.source,
      });
      return snapshot;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load FreightPulse data.";
      setError(message);
      throw err;
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  }, [needsOnboarding, notifyDetections, organizationId]);

  useEffect(() => {
    if (orgLoading) return;
    if (needsOnboarding) return;
    if (isSupabaseWriteEnabled() && !organizationId) return;
    void loadData();
  }, [loadData, orgLoading, needsOnboarding, organizationId]);

  const openCount = useMemo(
    () => exceptions.filter((e) => e.status !== "Resolved").length,
    [exceptions],
  );

  const getById = useCallback(
    (id: string) => exceptions.find((e) => e.id === id),
    [exceptions],
  );

  const getByShipmentId = useCallback(
    (shipmentId: string) =>
      exceptions.find((e) => e.shipmentId === shipmentId && isActiveException(e)),
    [exceptions],
  );

  const persistToSupabase = isSupabaseWriteEnabled() && !!organizationId;

  const requireDbId = useCallback(
    (id: string): ExceptionRecord => {
      const exc = getById(id);
      if (!exc) {
        throw new Error(`Exception ${id} not found.`);
      }
      if (persistToSupabase && !exc.dbId) {
        throw new Error(`Exception ${id} is missing a database id.`);
      }
      return exc;
    },
    [getById, persistToSupabase],
  );

  const touch = (exc: ExceptionRecord): ExceptionRecord => ({
    ...exc,
    updatedAt: formatNowLabel(),
  });

  const refreshAfterMutation = useCallback(async () => {
    if (persistToSupabase) {
      await loadData({ silent: true });
    }
  }, [loadData, persistToSupabase]);

  const createException = useCallback(
    async (input: CreateExceptionInput): Promise<ExceptionRecord | null> => {
      const shipment = shipments.find((s) => s.id === input.shipmentId);
      if (!shipment) return null;

      const duplicate = exceptions.some(
        (e) => e.shipmentId === input.shipmentId && isActiveException(e),
      );
      if (duplicate) return null;

      if (persistToSupabase && organizationId) {
        await createExceptionInSupabase(input, organizationId);
        const snapshot = await loadData({ silent: true });
        return (
          snapshot.exceptions.find(
            (e) => e.shipmentId === input.shipmentId && isActiveException(e),
          ) ?? null
        );
      }

      const playbook = assignPlaybook({
        title: input.title.trim(),
        delayReason: input.delayReason.trim(),
        severity: input.severity,
        source: "Manual",
      });

      const record: ExceptionRecord = {
        id: generateExceptionId(exceptions),
        shipmentId: input.shipmentId,
        title: input.title.trim(),
        customer: shipment.customer,
        carrier: shipment.carrier,
        route: `${shipment.origin} → ${shipment.destination}`,
        severity: input.severity,
        status: input.status ?? "Open",
        owner: playbook.owner,
        delayReason: input.delayReason.trim(),
        openedAt: formatOpenedAt(),
        updatedAt: formatNowLabel(),
        source: "Manual",
        playbookType: playbook.playbookType,
        escalationLevel: playbook.escalationLevel,
        recommendedAction: playbook.recommendedAction,
        nextFollowUpAt: playbook.nextFollowUpAt,
        internalNotes: [],
      };

      setExceptions((prev) => [record, ...prev]);
      setActivity((act) => [
        {
          time: formatNowLabel(),
          actor: CURRENT_USER,
          event: `Opened investigation on ${input.shipmentId} — ${input.title.trim()}`,
          shipmentId: input.shipmentId,
          type: "action",
        },
        {
          time: formatNowLabel(),
          actor: "System",
          event: `Playbook assigned — ${playbook.playbookType} (${formatEscalationLevel(playbook.escalationLevel)}) · Owner: ${playbook.owner}`,
          shipmentId: input.shipmentId,
          type: "action",
        },
        ...act,
      ]);
      if (notificationTypeForSeverity(input.severity)) {
        appendNotificationActivity(
          input.shipmentId,
          `${input.severity} exception — ${input.shipmentId}`,
        );
      }
      return record;
    },
    [exceptions, shipments, persistToSupabase, organizationId, loadData, appendNotificationActivity],
  );

  const updateException = useCallback(
    async (id: string, patch: UpdateExceptionInput) => {
      if (persistToSupabase && organizationId) {
        const exc = requireDbId(id);
        await updateExceptionInSupabase(exc.dbId!, patch, {
          shipmentId: exc.shipmentId,
          title: exc.title,
          previousStatus: exc.status,
        }, organizationId);
        await refreshAfterMutation();
        return;
      }

      const existing = getById(id);
      const resolved: ActivityItem | null =
        existing && existing.status !== "Resolved" && patch.status === "Resolved"
          ? {
              time: formatNowLabel(),
              actor: CURRENT_USER,
              event: `Resolved exception on ${existing.shipmentId} — ${existing.title}`,
              shipmentId: existing.shipmentId,
              type: "resolved",
            }
          : null;

      setExceptions((prev) =>
        prev.map((e) => {
          if (e.id !== id) return e;
          const next = touch({ ...e, ...patch });
          if (patch.status === "Resolved" && !next.resolvedAt) {
            next.resolvedAt = formatOpenedAt();
          }
          if (patch.status && patch.status !== "Resolved") {
            next.resolvedAt = undefined;
          }
          return next;
        }),
      );

      if (patch.status && patch.status !== "Resolved") {
        if (existing && existing.status !== patch.status) {
          setActivity((act) => [
            {
              time: formatNowLabel(),
              actor: CURRENT_USER,
              event: `Status changed to ${patch.status} on ${existing.shipmentId} — ${existing.title}`,
              shipmentId: existing.shipmentId,
              type: "update",
            },
            ...act,
          ]);
        }
      }

      if (resolved) {
        setActivity((act) => [resolved, ...act]);
        if (resolved.shipmentId) {
          appendNotificationActivity(
            resolved.shipmentId,
            `Exception resolved — ${resolved.shipmentId}`,
          );
        }
      }
    },
    [persistToSupabase, organizationId, requireDbId, refreshAfterMutation, getById, appendNotificationActivity],
  );

  const assignOwner = useCallback(
    (id: string, owner: string) => updateException(id, { owner }),
    [updateException],
  );

  const updateStatus = useCallback(
    (id: string, status: ExceptionRecord["status"]) =>
      updateException(id, { status }),
    [updateException],
  );

  const addNote = useCallback(
    async (id: string, body: string, author = CURRENT_USER) => {
      const trimmed = body.trim();
      if (!trimmed) return;

      if (persistToSupabase && organizationId) {
        const exc = requireDbId(id);
        await addExceptionNoteInSupabase(exc.dbId!, trimmed, author, organizationId);
        await refreshAfterMutation();
        return;
      }

      const note: InternalNote = {
        id: generateNoteId(),
        author,
        body: trimmed,
        createdAt: formatNowLabel(),
      };

      setExceptions((prev) =>
        prev.map((e) =>
          e.id === id
            ? touch({ ...e, internalNotes: [note, ...e.internalNotes] })
            : e,
        ),
      );
    },
    [persistToSupabase, organizationId, requireDbId, refreshAfterMutation],
  );

  const updateNote = useCallback(
    async (exceptionId: string, noteId: string, body: string) => {
      const trimmed = body.trim();
      if (!trimmed) {
        throw new Error("Note must be at least 3 characters.");
      }

      if (persistToSupabase) {
        requireDbId(exceptionId);
        await updateExceptionNoteInSupabase(noteId, trimmed);
        await refreshAfterMutation();
        return;
      }

      setExceptions((prev) =>
        prev.map((e) => {
          if (e.id !== exceptionId) return e;
          return touch({
            ...e,
            internalNotes: e.internalNotes.map((n) =>
              n.id === noteId ? { ...n, body: trimmed } : n,
            ),
          });
        }),
      );
    },
    [persistToSupabase, requireDbId, refreshAfterMutation],
  );

  const deleteNote = useCallback(
    async (exceptionId: string, noteId: string) => {
      if (persistToSupabase) {
        requireDbId(exceptionId);
        await deleteExceptionNoteInSupabase(noteId);
        await refreshAfterMutation();
        return;
      }

      setExceptions((prev) =>
        prev.map((e) => {
          if (e.id !== exceptionId) return e;
          return touch({
            ...e,
            internalNotes: e.internalNotes.filter((n) => n.id !== noteId),
          });
        }),
      );
    },
    [persistToSupabase, requireDbId, refreshAfterMutation],
  );

  const resolveException = useCallback(
    async (id: string) => {
      if (persistToSupabase && organizationId) {
        const exc = requireDbId(id);
        await resolveExceptionInSupabase(exc.dbId!, {
          shipmentId: exc.shipmentId,
          title: exc.title,
          previousStatus: exc.status,
        }, organizationId);
        await refreshAfterMutation();
        return;
      }

      await updateException(id, { status: "Resolved" });
    },
    [persistToSupabase, organizationId, requireDbId, refreshAfterMutation, updateException],
  );

  const deleteException = useCallback(
    async (id: string) => {
      if (persistToSupabase) {
        const exc = requireDbId(id);
        await deleteExceptionInSupabase(exc.dbId!);
        await refreshAfterMutation();
        return;
      }

      setExceptions((prev) => prev.filter((e) => e.id !== id));
    },
    [persistToSupabase, requireDbId, refreshAfterMutation],
  );

  const completeFollowUp = useCallback(
    async (id: string) => {
      if (persistToSupabase && organizationId) {
        const exc = requireDbId(id);
        await completeFollowUpInSupabase(
          exc.dbId!,
          {
            shipmentId: exc.shipmentId,
            title: exc.title,
            severity: exc.severity,
          },
          organizationId,
        );
        await refreshAfterMutation();
        return;
      }

      const exc = getById(id);
      if (!exc) return;

      const nextFollowUpAt = computeNextFollowUp(exc.severity);
      setExceptions((prev) =>
        prev.map((e) =>
          e.id === id ? touch({ ...e, nextFollowUpAt }) : e,
        ),
      );
      setActivity((act) => [
        {
          time: formatNowLabel(),
          actor: CURRENT_USER,
          event: `${CURRENT_USER} completed follow-up on ${exc.shipmentId} — next check scheduled`,
          shipmentId: exc.shipmentId,
          type: "update",
        },
        ...act,
      ]);
    },
    [persistToSupabase, organizationId, requireDbId, refreshAfterMutation, getById],
  );

  const escalatePlaybook = useCallback(
    async (id: string) => {
      if (persistToSupabase && organizationId) {
        const exc = requireDbId(id);
        await escalatePlaybookInSupabase(
          exc.dbId!,
          {
            shipmentId: exc.shipmentId,
            title: exc.title,
            severity: exc.severity,
            playbookType: exc.playbookType,
            escalationLevel: exc.escalationLevel,
          },
          organizationId,
        );
        await refreshAfterMutation();
        return;
      }

      const exc = getById(id);
      if (!exc || !exc.playbookType || !exc.escalationLevel) {
        throw new Error("Exception has no playbook assigned.");
      }

      const nextLevel = nextEscalationLevel(exc.escalationLevel);
      if (!nextLevel) {
        throw new Error("Exception is already at maximum escalation level.");
      }

      const recommendedAction = getRecommendedAction(exc.playbookType, nextLevel);
      const nextFollowUpAt = computeNextFollowUp(exc.severity);

      setExceptions((prev) =>
        prev.map((e) =>
          e.id === id
            ? touch({
                ...e,
                escalationLevel: nextLevel,
                recommendedAction,
                nextFollowUpAt,
                status: "Escalated",
              })
            : e,
        ),
      );
      setActivity((act) => [
        {
          time: formatNowLabel(),
          actor: CURRENT_USER,
          event: `${CURRENT_USER} escalated exception on ${exc.shipmentId} to ${formatEscalationLevel(nextLevel)}`,
          shipmentId: exc.shipmentId,
          type: "escalation",
        },
        ...act,
      ]);
    },
    [persistToSupabase, organizationId, requireDbId, refreshAfterMutation, getById],
  );

  const syncCarriers = useCallback(
    async (carrierFilter?: CarrierKey): Promise<OrganizationSyncResult> => {
      const shipmentsForCarrier = carrierFilter
        ? shipments.filter((s) => {
            if (s.status === "Delivered") return false;
            return resolveCarrierKey(s.carrier) === carrierFilter;
          })
        : shipments.filter((s) => s.status !== "Delivered" && resolveCarrierKey(s.carrier));

      console.info("[CarrierSync] syncCarriers START", {
        carrierKey: carrierFilter ?? "all",
        organizationId: organizationId ?? null,
        persistToSupabase,
        dataSource: source,
        totalShipments: shipments.length,
        shipmentsForCarrier: shipmentsForCarrier.map((s) => ({
          id: s.id,
          carrier: s.carrier,
          resolvedKey: resolveCarrierKey(s.carrier),
          status: s.status,
        })),
      });

      console.info("[CarrierSync] syncCarriers calling syncOrganizationShipments", {
        carrierKey: carrierFilter ?? "all",
        organizationId: persistToSupabase ? organizationId : null,
      });

      const result = await syncOrganizationShipments(
        shipments,
        persistToSupabase ? organizationId : undefined,
        exceptions,
        carrierFilter,
      );

      console.info("[CarrierSync] syncCarriers syncOrganizationShipments returned", {
        carrierKey: carrierFilter ?? "all",
        synced: result.synced,
        skipped: result.skipped,
        exceptionsCreated: result.exceptionsCreated,
        results: result.results.map((r) => ({
          shipmentNumber: r.shipmentNumber,
          skipped: r.skipped,
          skipReason: r.skipReason,
          carrierStatus: r.carrierStatus,
          exceptionCreated: r.exceptionCreated,
        })),
      });

      if (persistToSupabase) {
        console.info("[CarrierSync] syncCarriers reloading data from Supabase");
        await loadData({ silent: true });
        return result;
      }

      setShipments((prev) =>
        prev.map((shipment) => {
          const syncResult = result.results.find((r) => r.shipmentNumber === shipment.id);
          return syncResult ? applySyncResultToShipment(shipment, syncResult) : shipment;
        }),
      );

      const newExceptions: ExceptionRecord[] = [];
      const newActivity: ActivityItem[] = [];

      for (const syncResult of result.results) {
        if (!syncResult.exceptionCreated || !syncResult.exceptionTitle) continue;
        const shipment = shipments.find((s) => s.id === syncResult.shipmentNumber);
        if (!shipment) continue;

        const record = buildMockExceptionFromSync(syncResult, shipment, [
          ...exceptions,
          ...newExceptions,
        ]);
        if (!record) continue;

        newExceptions.push(record);
        newActivity.push(
          {
            time: formatNowLabel(),
            actor: "Carrier API",
            event: `Carrier exception detected on ${shipment.id} — ${record.title}`,
            shipmentId: shipment.id,
            type: "alert",
          },
          {
            time: formatNowLabel(),
            actor: "System",
            event: `Playbook assigned — ${record.playbookType} (Level 1: Operations Review) · Owner: ${record.owner}`,
            shipmentId: shipment.id,
            type: "action",
          },
          {
            time: formatNowLabel(),
            actor: "System",
            event: "Notification: Carrier Exception Detected",
            shipmentId: shipment.id,
            type: "alert",
          },
        );
      }

      if (newExceptions.length > 0) {
        setExceptions((prev) => [...newExceptions, ...prev]);
      }
      if (newActivity.length > 0) {
        setActivity((prev) => [...newActivity, ...prev]);
      }

      return result;
    },
    [shipments, exceptions, persistToSupabase, organizationId, loadData],
  );

  const simulateCarrierExceptionAction = useCallback(
    async (carrierKey: CarrierKey): Promise<SimulateCarrierExceptionResult> => {
      try {
        const result = await simulateCarrierException(
          shipments,
          exceptions,
          carrierKey,
          persistToSupabase ? organizationId : undefined,
        );

        if (result.skippedReason) {
          throw new Error(result.skippedReason);
        }

        if (persistToSupabase) {
          await loadData({ silent: true });
          return result;
        }

        const shipment = shipments.find((s) => s.id === result.shipmentId);
        if (!shipment) return result;

        const lastCarrierUpdate = new Date().toISOString();
        setShipments((prev) =>
          prev.map((s) =>
            s.id === result.shipmentId
              ? applySimulatedExceptionToShipment(s, lastCarrierUpdate)
              : s,
          ),
        );

        if (result.exceptionCreated) {
          const record = buildMockSimulatedException(shipment, exceptions);
          if (record) {
            setExceptions((prev) => [record, ...prev]);
            setActivity((act) => [
              {
                time: formatNowLabel(),
                actor: "System",
                event: `Carrier exception detected on ${shipment.id} — ${record.title}`,
                shipmentId: shipment.id,
                type: "alert",
              },
              {
                time: formatNowLabel(),
                actor: "System",
                event: "Notification: Carrier Exception Detected",
                shipmentId: shipment.id,
                type: "alert",
              },
              ...act,
            ]);
          }
        }

        return result;
      } catch (error) {
        logSimulateExceptionError("exceptions-context.simulateCarrierException", error);
        throw error instanceof Error ? error : new Error(formatUnknownError(error));
      }
    },
    [shipments, exceptions, persistToSupabase, organizationId, loadData],
  );

  const value = useMemo(
    () => ({
      shipments,
      customers,
      carriers,
      exceptions,
      activity,
      loading,
      error,
      source,
      openCount,
      autoDetectedAlerts,
      refresh: async () => {
        await loadData();
      },
      getById,
      getByShipmentId,
      createException,
      updateException,
      assignOwner,
      updateStatus,
      addNote,
      updateNote,
      deleteNote,
      resolveException,
      deleteException,
      completeFollowUp,
      escalatePlaybook,
      syncCarriers,
      simulateCarrierException: simulateCarrierExceptionAction,
      logReportActivity,
      logSaasActivity,
    }),
    [
      shipments,
      customers,
      carriers,
      exceptions,
      activity,
      loading,
      error,
      source,
      openCount,
      autoDetectedAlerts,
      loadData,
      getById,
      getByShipmentId,
      createException,
      updateException,
      assignOwner,
      updateStatus,
      addNote,
      updateNote,
      deleteNote,
      resolveException,
      deleteException,
      completeFollowUp,
      escalatePlaybook,
      syncCarriers,
      simulateCarrierExceptionAction,
      logReportActivity,
      logSaasActivity,
    ],
  );

  return (
    <ExceptionsContext.Provider value={value}>
      {children}
    </ExceptionsContext.Provider>
  );
}

export function useExceptions() {
  const ctx = useContext(ExceptionsContext);
  if (!ctx) throw new Error("useExceptions must be used within ExceptionsProvider");
  return ctx;
}

export function useShipments() {
  const ctx = useExceptions();
  return {
    shipments: ctx.shipments,
    carriers: ctx.carriers,
    loading: ctx.loading,
    error: ctx.error,
    source: ctx.source,
    refresh: ctx.refresh,
  };
}

export function useCustomers() {
  const ctx = useExceptions();
  return {
    customers: ctx.customers,
    loading: ctx.loading,
    error: ctx.error,
    source: ctx.source,
    refresh: ctx.refresh,
  };
}
