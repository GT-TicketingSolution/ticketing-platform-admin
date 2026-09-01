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

// ── Mock Initial Data & LocalStorage Helpers 
const MOCK_STORAGE_KEY = "mock_seat_layouts_data";

const DEFAULT_MOCK_SEATS: SeatLayoutItem[] = [
  {
    id: "550e8400-e29b-41d4-a716-446655440000",
    name: "Express Coach A (6x4)",
    rows: 6,
    cols: 4,
    hasAisle: true,
    aisleAfterCol: 2,
    status: "ACTIVE",
    totalSeats: 24,
    createdAt: new Date().toISOString(),
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440001",
    name: "VIP Lounge (4x3)",
    rows: 4,
    cols: 3,
    hasAisle: false,
    aisleAfterCol: 0,
    status: "ACTIVE",
    totalSeats: 12,
    createdAt: new Date().toISOString(),
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440002",
    name: "Standard Section B (8x4)",
    rows: 8,
    cols: 4,
    hasAisle: true,
    aisleAfterCol: 2,
    status: "ACTIVE",
    totalSeats: 32,
    createdAt: new Date().toISOString(),
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440003",
    name: "Deck Compartment (5x5)",
    rows: 5,
    cols: 5,
    hasAisle: true,
    aisleAfterCol: 3,
    status: "ACTIVE",
    totalSeats: 25,
    createdAt: new Date().toISOString(),
  },
];

function getStoredMockSeats(): SeatLayoutItem[] {
  if (typeof window === "undefined") return DEFAULT_MOCK_SEATS;
  try {
    const raw = localStorage.getItem(MOCK_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(DEFAULT_MOCK_SEATS));
      return DEFAULT_MOCK_SEATS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_MOCK_SEATS;
  } catch {
    return DEFAULT_MOCK_SEATS;
  }
}

function saveStoredMockSeats(seats: SeatLayoutItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(seats));
  } catch (err) {
    console.error("Failed to save mock seats to localStorage:", err);
  }
}

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
 * Fetch list of seat layouts from database API
 * Only returns seat layouts that actually exist in the database with real UUIDs
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

      try {
        const res = await getData<any>(url);

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
          pagination: { page: 1, limit: 0, total: 0, totalPages: 1 },
        };
      } catch (error) {
        console.error("Failed to fetch seat layouts:", error);
        return {
          items: [],
          pagination: { page: 1, limit: 0, total: 0, totalPages: 1 },
        };
      }
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });
}

/*
// ============================================================================
// [PREVIOUS API CODE - GET /api/admin/seats/:seatId]
// export function useSeatLayout(seatId: string, enabled = true) {
//   return useQuery<SeatLayoutItem & { totalSeats?: number }>({
//     queryKey: seatKeys.detail(seatId),
//     queryFn: async () => {
//       return getData<SeatLayoutItem & { totalSeats?: number }>(AppUrl.seat.get(seatId));
//     },
//     enabled: Boolean(seatId) && enabled,
//   });
// }
// ============================================================================
*/

/**
 * Fetch a single seat layout by ID (Mock Implementation)
 */
export function useSeatLayout(seatId: string, enabled = true) {
  return useQuery<SeatLayoutItem & { totalSeats?: number }>({
    queryKey: seatKeys.detail(seatId),
    queryFn: async () => {
      const allSeats = getStoredMockSeats();
      const found = allSeats.find((s) => s.id === seatId);
      if (!found) throw new Error("Seat layout not found");
      return {
        ...found,
        totalSeats: (found.rows ?? 0) * (found.cols ?? 0),
      };
    },
    enabled: Boolean(seatId) && enabled,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

/*
// ============================================================================
// [PREVIOUS API CODE - POST /api/admin/seats]
// export function useCreateSeatLayout() {
//   const queryClient = useQueryClient();
//
//   return useMutation({
//     mutationFn: async (payload: CreateSeatPayload) => {
//       return postData<SeatLayoutItem>(AppUrl.seat.create, payload);
//     },
//     onSuccess: (data) => {
//       queryClient.invalidateQueries({ queryKey: seatKeys.lists() });
//       showSuccessNotify(
//         `Seat layout "${data?.name || "New Layout"}" created successfully.`,
//         "Layout Created"
//       );
//     },
//     onError: (error: any) => {
//       const message =
//         error?.response?.data?.message ||
//         error?.error?.message ||
//         error?.message ||
//         "Failed to create seat layout.";
//       showErrorOnce(message, "Creation Failed");
//     },
//   });
// }
// ============================================================================
*/

/**
 * Create a new seat layout (Mock Implementation)
 */
export function useCreateSeatLayout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateSeatPayload) => {
      await new Promise((resolve) => setTimeout(resolve, 80));
      const current = getStoredMockSeats();
      const newLayout: SeatLayoutItem = {
        id: `seat-layout-${Date.now()}`,
        name: payload.name,
        rows: payload.rows || 6,
        cols: payload.cols || 4,
        hasAisle: !!payload.hasAisle,
        aisleAfterCol: payload.aisleAfterCol ?? (payload.aislePosition ?? 0),
        status: payload.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
        totalSeats: (payload.rows || 6) * (payload.cols || 4),
        createdAt: new Date().toISOString(),
      };
      const updated = [newLayout, ...current];
      saveStoredMockSeats(updated);
      return newLayout;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: seatKeys.lists() });
      showSuccessNotify(
        `Seat layout "${data?.name || "New Layout"}" created successfully.`,
        "Layout Created"
      );
    },
  });
}

