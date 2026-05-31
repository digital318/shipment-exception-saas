"use client";

import { useMemo, useState } from "react";
import { ExceptionDetailDrawer } from "@/components/exceptions/exception-detail-drawer";
import { DashboardShell } from "@/components/dashboard-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState, LoadingState } from "@/components/ui/data-state";
import { FilterChip } from "@/components/ui/filter-chip";
import { SyncStatus } from "@/components/ui/sync-status";
import { useExceptions } from "@/context/exceptions-context";
import { formatDisplayDate } from "@/lib/data/format";
import { isActiveException } from "@/lib/exception-utils";
import {
  ESCALATION_LEVEL_LABELS,
  formatEscalationLevel,
  formatFollowUpDisplay,
  isFollowUpOverdue,
} from "@/lib/playbooks";
import {
  badgeBase,
  cardSurface,
  issueStatusStyles,
  sectionLabel,
  severityStyles,
} from "@/lib/styles";
import type { ExceptionRecord, EscalationLevel } from "@/lib/types";

type PlaybookFilter = "All" | "Overdue";

export function PlaybooksPage() {
  const { exceptions, loading, error, source, refresh } = useExceptions();
  const [filter, setFilter] = useState<PlaybookFilter>("All");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const activeWithPlaybooks = useMemo(
    () =>
      exceptions.filter(
        (e) => isActiveException(e) && e.playbookType != null,
      ),
    [exceptions],
  );

  const overdueCount = useMemo(
    () =>
      activeWithPlaybooks.filter((e) => isFollowUpOverdue(e.nextFollowUpAt)).length,
    [activeWithPlaybooks],
  );

  const filtered = useMemo(() => {
    if (filter === "Overdue") {
      return activeWithPlaybooks.filter((e) =>
        isFollowUpOverdue(e.nextFollowUpAt),
      );
    }
    return activeWithPlaybooks;
  }, [activeWithPlaybooks, filter]);

  const syncState = loading ? "syncing" : error && source === "mock" ? "error" : "live";

  return (
    <DashboardShell
      eyebrow="Operations"
      title="Playbooks"
      description={
        loading
          ? "Loading playbooks…"
          : `${filtered.length} active playbook${filtered.length === 1 ? "" : "s"} · ${overdueCount} overdue follow-up${overdueCount === 1 ? "" : "s"}`
      }
      actions={<SyncStatus state={syncState} />}
    >
      <div className="mb-5 flex flex-wrap gap-2">
        <FilterChip
          label="All"
          active={filter === "All"}
          count={activeWithPlaybooks.length}
          onClick={() => setFilter("All")}
        />
        <FilterChip
          label="Overdue"
          active={filter === "Overdue"}
          count={overdueCount}
          onClick={() => setFilter("Overdue")}
        />
      </div>

      {loading ? (
        <div className={cardSurface}>
          <LoadingState
            title="Loading playbooks"
            description="Fetching active exceptions with operational playbooks…"
          />
        </div>
      ) : error && exceptions.length === 0 ? (
        <div className={cardSurface}>
          <ErrorState description={error} onRetry={() => void refresh()} />
        </div>
      ) : filtered.length === 0 ? (
        <div className={cardSurface}>
          <EmptyState
            title={
              filter === "Overdue"
                ? "No overdue follow-ups"
                : "No active playbooks"
            }
            description={
              filter === "Overdue"
                ? "All follow-ups are on schedule. Check back as exceptions are created."
                : "Playbooks are assigned automatically when exceptions are detected or created."
            }
          />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-zinc-900/40">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                  <th className={`px-5 py-3.5 ${sectionLabel}`}>Exception</th>
                  <th className={`px-5 py-3.5 ${sectionLabel}`}>Playbook</th>
                  <th className={`px-5 py-3.5 ${sectionLabel}`}>Escalation</th>
                  <th className={`px-5 py-3.5 ${sectionLabel}`}>Owner</th>
                  <th className={`px-5 py-3.5 ${sectionLabel}`}>Follow-up</th>
                  <th className={`px-5 py-3.5 ${sectionLabel}`}>Recommended action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filtered.map((exc) => (
                  <PlaybookRow
                    key={exc.id}
                    exc={exc}
                    onSelect={() => setSelectedId(exc.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ExceptionDetailDrawer
        exceptionId={selectedId}
        onClose={() => setSelectedId(null)}
      />
    </DashboardShell>
  );
}

function PlaybookRow({
  exc,
  onSelect,
}: {
  exc: ExceptionRecord;
  onSelect: () => void;
}) {
  const level = (exc.escalationLevel ?? 1) as EscalationLevel;
  const overdue = isFollowUpOverdue(exc.nextFollowUpAt);

  return (
    <tr
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className="cursor-pointer transition-colors hover:bg-white/[0.03] focus-visible:bg-white/[0.04] focus-visible:outline-none"
    >
      <td className="px-5 py-4 align-top">
        <div className="flex flex-wrap items-center gap-2">
          <span className={severityStyles[exc.severity]}>{exc.severity}</span>
          <span className={`text-[11px] font-semibold ${issueStatusStyles[exc.status]}`}>
            {exc.status}
          </span>
        </div>
        <p className="mt-2 font-medium text-white">{exc.title}</p>
        <p className="mt-1 font-mono text-[11px] text-zinc-500">
          {exc.id} · {exc.shipmentId}
        </p>
      </td>
      <td className="px-5 py-4 align-top">
        <span className="text-sm font-medium text-violet-300">{exc.playbookType}</span>
      </td>
      <td className="px-5 py-4 align-top">
        <span className={`${badgeBase} bg-violet-500/10 text-violet-300 ring-violet-500/20`}>
          {formatEscalationLevel(level)}
        </span>
        <p className="mt-1.5 text-xs text-zinc-500">{ESCALATION_LEVEL_LABELS[level]}</p>
      </td>
      <td className="px-5 py-4 align-top text-zinc-300">{exc.owner}</td>
      <td className="px-5 py-4 align-top">
        {exc.nextFollowUpAt ? (
          <div className="space-y-1">
            <p className={overdue ? "font-medium text-rose-400" : "text-zinc-300"}>
              {formatDisplayDate(exc.nextFollowUpAt)}
            </p>
            <span
              className={`${badgeBase} ${
                overdue
                  ? "bg-rose-500/10 text-rose-400 ring-rose-500/25"
                  : "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20"
              }`}
            >
              {formatFollowUpDisplay(exc.nextFollowUpAt)}
            </span>
          </div>
        ) : (
          <span className="text-zinc-600">—</span>
        )}
      </td>
      <td className="max-w-xs px-5 py-4 align-top">
        <p className="line-clamp-3 text-xs leading-relaxed text-zinc-500">
          {exc.recommendedAction ?? "—"}
        </p>
      </td>
    </tr>
  );
}
