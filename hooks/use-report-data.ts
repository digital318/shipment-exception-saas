"use client";

import { useMemo } from "react";
import { useCustomerNotifications } from "@/context/customer-notifications-context";
import { useExceptions } from "@/context/exceptions-context";
import { useOrganization } from "@/context/organization-context";
import { buildReportData } from "@/lib/reports/build-reports";
import { DEFAULT_REPORT_FILTERS, filterExceptions } from "@/lib/reports/filters";
import type { ReportFilters, ReportId } from "@/lib/reports/types";

export function useReportData(reportId: ReportId, filters: ReportFilters = DEFAULT_REPORT_FILTERS) {
  const { customers, shipments, exceptions, loading, error, refresh } = useExceptions();
  const { notifications: customerNotifications } = useCustomerNotifications();
  const { organization, profile } = useOrganization();
  const organizationId = organization?.id ?? profile?.organizationId;

  const data = useMemo(
    () =>
      buildReportData(
        reportId,
        customers,
        shipments,
        exceptions,
        filters,
        customerNotifications,
      ),
    [reportId, customers, shipments, exceptions, filters, customerNotifications],
  );

  const filteredExceptionCount = useMemo(
    () => filterExceptions(exceptions, filters).length,
    [exceptions, filters],
  );

  const anchorExceptionDbId = useMemo(() => {
    const withDb = exceptions.find((e) => e.dbId);
    return withDb?.dbId;
  }, [exceptions]);

  return {
    data,
    customers,
    shipments,
    exceptions,
    loading,
    error,
    refresh,
    organizationId,
    anchorExceptionDbId,
    filteredExceptionCount,
  };
}
