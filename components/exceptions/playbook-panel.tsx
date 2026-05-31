"use client";

import { useState } from "react";
import { useToast } from "@/context/toast-context";
import {
  ESCALATION_LEVEL_LABELS,
  formatEscalationLevel,
  formatFollowUpDisplay,
  isFollowUpOverdue,
} from "@/lib/playbooks";
import { formatDisplayDate } from "@/lib/data/format";
import { btnPrimary, btnSecondary, cardSurface, sectionLabel } from "@/lib/styles";
import type { ExceptionRecord, EscalationLevel } from "@/lib/types";

type PlaybookPanelProps = {
  exc: ExceptionRecord;
  isResolved: boolean;
  onCompleteFollowUp: () => Promise<void>;
  onEscalate: () => Promise<void>;
};

export function PlaybookPanel({
  exc,
  isResolved,
  onCompleteFollowUp,
  onEscalate,
}: PlaybookPanelProps) {
  const { toast } = useToast();
  const [busy, setBusy] = useState<"follow-up" | "escalate" | null>(null);

  if (!exc.playbookType) return null;

  const level = (exc.escalationLevel ?? 1) as EscalationLevel;
  const overdue = isFollowUpOverdue(exc.nextFollowUpAt);
  const atMaxLevel = level >= 4;

  async function handleCompleteFollowUp() {
    setBusy("follow-up");
    try {
      await onCompleteFollowUp();
      toast("Follow-up marked complete. Next check scheduled.", "success");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to complete follow-up.";
      toast(message, "error");
    } finally {
      setBusy(null);
    }
  }

  async function handleEscalate() {
    setBusy("escalate");
    try {
      await onEscalate();
      toast("Exception escalated to next level.", "success");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to escalate exception.";
      toast(message, "error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={`${cardSurface} p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={sectionLabel}>Operational playbook</p>
          <h3 className="mt-1.5 text-sm font-semibold text-white">{exc.playbookType}</h3>
        </div>
        <span className="rounded-md bg-violet-500/10 px-2 py-0.5 text-[11px] font-semibold text-violet-300 ring-1 ring-inset ring-violet-500/25">
          {formatEscalationLevel(level)}
        </span>
      </div>

      <dl className="mt-4 space-y-3 text-sm">
        <div>
          <dt className={sectionLabel}>Escalation stage</dt>
          <dd className="mt-1 text-zinc-300">{ESCALATION_LEVEL_LABELS[level]}</dd>
        </div>
        <div>
          <dt className={sectionLabel}>Recommended action</dt>
          <dd className="mt-1 leading-relaxed text-zinc-400">
            {exc.recommendedAction ?? "No action defined."}
          </dd>
        </div>
        <div>
          <dt className={sectionLabel}>Next follow-up</dt>
          <dd className="mt-1 flex flex-wrap items-center gap-2">
            <span className={overdue ? "font-medium text-rose-400" : "text-zinc-300"}>
              {exc.nextFollowUpAt
                ? formatDisplayDate(exc.nextFollowUpAt)
                : "Not scheduled"}
            </span>
            {exc.nextFollowUpAt && (
              <span
                className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${
                  overdue
                    ? "bg-rose-500/10 text-rose-400 ring-rose-500/25"
                    : "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20"
                }`}
              >
                {formatFollowUpDisplay(exc.nextFollowUpAt)}
              </span>
            )}
          </dd>
        </div>
      </dl>

      {!isResolved && (
        <div className="mt-4 flex flex-col gap-2 border-t border-white/[0.06] pt-4">
          <button
            type="button"
            onClick={handleCompleteFollowUp}
            disabled={busy !== null}
            className={`w-full ${btnSecondary} disabled:cursor-not-allowed disabled:opacity-40`}
          >
            {busy === "follow-up" ? "Saving…" : "Mark follow-up complete"}
          </button>
          <button
            type="button"
            onClick={handleEscalate}
            disabled={busy !== null || atMaxLevel}
            className={`w-full ${btnPrimary} !from-rose-600 !to-orange-600 disabled:cursor-not-allowed disabled:opacity-40`}
          >
            {busy === "escalate"
              ? "Escalating…"
              : atMaxLevel
                ? "At maximum escalation"
                : "Escalate one level"}
          </button>
        </div>
      )}
    </div>
  );
}
