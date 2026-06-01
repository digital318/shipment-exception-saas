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
import {
  DEFAULT_PORTAL_CUSTOMER,
  PORTAL_CUSTOMER_NAMES,
  PORTAL_CUSTOMER_STORAGE_KEY,
  type PortalCustomerName,
} from "@/lib/customer-portal/constants";

type CustomerPortalContextValue = {
  selectedCustomer: PortalCustomerName;
  setSelectedCustomer: (name: PortalCustomerName) => void;
  portalCustomerNames: readonly PortalCustomerName[];
};

const CustomerPortalContext = createContext<CustomerPortalContextValue | null>(null);

function isPortalCustomerName(value: string): value is PortalCustomerName {
  return (PORTAL_CUSTOMER_NAMES as readonly string[]).includes(value);
}

export function CustomerPortalProvider({ children }: { children: ReactNode }) {
  const [selectedCustomer, setSelectedCustomerState] =
    useState<PortalCustomerName>(DEFAULT_PORTAL_CUSTOMER);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(PORTAL_CUSTOMER_STORAGE_KEY);
      if (stored && isPortalCustomerName(stored)) {
        setSelectedCustomerState(stored);
      }
    } catch {
      // ignore storage errors in demo mode
    }
  }, []);

  const setSelectedCustomer = useCallback((name: PortalCustomerName) => {
    setSelectedCustomerState(name);
    try {
      localStorage.setItem(PORTAL_CUSTOMER_STORAGE_KEY, name);
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo(
    () => ({
      selectedCustomer,
      setSelectedCustomer,
      portalCustomerNames: PORTAL_CUSTOMER_NAMES,
    }),
    [selectedCustomer, setSelectedCustomer],
  );

  return (
    <CustomerPortalContext.Provider value={value}>
      {children}
    </CustomerPortalContext.Provider>
  );
}

export function useCustomerPortal() {
  const ctx = useContext(CustomerPortalContext);
  if (!ctx) {
    throw new Error("useCustomerPortal must be used within CustomerPortalProvider");
  }
  return ctx;
}
