"use client";

import { useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeading } from "@/components/ui/section-heading";
import { filterShipmentsByStatus } from "@/lib/customer-portal/visibility";
import { cardSurface, sectionLabel, statusBadgeStyles } from "@/lib/styles";
import type { Shipment, ShipmentStatus } from "@/lib/types";

const FILTERS: { key: ShipmentStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "In Transit", label: "In Transit" },
  { key: "Delayed", label: "Delayed" },
  { key: "Delivered", label: "Delivered" },
  { key: "Exception", label: "Exception" },
];

export function PortalShipmentsTable({ shipments }: { shipments: Shipment[] }) {
  const [filter, setFilter] = useState<ShipmentStatus | "all">("all");
  const filtered = filterShipmentsByStatus(shipments, filter);

  return (
    <section aria-label="Customer shipments">
      <SectionHeading
        title="Your Shipments"
        description={`${shipments.length} shipment${shipments.length === 1 ? "" : "s"} on record`}
        meta={
          <div className="flex flex-wrap gap-1">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition ${
                  filter === f.key
                    ? "bg-white/[0.08] text-white ring-1 ring-white/[0.1]"
                    : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        }
      />
      <div className={`${cardSurface} overflow-hidden`}>
        {filtered.length === 0 ? (
          <EmptyState
            title="No shipments found"
            description={
              filter === "all"
                ? "No shipments are associated with this customer account."
                : `No shipments with status "${filter}".`
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-zinc-900/60">
                <tr className="border-b border-white/[0.06]">
                  {[
                    "Shipment Number",
                    "Origin",
                    "Destination",
                    "ETA",
                    "Status",
                    "Carrier",
                  ].map((h) => (
                    <th key={h} className={`px-5 py-3.5 text-left ${sectionLabel}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filtered.map((s) => (
                  <tr
                    key={s.id}
                    className="transition-colors duration-150 hover:bg-white/[0.025]"
                  >
                    <td className="whitespace-nowrap px-5 py-3.5 font-mono text-[13px] text-violet-300">
                      {s.id}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-[13px] text-zinc-300">
                      {s.origin}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-[13px] text-zinc-300">
                      {s.destination}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-[13px] tabular-nums text-zinc-400">
                      {s.eta}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5">
                      <span className={statusBadgeStyles[s.status]}>{s.status}</span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-[13px] text-zinc-400">
                      {s.carrier}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
