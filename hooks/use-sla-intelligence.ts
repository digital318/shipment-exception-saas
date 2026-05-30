"use client";

import { useMemo } from "react";
import { useExceptions } from "@/context/exceptions-context";
import {
  computeNetworkIntelligence,
  type NetworkIntelligence,
} from "@/lib/sla-intelligence";

export function useSlaIntelligence(): NetworkIntelligence & {
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const { customers, shipments, exceptions, loading, error, refresh } = useExceptions();

  const intelligence = useMemo(
    () => computeNetworkIntelligence(customers, shipments, exceptions),
    [customers, shipments, exceptions],
  );

  return { ...intelligence, loading, error, refresh };
}
