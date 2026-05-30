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
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  createOrganizationForUser,
  updateOrganization,
  type CreateOrganizationInput,
} from "@/lib/organization/actions";
import { fetchOrganizationSession } from "@/lib/organization/queries";
import type { Organization, OrganizationSession, UserProfile } from "@/lib/organization/types";

type OrganizationContextValue = {
  user: User | null;
  profile: UserProfile | null;
  organization: Organization | null;
  needsOnboarding: boolean;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  completeOnboarding: (input: CreateOrganizationInput) => Promise<void>;
  saveOrganization: (patch: {
    name?: string;
    opsEmail?: string;
    timezone?: string;
  }) => Promise<void>;
};

const OrganizationContext = createContext<OrganizationContextValue | null>(null);

function applySession(
  session: OrganizationSession | null,
  setters: {
    setProfile: (v: UserProfile | null) => void;
    setOrganization: (v: Organization | null) => void;
    setNeedsOnboarding: (v: boolean) => void;
  },
) {
  setters.setProfile(session?.profile ?? null);
  setters.setOrganization(session?.organization ?? null);
  setters.setNeedsOnboarding(session?.needsOnboarding ?? false);
}

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [loading, setLoading] = useState(isSupabaseConfigured());
  const [error, setError] = useState<string | null>(null);

  const loadSession = useCallback(async (activeUser: User | null) => {
    if (!isSupabaseConfigured() || !activeUser) {
      setProfile(null);
      setOrganization(null);
      setNeedsOnboarding(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const session = await fetchOrganizationSession();
      applySession(session, { setProfile, setOrganization, setNeedsOnboarding });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load organization context.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    const supabase = getSupabaseBrowserClient();

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      void loadSession(data.user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      void loadSession(nextUser);
    });

    return () => subscription.unsubscribe();
  }, [loadSession]);

  const refresh = useCallback(async () => {
    await loadSession(user);
  }, [loadSession, user]);

  const completeOnboarding = useCallback(
    async (input: CreateOrganizationInput) => {
      if (!user) throw new Error("You must be signed in to create an organization.");
      await createOrganizationForUser(input);
      await loadSession(user);
    },
    [user, loadSession],
  );

  const saveOrganization = useCallback(
    async (patch: { name?: string; opsEmail?: string; timezone?: string }) => {
      if (!organization) throw new Error("No organization selected.");
      await updateOrganization(organization.id, patch);
      await loadSession(user);
    },
    [organization, loadSession, user],
  );

  const value = useMemo(
    () => ({
      user,
      profile,
      organization,
      needsOnboarding,
      loading,
      error,
      refresh,
      completeOnboarding,
      saveOrganization,
    }),
    [
      user,
      profile,
      organization,
      needsOnboarding,
      loading,
      error,
      refresh,
      completeOnboarding,
      saveOrganization,
    ],
  );

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const ctx = useContext(OrganizationContext);
  if (!ctx) {
    throw new Error("useOrganization must be used within OrganizationProvider");
  }
  return ctx;
}
