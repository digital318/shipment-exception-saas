"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { LogoutButton } from "@/components/auth/logout-button";
import { sectionLabel } from "@/lib/styles";

export function UserMenu() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const supabase = getSupabaseBrowserClient();

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!user) return null;

  const displayEmail = user.email ?? "Signed in";

  return (
    <div className="space-y-3">
      <div>
        <p className={sectionLabel}>Account</p>
        <p className="mt-1 truncate text-xs font-medium text-zinc-300" title={displayEmail}>
          {displayEmail}
        </p>
      </div>
      <LogoutButton />
    </div>
  );
}
