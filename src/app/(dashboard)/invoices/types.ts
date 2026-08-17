import { Transaction } from "@/app/(dashboard)/transactions/types";

export type PaymentModeFilter = "All" | "Cash" | "UPI" | "Card";

export interface InvoiceItem extends Transaction {
  invoiceNumber?: string;
  taxAmount?: number;
  subtotal?: number;
}
