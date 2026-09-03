// ─── Staff Entity matching API response 

export type StaffStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "Active"
  | "Inactive";

export interface StaffAttraction {
  id: string;
  name: string;
}

export interface StaffUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string | string[];
  roles?: string[];
  assignedAttraction?: string[];
  attractions?: StaffAttraction[];
  attractionIds?: string[];
  joinedDate?: string;
  createdAt?: string;
  status: StaffStatus;
  ticketsIssued?: number;
  /** Whether this staff member is allowed to view reports */
  canViewReports?: boolean;
  /** Number of hours the staff can access/view reports (only relevant when canViewReports is true) */
  reportViewDurationHours?: number | null;
}

export interface StaffPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface StaffListResponse {
  items: StaffUser[];
  pagination: StaffPagination;
}

export interface StaffQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: "ACTIVE" | "INACTIVE" | string;
  attractionId?: string;
}

export interface CreateStaffPayload {
  name: string;
  email: string;
  phone: string;
  password?: string;
  roles: string[];
  attractionIds: string[];
  status: "ACTIVE" | "INACTIVE";
  /** Whether this staff member is allowed to view reports */
  canViewReports?: boolean;
  /** Number of hours the staff can access/view reports */
  reportViewDurationHours?: number | null;
}

export interface UpdateStaffPayload {
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
  roles?: string[];
  attractionIds?: string[];
  status?: "ACTIVE" | "INACTIVE";
  /** Whether this staff member is allowed to view reports */
  canViewReports?: boolean;
  /** Number of hours the staff can access/view reports */
  reportViewDurationHours?: number | null;
}

