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
import { fetchAppData, type AppDataSnapshot } from "@/lib/data";
import {
  addExceptionNoteInSupabase,
  createExceptionInSupabase,
  deleteExceptionInSupabase,
  deleteExceptionNoteInSupabase,
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
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [carriers, setCarriers] = useState<string[]>([]);
  const [exceptions, setExceptions] = useState<ExceptionRecord[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<DataSource>("mock");

  const loadData = useCallback(async (options?: LoadOptions): Promise<AppDataSnapshot> => {
    if (!options?.silent) {
      setLoading(true);
      setError(null);
    }

    try {
      const snapshot = await fetchAppData();
      applySnapshot(snapshot, {
        setShipments,
        setCustomers,
        setCarriers,
        setExceptions,
        setActivity,
        setSource,
        setError,
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
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

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

  const persistToSupabase = source === "supabase" && isSupabaseWriteEnabled();

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

      if (persistToSupabase) {
        await createExceptionInSupabase(input);
        const snapshot = await loadData({ silent: true });
        return (
          snapshot.exceptions.find(
            (e) => e.shipmentId === input.shipmentId && isActiveException(e),
          ) ?? null
        );
      }

      const record: ExceptionRecord = {
        id: generateExceptionId(exceptions),
        shipmentId: input.shipmentId,
        title: input.title.trim(),
        customer: shipment.customer,
        carrier: shipment.carrier,
        route: `${shipment.origin} → ${shipment.destination}`,
        severity: input.severity,
        status: input.status ?? "Open",
        owner: input.owner,
        delayReason: input.delayReason.trim(),
        openedAt: formatOpenedAt(),
        updatedAt: formatNowLabel(),
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
        ...act,
      ]);
      return record;
    },
    [exceptions, shipments, persistToSupabase, loadData],
  );

  const updateException = useCallback(
    async (id: string, patch: UpdateExceptionInput) => {
      if (persistToSupabase) {
        const exc = requireDbId(id);
        await updateExceptionInSupabase(exc.dbId!, patch, {
          shipmentId: exc.shipmentId,
          title: exc.title,
          previousStatus: exc.status,
        });
        await refreshAfterMutation();
        return;
      }

      let resolvedEvent: ActivityItem | null = null;

      setExceptions((prev) => {
        const existing = prev.find((e) => e.id === id);
        if (existing && existing.status !== "Resolved" && patch.status === "Resolved") {
          resolvedEvent = {
            time: formatNowLabel(),
            actor: CURRENT_USER,
            event: `Resolved exception on ${existing.shipmentId} — ${existing.title}`,
            shipmentId: existing.shipmentId,
            type: "resolved",
          };
        }

        return prev.map((e) => {
          if (e.id !== id) return e;
          const next = touch({ ...e, ...patch });
          if (patch.status === "Resolved" && !next.resolvedAt) {
            next.resolvedAt = formatOpenedAt();
          }
          if (patch.status && patch.status !== "Resolved") {
            next.resolvedAt = undefined;
          }
          return next;
        });
      });

      if (patch.status && patch.status !== "Resolved") {
        const existing = getById(id);
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

      if (resolvedEvent) {
        setActivity((act) => [resolvedEvent!, ...act]);
      }
    },
    [persistToSupabase, requireDbId, refreshAfterMutation, getById],
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

      if (persistToSupabase) {
        const exc = requireDbId(id);
        await addExceptionNoteInSupabase(exc.dbId!, trimmed, author);
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
    [persistToSupabase, requireDbId, refreshAfterMutation],
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
      if (persistToSupabase) {
        const exc = requireDbId(id);
        await resolveExceptionInSupabase(exc.dbId!, {
          shipmentId: exc.shipmentId,
          title: exc.title,
          previousStatus: exc.status,
        });
        await refreshAfterMutation();
        return;
      }

      await updateException(id, { status: "Resolved" });
    },
    [persistToSupabase, requireDbId, refreshAfterMutation, updateException],
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
