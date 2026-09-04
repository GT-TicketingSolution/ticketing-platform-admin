"use client";

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { getData, postData, patchData, deleteData } from "@/lib/api/apiService";
import { AppUrl } from "@/lib/api/endpoints";
import { useToast } from "@/components/ui/Toast";
import { showErrorNotify } from "@/lib/notify";
import type {
  AttractionManagement,
  AttractionQueryParams,
  CreateAttractionPayload,
  UpdateAttractionPayload,
  BulkAttractionPayload,
  BulkUploadResponse,
} from "@/app/(dashboard)/attraction-management/types";

// ── Query keys ───────────────────────────────────────────────────────────────
export const attractionManagementKeys = {
  all: ["attractionManagement"] as const,
  lists: () => [...attractionManagementKeys.all, "list"] as const,
  list: (params?: AttractionQueryParams) => [...attractionManagementKeys.lists(), params] as const,
};

// ── List attractions
export function useAttractionManagementList(
  params?: AttractionQueryParams,
  options?: { enabled?: boolean }
) {
  const searchParams = new URLSearchParams();
  if (params?.search?.trim()) searchParams.set("search", params.search.trim());
  if (params?.status) searchParams.set("status", params.status);
  if (params?.category) searchParams.set("category", params.category);

  const url = searchParams.toString()
    ? `${AppUrl.attractionManagement.list}?${searchParams.toString()}`
    : AppUrl.attractionManagement.list;

  return useQuery({
    queryKey: attractionManagementKeys.list(params),
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      const res = await getData<any>(url);
      const items: any[] = Array.isArray(res)
        ? res
        : Array.isArray(res?.data)
          ? res.data
          : [];
      const mapped = items.map((item: any) => ({
        ...item,
        pricing: {
          adult: Number(item?.pricing?.adult ?? 0),
          child: Number(item?.pricing?.child ?? 0),
          student: Number(item?.pricing?.student ?? 0),
          senior: Number(item?.pricing?.senior ?? 0),
          foreigner: Number(item?.pricing?.foreigner ?? 0),
        },
        seating: {
          adult: Number(item?.seating?.adult ?? item?.adultSeats ?? 0),
          child: Number(item?.seating?.child ?? item?.childSeats ?? 0),
          student: Number(item?.seating?.student ?? item?.studentSeats ?? 0),
          senior: Number(item?.seating?.senior ?? item?.seniorSeats ?? 0),
          foreigner: Number(item?.seating?.foreigner ?? item?.foreignerSeats ?? 0),
        },
        seatLayoutIds: Array.isArray(item?.seatLayoutIds)
          ? item.seatLayoutIds
          : Array.isArray(item?.seatLayouts)
            ? item.seatLayouts.flatMap((l: any) => {
              const qty = Math.max(1, Number(l?.quantity) || 1);
              return Array.from({ length: qty }, () => l.id);
            })
            : [],
        seatLayoutId: item.seatLayoutId ?? (item.seatLayouts?.[0]?.id ?? null),
      })) as AttractionManagement[];

      return mapped.sort((a: any, b: any) => {
        const timeA = new Date(a.updatedAt || 0).getTime();
        const timeB = new Date(b.updatedAt || 0).getTime();
        return timeB - timeA;
      });
    },
    staleTime: 30 * 1000,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });
}

// ── Create attraction 
export function useCreateAttraction() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (payload: CreateAttractionPayload) =>
      postData(AppUrl.attractionManagement.create, payload, { skipErrorToast: true } as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attractionManagementKeys.lists() });
      showToast("Attraction created successfully!", "success");
    },
    onError: (error: any) => {
      const message =
        error?.error?.message ||
        error?.response?.data?.message ||
        error?.message ||
        "";
      const code =
        error?.error?.code ||
        error?.response?.data?.code ||
        error?.response?.status;

      const isDuplicate =
        /already exist/i.test(message) ||
        /duplicate/i.test(message) ||
        code === "DUPLICATE_NAME" ||
        code === 409 ||
        code === "409";

      if (isDuplicate) {
        // Silently return — mutateAsync re-throws the original error,
        // which page.tsx catches and forwards to the form as a field error.
        return;
      }
      showErrorNotify(message || "Failed to create attraction.", "Error");
    },
  });
}

// ── Update attraction 
export function useUpdateAttraction() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAttractionPayload }) =>
      patchData(AppUrl.attractionManagement.update(id), data, { skipErrorToast: true } as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attractionManagementKeys.lists() });
      showToast("Attraction updated successfully!", "success");
    },
    onError: (error: any) => {
      const message =
        error?.error?.message ||
        error?.response?.data?.message ||
        error?.message ||
        "";
      const code =
        error?.error?.code ||
        error?.response?.data?.code ||
        error?.response?.status;

      const isDuplicate =
        /already exist/i.test(message) ||
        /duplicate/i.test(message) ||
        code === "DUPLICATE_NAME" ||
        code === 409 ||
        code === "409";

      if (isDuplicate) {
        // Silently return — mutateAsync re-throws the original error,
        // which page.tsx catches and forwards to the form as a field error.
        return;
      }
      showErrorNotify(message || "Failed to update attraction.", "Error");
    },
  });
}

// ── Delete attraction 
export function useDeleteAttraction() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (id: string) => deleteData(AppUrl.attractionManagement.delete(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attractionManagementKeys.lists() });
      showToast("Attraction deleted successfully!", "info");
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || error?.message || "Failed to delete attraction.";
      showToast(message, "error");
    },
  });
}

// ── Bulk upload ──────────────────────────────────────────────────────────────
export function useBulkUploadAttractions() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation<BulkUploadResponse, any, BulkAttractionPayload>({
    mutationFn: (payload: BulkAttractionPayload) =>
      postData<BulkUploadResponse, BulkAttractionPayload>(
        AppUrl.attractionManagement.bulk,
        payload,
      ),
    onSuccess: (data: BulkUploadResponse) => {
      queryClient.invalidateQueries({ queryKey: attractionManagementKeys.lists() });
      const count = Array.isArray(data?.data) ? data.data.length : 0;
      showToast(`${count} attraction${count !== 1 ? "s" : ""} uploaded successfully!`, "success");
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || error?.message || "Failed to upload attractions.";
      showToast(message, "error");
    },
  });
}

/**
 * Assign seat layout(s) to attraction (Mock Implementation)
 */
export function useAssignSeatLayout() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      seatLayoutId,
      seatLayoutIds,
    }: {
      id: string;
      seatLayoutId?: string;
      seatLayoutIds?: string[];
    }) => {
      await new Promise((resolve) => setTimeout(resolve, 80));
      return {
        id,
        seatLayoutId: seatLayoutId || (seatLayoutIds && seatLayoutIds[0]) || null,
        seatLayoutIds: seatLayoutIds || (seatLayoutId ? [seatLayoutId] : []),
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attractionManagementKeys.lists() });
      showToast("Seat layout assigned successfully!", "success");
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || error?.message || "Failed to assign seat layout.";
      showToast(message, "error");
    },
  });
}
