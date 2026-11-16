export type StaffStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "Active"
  | "Inactive";

export interface StaffAttraction {
  id: string;
  name: string;
}

export interface StaffRoleItem {
  id?: string;
  role: string;
}

export interface StaffBookingCount {
  totalBookings: string | number;
}

export interface StaffUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string | string[];
  roles?: string[];
  roleDetails?: StaffRoleItem[];
  assignedAttraction?: string[];
  attractions?: StaffAttraction[];
  attractionIds?: string[];
  joinedDate?: string;
  createdAt?: string;
  status: StaffStatus;
  ticketsIssued?: number;
  staffTotalBookings?: StaffBookingCount[];
  reportPermissions?: Array<{
    reportAccessTiming?: number | null;
    reportAccessUnit?: string | null;
  }>;
  /** Whether this staff member is allowed to view reports */
  canViewReports?: boolean;
  /** Number of hours the staff member can access/view reports (only relevant when canViewReports is true) */
  reportAccessTiming?: number | null;
}

export interface StaffPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface StaffSystemModule {
  id: string;
  name: string;
}

export interface StaffListResponse {
  items: StaffUser[];
  staffSystemModules?: StaffSystemModule[];
  pagination: StaffPagination;
}

export interface StaffQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: "ACTIVE" | "INACTIVE" | string;
  attractionId?: string;
}

/**
 * Role payload type used in create / update staff APIs.
 */
export type StaffRolePayload = {
  id?: string;
  role: string;
};

export interface CreateStaffPayload {
  name: string;
  email: string;
  phone: string;
  password?: string;
  /** Array of role names or role objects */
  roles: string[] | StaffRolePayload[];
  attractionIds: string[];
  staffSystemModuleAllowedIds?: string[];
  status: "ACTIVE" | "INACTIVE";
  /** Whether this staff member is allowed to view reports */
  canViewReports?: boolean;
  /** Number of hours the staff can access/view reports */
  reportViewDurationHours?: number | null;
  reportAccessTiming?: number;
  reportAccessUnit?: "HOURS";
}

export interface UpdateStaffPayload {
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
  /** Array of role objects (id optional for new roles) */
  roles?: StaffRolePayload[];
  attractionIds?: string[];
  staffSystemModuleAllowedIds?: string[];
  status?: "ACTIVE" | "INACTIVE";
  /** Whether this staff member is allowed to view reports */
  canViewReports?: boolean;
  /** Number of hours the staff can access/view reports */
  reportViewDurationHours?: number | null;
  reportAccessTiming?: number;
  reportAccessUnit?: "HOURS";
}
