import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer className="border-t border-white/[0.06] bg-zinc-950/60">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="text-sm font-semibold text-white">FreightPulse</p>
          <p className="mt-1 text-xs text-zinc-500">
            Shipment exception management for logistics teams
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-zinc-500">
          <Link href="/pricing" className="transition hover:text-zinc-300">
            Pricing
          </Link>
          <Link href="/login" className="transition hover:text-zinc-300">
            Sign in
          </Link>
          <Link href="/signup" className="transition hover:text-zinc-300">
            Start trial
          </Link>
          <a href="#demo-request" className="transition hover:text-zinc-300">
            Request demo
          </a>
        </nav>
        <p className="text-[11px] text-zinc-600">
          © {new Date().getFullYear()} FreightPulse. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
