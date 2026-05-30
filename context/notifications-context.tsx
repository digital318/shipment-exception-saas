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
import { useSlaIntelligence } from "@/hooks/use-sla-intelligence";
import { isActiveException } from "@/lib/exception-utils";
import {
  getNotificationsForOrganization,
  markAllNotificationsRead,
  markNotificationRead,
  syncSlaRiskNotifications,
} from "@/lib/data/notifications";
import { isEscalationNotification } from "@/lib/data/notification-rules";
import { isSupabaseWriteEnabled } from "@/lib/data/mutations";
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
  source: DataSource;
  refresh: () => Promise<void>;
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
  const { organization, profile, loading: orgLoading, needsOnboarding } = useOrganization();
  const { exceptions, refresh: refreshExceptions } = useExceptions();
  const { atRiskCustomers } = useSlaIntelligence();
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [mockReadIds, setMockReadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<DataSource>("mock");

  const organizationId = organization?.id ?? profile?.organizationId ?? undefined;
  const persistToSupabase =
    isSupabaseWriteEnabled() && !!organizationId && !needsOnboarding;

  const loadNotifications = useCallback(async () => {
    if (!persistToSupabase || !organizationId) {
      setSource("mock");
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      await syncSlaRiskNotifications(organizationId, atRiskCustomers);
      const result = await getNotificationsForOrganization(organizationId);
      setNotifications(result.data);
      setSource(result.source);
    } finally {
      setLoading(false);
    }
  }, [persistToSupabase, organizationId, atRiskCustomers]);

  useEffect(() => {
    if (orgLoading || needsOnboarding) return;
    if (persistToSupabase && !organizationId) return;
    void loadNotifications();
  }, [loadNotifications, orgLoading, needsOnboarding, organizationId, persistToSupabase, exceptions.length]);

  const effectiveNotifications = useMemo(() => {
    if (persistToSupabase) return notifications;
    return buildMockNotifications(exceptions, atRiskCustomers, mockReadIds);
  }, [persistToSupabase, notifications, exceptions, atRiskCustomers, mockReadIds]);

  const unreadCount = useMemo(
    () => effectiveNotifications.filter((n) => n.status === "Unread").length,
    [effectiveNotifications],
  );

  const escalationNotifications = useMemo(
    () => effectiveNotifications.filter((n) => isEscalationNotification(n.type)),
    [effectiveNotifications],
  );

  const markRead = useCallback(
    async (id: string) => {
      if (persistToSupabase && organizationId) {
        await markNotificationRead(id, organizationId);
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === id ? { ...n, status: "Read" as NotificationStatus } : n,
          ),
        );
        return;
      }

      setMockReadIds((prev) => new Set(prev).add(id));
    },
    [persistToSupabase, organizationId],
  );

  const markAllRead = useCallback(async () => {
    if (persistToSupabase && organizationId) {
      await markAllNotificationsRead(organizationId);
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, status: "Read" as NotificationStatus })),
      );
      return;
    }

    setMockReadIds(new Set(effectiveNotifications.map((n) => n.id)));
  }, [persistToSupabase, organizationId, effectiveNotifications]);

  const refresh = useCallback(async () => {
    await refreshExceptions();
    await loadNotifications();
  }, [refreshExceptions, loadNotifications]);

  const value = useMemo(
    () => ({
      notifications: effectiveNotifications,
      unreadCount,
      loading,
      source,
      refresh,
      markRead,
      markAllRead,
      escalationNotifications,
    }),
    [
      effectiveNotifications,
      unreadCount,
      loading,
      source,
      refresh,
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
