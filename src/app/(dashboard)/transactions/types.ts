export type TransactionStatus = "SUCCESS" | "FAILED" | "PENDING" | "CONFIRMED" | "CANCELLED";

export interface TransactionListItem {
  id: string;
  transactionId: string;
  customerName: string;
  transactionDate: string;
  bookingId: string;
  attraction: {
    id: string;
    name: string;
  };
  amount: number;
  paymentMode: string;
  status: string;
}

export interface TransactionDetail {
  id: string;
  transactionId: string;
  invoiceNumber: string;
  booking: {
    id: string;
    bookingId: string;
  };
  customer: {
    name: string;
    mobile: string;
    gstNumber?: string | null;
  };
  attraction: {
    id: string;
    name: string;
  };
  transactionDate: string;
  payment: {
    mode: string;
    amount: number;
    status: string;
  };
  createdAt: string;
  updatedAt: string;
}
