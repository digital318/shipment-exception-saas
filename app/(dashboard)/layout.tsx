import type { ReactNode } from "react";
import { RouteGuard } from "@/components/auth/route-guard";
import { AuthRoleProvider } from "@/context/auth-role-context";
import { CustomerNotificationsProvider } from "@/context/customer-notifications-context";
import { CustomerPortalProvider } from "@/context/customer-portal-context";
import { ExceptionsProvider } from "@/context/exceptions-context";
import { NotificationsProvider } from "@/context/notifications-context";
import { CarrierProvider } from "@/context/carrier-context";
import { SubscriptionProvider } from "@/context/subscription-context";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <ExceptionsProvider>
      <NotificationsProvider>
        <CustomerNotificationsProvider>
          <CarrierProvider>
            <AuthRoleProvider>
              <CustomerPortalProvider>
                <SubscriptionProvider>
                  <RouteGuard>{children}</RouteGuard>
                </SubscriptionProvider>
              </CustomerPortalProvider>
            </AuthRoleProvider>
          </CarrierProvider>
        </CustomerNotificationsProvider>
      </NotificationsProvider>
    </ExceptionsProvider>
  );
}
