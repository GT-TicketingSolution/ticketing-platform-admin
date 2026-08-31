"use client";

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { getData, postData, patchData, deleteData } from "@/lib/api/apiService";
import { AppUrl } from "@/lib/api/endpoints";
import { useToast } from "@/components/ui/Toast";

// ── Types 

export interface CustomerItem {
  id: string;
  name: string;
  mobile: string;
  gstn?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomerListParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface CustomerListResponse {
  items: CustomerItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateCustomerPayload {
  name: string;
  mobile: string;
  gstn?: string;
}

export interface UpdateCustomerPayload {
  id: string;
  name: string;
  mobile: string;
  gstn?: string;
}

// ── Query Keys ───────────────────────────────────────────────────────────────

export const customerKeys = {
  all: ["customers"] as const,
  lists: () => [...customerKeys.all, "list"] as const,
  list: (params?: CustomerListParams) => [...customerKeys.lists(), params] as const,
};

// ── Queries ──────────────────────────────────────────────────────────────────

/**
 * Fetch paginated list of customers or all records when limit: 0.
 * GET /api/admin/customers
 */
export async function fetchCustomerList(params?: CustomerListParams): Promise<CustomerListResponse> {
  const page = params?.page ?? 1;
  const limit = params?.limit !== undefined ? params.limit : 10;

  const sp = new URLSearchParams();
  sp.set("page", String(page));
  sp.set("limit", String(limit));
  if (params?.search?.trim()) sp.set("search", params.search.trim());

  const res = await getData<any>(`${AppUrl.customer.list}?${sp.toString()}`);

  const rawData = res?.data ?? res;
  if (rawData && Array.isArray(rawData.items)) {
    const total = rawData.pagination?.total ?? rawData.items.length;
    return {
      items: rawData.items.map((c: any) => ({
        id: c.id,
        name: c.name || "-",
        mobile: c.mobile || "-",
        gstn: c.gstn ?? null,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
      pagination: rawData.pagination || {
        page,
        limit,
        total,
        totalPages: limit > 0 ? (Math.ceil(total / limit) || 1) : 1,
      },
    };
  }

  if (Array.isArray(rawData)) {
    return {
      items: rawData.map((c: any) => ({
        id: c.id,
        name: c.name || "-",
        mobile: c.mobile || "-",
        gstn: c.gstn ?? null,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
      pagination: {
        page,
        limit,
        total: rawData.length,
        totalPages: limit > 0 ? (Math.ceil(rawData.length / limit) || 1) : 1,
      },
    };
  }

  return {
    items: [],
    pagination: { page: 1, limit, total: 0, totalPages: 0 },
  };
}

/**
 * Fetch paginated list of customers.
 * GET /api/admin/customers
 */
export function useCustomerList(params?: CustomerListParams, enabled = true) {
  const page = params?.page ?? 1;
  const limit = params?.limit !== undefined ? params.limit : 10;

  return useQuery<CustomerListResponse>({
    queryKey: customerKeys.list({ ...params, page, limit }),
    queryFn: () => fetchCustomerList({ ...params, page, limit }),
    placeholderData: keepPreviousData,
    enabled,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });
}

// ── Mutations ────────────────────────────────────────────────────────────────

/**
 * Create a new customer.
 * POST /api/admin/customers
 */
export function useCreateCustomer() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (payload: CreateCustomerPayload) =>
      postData(AppUrl.customer.create, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
      showToast("Customer created successfully!", "success");
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to create customer.";
      showToast(message, "error");
    },
  });
}

/**
 * Update an existing customer.
 * PATCH /api/admin/customers/:id
 */
export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ id, ...payload }: UpdateCustomerPayload) =>
      patchData(AppUrl.customer.update(id), payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
      showToast("Customer updated successfully!", "success");
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to update customer.";
      showToast(message, "error");
    },
  });
}

/**
 * Soft delete a customer.
 * DELETE /api/admin/customers/:id
 */
export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (customerId: string) =>
      deleteData(AppUrl.customer.delete(customerId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
      showToast("Customer deleted successfully.", "info");
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to delete customer.";
      showToast(message, "error");
    },
  });
}
