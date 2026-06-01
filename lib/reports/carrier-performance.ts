import type { Shipment } from "@/lib/types";
import type { CarrierPerformanceRow } from "./types";

function healthFromOnTimePct(onTimePct: number): string {
  if (onTimePct >= 95) return "Healthy";
  if (onTimePct >= 90) return "Degraded";
  return "Critical";
}

export function computeCarrierPerformanceRows(shipments: Shipment[]): CarrierPerformanceRow[] {
  const byCarrier = new Map<
    string,
    { total: number; onTime: number; delayed: number; totalDelayHours: number }
  >();

  for (const s of shipments) {
    const current = byCarrier.get(s.carrier) ?? {
      total: 0,
      onTime: 0,
      delayed: 0,
      totalDelayHours: 0,
    };
    current.total += 1;
    if (s.delayHours !== null || s.status === "Delayed" || s.status === "Exception") {
      current.delayed += 1;
      current.totalDelayHours += s.delayHours ?? 0;
    } else {
      current.onTime += 1;
    }
    byCarrier.set(s.carrier, current);
  }

  return [...byCarrier.entries()]
    .map(([carrier, stats]) => {
      const onTimePct =
        stats.total > 0
          ? Math.round(((stats.total - stats.delayed) / stats.total) * 1000) / 10
          : 100;
      return {
        carrier,
        shipmentsMonitored: stats.total,
        exceptions: stats.delayed,
        onTimePct,
        averageDelayHours:
          stats.delayed > 0
            ? Math.round((stats.totalDelayHours / stats.delayed) * 10) / 10
            : 0,
        healthStatus: healthFromOnTimePct(onTimePct),
      };
    })
    .sort((a, b) => b.shipmentsMonitored - a.shipmentsMonitored);
}
