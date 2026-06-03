import { DEMO_USERS } from "@/lib/auth/roles";
import type {
  OrganizationSettings,
  SubscriptionState,
  TeamMember,
  TeamMemberOverride,
  UserInvitation,
  UserRole,
} from "./types";

const SUBSCRIPTION_KEY = "freightpulse:subscription";
const INVITATIONS_KEY = "freightpulse:invitations";
const ORG_SETTINGS_KEY = "freightpulse:org-settings";
const TEAM_OVERRIDES_KEY = "freightpulse:team-overrides";

const INVITATION_EXPIRY_DAYS = 14;

function storageKey(base: string, orgId: string): string {
  return `${base}:${orgId}`;
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function defaultSubscriptionState(): SubscriptionState {
  const trialStartedAt = new Date();
  trialStartedAt.setDate(trialStartedAt.getDate() - 2);
  return {
    planId: "professional",
    status: "trialing",
    trialStartedAt: trialStartedAt.toISOString(),
    trialDaysTotal: 14,
  };
}

export function defaultOrganizationSettings(): OrganizationSettings {
  return {
    industry: "Freight & Logistics",
    primaryContact: "Sarah Chen",
    slaOnTimeTarget: "97",
    slaCriticalHours: "4",
    slaEscalationHours: "24",
  };
}

export const DEFAULT_TEAM: TeamMember[] = DEMO_USERS.map((u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  status: "active" as const,
  customerAccount: u.customerAccount,
}));

export function loadSubscription(orgId: string): SubscriptionState {
  return readJson(storageKey(SUBSCRIPTION_KEY, orgId), defaultSubscriptionState());
}

export function saveSubscription(orgId: string, state: SubscriptionState): void {
  writeJson(storageKey(SUBSCRIPTION_KEY, orgId), state);
}

export function loadInvitations(orgId: string): UserInvitation[] {
  const invites = readJson<UserInvitation[]>(storageKey(INVITATIONS_KEY, orgId), []);
  return invites.map(refreshInvitationStatus);
}

export function saveInvitations(orgId: string, invitations: UserInvitation[]): void {
  writeJson(storageKey(INVITATIONS_KEY, orgId), invitations);
}

export function loadTeamOverrides(orgId: string): Record<string, TeamMemberOverride> {
  return readJson(storageKey(TEAM_OVERRIDES_KEY, orgId), {});
}

export function saveTeamOverrides(
  orgId: string,
  overrides: Record<string, TeamMemberOverride>,
): void {
  writeJson(storageKey(TEAM_OVERRIDES_KEY, orgId), overrides);
}

export function loadOrganizationSettings(orgId: string): OrganizationSettings {
  return readJson(storageKey(ORG_SETTINGS_KEY, orgId), defaultOrganizationSettings());
}

export function saveOrganizationSettings(orgId: string, settings: OrganizationSettings): void {
  writeJson(storageKey(ORG_SETTINGS_KEY, orgId), settings);
}

export function computeTrialDaysRemaining(state: SubscriptionState): number {
  const start = new Date(state.trialStartedAt).getTime();
  const elapsed = Math.floor((Date.now() - start) / (1000 * 60 * 60 * 24));
  return Math.max(0, state.trialDaysTotal - elapsed);
}

export function refreshInvitationStatus(invite: UserInvitation): UserInvitation {
  if (invite.status === "Accepted") return invite;
  const invited = new Date(invite.invitedAt).getTime();
  const elapsedDays = Math.floor((Date.now() - invited) / (1000 * 60 * 60 * 24));
  if (elapsedDays >= INVITATION_EXPIRY_DAYS) {
    return { ...invite, status: "Expired" };
  }
  return { ...invite, status: "Pending" };
}

export function invitationToMember(invite: UserInvitation): TeamMember {
  const status =
    invite.status === "Accepted"
      ? ("active" as const)
      : invite.status === "Expired"
        ? ("pending" as const)
        : ("pending" as const);
  return {
    id: invite.id,
    name: invite.name,
    email: invite.email,
    role: invite.role,
    status,
  };
}

export function createInvitation(
  name: string,
  email: string,
  role: UserRole,
  invitedBy: string,
): UserInvitation {
  return {
    id: `inv-${Date.now()}`,
    name: name.trim(),
    email: email.trim(),
    role,
    status: "Pending",
    invitedAt: new Date().toISOString(),
    invitedBy,
  };
}

export function applyTeamOverrides(
  members: TeamMember[],
  overrides: Record<string, TeamMemberOverride>,
): TeamMember[] {
  return members.map((m) => {
    const o = overrides[m.id];
    if (!o) return m;
    return {
      ...m,
      role: o.role ?? m.role,
      status: o.status ?? m.status,
    };
  });
}

export function mergeTeamWithInvitations(
  baseTeam: TeamMember[],
  invitations: UserInvitation[],
  overrides: Record<string, TeamMemberOverride>,
): TeamMember[] {
  const pendingInvites = invitations
    .filter((i) => i.status === "Pending")
    .map(invitationToMember);
  const merged = applyTeamOverrides([...baseTeam, ...pendingInvites], overrides);
  return merged;
}
