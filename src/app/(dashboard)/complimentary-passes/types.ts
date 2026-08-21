// ─── Complimentary Pass Entity ───────────────────────────────────────────────
export interface ComplimentaryPass {
  id: string;
  passId?: string;
  visitorName: string;
  mobile: string;
  attractionId: string;
  attractionName?: string;
  visitors: number;
  referenceId: string;
  referenceName?: string;
  visitDate: string;
  status: "ACTIVE" | "USED" | "EXPIRED" | string;
  deletedAt?: string | null;
  deletedBy?: string | null;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;

  // Legacy compat aliases if referenced
  attraction?: string;
  reference?: string;
  date?: string;
}

export interface ComplimentaryPassPayload {
  visitorName: string;
  mobile: string;
  attractionId: string;
  visitors: number;
  referenceId: string;
  visitDate: string;
  status?: "ACTIVE" | "USED" | "EXPIRED";
}

export interface ComplimentaryPassListParams {
  page?: number;
  limit?: number;
  search?: string;
  attractionId?: string;
  fromDate?: string;
  toDate?: string;
  status?: string;
}

export interface ComplimentaryPassListResponse {
  items: ComplimentaryPass[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage?: boolean;
  };
}

// ─── Reference Entity ─────────────────────────────────────────────────────────
export interface Reference {
  id: string;
  referenceName: string;
  department: string;
  contactPerson: string;
  post?: string | null;
  mobile: string;
  status: "ACTIVE" | "INACTIVE" | string;
  adminId?: string;
  deletedAt?: string | null;
  deletedBy?: string | null;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ReferencePayload {
  referenceName: string;
  department: string;
  contactPerson: string;
  post?: string;
  mobile: string;
  status?: "ACTIVE" | "INACTIVE";
}

export interface ReferenceListParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface ReferenceListResponse {
  items: Reference[];
  pagination: {
    page: number;
    limit: number;
    total?: number;
    totalPages?: number;
    hasNextPage?: boolean;
  };
}

// Shared fallback list for dropdowns if needed
export const ATTRACTIONS = [
  "All Attractions",
  "Toy Train",
  "Ropeway",
  "Wax Museum",
  "Biological Park",
  "Sheesh Mahal",
  "Fort Entry",
];
