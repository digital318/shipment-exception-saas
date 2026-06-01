"use client";

import { useCustomerPortal } from "@/context/customer-portal-context";
import { badgeBase, selectBase } from "@/lib/styles";
import type { PortalCustomerName } from "@/lib/customer-portal/constants";

export function CustomerSelector() {
  const { selectedCustomer, setSelectedCustomer, portalCustomerNames } = useCustomerPortal();

  return (
    <div className="flex items-center gap-2.5">
      <label htmlFor="portal-customer-select" className="hidden text-xs text-zinc-500 sm:inline">
        View Portal As:
      </label>
      <select
        id="portal-customer-select"
        value={selectedCustomer}
        onChange={(e) => setSelectedCustomer(e.target.value as PortalCustomerName)}
        className={`${selectBase} min-w-[200px] max-w-[280px] text-[13px]`}
        aria-label="View portal as customer"
      >
        {portalCustomerNames.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
      <span className={`hidden sm:inline-flex ${badgeBase} bg-violet-500/10 text-violet-300 ring-violet-500/20`}>
        Demo mode
      </span>
    </div>
  );
}
