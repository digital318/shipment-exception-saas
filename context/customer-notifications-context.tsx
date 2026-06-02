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
import {
  createCustomerNotification,
  getCustomerNotificationsForOrganization,
  markAllCustomerNotificationsRead,
  markCustomerNotificationRead,
} from "@/lib/data/customer-notifications";
import { buildDemoCustomerNotificationInput } from "@/lib/data/customer-notification-rules";
import {
  buildCustomerSlaRiskSnapshot,
  processCustomerSlaRiskNotificationTransitions,
} from "@/lib/data/customer-notification-triggers";
import { countUnreadCustomerNotifications } from "@/lib/customer-notifications-utils";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { DataSource } from "@/lib/data/types";
import type { CustomerNotificationRecord } from "@/lib/types";
import { toCustomerSafeStatus } from "@/lib/customer-portal/visibility";

type CustomerNotificationsContextValue = {
  notifications: CustomerNotificationRecord[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  source: DataSource;
  refresh: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: (customerId?: string) => Promise<void>;
  generateDemoNotification: (customerId: string, customerName: string) => Promise<void>;
  getNotificationsForCustomer: (customerId: string) => CustomerNotificationRecord[];
  getUnreadCountForCustomer: (customerId: string) => number;
};

const CustomerNotificationsContext = createContext<CustomerNotificationsContextValue | null>(
  null,
);

function buildMockCustomerNotifications(
  exceptions: ReturnType<typeof useExceptions>["exceptions"],
  shipments: ReturnType<typeof useExceptions>["shipments"],
  customers: ReturnType<typeof useExceptions>["customers"],
  readIds: Set<string>,
  extra: CustomerNotificationRecord[],
): CustomerNotificationRecord[] {
  const items: CustomerNotificationRecord[] = [...extra];
  const customerIdByName = new Map(customers.map((c) => [c.name, c.dbId ?? c.id]));

  for (const shipment of shipments) {
    const customerId = customerIdByName.get(shipment.customer);
    if (!customerId) continue;

    if (shipment.status === "Delayed") {
      const id = `mock-cn-delay-${shipment.id}`;
      items.push({
        id,
        organizationId: "mock",
        customerId,
        shipmentId: shipment.id,
        type: "shipment_delayed",
        title: `Shipment delayed — ${shipment.id}`,
        message: `Your shipment ${shipment.id} is experiencing a delay. Our team is monitoring the situation.`,
        status: readIds.has(id) ? "Read" : "Unread",
        createdAt: shipment.eta,
        customerName: shipment.customer,
        shipmentNumber: shipment.id,
      });
    }

    if (shipment.status === "Delivered") {
      const id = `mock-cn-delivered-${shipment.id}`;
      items.push({
        id,
        organizationId: "mock",
        customerId,
        shipmentId: shipment.id,
        type: "shipment_delivered",
        title: `Shipment delivered — ${shipment.id}`,
        message: `Your shipment ${shipment.id} has been delivered successfully.`,
        status: readIds.has(id) ? "Read" : "Unread",
        createdAt: shipment.eta,
        customerName: shipment.customer,
        shipmentNumber: shipment.id,
      });
    }
  }

  for (const exc of exceptions) {
    const customerId = customerIdByName.get(exc.customer);
    if (!customerId) continue;

    if (exc.status !== "Resolved") {
      const id = `mock-cn-exc-${exc.id}`;
      items.push({
        id,
        organizationId: "mock",
        customerId,
        shipmentId: exc.shipmentId,
        exceptionId: exc.dbId ?? exc.id,
        type: "shipment_exception",
        title: `Shipment exception — ${exc.shipmentId}`,
        message: `An exception has been opened for shipment ${exc.shipmentId}: ${exc.title}.`,
        status: readIds.has(id) ? "Read" : "Unread",
        createdAt: exc.openedAt,
        customerName: exc.customer,
        shipmentNumber: exc.shipmentId,
      });
    }

    if (exc.status === "Resolved") {
      const id = `mock-cn-res-${exc.id}`;
      items.push({
        id,
        organizationId: "mock",
        customerId,
        shipmentId: exc.shipmentId,
        exceptionId: exc.dbId ?? exc.id,
        type: "exception_resolved",
        title: `Exception resolved — ${exc.shipmentId}`,
        message: `The exception on shipment ${exc.shipmentId} (${exc.title}) has been resolved.`,
        status: readIds.has(id) ? "Read" : "Unread",
        createdAt: exc.resolvedAt ?? exc.updatedAt,
        customerName: exc.customer,
        shipmentNumber: exc.shipmentId,
      });
    } else if (exc.status !== "Open") {
      const safeStatus = toCustomerSafeStatus(exc.status);
      const id = `mock-cn-update-${exc.id}-${safeStatus}`;
      items.push({
        id,
        organizationId: "mock",
        customerId,
        shipmentId: exc.shipmentId,
        exceptionId: exc.dbId ?? exc.id,
        type: "exception_updated",
        title: `Exception update — ${exc.shipmentId}`,
        message: `The status of your exception on shipment ${exc.shipmentId} has been updated to ${safeStatus}.`,
        status: readIds.has(id) ? "Read" : "Unread",
        createdAt: exc.updatedAt,
        customerName: exc.customer,
        shipmentNumber: exc.shipmentId,
      });
    }
  }

  return items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function CustomerNotificationsProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { organization, profile, loading: orgLoading, needsOnboarding } = useOrganization();
  const { exceptions, shipments, customers, refresh: refreshExceptions } = useExceptions();
  const { customerMetrics } = useSlaIntelligence();
  const [notifications, setNotifications] = useState<CustomerNotificationRecord[]>([]);
  const [mockReadIds, setMockReadIds] = useState<Set<string>>(new Set());
  const [mockExtra, setMockExtra] = useState<CustomerNotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<DataSource>("mock");

  const organizationId = organization?.id ?? profile?.organizationId ?? undefined;
  const useSupabase = isSupabaseConfigured();
  const previousRiskByCustomerRef = useRef<Map<string, import("@/lib/sla-intelligence").RiskLevel>>(
    new Map(),
  );
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
      const result = await getCustomerNotificationsForOrganization(organizationId);

      if (result.source === "supabase") {
        setNotifications(result.data);
        setSource("supabase");
        setError(result.error ?? null);
      } else {
        setNotifications([]);
        setSource("mock");
        setError(result.error ?? "Failed to load customer notifications from Supabase");
      }
    } catch (err) {
      setNotifications([]);
      setSource("mock");
      setError(err instanceof Error ? err.message : "Failed to load customer notifications");
    } finally {
      setLoading(false);
    }
  }, [useSupabase, organizationId]);

  loadNotificationsRef.current = loadNotifications;

  useEffect(() => {
    if (orgLoading || needsOnboarding || !useSupabase || !organizationId) return;
    if (customerMetrics.length === 0) return;

    const snapshot = buildCustomerSlaRiskSnapshot(customerMetrics);
    if (snapshot === lastRiskSnapshotRef.current) return;
    if (slaTransitionInFlightRef.current) return;

    slaTransitionInFlightRef.current = true;
    lastRiskSnapshotRef.current = snapshot;

    void processCustomerSlaRiskNotificationTransitions(
      organizationId,
      customerMetrics,
      previousRiskByCustomerRef.current,
    )
      .then(async ({ created, nextRiskByCustomer }) => {
        previousRiskByCustomerRef.current = nextRiskByCustomer;
        if (created > 0) {
          await loadNotificationsRef.current?.();
        }
      })
      .catch((err) => {
        console.error("[FreightPulse] Customer SLA risk transition failed", err);
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
    () =>
      buildMockCustomerNotifications(
        exceptions,
        shipments,
        customers,
        mockReadIds,
        mockExtra,
      ),
    [exceptions, shipments, customers, mockReadIds, mockExtra],
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
      return countUnreadCustomerNotifications(notifications);
    }
    return countUnreadCustomerNotifications(mockNotifications);
  }, [useSupabase, organizationId, source, notifications, mockNotifications]);

  const getNotificationsForCustomer = useCallback(
    (customerId: string) =>
      displayNotifications.filter((n) => n.customerId === customerId),
    [displayNotifications],
  );

  const getUnreadCountForCustomer = useCallback(
    (customerId: string) =>
      getNotificationsForCustomer(customerId).filter((n) => n.status === "Unread").length,
    [getNotificationsForCustomer],
  );

  const markRead = useCallback(
    async (id: string) => {
      if (useSupabase && organizationId) {
        await markCustomerNotificationRead(id, organizationId);
        await loadNotifications();
        return;
      }

      setMockReadIds((prev) => new Set(prev).add(id));
    },
    [useSupabase, organizationId, loadNotifications],
  );

  const markAllRead = useCallback(
    async (customerId?: string) => {
      if (!organizationId && useSupabase) {
        setError("Cannot mark all read: organization is not loaded.");
        return;
      }

      if (!useSupabase) {
        const ids = customerId
          ? mockNotifications.filter((n) => n.customerId === customerId).map((n) => n.id)
          : mockNotifications.map((n) => n.id);
        setMockReadIds((prev) => new Set([...prev, ...ids]));
        return;
      }

      await markAllCustomerNotificationsRead(organizationId!, customerId);
      await loadNotifications();
    },
    [organizationId, useSupabase, mockNotifications, loadNotifications],
  );

  const generateDemoNotification = useCallback(
    async (customerId: string, customerName: string) => {
      const shipment = shipments.find((s) => s.customer === customerName);

      if (useSupabase && organizationId) {
        const input = buildDemoCustomerNotificationInput(
          organizationId,
          customerId,
          customerName,
          undefined,
          shipment?.id,
        );
        await createCustomerNotification(input);
        await loadNotifications();
        return;
      }

      const id = `mock-cn-demo-${Date.now()}`;
      setMockExtra((prev) => [
        {
          id,
          organizationId: "mock",
          customerId,
          shipmentId: shipment?.id,
          type: "shipment_delayed",
          title: `Demo alert — ${shipment?.id ?? customerName}`,
          message: `This is a demo customer notification for ${customerName}.`,
          status: "Unread",
          createdAt: "Just now",
          customerName,
          shipmentNumber: shipment?.id,
        },
        ...prev,
      ]);
    },
    [useSupabase, organizationId, shipments, loadNotifications],
  );

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
      generateDemoNotification,
      getNotificationsForCustomer,
      getUnreadCountForCustomer,
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
      generateDemoNotification,
      getNotificationsForCustomer,
      getUnreadCountForCustomer,
    ],
  );

  return (
    <CustomerNotificationsContext.Provider value={value}>
      {children}
    </CustomerNotificationsContext.Provider>
  );
}

export function useCustomerNotifications() {
  const ctx = useContext(CustomerNotificationsContext);
  if (!ctx) {
    throw new Error("useCustomerNotifications must be used within CustomerNotificationsProvider");
  }
  return ctx;
}
