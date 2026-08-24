"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getData, postData, patchData, deleteData } from "@/lib/api/apiService";
import { AppUrl } from "@/lib/api/endpoints";
import { showSuccessNotify } from "@/lib/notify";
import { showErrorOnce } from "@/lib/api/axiosConfig";
import {
  StaffListResponse,
  StaffUser,
  StaffQueryParams,
  CreateStaffPayload,
  UpdateStaffPayload,
} from "@/app/(dashboard)/staff-management/types";

export type { StaffQueryParams };

// ── Query Keys Factory 
export const staffKeys = {
  all: ["staff"] as const,
  lists: () => [...staffKeys.all, "list"] as const,
  list: (params?: StaffQueryParams) => [...staffKeys.lists(), params] as const,
  details: () => [...staffKeys.all, "detail"] as const,
  detail: (id: string) => [...staffKeys.details(), id] as const,
};

// ── Queries 

/**
 * Fetch paginated list of staff members or all records when limit: 0.
 * GET /api/admin/staff
 */
export async function fetchStaffList(params?: StaffQueryParams): Promise<StaffListResponse> {
  const page = params?.page ?? 1;
  const limit = params?.limit !== undefined ? params.limit : 10;

  const searchParams = new URLSearchParams();
  searchParams.set("page", String(page));
  searchParams.set("limit", String(limit));
  if (params?.search?.trim()) searchParams.set("search", params.search.trim());
  if (params?.status) searchParams.set("status", params.status);
  if (params?.attractionId && params.attractionId !== "All" && params.attractionId !== "all") {
    searchParams.set("attractionId", params.attractionId);
  }

  const url = `${AppUrl.staff.list}?${searchParams.toString()}`;
  const res = await getData<any>(url);

  // Normalize response
  const payload = res?.data ?? res;
  if (payload && Array.isArray(payload.items)) {
    const total = payload.pagination?.total ?? payload.items.length;
    return {
      items: payload.items,
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
      items: payload,
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
 * Fetch paginated list of staff members (GET /api/admin/staff)
 */
export function useStaffList(params?: StaffQueryParams) {
  const page = params?.page ?? 1;
  const limit = params?.limit !== undefined ? params.limit : 10;

  return useQuery<StaffListResponse>({
    queryKey: staffKeys.list({ ...params, page, limit }),
    queryFn: () => fetchStaffList({ ...params, page, limit }),
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });
}

/**
 * Fetch a single staff member by ID (GET /api/admin/staff/:staffId)
 */
export function useStaffMember(staffId: string, enabled = true) {
  return useQuery<{ staff: StaffUser }>({
    queryKey: staffKeys.detail(staffId),
    queryFn: async () => {
      return getData<{ staff: StaffUser }>(AppUrl.staff.get(staffId));
    },
    enabled: Boolean(staffId) && enabled,
  });
}

// ── Mutations 

/**
 * Create a new staff member (POST /api/admin/staff)
 */
export function useCreateStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateStaffPayload) => {
      return postData<{ staff?: StaffUser; message?: string }>(AppUrl.staff.create, payload);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: staffKeys.lists() });
      showSuccessNotify(
        `Staff member "${data?.staff?.name || "Staff"}" created successfully.`,
        "Staff Created"
      );
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message ||
        error?.error?.message ||
        error?.message ||
        "Failed to create staff member.";
      showErrorOnce(message, "Creation Failed");
    },
  });
}

/**
 * Update an existing staff member (PATCH /api/admin/staff/:staffId)
 */
export function useUpdateStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      staffId,
      data,
    }: {
      staffId: string;
      data: UpdateStaffPayload;
    }) => {
      return patchData<{ staff?: StaffUser; message?: string }>(AppUrl.staff.update(staffId), data);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: staffKeys.lists() });
      queryClient.invalidateQueries({ queryKey: staffKeys.detail(variables.staffId) });
      showSuccessNotify(
        `Staff member "${data?.staff?.name || "Staff"}" updated successfully.`,
        "Changes Saved"
      );
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message ||
        error?.error?.message ||
        error?.message ||
        "Failed to update staff member.";
      showErrorOnce(message, "Update Failed");
    },
  });
}

/**
 * Disable staff member mutation (PATCH /api/admin/staff/:staffId/disable)
 */
export function useDisableStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (staffId: string) => {
      return patchData<{ message: string; staff: StaffUser }>(
        AppUrl.staff.disable(staffId),
        {}
      );
    },
    onSuccess: (_, staffId) => {
      queryClient.invalidateQueries({ queryKey: staffKeys.lists() });
      queryClient.invalidateQueries({ queryKey: staffKeys.detail(staffId) });
      showSuccessNotify("Staff account has been disabled.", "Staff Disabled");
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message ||
        error?.error?.message ||
        error?.message ||
        "Failed to disable staff.";
      showErrorOnce(message, "Action Failed");
    },
  });
}

/**
 * Delete a staff member (DELETE /api/admin/staff/:staffId)
 */
export function useDeleteStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (staffId: string) => {
      return deleteData<{ message: string; staff?: { id: string } }>(AppUrl.staff.delete(staffId));
    },
    onSuccess: (_, staffId) => {
      queryClient.invalidateQueries({ queryKey: staffKeys.lists() });
      queryClient.invalidateQueries({ queryKey: staffKeys.detail(staffId) });
      showSuccessNotify("Staff member deleted successfully.", "Deleted");
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message ||
        error?.error?.message ||
        error?.message ||
        "Failed to delete staff member.";
      showErrorOnce(message, "Delete Failed");
    },
  });
}
