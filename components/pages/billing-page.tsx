"use client";

import { useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/dashboard-shell";
import { PlanComparisonTable } from "@/components/billing/plan-comparison-table";
import { UpgradePlanModal } from "@/components/billing/upgrade-plan-modal";
import { SectionHeading } from "@/components/ui/section-heading";
import {
  useOrganizationDisplayName,
  useSubscription,
} from "@/context/subscription-context";
import { badgeBase, btnPrimary, btnSecondary, cardSurface, sectionLabel } from "@/lib/styles";

const statusStyles: Record<string, string> = {
  trialing: `${badgeBase} bg-sky-500/10 text-sky-300 ring-sky-500/20`,
  active: `${badgeBase} bg-emerald-500/10 text-emerald-400 ring-emerald-500/20`,
  past_due: `${badgeBase} bg-amber-500/10 text-amber-400 ring-amber-500/20`,
  canceled: `${badgeBase} bg-zinc-500/10 text-zinc-400 ring-zinc-500/20`,
};

const statusLabels: Record<string, string> = {
  trialing: "Free trial",
  active: "Active",
  past_due: "Past due",
  canceled: "Canceled",
};

export function BillingPage() {
  const orgName = useOrganizationDisplayName();
  const {
    subscription,
    currentPlan,
    trialDaysRemaining,
    usage,
    utilization,
    usageTrends,
    growthMetrics,
    upgradePlan,
  } = useSubscription();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const maxTrend = Math.max(...usageTrends.map((t) => t.shipments), 1);

  return (
    <DashboardShell
      eyebrow="Subscription & usage"
      title="Billing"
      description="Manage your FreightPulse subscription, monitor usage, and review plan utilization"
      actions={
        <button type="button" onClick={() => setUpgradeOpen(true)} className={btnPrimary}>
          Upgrade plan
        </button>
      }
    >
      <div className="space-y-8">
        {subscription.status === "trialing" && (
          <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 px-5 py-4 ring-1 ring-sky-500/10">
            <p className="text-sm font-medium text-sky-300">
              {trialDaysRemaining} day{trialDaysRemaining !== 1 ? "s" : ""} remaining in your free trial
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              You&apos;re on the {currentPlan.name} plan. Upgrade anytime to keep full access after your trial.
            </p>
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Current plan" value={currentPlan.name} accent="violet" />
          <MetricCard label="Organization" value={orgName} accent="emerald" />
          <MetricCard
            label="Subscription status"
            value={
              <span className={statusStyles[subscription.status]}>
                {statusLabels[subscription.status]}
              </span>
            }
            accent="sky"
          />
          <MetricCard
            label="Monthly price"
            value={`$${currentPlan.price}/mo`}
            accent="amber"
          />
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Shipment volume"
            value={usage.shipmentVolume.toLocaleString()}
            sub="Monitored this period"
          />
          <MetricCard
            label="Open exceptions"
            value={usage.openExceptions.toLocaleString()}
            sub="Active issues"
          />
          <MetricCard
            label="Customer count"
            value={usage.customerCount.toLocaleString()}
            sub="Active accounts"
          />
          <MetricCard
            label="Plan utilization"
            value={
              utilization.pct !== null ? `${utilization.pct}%` : "Unlimited"
            }
            sub={
              utilization.limit !== null
                ? `${utilization.used} / ${utilization.limit} shipments`
                : `${utilization.used} shipments used`
            }
          />
        </section>

        <section>
          <SectionHeading
            title="Usage tracking"
            description="Activity drawn from your FreightPulse workspace"
          />
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <UsageTile
              label="Shipments monitored"
              value={usage.shipmentsMonitored}
            />
            <UsageTile
              label="Exceptions processed"
              value={usage.exceptionsProcessed}
            />
            <UsageTile label="Reports generated" value={usage.reportsGenerated} />
            <UsageTile
              label="Customer notifications sent"
              value={usage.customerNotificationsSent}
            />
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className={`${cardSurface} p-5 sm:p-6`}>
            <h3 className="text-sm font-semibold text-white">Usage trends</h3>
            <p className="mt-1 text-xs text-zinc-500">Shipments monitored over the last 6 months</p>
            <div className="mt-6 flex items-end gap-2 h-40">
              {usageTrends.map((point) => (
                <div key={point.month} className="flex flex-1 flex-col items-center gap-2">
                  <div
                    className="w-full rounded-t-md bg-gradient-to-t from-violet-600/80 to-indigo-500/60"
                    style={{ height: `${(point.shipments / maxTrend) * 100}%`, minHeight: 8 }}
                  />
                  <span className="text-[10px] text-zinc-500">{point.month}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={`${cardSurface} p-5 sm:p-6`}>
            <h3 className="text-sm font-semibold text-white">Organization growth</h3>
            <p className="mt-1 text-xs text-zinc-500">Key metrics for your subscription review</p>
            <dl className="mt-6 space-y-4">
              <GrowthRow
                label="Customer growth"
                value={`+${growthMetrics.customerGrowthPct}%`}
              />
              <GrowthRow
                label="Shipment volume growth"
                value={`+${growthMetrics.shipmentGrowthPct}%`}
              />
              <GrowthRow
                label="Exception resolution rate"
                value={`${growthMetrics.exceptionResolutionRate}%`}
              />
              <GrowthRow
                label="Active customers"
                value={growthMetrics.activeCustomers.toString()}
              />
            </dl>
          </div>
        </section>

        <section>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionHeading
              title="Plan comparison"
              description="Compare features across subscription tiers"
            />
            <Link href="/pricing" className={btnSecondary}>
              View public pricing
            </Link>
          </div>
          <div className="mt-4">
            <PlanComparisonTable compact />
          </div>
        </section>

        <section className={`${cardSurface} p-5 sm:p-6`}>
          <h3 className="text-sm font-semibold text-white">Current plan details</h3>
          <p className="mt-1 text-xs text-zinc-500">{currentPlan.name} — ${currentPlan.price}/month</p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {currentPlan.features.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-zinc-400">
                <span className="text-emerald-400">✓</span>
                {f}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <UpgradePlanModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        currentPlanId={subscription.planId}
        onSelectPlan={upgradePlan}
      />
    </DashboardShell>
  );
}

function MetricCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  accent?: "violet" | "emerald" | "sky" | "amber";
}) {
  const accentGradients = {
    violet: "from-violet-500/20 via-indigo-500/10 to-transparent",
    emerald: "from-emerald-500/20 via-teal-500/10 to-transparent",
    sky: "from-sky-500/20 via-blue-500/10 to-transparent",
    amber: "from-amber-500/20 via-orange-500/10 to-transparent",
  };

  return (
    <div className={`${cardSurface} relative overflow-hidden p-5`}>
      {accent && (
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accentGradients[accent]} opacity-60`}
        />
      )}
      <div className="relative">
        <p className={sectionLabel}>{label}</p>
        <p className="mt-2 text-xl font-semibold text-white">{value}</p>
        {sub && <p className="mt-1 text-xs text-zinc-500">{sub}</p>}
      </div>
    </div>
  );
}

function UsageTile({ label, value }: { label: string; value: number }) {
  return (
    <div className={`${cardSurface} p-5`}>
      <p className={sectionLabel}>{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-white">
        {value.toLocaleString()}
      </p>
    </div>
  );
}

function GrowthRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-white/[0.04] pb-3 last:border-0 last:pb-0">
      <dt className="text-sm text-zinc-400">{label}</dt>
      <dd className="text-sm font-semibold tabular-nums text-white">{value}</dd>
    </div>
  );
}
