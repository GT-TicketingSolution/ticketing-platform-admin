export * from "@/app/(dashboard)/transactions/types";

export interface Transaction {
  id: string;
  transactionId?: string;
  invoiceId?: string;
  customerName: string;
  mobileNumber?: string;
  gstn?: string;
  transactionDate?: string;
  dateTime?: string;
  date?: string;
  bookingId: string;
  attraction: string | {
    id: string;
    name: string;
  };
  amount: number;
  paymentMode: string;
  status: string;
}
