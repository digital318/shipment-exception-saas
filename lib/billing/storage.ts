import type {
  OrganizationSettings,
  SubscriptionState,
  TeamMember,
  UserInvitation,
  UserRole,
} from "./types";

const SUBSCRIPTION_KEY = "freightpulse:subscription";
const INVITATIONS_KEY = "freightpulse:invitations";
const ORG_SETTINGS_KEY = "freightpulse:org-settings";

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

export const DEFAULT_TEAM: TeamMember[] = [
  {
    id: "user-1",
    name: "Sarah Chen",
    email: "sarah.chen@freightpulse.io",
    role: "Admin",
    status: "active",
  },
  {
    id: "user-2",
    name: "Marcus Webb",
    email: "marcus.webb@freightpulse.io",
    role: "Operations Manager",
    status: "active",
  },
  {
    id: "user-3",
    name: "Lisa Park",
    email: "lisa.park@freightpulse.io",
    role: "Customer Success",
    status: "active",
  },
  {
    id: "user-4",
    name: "James Ortiz",
    email: "james.ortiz@freightpulse.io",
    role: "Viewer",
    status: "active",
  },
];

export function loadSubscription(orgId: string): SubscriptionState {
  return readJson(storageKey(SUBSCRIPTION_KEY, orgId), defaultSubscriptionState());
}

export function saveSubscription(orgId: string, state: SubscriptionState): void {
  writeJson(storageKey(SUBSCRIPTION_KEY, orgId), state);
}

export function loadInvitations(orgId: string): UserInvitation[] {
  return readJson(storageKey(INVITATIONS_KEY, orgId), []);
}

export function saveInvitations(orgId: string, invitations: UserInvitation[]): void {
  writeJson(storageKey(INVITATIONS_KEY, orgId), invitations);
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

export function invitationToMember(invite: UserInvitation): TeamMember {
  const name = invite.email.split("@")[0].replace(/[._]/g, " ");
  const formatted = name
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return {
    id: invite.id,
    name: formatted,
    email: invite.email,
    role: invite.role,
    status: "invited",
  };
}

export function createInvitation(
  email: string,
  role: UserRole,
  invitedBy: string,
): UserInvitation {
  return {
    id: `inv-${Date.now()}`,
    email,
    role,
    invitedAt: new Date().toISOString(),
    invitedBy,
  };
}
