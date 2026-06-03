"use client";

import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { LogoutButton } from "@/components/auth/logout-button";
import { useAuthRole } from "@/context/auth-role-context";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { UserRole } from "@/lib/auth/roles";
import { badgeBase, btnSecondary, sectionLabel } from "@/lib/styles";

const roleBadgeStyles: Record<UserRole, string> = {
  Admin: `${badgeBase} bg-violet-500/10 text-violet-300 ring-violet-500/20`,
  "Operations Manager": `${badgeBase} bg-sky-500/10 text-sky-300 ring-sky-500/20`,
  "Customer Success": `${badgeBase} bg-emerald-500/10 text-emerald-400 ring-emerald-500/20`,
  Viewer: `${badgeBase} bg-zinc-500/10 text-zinc-400 ring-zinc-500/20`,
  "Customer User": `${badgeBase} bg-amber-500/10 text-amber-400 ring-amber-500/20`,
};

export function UserMenu() {
  const {
    currentUser,
    role,
    organizationName,
    demoUsers,
    switchDemoUser,
  } = useAuthRole();
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const supabase = getSupabaseBrowserClient();

    supabase.auth.getUser().then(({ data }) => {
      setSupabaseUser(data.user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSupabaseUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!switcherOpen) return;
    function onClickOutside(e: MouseEvent) {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setSwitcherOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [switcherOpen]);

  const displayEmail = supabaseUser?.email ?? currentUser.email;

  return (
    <div className="space-y-4">
      <div>
        <p className={sectionLabel}>Profile</p>
        <p className="mt-2 truncate text-sm font-semibold text-white">{currentUser.name}</p>
        <p className="mt-0.5 truncate text-xs text-zinc-500" title={displayEmail}>
          {displayEmail}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className={roleBadgeStyles[role]}>{role}</span>
        </div>
        <p className="mt-2 truncate text-[11px] text-zinc-600">{organizationName}</p>
      </div>

      <div ref={switcherRef} className="relative">
        <button
          type="button"
          onClick={() => setSwitcherOpen((o) => !o)}
          className={`w-full ${btnSecondary}`}
        >
          Switch demo user
        </button>
        {switcherOpen && (
          <ul className="absolute bottom-full left-0 right-0 z-30 mb-2 max-h-52 overflow-y-auto rounded-lg border border-white/[0.08] bg-zinc-900 py-1 shadow-xl">
            {demoUsers.map((user) => (
              <li key={user.id}>
                <button
                  type="button"
                  onClick={() => {
                    switchDemoUser(user.id);
                    setSwitcherOpen(false);
                  }}
                  className={`flex w-full flex-col px-3 py-2 text-left text-xs transition hover:bg-white/[0.06] ${
                    user.id === currentUser.id ? "bg-white/[0.04]" : ""
                  }`}
                >
                  <span className="font-medium text-zinc-200">{user.name}</span>
                  <span className="text-[10px] text-zinc-500">{user.role}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <LogoutButton />
    </div>
  );
}
