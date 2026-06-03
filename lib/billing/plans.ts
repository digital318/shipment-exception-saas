import type { PlanId, SubscriptionPlan } from "./types";

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "starter",
    name: "Starter",
    price: 299,
    shipmentLimit: 500,
    features: [
      "Up to 500 shipments/month",
      "Basic exception tracking",
      "Customer portal",
      "Reporting",
    ],
  },
  {
    id: "professional",
    name: "Professional",
    price: 799,
    shipmentLimit: 5000,
    highlighted: true,
    features: [
      "Up to 5,000 shipments/month",
      "Escalations",
      "Playbooks",
      "Customer notifications",
      "Executive dashboard",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 1999,
    shipmentLimit: null,
    features: [
      "Unlimited shipments",
      "Multi-site operations",
      "Carrier integrations",
      "Custom reporting",
      "Priority support",
    ],
  },
];

export function getPlanById(planId: PlanId): SubscriptionPlan {
  return SUBSCRIPTION_PLANS.find((p) => p.id === planId) ?? SUBSCRIPTION_PLANS[1];
}

export const PLAN_COMPARISON_FEATURES: {
  label: string;
  starter: boolean | string;
  professional: boolean | string;
  enterprise: boolean | string;
}[] = [
  { label: "Shipments/month", starter: "500", professional: "5,000", enterprise: "Unlimited" },
  { label: "Exception tracking", starter: true, professional: true, enterprise: true },
  { label: "Customer portal", starter: true, professional: true, enterprise: true },
  { label: "Reporting", starter: true, professional: true, enterprise: true },
  { label: "Escalations", starter: false, professional: true, enterprise: true },
  { label: "Playbooks", starter: false, professional: true, enterprise: true },
  { label: "Customer notifications", starter: false, professional: true, enterprise: true },
  { label: "Executive dashboard", starter: false, professional: true, enterprise: true },
  { label: "Multi-site operations", starter: false, professional: false, enterprise: true },
  { label: "Carrier integrations", starter: false, professional: false, enterprise: true },
  { label: "Custom reporting", starter: false, professional: false, enterprise: true },
  { label: "Priority support", starter: false, professional: false, enterprise: true },
];
