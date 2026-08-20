"use client";

import { useQuery } from "@tanstack/react-query";
import { getData } from "@/lib/api/apiService";
import { AppUrl } from "@/lib/api/endpoints";
import { DashboardData, DashboardQueryParams } from "@/app/(dashboard)/dashboard/types";

export const dashboardKeys = {
  all: ["admin-dashboard"] as const,
  filter: (params?: DashboardQueryParams) => [...dashboardKeys.all, params] as const,
};

/**
 * Fetch Admin Dashboard metrics, charts, and recent managers from GET /api/admin/dashboard
 */
export function useDashboard(params?: DashboardQueryParams) {
  return useQuery<DashboardData>({
    queryKey: dashboardKeys.filter(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.period && params.period !== "all") {
        searchParams.set("period", params.period);
      }
      if (params?.attractionId && params.attractionId !== "all" && params.attractionId !== "All") {
        searchParams.set("attractionId", params.attractionId);
      }
      if (params?.search?.trim()) {
        searchParams.set("search", params.search.trim());
      }
      if (params?.dateFrom) {
        searchParams.set("dateFrom", params.dateFrom);
      }
      if (params?.dateTo) {
        searchParams.set("dateTo", params.dateTo);
      }

      const queryString = searchParams.toString();
      const url = queryString ? `${AppUrl.dashboard.get}?${queryString}` : AppUrl.dashboard.get;
      return getData<DashboardData>(url);
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: true,
  });
}
