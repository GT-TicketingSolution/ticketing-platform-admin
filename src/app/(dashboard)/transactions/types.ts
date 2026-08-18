export type TransactionStatus = "Confirmed" | "Pending" | "Cancelled";

export interface Transaction {
  id: string;
  customerName: string;
  dateTime: string;
  date?: string; // Format: "YYYY-MM-DD" for date range filtering
  bookingId: string;
  invoiceId: string;
  amount: number;
  paymentMode: "Cash" | "UPI" | "Card" | "Net Banking";
  status: TransactionStatus;
  attraction?: string;
  mobileNumber?: string;
  gstn?: string;
}
