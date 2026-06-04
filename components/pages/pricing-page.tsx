import Link from "next/link";
import { PlanComparisonTable } from "@/components/billing/plan-comparison-table";
import { IconLogo } from "@/components/icons";
import { SUBSCRIPTION_PLANS } from "@/lib/billing/plans";
import { btnPrimary, btnSecondary, cardSurface, sectionLabel } from "@/lib/styles";

export function PricingPage() {
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

      <header className="relative border-b border-white/[0.06] bg-zinc-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/25 ring-1 ring-white/10">
              <IconLogo className="h-[18px] w-[18px] text-white" />
            </div>
            <span className="text-sm font-semibold text-white">FreightPulse</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className={btnSecondary}>
              Sign in
            </Link>
            <Link href="/#demo-request" className={btnSecondary}>
              Request Demo
            </Link>
            <Link href="/signup" className={btnPrimary}>
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="text-center">
          <p className={sectionLabel}>Pricing</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Plans built for freight operations
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-zinc-500">
            From growing logistics teams to enterprise multi-site operations — choose the
            plan that matches your shipment volume and exception management needs.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {SUBSCRIPTION_PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`${cardSurface} relative flex flex-col p-6 ${
                plan.highlighted
                  ? "ring-1 ring-violet-500/30 bg-violet-500/[0.04]"
                  : ""
              }`}
            >
              {plan.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-violet-600 px-3 py-0.5 text-[11px] font-semibold text-white">
                  Most popular
                </span>
              )}
              <h2 className="text-lg font-semibold text-white">{plan.name}</h2>
              <p className="mt-3 text-3xl font-semibold tabular-nums text-white">
                ${plan.price}
                <span className="text-base font-normal text-zinc-500">/month</span>
              </p>
              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-zinc-400">
                    <span className="mt-0.5 text-emerald-400">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-col gap-2">
                <Link
                  href="/signup"
                  className={`block w-full text-center ${
                    plan.highlighted ? btnPrimary : btnSecondary
                  }`}
                >
                  Get Started
                </Link>
                <Link href="/#demo-request" className={`block w-full text-center ${btnSecondary}`}>
                  Request Demo
                </Link>
              </div>
            </div>
          ))}
        </div>

        <section className="mt-20">
          <h2 className="text-center text-xl font-semibold text-white">
            Feature comparison
          </h2>
          <p className="mt-2 text-center text-sm text-zinc-500">
            See what&apos;s included in each plan
          </p>
          <div className="mt-8">
            <PlanComparisonTable />
          </div>
        </section>

        <section className="mt-16 text-center">
          <p className="text-sm text-zinc-500">
            All plans include a 14-day free trial. No credit card required for demo.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link href="/signup" className={btnPrimary}>
              Get Started
            </Link>
            <Link href="/#demo-request" className={btnSecondary}>
              Request Demo
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
