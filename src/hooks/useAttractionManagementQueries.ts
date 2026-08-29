"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getData, postData, patchData, deleteData } from "@/lib/api/apiService";
import { AppUrl } from "@/lib/api/endpoints";
import { useToast } from "@/components/ui/Toast";
import type {
  AttractionManagement,
  CreateAttractionPayload,
  UpdateAttractionPayload,
  BulkAttractionPayload,
  BulkUploadResponse,
} from "@/app/(dashboard)/attraction-management/types";

// ── Query keys ───────────────────────────────────────────────────────────────
export const attractionManagementKeys = {
  all: ["attractionManagement"] as const,
  lists: () => [...attractionManagementKeys.all, "list"] as const,
};

function showErrorOnce(message: string, title = "Error") {
  console.error(`[${title}] ${message}`);
}

// ── List attractions 
export function useAttractionManagementList() {
  return useQuery({
    queryKey: attractionManagementKeys.lists(),
    queryFn: async () => {
      const res = await getData<any>(AppUrl.attractionManagement.list);
      const items: any[] = Array.isArray(res)
        ? res
        : Array.isArray(res?.data)
          ? res.data
          : [];
      return items.map((item: any) => ({
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
    },
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// ── Create attraction ────────────────────────────────────────────────────────
export function useCreateAttraction() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (payload: CreateAttractionPayload) =>
      postData(AppUrl.attractionManagement.create, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attractionManagementKeys.lists() });
      showToast("Attraction created successfully!", "success");
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || error?.message || "Failed to create attraction.";
      showErrorOnce(message, "Create Attraction Failed");
      showToast(message, "error");
    },
  });
}

// ── Update attraction ────────────────────────────────────────────────────────
export function useUpdateAttraction() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAttractionPayload }) =>
      patchData(AppUrl.attractionManagement.update(id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attractionManagementKeys.lists() });
      showToast("Attraction updated successfully!", "success");
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || error?.message || "Failed to update attraction.";
      showErrorOnce(message, "Update Attraction Failed");
      showToast(message, "error");
    },
  });
}

// ── Delete attraction ────────────────────────────────────────────────────────
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
      showErrorOnce(message, "Delete Attraction Failed");
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
  });
}

// ── Assign seat layout 
export function useAssignSeatLayout() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ id, seatLayoutId }: { id: string; seatLayoutId: string }) =>
      patchData(AppUrl.attractionManagement.assignSeat(id), { seatLayoutId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attractionManagementKeys.lists() });
      showToast("Seat layout assigned successfully!", "success");
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || error?.message || "Failed to assign seat layout.";
      showErrorOnce(message, "Seat Assignment Failed");
      showToast(message, "error");
    },
  });
}
