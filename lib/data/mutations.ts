import { CURRENT_USER, DEFAULT_AUTO_EXCEPTION_OWNER } from "@/lib/constants";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { throwReadableError } from "@/lib/supabase/format-error";
import type {
  CreateExceptionInput,
  IssueStatus,
  Severity,
  UpdateExceptionInput,
} from "@/lib/types";
import {
  buildCarrierExceptionNotificationInput,
  buildExceptionNotificationInput,
  buildResolutionNotificationInput,
} from "./notification-rules";
import { createNotification } from "./notifications";

export type ExceptionMutationContext = {
  shipmentId: string;
  title: string;
  previousStatus?: IssueStatus;
  actor?: string;
};

async function lookupShipmentUuid(
  shipmentNumber: string,
  organizationId: string,
): Promise<string | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("shipments")
    .select("id")
    .eq("shipment_number", shipmentNumber)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) throwReadableError(error);
  return data?.id ?? null;
}

async function insertActivityEvent(
  exceptionId: string,
  organizationId: string,
  eventType: string,
  message: string,
): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("activity_events").insert({
    exception_id: exceptionId,
    organization_id: organizationId,
    event_type: eventType,
    message,
  });

  if (error) throwReadableError(error);
}

async function notifyExceptionCreated(
  organizationId: string,
  exceptionId: string,
  shipmentNumber: string,
  title: string,
  severity: Severity,
  customerName?: string,
): Promise<void> {
  const input = buildExceptionNotificationInput(organizationId, {
    exceptionId,
    shipmentNumber,
    title,
    severity,
    customerName,
  });
  if (!input) return;

  try {
    await createNotification(input);
  } catch {
    // Notification failure should not block exception writes.
  }
}

async function notifyExceptionResolved(
  organizationId: string,
  exceptionId: string,
  shipmentNumber: string,
  title: string,
): Promise<void> {
  const input = buildResolutionNotificationInput(organizationId, {
    exceptionId,
    shipmentNumber,
    title,
  });

  try {
    await createNotification(input);
  } catch {
    // Notification failure should not block exception writes.
  }
}

export function isSupabaseWriteEnabled(): boolean {
  return isSupabaseConfigured();
}

