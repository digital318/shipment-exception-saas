import { CURRENT_USER } from "@/lib/constants";
import {
  assignPlaybook,
  computeNextFollowUp,
  formatEscalationLevel,
  getRecommendedAction,
  nextEscalationLevel,
  type PlaybookAssignmentInput,
} from "@/lib/playbooks";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { throwReadableError } from "@/lib/supabase/format-error";
import type {
  CreateExceptionInput,
  EscalationLevel,
  IssueStatus,
  PlaybookType,
  Severity,
  UpdateExceptionInput,
} from "@/lib/types";
import {
  buildCarrierExceptionNotificationInput,
  buildExceptionNotificationInput,
  buildResolutionNotificationInput,
} from "./notification-rules";
import { createNotification } from "./notifications";
import { lookupShipmentCustomerContext } from "./customer-notifications";
import {
  notifyCustomerOnExceptionCreated,
  notifyCustomerOnExceptionStatusChange,
} from "./customer-notification-triggers";

export type ExceptionMutationContext = {
  shipmentId: string;
  title: string;
  previousStatus?: IssueStatus;
  actor?: string;
  severity?: Severity;
  playbookType?: PlaybookType;
  escalationLevel?: EscalationLevel;
};

function buildPlaybookFields(input: PlaybookAssignmentInput) {
  const assignment = assignPlaybook(input);
  return {
    owner: assignment.owner,
    playbook_type: assignment.playbookType,
    escalation_level: assignment.escalationLevel,
    recommended_action: assignment.recommendedAction,
    next_follow_up_at: assignment.nextFollowUpAt,
    assignment,
  };
}

