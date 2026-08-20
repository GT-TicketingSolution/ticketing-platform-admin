export type SeatStatus = "ACTIVE" | "INACTIVE" | "Active" | "Inactive";

export interface SeatConfigData {
  id?: string;
  name: string;
  rows: number;
  cols: number;
  hasAisle: boolean;
  aisleAfterCol: number; // 1-based index: aisle is placed after this column (1 .. cols - 1)
  status: SeatStatus;
  totalSeats?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SeatLayoutItem {
  id: string;
  name: string;
  rows: number;
  cols: number;
  hasAisle: boolean;
  aisleAfterCol: number;
  status: "ACTIVE" | "INACTIVE";
  totalSeats?: number;
  createdAt?: string;
}

export interface SeatLayoutPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface SeatLayoutListResponse {
  items: SeatLayoutItem[];
  pagination: SeatLayoutPagination;
}

export interface SeatQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: "ACTIVE" | "INACTIVE";
}

export interface CreateSeatPayload {
  name: string;
  rows: number;
  cols: number;
  hasAisle: boolean;
  aisleAfterCol: number;
  status: "ACTIVE" | "INACTIVE";
}

export interface UpdateSeatPayload {
  name?: string;
  rows?: number;
  cols?: number;
  hasAisle?: boolean;
  aisleAfterCol?: number;
  status?: "ACTIVE" | "INACTIVE";
}

