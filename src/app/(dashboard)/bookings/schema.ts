import { z } from "zod";

export const editBookingSchema = z.object({
  customerName: z.string().trim().min(2, "Customer name is required"),
  mobileNumber: z
    .string()
    .trim()
    .regex(/^[0-9+\s-]{10,15}$/, "Enter a valid mobile number"),
  attraction: z.string().min(1, "Attraction is required"),
  visitDate: z.string().min(1, "Visit date is required"),
  status: z.enum(["Confirmed", "Pending", "Cancelled"]),
  paymentMode: z.enum(["Cash", "UPI", "Credit Card", "Debit Card", "Net Banking"]),
});

export type EditBookingFormData = z.infer<typeof editBookingSchema>;
