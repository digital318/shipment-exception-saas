import type { ReactNode } from "react";
import { ExceptionsProvider } from "@/context/exceptions-context";
import { NotificationsProvider } from "@/context/notifications-context";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <ExceptionsProvider>
      <NotificationsProvider>{children}</NotificationsProvider>
    </ExceptionsProvider>
  );
}
