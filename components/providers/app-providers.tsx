"use client";

import type { ReactNode } from "react";
import { ToastProvider } from "@/context/toast-context";

export function AppProviders({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
