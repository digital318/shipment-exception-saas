import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import type { DbNotificationWithRelations } from "@/lib/database.types";
import type { CreateNotificationInput, NotificationRecord } from "@/lib/types";
import type { CustomerSlaMetrics } from "@/lib/sla-intelligence";
import { mapNotifications } from "./notification-mappers";
import { resolveOrganizationId } from "./resolve-organization-id";
import type { DataResult } from "./types";

const NOTIFICATION_SELECT = `
  *,
  exception:exceptions (
    id,
    title,
    shipment:shipments (shipment_number)
  ),
  customer:customers (
    id,
    name
  )
`;

export async function findAnyOpenException(organizationId: string): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("exceptions")
    .select("id")
    .eq("organization_id", organizationId)
    .is("resolved_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data.id;
}

async function insertActivityForNotification(
  organizationId: string,
  exceptionId: string | undefined,
  message: string,
  eventType: "alert" | "overdue_follow_up" | "customer_risk" | "sla_breach" = "alert",
): Promise<void> {
  if (!exceptionId) return;

  const supabase = getSupabaseClient();
  const { error } = await supabase.from("activity_events").insert({
    exception_id: exceptionId,
    organization_id: organizationId,
    event_type: eventType,
    message: eventType === "alert" ? `Notification: ${message}` : message,
  });

  if (error) throw error;
}

export async function createNotification(
  input: CreateNotificationInput,
  options?: { activityEventType?: "alert" | "overdue_follow_up" | "customer_risk" | "sla_breach" },
): Promise<string> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("notifications")
    .insert({
      organization_id: input.organizationId,
      exception_id: input.exceptionId ?? null,
      customer_id: input.customerId ?? null,
      type: input.type,
      title: input.title,
      message: input.message,
      severity: input.severity,
      status: "Unread",
    })
    .select("id")
    .single();

  if (error) throw error;

  await insertActivityForNotification(
    input.organizationId,
    input.exceptionId,
    input.title,
    options?.activityEventType ?? "alert",
  );

  return data.id;
}

export async function createEscalationNotification(
  input: CreateNotificationInput,
): Promise<string> {
  return createNotification(input);
}

export async function markNotificationRead(
  notificationId: string,
  organizationId: string,
): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }

  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("notifications")
    .update({
      status: "Read",
      read_at: new Date().toISOString(),
    })
    .eq("id", notificationId)
    .eq("organization_id", organizationId);

  if (error) throw error;
}

/**
 * Marks every unread notification as read for the given organization.
 * Requires a definite organization_id — no resolver fallback.
 */
export async function markAllNotificationsRead(organizationId: string): Promise<void> {
  const LOG_PREFIX = "[FreightPulse] markAllNotificationsRead";

  if (!organizationId) {
    const message = "organization_id is required for mark all read";
    console.error(LOG_PREFIX, message);
    throw new Error(message);
  }

  if (!isSupabaseConfigured()) {
    const message = "Supabase is not configured";
    console.error(LOG_PREFIX, message);
    throw new Error(message);
  }

  const supabase = getSupabaseClient();
  const readAt = new Date().toISOString();

  const { data, error } = await supabase
    .from("notifications")
    .update({
      status: "Read",
      read_at: readAt,
    })
    .eq("organization_id", organizationId)
    .eq("status", "Unread")
    .select("id");

  if (error) {
    console.error(LOG_PREFIX, "Supabase update error", {
      organizationId,
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    throw error;
  }

  console.info(LOG_PREFIX, "Supabase update succeeded", {
    organizationId,
    updatedCount: data?.length ?? 0,
    readAt,
  });
}

export async function getNotificationsForOrganization(
  preferredOrganizationId?: string,
): Promise<DataResult<NotificationRecord[]>> {
  if (!isSupabaseConfigured()) {
    return { data: [], source: "mock", error: "Supabase not configured" };
  }

  const supabase = getSupabaseClient();
  const organizationId = await resolveOrganizationId(supabase, preferredOrganizationId);

  if (!organizationId) {
    return { data: [], source: "mock", error: "Organization not found" };
  }

  const { data, error } = await supabase
    .from("notifications")
    .select(NOTIFICATION_SELECT)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return {
      data: [],
      source: "mock",
      error: error.message,
    };
  }

  return {
    data: mapNotifications((data ?? []) as DbNotificationWithRelations[]),
    source: "supabase",
  };
}

export async function hasUnreadSlaNotificationForCustomer(
  organizationId: string,
  customerId: string,
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("customer_id", customerId)
    .eq("type", "sla_risk")
    .eq("status", "Unread")
    .limit(1);

  if (error) {
    console.error("[FreightPulse] hasUnreadSlaNotificationForCustomer failed", {
      organizationId,
      customerId,
      message: error.message,
      code: error.code,
    });
    throw error;
  }

  return (data?.length ?? 0) > 0;
}

export async function hasAnySlaRiskNotificationForCustomer(
  organizationId: string,
  customerId: string,
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("customer_id", customerId)
    .eq("type", "sla_risk")
    .limit(1);

  if (error) {
    console.error("[FreightPulse] hasAnySlaRiskNotificationForCustomer failed", {
      organizationId,
      customerId,
      message: error.message,
      code: error.code,
    });
    throw error;
  }

  return (data?.length ?? 0) > 0;
}

export async function findOpenExceptionForCustomer(
  organizationId: string,
  customerId: string,
): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = getSupabaseClient();
  const { data: shipments, error: shipError } = await supabase
    .from("shipments")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("customer_id", customerId);

  if (shipError || !shipments?.length) return null;

  const shipmentIds = shipments.map((s) => s.id);
  const { data, error } = await supabase
    .from("exceptions")
    .select("id")
    .eq("organization_id", organizationId)
    .is("resolved_at", null)
    .in("shipment_id", shipmentIds)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data.id;
}

/** @deprecated Use processSlaRiskNotificationTransitions — kept for import compatibility. */
export async function syncSlaRiskNotifications(
  organizationId: string,
  atRiskCustomers: CustomerSlaMetrics[],
): Promise<number> {
  const redCustomers = atRiskCustomers.filter((c) => c.riskLevel === "red");
  const { processSlaRiskNotificationTransitions } = await import("./sla-risk-notifications");
  const { result } = await processSlaRiskNotificationTransitions(
    organizationId,
    redCustomers,
    new Map(),
  );
  return result.created;
}
