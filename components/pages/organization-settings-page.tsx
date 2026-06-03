"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { useAuthRole } from "@/context/auth-role-context";
import { useOrganization } from "@/context/organization-context";
import {
  useOrganizationDisplayName,
  useSubscription,
} from "@/context/subscription-context";
import { btnPrimary, btnSecondary, cardSurface, inputBase, sectionLabel } from "@/lib/styles";

const INDUSTRIES = [
  "Freight & Logistics",
  "Manufacturing",
  "Retail & E-commerce",
  "Healthcare",
  "Automotive",
  "Other",
];

export function OrganizationSettingsPage() {
  const { isAdmin } = useAuthRole();
  const { organization, loading, saveOrganization } = useOrganization();
  const { orgSettings, updateOrgSettings } = useSubscription();
  const displayName = useOrganizationDisplayName();

  const [name, setName] = useState(displayName);
  const [industry, setIndustry] = useState(orgSettings.industry);
  const [primaryContact, setPrimaryContact] = useState(orgSettings.primaryContact);
  const [timezone, setTimezone] = useState(organization?.timezone ?? "America/New_York");
  const [slaOnTime, setSlaOnTime] = useState(orgSettings.slaOnTimeTarget);
  const [slaCritical, setSlaCritical] = useState(orgSettings.slaCriticalHours);
  const [slaEscalation, setSlaEscalation] = useState(orgSettings.slaEscalationHours);

  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (organization) {
      setName(organization.name);
      setTimezone(organization.timezone);
    } else {
      setName(displayName);
    }
  }, [organization, displayName]);

  useEffect(() => {
    setIndustry(orgSettings.industry);
    setPrimaryContact(orgSettings.primaryContact);
    setSlaOnTime(orgSettings.slaOnTimeTarget);
    setSlaCritical(orgSettings.slaCriticalHours);
    setSlaEscalation(orgSettings.slaEscalationHours);
  }, [orgSettings]);

  async function handleSave() {
    setSaving(true);
    setError(null);

    try {
      if (organization) {
        await saveOrganization({ name, timezone });
      }

      await updateOrgSettings({
        industry,
        primaryContact,
        slaOnTimeTarget: slaOnTime,
        slaCriticalHours: slaCritical,
        slaEscalationHours: slaEscalation,
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }

  if (!isAdmin) {
    return (
      <DashboardShell
        eyebrow="Organization profile"
        title="Organization Settings"
        description="Admin access required"
      >
        <p className="text-sm text-zinc-500">
          Only organization administrators can change organization settings.
        </p>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      eyebrow="Organization profile"
      title="Organization Settings"
      description="Company profile, branding, and SLA preferences for your workspace"
      actions={
        <button
          type="button"
          onClick={handleSave}
          disabled={loading || saving}
          className={btnPrimary}
        >
          {saved ? "Saved" : saving ? "Saving…" : "Save changes"}
        </button>
      }
    >
      <div className="mx-auto max-w-2xl space-y-6">
        {error && (
          <p
            role="alert"
            className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-300"
          >
            {error}
          </p>
        )}

        <section className={`${cardSurface} p-5 sm:p-6`}>
          <h2 className="text-sm font-semibold text-white">Organization profile</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Basic information displayed across the platform
          </p>

          <div className="mt-5 flex items-start gap-5">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border border-dashed border-white/[0.12] bg-white/[0.02]">
              <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">
                Logo
              </span>
            </div>
            <div className="flex-1 space-y-4">
              <label className="block">
                <span className={sectionLabel}>Organization name</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                  className={`${inputBase} mt-2`}
                />
              </label>
              <label className="block">
                <span className={sectionLabel}>Industry</span>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className={`${inputBase} mt-2`}
                >
                  {INDUSTRIES.map((i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </section>

        <section className={`${cardSurface} p-5 sm:p-6`}>
          <h2 className="text-sm font-semibold text-white">Contact & region</h2>
          <div className="mt-5 space-y-4">
            <label className="block">
              <span className={sectionLabel}>Primary contact</span>
              <input
                type="text"
                value={primaryContact}
                onChange={(e) => setPrimaryContact(e.target.value)}
                className={`${inputBase} mt-2`}
              />
            </label>
            <label className="block">
              <span className={sectionLabel}>Time zone</span>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className={`${inputBase} mt-2`}
              >
                <option value="America/New_York">Eastern (ET)</option>
                <option value="America/Chicago">Central (CT)</option>
                <option value="America/Denver">Mountain (MT)</option>
                <option value="America/Los_Angeles">Pacific (PT)</option>
              </select>
            </label>
          </div>
        </section>

        <section className={`${cardSurface} p-5 sm:p-6`}>
          <h2 className="text-sm font-semibold text-white">SLA preferences</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Default SLA thresholds for your organization
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className={sectionLabel}>On-time target %</span>
              <input
                type="number"
                min={80}
                max={100}
                value={slaOnTime}
                onChange={(e) => setSlaOnTime(e.target.value)}
                className={`${inputBase} mt-2 tabular-nums`}
              />
            </label>
            <label className="block">
              <span className={sectionLabel}>Critical response (hrs)</span>
              <input
                type="number"
                min={1}
                max={48}
                value={slaCritical}
                onChange={(e) => setSlaCritical(e.target.value)}
                className={`${inputBase} mt-2 tabular-nums`}
              />
            </label>
            <label className="block">
              <span className={sectionLabel}>Escalation window (hrs)</span>
              <input
                type="number"
                min={1}
                max={72}
                value={slaEscalation}
                onChange={(e) => setSlaEscalation(e.target.value)}
                className={`${inputBase} mt-2 tabular-nums`}
              />
            </label>
          </div>
        </section>

        <div className="flex justify-end gap-2">
          <button type="button" className={btnSecondary}>
            Reset to defaults
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading || saving}
            className={btnPrimary}
          >
            {saved ? "Saved" : saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </DashboardShell>
  );
}
