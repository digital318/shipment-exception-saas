import { parseExceptionTimestamp } from "@/lib/services/metrics-service";
import type { ExceptionRecord, Shipment } from "@/lib/types";
import type { DateRangePreset, ReportFilters } from "./types";

export const DEFAULT_REPORT_FILTERS: ReportFilters = {
  dateRange: "30d",
  customer: "All",
  carrier: "All",
  severity: "All",
  status: "All",
};

export function getDateRangeBounds(preset: DateRangePreset): { from: number | null; to: number } {
  const to = Date.now();
  if (preset === "all") return { from: null, to };
  const days = preset === "7d" ? 7 : preset === "30d" ? 30 : 90;
  return { from: to - days * 86_400_000, to };
}

function isInDateRange(openedAt: string, from: number | null, to: number): boolean {
  const ts = parseExceptionTimestamp(openedAt);
  if (ts == null) return from == null;
  if (from == null) return ts <= to;
  return ts >= from && ts <= to;
}

export function filterExceptions(
  exceptions: ExceptionRecord[],
  filters: ReportFilters,
): ExceptionRecord[] {
  const { from, to } = getDateRangeBounds(filters.dateRange);

  return exceptions.filter((exc) => {
    if (!isInDateRange(exc.openedAt, from, to)) return false;
    if (filters.customer !== "All" && exc.customer !== filters.customer) return false;
    if (filters.carrier !== "All" && exc.carrier !== filters.carrier) return false;
    if (filters.severity !== "All" && exc.severity !== filters.severity) return false;
    if (filters.status !== "All" && exc.status !== filters.status) return false;
    return true;
  });
}

export function filterShipments(
  shipments: Shipment[],
  filters: ReportFilters,
  exceptions: ExceptionRecord[],
): Shipment[] {
  const filteredExceptionShipmentIds = new Set(
    filterExceptions(exceptions, filters).map((e) => e.shipmentId),
  );

  return shipments.filter((s) => {
    if (filters.customer !== "All" && s.customer !== filters.customer) return false;
    if (filters.carrier !== "All" && s.carrier !== filters.carrier) return false;
    if (filters.dateRange !== "all" && !filteredExceptionShipmentIds.has(s.id)) {
      return filters.carrier !== "All" || filters.customer !== "All";
    }
    return true;
  });
}
