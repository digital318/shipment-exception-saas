"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuthRole } from "@/context/auth-role-context";
import { useOrganization } from "@/context/organization-context";
import { useExceptions } from "@/context/exceptions-context";
import { useCustomerNotifications } from "@/context/customer-notifications-context";
import { useToast } from "@/context/toast-context";
import { getPlanById } from "@/lib/billing/plans";
import {
  computeTrialDaysRemaining,
  createInvitation,
  DEFAULT_TEAM,
  loadInvitations,
  loadOrganizationSettings,
  loadSubscription,
  loadTeamOverrides,
  mergeTeamWithInvitations,
  saveInvitations,
  saveOrganizationSettings,
  saveSubscription,
  saveTeamOverrides,
} from "@/lib/billing/storage";
import type {
  OrganizationSettings,
  PlanId,
  SubscriptionState,
  TeamMember,
  UserRole,
} from "@/lib/billing/types";
import {
  buildOrganizationUpdatedMessage,
  buildPlanChangeMessage,
  buildRoleChangedMessage,
  buildUserDisabledMessage,
  buildUserInvitedMessage,
  buildUserReactivatedMessage,
  insertSaasActivityEvent,
} from "@/lib/data/saas-activity";
import {
  computeGrowthMetrics,
  computePlanUtilization,
  computeUsageMetrics,
  buildUsageTrends,
} from "@/lib/billing/usage";

type SubscriptionContextValue = {
  orgKey: string;
  subscription: SubscriptionState;
  currentPlan: ReturnType<typeof getPlanById>;
  trialDaysRemaining: number;
  orgSettings: OrganizationSettings;
  teamMembers: TeamMember[];
  invitations: ReturnType<typeof loadInvitations>;
  usage: ReturnType<typeof computeUsageMetrics>;
  utilization: ReturnType<typeof computePlanUtilization>;
  usageTrends: ReturnType<typeof buildUsageTrends>;
  growthMetrics: ReturnType<typeof computeGrowthMetrics>;
  upgradePlan: (planId: PlanId) => Promise<void>;
  inviteUser: (name: string, email: string, role: UserRole) => Promise<void>;
  updateOrgSettings: (patch: Partial<OrganizationSettings>) => Promise<void>;
  changeUserRole: (userId: string, role: UserRole) => Promise<void>;
  disableUser: (userId: string) => Promise<void>;
  reactivateUser: (userId: string) => Promise<void>;
};

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

