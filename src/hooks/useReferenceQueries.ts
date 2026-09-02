"use client";

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { getData, postData, patchData, deleteData } from "@/lib/api/apiService";
import { AppUrl } from "@/lib/api/endpoints";
import { useToast } from "@/components/ui/Toast";
import type {
  Reference,
  ReferencePayload,
  ReferenceListParams,
  ReferenceListResponse,
} from "@/app/(dashboard)/complimentary-passes/types";

export type { ReferenceListParams };

export const referenceKeys = {
  all: ["references"] as const,
  lists: () => [...referenceKeys.all, "list"] as const,
  list: (params: ReferenceListParams) => [...referenceKeys.lists(), params] as const,
  detail: (id: string) => [...referenceKeys.all, "detail", id] as const,
};

/**
 * Fetch reference records or all when limit: 0.
 * GET /api/admin/references
 */
export async function fetchReferenceList(params: ReferenceListParams = {}): Promise<ReferenceListResponse> {
  const page = params.page ?? 1;
  const limit = params.limit !== undefined ? params.limit : 10;

  const sp = new URLSearchParams();
  sp.set("page", String(page));
  sp.set("limit", String(limit));
  if (params.search?.trim()) sp.set("search", params.search.trim());

  const res = await getData<any>(`${AppUrl.reference.list}?${sp.toString()}`);
  const payload = res?.data ?? res;

  const mapItem = (item: any) => ({
    ...item,
    id: item.id || "",
    referenceName: item.referenceName || "",
    department: item.department || "",
    contactPerson: item.contactPerson || "",
    post: item.post || "",
    mobile: item.mobile || "",
    status: (item.status || "ACTIVE").toUpperCase(),
  });

  if (payload && Array.isArray(payload.items)) {
    const total = payload.pagination?.total ?? payload.items.length;
    return {
      items: payload.items.map(mapItem),
      pagination: payload.pagination || {
        page,
        limit,
        total,
        totalPages: limit > 0 ? (Math.ceil(total / limit) || 1) : 1,
      },
    };
  }

  if (Array.isArray(payload)) {
    return {
      items: payload.map(mapItem),
      pagination: {
        page,
        limit,
        total: payload.length,
        totalPages: limit > 0 ? (Math.ceil(payload.length / limit) || 1) : 1,
      },
    };
  }

  return {
    items: [],
    pagination: { page: 1, limit, total: 0, totalPages: 0 },
  };
}

/**
 * Fetch references list with pagination and search.
 * GET /api/admin/references
 */
export function useReferenceList(params: ReferenceListParams = {}) {
  return useQuery<ReferenceListResponse>({
    queryKey: referenceKeys.list(params),
    queryFn: () => fetchReferenceList(params),
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

/**
 * Create a new reference record.
 * POST /api/admin/references
 */
export function useCreateReference() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (payload: ReferencePayload) =>
      postData<any>(AppUrl.reference.create, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: referenceKeys.all });
      showToast("Reference added successfully", "success");
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || "Failed to add reference";
      showToast(msg, "error");
    },
  });
}

/**
 * Update an existing reference record.
 * PATCH /api/admin/references/:id
 */
export function useUpdateReference() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ReferencePayload }) =>
      patchData<any>(AppUrl.reference.update(id), payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: referenceKeys.all });
      showToast("Reference updated successfully", "success");
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || "Failed to update reference";
      showToast(msg, "error");
    },
  });
}

/**
 * Delete a reference record.
 * DELETE /api/admin/references/:id
 */
export function useDeleteReference() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (id: string) => deleteData<any>(AppUrl.reference.delete(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: referenceKeys.all });
      showToast("Reference deleted successfully", "success");
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || "Failed to delete reference";
      showToast(msg, "error");
    },
  });
}
