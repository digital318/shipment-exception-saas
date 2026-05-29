import type { ReactNode } from "react";
import { ExceptionsProvider } from "@/context/exceptions-context";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <ExceptionsProvider>{children}</ExceptionsProvider>;
}