const DEMO_ORG_NAME = "FreightPulse Demo";

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { organization } = useOrganization();
  const { actorName } = useAuthRole();
  const { shipments, exceptions, customers, activity, logSaasActivity } = useExceptions();
  const { notifications: customerNotifications } = useCustomerNotifications();
  const { toast } = useToast();

  const orgKey = organization?.id ?? "demo";
  const organizationId = organization?.id;

  const [subscription, setSubscription] = useState<SubscriptionState>(() =>
    loadSubscription(orgKey),
  );
  const [orgSettings, setOrgSettings] = useState<OrganizationSettings>(() =>
    loadOrganizationSettings(orgKey),
  );
  const [invitations, setInvitations] = useState(() => loadInvitations(orgKey));
  const [teamOverrides, setTeamOverrides] = useState(() => loadTeamOverrides(orgKey));

  useEffect(() => {
    setSubscription(loadSubscription(orgKey));
    setOrgSettings(loadOrganizationSettings(orgKey));
    setInvitations(loadInvitations(orgKey));
    setTeamOverrides(loadTeamOverrides(orgKey));
  }, [orgKey]);

  const anchorExceptionDbId = exceptions.find((e) => e.dbId)?.dbId;

  const logAudit = useCallback(
    async (
      kind:
        | "plan_change"
        | "user_invited"
        | "organization_updated"
        | "role_changed"
        | "user_disabled"
        | "user_reactivated",
      message: string,
    ) => {
      logSaasActivity(message, kind);
      if (organizationId && anchorExceptionDbId) {
        try {
          await insertSaasActivityEvent(
            organizationId,
            anchorExceptionDbId,
            kind,
            message,
          );
        } catch {
          // Non-blocking
        }
      }
    },
    [logSaasActivity, organizationId, anchorExceptionDbId],
  );

  const currentPlan = useMemo(
    () => getPlanById(subscription.planId),
    [subscription.planId],
  );

  const trialDaysRemaining = useMemo(
    () => computeTrialDaysRemaining(subscription),
    [subscription],
  );

  const usage = useMemo(
    () =>
      computeUsageMetrics(
        shipments,
        exceptions,
        customers,
        activity,
        customerNotifications.length,
      ),
    [shipments, exceptions, customers, activity, customerNotifications.length],
  );

  const utilization = useMemo(
    () => computePlanUtilization(subscription.planId, usage.shipmentsMonitored),
    [subscription.planId, usage.shipmentsMonitored],
  );

  const usageTrends = useMemo(
    () => buildUsageTrends(shipments, exceptions),
    [shipments, exceptions],
  );

  const growthMetrics = useMemo(
    () => computeGrowthMetrics(customers, shipments),
    [customers, shipments],
  );

  const teamMembers = useMemo(
    () => mergeTeamWithInvitations(DEFAULT_TEAM, invitations, teamOverrides),
    [invitations, teamOverrides],
  );

  const upgradePlan = useCallback(
    async (planId: PlanId) => {
      const previous = getPlanById(subscription.planId);
      const next = getPlanById(planId);
      if (previous.id === next.id) return;

      const nextState: SubscriptionState = {
        ...subscription,
        planId,
        status: subscription.status === "trialing" ? "trialing" : "active",
      };
      setSubscription(nextState);
      saveSubscription(orgKey, nextState);

      const message = buildPlanChangeMessage(previous.name, next.name);
      await logAudit("plan_change", message);

      toast(`Upgraded to ${next.name} plan`, "success");
    },
    [subscription, orgKey, logAudit, toast],
  );

  const inviteUser = useCallback(
    async (name: string, email: string, role: UserRole) => {
      const invite = createInvitation(name, email, role, actorName);
      const next = [...invitations, invite];
      setInvitations(next);
      saveInvitations(orgKey, next);

      const message = buildUserInvitedMessage(name, email, role);
      await logAudit("user_invited", message);

      toast(`Invitation sent to ${email}`, "success");
    },
    [invitations, orgKey, logAudit, toast, actorName],
  );

  const updateOrgSettings = useCallback(
    async (patch: Partial<OrganizationSettings>) => {
      const next = { ...orgSettings, ...patch };
      setOrgSettings(next);
      saveOrganizationSettings(orgKey, next);

      const changedField = Object.keys(patch)[0] ?? "settings";
      const message = buildOrganizationUpdatedMessage(changedField);
      await logAudit("organization_updated", message);
    },
    [orgSettings, orgKey, logAudit],
  );

  const changeUserRole = useCallback(
    async (userId: string, role: UserRole) => {
      const member = teamMembers.find((m) => m.id === userId);
      if (!member) return;
      const previousRole = member.role;
      const nextOverrides = {
        ...teamOverrides,
        [userId]: { ...teamOverrides[userId], role },
      };
      setTeamOverrides(nextOverrides);
      saveTeamOverrides(orgKey, nextOverrides);

      const message = buildRoleChangedMessage(member.name, previousRole, role);
      await logAudit("role_changed", message);
      toast(`Updated ${member.name} to ${role}`, "success");
    },
    [teamMembers, teamOverrides, orgKey, logAudit, toast],
  );

  const disableUser = useCallback(
    async (userId: string) => {
      const member = teamMembers.find((m) => m.id === userId);
      if (!member) return;
      const nextOverrides = {
        ...teamOverrides,
        [userId]: { ...teamOverrides[userId], status: "disabled" as const },
      };
      setTeamOverrides(nextOverrides);
      saveTeamOverrides(orgKey, nextOverrides);

      const message = buildUserDisabledMessage(member.name);
      await logAudit("user_disabled", message);
      toast(`Disabled ${member.name}`, "success");
    },
    [teamMembers, teamOverrides, orgKey, logAudit, toast],
  );

  const reactivateUser = useCallback(
    async (userId: string) => {
      const member = teamMembers.find((m) => m.id === userId);
      if (!member) return;
      const nextOverrides = {
        ...teamOverrides,
        [userId]: { ...teamOverrides[userId], status: "active" as const },
      };
      setTeamOverrides(nextOverrides);
      saveTeamOverrides(orgKey, nextOverrides);

      const message = buildUserReactivatedMessage(member.name);
      await logAudit("user_reactivated", message);
      toast(`Reactivated ${member.name}`, "success");
    },
    [teamMembers, teamOverrides, orgKey, logAudit, toast],
  );

  const value = useMemo(
    () => ({
      orgKey,
      subscription,
      currentPlan,
      trialDaysRemaining,
      orgSettings,
      teamMembers,
      invitations,
      usage,
      utilization,
      usageTrends,
      growthMetrics,
      upgradePlan,
      inviteUser,
      updateOrgSettings,
      changeUserRole,
      disableUser,
      reactivateUser,
    }),
    [
      orgKey,
      subscription,
      currentPlan,
      trialDaysRemaining,
      orgSettings,
      teamMembers,
      invitations,
      usage,
      utilization,
      usageTrends,
      growthMetrics,
      upgradePlan,
      inviteUser,
      updateOrgSettings,
      changeUserRole,
      disableUser,
      reactivateUser,
    ],
  );

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) {
    throw new Error("useSubscription must be used within SubscriptionProvider");
  }
  return ctx;
}

export function useOrganizationDisplayName(): string {
  const { organization } = useOrganization();
  return organization?.name ?? DEMO_ORG_NAME;
}
