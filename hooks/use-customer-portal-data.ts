"use client";

import { useMemo } from "react";
import { useCustomerPortal } from "@/context/customer-portal-context";
import { useCustomerNotifications } from "@/context/customer-notifications-context";
import { useExceptions } from "@/context/exceptions-context";
import {
  computeCustomerPortalDashboard,
  computeCustomerPortalScorecard,
} from "@/lib/customer-portal/metrics";
import { buildCustomerTimeline } from "@/lib/customer-portal/timeline";
import {
  filterCustomerSafeActivity,
  filterExceptionsByCustomer,
  filterOpenExceptions,
  filterShipmentsByCustomer,
  toCustomerSafeExceptions,
} from "@/lib/customer-portal/visibility";
import type { Customer } from "@/lib/types";

export function useCustomerPortalData() {
  const { selectedCustomer } = useCustomerPortal();
  const { shipments, exceptions, activity, customers, loading, error, refresh, source } =
    useExceptions();
  const { getNotificationsForCustomer } = useCustomerNotifications();

  const customer = useMemo((): Customer | null => {
    return customers.find((c) => c.name === selectedCustomer) ?? null;
  }, [customers, selectedCustomer]);

  const customerId = customer?.dbId ?? customer?.id;

  const customerShipments = useMemo(
    () => filterShipmentsByCustomer(shipments, selectedCustomer),
    [shipments, selectedCustomer],
  );

  const customerExceptions = useMemo(
    () => filterExceptionsByCustomer(exceptions, selectedCustomer),
    [exceptions, selectedCustomer],
  );

  const openExceptions = useMemo(
    () => filterOpenExceptions(customerExceptions),
    [customerExceptions],
  );

  const safeExceptions = useMemo(
    () => toCustomerSafeExceptions(openExceptions),
    [openExceptions],
  );

  const shipmentIds = useMemo(
    () => new Set(customerShipments.map((s) => s.id)),
    [customerShipments],
  );

  const customerActivity = useMemo(
    () => filterCustomerSafeActivity(activity, shipmentIds),
    [activity, shipmentIds],
  );

  const customerNotifications = useMemo(() => {
    if (!customerId) return [];
    return getNotificationsForCustomer(customerId);
  }, [customerId, getNotificationsForCustomer]);

  const customerTimeline = useMemo(
    () => buildCustomerTimeline(customerActivity, customerNotifications),
    [customerActivity, customerNotifications],
  );

  const dashboard = useMemo(() => {
    if (!customer) return null;
    return computeCustomerPortalDashboard(customer, shipments, exceptions);
  }, [customer, shipments, exceptions]);

  const scorecard = useMemo(() => {
    if (!customer) return null;
    return computeCustomerPortalScorecard(customer, shipments, exceptions);
  }, [customer, shipments, exceptions]);

  return {
    selectedCustomer,
    customer,
    customerShipments,
    openExceptions: safeExceptions,
    customerActivity,
    customerNotifications,
    customerTimeline,
    dashboard,
    scorecard,
    loading,
    error,
    refresh,
    source,
  };
}
