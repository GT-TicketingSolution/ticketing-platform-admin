"use client";

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { getData, deleteData } from "@/lib/api/apiService";
import { AppUrl } from "@/lib/api/endpoints";
import { showSuccessNotify } from "@/lib/notify";
import { showErrorOnce } from "@/lib/api/axiosConfig";

// ── Types 

export interface InvoiceCustomer {
  name: string | null;
  mobileNumber: string | null;
  gstNumber: string | null;
}

export interface InvoiceAttractionItem {
  id: string;
  name: string;
}

export interface ScannerInvoice {
  scannerInvoiceStatus: string;
  scannedByStaff: string | null;
  scannedAt: string | null;
}

export interface InvoiceListItem {
  sNo?: number;
  id: string;
  invoiceNumber: string;
  customer: InvoiceCustomer | null;
  dateTime: string;
  attractions: InvoiceAttractionItem[];
  visitors: number;
  grandTotalAmount: number;
  scannerInvoice: ScannerInvoice | null;

  // Compatibility aliases
  invoiceId?: string;
  customerName?: string;
  mobileNumber?: string;
  gstNumber?: string;
  amount?: number;
  attraction?: {
    id: string;
    name: string;
  };
  paymentMode?: string;
  status?: string;
  bookingId?: string;
  transactionId?: string;
  invoiceDate?: string;
}

export interface InvoiceDetail extends InvoiceListItem { }

export interface InvoiceListParams {
  page?: number;
  limit?: number;
  search?: string;
  attractionId?: string;
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
  if (params?.attractionId && params.attractionId !== "All") sp.set("attractionId", params.attractionId);
  if (params?.dateFrom) sp.set("dateFrom", params.dateFrom);
  if (params?.dateTo) sp.set("dateTo", params.dateTo);

  const res = await getData<any>(`${AppUrl.invoice.list}?${sp.toString()}`);

  // Handle unwrap format from apiService or raw axios
  const payload = res?.data ?? res;
  if (payload && Array.isArray(payload.items)) {
    const total = payload.pagination?.total ?? payload.items.length;
    return {
      summary: payload.summary,
      items: payload.items.map((item: any, idx: number) => {
        const attractions: InvoiceAttractionItem[] = Array.isArray(item.attractions)
          ? item.attractions.map((a: any) => ({
            id: a.id || a.attractionId || "",
            name: a.name || "",
          }))
          : item.attraction
            ? [{ id: item.attraction.id || "", name: item.attraction.name || "" }]
            : [];

        const grandTotal = Number(item.grandTotalAmount ?? item.amount ?? 0);
        const invNum = item.invoiceNumber || item.invoiceId || item.id || "-";
        const status = item.scannerInvoice?.scannerInvoiceStatus || item.status || "CONFIRMED";

        const cust: InvoiceCustomer | null = item.customer
          ? {
            name: item.customer.name ?? null,
            mobileNumber: item.customer.mobileNumber ?? null,
            gstNumber: item.customer.gstNumber ?? null,
          }
          : item.customerName
            ? {
              name: item.customerName,
              mobileNumber: item.mobileNumber ?? null,
              gstNumber: item.gstNumber ?? null,
            }
            : null;

        const scannerInv: ScannerInvoice | null = item.scannerInvoice
          ? {
            scannerInvoiceStatus: item.scannerInvoice.scannerInvoiceStatus || "UNSCANNED",
            scannedByStaff: item.scannerInvoice.scannedByStaff ?? null,
            scannedAt: item.scannerInvoice.scannedAt ?? null,
          }
          : null;

        return {
          ...item,
          id: item.id || invNum,
          sNo: item.sNo ?? idx + 1 + (page - 1) * (limit || 10),
          invoiceNumber: invNum,
          invoiceId: invNum,
          customer: cust,
          customerName: cust?.name || "-",
          mobileNumber: cust?.mobileNumber || "-",
          gstNumber: cust?.gstNumber || "-",
          dateTime: item.dateTime || "",
          invoiceDate: item.dateTime || "",
          attractions,
          attraction: attractions[0] || { id: "", name: "-" },
          visitors: Number(item.visitors ?? 0),
          grandTotalAmount: grandTotal,
          amount: grandTotal,
          scannerInvoice: scannerInv,
          status,
          paymentMode: item.paymentMode ?? "CASH",
          bookingId: item.bookingId || item.bookingNumber || "-",
          transactionId: item.transactionId || "-",
        };
      }),
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
      items: payload.map((item: any, idx: number) => {
        const attractions: InvoiceAttractionItem[] = Array.isArray(item.attractions)
          ? item.attractions.map((a: any) => ({
            id: a.id || a.attractionId || "",
            name: a.name || "",
          }))
          : item.attraction
            ? [{ id: item.attraction.id || "", name: item.attraction.name || "" }]
            : [];

        const grandTotal = Number(item.grandTotalAmount ?? item.amount ?? 0);
        const invNum = item.invoiceNumber || item.invoiceId || item.id || "-";
        const status = item.scannerInvoice?.scannerInvoiceStatus || item.status || "CONFIRMED";

        const cust: InvoiceCustomer | null = item.customer
          ? {
            name: item.customer.name ?? null,
            mobileNumber: item.customer.mobileNumber ?? null,
            gstNumber: item.customer.gstNumber ?? null,
          }
          : item.customerName
            ? {
              name: item.customerName,
              mobileNumber: item.mobileNumber ?? null,
              gstNumber: item.gstNumber ?? null,
            }
            : null;

        const scannerInv: ScannerInvoice | null = item.scannerInvoice
          ? {
            scannerInvoiceStatus: item.scannerInvoice.scannerInvoiceStatus || "UNSCANNED",
            scannedByStaff: item.scannerInvoice.scannedByStaff ?? null,
            scannedAt: item.scannerInvoice.scannedAt ?? null,
          }
          : null;

        return {
          ...item,
          id: item.id || invNum,
          sNo: item.sNo ?? idx + 1 + (page - 1) * (limit || 10),
          invoiceNumber: invNum,
          invoiceId: invNum,
          customer: cust,
          customerName: cust?.name || "-",
          mobileNumber: cust?.mobileNumber || "-",
          gstNumber: cust?.gstNumber || "-",
          dateTime: item.dateTime || "",
          invoiceDate: item.dateTime || "",
          attractions,
          attraction: attractions[0] || { id: "", name: "-" },
          visitors: Number(item.visitors ?? 0),
          grandTotalAmount: grandTotal,
          amount: grandTotal,
          scannerInvoice: scannerInv,
          status,
          paymentMode: item.paymentMode ?? "CASH",
          bookingId: item.bookingId || item.bookingNumber || "-",
          transactionId: item.transactionId || "-",
        };
      }),
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
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
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
