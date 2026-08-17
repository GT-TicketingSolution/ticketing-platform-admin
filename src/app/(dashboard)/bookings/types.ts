export type BookingStatus = "Confirmed" | "Cancelled" | "Pending";

export interface TicketSummaryItem {
  category: "Adult" | "Child" | "Student" | "Senior" | "Foreigner";
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Booking {
  id: string; // e.g. BK-2026-1001
  customerName: string;
  mobileNumber: string;
  gstn?: string;
  dateTime: string; // e.g. 08 Jul 2026, 09:15 AM
  visitDate: string; // e.g. 2026-07-08
  attraction: string;
  visitors: string; // e.g. "2 Adults", "2 Adults + 1 Child"
  totalVisitors: number;
  amount: number;
  amountPaid: number;
  status: BookingStatus;
  paymentMode: "Cash" | "UPI" | "Credit Card" | "Debit Card" | "Net Banking";
  bogie?: string;
  seats?: string;
  ticketSummary: TicketSummaryItem[];
  createdAt: string;
}
