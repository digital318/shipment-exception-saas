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
    slug: slugifyOrganizationName(row.name),
    opsEmail: row.operations_email,
    timezone: row.timezone,
  };
}

export function mapUserProfile(row: DbUserProfile): UserProfile {
  return {
    id: row.user_id,
    organizationId: row.organization_id,
    displayName: row.display_name,
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
