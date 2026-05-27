"use client";

import { useCallback, useMemo, useState } from "react";
import {
  computeSeverityCounts,
  computeStatusCounts,
  countActiveShipmentFilters,
  DEFAULT_SHIPMENT_FILTERS,
  filterAndSortShipments,
  getSavedViewPreset,
  type FilterableShipment,
  type SavedViewId,
  type ShipmentFilterState,
  type ShipmentSortField,
  type SortDirection,
} from "@/lib/shipment-filters";
import type { IssueStatus, Severity, ShipmentStatus } from "@/lib/types";

export function useShipmentFilters(
  initial?: Partial<Pick<ShipmentFilterState, "sortBy" | "sortDir">>,
) {
  const [filters, setFilters] = useState<ShipmentFilterState>({
    ...DEFAULT_SHIPMENT_FILTERS,
    ...initial,
  });

  const activeFilterCount = useMemo(
    () => countActiveShipmentFilters(filters),
    [filters],
  );

  const setQuery = useCallback((query: string) => {
    setFilters((prev) => ({ ...prev, query, activeSavedView: null }));
  }, []);

  const setStatus = useCallback((status: ShipmentStatus | "All") => {
    setFilters((prev) => ({ ...prev, status, activeSavedView: null }));
  }, []);

  const setSeverity = useCallback((severity: Severity | "All") => {
    setFilters((prev) => ({ ...prev, severity, activeSavedView: null }));
  }, []);

  const setCarrier = useCallback((carrier: string) => {
    setFilters((prev) => ({ ...prev, carrier, activeSavedView: null }));
  }, []);

  const setIssueStatus = useCallback((issueStatus: IssueStatus | "All") => {
    setFilters((prev) => ({ ...prev, issueStatus, activeSavedView: null }));
  }, []);

  const setSort = useCallback(
    (sortBy: ShipmentSortField, sortDir?: SortDirection) => {
      setFilters((prev) => ({
        ...prev,
        sortBy,
        sortDir: sortDir ?? prev.sortDir,
        activeSavedView: null,
      }));
    },
    [],
  );

  const setSortDir = useCallback((sortDir: SortDirection) => {
    setFilters((prev) => ({ ...prev, sortDir, activeSavedView: null }));
  }, []);

  const applySavedView = useCallback((id: SavedViewId) => {
    setFilters((prev) => ({
      ...getSavedViewPreset(id),
      sortBy: prev.sortBy,
      sortDir: prev.sortDir,
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters((prev) => ({
      ...DEFAULT_SHIPMENT_FILTERS,
      sortBy: prev.sortBy,
      sortDir: prev.sortDir,
    }));
  }, []);

  const applyRows = useCallback(
    <T extends FilterableShipment>(rows: T[]) => filterAndSortShipments(rows, filters),
    [filters],
  );

  const getStatusCounts = useCallback(
    <T extends FilterableShipment>(rows: T[]) => computeStatusCounts(rows, filters),
    [filters],
  );

  const getSeverityCounts = useCallback(
    <T extends FilterableShipment>(rows: T[]) => computeSeverityCounts(rows, filters),
    [filters],
  );

  return {
    filters,
    activeFilterCount,
    setQuery,
    setStatus,
    setSeverity,
    setCarrier,
    setIssueStatus,
    setSort,
    setSortDir,
    applySavedView,
    clearFilters,
    applyRows,
    getStatusCounts,
    getSeverityCounts,
  };
}
