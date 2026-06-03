"use client";

import { useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { InviteUserModal } from "@/components/billing/invite-user-modal";
import { useSubscription } from "@/context/subscription-context";
import { badgeBase, btnPrimary, cardSurface, sectionLabel } from "@/lib/styles";
import type { UserRole } from "@/lib/billing/types";

const roleStyles: Record<UserRole, string> = {
  Admin: `${badgeBase} bg-violet-500/10 text-violet-300 ring-violet-500/20`,
  "Operations Manager": `${badgeBase} bg-sky-500/10 text-sky-300 ring-sky-500/20`,
  "Customer Success": `${badgeBase} bg-emerald-500/10 text-emerald-400 ring-emerald-500/20`,
  Viewer: `${badgeBase} bg-zinc-500/10 text-zinc-400 ring-zinc-500/20`,
};

export function UsersPage() {
  const { teamMembers, inviteUser } = useSubscription();
  const [inviteOpen, setInviteOpen] = useState(false);

  return (
    <DashboardShell
      eyebrow="Team access"
      title="Users"
      description="Manage team members and roles for your organization"
      actions={
        <button type="button" onClick={() => setInviteOpen(true)} className={btnPrimary}>
          Invite user
        </button>
      }
    >
      <div className={`${cardSurface} overflow-hidden`}>
        <div className="border-b border-white/[0.06] px-5 py-4 sm:px-6">
          <p className="text-sm font-semibold text-white">Team members</p>
          <p className="mt-1 text-xs text-zinc-500">
            {teamMembers.length} user{teamMembers.length !== 1 ? "s" : ""} in your organization
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                <th className={`px-5 py-3 ${sectionLabel}`}>Name</th>
                <th className={`px-5 py-3 ${sectionLabel}`}>Email</th>
                <th className={`px-5 py-3 ${sectionLabel}`}>Role</th>
                <th className={`px-5 py-3 ${sectionLabel}`}>Status</th>
              </tr>
            </thead>
            <tbody>
              {teamMembers.map((member) => (
                <tr
                  key={member.id}
                  className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]"
                >
                  <td className="px-5 py-3.5 font-medium text-zinc-200">{member.name}</td>
                  <td className="px-5 py-3.5 text-zinc-400">{member.email}</td>
                  <td className="px-5 py-3.5">
                    <span className={roleStyles[member.role]}>{member.role}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={
                        member.status === "invited"
                          ? `${badgeBase} bg-amber-500/10 text-amber-400 ring-amber-500/20`
                          : `${badgeBase} bg-emerald-500/10 text-emerald-400 ring-emerald-500/20`
                      }
                    >
                      {member.status === "invited" ? "Invited" : "Active"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-4 text-xs text-zinc-600">
        Demo mode — user invitations are stored locally and do not send real emails.
      </p>

      <InviteUserModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvite={inviteUser}
      />
    </DashboardShell>
  );
}
