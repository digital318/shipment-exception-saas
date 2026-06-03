"use client";

import { useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { InviteUserModal } from "@/components/billing/invite-user-modal";
import { useAuthRole } from "@/context/auth-role-context";
import { useSubscription } from "@/context/subscription-context";
import { INVITABLE_ROLES, type UserRole } from "@/lib/auth/roles";
import { badgeBase, btnPrimary, btnSecondary, cardSurface, sectionLabel } from "@/lib/styles";

const roleStyles: Record<UserRole, string> = {
  Admin: `${badgeBase} bg-violet-500/10 text-violet-300 ring-violet-500/20`,
  "Operations Manager": `${badgeBase} bg-sky-500/10 text-sky-300 ring-sky-500/20`,
  "Customer Success": `${badgeBase} bg-emerald-500/10 text-emerald-400 ring-emerald-500/20`,
  Viewer: `${badgeBase} bg-zinc-500/10 text-zinc-400 ring-zinc-500/20`,
  "Customer User": `${badgeBase} bg-amber-500/10 text-amber-400 ring-amber-500/20`,
};

function statusLabel(status: string): string {
  if (status === "disabled") return "Disabled";
  if (status === "pending") return "Pending";
  return "Active";
}

export function UsersPage() {
  const { isAdmin, currentUser } = useAuthRole();
  const {
    teamMembers,
    invitations,
    inviteUser,
    changeUserRole,
    disableUser,
    reactivateUser,
  } = useSubscription();
  const [inviteOpen, setInviteOpen] = useState(false);

  if (!isAdmin) {
    return (
      <DashboardShell
        eyebrow="Team access"
        title="Users"
        description="Admin access required"
      >
        <p className="text-sm text-zinc-500">
          Only organization administrators can manage users and invitations.
        </p>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      eyebrow="Team access"
      title="Users"
      description="Manage team members, roles, and invitations for your organization"
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
            {teamMembers.length} user{teamMembers.length !== 1 ? "s" : ""} ·{" "}
            {invitations.filter((i) => i.status === "Pending").length} pending invite
            {invitations.filter((i) => i.status === "Pending").length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                <th className={`px-5 py-3 ${sectionLabel}`}>Name</th>
                <th className={`px-5 py-3 ${sectionLabel}`}>Email</th>
                <th className={`px-5 py-3 ${sectionLabel}`}>Role</th>
                <th className={`px-5 py-3 ${sectionLabel}`}>Status</th>
                <th className={`px-5 py-3 ${sectionLabel}`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {teamMembers.map((member) => {
                const isSelf = member.id === currentUser.id;
                const isInviteRow = member.status === "pending";
                return (
                  <tr
                    key={member.id}
                    className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]"
                  >
                    <td className="px-5 py-3.5 font-medium text-zinc-200">{member.name}</td>
                    <td className="px-5 py-3.5 text-zinc-400">{member.email}</td>
                    <td className="px-5 py-3.5">
                      {isInviteRow ? (
                        <span className={roleStyles[member.role]}>{member.role}</span>
                      ) : (
                        <select
                          value={member.role}
                          disabled={isSelf}
                          onChange={(e) =>
                            void changeUserRole(member.id, e.target.value as UserRole)
                          }
                          className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-xs text-zinc-300"
                        >
                          {INVITABLE_ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={
                          member.status === "disabled"
                            ? `${badgeBase} bg-rose-500/10 text-rose-400 ring-rose-500/20`
                            : member.status === "pending"
                              ? `${badgeBase} bg-amber-500/10 text-amber-400 ring-amber-500/20`
                              : `${badgeBase} bg-emerald-500/10 text-emerald-400 ring-emerald-500/20`
                        }
                      >
                        {statusLabel(member.status)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {!isInviteRow && !isSelf && (
                        <div className="flex gap-2">
                          {member.status === "disabled" ? (
                            <button
                              type="button"
                              onClick={() => void reactivateUser(member.id)}
                              className={btnSecondary}
                            >
                              Reactivate
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void disableUser(member.id)}
                              className={`${btnSecondary} text-rose-400 hover:text-rose-300`}
                            >
                              Disable
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {invitations.length > 0 && (
        <div className={`${cardSurface} mt-6 overflow-hidden`}>
          <div className="border-b border-white/[0.06] px-5 py-4 sm:px-6">
            <p className="text-sm font-semibold text-white">Invitations</p>
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
                {invitations.map((inv) => (
                  <tr
                    key={inv.id}
                    className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]"
                  >
                    <td className="px-5 py-3.5 font-medium text-zinc-200">{inv.name}</td>
                    <td className="px-5 py-3.5 text-zinc-400">{inv.email}</td>
                    <td className="px-5 py-3.5">
                      <span className={roleStyles[inv.role]}>{inv.role}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={
                          inv.status === "Expired"
                            ? `${badgeBase} bg-zinc-500/10 text-zinc-500 ring-zinc-500/20`
                            : inv.status === "Accepted"
                              ? `${badgeBase} bg-emerald-500/10 text-emerald-400 ring-emerald-500/20`
                              : `${badgeBase} bg-amber-500/10 text-amber-400 ring-amber-500/20`
                        }
                      >
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="mt-4 text-xs text-zinc-600">
        Demo mode — invitations and user changes are stored locally per organization.
      </p>

      <InviteUserModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvite={inviteUser}
      />
    </DashboardShell>
  );
}
