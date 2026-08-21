"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getData, deleteData } from "@/lib/api/apiService";
import { AppUrl } from "@/lib/api/endpoints";
import { showSuccessNotify } from "@/lib/notify";
import { showErrorOnce } from "@/lib/api/axiosConfig";

// ── Types ────────────────────────────────────────────────────────────────────

export interface TransactionListItem {
  id: string;
  transactionId: string;
  customerName: string;
  transactionDate: string;
  bookingId: string;
  attraction: {
    id: string;
    name: string;
  };
  amount: number;
  paymentMode: string;
  status: string; // "SUCCESS" | "FAILED" | "PENDING" | etc.
}

export interface TransactionDetail {
  id: string;
  transactionId: string;
  invoiceNumber: string;
  booking: {
    id: string;
    bookingId: string;
  };
  customer: {
    name: string;
    mobile: string;
    gstNumber?: string | null;
  };
  attraction: {
    id: string;
    name: string;
  };
  transactionDate: string;
  payment: {
    mode: string;
    amount: number;
    status: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface TransactionListParams {
  page?: number;
  limit?: number;
  search?: string;
  attractionId?: string;
  paymentMode?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
}

export interface TransactionListResponse {
  items: TransactionListItem[];
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
  details: () => [...transactionKeys.all, "detail"] as const,
  detail: (id: string) => [...transactionKeys.details(), id] as const,
};

// ── Queries ──────────────────────────────────────────────────────────────────

/**
 * Fetch paginated list of transactions.
 * GET /api/admin/transactions
 */
export function useTransactionList(params?: TransactionListParams) {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 10;

  return useQuery<TransactionListResponse>({
    queryKey: transactionKeys.list({ ...params, page, limit }),
    queryFn: async () => {
      const sp = new URLSearchParams();
      sp.set("page", String(page));
      sp.set("limit", String(limit));
      if (params?.search?.trim()) sp.set("search", params.search.trim());
      if (params?.attractionId && params.attractionId !== "All") sp.set("attractionId", params.attractionId);
      if (params?.paymentMode && params.paymentMode !== "All") sp.set("paymentMode", params.paymentMode);
      if (params?.status && params.status !== "All") sp.set("status", params.status);
      if (params?.fromDate) sp.set("fromDate", params.fromDate);
      if (params?.toDate) sp.set("toDate", params.toDate);

      const res = await getData<any>(`${AppUrl.transaction.list}?${sp.toString()}`);

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
 * Fetch a single transaction's full detail.
 * GET /api/admin/transactions/:transactionId
 */
export function useTransactionDetail(transactionId: string, enabled = true) {
  return useQuery<TransactionDetail>({
    queryKey: transactionKeys.detail(transactionId),
    queryFn: async () => {
      const res = await getData<any>(AppUrl.transaction.get(transactionId));
      return res?.data?.transaction ?? res?.transaction ?? res;
    },
    enabled: enabled && !!transactionId,
    staleTime: 30 * 1000,
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
