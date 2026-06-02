import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import type {
  DbCustomerNotificationInsert,
  DbCustomerNotificationUpdate,
  DbCustomerNotificationWithRelations,
} from "@/lib/database.types";
import type {
  CreateCustomerNotificationInput,
  CustomerNotificationRecord,
  CustomerNotificationStatus,
} from "@/lib/types";
import { mapCustomerNotifications } from "./customer-notification-mappers";
import { resolveOrganizationId } from "./resolve-organization-id";
import type { DataResult } from "./types";

export const CUSTOMER_NOTIFICATIONS_TABLE = "customer_notifications" as const;

const MISSING_TABLE_HINT =
  "Run supabase/customer_notifications.sql in the Supabase SQL Editor to create public.customer_notifications.";

function isMissingCustomerNotificationsTable(error: {
  code?: string;
  message?: string;
}): boolean {
  const message = error.message?.toLowerCase() ?? "";
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    message.includes("customer_notifications") &&
      (message.includes("does not exist") || message.includes("could not find"))
  );
}

function formatCustomerNotificationError(error: {
  code?: string;
  message?: string;
}): string {
  if (isMissingCustomerNotificationsTable(error)) {
    return `Table public.customer_notifications is missing. ${MISSING_TABLE_HINT}`;
  }
  return error.message ?? "Unknown Supabase error";
}

function toInsertRow(input: CreateCustomerNotificationInput): DbCustomerNotificationInsert {
  return {
    organization_id: input.organizationId,
    customer_id: input.customerId,
    shipment_id: input.shipmentId ?? null,
    exception_id: input.exceptionId ?? null,
    type: input.type,
    title: input.title,
    message: input.message,
    status: "Unread",
  };
}

function toReadUpdateRow(readAt: string): DbCustomerNotificationUpdate {
  return {
    status: "Read" satisfies CustomerNotificationStatus,
    read_at: readAt,
  };
}

const CUSTOMER_NOTIFICATION_SELECT = `
  *,
  customer:customers (
    id,
    name
  ),
  shipment:shipments (
    id,
    shipment_number
  ),
  exception:exceptions (
    id,
    title
  )
`;

async function insertActivityForCustomerNotification(
  organizationId: string,
  exceptionId: string | undefined,
  message: string,
  eventType: "customer_notification_created" | "customer_notification_read",
): Promise<void> {
  if (!exceptionId) return;

  const supabase = getSupabaseClient();
  const { error } = await supabase.from("activity_events").insert({
    exception_id: exceptionId,
    organization_id: organizationId,
    event_type: eventType,
    message,
  });

  if (error) throw error;
}

export async function createCustomerNotification(
  input: CreateCustomerNotificationInput,
): Promise<string> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }

  const supabase = getSupabaseClient();
  const row = toInsertRow(input);
  const { data, error } = await supabase
    .from(CUSTOMER_NOTIFICATIONS_TABLE)
    .insert(row)
    .select("id")
    .single();

  if (error) {
    throw new Error(formatCustomerNotificationError(error));
  }

  await insertActivityForCustomerNotification(
    input.organizationId,
    input.exceptionId,
    `Customer notification sent: ${input.title}`,
    "customer_notification_created",
  );

  return data.id;
}

export async function markCustomerNotificationRead(
  notificationId: string,
  organizationId: string,
): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }

  const supabase = getSupabaseClient();
  const { data: existing, error: fetchError } = await supabase
    .from(CUSTOMER_NOTIFICATIONS_TABLE)
    .select("exception_id, title")
    .eq("id", notificationId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (fetchError) {
    throw new Error(formatCustomerNotificationError(fetchError));
  }

  const readAt = new Date().toISOString();
  const { error } = await supabase
    .from(CUSTOMER_NOTIFICATIONS_TABLE)
    .update(toReadUpdateRow(readAt))
    .eq("id", notificationId)
    .eq("organization_id", organizationId);

  if (error) {
    throw new Error(formatCustomerNotificationError(error));
  }

  if (existing?.exception_id) {
    await insertActivityForCustomerNotification(
      organizationId,
      existing.exception_id,
      `Customer read notification: ${existing.title}`,
      "customer_notification_read",
    );
  }
}

export async function markAllCustomerNotificationsRead(
  organizationId: string,
  customerId?: string,
): Promise<void> {
  if (!organizationId) {
    throw new Error("organization_id is required for mark all read");
  }

  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }

  const supabase = getSupabaseClient();
  const readAt = new Date().toISOString();

  let query = supabase
    .from(CUSTOMER_NOTIFICATIONS_TABLE)
    .update(toReadUpdateRow(readAt))
    .eq("organization_id", organizationId)
    .eq("status", "Unread");

  if (customerId) {
    query = query.eq("customer_id", customerId);
  }

  const { error } = await query;
  if (error) {
    throw new Error(formatCustomerNotificationError(error));
  }
}

export async function getCustomerNotificationsForOrganization(
  preferredOrganizationId?: string,
): Promise<DataResult<CustomerNotificationRecord[]>> {
  if (!isSupabaseConfigured()) {
    return { data: [], source: "mock", error: "Supabase not configured" };
  }

  const supabase = getSupabaseClient();
  const organizationId = await resolveOrganizationId(supabase, preferredOrganizationId);

  if (!organizationId) {
    return { data: [], source: "mock", error: "Organization not found" };
  }

  const { data, error } = await supabase
    .from(CUSTOMER_NOTIFICATIONS_TABLE)
    .select(CUSTOMER_NOTIFICATION_SELECT)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return {
      data: [],
      source: "mock",
      error: formatCustomerNotificationError(error),
    };
  }

  return {
    data: mapCustomerNotifications((data ?? []) as DbCustomerNotificationWithRelations[]),
    source: "supabase",
  };
}

export async function hasUnreadCustomerNotificationOfType(
  organizationId: string,
  customerId: string,
  type: string,
  shipmentUuid?: string,
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  const supabase = getSupabaseClient();
  let query = supabase
    .from(CUSTOMER_NOTIFICATIONS_TABLE)
    .select("id")
    .eq("organization_id", organizationId)
    .eq("customer_id", customerId)
    .eq("type", type)
    .eq("status", "Unread")
    .limit(1);

  if (shipmentUuid) {
    query = query.eq("shipment_id", shipmentUuid);
  }

  const { data, error } = await query;
  if (error) {
    if (isMissingCustomerNotificationsTable(error)) {
      console.warn("[FreightPulse] customer_notifications table missing", {
        organizationId,
        hint: MISSING_TABLE_HINT,
      });
      return false;
    }
    throw new Error(formatCustomerNotificationError(error));
  }
  return (data?.length ?? 0) > 0;
}

export async function lookupShipmentCustomerContext(
  shipmentUuid: string,
  organizationId: string,
): Promise<{
  customerId: string;
  customerName: string;
  shipmentNumber: string;
} | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("shipments")
    .select("shipment_number, customer:customers (id, name)")
    .eq("id", shipmentUuid)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error || !data?.customer) return null;

  const customer = Array.isArray(data.customer) ? data.customer[0] : data.customer;
  if (!customer || typeof customer !== "object" || !("id" in customer)) return null;

  return {
    customerId: String((customer as { id: string }).id),
    customerName: String((customer as { name: string }).name),
    shipmentNumber: data.shipment_number,
  };
}
