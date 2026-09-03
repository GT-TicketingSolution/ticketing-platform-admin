"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getData, postData, patchData, deleteData } from "@/lib/api/apiService";
import { AppUrl } from "@/lib/api/endpoints";
import { showErrorOnce } from "@/lib/api/axiosConfig";
import { showSuccessNotify } from "@/lib/notify";
import {
  SeatLayoutListResponse,
  SeatLayoutItem,
  SeatQueryParams,
  CreateSeatPayload,
  UpdateSeatPayload,
} from "@/app/(dashboard)/seat-management/types";

// ============================================================================
// Query Keys
// ============================================================================

export const seatKeys = {
  all: ["seat-layouts"] as const,

  lists: () => [...seatKeys.all, "list"] as const,

  list: (params?: SeatQueryParams) => [...seatKeys.lists(), params] as const,

  details: () => [...seatKeys.all, "detail"] as const,

  detail: (id: string) => [...seatKeys.details(), id] as const,
};

// ============================================================================
// Error Helper
// ============================================================================

function getErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === "object" && error !== null && "error" in error) {
    const apiError = (
      error as {
        error?: {
          code?: string;
          message?: string;
        };
      }
    ).error;

    if (apiError?.message) {
      return apiError.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

// ============================================================================
// GET - List Seat Layouts
// ============================================================================

export function useSeatLayouts(params?: SeatQueryParams) {
  return useQuery<SeatLayoutListResponse>({
    queryKey: seatKeys.list(params),

    // Skip the API call entirely when enabled is explicitly false (e.g. edit mode)
    enabled: params?.enabled !== false,

    queryFn: async () => {
      const searchParams = new URLSearchParams();

      if (params?.page !== undefined) {
        searchParams.set("page", String(params.page));
      }

      if (params?.limit !== undefined) {
        searchParams.set("limit", String(params.limit));
      }

      if (params?.search?.trim()) {
        searchParams.set("search", params.search.trim());
      }

      if (params?.status) {
        searchParams.set("status", params.status);
      }

      const queryString = searchParams.toString();

      const url = queryString
        ? `${AppUrl.seat.list}?${queryString}`
        : AppUrl.seat.list;

      return getData<SeatLayoutListResponse>(url);
    },

    staleTime: 30 * 1000,

    refetchOnWindowFocus: false,
  });
}

// ============================================================================
// GET - Single Seat Layout
// ============================================================================

export function useSeatLayout(seatId: string, enabled = true) {
  return useQuery<SeatLayoutItem>({
    queryKey: seatKeys.detail(seatId),

    queryFn: async () => {
      return getData<SeatLayoutItem>(AppUrl.seat.get(seatId));
    },

    enabled: Boolean(seatId) && enabled,

    staleTime: 30 * 1000,
  });
}

// ============================================================================
// POST - Create Seat Layout
// ============================================================================

export function useCreateSeatLayout() {
  const queryClient = useQueryClient();

  return useMutation<SeatLayoutItem, unknown, CreateSeatPayload>({
    mutationFn: async (payload) => {
      return postData<SeatLayoutItem, CreateSeatPayload>(
        AppUrl.seat.create,
        payload,
      );
    },

    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: seatKeys.lists(),
      });

      showSuccessNotify(
        `Seat layout "${data?.name || "New Layout"}" created successfully.`,
        "Layout Created",
      );
    },

    onError: (error) => {
      const message = getErrorMessage(error, "Failed to create seat layout.");

      showErrorOnce(message, "Creation Failed");
    },
  });
}

// ============================================================================
// PATCH - Update Seat Layout
// ============================================================================

export function useUpdateSeatLayout() {
  const queryClient = useQueryClient();

  return useMutation<
    SeatLayoutItem,
    unknown,
    {
      seatId: string;
      data: UpdateSeatPayload;
    }
  >({
    mutationFn: async ({ seatId, data }) => {
      return patchData<SeatLayoutItem, UpdateSeatPayload>(
        AppUrl.seat.update(seatId),
        data,
      );
    },

    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: seatKeys.lists(),
      });

      queryClient.invalidateQueries({
        queryKey: seatKeys.detail(variables.seatId),
      });

      showSuccessNotify(
        `Seat layout "${data?.name || "Layout"}" updated successfully.`,
        "Changes Saved",
      );
    },

    onError: (error) => {
      const message = getErrorMessage(error, "Failed to update seat layout.");

      showErrorOnce(message, "Update Failed");
    },
  });
}

// ============================================================================
// DELETE - Delete Seat Layout
// ============================================================================

export function useDeleteSeatLayout() {
  const queryClient = useQueryClient();

  return useMutation<
    {
      message: string;
      seat: {
        id: string;
      };
    },
    unknown,
    string
  >({
    mutationFn: async (seatId) => {
      return deleteData<{
        message: string;
        seat: {
          id: string;
        };
      }>(AppUrl.seat.delete(seatId));
    },

    onSuccess: (_, seatId) => {
      queryClient.invalidateQueries({
        queryKey: seatKeys.lists(),
      });

      queryClient.invalidateQueries({
        queryKey: seatKeys.detail(seatId),
      });

      showSuccessNotify("Seat layout deleted successfully.", "Deleted");
    },

    onError: (error) => {
      const message = getErrorMessage(error, "Failed to delete seat layout.");

      showErrorOnce(message, "Delete Failed");
    },
  });
}
