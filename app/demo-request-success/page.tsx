import type { Metadata } from "next";
import Link from "next/link";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { btnPrimary, btnSecondary, cardSurface } from "@/lib/styles";

export const metadata: Metadata = {
  title: "Demo Request Received | FreightPulse",
  description: "Thanks for your interest in FreightPulse.",
};

export default function DemoRequestSuccessPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#09090b] font-sans text-zinc-100">
      <MarketingHeader />
      <main className="mx-auto flex max-w-lg flex-1 flex-col items-center justify-center px-4 py-24 sm:px-6">
        <article className={`${cardSurface} w-full p-8 text-center`}>
          <p className="text-3xl text-emerald-400">✓</p>
          <h1 className="mt-4 text-xl font-semibold text-white">Thank you</h1>
          <p className="mt-4 text-sm leading-relaxed text-zinc-400">
            Thanks for your interest in FreightPulse. We&apos;ll contact you shortly.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/" className={btnPrimary}>
              Back to home
            </Link>
            <Link href="/pricing" className={btnSecondary}>
              View pricing
            </Link>
          </div>
        </article>
      </main>
      <MarketingFooter />
    </div>
  );
}