async function insertPlaybookAssignedActivity(
  exceptionId: string,
  organizationId: string,
  shipmentNumber: string,
  assignment: ReturnType<typeof assignPlaybook>,
): Promise<void> {
  await insertActivityEvent(
    exceptionId,
    organizationId,
    "action",
    `Playbook assigned — ${assignment.playbookType} (${formatEscalationLevel(assignment.escalationLevel)}) · Owner: ${assignment.owner} · ${shipmentNumber}`,
  );
}

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
  const playbook = buildPlaybookFields({
    title: input.title.trim(),
    delayReason: input.delayReason.trim(),
    severity: input.severity,
    source: "Manual",
  });

  const { data, error } = await supabase
    .from("exceptions")
    .insert({
      shipment_id: shipmentUuid,
      organization_id: organizationId,
      title: input.title.trim(),
      severity: input.severity,
      status: input.status ?? "Open",
      owner: playbook.owner,
      delay_reason: input.delayReason.trim(),
      source: "manual",
      playbook_type: playbook.playbook_type,
      escalation_level: playbook.escalation_level,
      recommended_action: playbook.recommended_action,
      next_follow_up_at: playbook.next_follow_up_at,
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

  await insertPlaybookAssignedActivity(
    data.id,
    organizationId,
    input.shipmentId,
    playbook.assignment,
  );

  await notifyExceptionCreated(
    organizationId,
    data.id,
    input.shipmentId,
    input.title.trim(),
    input.severity,
  );

  await notifyCustomerOnExceptionCreated(
    organizationId,
    data.id,
    shipmentUuid,
    input.title.trim(),
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
    rule?: PlaybookAssignmentInput["rule"];
  },
  organizationId: string,
): Promise<string> {
  const supabase = getSupabaseClient();
  const playbook = buildPlaybookFields({
    title: input.title.trim(),
    delayReason: input.delayReason.trim(),
    severity: input.severity,
    source: "Manual",
    rule: input.rule,
  });

  const { data, error } = await supabase
    .from("exceptions")
    .insert({
      shipment_id: input.shipmentUuid,
      organization_id: organizationId,
      title: input.title.trim(),
      severity: input.severity,
      status: "Open",
      owner: playbook.owner,
      delay_reason: input.delayReason.trim(),
      source: "manual",
      playbook_type: playbook.playbook_type,
      escalation_level: playbook.escalation_level,
      recommended_action: playbook.recommended_action,
      next_follow_up_at: playbook.next_follow_up_at,
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

  await insertPlaybookAssignedActivity(
    data.id,
    organizationId,
    input.shipmentNumber,
    playbook.assignment,
  );

  await notifyExceptionCreated(
    organizationId,
    data.id,
    input.shipmentNumber,
    input.title.trim(),
    input.severity,
  );

  if (input.shipmentUuid) {
    await notifyCustomerOnExceptionCreated(
      organizationId,
      data.id,
      input.shipmentUuid,
      input.title.trim(),
    );
  }

  return data.id;
}

export async function createCarrierSyncExceptionInSupabase(
  input: {
    shipmentUuid: string;
    shipmentNumber: string;
    title: string;
    severity: Severity;
    delayReason: string;
  },
  organizationId: string,
): Promise<string> {
  const supabase = getSupabaseClient();
  const playbook = buildPlaybookFields({
    title: input.title.trim(),
    delayReason: input.delayReason.trim(),
    severity: input.severity,
    source: "Carrier Sync",
  });

  const { data, error } = await supabase
    .from("exceptions")
    .insert({
      shipment_id: input.shipmentUuid,
      organization_id: organizationId,
      title: input.title.trim(),
      severity: input.severity,
      status: "Open",
      owner: playbook.owner,
      delay_reason: input.delayReason.trim(),
      source: "carrier_sync",
      playbook_type: playbook.playbook_type,
      escalation_level: playbook.escalation_level,
      recommended_action: playbook.recommended_action,
      next_follow_up_at: playbook.next_follow_up_at,
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

  await insertPlaybookAssignedActivity(
    data.id,
    organizationId,
    input.shipmentNumber,
    playbook.assignment,
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

  await notifyCustomerOnExceptionCreated(
    organizationId,
    data.id,
    input.shipmentUuid,
    input.title.trim(),
  );

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
  if (patch.playbookType !== undefined) updates.playbook_type = patch.playbookType;
  if (patch.escalationLevel !== undefined) updates.escalation_level = patch.escalationLevel;
  if (patch.recommendedAction !== undefined) updates.recommended_action = patch.recommendedAction;
  if (patch.nextFollowUpAt !== undefined) updates.next_follow_up_at = patch.nextFollowUpAt;

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

  if (patch.status !== undefined && patch.status !== context.previousStatus) {
    const shipmentUuid = await lookupShipmentUuid(context.shipmentId, organizationId);
    if (shipmentUuid) {
      const customerCtx = await lookupShipmentCustomerContext(shipmentUuid, organizationId);
      if (customerCtx) {
        try {
          await notifyCustomerOnExceptionStatusChange(
            organizationId,
            dbId,
            shipmentUuid,
            customerCtx.shipmentNumber,
            customerCtx.customerId,
            customerCtx.customerName,
            context.title,
            patch.status,
            context.previousStatus,
          );
        } catch {
          // Customer notification failure should not block exception writes.
        }
      }
    }
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

export async function completeFollowUpInSupabase(
  dbId: string,
  context: ExceptionMutationContext,
  organizationId: string,
  actor = CURRENT_USER,
): Promise<void> {
  if (!context.severity) {
    throw new Error("Severity is required to schedule the next follow-up.");
  }

  const nextFollowUpAt = computeNextFollowUp(context.severity);
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("exceptions")
    .update({ next_follow_up_at: nextFollowUpAt })
    .eq("id", dbId);

  if (error) throw error;

  await insertActivityEvent(
    dbId,
    organizationId,
    "update",
    `${actor} completed follow-up on ${context.shipmentId} — next check scheduled`,
  );
}

export async function escalatePlaybookInSupabase(
  dbId: string,
  context: ExceptionMutationContext,
  organizationId: string,
  actor = CURRENT_USER,
): Promise<void> {
  const currentLevel = (context.escalationLevel ?? 1) as EscalationLevel;
  const nextLevel = nextEscalationLevel(currentLevel);
  if (!nextLevel || !context.playbookType) {
    throw new Error("Exception is already at maximum escalation level.");
  }

  const recommendedAction = getRecommendedAction(context.playbookType, nextLevel);
  const updates: Record<string, unknown> = {
    escalation_level: nextLevel,
    recommended_action: recommendedAction,
    status: "Escalated",
  };

  if (context.severity) {
    updates.next_follow_up_at = computeNextFollowUp(context.severity);
  }

  const supabase = getSupabaseClient();
  const { error } = await supabase.from("exceptions").update(updates).eq("id", dbId);

  if (error) throw error;

  await insertActivityEvent(
    dbId,
    organizationId,
    "escalation",
    `${actor} escalated exception on ${context.shipmentId} to ${formatEscalationLevel(nextLevel)}`,
  );
}
