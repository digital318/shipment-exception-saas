import type { UserRole } from "@/lib/auth/roles";

/** Feature areas used for RBAC checks. */
export type Permission =
  | "dashboard"
  | "shipments"
  | "exceptions"
  | "notifications"
  | "escalations"
  | "executive"
  | "playbooks"
  | "customers"
  | "portal"
  | "customer_notifications"
  | "carriers"
  | "analytics"
  | "reports"
  | "billing"
  | "users"
  | "organization_settings"
  | "settings";

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  Admin: [
    "dashboard",
    "shipments",
    "exceptions",
    "notifications",
    "escalations",
    "executive",
    "playbooks",
    "customers",
    "portal",
    "customer_notifications",
    "carriers",
    "analytics",
    "reports",
    "billing",
    "users",
    "organization_settings",
    "settings",
  ],
  "Operations Manager": [
    "dashboard",
    "shipments",
    "exceptions",
    "notifications",
    "escalations",
    "playbooks",
    "reports",
  ],
  "Customer Success": [
    "dashboard",
    "customers",
    "portal",
    "customer_notifications",
    "reports",
  ],
  Viewer: [
    "dashboard",
    "shipments",
    "exceptions",
    "notifications",
    "escalations",
    "executive",
    "playbooks",
    "customers",
    "portal",
    "customer_notifications",
    "carriers",
    "analytics",
    "reports",
    "settings",
  ],
  "Customer User": ["portal", "customer_notifications"],
};

/** Admin-only routes (Phase 8C). */
export const ADMIN_ONLY_PATHS = [
  "/organization-settings",
  "/users",
  "/billing",
] as const;

const PATH_PERMISSION: Record<string, Permission> = {
  "/": "dashboard",
  "/shipments": "shipments",
  "/exceptions": "exceptions",
  "/notifications": "notifications",
  "/escalations": "escalations",
  "/executive": "executive",
  "/playbooks": "playbooks",
  "/customers": "customers",
  "/portal": "portal",
  "/customer-notifications": "customer_notifications",
  "/carriers": "carriers",
  "/analytics": "analytics",
  "/reports": "reports",
  "/billing": "billing",
  "/users": "users",
  "/organization-settings": "organization_settings",
  "/settings": "settings",
};

export function getPermissionForPath(pathname: string): Permission | null {
  if (pathname === "/") return "dashboard";
  const match = Object.entries(PATH_PERMISSION)
    .filter(([path]) => path !== "/")
    .sort((a, b) => b[0].length - a[0].length)
    .find(([path]) => pathname.startsWith(path));
  return match ? match[1] : null;
}

export function roleHasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function canAccessPath(role: UserRole, pathname: string): boolean {
  const permission = getPermissionForPath(pathname);
  if (!permission) return role === "Admin";
  return roleHasPermission(role, permission);
}

export function isAdminOnlyPath(pathname: string): boolean {
  return ADMIN_ONLY_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export function canMutate(role: UserRole): boolean {
  return role !== "Viewer";
}

export function isAdmin(role: UserRole): boolean {
  return role === "Admin";
}

export function getDefaultPathForRole(role: UserRole): string {
  if (role === "Customer User") return "/portal";
  if (role === "Customer Success") return "/customers";
  if (role === "Operations Manager") return "/shipments";
  return "/";
}

export type NavItemDef = {
  label: string;
  href: string;
  permission: Permission;
};

export const NAV_ITEM_DEFS: NavItemDef[] = [
  { label: "Dashboard", href: "/", permission: "dashboard" },
  { label: "Shipments", href: "/shipments", permission: "shipments" },
  { label: "Exceptions", href: "/exceptions", permission: "exceptions" },
  { label: "Notifications", href: "/notifications", permission: "notifications" },
  { label: "Escalations", href: "/escalations", permission: "escalations" },
  { label: "Executive", href: "/executive", permission: "executive" },
  { label: "Playbooks", href: "/playbooks", permission: "playbooks" },
  { label: "Customers", href: "/customers", permission: "customers" },
  { label: "Customer Portal", href: "/portal", permission: "portal" },
  {
    label: "Customer Notifications",
    href: "/customer-notifications",
    permission: "customer_notifications",
  },
  { label: "Carriers", href: "/carriers", permission: "carriers" },
  { label: "Analytics", href: "/analytics", permission: "analytics" },
  { label: "Reports", href: "/reports", permission: "reports" },
  { label: "Billing", href: "/billing", permission: "billing" },
  { label: "Users", href: "/users", permission: "users" },
  {
    label: "Organization Settings",
    href: "/organization-settings",
    permission: "organization_settings",
  },
  { label: "Settings", href: "/settings", permission: "settings" },
];

export function getNavItemsForRole(role: UserRole): NavItemDef[] {
  return NAV_ITEM_DEFS.filter((item) => roleHasPermission(role, item.permission));
}
