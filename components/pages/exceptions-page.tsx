"use client";

import { useMemo, useState } from "react";
import { CreateExceptionModal } from "@/components/exceptions/create-exception-modal";
import { ExceptionDetailDrawer } from "@/components/exceptions/exception-detail-drawer";
import { DashboardShell } from "@/components/dashboard-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState, LoadingState } from "@/components/ui/data-state";
import { FilterChip } from "@/components/ui/filter-chip";
import { SyncStatus } from "@/components/ui/sync-status";
import { useExceptions } from "@/context/exceptions-context";
import {
  getExceptionSeverityDisplay,
  isActiveException,
} from "@/lib/exception-utils";
import { btnPrimary, cardSurface, issueStatusStyles, sectionLabel } from "@/lib/styles";
import type { ExceptionRecord, Severity } from "@/lib/types";

type ExceptionFilter = Severity | "All" | "Resolved";

const filters: ExceptionFilter[] = [
  "All",
  "Critical",
  "High",
  "Medium",
  "Low",
  "Resolved",
];

export function ExceptionsPage() {
  const { exceptions, loading, error, source, refresh } = useExceptions();
  const [severityFilter, setSeverityFilter] = useState<ExceptionFilter>("All");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const filtered = useMemo(() => {
    if (severityFilter === "All") return exceptions;
    if (severityFilter === "Resolved") {
      return exceptions.filter((e) => e.status === "Resolved");
    }
    return exceptions.filter(
      (e) => isActiveException(e) && e.severity === severityFilter,
    );
  }, [exceptions, severityFilter]);

  const severityCounts = useMemo(() => {
    const active = exceptions.filter(isActiveException);
    const counts: Record<string, number> = {
      All: exceptions.length,
      Resolved: exceptions.filter((e) => e.status === "Resolved").length,
    };
    (["Critical", "High", "Medium", "Low"] as const).forEach((s) => {
      counts[s] = active.filter((e) => e.severity === s).length;
    });
    return counts;
  }, [exceptions]);

  const syncState = loading ? "syncing" : error && source === "mock" ? "error" : "live";

  return (
    <DashboardShell
      eyebrow="Exception management"
      title="Exceptions"
      description={
        loading
          ? "Loading exceptions…"
          : `${filtered.length} exceptions · click a card to view and edit`
      }
      actions={
        <>
          <SyncStatus state={syncState} />
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className={btnPrimary}
            disabled={loading}
          >
            New exception
          </button>
        </>
      }
    >
      <div className="mb-5 flex flex-wrap gap-2">
        {filters.map((s) => (
          <FilterChip
            key={s}
            label={s}
            active={severityFilter === s}
            count={severityCounts[s]}
            onClick={() => setSeverityFilter(s)}
          />
        ))}
      </div>

      {loading ? (
        <div className={cardSurface}>
          <LoadingState
            title="Loading exceptions"
            description="Fetching open and resolved exceptions from Supabase…"
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
              severityFilter === "Resolved"
                ? "No resolved exceptions"
                : exceptions.length === 0
                  ? "No exceptions yet"
                  : "No active exceptions at this severity"
            }
            description={
              severityFilter === "Resolved"
                ? "Resolved exceptions will appear here once issues are closed."
                : exceptions.length === 0
                  ? "Create a new exception to start tracking shipment issues."
                  : "All clear for the selected filter. Try another severity level or view All."
            }
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((exc) => (
            <ExceptionCard
              key={exc.id}
              exc={exc}
              isSelected={selectedId === exc.id}
              onSelect={() => setSelectedId(exc.id)}
            />
          ))}
        </div>
      )}

      <ExceptionDetailDrawer
        exceptionId={selectedId}
        onClose={() => setSelectedId(null)}
        onExceptionCreated={(id) => setSelectedId(id)}
      />

      <CreateExceptionModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(id) => {
          setSelectedId(id);
        }}
      />
    </DashboardShell>
  );
}

function ExceptionCard({
  exc,
  isSelected,
  onSelect,
}: {
  exc: ExceptionRecord;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const severity = getExceptionSeverityDisplay(exc);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group w-full text-left ${cardSurface} p-5 transition-all duration-200 hover:border-white/[0.12] hover:bg-zinc-900/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40 active:scale-[0.99] ${
        isSelected
          ? "border-violet-500/40 bg-violet-500/[0.06] ring-1 ring-violet-500/25"
          : ""
      } ${exc.status === "Resolved" ? "opacity-80" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className={severity.className}>{severity.label}</span>
        <span className="font-mono text-[10px] text-zinc-600">{exc.id}</span>
      </div>
      <h3 className="mt-4 text-sm font-semibold leading-snug text-white group-hover:text-violet-100">
        {exc.title}
      </h3>
      <p className="mt-2 font-mono text-[11px] text-zinc-500">{exc.shipmentId}</p>
      <p className="mt-1 text-xs text-zinc-500">{exc.route}</p>

      <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-white/[0.04] pt-4 text-xs">
        <div>
          <dt className={sectionLabel}>Owner</dt>
          <dd className="mt-1 font-medium text-zinc-300">{exc.owner}</dd>
        </div>
        <div>
          <dt className={sectionLabel}>Status</dt>
          <dd className={`mt-1 font-semibold ${issueStatusStyles[exc.status]}`}>
            {exc.status}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className={sectionLabel}>Delay reason</dt>
          <dd className="mt-1 line-clamp-2 leading-relaxed text-zinc-500">
            {exc.delayReason}
          </dd>
        </div>
      </dl>

      <footer className="mt-4 flex items-center justify-between text-[11px] text-zinc-600">
        <span>{exc.customer}</span>
        <span>Updated {exc.updatedAt}</span>
      </footer>
      <p className="mt-3 text-[10px] font-medium text-violet-400/0 transition group-hover:text-violet-400/80">
        View & edit →
      </p>
    </button>
  );
}
