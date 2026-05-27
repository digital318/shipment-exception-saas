"use client";

import type { ReactNode } from "react";
import { ExceptionsProvider } from "@/context/exceptions-context";
import { ToastProvider } from "@/context/toast-context";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <ExceptionsProvider>{children}</ExceptionsProvider>
    </ToastProvider>
  );
}
