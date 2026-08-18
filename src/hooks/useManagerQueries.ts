
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getData, postData, patchData, putData, deleteData } from "@/lib/api/apiService";
import { AppUrl } from "@/lib/api/endpoints";
import { showSuccessNotify } from "@/lib/notify";
import { showErrorOnce } from "@/lib/api/axiosConfig";

export interface ManagerQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: "ACTIVE" | "SUSPENDED" | "DISABLED";
}

export interface ManagerListItem {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  status: "ACTIVE" | "SUSPENDED" | "DISABLED";
  createdAt: string;
  lastLoginAt?: string | null;
}

export interface ManagerListResponse {
  managers: ManagerListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateManagerPayload {
  name: string;
  email: string;
  phone?: string;
  password: string;
  status?: "ACTIVE" | "SUSPENDED" | "DISABLED";
  systemModuleIds?: string[];
  attractionPermissions?: {
    attractionId: string;
    moduleIds: string[];
  }[];
}

export interface UpdateManagerPayload {
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
  status?: "ACTIVE" | "SUSPENDED" | "DISABLED";
}

export interface SystemModulePermission {
  id: string;
  key: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

export interface AttractionModulePermission {
  id: string;
  attractionId: string;
  key: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

export interface ManagerAttractionPermission {
  id: string;
  name: string;
  type: string;
  status: string;
  modules: AttractionModulePermission[];
}

export interface ManagerPermissionsResponse {
  manager: {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
  };
  systemModules: SystemModulePermission[];
  attractions: ManagerAttractionPermission[];
}

export interface UpdateManagerPermissionsRequest {
  systemModuleIds: string[];
  attractionPermissions: {
    attractionId: string;
    moduleIds: string[];
  }[];
}

// Query Keys
export const managerKeys = {
  all: ["managers"] as const,
  lists: () => [...managerKeys.all, "list"] as const,
  list: (params?: ManagerQueryParams) => [...managerKeys.lists(), params] as const,
  details: () => [...managerKeys.all, "detail"] as const,
  detail: (id: string) => [...managerKeys.details(), id] as const,
  permissions: (id: string) => [...managerKeys.detail(id), "permissions"] as const,
};

// ─── Queries ─────────────────────────────────────────────────────────────────

/**
 * Fetch list of managers with pagination, search, and status filtering (GET /api/admin/manager)
 */
export function useManagers(params?: ManagerQueryParams) {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 10;

  return useQuery({
    queryKey: managerKeys.list({ ...params, page, limit }),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      searchParams.set("page", String(page));
      searchParams.set("limit", String(limit));
      if (params?.search) searchParams.set("search", params.search);
      if (params?.status) searchParams.set("status", params.status);

      const queryString = searchParams.toString();
      const url = `${AppUrl.manager.list}?${queryString}`;
      return getData<ManagerListResponse>(url);
    },
  });
}

/**
 * Fetch a single manager by ID (GET /api/admin/manager/:managerId)
 */
export function useManager(managerId: string, enabled = true) {
  return useQuery({
    queryKey: managerKeys.detail(managerId),
    queryFn: async () => {
      return getData<{ manager: ManagerListItem }>(AppUrl.manager.get(managerId));
    },
    enabled: Boolean(managerId) && enabled,
  });
}

/**
 * Fetch manager permissions (GET /api/admin/managers/:managerId/permissions)
 */
export function useManagerPermissions(managerId: string, enabled = true) {
  return useQuery({
    queryKey: managerKeys.permissions(managerId),
    queryFn: async () => {
      return getData<ManagerPermissionsResponse>(AppUrl.manager.getPermissions(managerId));
    },
    enabled: Boolean(managerId) && enabled,
  });
}

// ─── Mutations ───────────────────────────────────────────────────────────────

/**
 * Create a new manager mutation (POST /api/admin/manager)
 */
export function useCreateManager() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateManagerPayload) => {
      return postData<{ manager: ManagerListItem }>(AppUrl.manager.create, payload);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: managerKeys.lists() });
      showSuccessNotify(
        `Manager "${data?.manager?.name || "New Manager"}" has been created successfully.`,
        "Manager Added"
      );
    },
    onError: (error: any) => {
      const message = error?.error?.message || error?.message || "Failed to create manager.";
      showErrorOnce(message, "Error Adding Manager");
    },
  });
}

/**
 * Update an existing manager mutation (PATCH /api/admin/manager/:managerId)
 */
export function useUpdateManager() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      managerId,
      data,
    }: {
      managerId: string;
      data: UpdateManagerPayload;
    }) => {
      return patchData<{ manager: ManagerListItem }>(AppUrl.manager.update(managerId), data);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: managerKeys.lists() });
      queryClient.invalidateQueries({ queryKey: managerKeys.detail(variables.managerId) });
      showSuccessNotify(
        `Manager "${data?.manager?.name || "Manager"}" updated successfully.`,
        "Changes Saved"
      );
    },
    onError: (error: any) => {
      const message = error?.error?.message || error?.message || "Failed to update manager.";
      showErrorOnce(message, "Update Failed");
    },
  });
}

/**
 * Update manager permissions mutation (PUT /api/admin/managers/:managerId/permissions)
 */
export function useUpdateManagerPermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      managerId,
      data,
    }: {
      managerId: string;
      data: UpdateManagerPermissionsRequest;
    }) => {
      return putData<{ message: string }>(
        AppUrl.manager.updatePermissions(managerId),
        data
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: managerKeys.permissions(variables.managerId) });
      showSuccessNotify("Manager permissions updated successfully.", "Permissions Updated");
    },
    onError: (error: any) => {
      const message = error?.error?.message || error?.message || "Failed to update permissions.";
      showErrorOnce(message, "Permissions Error");
    },
  });
}

/**
 * Disable manager mutation (DELETE /api/admin/manager/:managerId)
 */
export function useDisableManager() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (managerId: string) => {
      return deleteData<{ message: string; manager: ManagerListItem }>(
        AppUrl.manager.disable(managerId)
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: managerKeys.lists() });
      showSuccessNotify("Manager account has been disabled.", "Manager Disabled");
    },
    onError: (error: any) => {
      const message = error?.error?.message || error?.message || "Failed to disable manager.";
      showErrorOnce(message, "Action Failed");
    },
  });
}

export interface AttractionItem {
  id: string;
  name: string;
  type?: string;
  category?: string;
  status?: string;
}

/**
 * Fetch attractions list from API
 */
export function useAttractions() {
  return useQuery({
    queryKey: ["attractions", "list"] as const,
    queryFn: async () => {
      return getData<AttractionItem[]>(AppUrl.attraction.list);
    },
  });
}

