"use client";

import { useState } from "react";
import { btnPrimary, btnSecondary } from "@/lib/styles";

type ExportState = "idle" | "loading" | "done";

export function MockExportButton({
  label = "Export",
  variant = "secondary",
  disabled = false,
  emptyMessage = "Nothing to export",
  className = "",
}: {
  label?: string;
  variant?: "primary" | "secondary";
  disabled?: boolean;
  emptyMessage?: string;
  className?: string;
}) {
  const [state, setState] = useState<ExportState>("idle");

  const base = variant === "primary" ? btnPrimary : btnSecondary;
  const isDisabled = disabled || state === "loading";

  async function handleClick() {
    if (isDisabled) return;
    setState("loading");
    await new Promise((r) => setTimeout(r, 1200));
    setState("done");
    setTimeout(() => setState("idle"), 2200);
  }

  const labelText =
    state === "loading"
      ? "Exporting…"
      : state === "done"
        ? "Download ready"
        : label;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isDisabled}
      title={disabled ? emptyMessage : undefined}
      className={`${base} ${className} ${
        isDisabled && state !== "loading"
          ? "cursor-not-allowed opacity-45 saturate-50 hover:border-white/[0.08] hover:bg-white/[0.03] hover:text-zinc-300 hover:shadow-none active:scale-100"
          : ""
      } ${state === "done" ? "!border-emerald-500/30 !bg-emerald-500/10 !text-emerald-300" : ""}`}
    >
      {state === "loading" && (
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {state === "done" && (
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
      <span>{labelText}</span>
    </button>
  );
}
