import { z } from "zod";

export const seatLayoutSchema = z.object({
  name: z.string().trim().min(2, "Seat layout name is required"),
  rows: z.number().int().min(1, "At least 1 row is required").max(100),
  cols: z.number().int().min(1, "At least 1 column is required").max(50),
  hasAisle: z.boolean(),
  aisleAfterCol: z.number().int().min(0),
  status: z.enum(["Active", "Inactive"]),
});

export type SeatLayoutFormData = z.infer<typeof seatLayoutSchema>;
