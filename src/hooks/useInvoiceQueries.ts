"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getData, deleteData } from "@/lib/api/apiService";
import { AppUrl } from "@/lib/api/endpoints";
import { showSuccessNotify } from "@/lib/notify";
import { showErrorOnce } from "@/lib/api/axiosConfig";

// ── Types 

export interface InvoiceListItem {
  sNo?: number;
  id: string;
  invoiceId: string;
  invoiceNumber?: string;
  transactionId?: string;
  customerName: string;
  dateTime: string;
  invoiceDate?: string;
  visitAt?: string;
  bookingId?: string;
  attraction: {
    id: string;
    name: string;
  };
  visitors?: number;
  amount: number;
  paymentMode: string;
  status: string; // "SUCCESSFUL" | "SUCCESS" | "CONFIRMED" | "PENDING" | "FAILED" | etc.
}

export interface InvoiceDetail {
  id: string;
  invoiceId?: string;
  invoiceNumber?: string;
  transactionId: string;
  dateTime?: string;
  visitAt?: string;
  visitors?: number;
  booking?: {
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
  invoiceDate?: string;
  payment?: {
    mode: string;
    amount: number;
    status: string;
  };
  amount?: number;
  paymentMode?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface InvoiceListParams {
  page?: number;
  limit?: number;
  search?: string;
  paymentMode?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface InvoiceSummary {
  totalRevenue: number;
  totalInvoices: number;
  paidInvoices: number;
}

export interface InvoiceListResponse {
  summary?: InvoiceSummary;
  items: InvoiceListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ── Query Keys ───────────────────────────────────────────────────────────────

export const invoiceKeys = {
  all: ["invoices"] as const,
  lists: () => [...invoiceKeys.all, "list"] as const,
  list: (params?: InvoiceListParams) => [...invoiceKeys.lists(), params] as const,
  details: () => [...invoiceKeys.all, "detail"] as const,
  detail: (id: string) => [...invoiceKeys.details(), id] as const,
};

// ── Queries ──────────────────────────────────────────────────────────────────

/**
 * Fetch paginated list of invoices or all records when limit: 0.
 * GET /api/admin/invoices
 */
export async function fetchInvoiceList(params?: InvoiceListParams): Promise<InvoiceListResponse> {
  const page = params?.page ?? 1;
  const limit = params?.limit !== undefined ? params.limit : 10;

  const sp = new URLSearchParams();
  sp.set("page", String(page));
  sp.set("limit", String(limit));
  if (params?.search?.trim()) sp.set("search", params.search.trim());
  if (params?.paymentMode && params.paymentMode !== "All") sp.set("paymentMode", params.paymentMode);
  if (params?.dateFrom) sp.set("dateFrom", params.dateFrom);
  if (params?.dateTo) sp.set("dateTo", params.dateTo);

  const res = await getData<any>(`${AppUrl.invoice.list}?${sp.toString()}`);

  // Handle unwrap format from apiService or raw axios
  const payload = res?.data ?? res;
  if (payload && Array.isArray(payload.items)) {
    const total = payload.pagination?.total ?? payload.items.length;
    return {
      summary: payload.summary,
      items: payload.items.map((item: any, idx: number) => ({
        ...item,
        id: item.id || item.invoiceId || item.invoiceNumber || item._id || `inv-${idx + 1 + (page - 1) * (limit || 10)}`,
        sNo: item.sNo ?? idx + 1 + (page - 1) * (limit || 10),
        invoiceId: item.invoiceId || item.invoiceNumber || item.id || "",
        invoiceNumber: item.invoiceNumber || item.invoiceId || item.id || "",
        bookingId: item.bookingId || item.bookingNumber || item.booking?.bookingId || "",
        dateTime: item.dateTime || item.invoiceDate || "",
        invoiceDate: item.dateTime || item.invoiceDate || "",
        visitAt: item.visitAt || "",
        visitors: item.visitors ?? 0,
        amount: Number(item.amount ?? 0),
        paymentMode: item.paymentMode ?? "-",
        status: item.status ?? "SUCCESS",
      })),
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
      summary: undefined,
      items: payload.map((item: any, idx: number) => ({
        ...item,
        id: item.id || item.invoiceId || item.invoiceNumber || item._id || `inv-${idx + 1 + (page - 1) * (limit || 10)}`,
        sNo: item.sNo ?? idx + 1 + (page - 1) * (limit || 10),
        invoiceId: item.invoiceId || item.invoiceNumber || item.id || "",
        invoiceNumber: item.invoiceNumber || item.invoiceId || item.id || "",
        bookingId: item.bookingId || item.bookingNumber || item.booking?.bookingId || "",
        dateTime: item.dateTime || item.invoiceDate || "",
        invoiceDate: item.dateTime || item.invoiceDate || "",
        visitAt: item.visitAt || "",
        visitors: item.visitors ?? 0,
        amount: Number(item.amount ?? 0),
        paymentMode: item.paymentMode ?? "-",
        status: item.status ?? "SUCCESS",
      })),
      pagination: {
        page,
        limit,
        total: payload.length,
        totalPages: limit > 0 ? (Math.ceil(payload.length / limit) || 1) : 1,
      },
    };
  }
  return {
    summary: undefined,
    items: [],
    pagination: { page: 1, limit, total: 0, totalPages: 0 },
  };
}

/**
 * Fetch paginated list of invoices.
 * GET /api/admin/invoices
 */
export function useInvoiceList(params?: InvoiceListParams) {
  const page = params?.page ?? 1;
  const limit = params?.limit !== undefined ? params.limit : 10;

  return useQuery<InvoiceListResponse>({
    queryKey: invoiceKeys.list({ ...params, page, limit }),
    queryFn: () => fetchInvoiceList({ ...params, page, limit }),
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });
}

/**
 * Fetch a single invoice's full detail.
 * GET /api/admin/invoices/:invoiceId
 */
export function useInvoiceDetail(invoiceId: string, enabled = true) {
  return useQuery<InvoiceDetail>({
    queryKey: invoiceKeys.detail(invoiceId),
    queryFn: async () => {
      const res = await getData<any>(AppUrl.invoice.get(invoiceId));
      return res?.data?.invoice ?? res?.invoice ?? res;
    },
    enabled: enabled && !!invoiceId,
    staleTime: 30 * 1000,
  });
}

// ── Mutations ────────────────────────────────────────────────────────────────

/**
 * Soft-delete an invoice (ADMIN only).
 * DELETE /api/admin/invoices/:invoiceId
 */
export function useDeleteInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (invoiceId: string) =>
      deleteData<any>(AppUrl.invoice.delete(invoiceId)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: invoiceKeys.lists() });
      showSuccessNotify("Invoice deleted successfully.");
    },
    onError: (err: any) => {
      showErrorOnce(err?.message || "Failed to delete invoice.");
    },
  });
}
