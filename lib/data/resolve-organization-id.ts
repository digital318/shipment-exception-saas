import type { SupabaseClient } from "@supabase/supabase-js";

const LOG_PREFIX = "[FreightPulse] resolveOrganizationId";

type ProfileOrgRow = {
  organization_id?: string | null;
  organizationId?: string | null;
  org_id?: string | null;
  orgId?: string | null;
  tenant_id?: string | null;
  tenantId?: string | null;
};

/** Normalize org id from a DB row that may use snake_case or camelCase. */
export function readOrganizationId(
  row: ProfileOrgRow | null | undefined,
): string | null {
  if (!row) return null;
  const id =
    row.organization_id ??
    row.organizationId ??
    row.org_id ??
    row.orgId ??
    row.tenant_id ??
    row.tenantId ??
    null;
  return typeof id === "string" && id.length > 0 ? id : null;
}

/**
 * Resolves the tenant organization id for the signed-in user.
 * Tries the passed id first, then user_profiles (user_id and id columns).
 */
export async function resolveOrganizationId(
  supabase: SupabaseClient,
  preferredId?: string | null,
): Promise<string | null> {
  if (preferredId) {
    console.info(LOG_PREFIX, "using passed organization id", {
      organization_id: preferredId,
      organizationId: preferredId,
    });
    return preferredId;
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.warn(LOG_PREFIX, "no authenticated user", authError?.message ?? "signed out");
    return null;
  }

  for (const column of ["user_id", "id"] as const) {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq(column, user.id)
      .maybeSingle();

    if (error) {
      console.warn(LOG_PREFIX, `profile lookup on ${column} failed`, error.message);
      continue;
    }

    if (data) {
      const organizationId = readOrganizationId(data as ProfileOrgRow);
      console.info(LOG_PREFIX, "user_profiles row", {
        lookupColumn: column,
        rawRow: data,
        organization_id: (data as ProfileOrgRow).organization_id ?? null,
        organizationId: (data as ProfileOrgRow).organizationId ?? null,
        resolvedOrganizationId: organizationId,
      });
      if (organizationId) return organizationId;
    }
  }

  console.warn(LOG_PREFIX, "organization_id not found on user profile", { userId: user.id });
  return null;
}

/** Debug helper: compare profile org id with customer rows in Supabase. */
export async function logOrganizationCustomerComparison(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<void> {
  const { data: profileRows } = await supabase
    .from("user_profiles")
    .select("organization_id, organizationId, user_id, id")
    .limit(1);

  const { data: filteredCustomers, error: filteredError } = await supabase
    .from("customers")
    .select("id, name, organization_id")
    .eq("organization_id", organizationId);

  const { data: rlsCustomers, error: rlsError } = await supabase
    .from("customers")
    .select("id, name, organization_id")
    .limit(20);

  console.info("[FreightPulse] organization vs customers comparison", {
    queryOrganizationId: organizationId,
    profileSample: profileRows?.[0] ?? null,
    filteredCount: filteredCustomers?.length ?? 0,
    filteredError: filteredError?.message ?? null,
    filteredOrgIds: [...new Set((filteredCustomers ?? []).map((c) => c.organization_id))],
    rlsCount: rlsCustomers?.length ?? 0,
    rlsError: rlsError?.message ?? null,
    rlsOrgIds: [...new Set((rlsCustomers ?? []).map((c) => c.organization_id))],
    idMatch:
      (rlsCustomers ?? []).length > 0
        ? (rlsCustomers ?? []).every((c) => c.organization_id === organizationId)
        : null,
  });
}
