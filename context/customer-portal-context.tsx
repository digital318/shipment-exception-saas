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
  /** Customer User accounts cannot switch customers. */
  customerLocked: boolean;
};

const CustomerPortalContext = createContext<CustomerPortalContextValue | null>(null);

function isPortalCustomerName(value: string): value is PortalCustomerName {
  return (PORTAL_CUSTOMER_NAMES as readonly string[]).includes(value);
}

export function CustomerPortalProvider({ children }: { children: ReactNode }) {
  const { customerAccount, role } = useAuthRole();
  const customerLocked = role === "Customer User" && customerAccount != null;

  const [selectedCustomer, setSelectedCustomerState] =
    useState<PortalCustomerName>(customerAccount ?? DEFAULT_PORTAL_CUSTOMER);

  useEffect(() => {
    if (customerLocked && customerAccount) {
      setSelectedCustomerState(customerAccount);
      return;
    }
    try {
      const stored = localStorage.getItem(PORTAL_CUSTOMER_STORAGE_KEY);
      if (stored && isPortalCustomerName(stored)) {
        setSelectedCustomerState(stored);
      }
    } catch {
      // ignore storage errors in demo mode
    }
  }, [customerLocked, customerAccount]);

  const setSelectedCustomer = useCallback(
    (name: PortalCustomerName) => {
      if (customerLocked) return;
      setSelectedCustomerState(name);
      try {
        localStorage.setItem(PORTAL_CUSTOMER_STORAGE_KEY, name);
      } catch {
        // ignore
      }
    },
    [customerLocked],
  );

  const value = useMemo(
    () => ({
      selectedCustomer,
      setSelectedCustomer,
      portalCustomerNames: PORTAL_CUSTOMER_NAMES,
      customerLocked,
    }),
    [selectedCustomer, setSelectedCustomer, customerLocked],
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
