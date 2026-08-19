// ─── Staff Entity matching API response 

export type StaffStatus =
  | "ACTIVE"
  | "DISABLED"
  | "SUSPENDED"
  | "Active"
  | "Inactive"
  | "Disabled";

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
  status?: "ACTIVE" | "DISABLED" | "SUSPENDED";
  attractionId?: string;
}

export interface CreateStaffPayload {
  name: string;
  email: string;
  phone: string;
  password?: string;
  roles: string[];
  attractionIds: string[];
  status: "ACTIVE" | "DISABLED" | "SUSPENDED";
}

export interface UpdateStaffPayload {
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
  roles?: string[];
  attractionIds?: string[];
  status?: "ACTIVE" | "DISABLED" | "SUSPENDED";
}

