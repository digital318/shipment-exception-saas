"use client";

import { useSubscription } from "@/context/subscription-context";
import type { UserRole } from "@/lib/auth/roles";
import { SectionHeading } from "@/components/ui/section-heading";
import { badgeBase, cardSurface, sectionLabel } from "@/lib/styles";

const roleBadgeStyles: Record<UserRole, string> = {
  Admin: `${badgeBase} bg-violet-500/10 text-violet-300 ring-violet-500/20`,
  "Operations Manager": `${badgeBase} bg-sky-500/10 text-sky-300 ring-sky-500/20`,
  "Customer Success": `${badgeBase} bg-emerald-500/10 text-emerald-400 ring-emerald-500/20`,
  Viewer: `${badgeBase} bg-zinc-500/10 text-zinc-400 ring-zinc-500/20`,
  "Customer User": `${badgeBase} bg-amber-500/10 text-amber-400 ring-amber-500/20`,
};

export function UserActivitySummary() {
  const { teamMembers, invitations } = useSubscription();

  const activeUsers = teamMembers.filter(
    (m) => m.status === "active" && !invitations.some((i) => i.id === m.id),
  ).length;

  const pendingInvites = invitations.filter((i) => i.status === "Pending").length;

  const roleDistribution = teamMembers.reduce<Record<string, number>>((acc, m) => {
    acc[m.role] = (acc[m.role] ?? 0) + 1;
    return acc;
  }, {});

  const roles = Object.entries(roleDistribution).sort((a, b) => b[1] - a[1]);

  return (
    <section aria-label="User activity summary">
      <SectionHeading
        title="User activity summary"
        description="Organization-scoped team access and invitation pipeline"
      />
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <article className={`${cardSurface} p-5`}>
          <p className={sectionLabel}>Active users</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-white">{activeUsers}</p>
          <p className="mt-1 text-xs text-zinc-500">Enabled accounts in this organization</p>
        </article>
        <article className={`${cardSurface} p-5`}>
          <p className={sectionLabel}>Pending invites</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-amber-400">
            {pendingInvites}
          </p>
          <p className="mt-1 text-xs text-zinc-500">Awaiting acceptance</p>
        </article>
        <article className={`${cardSurface} p-5`}>
          <p className={sectionLabel}>Total team</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-white">
            {teamMembers.length}
          </p>
          <p className="mt-1 text-xs text-zinc-500">Members + pending invitations</p>
        </article>
      </div>

      <div className={`${cardSurface} mt-4 p-5 sm:p-6`}>
        <p className="text-sm font-semibold text-white">Role distribution</p>
        <ul className="mt-4 space-y-3">
          {roles.length === 0 ? (
            <li className="text-sm text-zinc-500">No team members</li>
          ) : (
            roles.map(([role, count]) => (
              <li key={role} className="flex items-center justify-between gap-4">
                <span className={roleBadgeStyles[role as UserRole]}>{role}</span>
                <span className="text-sm font-medium tabular-nums text-zinc-300">{count}</span>
              </li>
            ))
          )}
        </ul>
      </div>
    </section>
  );
}
