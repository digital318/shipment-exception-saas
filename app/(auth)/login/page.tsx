import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import Link from "next/link";

export default function LoginPage() {
  return (
    <AuthShell
      eyebrow="Secure access"
      title="Sign in to FreightPulse"
      description="Monitor shipment exceptions, delays, and SLA performance."
      footer={
        <>
          By continuing you agree to your organization&apos;s access policy.{" "}
          <Link href="/signup" className="text-violet-400 hover:text-violet-300">
            Sign up
          </Link>
        </>
      }
    >
      <Suspense fallback={<p className="text-center text-sm text-zinc-500">Loading…</p>}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
