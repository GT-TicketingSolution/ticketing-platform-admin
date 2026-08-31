export type SeatStatus = "ACTIVE" | "INACTIVE" | "Active" | "Inactive";
export type AisleOrientation = "VERTICAL" | "HORIZONTAL";

export interface SeatConfigData {
  id?: string;
  name: string;
  rows: number;
  cols: number;
  hasAisle: boolean;
  aisleAfterCol: number; // Stored index (supports encoding for horizontal/vertical and start position 0)
  aisleAfterRow?: number;
  aisleType?: AisleOrientation;
  aisleDirection?: AisleOrientation;
  aislePosition?: number;
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
  aisleAfterRow?: number;
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
  rows?: number;
  cols?: number;
  hasAisle: boolean;
  aisleAfterCol?: number;
  aisleAfterRow?: number;
  aisleType?: AisleOrientation;
  aisleDirection?: AisleOrientation;
  aislePosition?: number;
  status: "ACTIVE" | "INACTIVE";
}

export interface UpdateSeatPayload {
  name?: string;
  rows?: number;
  cols?: number;
  hasAisle?: boolean;
  aisleAfterCol?: number;
  aisleAfterRow?: number;
  aisleType?: AisleOrientation;
  aisleDirection?: AisleOrientation;
  aislePosition?: number;
  status?: "ACTIVE" | "INACTIVE";
}

/**
 * Encodes aisle direction and position into a non-negative integer for database storage.
 * - aislePosition is always a non-negative integer (0, 1, 2...).
 */
export function encodeAisle(hasAisle: boolean, aisleType: AisleOrientation, aislePosition: number): number {
  if (!hasAisle) return 0;
  return Math.max(0, aislePosition);
}

/**
 * Decodes aisle direction and position.
 */
export function decodeAisle(
  hasAisle: boolean,
  aisleAfterCol: number,
  aisleType?: AisleOrientation,
  aislePosition?: number
): {
  hasAisle: boolean;
  aisleType: AisleOrientation;
  aislePosition: number;
} {
  if (!hasAisle) {
    return { hasAisle: false, aisleType: "VERTICAL", aislePosition: 0 };
  }
  const pos = aislePosition !== undefined ? Math.max(0, aislePosition) : Math.max(0, aisleAfterCol);
  const type = aisleType || (aisleAfterCol < 0 ? "HORIZONTAL" : "VERTICAL");
  return {
    hasAisle: true,
    aisleType: type,
    aislePosition: pos,
  };
}

