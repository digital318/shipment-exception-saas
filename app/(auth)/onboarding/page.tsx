import { AuthShell } from "@/components/auth/auth-shell";
import { OnboardingForm } from "@/components/auth/onboarding-form";

export default function OnboardingPage() {
  return (
    <AuthShell
      eyebrow="Welcome to FreightPulse"
      title="Set up your organization"
      description="Every user belongs to an organization. Create yours to start managing shipments and exceptions."
      footer="You can update these details later in Settings."
    >
      <OnboardingForm />
    </AuthShell>
  );
}
