"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { submitDemoRequest } from "@/lib/marketing/demo-request-actions";
import { MONTHLY_VOLUME_OPTIONS } from "@/lib/marketing/types";
import { saveLocalDemoRequest } from "@/lib/marketing/storage";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { btnPrimary, inputBase, selectBase } from "@/lib/styles";

export function DemoRequestForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const input = {
      name: String(form.get("name") ?? ""),
      company: String(form.get("company") ?? ""),
      email: String(form.get("email") ?? ""),
      phone: String(form.get("phone") ?? "") || undefined,
      monthlyVolume: String(form.get("monthlyVolume") ?? ""),
      message: String(form.get("message") ?? "") || undefined,
    };

    try {
      if (isSupabaseConfigured()) {
        await submitDemoRequest(input);
      } else {
        saveLocalDemoRequest(input);
      }
      router.push("/demo-request-success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="demo-name" className="mb-1.5 block text-xs font-medium text-zinc-400">
            Name
          </label>
          <input
            id="demo-name"
            name="name"
            required
            autoComplete="name"
            className={inputBase}
            placeholder="Jane Smith"
          />
        </div>
        <div>
          <label htmlFor="demo-company" className="mb-1.5 block text-xs font-medium text-zinc-400">
            Company
          </label>
          <input
            id="demo-company"
            name="company"
            required
            autoComplete="organization"
            className={inputBase}
            placeholder="Acme Logistics"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="demo-email" className="mb-1.5 block text-xs font-medium text-zinc-400">
            Email
          </label>
          <input
            id="demo-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className={inputBase}
            placeholder="jane@company.com"
          />
        </div>
        <div>
          <label htmlFor="demo-phone" className="mb-1.5 block text-xs font-medium text-zinc-400">
            Phone <span className="text-zinc-600">(optional)</span>
          </label>
          <input
            id="demo-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            className={inputBase}
            placeholder="+1 (555) 000-0000"
          />
        </div>
      </div>

      <div>
        <label htmlFor="demo-volume" className="mb-1.5 block text-xs font-medium text-zinc-400">
          Monthly shipment volume
        </label>
        <select id="demo-volume" name="monthlyVolume" required className={`${selectBase} w-full text-sm`}>
          <option value="">Select volume range</option>
          {MONTHLY_VOLUME_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="demo-message" className="mb-1.5 block text-xs font-medium text-zinc-400">
          Message
        </label>
        <textarea
          id="demo-message"
          name="message"
          rows={4}
          className={`${inputBase} resize-y`}
          placeholder="Tell us about your exception management needs…"
        />
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
        className={`w-full sm:w-auto ${btnPrimary} py-2.5 disabled:opacity-50`}
      >
        {loading ? "Submitting…" : "Request Demo"}
      </button>
      <p className="text-[11px] text-zinc-600">
        Demo mode: submissions are stored only — no emails are sent.
      </p>
    </form>
  );
}
