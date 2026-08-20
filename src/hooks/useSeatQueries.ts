"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getData, postData, patchData, deleteData } from "@/lib/api/apiService";
import { AppUrl } from "@/lib/api/endpoints";
import { showSuccessNotify } from "@/lib/notify";
import { showErrorOnce } from "@/lib/api/axiosConfig";
import {
  SeatLayoutListResponse,
  SeatLayoutItem,
  SeatQueryParams,
  CreateSeatPayload,
  UpdateSeatPayload,
} from "@/app/(dashboard)/seat-management/types";

// ── Query Keys Factory ────────────────────────────────────────────────────────
export const seatKeys = {
  all: ["seat-layouts"] as const,
  lists: () => [...seatKeys.all, "list"] as const,
  list: (params?: SeatQueryParams) => [...seatKeys.lists(), params] as const,
  details: () => [...seatKeys.all, "detail"] as const,
  detail: (id: string) => [...seatKeys.details(), id] as const,
};

// ── Queries ───────────────────────────────────────────────────────────────────

/**
 * Fetch list of seat layouts (GET /api/admin/seats) without page and limit parameters
 */
export function useSeatLayouts(params?: SeatQueryParams) {
  return useQuery<SeatLayoutListResponse>({
    queryKey: seatKeys.list(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.search?.trim()) {
        searchParams.set("search", params.search.trim());
      }
      if (params?.status) {
        searchParams.set("status", params.status);
      }

      const queryString = searchParams.toString();
      const url = queryString ? `${AppUrl.seat.list}?${queryString}` : AppUrl.seat.list;
      const res = await getData<any>(url);

      // Normalize response if it's an array or object format
      if (Array.isArray(res)) {
        return {
          items: res,
          pagination: { page: 1, limit: res.length, total: res.length, totalPages: 1 },
        };
      }
      if (res && Array.isArray(res.items)) {
        return res;
      }
      if (res && Array.isArray(res.data)) {
        return {
          items: res.data,
          pagination: res.pagination || { page: 1, limit: res.data.length, total: res.data.length, totalPages: 1 },
        };
      }
      return {
        items: [],
        pagination: { page: 1, limit: 12, total: 0, totalPages: 1 },
      };
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });
}

/**
 * Fetch a single seat layout by ID (GET /api/admin/seats/:seatId)
 */
export function useSeatLayout(seatId: string, enabled = true) {
  return useQuery<SeatLayoutItem & { totalSeats?: number }>({
    queryKey: seatKeys.detail(seatId),
    queryFn: async () => {
      return getData<SeatLayoutItem & { totalSeats?: number }>(AppUrl.seat.get(seatId));
    },
    enabled: Boolean(seatId) && enabled,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

/**
 * Create a new seat layout (POST /api/admin/seats)
 */
export function useCreateSeatLayout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateSeatPayload) => {
      return postData<SeatLayoutItem>(AppUrl.seat.create, payload);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: seatKeys.lists() });
      showSuccessNotify(
        `Seat layout "${data?.name || "New Layout"}" created successfully.`,
        "Layout Created"
      );
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message ||
        error?.error?.message ||
        error?.message ||
        "Failed to create seat layout.";
      showErrorOnce(message, "Creation Failed");
    },
  });
}

/**
 * Update an existing seat layout (PATCH /api/admin/seats/:seatId)
 */
export function useUpdateSeatLayout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      seatId,
      data,
    }: {
      seatId: string;
      data: UpdateSeatPayload;
    }) => {
      return patchData<SeatLayoutItem>(AppUrl.seat.update(seatId), data);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: seatKeys.lists() });
      queryClient.invalidateQueries({ queryKey: seatKeys.detail(variables.seatId) });
      showSuccessNotify(
        `Seat layout "${data?.name || "Layout"}" updated successfully.`,
        "Changes Saved"
      );
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message ||
        error?.error?.message ||
        error?.message ||
        "Failed to update seat layout.";
      showErrorOnce(message, "Update Failed");
    },
  });
}

/**
 * Delete a seat layout (DELETE /api/admin/seats/:seatId)
 */
export function useDeleteSeatLayout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (seatId: string) => {
      return deleteData<{ message: string; seat?: { id: string } }>(AppUrl.seat.delete(seatId));
    },
    onSuccess: (_, seatId) => {
      queryClient.invalidateQueries({ queryKey: seatKeys.lists() });
      queryClient.invalidateQueries({ queryKey: seatKeys.detail(seatId) });
      showSuccessNotify("Seat layout deleted successfully.", "Deleted");
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message ||
        error?.error?.message ||
        error?.message ||
        "Failed to delete seat layout.";
      showErrorOnce(message, "Delete Failed");
    },
  });
}
