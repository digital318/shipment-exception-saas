import Link from "next/link";
import type { ReactNode } from "react";
import { IconLogo } from "@/components/icons";
import { sectionLabel } from "@/lib/styles";

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#09090b] font-sans text-zinc-100">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 top-0 h-[480px] w-[480px] rounded-full bg-violet-600/8 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 top-1/3 h-[400px] w-[400px] rounded-full bg-indigo-600/6 blur-3xl"
      />

      <div className="relative flex flex-1 flex-col items-center justify-center px-4 py-12">
        <Link
          href="/"
          className="mb-10 flex items-center gap-3 transition-opacity hover:opacity-90"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/25 ring-1 ring-white/10">
            <IconLogo className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight text-white">FreightPulse</p>
            <p className="text-[11px] font-medium text-zinc-500">Exception Control</p>
          </div>
        </Link>

        <div className="w-full max-w-[420px]">
          <p className={`text-center ${sectionLabel}`}>{eyebrow}</p>
          <h1 className="mt-2 text-center text-2xl font-semibold tracking-tight text-white">
            {title}
          </h1>
          <p className="mt-2 text-center text-sm leading-relaxed text-zinc-500">
            {description}
          </p>

          <div className="mt-8 rounded-xl border border-white/[0.06] bg-zinc-900/40 p-6 shadow-sm shadow-black/10 ring-1 ring-white/[0.04] sm:p-8">
            {children}
          </div>

          <p className="mt-6 text-center text-sm text-zinc-500">{footer}</p>
        </div>
      </div>
    </div>
  );
}
