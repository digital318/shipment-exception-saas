import type { ReactNode } from "react";
import { CustomerPortalProvider } from "@/context/customer-portal-context";
import { ExceptionsProvider } from "@/context/exceptions-context";
import { NotificationsProvider } from "@/context/notifications-context";
import { CarrierProvider } from "@/context/carrier-context";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <ExceptionsProvider>
      <NotificationsProvider>
        <CarrierProvider>
          <CustomerPortalProvider>{children}</CustomerPortalProvider>
        </CarrierProvider>
      </NotificationsProvider>
    </ExceptionsProvider>
  );
}
