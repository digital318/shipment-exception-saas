"use client";

import { useMemo } from "react";
import { useCustomerPortal } from "@/context/customer-portal-context";
import { useExceptions } from "@/context/exceptions-context";
import {
  computeCustomerPortalDashboard,
  computeCustomerPortalScorecard,
} from "@/lib/customer-portal/metrics";
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

  const customer = useMemo((): Customer | null => {
    return customers.find((c) => c.name === selectedCustomer) ?? null;
  }, [customers, selectedCustomer]);

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
    dashboard,
    scorecard,
    loading,
    error,
    refresh,
    source,
  };
}
