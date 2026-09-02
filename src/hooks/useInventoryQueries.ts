"use client";

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { getData, postData } from "@/lib/api/apiService";
import { AppUrl } from "@/lib/api/endpoints";
import { useToast } from "@/components/ui/Toast";

// ── Types ────────────────────────────────────────────────────────────────────

export interface InventorySlot {
  id?: string;
  time?: string;
  slotTime?: string;
  capacity?: number;
  booked?: number;
  isActive?: boolean;
  status?: string;
}

export interface InventoryItem {
  id: string;
  attraction: {
    id: string;
    name: string;
  };
  capacityDate: string;
  date?: string;
  totalCapacity: number;
  dailyCapacity?: number;
  bookedCapacity?: number;
  booked?: number;
  availableCapacity?: number;
  available?: number;
  slotCapacity?: number;
  slots?: InventorySlot[];
}

export interface InventoryListParams {
  page?: number;
  limit?: number;
  search?: string;
  attractionId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface InventoryListResponse {
  items: InventoryItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UpsertDailyCapacityPayload {
  attractionId: string;
  capacityDate: string;
  totalCapacity: number;
}

// ── Query Keys ───────────────────────────────────────────────────────────────

export const inventoryKeys = {
  all: ["inventory"] as const,
  lists: () => [...inventoryKeys.all, "list"] as const,
  list: (params?: InventoryListParams) => [...inventoryKeys.lists(), params] as const,
};

// ── Queries ──────────────────────────────────────────────────────────────────

/**
 * Fetch paginated list of inventory / daily capacities.
 * GET /api/admin/inventory
 */
export function useInventoryList(params?: InventoryListParams) {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 10;

  return useQuery<InventoryListResponse>({
    queryKey: inventoryKeys.list({ ...params, page, limit }),
    queryFn: async () => {
      const sp = new URLSearchParams();
      sp.set("page", String(page));
      sp.set("limit", String(limit));
      if (params?.search?.trim()) sp.set("search", params.search.trim());
      if (params?.attractionId && params.attractionId !== "All") sp.set("attractionId", params.attractionId);
      if (params?.dateFrom) sp.set("dateFrom", params.dateFrom);
      if (params?.dateTo) sp.set("dateTo", params.dateTo);

      const res = await getData<any>(`${AppUrl.inventory.list}?${sp.toString()}`);

      // Handle standard response wrappers
      const rawData = res?.data ?? res;
      if (rawData && Array.isArray(rawData.items)) {
        return {
          items: rawData.items.map((item: any) => ({
            id: item.id || String(Math.random()),
            attraction: {
              id: item.attraction?.id || item.attractionId || "",
              name: item.attraction?.name || item.attractionName || "-",
            },
            capacityDate: item.capacityDate || item.date || "-",
            totalCapacity: Number(item.totalCapacity ?? item.dailyCapacity ?? 0),
            bookedCapacity: Number(item.bookedCapacity ?? item.booked ?? 0),
            availableCapacity: Number(
              item.availableCapacity ??
                item.available ??
                Math.max(0, Number(item.totalCapacity ?? item.dailyCapacity ?? 0) - Number(item.bookedCapacity ?? item.booked ?? 0))
            ),
            slotCapacity: item.slotCapacity,
            slots: item.slots || [],
          })),
          pagination: rawData.pagination || {
            page,
            limit,
            total: rawData.items.length,
            totalPages: Math.ceil(rawData.items.length / limit) || 1,
          },
        };
      }

      if (Array.isArray(rawData)) {
        return {
          items: rawData.map((item: any) => ({
            id: item.id || String(Math.random()),
            attraction: {
              id: item.attraction?.id || item.attractionId || "",
              name: item.attraction?.name || item.attractionName || "-",
            },
            capacityDate: item.capacityDate || item.date || "-",
            totalCapacity: Number(item.totalCapacity ?? item.dailyCapacity ?? 0),
            bookedCapacity: Number(item.bookedCapacity ?? item.booked ?? 0),
            availableCapacity: Number(
              item.availableCapacity ??
                item.available ??
                Math.max(0, Number(item.totalCapacity ?? item.dailyCapacity ?? 0) - Number(item.bookedCapacity ?? item.booked ?? 0))
            ),
            slotCapacity: item.slotCapacity,
            slots: item.slots || [],
          })),
          pagination: {
            page,
            limit,
            total: rawData.length,
            totalPages: Math.ceil(rawData.length / limit) || 1,
          },
        };
      }

      return {
        items: [],
        pagination: { page: 1, limit, total: 0, totalPages: 0 },
      };
    },
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });
}

// ── Mutations ────────────────────────────────────────────────────────────────

/**
 * Upsert daily capacity for an attraction.
 * POST /api/admin/inventory
 */
export function useUpsertDailyCapacity() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (payload: UpsertDailyCapacityPayload) =>
      postData(AppUrl.inventory.upsert, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() });
      showToast("Capacity updated successfully!", "success");
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to update capacity.";
      showToast(message, "error");
    },
  });
}
