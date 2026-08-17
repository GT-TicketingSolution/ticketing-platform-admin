import { z } from "zod";

export const invoiceFilterSchema = z.object({
  searchQuery: z.string().optional(),
  paymentMode: z.enum(["All", "Cash", "UPI", "Card"]).optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
});

export type InvoiceFilterFormData = z.infer<typeof invoiceFilterSchema>;
