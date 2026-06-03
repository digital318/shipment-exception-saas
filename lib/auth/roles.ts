import type { PortalCustomerName } from "@/lib/customer-portal/constants";
import { DEFAULT_PORTAL_CUSTOMER } from "@/lib/customer-portal/constants";

/** SaaS roles for RBAC (Phase 8C). */
export type UserRole =
  | "Admin"
  | "Operations Manager"
  | "Customer Success"
  | "Viewer"
  | "Customer User";

export const ALL_ROLES: UserRole[] = [
  "Admin",
  "Operations Manager",
  "Customer Success",
  "Viewer",
  "Customer User",
];

export const INVITABLE_ROLES: UserRole[] = [
  "Admin",
  "Operations Manager",
  "Customer Success",
  "Viewer",
  "Customer User",
];

export type MemberStatus = "active" | "disabled";
export type InvitationStatus = "Pending" | "Accepted" | "Expired";

export type DemoUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  /** Customer account scope for Customer User role. */
  customerAccount?: PortalCustomerName;
};

export const DEMO_USERS: DemoUser[] = [
  {
    id: "user-1",
    name: "Sarah Chen",
    email: "sarah.chen@freightpulse.io",
    role: "Admin",
  },
  {
    id: "user-2",
    name: "Marcus Webb",
    email: "marcus.webb@freightpulse.io",
    role: "Operations Manager",
  },
  {
    id: "user-3",
    name: "Lisa Park",
    email: "lisa.park@freightpulse.io",
    role: "Customer Success",
  },
  {
    id: "user-4",
    name: "James Ortiz",
    email: "james.ortiz@freightpulse.io",
    role: "Viewer",
  },
  {
    id: "user-5",
    name: "Alex Rivera",
    email: "alex.rivera@atlasconstruction.com",
    role: "Customer User",
    customerAccount: DEFAULT_PORTAL_CUSTOMER,
  },
];

export const DEFAULT_DEMO_USER_ID = "user-1";

export function getDemoUserById(id: string): DemoUser | undefined {
  return DEMO_USERS.find((u) => u.id === id);
}

export function getDemoUserByName(name: string): DemoUser | undefined {
  return DEMO_USERS.find((u) => u.name === name);
}
