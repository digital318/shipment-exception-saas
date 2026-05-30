"use client";

import { useOrganization } from "@/context/organization-context";
import { sectionLabel } from "@/lib/styles";

export function OrganizationSelector() {
  const { organization, loading } = useOrganization();

  if (loading) {
    return (
      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
        <p className={sectionLabel}>Organization</p>
        <p className="mt-1 text-xs text-zinc-600">Loading…</p>
      </div>
    );
  }

  if (!organization) return null;

  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
      <p className={sectionLabel}>Organization</p>
      <p
        className="mt-1 truncate text-xs font-medium text-zinc-200"
        title={organization.name}
      >
        {organization.name}
      </p>
      <p className="mt-0.5 truncate text-[10px] text-zinc-600">{organization.slug}</p>
    </div>
  );
}
