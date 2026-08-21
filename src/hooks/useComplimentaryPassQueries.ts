"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getData, postData, patchData, deleteData } from "@/lib/api/apiService";
import { AppUrl } from "@/lib/api/endpoints";
import { useToast } from "@/components/ui/Toast";
import type {
  ComplimentaryPass,
  ComplimentaryPassPayload,
  ComplimentaryPassListParams,
  ComplimentaryPassListResponse,
} from "@/app/(dashboard)/complimentary-passes/types";

export const complimentaryPassKeys = {
  all: ["complimentary-passes"] as const,
  lists: () => [...complimentaryPassKeys.all, "list"] as const,
  list: (params: ComplimentaryPassListParams) => [...complimentaryPassKeys.lists(), params] as const,
  detail: (id: string) => [...complimentaryPassKeys.all, "detail", id] as const,
};

/**
 * Fetch complimentary passes list with pagination, search, attractionId, fromDate, toDate, status.
 * GET /api/admin/complimentary-passes
 */
export function useComplimentaryPassList(params: ComplimentaryPassListParams = {}) {
  const page = params.page ?? 1;
  const limit = params.limit ?? 10;

  return useQuery<ComplimentaryPassListResponse>({
    queryKey: complimentaryPassKeys.list(params),
    queryFn: async () => {
      const sp = new URLSearchParams();
      sp.set("page", String(page));
      sp.set("limit", String(limit));
      if (params.search?.trim()) sp.set("search", params.search.trim());
      if (params.attractionId && params.attractionId !== "ALL" && params.attractionId !== "All") {
        sp.set("attractionId", params.attractionId);
      }
      if (params.fromDate) sp.set("fromDate", params.fromDate);
      if (params.toDate) sp.set("toDate", params.toDate);
      if (params.status && params.status !== "ALL" && params.status !== "All") {
        sp.set("status", params.status);
      }

      const res = await getData<any>(`${AppUrl.complimentaryPass.list}?${sp.toString()}`);
      const payload = res?.data ?? res;

      if (payload && Array.isArray(payload.items)) {
        return {
          items: payload.items.map((item: any) => ({
            ...item,
            id: item.id || item.passId || "",
            visitorName: item.visitorName || "",
            mobile: item.mobile || "",
            attractionId: item.attractionId || "",
            attractionName: item.attractionName || item.attraction?.name || "-",
            visitors: Number(item.visitors) || 1,
            referenceId: item.referenceId || "",
            referenceName: item.referenceName || item.reference?.referenceName || "-",
            visitDate: item.visitDate || "",
            status: (item.status || "ACTIVE").toUpperCase(),
          })),
          pagination: payload.pagination || {
            page,
            limit,
            total: payload.items.length,
            totalPages: Math.ceil(payload.items.length / limit) || 1,
          },
        };
      }

      if (Array.isArray(payload)) {
        return {
          items: payload.map((item: any) => ({
            ...item,
            id: item.id || item.passId || "",
            visitorName: item.visitorName || "",
            mobile: item.mobile || "",
            attractionId: item.attractionId || "",
            attractionName: item.attractionName || item.attraction?.name || "-",
            visitors: Number(item.visitors) || 1,
            referenceId: item.referenceId || "",
            referenceName: item.referenceName || item.reference?.referenceName || "-",
            visitDate: item.visitDate || "",
            status: (item.status || "ACTIVE").toUpperCase(),
          })),
          pagination: { page, limit, total: payload.length, totalPages: Math.ceil(payload.length / limit) || 1 },
        };
      }

      return {
        items: [],
        pagination: { page: 1, limit, total: 0, totalPages: 0 },
      };
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });
}

/**
 * Create a new complimentary pass.
 * POST /api/admin/complimentary-passes
 */
export function useCreateComplimentaryPass() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (payload: ComplimentaryPassPayload) =>
      postData<any>(AppUrl.complimentaryPass.create, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complimentaryPassKeys.all });
      showToast("Complimentary pass issued successfully", "success");
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || "Failed to issue complimentary pass";
      showToast(msg, "error");
    },
  });
}

/**
 * Update an existing complimentary pass.
 * PATCH /api/admin/complimentary-passes/:id
 */
export function useUpdateComplimentaryPass() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ComplimentaryPassPayload }) =>
      patchData<any>(AppUrl.complimentaryPass.update(id), payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complimentaryPassKeys.all });
      showToast("Complimentary pass updated successfully", "success");
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || "Failed to update complimentary pass";
      showToast(msg, "error");
    },
  });
}

/**
 * Delete a complimentary pass.
 * DELETE /api/admin/complimentary-passes/:id
 */
export function useDeleteComplimentaryPass() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (id: string) => deleteData<any>(AppUrl.complimentaryPass.delete(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complimentaryPassKeys.all });
      showToast("Complimentary pass deleted successfully", "success");
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || "Failed to delete complimentary pass";
      showToast(msg, "error");
    },
  });
}
