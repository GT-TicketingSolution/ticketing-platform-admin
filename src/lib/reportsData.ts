import { Attraction } from "@/types/admin";
import { Booking } from "@/types/booking";
import { Transaction } from "@/types/transaction";

export interface TicketCategoryStat {
  category: "Adult" | "Child" | "Student" | "Senior" | "Foreigner";
  count: number;
  revenue: number;
  unitPrice: number;
}

export interface PaymentModeStat {
  mode: string;
  count: number;
  revenue: number;
}

export interface AttractionReportData {
  attraction: Attraction;
  totalRevenue: number;
  totalTicketsSold: number;
  totalBookings: number;
  avgOrderValue: number;
  categoryBreakdown: TicketCategoryStat[];
  paymentBreakdown: PaymentModeStat[];
  transactions: Transaction[];
  bookings: Booking[];
}

export interface OverallReportSummary {
  totalRevenue: number;
  totalTicketsSold: number;
  totalBookings: number;
  topAttractionName: string;
  topAttractionRevenue: number;
  avgOrderValue: number;
  attractionReports: AttractionReportData[];
}
