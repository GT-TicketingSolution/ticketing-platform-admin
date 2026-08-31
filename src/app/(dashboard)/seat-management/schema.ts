import { z } from "zod";

export const MAX_SEAT_ROWS = Number(process.env.NEXT_PUBLIC_MAX_SEAT_ROWS || 100);
export const MAX_SEAT_COLS = Number(process.env.NEXT_PUBLIC_MAX_SEAT_COLS || 100);

export const seatLayoutSchema = z.object({
  name: z.string().trim().min(1, "Seat layout name is required"),
  rows: z.number().int().min(1, "Row count must be at least 1").max(MAX_SEAT_ROWS, `Maximum ${MAX_SEAT_ROWS} rows allowed`),
  cols: z.number().int().min(1, "Column count must be at least 1").max(MAX_SEAT_COLS, `Maximum ${MAX_SEAT_COLS} columns allowed`),
  hasAisle: z.boolean().default(false),
  aisleAfterCol: z.number().int().optional().default(0),
  aisleType: z.enum(["VERTICAL", "HORIZONTAL"]).optional().default("VERTICAL"),
  status: z.enum(["Active", "Inactive", "ACTIVE", "INACTIVE"]).default("Active"),
});

export type SeatLayoutFormData = z.infer<typeof seatLayoutSchema>;
