export type SeatStatus = "ACTIVE" | "INACTIVE";

export type AisleOrientation = "VERTICAL" | "HORIZONTAL";

export interface SeatConfigData {
  id?: string;

  name: string;

  rows: number;

  cols: number;

  hasAisle: boolean;

  aisleDirection?: AisleOrientation;

  aisleAfterCol?: number | null;

  aisleAfterRow?: number | null;

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

  aisleType?: AisleOrientation;
  aisleDirection?: AisleOrientation;
  aislePosition?: number;

  hasAisle: boolean;

  aisleAfterCol?: number | null;

  aisleAfterRow?: number | null;

  status: "ACTIVE" | "INACTIVE";

  totalSeats?: number;

  createdAt?: string;

  updatedAt?: string;
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

  aisleDirection: AisleOrientation;

  aisleAfterCol: number | null;

  aisleAfterRow: number | null;

  status: "ACTIVE" | "INACTIVE";
}

export interface UpdateSeatPayload {
  name?: string;

  rows?: number;

  cols?: number;

  hasAisle?: boolean;

  aisleDirection?: AisleOrientation;

  aisleAfterCol?: number | null;

  aisleAfterRow?: number | null;

  status?: "ACTIVE" | "INACTIVE";
}
