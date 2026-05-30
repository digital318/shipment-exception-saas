"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export type CreateOrganizationInput = {
  name: string;
  opsEmail?: string;
  timezone?: string;
};

export async function createOrganizationForUser(
  input: CreateOrganizationInput,
): Promise<{ organizationId: string }> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }

  const name = input.name.trim();
  if (name.length < 2) {
    throw new Error("Organization name must be at least 2 characters.");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw authError;
  if (!user) {
    throw new Error("You must be signed in to create an organization.");
  }

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({
      name,
      operations_email: input.opsEmail?.trim() || null,
      timezone: input.timezone ?? "America/New_York",
    })
    .select("id")
    .single();

  if (orgError) {
    if (orgError.code === "23505") {
      throw new Error("An organization with a similar name already exists. Try a different name.");
    }
    throw orgError;
  }

  const { error: profileError } = await supabase.from("user_profiles").upsert(
    {
      user_id: user.id,
      organization_id: org.id,
      email: user.email ?? input.opsEmail?.trim() ?? "",
    },
    { onConflict: "user_id" },
  );

  if (profileError) throw profileError;

  return { organizationId: org.id };
}

export async function updateOrganization(
  organizationId: string,
  patch: {
    name?: string;
    opsEmail?: string;
    timezone?: string;
  },
): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }

  const updates: Record<string, string | null> = {};
  if (patch.name !== undefined) updates.name = patch.name.trim();
  if (patch.opsEmail !== undefined) updates.operations_email = patch.opsEmail.trim() || null;
  if (patch.timezone !== undefined) updates.timezone = patch.timezone;

  if (Object.keys(updates).length === 0) return;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw authError;
  if (!user) {
    throw new Error("You must be signed in to update organization settings.");
  }

  const { error } = await supabase
    .from("organizations")
    .update(updates)
    .eq("id", organizationId);

  if (error) throw error;
}
