"use client";

import { useState } from "react";
import { SectionHeading } from "@/components/ui/section-heading";
import {
  exportExceptionReportCsv,
  exportShipmentReportCsv,
  exportSlaReportCsv,
} from "@/lib/customer-portal/csv-export";
import type { CustomerSafeException } from "@/lib/customer-portal/visibility";
import type { CustomerRiskProfile } from "@/lib/services/metrics-service";
import { btnPrimary, btnSecondary, cardSurface } from "@/lib/styles";
import type { Shipment } from "@/lib/types";

type ExportState = "idle" | "loading" | "done";

function ExportButton({
  label,
  disabled,
  onExport,
}: {
  label: string;
  disabled?: boolean;
  onExport: () => void;
}) {
  const [state, setState] = useState<ExportState>("idle");

  async function handleClick() {
    if (disabled || state === "loading") return;
    setState("loading");
    await new Promise((r) => setTimeout(r, 400));
    onExport();
    setState("done");
    setTimeout(() => setState("idle"), 2000);
  }

  const base = state === "done" ? btnPrimary : btnSecondary;
  const labelText =
    state === "loading" ? "Exporting…" : state === "done" ? "Downloaded" : label;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || state === "loading"}
      className={`${base} ${
        disabled ? "cursor-not-allowed opacity-45" : ""
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

export function PortalReportsSection({
  customerName,
  shipments,
  exceptions,
  scorecard,
}: {
  customerName: string;
  shipments: Shipment[];
  exceptions: CustomerSafeException[];
  scorecard: CustomerRiskProfile;
}) {
  return (
    <section aria-label="Customer reports">
      <SectionHeading
        title="Reports"
        description="Export organization-scoped data for your account"
      />
      <div className={`${cardSurface} flex flex-wrap gap-3 p-5 sm:p-6`}>
        <ExportButton
          label="Shipment Report CSV"
          disabled={shipments.length === 0}
          onExport={() => exportShipmentReportCsv(customerName, shipments)}
        />
        <ExportButton
          label="Exception Report CSV"
          disabled={exceptions.length === 0}
          onExport={() => exportExceptionReportCsv(customerName, exceptions)}
        />
        <ExportButton
          label="SLA Report CSV"
          onExport={() => exportSlaReportCsv(customerName, scorecard)}
        />
      </div>
    </section>
  );
}
