// Booking types — re-exported from hooks for backward compatibility
export type { BookingListItem, BookingDetailItem, BookingAttractionItem, BookingListParams, BookingListResponse, UpdateBookingPayload } from "@/hooks/useBookingQueries";

// Legacy status type
export type BookingStatus = "PENDING" | "CONFIRMED" | "CANCELLED";

// Legacy TicketSummaryItem (used by printUtils and older components)
export interface TicketSummaryItem {
  category: "Adult" | "Child" | "Student" | "Senior" | "Foreigner";
  quantity: number;
  unitPrice: number;
  total: number;
}

// Legacy Booking type kept for printUtils, mockBookings, reportsData, transactions
export interface Booking {
  id: string;
  customerName: string;
  mobileNumber: string;
  gstn?: string;
  dateTime: string;
  visitDate: string;
  attraction: string;
  visitors: string;
  totalVisitors: number;
  amount: number;
  amountPaid: number;
  status: "Confirmed" | "Cancelled" | "Pending";
  paymentMode: "Cash" | "UPI" | "Credit Card" | "Debit Card" | "Net Banking";
  bogie?: string;
  seats?: string;
  ticketSummary: TicketSummaryItem[];
  createdAt: string;
}
