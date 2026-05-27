"use client";

import { useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { btnPrimary, btnSecondary, cardSurface, inputBase, sectionLabel } from "@/lib/styles";

export function SettingsPage() {
  const [companyName, setCompanyName] = useState("FreightPulse Logistics");
  const [opsEmail, setOpsEmail] = useState("ops@freightpulse.com");
  const [timezone, setTimezone] = useState("America/New_York");

  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsCritical, setSmsCritical] = useState(true);
  const [slackDigest, setSlackDigest] = useState(false);
  const [carrierWebhooks, setCarrierWebhooks] = useState(true);

  const [slaOnTime, setSlaOnTime] = useState("97");
  const [slaCriticalHours, setSlaCriticalHours] = useState("4");
  const [slaEscalation, setSlaEscalation] = useState("24");

  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <DashboardShell
      eyebrow="Workspace configuration"
      title="Settings"
      description="Company profile, notifications, and SLA thresholds"
      actions={
        <button type="button" onClick={handleSave} className={btnPrimary}>
          {saved ? "Saved" : "Save changes"}
        </button>
      }
    >
      <div className="mx-auto max-w-2xl space-y-6">
        <section className={`${cardSurface} p-5 sm:p-6`}>
          <h2 className="text-sm font-semibold text-white">Company profile</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Organization details used in reports and alerts
          </p>
          <div className="mt-5 space-y-4">
            <label className="block">
              <span className={sectionLabel}>Company name</span>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className={`${inputBase} mt-2`}
              />
            </label>
            <label className="block">
              <span className={sectionLabel}>Operations email</span>
              <input
                type="email"
                value={opsEmail}
                onChange={(e) => setOpsEmail(e.target.value)}
                className={`${inputBase} mt-2`}
              />
            </label>
            <label className="block">
              <span className={sectionLabel}>Timezone</span>
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
          <h2 className="text-sm font-semibold text-white">Notification preferences</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Control how your team receives exception updates
          </p>
          <ul className="mt-5 divide-y divide-white/[0.06]">
            <ToggleRow
              label="Email alerts"
              description="Daily digest and exception notifications"
              checked={emailAlerts}
              onChange={setEmailAlerts}
            />
            <ToggleRow
              label="SMS for critical exceptions"
              description="Immediate text for Critical severity only"
              checked={smsCritical}
              onChange={setSmsCritical}
            />
            <ToggleRow
              label="Slack channel digest"
              description="Hourly summary to #logistics-ops"
              checked={slackDigest}
              onChange={setSlackDigest}
            />
            <ToggleRow
              label="Carrier API webhooks"
              description="Real-time ETA and status push events"
              checked={carrierWebhooks}
              onChange={setCarrierWebhooks}
            />
          </ul>
        </section>

        <section className={`${cardSurface} p-5 sm:p-6`}>
          <h2 className="text-sm font-semibold text-white">SLA thresholds</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Targets used for dashboards, alerts, and auto-escalation
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
                value={slaCriticalHours}
                onChange={(e) => setSlaCriticalHours(e.target.value)}
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
          <p className="mt-4 rounded-lg bg-amber-500/5 px-3 py-2 text-[11px] leading-relaxed text-amber-400/80 ring-1 ring-amber-500/10">
            Changes apply to new exceptions only. Historical SLA metrics are not
            recalculated.
          </p>
        </section>

        <div className="flex justify-end gap-2">
          <button type="button" className={btnSecondary}>
            Reset to defaults
          </button>
          <button type="button" onClick={handleSave} className={btnPrimary}>
            {saved ? "Saved" : "Save changes"}
          </button>
        </div>
      </div>
    </DashboardShell>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <li className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
      <div>
        <p className="text-sm font-medium text-zinc-200">{label}</p>
        <p className="mt-0.5 text-xs text-zinc-500">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${
          checked ? "bg-violet-600" : "bg-zinc-700"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </li>
  );
}