/*
// ============================================================================
// [PREVIOUS API CODE - PATCH /api/admin/seats/:seatId]
// export function useUpdateSeatLayout() {
//   const queryClient = useQueryClient();
//
//   return useMutation({
//     mutationFn: async ({
//       seatId,
//       data,
//     }: {
//       seatId: string;
//       data: UpdateSeatPayload;
//     }) => {
//       return patchData<SeatLayoutItem>(AppUrl.seat.update(seatId), data);
//     },
//     onSuccess: (data, variables) => {
//       queryClient.invalidateQueries({ queryKey: seatKeys.lists() });
//       queryClient.invalidateQueries({ queryKey: seatKeys.detail(variables.seatId) });
//       showSuccessNotify(
//         `Seat layout "${data?.name || "Layout"}" updated successfully.`,
//         "Changes Saved"
//       );
//     },
//     onError: (error: any) => {
//       const message =
//         error?.response?.data?.message ||
//         error?.error?.message ||
//         error?.message ||
//         "Failed to update seat layout.";
//       showErrorOnce(message, "Update Failed");
//     },
//   });
// }
// ============================================================================
*/

/**
 * Update an existing seat layout (Mock Implementation)
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
      await new Promise((resolve) => setTimeout(resolve, 80));
      const current = getStoredMockSeats();
      const idx = current.findIndex((s) => s.id === seatId);
      if (idx === -1) throw new Error("Seat layout not found");

      const existing = current[idx];
      const updatedItem: SeatLayoutItem = {
        ...existing,
        name: data.name !== undefined ? data.name : existing.name,
        rows: data.rows !== undefined ? data.rows : existing.rows,
        cols: data.cols !== undefined ? data.cols : existing.cols,
        hasAisle: data.hasAisle !== undefined ? data.hasAisle : existing.hasAisle,
        aisleAfterCol:
          data.aisleAfterCol !== undefined
            ? data.aisleAfterCol
            : data.aislePosition !== undefined
              ? data.aislePosition
              : existing.aisleAfterCol,
        status: data.status !== undefined ? data.status : existing.status,
        totalSeats:
          (data.rows !== undefined ? data.rows : existing.rows) *
          (data.cols !== undefined ? data.cols : existing.cols),
      };

      current[idx] = updatedItem;
      saveStoredMockSeats([...current]);
      return updatedItem;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: seatKeys.lists() });
      queryClient.invalidateQueries({ queryKey: seatKeys.detail(variables.seatId) });
      showSuccessNotify(
        `Seat layout "${data?.name || "Layout"}" updated successfully.`,
        "Changes Saved"
      );
    },
  });
}

/*
// ============================================================================
// [PREVIOUS API CODE - DELETE /api/admin/seats/:seatId]
// export function useDeleteSeatLayout() {
//   const queryClient = useQueryClient();
//
//   return useMutation({
//     mutationFn: async (seatId: string) => {
//       return deleteData<{ message: string; seat?: { id: string } }>(AppUrl.seat.delete(seatId));
//     },
//     onSuccess: (_, seatId) => {
//       queryClient.invalidateQueries({ queryKey: seatKeys.lists() });
//       queryClient.invalidateQueries({ queryKey: seatKeys.detail(seatId) });
//       showSuccessNotify("Seat layout deleted successfully.", "Deleted");
//     },
//     onError: (error: any) => {
//       const message =
//         error?.response?.data?.message ||
//         error?.error?.message ||
//         error?.message ||
//         "Failed to delete seat layout.";
//       showErrorOnce(message, "Delete Failed");
//     },
//   });
// }
// ============================================================================
*/

/**
 * Delete a seat layout (Mock Implementation)
 */
export function useDeleteSeatLayout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (seatId: string) => {
      await new Promise((resolve) => setTimeout(resolve, 80));
      const current = getStoredMockSeats();
      const filtered = current.filter((s) => s.id !== seatId);
      saveStoredMockSeats(filtered);
      return { message: "Deleted successfully", seat: { id: seatId } };
    },
    onSuccess: (_, seatId) => {
      queryClient.invalidateQueries({ queryKey: seatKeys.lists() });
      queryClient.invalidateQueries({ queryKey: seatKeys.detail(seatId) });
      showSuccessNotify("Seat layout deleted successfully.", "Deleted");
    },
  });
}

