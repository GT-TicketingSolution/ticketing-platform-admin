import { z } from "zod";

export const editTransactionSchema = z.object({
  customerName: z.string().trim().min(2, "Customer name is required"),
  amount: z.number().min(0, "Amount must be greater than or equal to 0"),
  status: z.enum(["Confirmed", "Pending", "Cancelled"]),
  paymentMode: z.enum(["Cash", "UPI", "Card", "Net Banking"]),
});

export type EditTransactionFormData = z.infer<typeof editTransactionSchema>;
