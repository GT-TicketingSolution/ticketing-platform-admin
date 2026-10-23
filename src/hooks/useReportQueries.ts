"use client";

import { useQuery } from "@tanstack/react-query";
import { getData } from "@/lib/api/apiService";
import { AppUrl } from "@/lib/api/endpoints";
import { StaffReportAPIResponse } from "@/types/staffReport";

export interface AdminReportQueryParams {
  fromDate?: string;
  toDate?: string;
}

export const reportKeys = {
  all: ["adminReports"] as const,
  list: (params: AdminReportQueryParams) =>
    [...reportKeys.all, "list", params] as const,
};

/**
 * GET /api/admin/reports?fromDate=...&toDate=...
 */
export function useAdminReportQuery(params: AdminReportQueryParams, enabled = true) {
  // fromDate and toDate must either both be provided, or neither
  const isValidDateRange =
    (!params.fromDate && !params.toDate) ||
    (Boolean(params.fromDate) && Boolean(params.toDate));

  return useQuery<StaffReportAPIResponse>({
    queryKey: reportKeys.list(params),
    queryFn: async () => {
      const sp = new URLSearchParams();
      if (params.fromDate && params.toDate) {
        sp.set("fromDate", params.fromDate);
        sp.set("toDate", params.toDate);
      }

      const queryString = sp.toString();
      const url = queryString
        ? `${AppUrl.reports.admin}?${queryString}`
        : AppUrl.reports.admin;

      return getData<StaffReportAPIResponse>(url);
    },
    enabled: enabled && isValidDateRange,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });
}

// Alias for convenience
export const useReportQuery = useAdminReportQuery;
