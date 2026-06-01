"use client";

import { useMemo } from "react";
import { useExceptions } from "@/context/exceptions-context";
import {
  computeExecutiveMetrics,
  type ExecutiveMetrics,
} from "@/lib/services/metrics-service";

export function useExecutiveMetrics(): ExecutiveMetrics & {
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const { customers, shipments, exceptions, loading, error, refresh } = useExceptions();

  const metrics = useMemo(
    () => computeExecutiveMetrics(customers, shipments, exceptions),
    [customers, shipments, exceptions],
  );

  return { ...metrics, loading, error, refresh };
}
