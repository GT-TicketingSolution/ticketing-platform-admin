"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getData, patchData, deleteData } from "@/lib/api/apiService";
import { AppUrl } from "@/lib/api/endpoints";
import { showSuccessNotify } from "@/lib/notify";
import { showErrorOnce } from "@/lib/api/axiosConfig";

// ── Types ────────────────────────────────────────────────────────────────────

export interface BookingListItem {
  id: string;
  bookingId: string;
  customerName: string;
  mobileNumber: string;
  bookingDate: string;
  attraction: {
    id: string;
    name: string;
  };
  visitors: {
    total: number;
  };
  amount: number;
  amountPaid: number;
  paymentMode: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
}

export interface BookingDetailItem {
  id: string;
  bookingId: string;
  customer: {
    name: string;
    mobile: string;
    gstNumber?: string | null;
  };
  attraction: {
    id: string;
    name: string;
  };
  visitAt: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  payment: {
    mode: string;
    totalAmount: number;
    amountPaid: number;
    amountDue: number;
  };
  items: Array<{
    id: string;
    category: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  seats: Array<{
    id: string;
    bogie?: string;
    seatNumber?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface BookingListParams {
  page?: number;
  limit?: number;
  search?: string;
  attractionId?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
}

export interface BookingListResponse {
  items: BookingListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UpdateBookingPayload {
  customerName: string;
  mobileNumber: string;
}

// ── Query Keys ───────────────────────────────────────────────────────────────

export const bookingKeys = {
  all: ["bookings"] as const,
  lists: () => [...bookingKeys.all, "list"] as const,
  list: (params?: BookingListParams) => [...bookingKeys.lists(), params] as const,
  details: () => [...bookingKeys.all, "detail"] as const,
  detail: (id: string) => [...bookingKeys.details(), id] as const,
};

// ── Queries ──────────────────────────────────────────────────────────────────

/**
 * Fetch paginated list of bookings.
 * GET /api/admin/bookings
 */
export function useBookingList(params?: BookingListParams) {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 10;

  return useQuery<BookingListResponse>({
    queryKey: bookingKeys.list({ ...params, page, limit }),
    queryFn: async () => {
      const sp = new URLSearchParams();
      sp.set("page", String(page));
      sp.set("limit", String(limit));
      if (params?.search?.trim()) sp.set("search", params.search.trim());
      if (params?.attractionId && params.attractionId !== "All") sp.set("attractionId", params.attractionId);
      if (params?.status && params.status !== "All") sp.set("status", params.status);
      if (params?.fromDate) sp.set("fromDate", params.fromDate);
      if (params?.toDate) sp.set("toDate", params.toDate);

      const res = await getData<any>(`${AppUrl.booking.list}?${sp.toString()}`);

      // Normalise different response shapes
      if (res && res.data && Array.isArray(res.data.items)) {
        return {
          items: res.data.items,
          pagination: res.data.pagination || {
            page,
            limit,
            total: res.data.items.length,
            totalPages: Math.ceil(res.data.items.length / limit) || 1,
          },
        };
      }
      if (res && Array.isArray(res.items)) {
        return {
          items: res.items,
          pagination: res.pagination || {
            page,
            limit,
            total: res.items.length,
            totalPages: Math.ceil(res.items.length / limit) || 1,
          },
        };
      }
      if (Array.isArray(res)) {
        return {
          items: res,
          pagination: { page, limit, total: res.length, totalPages: Math.ceil(res.length / limit) || 1 },
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
 * Fetch a single booking's full detail.
 * GET /api/admin/bookings/[bookingId]
 */
export function useBookingDetail(bookingId: string, enabled = true) {
  return useQuery<BookingDetailItem>({
    queryKey: bookingKeys.detail(bookingId),
    queryFn: async () => {
      const res = await getData<any>(AppUrl.booking.get(bookingId));
      return res?.data?.booking ?? res?.booking ?? res;
    },
    enabled: enabled && !!bookingId,
    staleTime: 30 * 1000,
  });
}

// ── Mutations ────────────────────────────────────────────────────────────────

/**
 * Update booking customerName and mobileNumber.
 * PATCH /api/admin/bookings/[bookingId]
 */
export function useUpdateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, payload }: { bookingId: string; payload: UpdateBookingPayload }) =>
      patchData<any>(AppUrl.booking.update(bookingId), payload),
    onSuccess: (_, { bookingId }) => {
      qc.invalidateQueries({ queryKey: bookingKeys.lists() });
      qc.invalidateQueries({ queryKey: bookingKeys.detail(bookingId) });
      showSuccessNotify("Booking updated successfully.");
    },
    onError: (err: any) => {
      showErrorOnce(err?.message || "Failed to update booking.");
    },
  });
}

/**
 * Soft-delete a booking.
 * DELETE /api/admin/bookings/[bookingId]
 */
export function useDeleteBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bookingId: string) => deleteData<any>(AppUrl.booking.delete(bookingId)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: bookingKeys.lists() });
      showSuccessNotify("Booking deleted successfully.");
    },
    onError: (err: any) => {
      showErrorOnce(err?.message || "Failed to delete booking.");
    },
  });
}
