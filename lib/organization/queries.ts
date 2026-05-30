import type { SupabaseClient } from "@supabase/supabase-js";
import type { DbOrganization, DbUserProfile } from "@/lib/database.types";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { requireSupabaseSession } from "@/lib/supabase/session";
import {
  mapOrganization,
  mapUserProfile,
  type Organization,
  type OrganizationSession,
  type UserProfile,
} from "./types";

async function fetchUserProfileWithClient(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserProfile | null> {
  for (const column of ["user_id", "id"] as const) {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq(column, userId)
      .maybeSingle();

    if (error) {
      console.warn(
        `[FreightPulse] user_profiles lookup on ${column} failed:`,
        error.message,
      );
      continue;
    }
    if (data) return mapUserProfile(data as DbUserProfile);
  }

  return null;
}

async function fetchOrganizationWithClient(
  supabase: SupabaseClient,
  orgId: string,
): Promise<Organization | null> {
  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", orgId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return mapOrganization(data as DbOrganization);
}

export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  if (!isSupabaseConfigured()) return null;

  const { supabase } = await requireSupabaseSession();
  return fetchUserProfileWithClient(supabase, userId);
}

export async function fetchOrganization(orgId: string): Promise<Organization | null> {
  if (!isSupabaseConfigured()) return null;

  const { supabase } = await requireSupabaseSession();
  return fetchOrganizationWithClient(supabase, orgId);
}

export async function fetchOrganizationSession(): Promise<OrganizationSession | null> {
  if (!isSupabaseConfigured()) return null;

  const { supabase, user } = await requireSupabaseSession();
  const profile = await fetchUserProfileWithClient(supabase, user.id);
  if (!profile) return null;

  const organization = profile.organizationId
    ? await fetchOrganizationWithClient(supabase, profile.organizationId)
    : null;

  return {
    profile,
    organization,
    needsOnboarding: !profile.organizationId,
  };
}
