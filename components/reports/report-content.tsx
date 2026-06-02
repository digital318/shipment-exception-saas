"use client";

import type { ReactNode } from "react";
import {
  badgeBase,
  cardSurface,
  issueStatusStyles,
  riskLevelLabels,
  riskLevelStyles,
  sectionLabel,
  severityStyles,
} from "@/lib/styles";
import type {
  CarrierPerformanceRow,
  CustomerCommunicationReport,
  CustomerSlaRow,
  EscalationReportRow,
  ExceptionReportRow,
  ExecutiveSummaryReport,
  OperationsSummaryReport,
  ReportId,
} from "@/lib/reports/types";

function EmptyRow({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-6 py-8 text-center text-sm text-zinc-500">
        {message}
      </td>
    </tr>
  );
}

function TableShell({
  title,
  headers,
  children,
}: {
  title?: string;
  headers: string[];
  children: ReactNode;
}) {
  return (
    <div className={`${cardSurface} overflow-hidden`}>
      {title && (
        <div className="border-b border-white/[0.06] px-6 py-4">
          <h3 className="text-sm font-semibold text-white">{title}</h3>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-zinc-900/60">
            <tr className="border-b border-white/[0.06]">
              {headers.map((h) => (
                <th key={h} className={`px-6 py-3.5 text-left ${sectionLabel}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">{children}</tbody>
        </table>
      </div>
    </div>
  );
}

function MetricCards({ metrics }: { metrics: { label: string; value: string | number }[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((m) => (
        <article key={m.label} className={`${cardSurface} p-5`}>
          <p className="text-xs font-medium text-zinc-500">{m.label}</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-white">
            {m.value}
          </p>
        </article>
      ))}
    </div>
  );
}

export function ReportContent({
  reportId,
  data,
}: {
  reportId: ReportId;
  data: unknown;
}) {
  if (data == null) {
    return (
      <div className={`${cardSurface} px-6 py-8 text-center text-sm text-zinc-500`}>
        No report data available.
      </div>
    );
  }

  switch (reportId) {
    case "operations-summary": {
      const d = data as OperationsSummaryReport;
      return (
        <MetricCards
          metrics={[
            { label: "Open Exceptions", value: d.openExceptions },
            { label: "Critical Exceptions", value: d.criticalExceptions },
            { label: "Escalated Exceptions", value: d.escalatedExceptions },
            { label: "Overdue Follow-Ups", value: d.overdueFollowUps },
            { label: "Network Health Score", value: d.networkHealthScore },
            {
              label: "Average Resolution Time",
              value: `${d.averageResolutionTimeHours}h`,
            },
            {
              label: "Exceptions Created (7 days)",
              value: d.exceptionsCreatedLast7Days,
            },
          ]}
        />
      );
    }

    case "executive-summary": {
      const d = data as ExecutiveSummaryReport;
      return (
        <div className="space-y-6">
          <MetricCards
            metrics={[
              { label: "SLA Compliance", value: `${d.slaCompliancePercent}%` },
              { label: "Follow-Up Compliance", value: `${d.followUpCompliancePercent}%` },
            ]}
          />

          <TableShell
            title="Top risk customers"
            headers={["Customer", "Risk Score", "Risk Level", "Open Exceptions"]}
          >
            {d.topRiskCustomers.length === 0 ? (
              <EmptyRow colSpan={4} message="No at-risk customers in this period." />
            ) : (
              d.topRiskCustomers.map((c) => (
                <tr key={c.customerName} className="hover:bg-white/[0.025]">
                  <td className="px-6 py-4 text-[13px] font-medium text-white">
                    {c.customerName}
                  </td>
                  <td className="px-6 py-4 tabular-nums text-[13px] text-zinc-300">
                    {c.riskScore}
                  </td>
                  <td className="px-6 py-4">
                    <span className={riskLevelStyles[c.riskLevel as keyof typeof riskLevelStyles] ?? riskLevelStyles.yellow}>
                      {riskLevelLabels[c.riskLevel as keyof typeof riskLevelLabels] ?? c.riskLevel}
                    </span>
                  </td>
                  <td className="px-6 py-4 tabular-nums text-[13px] text-zinc-300">
                    {c.openExceptions}
                  </td>
                </tr>
              ))
            )}
          </TableShell>

          <TableShell
            title="Top open critical exceptions"
            headers={["Exception", "Customer", "Severity", "Status"]}
          >
            {d.topCriticalExceptions.length === 0 ? (
              <EmptyRow colSpan={4} message="No critical exceptions open." />
            ) : (
              d.topCriticalExceptions.map((e) => (
                <tr key={e.id} className="hover:bg-white/[0.025]">
                  <td className="px-6 py-4">
                    <p className="text-[13px] font-medium text-white">{e.title}</p>
                    <p className="mt-0.5 text-[11px] text-zinc-600">{e.id}</p>
                  </td>
                  <td className="px-6 py-4 text-[13px] text-zinc-400">{e.customer}</td>
                  <td className="px-6 py-4">
                    <span className={severityStyles[e.severity]}>{e.severity}</span>
                  </td>
                  <td className={`px-6 py-4 text-[13px] ${issueStatusStyles[e.status]}`}>
                    {e.status}
                  </td>
                </tr>
              ))
            )}
          </TableShell>

          <TableShell
            title="Customer risk rankings"
            headers={["Rank", "Customer", "Risk Score", "Risk Level"]}
          >
            {d.customerRiskRankings.map((c) => (
              <tr key={c.customerName} className="hover:bg-white/[0.025]">
                <td className="px-6 py-4 tabular-nums text-[13px] text-zinc-500">{c.rank}</td>
                <td className="px-6 py-4 text-[13px] font-medium text-white">{c.customerName}</td>
                <td className="px-6 py-4 tabular-nums text-[13px] text-zinc-300">{c.riskScore}</td>
                <td className="px-6 py-4">
                  <span className={riskLevelStyles[c.riskLevel as keyof typeof riskLevelStyles] ?? riskLevelStyles.yellow}>
                    {riskLevelLabels[c.riskLevel as keyof typeof riskLevelLabels] ?? c.riskLevel}
                  </span>
                </td>
              </tr>
            ))}
          </TableShell>

          <TableShell title="Escalation trends (7 days)" headers={["Day", "Escalations"]}>
            {d.escalationTrend.map((p) => (
              <tr key={p.label} className="hover:bg-white/[0.025]">
                <td className="px-6 py-4 text-[13px] text-zinc-300">{p.label}</td>
                <td className="px-6 py-4 tabular-nums text-[13px] text-white">{p.value}</td>
              </tr>
            ))}
          </TableShell>
        </div>
      );
    }

    case "customer-sla": {
      const rows = data as CustomerSlaRow[];
      return (
        <TableShell
          headers={[
            "Customer",
            "SLA Target",
            "Actual SLA",
            "Risk Score",
            "Open Exceptions",
            "Escalations",
          ]}
        >
          {rows.length === 0 ? (
            <EmptyRow colSpan={6} message="No customer SLA data for the selected filters." />
          ) : (
            rows.map((r) => (
              <tr key={r.customer} className="hover:bg-white/[0.025]">
                <td className="px-6 py-4 text-[13px] font-medium text-white">{r.customer}</td>
                <td className="px-6 py-4 tabular-nums text-[13px] text-zinc-400">
                  {r.slaTarget.toFixed(1)}%
                </td>
                <td className="px-6 py-4 tabular-nums text-[13px] text-zinc-300">
                  {r.actualSla.toFixed(1)}%
                </td>
                <td className="px-6 py-4 tabular-nums text-[13px] text-zinc-300">{r.riskScore}</td>
                <td className="px-6 py-4 tabular-nums text-[13px] text-zinc-300">
                  {r.openExceptions}
                </td>
                <td className="px-6 py-4 tabular-nums text-[13px] text-amber-400/90">
                  {r.escalations}
                </td>
              </tr>
            ))
          )}
        </TableShell>
      );
    }

    case "exception": {
      const rows = data as ExceptionReportRow[];
      return (
        <TableShell
          headers={["Exception", "Severity", "Status", "Owner", "Days Open", "Escalation Level"]}
        >
          {rows.length === 0 ? (
            <EmptyRow colSpan={6} message="No exceptions match the selected filters." />
          ) : (
            rows.map((r) => (
              <tr key={r.exception} className="hover:bg-white/[0.025]">
                <td className="px-6 py-4">
                  <p className="text-[13px] font-medium text-white">{r.title}</p>
                  <p className="mt-0.5 text-[11px] text-zinc-600">{r.exception}</p>
                </td>
                <td className="px-6 py-4">
                  <span className={severityStyles[r.severity]}>{r.severity}</span>
                </td>
                <td className={`px-6 py-4 text-[13px] ${issueStatusStyles[r.status]}`}>
                  {r.status}
                </td>
                <td className="px-6 py-4 text-[13px] text-zinc-400">{r.owner}</td>
                <td className="px-6 py-4 tabular-nums text-[13px] text-zinc-300">{r.daysOpen}</td>
                <td className="px-6 py-4 tabular-nums text-[13px] text-zinc-300">
                  L{r.escalationLevel}
                </td>
              </tr>
            ))
          )}
        </TableShell>
      );
    }

    case "escalation": {
      const rows = data as EscalationReportRow[];
      return (
        <TableShell
          headers={[
            "Exception",
            "Escalation Level",
            "Assigned Owner",
            "Follow-Up Status",
            "Days Open",
            "Resolution Status",
          ]}
        >
          {rows.length === 0 ? (
            <EmptyRow colSpan={6} message="No escalations match the selected filters." />
          ) : (
            rows.map((r) => (
              <tr key={r.exception} className="hover:bg-white/[0.025]">
                <td className="px-6 py-4">
                  <p className="text-[13px] font-medium text-white">{r.title}</p>
                  <p className="mt-0.5 text-[11px] text-zinc-600">{r.exception}</p>
                </td>
                <td className="px-6 py-4 tabular-nums text-[13px] text-zinc-300">
                  L{r.escalationLevel}
                </td>
                <td className="px-6 py-4 text-[13px] text-zinc-400">{r.assignedOwner}</td>
                <td className="px-6 py-4">
                  <span
                    className={`${badgeBase} ${
                      r.followUpStatus === "Overdue"
                        ? "bg-rose-500/10 text-rose-400 ring-rose-500/20"
                        : r.followUpStatus === "Scheduled"
                          ? "bg-sky-500/10 text-sky-400 ring-sky-500/20"
                          : "bg-zinc-500/10 text-zinc-400 ring-zinc-500/20"
                    }`}
                  >
                    {r.followUpStatus}
                  </span>
                </td>
                <td className="px-6 py-4 tabular-nums text-[13px] text-zinc-300">{r.daysOpen}</td>
                <td className={`px-6 py-4 text-[13px] ${issueStatusStyles[r.resolutionStatus as keyof typeof issueStatusStyles] ?? "text-zinc-400"}`}>
                  {r.resolutionStatus}
                </td>
              </tr>
            ))
          )}
        </TableShell>
      );
    }

    case "carrier-performance": {
      const rows = data as CarrierPerformanceRow[];
      return (
        <TableShell
          headers={[
            "Carrier",
            "Shipments Monitored",
            "Exceptions",
            "On-Time %",
            "Average Delay",
            "Health Status",
          ]}
        >
          {rows.length === 0 ? (
            <EmptyRow colSpan={6} message="No carrier data for the selected filters." />
          ) : (
            rows.map((r) => (
              <tr key={r.carrier} className="hover:bg-white/[0.025]">
                <td className="px-6 py-4 text-[13px] font-medium text-white">{r.carrier}</td>
                <td className="px-6 py-4 tabular-nums text-[13px] text-zinc-300">
                  {r.shipmentsMonitored}
                </td>
                <td className="px-6 py-4 tabular-nums text-[13px] text-rose-400/90">
                  {r.exceptions}
                </td>
                <td className="px-6 py-4 tabular-nums text-[13px] text-white">{r.onTimePct}%</td>
                <td className="px-6 py-4 tabular-nums text-[13px] text-amber-400/90">
                  {r.averageDelayHours}h
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`${badgeBase} ${
                      r.healthStatus === "Healthy"
                        ? "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20"
                        : r.healthStatus === "Degraded"
                          ? "bg-amber-500/10 text-amber-400 ring-amber-500/20"
                          : "bg-rose-500/10 text-rose-400 ring-rose-500/20"
                    }`}
                  >
                    {r.healthStatus}
                  </span>
                </td>
              </tr>
            ))
          )}
        </TableShell>
      );
    }

    case "customer-communication": {
      const d = data as CustomerCommunicationReport;
      return (
        <div className="space-y-6">
          <MetricCards
            metrics={[
              { label: "Total Notifications", value: d.totalNotifications },
              { label: "Unread", value: d.unreadCount },
              { label: "Read Rate", value: `${d.readRatePercent}%` },
              { label: "Delay Notices", value: d.delayNotices },
              { label: "Resolution Notices", value: d.resolutionNotices },
              { label: "Exception Notices", value: d.exceptionNotices },
              { label: "SLA Warnings", value: d.slaWarnings },
            ]}
          />

          <TableShell
            title="By Customer"
            headers={[
              "Customer",
              "Total",
              "Unread",
              "Read Rate",
              "Delay Notices",
              "Resolution Notices",
            ]}
          >
            {d.byCustomer.length === 0 ? (
              <EmptyRow colSpan={6} message="No customer communications match the selected filters." />
            ) : (
              d.byCustomer.map((r) => (
                <tr key={r.customerName} className="hover:bg-white/[0.025]">
                  <td className="px-6 py-4 text-[13px] font-medium text-white">{r.customerName}</td>
                  <td className="px-6 py-4 tabular-nums text-[13px] text-zinc-300">{r.total}</td>
                  <td className="px-6 py-4 tabular-nums text-[13px] text-violet-300">{r.unread}</td>
                  <td className="px-6 py-4 tabular-nums text-[13px] text-emerald-300">
                    {r.readRatePercent}%
                  </td>
                  <td className="px-6 py-4 tabular-nums text-[13px] text-amber-300">
                    {r.delayNotices}
                  </td>
                  <td className="px-6 py-4 tabular-nums text-[13px] text-emerald-300">
                    {r.resolutionNotices}
                  </td>
                </tr>
              ))
            )}
          </TableShell>

          <TableShell title="By Type" headers={["Type", "Count"]}>
            {d.byType.length === 0 ? (
              <EmptyRow colSpan={2} message="No notification types recorded." />
            ) : (
              d.byType.map((r) => (
                <tr key={r.type} className="hover:bg-white/[0.025]">
                  <td className="px-6 py-4 text-[13px] font-medium text-white">{r.label}</td>
                  <td className="px-6 py-4 tabular-nums text-[13px] text-zinc-300">{r.count}</td>
                </tr>
              ))
            )}
          </TableShell>
        </div>
      );
    }

    default:
      return null;
  }
}
