"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { ReportContent } from "@/components/reports/report-content";
import { ReportExportActions } from "@/components/reports/report-export-actions";
import { ReportFiltersBar } from "@/components/reports/report-filters-bar";
import { ErrorState, LoadingState } from "@/components/ui/data-state";
import { SectionHeading } from "@/components/ui/section-heading";
import { SyncStatus } from "@/components/ui/sync-status";
import { useExceptions } from "@/context/exceptions-context";
import { useReportData } from "@/hooks/use-report-data";
import {
  buildReportActivityMessage,
  insertReportActivityEvent,
} from "@/lib/data/report-activity";
import { DEFAULT_REPORT_FILTERS } from "@/lib/reports/filters";
import { exportReportCsv } from "@/lib/reports/csv-export";
import { exportReportPdf } from "@/lib/reports/pdf-export";
import { REPORT_DEFINITIONS, type ReportFilters, type ReportId } from "@/lib/reports/types";
import { cardSurface } from "@/lib/styles";
import { formatNowLabel } from "@/lib/exception-utils";

const VALID_REPORT_IDS = new Set(REPORT_DEFINITIONS.map((r) => r.id));

function parseReportId(value: string | null): ReportId {
  if (value && VALID_REPORT_IDS.has(value as ReportId)) {
    return value as ReportId;
  }
  return "operations-summary";
}

export function ReportsPage() {
  const searchParams = useSearchParams();
  const initialReport = parseReportId(searchParams.get("report"));
  const autoGenerate = searchParams.get("generate") === "1";

  const [selectedReport, setSelectedReport] = useState<ReportId>(initialReport);
  const [filters, setFilters] = useState<ReportFilters>(DEFAULT_REPORT_FILTERS);
  const [generatedReports, setGeneratedReports] = useState<Set<ReportId>>(new Set());

  const { customers, carriers, logReportActivity } = useExceptions();
  const {
    data,
    shipments,
    exceptions,
    loading,
    error,
    refresh,
    organizationId,
    anchorExceptionDbId,
    filteredExceptionCount,
  } = useReportData(selectedReport, filters);

  const customerNames = useMemo(
    () => [...new Set(customers.map((c) => c.name))].sort(),
    [customers],
  );

  const activeDefinition = REPORT_DEFINITIONS.find((r) => r.id === selectedReport)!;

  const recordActivity = useCallback(
    async (kind: "report_generated" | "report_exported", format?: "csv" | "pdf") => {
      const message = buildReportActivityMessage(kind, selectedReport, format);
      logReportActivity(message, kind);

      if (organizationId && anchorExceptionDbId) {
        try {
          await insertReportActivityEvent(
            organizationId,
            anchorExceptionDbId,
            kind,
            selectedReport,
            format,
          );
        } catch {
          // Activity logging should not block report actions.
        }
      }
    },
    [selectedReport, logReportActivity, organizationId, anchorExceptionDbId],
  );

  const generateReport = useCallback(async () => {
    setGeneratedReports((prev) => new Set(prev).add(selectedReport));
    await recordActivity("report_generated");
  }, [selectedReport, recordActivity]);

  useEffect(() => {
    setSelectedReport(parseReportId(searchParams.get("report")));
  }, [searchParams]);

  useEffect(() => {
    if (autoGenerate && !loading && !generatedReports.has(initialReport)) {
      void generateReport();
    }
  }, [autoGenerate, loading, initialReport, generatedReports, generateReport]);

  const isGenerated = generatedReports.has(selectedReport);

  const syncState = loading ? "syncing" : error ? "error" : "live";

  return (
    <DashboardShell
      eyebrow="Reporting center"
      title="Reports"
      description="Generate operational and executive reports from your FreightPulse data — organization scoped"
      actions={<SyncStatus state={syncState} />}
    >
      {loading ? (
        <div className={`${cardSurface} overflow-hidden`}>
          <LoadingState
            title="Loading report data"
            description="Fetching organization-scoped exceptions, shipments, and metrics…"
          />
        </div>
      ) : error ? (
        <div className={`${cardSurface} overflow-hidden`}>
          <ErrorState description={error} onRetry={() => void refresh()} />
        </div>
      ) : (
        <div className="space-y-6">
          <ReportFiltersBar
            filters={filters}
            customers={customerNames}
            carriers={carriers}
            onChange={(patch) => setFilters((f) => ({ ...f, ...patch }))}
            onClear={() => setFilters(DEFAULT_REPORT_FILTERS)}
          />

          <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
            <nav aria-label="Available reports" className="space-y-2">
              {REPORT_DEFINITIONS.map((report) => {
                const active = selectedReport === report.id;
                return (
                  <button
                    key={report.id}
                    type="button"
                    onClick={() => setSelectedReport(report.id)}
                    className={`w-full rounded-xl border px-4 py-3.5 text-left transition-all duration-200 ${
                      active
                        ? "border-violet-500/30 bg-violet-500/10 ring-1 ring-violet-500/20"
                        : "border-white/[0.06] bg-zinc-900/40 hover:border-white/[0.1] hover:bg-zinc-900/55"
                    }`}
                  >
                    <p className="text-[13px] font-semibold text-white">{report.title}</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
                      {report.description}
                    </p>
                  </button>
                );
              })}
            </nav>

            <div className="space-y-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <SectionHeading
                  title={activeDefinition.title}
                  description={`${filteredExceptionCount} exceptions match filters · Generated ${isGenerated ? formatNowLabel() : "not yet"}`}
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void generateReport()}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3.5 py-2 text-xs font-medium text-zinc-300 shadow-sm transition-all duration-200 hover:border-white/[0.14] hover:bg-white/[0.06] hover:text-white"
                  >
                    Generate Report
                  </button>
                  <ReportExportActions
                    onExportCsv={async () => {
                      exportReportCsv(selectedReport, customers, shipments, exceptions, filters);
                      await recordActivity("report_exported", "csv");
                    }}
                    onExportPdf={async () => {
                      exportReportPdf(selectedReport, customers, shipments, exceptions, filters);
                      await recordActivity("report_exported", "pdf");
                    }}
                  />
                </div>
              </div>

              {isGenerated ? (
                <ReportContent reportId={selectedReport} data={data} />
              ) : (
                <div className={`${cardSurface} px-6 py-12 text-center`}>
                  <p className="text-sm font-medium text-zinc-300">
                    Report not generated yet
                  </p>
                  <p className="mt-2 text-xs text-zinc-500">
                    Adjust filters if needed, then click Generate Report to preview{" "}
                    {activeDefinition.title.toLowerCase()}.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
