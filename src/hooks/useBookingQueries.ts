"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getData, patchData, deleteData } from "@/lib/api/apiService";
import { AppUrl } from "@/lib/api/endpoints";
import { showSuccessNotify } from "@/lib/notify";
import { showErrorOnce } from "@/lib/api/axiosConfig";

// ── Types ────────────────────────────────────────────────────────────────────

export interface BookingCustomer {
  name: string | null;
  mobileNumber?: string | null;
  mobile?: string | null;
  gstNumber?: string | null;
}

export interface BookingAttractionItem {
  id: string;
  name: string;
  totalAmount?: number;
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
  invoiceNumber: string;
  bookingId: string;
  customer?: BookingCustomer;
  customerName: string;
  mobileNumber: string;
  gstNumber?: string | null;
  dateTime?: string;
  bookingDate: string;
  attractions?: BookingAttractionItem[];
  attraction: {
    id: string;
    name: string;
  };
  grandTotalAmount: number;
  visitors: number | {
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
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BookingDetailItem {
  id: string;
  bookingId: string;
  invoiceNumber?: string;
  customer: {
    name: string;
    mobile?: string | null;
    mobileNumber?: string | null;
    gstNumber?: string | null;
  };
  attractions?: BookingAttractionItem[];
  attraction: {
    id: string;
    name: string;
  };
  grandTotalAmount?: number;
  dateTime?: string;
  visitAt?: string;
  paymentMode?: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | string;
  visitors?: number | {
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
  attractionManagementId?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
}

export interface BookingListResponse {
  items: BookingListItem[];
  attractions?: Array<{
    id: string;
    name: string;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UpdateBookingPayload {
  customerName?: string;
  mobileNumber?: string;
  gstNumber?: string;
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
  const invoiceNum = item.invoiceNumber ?? item.bookingId ?? item.id ?? "-";
  const custName = item.customer?.name ?? item.customerName ?? "-";
  const custMobile = item.customer?.mobileNumber ?? item.customer?.mobile ?? item.mobileNumber ?? "-";
  const custGst = item.customer?.gstNumber ?? item.gstNumber ?? null;
  const dateStr = item.dateTime ?? item.bookingDate ?? item.createdAt ?? "";

  // Parse grand total & amount
  const grandTotal = Number(
    item.grandTotalAmount ??
    (typeof item.amount === "object" && item.amount !== null
      ? (item.amount.total ?? item.amount.subtotal ?? 0)
      : item.amount ?? 0)
  );

  let paidAmount = 0;
  let dueAmount = 0;
  let amountDetails: BookingAmountDetails | undefined = undefined;

  if (typeof item.amount === "object" && item.amount !== null) {
    amountDetails = item.amount;
    paidAmount = Number(item.amount.paid ?? grandTotal);
    dueAmount = Number(item.amount.due ?? 0);
  } else {
    paidAmount = Number(item.amountPaid ?? grandTotal);
    dueAmount = Number(item.amountDue ?? 0);
  }

  // Attractions list
  const attractionsList: BookingAttractionItem[] = Array.isArray(item.attractions)
    ? item.attractions.map((a: any) => ({
      id: a.id ?? a.attractionManagementId ?? "",
      name: a.name ?? a.attractionName ?? "-",
      totalAmount: Number(a.totalAmount ?? 0),
    }))
    : item.attraction
      ? [{ id: item.attraction.id ?? "", name: item.attraction.name ?? "-", totalAmount: grandTotal }]
      : [];

  const attractionDisplay = {
    id: attractionsList.length > 0 ? attractionsList[0].id : (item.attraction?.id ?? ""),
    name: attractionsList.length > 0
      ? attractionsList.map((a) => a.name).join(", ")
      : (item.attraction?.name ?? "-"),
  };

  // Visitors
  const visitorsVal = typeof item.visitors === "number"
    ? item.visitors
    : typeof item.visitors === "object" && item.visitors !== null
      ? (item.visitors.total ?? 0)
      : Number(item.visitors ?? 0);

  return {
    ...item,
    id: item.id,
    invoiceNumber: invoiceNum,
    bookingId: invoiceNum,
    customer: {
      name: custName,
      mobileNumber: custMobile,
      gstNumber: custGst,
    },
    customerName: custName,
    mobileNumber: custMobile,
    gstNumber: custGst,
    dateTime: dateStr,
    bookingDate: dateStr,
    attractions: attractionsList,
    attraction: attractionDisplay,
    visitors: visitorsVal,
    grandTotalAmount: grandTotal,
    tickets: item.tickets ?? item.items ?? [],
    amount: grandTotal,
    amountDetails,
    amountPaid: paidAmount,
    amountDue: dueAmount,
    paymentMode: item.paymentMode ?? item.payment?.mode ?? "-",
    status: item.status ?? "-",
    createdBy: item.createdBy,
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
  const attractionMgmtId = params?.attractionManagementId || params?.attractionId;
  if (attractionMgmtId && attractionMgmtId !== "All" && attractionMgmtId !== "ALL") {
    sp.set("attractionManagementId", attractionMgmtId);
  }
  if (params?.status && params.status !== "All" && params.status !== "ALL") sp.set("status", params.status);
  if (params?.fromDate) sp.set("fromDate", params.fromDate);
  if (params?.toDate) sp.set("toDate", params.toDate);

  const res = await getData<any>(`${AppUrl.booking.list}?${sp.toString()}`);

  // Normalise different response shapes
  const payload = res?.data ?? res;

  if (payload && Array.isArray(payload.items)) {
    const totalCount = payload.pagination?.total ?? payload.items.length;
    return {
      items: payload.items.map(mapBookingItem),
      attractions: Array.isArray(payload.attractions) ? payload.attractions : [],
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
      attractions: [],
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
    attractions: [],
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
    staleTime: 0,
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
