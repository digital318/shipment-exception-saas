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
import { useOrganization } from "@/context/organization-context";
import { useExceptions } from "@/context/exceptions-context";
import { useCustomerNotifications } from "@/context/customer-notifications-context";
import { useToast } from "@/context/toast-context";
import { getPlanById } from "@/lib/billing/plans";
import {
  computeTrialDaysRemaining,
  createInvitation,
  DEFAULT_TEAM,
  invitationToMember,
  loadInvitations,
  loadOrganizationSettings,
  loadSubscription,
  saveInvitations,
  saveOrganizationSettings,
  saveSubscription,
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
  buildUserInvitedMessage,
  insertSaasActivityEvent,
} from "@/lib/data/saas-activity";
import { CURRENT_USER } from "@/lib/constants";
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
  usage: ReturnType<typeof computeUsageMetrics>;
  utilization: ReturnType<typeof computePlanUtilization>;
  usageTrends: ReturnType<typeof buildUsageTrends>;
  growthMetrics: ReturnType<typeof computeGrowthMetrics>;
  upgradePlan: (planId: PlanId) => Promise<void>;
  inviteUser: (email: string, role: UserRole) => Promise<void>;
  updateOrgSettings: (patch: Partial<OrganizationSettings>) => Promise<void>;
};

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

const DEMO_ORG_NAME = "FreightPulse Demo";

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { organization } = useOrganization();
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

  useEffect(() => {
    setSubscription(loadSubscription(orgKey));
    setOrgSettings(loadOrganizationSettings(orgKey));
    setInvitations(loadInvitations(orgKey));
  }, [orgKey]);

  const anchorExceptionDbId = exceptions.find((e) => e.dbId)?.dbId;

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

  const teamMembers = useMemo(() => {
    const invited = invitations.map(invitationToMember);
    return [...DEFAULT_TEAM, ...invited];
  }, [invitations]);

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
      logSaasActivity(message, "plan_change");

      if (organizationId && anchorExceptionDbId) {
        try {
          await insertSaasActivityEvent(
            organizationId,
            anchorExceptionDbId,
            "plan_change",
            message,
          );
        } catch {
          // Non-blocking
        }
      }

      toast(`Upgraded to ${next.name} plan`, "success");
    },
    [
      subscription,
      orgKey,
      logSaasActivity,
      organizationId,
      anchorExceptionDbId,
      toast,
    ],
  );

  const inviteUser = useCallback(
    async (email: string, role: UserRole) => {
      const invite = createInvitation(email, role, CURRENT_USER);
      const next = [...invitations, invite];
      setInvitations(next);
      saveInvitations(orgKey, next);

      const message = buildUserInvitedMessage(email, role);
      logSaasActivity(message, "user_invited");

      if (organizationId && anchorExceptionDbId) {
        try {
          await insertSaasActivityEvent(
            organizationId,
            anchorExceptionDbId,
            "user_invited",
            message,
          );
        } catch {
          // Non-blocking
        }
      }

      toast(`Invitation sent to ${email}`, "success");
    },
    [invitations, orgKey, logSaasActivity, organizationId, anchorExceptionDbId, toast],
  );

  const updateOrgSettings = useCallback(
    async (patch: Partial<OrganizationSettings>) => {
      const next = { ...orgSettings, ...patch };
      setOrgSettings(next);
      saveOrganizationSettings(orgKey, next);

      const changedField = Object.keys(patch)[0] ?? "settings";
      const message = buildOrganizationUpdatedMessage(changedField);
      logSaasActivity(message, "organization_updated");

      if (organizationId && anchorExceptionDbId) {
        try {
          await insertSaasActivityEvent(
            organizationId,
            anchorExceptionDbId,
            "organization_updated",
            message,
          );
        } catch {
          // Non-blocking
        }
      }
    },
    [orgSettings, orgKey, logSaasActivity, organizationId, anchorExceptionDbId],
  );

  const value = useMemo(
    () => ({
      orgKey,
      subscription,
      currentPlan,
      trialDaysRemaining,
      orgSettings,
      teamMembers,
      usage,
      utilization,
      usageTrends,
      growthMetrics,
      upgradePlan,
      inviteUser,
      updateOrgSettings,
    }),
    [
      orgKey,
      subscription,
      currentPlan,
      trialDaysRemaining,
      orgSettings,
      teamMembers,
      usage,
      utilization,
      usageTrends,
      growthMetrics,
      upgradePlan,
      inviteUser,
      updateOrgSettings,
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
