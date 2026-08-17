// ─── Per-attraction module permissions ───────────────────────────────────────
export interface AttractionPermission {
  attractionId: string;
  /** Which of the 4 sub-modules this manager can use within this attraction */
  modules: string[];
}

export type ManagerStatus = "ACTIVE" | "DISABLED" | "SUSPENDED" | "Active" | "Inactive" | "Disabled";

// ─── Manager entity matching API response
export interface ManagerUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  status: ManagerStatus;
  createdAt: string;
  lastLoginAt: string | null;
  attraction?: string;
  totalBookings?: number;
  revenueGenerated?: number;
  attractionManagementEnabled?: boolean;
  staffCreationEnabled?: boolean;
  allowedModules?: string[];
  attractionPermissions?: AttractionPermission[];
}

export interface ManagerPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

