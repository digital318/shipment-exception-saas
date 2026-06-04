import type { Metadata } from "next";
import { PricingPage } from "@/components/pages/pricing-page";

export const metadata: Metadata = {
  title: "Pricing | FreightPulse",
  description:
    "Plans for freight operations teams — exception management, escalations, and customer communication.",
};

export default function Page() {
  return <PricingPage />;
}
