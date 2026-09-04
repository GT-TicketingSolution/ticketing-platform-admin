"use client";

import { useQuery } from "@tanstack/react-query";
import { getData } from "@/lib/api/apiService";
import { AppUrl } from "@/lib/api/endpoints";

export interface SystemModule {
  id: string;
  key: string;
  name: string;
  description: string | null;
  isActive: string;
}

export type SystemModulesResponse = SystemModule[];

export const systemModuleKeys = {
  all: ["systemModules"] as const,
  list: () => [...systemModuleKeys.all, "list"] as const,
};

/**
 * Global TanStack Query to fetch active system modules (GET /api/admin/system-modules)
 * Ordered by module name as returned by backend.
 */
export function useSystemModules() {
  return useQuery({
    queryKey: systemModuleKeys.list(),
    queryFn: async () => {
      return getData<SystemModule[]>(AppUrl.systemModule.list);
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
}
