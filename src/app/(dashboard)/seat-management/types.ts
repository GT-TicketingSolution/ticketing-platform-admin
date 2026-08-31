export type SeatStatus = "ACTIVE" | "INACTIVE" | "Active" | "Inactive";
export type AisleOrientation = "VERTICAL" | "HORIZONTAL";

export interface SeatConfigData {
  id?: string;
  name: string;
  rows: number;
  cols: number;
  hasAisle: boolean;
  aisleAfterCol: number; // Stored index (supports encoding for horizontal/vertical and start position 0)
  aisleType?: AisleOrientation;
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

/**
 * Encodes aisle direction and position into a single integer for database storage.
 * - Vertical position N (0..cols): stored as N (0 = before C1/starting point, 1 = after C1, etc.)
 * - Horizontal position N (0..rows): stored as -(N + 1) (0 = before R1/starting point as -1, after R1 as -2, etc.)
 */
export function encodeAisle(hasAisle: boolean, aisleType: AisleOrientation, aislePosition: number): number {
  if (!hasAisle) return 0;
  if (aisleType === "HORIZONTAL") {
    return -(Math.max(0, aislePosition) + 1);
  }
  return Math.max(0, aislePosition);
}

/**
 * Decodes aisle direction and position from the stored integer.
 */
export function decodeAisle(hasAisle: boolean, aisleAfterCol: number): {
  hasAisle: boolean;
  aisleType: AisleOrientation;
  aislePosition: number;
} {
  if (!hasAisle) {
    return { hasAisle: false, aisleType: "VERTICAL", aislePosition: 0 };
  }
  if (aisleAfterCol < 0) {
    return {
      hasAisle: true,
      aisleType: "HORIZONTAL",
      aislePosition: Math.abs(aisleAfterCol) - 1,
    };
  }
  return {
    hasAisle: true,
    aisleType: "VERTICAL",
    aislePosition: aisleAfterCol,
  };
}