export async function createExceptionInSupabase(
  input: CreateExceptionInput,
  organizationId: string,
  actor = CURRENT_USER,
): Promise<string> {
  const shipmentUuid = await lookupShipmentUuid(input.shipmentId, organizationId);
  if (!shipmentUuid) {
    throw new Error(`Shipment ${input.shipmentId} not found.`);
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("exceptions")
    .insert({
      shipment_id: shipmentUuid,
      organization_id: organizationId,
      title: input.title.trim(),
      severity: input.severity,
      status: input.status ?? "Open",
      owner: input.owner,
      delay_reason: input.delayReason.trim(),
      source: "manual",
    })
    .select("id")
    .single();

  if (error) throw error;

  await insertActivityEvent(
    data.id,
    organizationId,
    "action",
    `${actor} opened investigation on ${input.shipmentId} — ${input.title.trim()}`,
  );

  await notifyExceptionCreated(
    organizationId,
    data.id,
    input.shipmentId,
    input.title.trim(),
    input.severity,
  );

  return data.id;
}

export async function createAutoDetectedExceptionInSupabase(
  input: {
    shipmentUuid: string;
    shipmentNumber: string;
    title: string;
    severity: Severity;
    delayReason: string;
    owner?: string;
  },
  organizationId: string,
): Promise<string> {
  const supabase = getSupabaseClient();
  const owner = input.owner ?? DEFAULT_AUTO_EXCEPTION_OWNER;

  const { data, error } = await supabase
    .from("exceptions")
    .insert({
      shipment_id: input.shipmentUuid,
      organization_id: organizationId,
      title: input.title.trim(),
      severity: input.severity,
      status: "Open",
      owner,
      delay_reason: input.delayReason.trim(),
      source: "manual",
    })
    .select("id")
    .single();

  if (error) throw error;

  await insertActivityEvent(
    data.id,
    organizationId,
    "escalation",
    `Auto-detected ${input.severity} exception on ${input.shipmentNumber} — ${input.title.trim()}`,
  );

  await notifyExceptionCreated(
    organizationId,
    data.id,
    input.shipmentNumber,
    input.title.trim(),
    input.severity,
  );

  return data.id;
}

export async function createCarrierSyncExceptionInSupabase(
  input: {
    shipmentUuid: string;
    shipmentNumber: string;
    title: string;
    severity: Severity;
    delayReason: string;
    owner?: string;
  },
  organizationId: string,
): Promise<string> {
  const supabase = getSupabaseClient();
  const owner = input.owner ?? DEFAULT_AUTO_EXCEPTION_OWNER;

  const { data, error } = await supabase
    .from("exceptions")
    .insert({
      shipment_id: input.shipmentUuid,
      organization_id: organizationId,
      title: input.title.trim(),
      severity: input.severity,
      status: "Open",
      owner,
      delay_reason: input.delayReason.trim(),
      source: "carrier_sync",
    })
    .select("id")
    .single();

  if (error) throwReadableError(error);

  await insertActivityEvent(
    data.id,
    organizationId,
    "alert",
    `Carrier exception detected on ${input.shipmentNumber} — ${input.title.trim()}`,
  );

  const notificationInput = buildCarrierExceptionNotificationInput(organizationId, {
    exceptionId: data.id,
    shipmentNumber: input.shipmentNumber,
    title: input.title.trim(),
    severity: input.severity,
  });

  try {
    await createNotification(notificationInput);
  } catch {
    // Notification failure should not block carrier sync.
  }

  return data.id;
}

export async function updateExceptionInSupabase(
  dbId: string,
  patch: UpdateExceptionInput,
  context: ExceptionMutationContext,
  organizationId: string,
): Promise<void> {
  const updates: Record<string, unknown> = {};

  if (patch.title !== undefined) updates.title = patch.title;
  if (patch.severity !== undefined) updates.severity = patch.severity;
  if (patch.status !== undefined) updates.status = patch.status;
  if (patch.owner !== undefined) updates.owner = patch.owner;
  if (patch.delayReason !== undefined) updates.delay_reason = patch.delayReason;

  if (patch.status === "Resolved") {
    updates.resolved_at = new Date().toISOString();
  } else if (patch.status !== undefined) {
    updates.resolved_at = null;
  }

  if (Object.keys(updates).length === 0) return;

  const supabase = getSupabaseClient();
  const { error } = await supabase.from("exceptions").update(updates).eq("id", dbId);

  if (error) throw error;

  if (patch.status === "Resolved") {
    await insertActivityEvent(
      dbId,
      organizationId,
      "resolved",
      `Resolved exception on ${context.shipmentId} — ${context.title}`,
    );
    await notifyExceptionResolved(
      organizationId,
      dbId,
      context.shipmentId,
      context.title,
    );
  } else if (
    patch.status !== undefined &&
    patch.status !== context.previousStatus
  ) {
    await insertActivityEvent(
      dbId,
      organizationId,
      "update",
      `Status changed to ${patch.status} on ${context.shipmentId} — ${context.title}`,
    );
  }
}

export async function resolveExceptionInSupabase(
  dbId: string,
  context: ExceptionMutationContext,
  organizationId: string,
): Promise<void> {
  await updateExceptionInSupabase(dbId, { status: "Resolved" }, context, organizationId);
}

export async function deleteExceptionInSupabase(dbId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("exceptions").delete().eq("id", dbId);
  if (error) throw error;
}

export async function addExceptionNoteInSupabase(
  dbId: string,
  body: string,
  author: string,
  organizationId: string,
): Promise<string> {
  const trimmed = body.trim();
  if (!trimmed) {
    throw new Error("Note cannot be empty.");
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("exception_notes")
    .insert({
      exception_id: dbId,
      organization_id: organizationId,
      author,
      note: trimmed,
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

export async function updateExceptionNoteInSupabase(
  noteId: string,
  body: string,
): Promise<void> {
  const trimmed = body.trim();
  if (!trimmed) {
    throw new Error("Note cannot be empty.");
  }

  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("exception_notes")
    .update({ note: trimmed })
    .eq("id", noteId);

  if (error) throw error;
}

export async function deleteExceptionNoteInSupabase(noteId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("exception_notes").delete().eq("id", noteId);
  if (error) throw error;
}
