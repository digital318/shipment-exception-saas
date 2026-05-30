"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useOrganization } from "@/context/organization-context";
import { btnPrimary, inputBase } from "@/lib/styles";

export function OnboardingForm() {
  const router = useRouter();
  const { user, completeOnboarding } = useOrganization();

  const [organizationName, setOrganizationName] = useState("");
  const [opsEmail, setOpsEmail] = useState(user?.email ?? "");
  const [timezone, setTimezone] = useState("America/New_York");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await completeOnboarding({
        name: organizationName,
        opsEmail,
        timezone,
      });
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create organization.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label
          htmlFor="organizationName"
          className="mb-1.5 block text-xs font-medium text-zinc-400"
        >
          Organization name
        </label>
        <input
          id="organizationName"
          name="organizationName"
          type="text"
          required
          minLength={2}
          value={organizationName}
          onChange={(e) => setOrganizationName(e.target.value)}
          className={inputBase}
          placeholder="Acme Logistics"
        />
        <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-600">
          Your team&apos;s workspace for shipments, exceptions, and alerts.
        </p>
      </div>

      <div>
        <label htmlFor="opsEmail" className="mb-1.5 block text-xs font-medium text-zinc-400">
          Operations email
        </label>
        <input
          id="opsEmail"
          name="opsEmail"
          type="email"
          value={opsEmail}
          onChange={(e) => setOpsEmail(e.target.value)}
          className={inputBase}
          placeholder="ops@company.com"
        />
      </div>

      <div>
        <label htmlFor="timezone" className="mb-1.5 block text-xs font-medium text-zinc-400">
          Timezone
        </label>
        <select
          id="timezone"
          name="timezone"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className={inputBase}
        >
          <option value="America/New_York">Eastern (ET)</option>
          <option value="America/Chicago">Central (CT)</option>
          <option value="America/Denver">Mountain (MT)</option>
          <option value="America/Los_Angeles">Pacific (PT)</option>
        </select>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-300"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className={`w-full ${btnPrimary} py-2.5 disabled:opacity-50`}
      >
        {loading ? "Creating workspace…" : "Create organization"}
      </button>
    </form>
  );
}
