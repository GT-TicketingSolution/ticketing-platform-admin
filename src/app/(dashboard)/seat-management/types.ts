export interface SeatConfigData {
  id?: string;
  name: string;
  rows: number;
  cols: number;
  hasAisle: boolean;
  aisleAfterCol: number; // 1-based index: aisle is placed after this column (1 .. cols - 1)
  status: "Active" | "Inactive";
}

export interface SeatLayoutSummary {
  id: string;
  name: string;
  totalSeats: number;
  rows: number;
  cols: number;
  hasAisle: boolean;
  status: "Active" | "Inactive";
  createdAt?: string;
}
