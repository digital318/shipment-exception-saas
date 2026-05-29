import { CURRENT_USER } from "@/lib/constants";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import type { CreateExceptionInput, IssueStatus, UpdateExceptionInput } from "@/lib/types";

export type ExceptionMutationContext = {
  shipmentId: string;
  title: string;
  previousStatus?: IssueStatus;
  actor?: string;
};

async function lookupShipmentUuid(shipmentNumber: string): Promise<string | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("shipments")
    .select("id")
    .eq("shipment_number", shipmentNumber)
    .maybeSingle();

  if (error) throw error;
  return data?.id ?? null;
}

async function insertActivityEvent(
  exceptionId: string,
  eventType: string,
  message: string,
): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("activity_events").insert({
    exception_id: exceptionId,
    event_type: eventType,
    message,
  });

  if (error) throw error;
}

export function isSupabaseWriteEnabled(): boolean {
  return isSupabaseConfigured();
}

export async function createExceptionInSupabase(
  input: CreateExceptionInput,
  actor = CURRENT_USER,
): Promise<string> {
  const shipmentUuid = await lookupShipmentUuid(input.shipmentId);
  if (!shipmentUuid) {
    throw new Error(`Shipment ${input.shipmentId} not found.`);
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("exceptions")
    .insert({
      shipment_id: shipmentUuid,
      title: input.title.trim(),
      severity: input.severity,
      status: input.status ?? "Open",
      owner: input.owner,
      delay_reason: input.delayReason.trim(),
    })
    .select("id")
    .single();

  if (error) throw error;

  await insertActivityEvent(
    data.id,
    "action",
    `${actor} opened investigation on ${input.shipmentId} — ${input.title.trim()}`,
  );

  return data.id;
}

export async function updateExceptionInSupabase(
  dbId: string,
  patch: UpdateExceptionInput,
  context: ExceptionMutationContext,
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
      "resolved",
      `Resolved exception on ${context.shipmentId} — ${context.title}`,
    );
  } else if (
    patch.status !== undefined &&
    patch.status !== context.previousStatus
  ) {
    await insertActivityEvent(
      dbId,
      "update",
      `Status changed to ${patch.status} on ${context.shipmentId} — ${context.title}`,
    );
  }
}

export async function resolveExceptionInSupabase(
  dbId: string,
  context: ExceptionMutationContext,
): Promise<void> {
  await updateExceptionInSupabase(dbId, { status: "Resolved" }, context);
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
