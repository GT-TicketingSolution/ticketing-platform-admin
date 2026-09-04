"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getData, deleteData } from "@/lib/api/apiService";
import { AppUrl } from "@/lib/api/endpoints";
import { showSuccessNotify } from "@/lib/notify";
import { showErrorOnce } from "@/lib/api/axiosConfig";

// ── Types ────────────────────────────────────────────────────────────────────

export interface TransactionCustomer {
  name: string | null;
  mobileNumber: string | null;
  gstNumber: string | null;
}

export interface TransactionAttractionItem {
  id: string;
  name: string;
  attractionSubtotal?: number;
  attractionGst?: number;
  attractionRoundoff?: number;
  attractionRoundOffGstAdj?: number;
  attractionTotalAmount?: number;
}

export interface TransactionCategoryItem {
  id: string;
  name: string;
  noOfSeats: number;
}

export interface TransactionListItem {
  id: string;
  invoiceNumber: string;
  customer?: TransactionCustomer | null;
  dateTime: string;
  attractions: TransactionAttractionItem[];
  grandTotalAmount: number;
  paymentMode: string;
  status: string; // "SUCCESSFUL" | "FAILED" | "PENDING" | "CANCELLED"
  categories?: TransactionCategoryItem[];

  // Compatibility aliases
  transactionId?: string;
  customerName?: string;
  mobileNumber?: string;
  transactionDate?: string;
  bookingId?: string;
  amount?: number;
  attraction?: {
    id: string;
    name: string;
  };
}

export interface TransactionListParams {
  page?: number;
  limit?: number;
  search?: string;
  attractionId?: string;
  attractionManagementId?: string;
  paymentMode?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
}

export interface TransactionListResponse {
  items: TransactionListItem[];
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

// ── Query Keys ───────────────────────────────────────────────────────────────

export const transactionKeys = {
  all: ["transactions"] as const,
  lists: () => [...transactionKeys.all, "list"] as const,
  list: (params?: TransactionListParams) => [...transactionKeys.lists(), params] as const,
};

// ── Normalization Helper ─────────────────────────────────────────────────────

function mapTransactionItem(raw: any): TransactionListItem {
  const invoiceNum = raw.invoiceNumber || raw.transactionId || raw.id || "";
  const custName = raw.customer?.name || raw.customerName || "-";
  const dateStr = raw.dateTime || raw.transactionDate || raw.createdAt || "";
  const grandTotal = Number(raw.grandTotalAmount ?? raw.amount ?? 0);

  // Normalize attractions array
  let attractionsList: TransactionAttractionItem[] = [];
  if (Array.isArray(raw.attractions)) {
    attractionsList = raw.attractions.map((a: any) => ({
      id: a.id || a.attractionId || "",
      name: a.name || "",
      attractionSubtotal: Number(a.attractionSubtotal ?? a.subtotal ?? 0),
      attractionGst: Number(a.attractionGst ?? a.gst ?? 0),
      attractionRoundoff: Number(a.attractionRoundoff ?? 0),
      attractionRoundOffGstAdj: Number(a.attractionRoundOffGstAdj ?? 0),
      attractionTotalAmount: Number(a.attractionTotalAmount ?? a.totalAmount ?? 0),
    }));
  } else if (raw.attraction) {
    attractionsList = [
      {
        id: raw.attraction.id || "",
        name: raw.attraction.name || "",
        attractionTotalAmount: grandTotal,
      },
    ];
  }

  // Normalize categories
  const categoriesList: TransactionCategoryItem[] = Array.isArray(raw.categories)
    ? raw.categories.map((c: any) => ({
        id: c.id || "",
        name: c.name || "",
        noOfSeats: Number(c.noOfSeats ?? c.seats ?? 0),
      }))
    : [];

  return {
    id: raw.id,
    invoiceNumber: invoiceNum,
    customer: raw.customer
      ? {
          name: raw.customer.name ?? null,
          mobileNumber: raw.customer.mobileNumber ?? raw.customer.mobile ?? null,
          gstNumber: raw.customer.gstNumber ?? null,
        }
      : null,
    dateTime: dateStr,
    attractions: attractionsList,
    grandTotalAmount: grandTotal,
    paymentMode: raw.paymentMode || "CASH",
    status: raw.status || "SUCCESSFUL",
    categories: categoriesList,

    // Aliases
    transactionId: invoiceNum,
    customerName: custName,
    mobileNumber: raw.customer?.mobileNumber || raw.customer?.mobile || raw.mobileNumber,
    transactionDate: dateStr,
    bookingId: raw.bookingId || raw.booking?.bookingId || invoiceNum,
    amount: grandTotal,
    attraction: attractionsList[0] ? { id: attractionsList[0].id, name: attractionsList[0].name } : undefined,
  };
}

// ── Queries ──────────────────────────────────────────────────────────────────

/**
 * Fetch paginated list of transactions or all records when limit: 0.
 * GET /api/admin/transactions
 */
export async function fetchTransactionList(params?: TransactionListParams): Promise<TransactionListResponse> {
  const page = params?.page ?? 1;
  const limit = params?.limit !== undefined ? params.limit : 10;

  const sp = new URLSearchParams();
  sp.set("page", String(page));
  sp.set("limit", String(limit));
  if (params?.search?.trim()) sp.set("search", params.search.trim());
  if (params?.attractionId && params.attractionId !== "All" && params.attractionId !== "ALL") {
    sp.set("attractionId", params.attractionId);
  }
  if (params?.paymentMode && params.paymentMode !== "All" && params.paymentMode !== "ALL") {
    sp.set("paymentMode", params.paymentMode);
  }
  if (params?.status && params.status !== "All" && params.status !== "ALL") {
    sp.set("status", params.status);
  }
  if (params?.fromDate) sp.set("fromDate", params.fromDate);
  if (params?.toDate) sp.set("toDate", params.toDate);

  const res = await getData<any>(`${AppUrl.transaction.list}?${sp.toString()}`);

  // Normalise different response shapes
  const payload = res?.data ?? res;
  if (payload && Array.isArray(payload.items)) {
    const total = payload.pagination?.total ?? payload.items.length;
    return {
      items: payload.items.map(mapTransactionItem),
      attractions: Array.isArray(payload.attractions) ? payload.attractions : [],
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
      items: payload.map(mapTransactionItem),
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
 * Fetch paginated list of transactions.
 * GET /api/admin/transactions
 */
export function useTransactionList(params?: TransactionListParams) {
  const page = params?.page ?? 1;
  const limit = params?.limit !== undefined ? params.limit : 10;

  return useQuery<TransactionListResponse>({
    queryKey: transactionKeys.list({ ...params, page, limit }),
    queryFn: () => fetchTransactionList({ ...params, page, limit }),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
}

// ── Mutations ────────────────────────────────────────────────────────────────

/**
 * Soft-delete a transaction (ADMIN only).
 * DELETE /api/admin/transactions/:transactionId
 */
export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (transactionId: string) =>
      deleteData<any>(AppUrl.transaction.delete(transactionId)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: transactionKeys.lists() });
      showSuccessNotify("Transaction deleted successfully.");
    },
    onError: (err: any) => {
      showErrorOnce(err?.message || "Failed to delete transaction.");
    },
  });
}
