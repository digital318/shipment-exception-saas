"use client";

import { useCallback, useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { useAuthRole } from "@/context/auth-role-context";
import {
  fetchDemoRequests,
  updateDemoRequestStatus,
} from "@/lib/marketing/demo-request-actions";
import {
  loadLocalDemoRequests,
  updateLocalDemoRequestStatus,
} from "@/lib/marketing/storage";
import type { DemoRequest, DemoRequestStatus } from "@/lib/marketing/types";
import { DEMO_REQUEST_STATUSES } from "@/lib/marketing/types";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { badgeBase, cardSurface, selectBase, sectionLabel } from "@/lib/styles";

const statusStyles: Record<DemoRequestStatus, string> = {
  New: `${badgeBase} bg-sky-500/10 text-sky-300 ring-sky-500/20`,
  Contacted: `${badgeBase} bg-violet-500/10 text-violet-300 ring-violet-500/20`,
  Qualified: `${badgeBase} bg-emerald-500/10 text-emerald-400 ring-emerald-500/20`,
  Closed: `${badgeBase} bg-zinc-500/10 text-zinc-400 ring-zinc-500/20`,
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function DemoRequestsPage() {
  const { isAdmin } = useAuthRole();
  const [requests, setRequests] = useState<DemoRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (isSupabaseConfigured()) {
        setRequests(await fetchDemoRequests());
      } else {
        setRequests(loadLocalDemoRequests());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load demo requests.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);

  async function handleStatusChange(id: string, status: DemoRequestStatus) {
    try {
      if (isSupabaseConfigured()) {
        await updateDemoRequestStatus(id, status);
        await load();
      } else {
        updateLocalDemoRequestStatus(id, status);
        setRequests(loadLocalDemoRequests());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status.");
    }
  }

  if (!isAdmin) {
    return (
      <DashboardShell
        eyebrow="Marketing"
        title="Demo requests"
        description="Admin access required."
      >
        <p className="text-sm text-zinc-500">
          Only administrators can view and manage demo requests.
        </p>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      eyebrow="Marketing"
      title="Demo requests"
      description="Inbound leads from the public marketing site."
    >
      {error && (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-300"
        >
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-zinc-500">Loading demo requests…</p>
      ) : requests.length === 0 ? (
        <p className={`${cardSurface} p-6 text-sm text-zinc-500`}>
          No demo requests yet. Submissions from the landing page will appear here.
        </p>
      ) : (
        <div className={`${cardSurface} overflow-x-auto`}>
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-zinc-500">
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Company</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Volume</th>
                <th className="px-4 py-3 font-semibold">Submitted</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((row) => (
                <tr key={row.id} className="border-b border-white/[0.04] last:border-0">
                  <td className="px-4 py-3 font-medium text-white">{row.name}</td>
                  <td className="px-4 py-3 text-zinc-400">{row.company}</td>
                  <td className="px-4 py-3 text-zinc-400">
                    <a
                      href={`mailto:${row.email}`}
                      className="text-violet-400 hover:text-violet-300"
                    >
                      {row.email}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{row.monthlyVolume}</td>
                  <td className="px-4 py-3 text-zinc-500">{formatDate(row.createdAt)}</td>
                  <td className="px-4 py-3">
                    <select
                      value={row.status}
                      onChange={(e) =>
                        void handleStatusChange(row.id, e.target.value as DemoRequestStatus)
                      }
                      className={`${selectBase} min-w-[8rem]`}
                      aria-label={`Status for ${row.name}`}
                    >
                      {DEMO_REQUEST_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <span className={`ml-2 ${statusStyles[row.status]}`}>{row.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isSupabaseConfigured() && (
        <p className={`mt-4 text-xs text-zinc-600 ${sectionLabel}`}>
          Local demo mode: requests stored in browser localStorage.
        </p>
      )}
    </DashboardShell>
  );
}
