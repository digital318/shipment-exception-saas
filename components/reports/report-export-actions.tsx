"use client";

import { useState } from "react";
import { btnPrimary, btnSecondary } from "@/lib/styles";

type ExportState = "idle" | "loading" | "done";

export function ReportExportActions({
  disabled,
  onExportCsv,
  onExportPdf,
}: {
  disabled?: boolean;
  onExportCsv: () => void | Promise<void>;
  onExportPdf: () => void | Promise<void>;
}) {
  const [csvState, setCsvState] = useState<ExportState>("idle");
  const [pdfState, setPdfState] = useState<ExportState>("idle");

  async function handleCsv() {
    if (disabled || csvState === "loading") return;
    setCsvState("loading");
    await onExportCsv();
    setCsvState("done");
    setTimeout(() => setCsvState("idle"), 2000);
  }

  async function handlePdf() {
    if (disabled || pdfState === "loading") return;
    setPdfState("loading");
    await onExportPdf();
    setPdfState("done");
    setTimeout(() => setPdfState("idle"), 2000);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <ExportButton
        label="Export CSV"
        state={csvState}
        disabled={disabled}
        onClick={handleCsv}
        variant="secondary"
      />
      <ExportButton
        label="Export PDF"
        state={pdfState}
        disabled={disabled}
        onClick={handlePdf}
        variant="primary"
      />
    </div>
  );
}

function ExportButton({
  label,
  state,
  disabled,
  onClick,
  variant,
}: {
  label: string;
  state: ExportState;
  disabled?: boolean;
  onClick: () => void;
  variant: "primary" | "secondary";
}) {
  const base = state === "done" ? btnPrimary : variant === "primary" ? btnPrimary : btnSecondary;
  const labelText =
    state === "loading" ? "Exporting…" : state === "done" ? "Done" : label;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || state === "loading"}
      className={`${base} ${
        disabled ? "cursor-not-allowed opacity-45" : ""
      } ${state === "done" ? "!border-emerald-500/30 !bg-emerald-500/10 !text-emerald-300" : ""}`}
    >
      {state === "loading" && (
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {labelText}
    </button>
  );
}
