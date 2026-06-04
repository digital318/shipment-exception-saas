"use client";

import Link from "next/link";
import { useState } from "react";
import { IconLogo } from "@/components/icons";
import { btnPrimary, btnSecondary } from "@/lib/styles";

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Benefits", href: "#benefits" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
] as const;

export function MarketingHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-zinc-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/25 ring-1 ring-white/10">
            <IconLogo className="h-[18px] w-[18px] text-white" />
          </div>
          <span className="text-sm font-semibold text-white">FreightPulse</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-xs font-medium text-zinc-400 transition hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 sm:flex">
          <Link href="/login" className={btnSecondary}>
            Sign in
          </Link>
          <Link href="#demo-request" className={btnPrimary}>
            Request Demo
          </Link>
        </div>

        <button
          type="button"
          className="rounded-lg border border-white/[0.08] px-3 py-2 text-xs text-zinc-300 md:hidden"
          onClick={() => setMenuOpen((o) => !o)}
          aria-expanded={menuOpen}
          aria-label="Toggle menu"
        >
          {menuOpen ? "Close" : "Menu"}
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-white/[0.06] px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-3">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-zinc-300"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <Link href="/login" className={`${btnSecondary} mt-2 text-center`}>
              Sign in
            </Link>
            <Link href="#demo-request" className={`${btnPrimary} text-center`}>
              Request Demo
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
