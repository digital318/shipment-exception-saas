import { getCurrentActor } from "@/lib/auth/session";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { throwReadableError } from "@/lib/supabase/format-error";
import type { ActivityType } from "@/lib/types";

export type SaasActivityKind =
  | "plan_change"
  | "user_invited"
  | "organization_updated"
  | "role_changed"
  | "user_disabled"
  | "user_reactivated";

const SAAS_ACTIVITY_TYPES: SaasActivityKind[] = [
  "plan_change",
  "user_invited",
  "organization_updated",
  "role_changed",
  "user_disabled",
  "user_reactivated",
];

export function isSaasActivityType(type: string): type is SaasActivityKind {
  return SAAS_ACTIVITY_TYPES.includes(type as SaasActivityKind);
}

function actor(): string {
  return getCurrentActor();
}

export function buildPlanChangeMessage(fromPlan: string, toPlan: string): string {
  return `${actor()} changed subscription plan from ${fromPlan} to ${toPlan}`;
}

export function buildUserInvitedMessage(name: string, email: string, role: string): string {
  return `${actor()} invited ${name} (${email}) as ${role}`;
}

export function buildOrganizationUpdatedMessage(field: string): string {
  return `${actor()} updated organization ${field}`;
}

export function buildRoleChangedMessage(
  userName: string,
  fromRole: string,
  toRole: string,
): string {
  return `${actor()} changed role for ${userName} from ${fromRole} to ${toRole}`;
}

export function buildUserDisabledMessage(userName: string): string {
  return `${actor()} disabled user ${userName}`;
}

export function buildUserReactivatedMessage(userName: string): string {
  return `${actor()} reactivated user ${userName}`;
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
