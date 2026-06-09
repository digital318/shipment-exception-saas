import Image from "next/image";
import Link from "next/link";
import { DemoRequestForm } from "@/components/marketing/demo-request-form";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { PlanComparisonTable } from "@/components/billing/plan-comparison-table";
import { SUBSCRIPTION_PLANS } from "@/lib/billing/plans";
import {
  CUSTOMER_BENEFITS,
  HOW_IT_WORKS_STEPS,
  LANDING_FAQ,
  LANDING_FEATURES,
} from "@/lib/marketing/constants";
import { btnPrimary, btnSecondary, cardSurface, sectionLabel } from "@/lib/styles";

export function LandingPage() {
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

      <MarketingHeader />

      <main>
        <section className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <p className={sectionLabel}>Shipment exception management</p>
          <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Reduce Shipment Exceptions Before They Become Customer Problems
          </h1>
          <p className="mt-6 max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base">
            FreightPulse gives logistics teams real-time exception visibility, escalation
            workflows, customer communication tools, and executive reporting.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="#demo-request" className={btnPrimary}>
              Request Demo
            </Link>
            <Link href="/pricing" className={btnSecondary}>
              View Pricing
            </Link>
          </div>
          <div className="mt-12 relative rounded-xl border border-white/10 overflow-hidden shadow-2xl max-w-5xl mx-auto hidden sm:block">
            <Image
              src="/dashboard-preview.png"
              alt="FreightPulse Exception Operations Center dashboard"
              width={1200}
              height={700}
              priority={true}
            />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#0a0a1a] to-transparent" />
          </div>
        </section>

        <section className="border-y border-white/[0.06] py-8 bg-zinc-900/20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="text-center text-xs uppercase tracking-widest text-zinc-400 mb-6">
              Trusted by freight operations teams
            </p>
            <div className="flex items-center justify-center gap-10 flex-wrap">
              <span className="text-zinc-300 text-sm font-medium tracking-wide">3PL Partners</span>
              <span className="text-zinc-300 text-sm font-medium tracking-wide">Freight Brokers</span>
              <span className="text-zinc-300 text-sm font-medium tracking-wide">Import Groups</span>
              <span className="text-zinc-300 text-sm font-medium tracking-wide">Distributors</span>
              <span className="text-zinc-300 text-sm font-medium tracking-wide">E-commerce Ops</span>
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-16 sm:px-6">
          <p className={sectionLabel}>Features</p>
          <h2 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">
            Built for freight operations teams
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {LANDING_FEATURES.map((feature) => (
              <article key={feature.title} className={`${cardSurface} p-5`}>
                <h3 className="text-sm font-semibold text-white">{feature.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-16 sm:px-6">
          <p className={sectionLabel}>How it works</p>
          <h2 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">
            From detection to resolution
          </h2>
          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {HOW_IT_WORKS_STEPS.map((item) => (
              <li key={item.step} className={`${cardSurface} relative p-5`}>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-500/15 text-xs font-semibold text-violet-300 ring-1 ring-violet-500/25">
                  {item.step}
                </span>
                <h3 className="mt-4 text-sm font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-zinc-500">{item.description}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="benefits" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-16 sm:px-6">
          <p className={sectionLabel}>Customer benefits</p>
          <h2 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">
            Outcomes your team can measure
          </h2>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
            <div className="rounded-xl border border-white/[0.06] bg-zinc-900/30 p-6 text-center">
              <p className="text-4xl font-semibold text-white">60%</p>
              <p className="mt-2 text-sm font-medium text-zinc-300">
                Faster exception response
              </p>
              <p className="mt-1 text-xs text-zinc-400">
                vs. manual email workflows
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-zinc-900/30 p-6 text-center">
              <p className="text-4xl font-semibold text-white">3x</p>
              <p className="mt-2 text-sm font-medium text-zinc-300">
                More SLA compliance
              </p>
              <p className="mt-1 text-xs text-zinc-400">
                with automated escalations
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-zinc-900/30 p-6 text-center">
              <p className="text-4xl font-semibold text-white">80%</p>
              <p className="mt-2 text-sm font-medium text-zinc-300">
                Reduction in missed alerts
              </p>
              <p className="mt-1 text-xs text-zinc-400">
                via real-time playbooks
              </p>
            </div>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CUSTOMER_BENEFITS.map((benefit) => (
              <li
                key={benefit}
                className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-zinc-900/30 px-4 py-3 text-sm text-zinc-300"
              >
                <span className="text-emerald-400">✓</span>
                {benefit}
              </li>
            ))}
          </ul>
        </section>

        <section id="pricing" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-16 sm:px-6">
          <p className={sectionLabel}>Pricing</p>
          <h2 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">
            Plans built for freight operations
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-zinc-500">
            Compare plans or view full details on the{" "}
            <Link href="/pricing" className="text-violet-400 hover:text-violet-300">
              pricing page
            </Link>
            .
          </p>
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {SUBSCRIPTION_PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`${cardSurface} flex flex-col p-6 ${
                  plan.highlighted ? "ring-1 ring-violet-500/30 bg-violet-500/[0.04]" : ""
                }`}
              >
                <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                <p className="mt-3 text-3xl font-semibold tabular-nums text-white">
                  ${plan.price}
                  <span className="text-base font-normal text-zinc-500">/month</span>
                </p>
                <ul className="mt-6 flex-1 space-y-2">
                  {plan.features.slice(0, 4).map((f) => (
                    <li key={f} className="text-xs text-zinc-400">
                      ✓ {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-6 flex flex-col gap-2">
                  <Link href="/signup" className={`text-center ${btnPrimary}`}>
                    Get Started
                  </Link>
                  <Link href="#demo-request" className={`text-center ${btnSecondary}`}>
                    Request Demo
                  </Link>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-12">
            <PlanComparisonTable />
          </div>
        </section>

        <section
          id="demo-request"
          className="mx-auto max-w-6xl scroll-mt-24 px-4 py-16 sm:px-6"
        >
          <p className={sectionLabel}>Demo request</p>
          <h2 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">
            See FreightPulse in action
          </h2>
          <p className="mt-3 max-w-xl text-sm text-zinc-500">
            Tell us about your operation and we&apos;ll reach out to schedule a walkthrough.
          </p>
          <div className={`${cardSurface} mt-8 max-w-2xl p-6 sm:p-8`}>
            <DemoRequestForm />
          </div>
        </section>

        <section id="faq" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-16 sm:px-6">
          <p className={sectionLabel}>FAQ</p>
          <h2 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">
            Common questions
          </h2>
          <dl className="mt-8 space-y-4">
            {LANDING_FAQ.map((item) => (
              <div key={item.question} className={`${cardSurface} p-5`}>
                <dt className="text-sm font-semibold text-white">{item.question}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-zinc-500">{item.answer}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
