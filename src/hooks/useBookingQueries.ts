"use client";

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { getData, patchData, deleteData } from "@/lib/api/apiService";
import { AppUrl } from "@/lib/api/endpoints";
import { showSuccessNotify } from "@/lib/notify";
import { showErrorOnce } from "@/lib/api/axiosConfig";

// ── Types ────────────────────────────────────────────────────────────────────

export interface BookingCustomer {
  name: string;
  mobileNumber?: string | null;
  mobile?: string | null;
  gstNumber?: string | null;
}

export interface BookingVisitorBreakdown {
  category: string;
  quantity: number;
}

export interface BookingTicketItem {
  id: string;
  attractionId?: string;
  category: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface BookingAmountDetails {
  subtotal?: number;
  gstAmount?: number;
  gstAdjustment?: number;
  roundOff?: number;
  discountAmount?: number;
  total?: number;
  paid?: number;
  due?: number;
}

export interface BookingListItem {
  id: string;
  bookingId: string;
  customer?: BookingCustomer;
  customerName: string;
  mobileNumber: string;
  gstNumber?: string | null;
  dateTime?: string;
  bookingDate: string;
  attraction: {
    id: string;
    name: string;
  };
  visitors: {
    total: number;
    breakdown?: BookingVisitorBreakdown[];
  };
  tickets?: BookingTicketItem[];
  amount: number;
  amountDetails?: BookingAmountDetails;
  amountPaid: number;
  amountDue?: number;
  paymentMode: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BookingDetailItem {
  id: string;
  bookingId: string;
  customer: {
    name: string;
    mobile?: string | null;
    mobileNumber?: string | null;
    gstNumber?: string | null;
  };
  attraction: {
    id: string;
    name: string;
  };
  dateTime?: string;
  visitAt?: string;
  paymentMode?: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | string;
  visitors?: {
    total: number;
    breakdown?: BookingVisitorBreakdown[];
  };
  tickets?: BookingTicketItem[];
  amount?: BookingAmountDetails | number;
  payment?: {
    mode: string;
    totalAmount: number;
    amountPaid: number;
    amountDue: number;
  };
  items?: Array<{
    id: string;
    category: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  seats?: Array<{
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

// ── Normalise Booking Item Helper ─────────────────────────────────────────────
function mapBookingItem(item: any): BookingListItem {
  const custName = item.customer?.name ?? item.customerName ?? "-";
  const custMobile = item.customer?.mobileNumber ?? item.customer?.mobile ?? item.mobileNumber ?? "-";
  const dateStr = item.dateTime ?? item.bookingDate ?? item.createdAt ?? "";

  let totalAmount = 0;
  let paidAmount = 0;
  let dueAmount = 0;
  let amountDetails: BookingAmountDetails | undefined = undefined;

  if (typeof item.amount === "object" && item.amount !== null) {
    amountDetails = item.amount;
    totalAmount = Number(item.amount.total ?? item.amount.subtotal ?? 0);
    paidAmount = Number(item.amount.paid ?? 0);
    dueAmount = Number(item.amount.due ?? 0);
  } else {
    totalAmount = Number(item.amount ?? 0);
    paidAmount = Number(item.amountPaid ?? item.amount ?? 0);
    dueAmount = Number(item.amountDue ?? 0);
  }

  const visitorsObj =
    typeof item.visitors === "object" && item.visitors !== null
      ? {
          total: Number(item.visitors.total ?? 0),
          breakdown: item.visitors.breakdown ?? [],
        }
      : {
          total: Number(item.visitors ?? 0),
          breakdown: [],
        };

  return {
    ...item,
    customer: item.customer ?? { name: custName, mobileNumber: custMobile, gstNumber: item.gstNumber ?? null },
    customerName: custName,
    mobileNumber: custMobile,
    dateTime: dateStr,
    bookingDate: dateStr,
    attraction: item.attraction ?? { id: "", name: "-" },
    visitors: visitorsObj,
    tickets: item.tickets ?? item.items ?? [],
    amount: totalAmount,
    amountDetails,
    amountPaid: paidAmount,
    amountDue: dueAmount,
    paymentMode: item.paymentMode ?? item.payment?.mode ?? "-",
    status: item.status ?? "PENDING",
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

// ── Queries ──────────────────────────────────────────────────────────────────

/**
 * Fetch list of bookings with filter parameters.
 * Supports limit: 0 for retrieving all records.
 * GET /api/admin/bookings
 */
export async function fetchBookingList(params?: BookingListParams): Promise<BookingListResponse> {
  const page = params?.page ?? 1;
  const limit = params?.limit !== undefined ? params.limit : 10;

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
  const payload = res?.data ?? res;

  if (payload && Array.isArray(payload.items)) {
    const totalCount = payload.pagination?.total ?? payload.items.length;
    return {
      items: payload.items.map(mapBookingItem),
      pagination: payload.pagination || {
        page,
        limit,
        total: totalCount,
        totalPages: limit > 0 ? (Math.ceil(totalCount / limit) || 1) : 1,
      },
    };
  }
  if (Array.isArray(payload)) {
    return {
      items: payload.map(mapBookingItem),
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
 * Fetch paginated list of bookings.
 * GET /api/admin/bookings
 */
export function useBookingList(params?: BookingListParams) {
  const page = params?.page ?? 1;
  const limit = params?.limit !== undefined ? params.limit : 10;

  return useQuery<BookingListResponse>({
    queryKey: bookingKeys.list({ ...params, page, limit }),
    queryFn: () => fetchBookingList({ ...params, page, limit }),
    placeholderData: keepPreviousData,
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
      const raw = res?.data ?? res?.booking ?? res;
      if (!raw) return raw;
      // Normalise customer mobile field
      if (raw.customer && !raw.customer.mobile && raw.customer.mobileNumber) {
        raw.customer.mobile = raw.customer.mobileNumber;
      }
      // Normalise tickets → items if no items field
      if ((!raw.items || raw.items.length === 0) && raw.tickets && raw.tickets.length > 0) {
        raw.items = raw.tickets;
      }
      // Normalise visitAt
      if (!raw.visitAt && raw.dateTime) raw.visitAt = raw.dateTime;
      return raw;
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
