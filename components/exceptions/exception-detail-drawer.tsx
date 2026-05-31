"use client";

import { useEffect, useState } from "react";
import { CreateExceptionModal } from "@/components/exceptions/create-exception-modal";
import { PlaybookPanel } from "@/components/exceptions/playbook-panel";
import { IconX } from "@/components/icons";
import { useExceptions } from "@/context/exceptions-context";
import { useToast } from "@/context/toast-context";
import { EXCEPTION_OWNERS, ISSUE_STATUSES } from "@/lib/constants";
import {
  enrichShipmentWithException,
  getExceptionSeverityDisplay,
} from "@/lib/exception-utils";
import {
  btnPrimary,
  btnSecondary,
  inputBase,
  issueStatusStyles,
  sectionLabel,
  selectBase,
  statusBadgeStyles,
} from "@/lib/styles";
import type { ExceptionRecord, Shipment } from "@/lib/types";

export function ExceptionDetailDrawer({
  exceptionId,
  shipmentId,
  onClose,
  onExceptionCreated,
}: {
  exceptionId: string | null;
  shipmentId?: string | null;
  onClose: () => void;
  onExceptionCreated?: (id: string) => void;
}) {
  const {
    shipments,
    getById,
    getByShipmentId,
    updateStatus,
    assignOwner,
    addNote,
    resolveException,
    completeFollowUp,
    escalatePlaybook,
  } = useExceptions();
  const { toast } = useToast();
  const [noteDraft, setNoteDraft] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const exc = exceptionId ? getById(exceptionId) : shipmentId ? getByShipmentId(shipmentId) : null;
  const ship =
    shipments.find((s) => s.id === (exc?.shipmentId ?? shipmentId)) ?? null;
  const displayShip = ship && exc ? enrichShipmentWithException(ship, exc) : ship;

  const isOpen = Boolean(exceptionId || shipmentId);
  const isResolved = exc?.status === "Resolved";

  useEffect(() => {
    if (!isOpen) return;
    setNoteDraft("");
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  async function handleAddNote() {
    if (!exc) return;
    if (noteDraft.trim().length < 3) {
      toast("Note must be at least 3 characters.", "error");
      return;
    }
    try {
      await addNote(exc.id, noteDraft);
      setNoteDraft("");
      toast("Internal note added.", "success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to add note.";
      toast(message, "error");
    }
  }

  async function handleResolve() {
    if (!exc) return;
    try {
      await resolveException(exc.id);
      toast(`${exc.id} marked as resolved.`, "success");
      onClose();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to resolve exception.";
      toast(message, "error");
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex justify-end">
        <button
          type="button"
          aria-label="Close drawer"
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
        <aside
          role="dialog"
          aria-modal="true"
          aria-labelledby="exception-drawer-title"
          className="relative flex h-full w-full max-w-md flex-col border-l border-white/[0.08] bg-zinc-950 shadow-2xl"
        >
          <header className="border-b border-white/[0.06] px-5 py-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className={sectionLabel}>
                  {exc ? "Exception detail" : "Shipment detail"}
                </p>
                <h2
                  id="exception-drawer-title"
                  className="mt-2 text-lg font-semibold leading-snug text-white"
                >
                  {exc?.title ?? displayShip?.id}
                </h2>
                <p className="mt-1 font-mono text-xs text-zinc-500">
                  {exc?.id ?? displayShip?.id}
                </p>
              </div>
              <button type="button" onClick={onClose} className={`${btnSecondary} !p-2`}>
                <IconX className="h-4 w-4" />
              </button>
            </div>
            {exc && (
              <div className="mt-4 flex flex-wrap gap-2">
                {(() => {
                  const severity = getExceptionSeverityDisplay(exc);
                  return (
                    <span className={severity.className}>{severity.label}</span>
                  );
                })()}
                <span
                  className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ring-white/10 ${issueStatusStyles[exc.status]}`}
                >
                  {exc.status}
                </span>
              </div>
            )}
          </header>

          <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
            {!exc && displayShip ? (
              <ShipmentOnlyView
                shipment={displayShip}
                onCreate={() => setCreateOpen(true)}
              />
            ) : exc ? (
              <ExceptionEditView
                exc={exc}
                noteDraft={noteDraft}
                onNoteChange={setNoteDraft}
                onAddNote={handleAddNote}
                onCompleteFollowUp={() => completeFollowUp(exc.id)}
                onEscalate={() => escalatePlaybook(exc.id)}
                onStatusChange={async (status) => {
                  try {
                    await updateStatus(exc.id, status);
                    toast(`Status updated to ${status}.`, "success");
                  } catch (err) {
                    const message =
                      err instanceof Error ? err.message : "Failed to update status.";
                    toast(message, "error");
                  }
                }}
                onOwnerChange={async (owner) => {
                  try {
                    await assignOwner(exc.id, owner);
                    toast(`Owner assigned to ${owner}.`, "success");
                  } catch (err) {
                    const message =
                      err instanceof Error ? err.message : "Failed to assign owner.";
                    toast(message, "error");
                  }
                }}
                isResolved={isResolved}
              />
            ) : null}
          </div>

          {exc && !isResolved && (
            <footer className="flex flex-col gap-2 border-t border-white/[0.06] p-5">
              <button
                type="button"
                onClick={handleResolve}
                className={`w-full ${btnPrimary} !from-emerald-600 !to-teal-600`}
              >
                Mark as resolved
              </button>
              <button type="button" onClick={onClose} className={`w-full ${btnSecondary}`}>
                Close
              </button>
            </footer>
          )}

          {exc && isResolved && (
            <footer className="border-t border-white/[0.06] p-5">
              <p className="mb-3 text-center text-xs text-emerald-400/90">
                Resolved {exc.resolvedAt ? `· ${exc.resolvedAt}` : ""}
              </p>
              <button type="button" onClick={onClose} className={`w-full ${btnSecondary}`}>
                Close
              </button>
            </footer>
          )}
        </aside>
      </div>

      <CreateExceptionModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        defaultShipmentId={shipmentId ?? undefined}
        onCreated={(id) => {
          setCreateOpen(false);
          onExceptionCreated?.(id);
        }}
      />
    </>
  );
}

function ExceptionEditView({
  exc,
  noteDraft,
  onNoteChange,
  onAddNote,
  onCompleteFollowUp,
  onEscalate,
  onStatusChange,
  onOwnerChange,
  isResolved,
}: {
  exc: ExceptionRecord;
  noteDraft: string;
  onNoteChange: (v: string) => void;
  onAddNote: () => void;
  onCompleteFollowUp: () => Promise<void>;
  onEscalate: () => Promise<void>;
  onStatusChange: (s: ExceptionRecord["status"]) => void | Promise<void>;
  onOwnerChange: (owner: string) => void | Promise<void>;
  isResolved: boolean;
}) {
  return (
    <div className="space-y-6">
      <PlaybookPanel
        exc={exc}
        isResolved={isResolved}
        onCompleteFollowUp={onCompleteFollowUp}
        onEscalate={onEscalate}
      />

      <dl className="space-y-3 text-sm">
        <Row label="Shipment" value={exc.shipmentId} mono />
        <Row label="Customer" value={exc.customer} />
        <Row label="Carrier" value={exc.carrier} />
        <Row label="Route" value={exc.route} />
        <Row label="Origin" value={exc.source ?? "Manual"} />
        <Row label="Delay reason" value={exc.delayReason} />
        <Row label="Opened" value={exc.openedAt} />
        <Row label="Updated" value={exc.updatedAt} />
      </dl>

      <div className="space-y-4 border-t border-white/[0.06] pt-5">
        <label className="block">
          <span className={sectionLabel}>Status</span>
          <select
            value={exc.status}
            disabled={isResolved}
            onChange={(e) =>
              onStatusChange(e.target.value as ExceptionRecord["status"])
            }
            className={`${selectBase} mt-2 w-full disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {ISSUE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className={sectionLabel}>Owner</span>
          <select
            value={exc.owner}
            disabled={isResolved}
            onChange={(e) => onOwnerChange(e.target.value)}
            className={`${selectBase} mt-2 w-full disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {EXCEPTION_OWNERS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="border-t border-white/[0.06] pt-5">
        <span className={sectionLabel}>Internal notes</span>
        {!isResolved && (
          <div className="mt-3 space-y-2">
            <textarea
              value={noteDraft}
              onChange={(e) => onNoteChange(e.target.value)}
              rows={3}
              placeholder="Add an internal note for your team…"
              className={`${inputBase} resize-none`}
            />
            <button
              type="button"
              onClick={onAddNote}
              disabled={!noteDraft.trim()}
              className={`${btnSecondary} w-full disabled:cursor-not-allowed disabled:opacity-40`}
            >
              Add note
            </button>
          </div>
        )}
        <ul className="mt-4 space-y-3">
          {exc.internalNotes.length === 0 ? (
            <li className="text-xs text-zinc-600">No internal notes yet.</li>
          ) : (
            exc.internalNotes.map((n) => (
              <li
                key={n.id}
                className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"
              >
                <p className="text-[13px] leading-relaxed text-zinc-300">{n.body}</p>
                <p className="mt-2 text-[11px] text-zinc-600">
                  {n.author} · {n.createdAt}
                </p>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}

function ShipmentOnlyView({
  shipment,
  onCreate,
}: {
  shipment: Shipment;
  onCreate: () => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-400">
        No exception record exists for this shipment yet.
      </p>
      <dl className="space-y-3 text-sm">
        <Row label="Customer" value={shipment.customer} />
        <Row label="Route" value={`${shipment.origin} → ${shipment.destination}`} />
        <Row label="Carrier" value={`${shipment.carrier} · ${shipment.mode}`} />
        <Row label="ETA" value={shipment.eta} />
        <Row label="Shipment status" value={shipment.status} />
      </dl>
      <span className={statusBadgeStyles[shipment.status]}>{shipment.status}</span>
      <button type="button" onClick={onCreate} className={`mt-4 w-full ${btnPrimary}`}>
        Create exception for this shipment
      </button>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className={sectionLabel}>{label}</dt>
      <dd className={`mt-1 text-zinc-300 ${mono ? "font-mono text-xs" : ""}`}>{value}</dd>
    </div>
  );
}
