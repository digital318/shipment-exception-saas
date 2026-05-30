import type { DbOrganization, DbUserProfile } from "@/lib/database.types";

export type Organization = {
  id: string;
  name: string;
  slug: string;
  opsEmail: string | null;
  timezone: string;
};

export type UserProfile = {
  id: string;
  organizationId: string | null;
  displayName: string | null;
  role: DbUserProfile["role"];
};

export type OrganizationSession = {
  profile: UserProfile;
  organization: Organization | null;
  needsOnboarding: boolean;
};

export function mapOrganization(row: DbOrganization): Organization {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug ?? slugifyOrganizationName(row.name),
    opsEmail: row.operations_email ?? row.ops_email ?? null,
    timezone: row.timezone,
  };
}

export function mapUserProfile(row: DbUserProfile & { id?: string }): UserProfile {
  const organizationId =
    row.organization_id ??
    (row as { organizationId?: string | null }).organizationId ??
    (row as { org_id?: string | null }).org_id ??
    (row as { orgId?: string | null }).orgId ??
    null;

  return {
    id: row.user_id ?? row.id ?? "",
    organizationId,
    displayName: row.display_name ?? (row as { displayName?: string }).displayName ?? null,
    role: row.role,
  };
}

export function slugifyOrganizationName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}
