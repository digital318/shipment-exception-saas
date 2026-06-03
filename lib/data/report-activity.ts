import { getCurrentActor } from "@/lib/auth/session";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { throwReadableError } from "@/lib/supabase/format-error";
import type { ReportId } from "@/lib/reports/types";
import { REPORT_DEFINITIONS } from "@/lib/reports/types";

export type ReportActivityKind = "report_generated" | "report_exported";

function reportTitle(reportId: ReportId): string {
  return REPORT_DEFINITIONS.find((r) => r.id === reportId)?.title ?? reportId;
}

export async function insertReportActivityEvent(
  organizationId: string,
  exceptionDbId: string | undefined,
  kind: ReportActivityKind,
  reportId: ReportId,
  format?: "csv" | "pdf",
): Promise<void> {
  if (!isSupabaseConfigured() || !exceptionDbId) return;

  const title = reportTitle(reportId);
  const message =
    kind === "report_generated"
      ? `${getCurrentActor()} generated ${title}`
      : `${getCurrentActor()} exported ${title} as ${format?.toUpperCase() ?? "file"}`;

  const supabase = getSupabaseClient();
  const { error } = await supabase.from("activity_events").insert({
    exception_id: exceptionDbId,
    organization_id: organizationId,
    event_type: kind,
    message,
  });

  if (error) throwReadableError(error);
}

export function buildReportActivityMessage(
  kind: ReportActivityKind,
  reportId: ReportId,
  format?: "csv" | "pdf",
): string {
  const title = reportTitle(reportId);
  if (kind === "report_generated") {
    return `${getCurrentActor()} generated ${title}`;
  }
  return `${getCurrentActor()} exported ${title} as ${format?.toUpperCase() ?? "file"}`;
}
