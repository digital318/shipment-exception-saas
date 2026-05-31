"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { useOrganization } from "@/context/organization-context";
import { useExceptions } from "@/context/exceptions-context";
import { useSlaIntelligence } from "@/hooks/use-sla-intelligence";
import { isActiveException } from "@/lib/exception-utils";
import {
  getNotificationsForOrganization,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/data/notifications";
import { processSlaRiskNotificationTransitions, buildRiskSnapshot } from "@/lib/data/sla-risk-notifications";
import { isEscalationNotification } from "@/lib/data/notification-rules";
import type { RiskLevel } from "@/lib/sla-intelligence";
import { countUnreadNotifications } from "@/lib/notifications-utils";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { DataSource } from "@/lib/data/types";
import type {
  NotificationRecord,
  NotificationStatus,
  NotificationType,
} from "@/lib/types";

type NotificationsContextValue = {
  notifications: NotificationRecord[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  source: DataSource;
  refresh: () => Promise<void>;
  /** Reload notifications only — does not refresh exceptions/shipments. */
  refreshNotifications: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  escalationNotifications: NotificationRecord[];
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

function buildMockNotifications(
  exceptions: ReturnType<typeof useExceptions>["exceptions"],
  atRiskCustomers: ReturnType<typeof useSlaIntelligence>["atRiskCustomers"],
  readIds: Set<string>,
): NotificationRecord[] {
  const items: NotificationRecord[] = [];

  for (const exc of exceptions) {
    if (isActiveException(exc) && (exc.severity === "Critical" || exc.severity === "High")) {
      const type: NotificationType =
        exc.severity === "Critical" ? "exception_critical" : "exception_high";
      const id = `mock-exc-${exc.id}`;
      items.push({
        id,
        organizationId: "mock",
        exceptionId: exc.dbId ?? exc.id,
        type,
        title: `${exc.severity} exception — ${exc.shipmentId}`,
        message: `${exc.title} · ${exc.customer}`,
        severity: exc.severity,
        status: readIds.has(id) ? "Read" : "Unread",
        createdAt: exc.openedAt,
        customerName: exc.customer,
        shipmentId: exc.shipmentId,
      });
    }

    if (exc.status === "Resolved") {
      const id = `mock-res-${exc.id}`;
      items.push({
        id,
        organizationId: "mock",
        exceptionId: exc.dbId ?? exc.id,
        type: "resolution",
        title: `Exception resolved — ${exc.shipmentId}`,
        message: exc.title,
        severity: "Low",
        status: readIds.has(id) ? "Read" : "Unread",
        createdAt: exc.resolvedAt ?? exc.updatedAt,
        customerName: exc.customer,
        shipmentId: exc.shipmentId,
      });
    }
  }

  for (const customer of atRiskCustomers.filter((c) => c.riskLevel === "red")) {
    const id = `mock-sla-${customer.customerId}`;
    if (readIds.has(id)) {
      items.push({
        id,
        organizationId: "mock",
        customerId: customer.customerId,
        type: "sla_risk",
        title: `SLA risk — ${customer.customerName}`,
        message: `On-time delivery at ${customer.onTimePercent.toFixed(1)}% vs ${customer.slaTarget}% target.`,
        severity: "Critical",
        status: "Read",
        createdAt: "Just now",
        customerName: customer.customerName,
      });
      continue;
    }

    const alreadyUnread = items.some(
      (n) => n.type === "sla_risk" && n.customerId === customer.customerId && n.status === "Unread",
    );
    if (alreadyUnread) continue;

    items.push({
      id,
      organizationId: "mock",
      customerId: customer.customerId,
      type: "sla_risk",
      title: `SLA risk — ${customer.customerName}`,
      message: `On-time delivery at ${customer.onTimePercent.toFixed(1)}% vs ${customer.slaTarget}% target.`,
      severity: "Critical",
      status: readIds.has(id) ? "Read" : "Unread",
      createdAt: "Just now",
      customerName: customer.customerName,
    });
  }

  return items;
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { organization, profile, loading: orgLoading, needsOnboarding } = useOrganization();
  const { exceptions, refresh: refreshExceptions } = useExceptions();
  const { atRiskCustomers, customerMetrics } = useSlaIntelligence();
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [mockReadIds, setMockReadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<DataSource>("mock");

  const organizationId = organization?.id ?? profile?.organizationId ?? undefined;
  const useSupabase = isSupabaseConfigured();
  const previousRiskByCustomerRef = useRef<Map<string, RiskLevel>>(new Map());
  const lastRiskSnapshotRef = useRef("");
  const slaTransitionInFlightRef = useRef(false);
  const loadNotificationsRef = useRef<(() => Promise<void>) | null>(null);

  const loadNotifications = useCallback(async () => {
      if (!useSupabase || !organizationId) {
        setNotifications([]);
        setSource("mock");
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await getNotificationsForOrganization(organizationId);

        if (result.source === "supabase") {
          setNotifications(result.data);
          setSource("supabase");
          setError(result.error ?? null);
        } else {
          setNotifications([]);
          setSource("mock");
          setError(result.error ?? "Failed to load notifications from Supabase");
        }
      } catch (err) {
        setNotifications([]);
        setSource("mock");
        setError(err instanceof Error ? err.message : "Failed to load notifications");
      } finally {
        setLoading(false);
      }
    },
    [useSupabase, organizationId],
  );

  loadNotificationsRef.current = loadNotifications;

  useEffect(() => {
    if (orgLoading || needsOnboarding || !useSupabase || !organizationId) return;
    if (customerMetrics.length === 0) return;

    const snapshot = buildRiskSnapshot(customerMetrics);
    if (snapshot === lastRiskSnapshotRef.current) return;
    if (slaTransitionInFlightRef.current) return;

    slaTransitionInFlightRef.current = true;
    lastRiskSnapshotRef.current = snapshot;

    void processSlaRiskNotificationTransitions(
      organizationId,
      customerMetrics,
      previousRiskByCustomerRef.current,
    )
      .then(async ({ result, nextRiskByCustomer, riskSnapshot }) => {
        previousRiskByCustomerRef.current = nextRiskByCustomer;
        lastRiskSnapshotRef.current = riskSnapshot;
        if (result.created > 0) {
          await loadNotificationsRef.current?.();
        }
      })
      .catch((err) => {
        console.error("[FreightPulse] SLA risk transition processing failed", err);
        lastRiskSnapshotRef.current = "";
      })
      .finally(() => {
        slaTransitionInFlightRef.current = false;
      });
  }, [customerMetrics, orgLoading, needsOnboarding, useSupabase, organizationId]);

  useEffect(() => {
    if (orgLoading) return;
    if (!useSupabase || !organizationId) {
      setNotifications([]);
      setSource("mock");
      setLoading(false);
      return;
    }

    void loadNotifications();
  }, [loadNotifications, orgLoading, useSupabase, organizationId, pathname]);

  const mockNotifications = useMemo(
    () => buildMockNotifications(exceptions, atRiskCustomers, mockReadIds),
    [exceptions, atRiskCustomers, mockReadIds],
  );

  const displayNotifications = useMemo(() => {
    if (useSupabase && organizationId) {
      return source === "supabase" ? notifications : [];
    }
    return mockNotifications;
  }, [useSupabase, organizationId, source, notifications, mockNotifications]);

  const unreadCount = useMemo(() => {
    if (useSupabase && organizationId) {
      if (source !== "supabase") return 0;
      return countUnreadNotifications(notifications);
    }
    return countUnreadNotifications(mockNotifications);
  }, [useSupabase, organizationId, source, notifications, mockNotifications]);

  const escalationNotifications = useMemo(
    () => displayNotifications.filter((n) => isEscalationNotification(n.type)),
    [displayNotifications],
  );

  const markRead = useCallback(
    async (id: string) => {
      if (useSupabase && organizationId) {
        await markNotificationRead(id, organizationId);
        await loadNotifications();
        return;
      }

      setMockReadIds((prev) => new Set(prev).add(id));
    },
    [useSupabase, organizationId, loadNotifications],
  );

  const markAllRead = useCallback(async () => {
    const LOG_PREFIX = "[FreightPulse] markAllRead";

    if (!organizationId) {
      console.error(LOG_PREFIX, "organization_id missing — cannot mark all read", {
        organizationId: organization?.id ?? null,
        profileOrganizationId: profile?.organizationId ?? null,
      });
      setError("Cannot mark all read: organization is not loaded.");
      return;
    }

    if (!useSupabase) {
      setMockReadIds(new Set(mockNotifications.map((n) => n.id)));
      return;
    }

    try {
      await markAllNotificationsRead(organizationId);
      await loadNotifications();
    } catch (err) {
      const supabaseError =
        err && typeof err === "object" && "message" in err
          ? {
              message: String((err as { message: unknown }).message),
              details: "details" in err ? (err as { details: unknown }).details : undefined,
              hint: "hint" in err ? (err as { hint: unknown }).hint : undefined,
              code: "code" in err ? (err as { code: unknown }).code : undefined,
            }
          : err;

      console.error(LOG_PREFIX, "failed", {
        organizationId,
        supabaseError,
      });

      const message =
        err instanceof Error ? err.message : "Failed to mark all notifications read";
      setError(message);
      throw err;
    }
  }, [
    organizationId,
    organization?.id,
    profile?.organizationId,
    useSupabase,
    mockNotifications,
    loadNotifications,
  ]);

  const refreshNotifications = useCallback(async () => {
    await loadNotifications();
  }, [loadNotifications]);

  const refresh = useCallback(async () => {
    await refreshExceptions();
    await loadNotifications();
  }, [refreshExceptions, loadNotifications]);

  const value = useMemo(
    () => ({
      notifications: displayNotifications,
      unreadCount,
      loading,
      error,
      source,
      refresh,
      refreshNotifications,
      markRead,
      markAllRead,
      escalationNotifications,
    }),
    [
      displayNotifications,
      unreadCount,
      loading,
      error,
      source,
      refresh,
      refreshNotifications,
      markRead,
      markAllRead,
      escalationNotifications,
    ],
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within NotificationsProvider");
  }
  return ctx;
}
