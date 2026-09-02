export interface ManagerAttractionItem {
  id: string;
  name: string;
  type?: string;
  category?: string;
  status?: string;
  moduleIds?: string[];
  modules?: any[];
}

// ─── Per-attraction module permissions 
export interface AttractionPermission {
  attractionId: string;
  attractionName?: string;
  /** Which of the 4 sub-modules this manager can use within this attraction */
  modules: string[];
}

export type ManagerStatus = "ACTIVE" | "INACTIVE" | "Active" | "Inactive";

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
  attractions?: ManagerAttractionItem[];
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

