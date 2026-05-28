"use client";

import { useEffect, useState } from "react";
import type { SupabaseConnectionResult } from "@/lib/supabase-connection";

type StatusState = "checking" | "connected" | "disconnected";

export function SupabaseStatus() {
  const [status, setStatus] = useState<StatusState>("checking");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function checkConnection() {
      try {
        const response = await fetch("/api/supabase/health", {
          cache: "no-store",
        });
        const result = (await response.json()) as SupabaseConnectionResult;

        if (cancelled) return;

        setStatus(result.connected ? "connected" : "disconnected");
        setError(result.error ?? null);
      } catch {
        if (cancelled) return;
        setStatus("disconnected");
        setError("Unable to reach Supabase health check.");
      }
    }

    void checkConnection();

    return () => {
      cancelled = true;
    };
  }, []);

  const config = {
    checking: {
      dot: "bg-amber-400 animate-pulse",
      label: "Supabase…",
      text: "text-amber-400/90",
      ring: "ring-amber-500/20 bg-amber-500/5",
    },
    connected: {
      dot: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]",
      label: "Supabase connected",
      text: "text-emerald-400/90",
      ring: "ring-emerald-500/20 bg-emerald-500/5",
    },
    disconnected: {
      dot: "bg-rose-400",
      label: "Supabase disconnected",
      text: "text-rose-400/90",
      ring: "ring-rose-500/20 bg-rose-500/5",
    },
  }[status];

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ${config.ring}`}
      title={error ?? undefined}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      <span className={config.text}>{config.label}</span>
    </span>
  );
}
