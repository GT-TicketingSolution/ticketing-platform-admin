import { z } from "zod";

export const ticketBookingSchema = z.object({
  customerName: z.string().trim().min(2, "Customer name is required"),
  customerMobile: z
    .string()
    .trim()
    .regex(/^[0-9+\s-]{10,15}$/, "Valid mobile number is required"),
  customerEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  attractionId: z.string().min(1, "Attraction is required"),
  visitDate: z.string().min(1, "Visit date is required"),
  paymentMode: z.enum(["Cash", "UPI", "Card", "Net Banking"]),
});

export type TicketBookingSchemaData = z.infer<typeof ticketBookingSchema>;
