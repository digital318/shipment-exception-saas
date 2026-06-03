"use client";

import { useEffect } from "react";
import { IconX } from "@/components/icons";
import { SUBSCRIPTION_PLANS } from "@/lib/billing/plans";
import type { PlanId } from "@/lib/billing/types";
import { btnPrimary, btnSecondary, cardSurface } from "@/lib/styles";

export function UpgradePlanModal({
  open,
  onClose,
  currentPlanId,
  onSelectPlan,
}: {
  open: boolean;
  onClose: () => void;
  currentPlanId: PlanId;
  onSelectPlan: (planId: PlanId) => void;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close modal"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgrade-plan-title"
        className={`relative z-10 w-full max-w-3xl ${cardSurface} p-6 shadow-2xl`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="upgrade-plan-title" className="text-lg font-semibold text-white">
              Upgrade your plan
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Choose a plan that fits your shipment volume. Payment integration coming soon.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-zinc-400 hover:text-white">
            <IconX className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {SUBSCRIPTION_PLANS.map((plan) => {
            const isCurrent = plan.id === currentPlanId;
            return (
              <div
                key={plan.id}
                className={`rounded-xl border p-5 transition ${
                  plan.highlighted
                    ? "border-violet-500/40 bg-violet-500/5 ring-1 ring-violet-500/20"
                    : "border-white/[0.06] bg-white/[0.02]"
                }`}
              >
                <p className="text-sm font-semibold text-white">{plan.name}</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-white">
                  ${plan.price}
                  <span className="text-sm font-normal text-zinc-500">/mo</span>
                </p>
                <ul className="mt-4 space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="text-xs text-zinc-400">
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  disabled={isCurrent}
                  onClick={() => {
                    onSelectPlan(plan.id);
                    onClose();
                  }}
                  className={`mt-5 w-full ${isCurrent ? btnSecondary + " opacity-50" : btnPrimary}`}
                >
                  {isCurrent ? "Current plan" : `Select ${plan.name}`}
                </button>
              </div>
            );
          })}
        </div>

        <p className="mt-5 text-center text-[11px] text-zinc-600">
          Demo mode — no payment required. Stripe integration will be added in a future release.
        </p>
      </div>
    </div>
  );
}
