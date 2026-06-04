"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { DASHBOARD_HOME } from "@/lib/auth/routes";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { btnPrimary, inputBase } from "@/lib/styles";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? DASHBOARD_HOME;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!isSupabaseConfigured()) {
      setError("Supabase is not configured. Add your environment variables to sign in.");
      return;
    }

    setLoading(true);

    const supabase = getSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.push(nextPath.startsWith("/") ? nextPath : DASHBOARD_HOME);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-zinc-400">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputBase}
          placeholder="you@company.com"
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-zinc-400">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputBase}
          placeholder="••••••••"
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
        className={`w-full ${btnPrimary} py-2.5 disabled:opacity-50`}
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>

      <p className="text-center text-sm text-zinc-500">
        No account?{" "}
        <Link
          href="/signup"
          className="font-medium text-violet-400 transition hover:text-violet-300"
        >
          Create one
        </Link>
      </p>
    </form>
  );
}
