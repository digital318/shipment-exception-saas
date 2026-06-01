import { isFollowUpOverdue } from "@/lib/playbooks";
import { computeDaysSinceLastFollowUp } from "@/lib/services/metrics-service";
import type { ExceptionRecord } from "@/lib/types";
import { buildOverdueFollowUpNotificationInput } from "./notification-rules";
import { createNotification } from "./notifications";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

const LOG_PREFIX = "[FreightPulse] Overdue follow-up notification";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type OverdueFollowUpTransitionResult = {
  created: number;
  skipped: number;
};

function isDatabaseExceptionId(exceptionId: string | undefined): exceptionId is string {
  return exceptionId != null && UUID_PATTERN.test(exceptionId);
}

function buildOverdueSnapshot(exceptions: ExceptionRecord[]): string {
  return exceptions
    .filter((e) => isFollowUpOverdue(e.nextFollowUpAt) && isDatabaseExceptionId(e.dbId))
    .map((e) => `${e.dbId}:${e.nextFollowUpAt ?? ""}`)
    .sort()
    .join("|");
}

async function hasUnreadOverdueNotification(
  organizationId: string,
  exceptionId: string,
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("exception_id", exceptionId)
    .eq("type", "overdue_follow_up")
    .eq("status", "Unread")
    .limit(1);

  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

async function hasAnyOverdueNotification(
  organizationId: string,
  exceptionId: string,
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("exception_id", exceptionId)
    .eq("type", "overdue_follow_up")
    .limit(1);

  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

/**
 * Creates overdue follow-up notifications when next_follow_up_at < NOW().
 * Deduplicates unread and prior alerts per exception.
 */
export async function processOverdueFollowUpNotifications(
  organizationId: string,
  exceptions: ExceptionRecord[],
  previouslyOverdueIds: ReadonlySet<string>,
): Promise<{
  result: OverdueFollowUpTransitionResult;
  nextOverdueIds: Set<string>;
  overdueSnapshot: string;
}> {
  const overdue = exceptions.filter(
    (e) =>
      e.status !== "Resolved" &&
      isFollowUpOverdue(e.nextFollowUpAt) &&
      isDatabaseExceptionId(e.dbId),
  );

  const nextOverdueIds = new Set(overdue.map((e) => e.dbId!));
  let created = 0;
  let skipped = 0;

  for (const exc of overdue) {
    const exceptionId = exc.dbId!;
    const label = exc.id;

    const hasUnread = await hasUnreadOverdueNotification(organizationId, exceptionId);
    if (hasUnread) {
      console.info(`${LOG_PREFIX} Skipped duplicate unread alert for ${label}`);
      skipped += 1;
      continue;
    }

    if (previouslyOverdueIds.has(exceptionId)) {
      console.info(`${LOG_PREFIX} Skipped duplicate alert for ${label} — still overdue`);
      skipped += 1;
      continue;
    }

    if (!previouslyOverdueIds.size) {
      const hasPrior = await hasAnyOverdueNotification(organizationId, exceptionId);
      if (hasPrior) {
        console.info(`${LOG_PREFIX} Skipped duplicate alert for ${label} — prior alert exists`);
        skipped += 1;
        continue;
      }
    }

    const daysOverdue = Math.max(1, computeDaysSinceLastFollowUp(exc.nextFollowUpAt));
    const input = buildOverdueFollowUpNotificationInput(organizationId, {
      exceptionId,
      exceptionDisplayId: exc.id,
      shipmentNumber: exc.shipmentId,
      title: exc.title,
      customerName: exc.customer,
      daysOverdue,
    });

    try {
      await createNotification(input, { activityEventType: "overdue_follow_up" });
      created += 1;
      console.info(`${LOG_PREFIX} Created notification for ${label}`);
    } catch (error) {
      console.error(`${LOG_PREFIX} Failed for ${label}`, error);
    }
  }

  return {
    result: { created, skipped },
    nextOverdueIds,
    overdueSnapshot: buildOverdueSnapshot(exceptions),
  };
}

export { buildOverdueSnapshot };
