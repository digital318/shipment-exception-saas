import { CURRENT_USER } from "@/lib/constants";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { throwReadableError } from "@/lib/supabase/format-error";
import type { ActivityType } from "@/lib/types";

export type SaasActivityKind =
  | "plan_change"
  | "user_invited"
  | "organization_updated";

const SAAS_ACTIVITY_TYPES: SaasActivityKind[] = [
  "plan_change",
  "user_invited",
  "organization_updated",
];

export function isSaasActivityType(type: string): type is SaasActivityKind {
  return SAAS_ACTIVITY_TYPES.includes(type as SaasActivityKind);
}

export function buildPlanChangeMessage(fromPlan: string, toPlan: string): string {
  return `${CURRENT_USER} changed subscription plan from ${fromPlan} to ${toPlan}`;
}

export function buildUserInvitedMessage(email: string, role: string): string {
  return `${CURRENT_USER} invited ${email} as ${role}`;
}

export function buildOrganizationUpdatedMessage(field: string): string {
  return `${CURRENT_USER} updated organization ${field}`;
}

export async function insertSaasActivityEvent(
  organizationId: string,
  exceptionDbId: string | undefined,
  kind: SaasActivityKind,
  message: string,
): Promise<void> {
  if (!isSupabaseConfigured() || !exceptionDbId) return;

  const supabase = getSupabaseClient();
  const { error } = await supabase.from("activity_events").insert({
    exception_id: exceptionDbId,
    organization_id: organizationId,
    event_type: kind,
    message,
  });

  if (error) throwReadableError(error);
}

export function saasActivityToType(kind: SaasActivityKind): ActivityType {
  return kind;
}
