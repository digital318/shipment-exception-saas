"use client";

import Link from "next/link";
import { MockExportButton } from "@/components/ui/mock-export-button";
import { SyncStatus } from "@/components/ui/sync-status";
import { btnSecondary } from "@/lib/styles";

export function HomeDashboardActions() {
  return (
    <>
      <SyncStatus state="live" />
      <span className="hidden text-[11px] text-zinc-600 sm:inline">
        Last sync 5:54 PM EST
      </span>
      <span className="mx-1 hidden h-4 w-px bg-white/[0.08] sm:inline" />
      <Link href="/executive" className={btnSecondary}>
        Executive summary
      </Link>
      <button type="button" className={btnSecondary}>
        All carriers
      </button>
      <MockExportButton
        label="Export Exception Report"
        variant="primary"
      />
    </>
  );
}
