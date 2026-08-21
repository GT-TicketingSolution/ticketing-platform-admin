export type PaymentModeFilter = "All" | "ONLINE" | "CASH" | "UPI" | "CARD";

export interface InvoiceListItem {
  id: string;
  invoiceNumber: string;
  transactionId: string;
  customerName: string;
  bookingId: string;
  attraction: {
    id: string;
    name: string;
  };
  amount: number;
  paymentMode: string;
  status: string;
  invoiceDate: string;
}

export interface InvoiceDetail {
  id: string;
  invoiceNumber: string;
  transactionId: string;
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
  invoiceDate: string;
  payment: {
    mode: string;
    amount: number;
    status: string;
  };
  createdAt: string;
  updatedAt: string;
}
