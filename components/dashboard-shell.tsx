"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  IconAlertTriangle,
  IconBarChart,
  IconLayoutDashboard,
  IconLogo,
  IconPackage,
  IconSettings,
  IconUsers,
} from "@/components/icons";
import { LogoutButton } from "@/components/auth/logout-button";
import { UserMenu } from "@/components/auth/user-menu";
import { SupabaseStatus } from "@/components/ui/supabase-status";
import { badgeBase, btnSecondary, sectionLabel } from "@/lib/styles";
import { useExceptions } from "@/context/exceptions-context";

const navItems = [
  { label: "Dashboard", href: "/", icon: IconLayoutDashboard },
  { label: "Shipments", href: "/shipments", icon: IconPackage },
  { label: "Exceptions", href: "/exceptions", icon: IconAlertTriangle },
  { label: "Customers", href: "/customers", icon: IconUsers },
  { label: "Analytics", href: "/analytics", icon: IconBarChart },
  { label: "Settings", href: "/settings", icon: IconSettings },
];

export function DashboardShell({
  eyebrow,
  title,
  description,
  actions,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const { openCount } = useExceptions();

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#09090b] font-sans text-zinc-100">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 top-0 h-[480px] w-[480px] rounded-full bg-violet-600/8 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 top-1/3 h-[400px] w-[400px] rounded-full bg-indigo-600/6 blur-3xl"
      />

      <div className="relative flex min-h-screen">
        <aside className="hidden w-[272px] shrink-0 flex-col border-r border-white/[0.06] bg-zinc-950/90 backdrop-blur-xl lg:flex">
          <div className="flex h-[4.25rem] items-center gap-3 border-b border-white/[0.06] px-5">
            <Link
              href="/"
              className="flex items-center gap-3 transition-opacity hover:opacity-90"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/25 ring-1 ring-white/10">
                <IconLogo className="h-[18px] w-[18px] text-white" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold tracking-tight text-white">
                  FreightPulse
                </p>
                <p className="truncate text-[11px] font-medium text-zinc-500">
                  Exception Control
                </p>
              </div>
            </Link>
          </div>

          <nav className="flex-1 px-3 py-4">
            <p className={`mb-2 px-3 ${sectionLabel}`}>Menu</p>
            <ul className="space-y-0.5">
              {navItems.map((item) => {
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-200 ${
                        active
                          ? "bg-white/[0.07] text-white ring-1 ring-white/[0.08]"
                          : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
                      }`}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-violet-500" />
                      )}
                      <item.icon
                        className={`h-[18px] w-[18px] shrink-0 transition-colors ${
                          active
                            ? "text-violet-400"
                            : "text-zinc-500 group-hover:text-zinc-300"
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                      {item.label === "Exceptions" && (
                        <span
                          className={`ml-auto ${badgeBase} bg-rose-500/10 text-rose-400 ring-rose-500/20`}
                        >
                          {openCount}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="border-t border-white/[0.06] p-4">
            <div className="mb-4">
              <UserMenu />
            </div>
            <div className="mb-3 flex justify-center">
              <SupabaseStatus />
            </div>
            <div className="rounded-xl bg-gradient-to-br from-violet-500/10 via-indigo-500/5 to-transparent p-4 ring-1 ring-white/[0.06]">
              <p className="text-xs font-semibold text-zinc-200">Enterprise SLA</p>
              <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-500">
                Auto-escalation, carrier API sync, and custom playbooks enabled.
              </p>
              <Link
                href="/settings"
                className={`mt-4 block w-full text-center ${btnSecondary} !bg-white !text-zinc-900 hover:!bg-zinc-100`}
              >
                View Playbooks
              </Link>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-zinc-950/80 backdrop-blur-xl backdrop-saturate-150">
            <div className="flex items-center gap-2 overflow-x-auto border-b border-white/[0.06] px-4 py-3 lg:hidden">
              {navItems.map((item) => {
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                      active
                        ? "bg-white/[0.1] text-white ring-1 ring-white/[0.08]"
                        : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300"
                    }`}
                  >
                    <item.icon className="h-3.5 w-3.5" />
                    {item.label}
                  </Link>
                );
              })}
            </div>

            <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-6 lg:px-8">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <p className={sectionLabel}>{eyebrow}</p>
                  <span className="lg:hidden">
                    <SupabaseStatus />
                  </span>
                </div>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-[1.625rem]">
                  {title}
                </h1>
                {description && (
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-500">
                    {description}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                {actions}
                <div className="lg:hidden">
                  <LogoutButton className="!w-auto" />
                </div>
              </div>
            </div>
          </header>

          <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
