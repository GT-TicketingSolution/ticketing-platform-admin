"use client";

import { useQuery } from "@tanstack/react-query";
import { getData } from "@/lib/api/apiService";
import { AppUrl } from "@/lib/api/endpoints";
import { StaffReportAPIResponse } from "@/types/staffReport";

export interface StaffReportQueryParams {
  fromDate: string;
  fromTime: string;
  toDate: string;
  toTime: string;
}

export const staffReportKeys = {
  all: ["staffReports"] as const,
  list: (params: StaffReportQueryParams) =>
    [...staffReportKeys.all, "list", params] as const,
};

export function useStaffReportQuery(params: StaffReportQueryParams, enabled = true) {
  return useQuery<StaffReportAPIResponse>({
    queryKey: staffReportKeys.list(params),
    queryFn: async () => {
      // Strip any seconds and send fromTime in HH:mm format (e.g. "00:00")
      const trimToHHmm = (time: string) => {
        if (!time) return "00:00";
        const parts = time.split(":");
        if (parts.length >= 2) {
          return `${parts[0]}:${parts[1]}`;
        }
        return time;
      };

      const queryString = new URLSearchParams({
        fromDate: params.fromDate,
        // fromTime: trimToHHmm(params.fromTime),
        toDate: params.toDate,
        // toTime: trimToHHmm(params.toTime),
      }).toString();

      return getData<StaffReportAPIResponse>(
        `${AppUrl.reports.staff}?${queryString}`
      );
    },
    enabled,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: false,
  });
}
