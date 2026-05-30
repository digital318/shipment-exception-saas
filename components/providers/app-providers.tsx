"use client";

import type { ReactNode } from "react";
import { OrganizationProvider } from "@/context/organization-context";
import { ToastProvider } from "@/context/toast-context";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <OrganizationProvider>{children}</OrganizationProvider>
    </ToastProvider>
  );
}
