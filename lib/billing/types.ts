import type {
  InvitationStatus,
  MemberStatus,
  UserRole,
} from "@/lib/auth/roles";

export type { UserRole, MemberStatus, InvitationStatus };

export type PlanId = "starter" | "professional" | "enterprise";

export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled";

export type SubscriptionPlan = {
  id: PlanId;
  name: string;
  price: number;
  shipmentLimit: number | null;
  features: string[];
  highlighted?: boolean;
};

export type SubscriptionState = {
  planId: PlanId;
  status: SubscriptionStatus;
  trialStartedAt: string;
  trialDaysTotal: number;
};

export type OrganizationSettings = {
  industry: string;
  primaryContact: string;
  slaOnTimeTarget: string;
  slaCriticalHours: string;
  slaEscalationHours: string;
};

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: MemberStatus | "pending";
  /** Linked customer account for Customer User role. */
  customerAccount?: string;
};

export type UserInvitation = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: InvitationStatus;
  invitedAt: string;
  invitedBy: string;
};

export type TeamMemberOverride = {
  role?: UserRole;
  status?: MemberStatus;
};

export type UsageMetrics = {
  shipmentsMonitored: number;
  exceptionsProcessed: number;
  reportsGenerated: number;
  customerNotificationsSent: number;
  shipmentVolume: number;
  openExceptions: number;
  customerCount: number;
};

export type UsageTrendPoint = {
  month: string;
  shipments: number;
  exceptions: number;
};

export type PlanUtilization = {
  used: number;
  limit: number | null;
  pct: number | null;
};
