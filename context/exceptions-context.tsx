"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { CURRENT_USER } from "@/lib/constants";
import {
  formatNowLabel,
  formatOpenedAt,
  generateExceptionId,
  generateNoteId,
} from "@/lib/exception-utils";
import { initialExceptionRecords, recentActivity, shipmentRows } from "@/lib/mock-data";
import type {
  ActivityItem,
  CreateExceptionInput,
  ExceptionRecord,
  InternalNote,
  UpdateExceptionInput,
} from "@/lib/types";

type ExceptionsContextValue = {
  exceptions: ExceptionRecord[];
  activity: ActivityItem[];
  openCount: number;
  getById: (id: string) => ExceptionRecord | undefined;
  getByShipmentId: (shipmentId: string) => ExceptionRecord | undefined;
  createException: (input: CreateExceptionInput) => ExceptionRecord | null;
  updateException: (id: string, patch: UpdateExceptionInput) => void;
  assignOwner: (id: string, owner: string) => void;
  updateStatus: (id: string, status: ExceptionRecord["status"]) => void;
  addNote: (id: string, body: string, author?: string) => void;
  resolveException: (id: string) => void;
};

const ExceptionsContext = createContext<ExceptionsContextValue | null>(null);

export function ExceptionsProvider({ children }: { children: ReactNode }) {
  const [exceptions, setExceptions] = useState<ExceptionRecord[]>(
    initialExceptionRecords,
  );
  const [activity, setActivity] = useState<ActivityItem[]>(recentActivity);

  const openCount = useMemo(
    () => exceptions.filter((e) => e.status !== "Resolved").length,
    [exceptions],
  );

  const getById = useCallback(
    (id: string) => exceptions.find((e) => e.id === id),
    [exceptions],
  );

  const getByShipmentId = useCallback(
    (shipmentId: string) => exceptions.find((e) => e.shipmentId === shipmentId),
    [exceptions],
  );

  const touch = (exc: ExceptionRecord): ExceptionRecord => ({
    ...exc,
    updatedAt: formatNowLabel(),
  });

  const createException = useCallback(
    (input: CreateExceptionInput): ExceptionRecord | null => {
      const shipment = shipmentRows.find((s) => s.id === input.shipmentId);
      if (!shipment) return null;

      const duplicate = exceptions.some((e) => e.shipmentId === input.shipmentId);
      if (duplicate) return null;

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
      return record;
    },
    [exceptions],
  );

  const updateException = useCallback((id: string, patch: UpdateExceptionInput) => {
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

    if (resolvedEvent) {
      setActivity((act) => [resolvedEvent!, ...act]);
    }
  }, []);

  const assignOwner = useCallback(
    (id: string, owner: string) => updateException(id, { owner }),
    [updateException],
  );

  const updateStatus = useCallback(
    (id: string, status: ExceptionRecord["status"]) =>
      updateException(id, { status }),
    [updateException],
  );

  const addNote = useCallback((id: string, body: string, author = CURRENT_USER) => {
    const trimmed = body.trim();
    if (!trimmed) return;

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
  }, []);

  const resolveException = useCallback(
    (id: string) => updateException(id, { status: "Resolved" }),
    [updateException],
  );

  const value = useMemo(
    () => ({
      exceptions,
      activity,
      openCount,
      getById,
      getByShipmentId,
      createException,
      updateException,
      assignOwner,
      updateStatus,
      addNote,
      resolveException,
    }),
    [
      exceptions,
      activity,
      openCount,
      getById,
      getByShipmentId,
      createException,
      updateException,
      assignOwner,
      updateStatus,
      addNote,
      resolveException,
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
