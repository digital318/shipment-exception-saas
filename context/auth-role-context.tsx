"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useOrganization } from "@/context/organization-context";
import {
  canAccessPath,
  canMutate,
  getDefaultPathForRole,
  isAdmin,
} from "@/lib/auth/permissions";
import {
  DEMO_USERS,
  DEFAULT_DEMO_USER_ID,
  getDemoUserById,
  type DemoUser,
  type UserRole,
} from "@/lib/auth/roles";
import {
  getCurrentActor,
  loadDemoUserId,
  resolveDemoUser,
  saveDemoUserId,
  setCurrentActor,
} from "@/lib/auth/session";
import type { PortalCustomerName } from "@/lib/customer-portal/constants";

type AuthRoleContextValue = {
  currentUser: DemoUser;
  role: UserRole;
  organizationName: string;
  canMutate: boolean;
  isAdmin: boolean;
  customerAccount: PortalCustomerName | null;
  switchDemoUser: (userId: string) => void;
  demoUsers: DemoUser[];
  canAccessPath: (pathname: string) => boolean;
  defaultPath: string;
  actorName: string;
};

const AuthRoleContext = createContext<AuthRoleContextValue | null>(null);

const DEMO_ORG_NAME = "FreightPulse Demo";

export function AuthRoleProvider({ children }: { children: ReactNode }) {
  const { organization } = useOrganization();
  const orgKey = organization?.id ?? "demo";
  const organizationName = organization?.name ?? DEMO_ORG_NAME;

  const [userId, setUserId] = useState(DEFAULT_DEMO_USER_ID);

  useEffect(() => {
    const stored = loadDemoUserId(orgKey);
    setUserId(stored);
    const user = resolveDemoUser(orgKey, stored);
    setCurrentActor(user.name);
  }, [orgKey]);

  const currentUser = useMemo(
    () => resolveDemoUser(orgKey, userId),
    [orgKey, userId],
  );

  const role = currentUser.role;

  const switchDemoUser = useCallback(
    (nextId: string) => {
      const user = getDemoUserById(nextId);
      if (!user) return;
      setUserId(nextId);
      saveDemoUserId(orgKey, nextId);
      setCurrentActor(user.name);
    },
    [orgKey],
  );

  const value = useMemo(
    () => ({
      currentUser,
      role,
      organizationName,
      canMutate: canMutate(role),
      isAdmin: isAdmin(role),
      customerAccount: currentUser.customerAccount ?? null,
      switchDemoUser,
      demoUsers: DEMO_USERS,
      canAccessPath: (pathname: string) => canAccessPath(role, pathname),
      defaultPath: getDefaultPathForRole(role),
      actorName: getCurrentActor(),
    }),
    [currentUser, role, organizationName, switchDemoUser],
  );

  return (
    <AuthRoleContext.Provider value={value}>{children}</AuthRoleContext.Provider>
  );
}

export function useAuthRole() {
  const ctx = useContext(AuthRoleContext);
  if (!ctx) {
    throw new Error("useAuthRole must be used within AuthRoleProvider");
  }
  return ctx;
}

/** Guard mutations for Viewer and unauthorized roles. */
export function useCanMutate(): boolean {
  return useAuthRole().canMutate;
}
