/**
 * TypeScript types for the Staff Reports API response.
 * Endpoint: GET /api/admin/reports?fromDate=...&fromTime=...&toDate=...&toTime=...
 */

export interface StaffReportAttraction {
  id: string;
  attraction_management_id: string;
  name: string;
  type: string;
}

export interface StaffReportCategory {
  name: string;
  no_of_tickets: number;
  base_price: string;
}

export interface StaffReportPaymentDistribution {
  payment_mode: string;
  count: number;
  total_amount: string;
}

export interface StaffReportAttractionBooking {
  attraction_management_id: string;
  category_of_attraction_against_booking: StaffReportCategory[];
  attraction_sub_total: string;
  attraction_gst_total: string;
  attraction_roundoff_total: string;
  attraction_round_off_gst_adj_total: string;
  attraction_grand_total: string;
  payment_distribution: StaffReportPaymentDistribution[];
}

export interface StaffReportTransaction {
  invoice_id: string;
  customer_name: string | null;
  date: string;
  time: string;
  payment_mode: string;
  amount: string;
  status: string;
}

export interface StaffReportAttractionTransactions {
  attraction_management_id: string;
  transactions: StaffReportTransaction[];
}

export interface StaffReportBookings {
  grand_total_amount: string;
  grand_total_booking: number;
  attraction_against_booking: StaffReportAttractionBooking[];
}

export interface StaffReportAPIResponse {
  attractions: StaffReportAttraction[];
  bookings: StaffReportBookings;
  transactions: StaffReportAttractionTransactions[];
}

export interface StaffReportResponse {
  success: boolean;
  data: StaffReportAPIResponse;
}

// Re-export for convenience
export type { StaffReportAPIResponse as StaffReportData };
