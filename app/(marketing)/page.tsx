import type { Metadata } from "next";
import { LandingPage } from "@/components/marketing/landing-page";

export const metadata: Metadata = {
  title: "FreightPulse | Shipment Exception Management Software",
  description:
    "Reduce shipment exceptions, improve customer communication, and gain real-time logistics visibility.",
};

export default function MarketingHomePage() {
  return <LandingPage />;
}
