export type TicketStatus = "valid" | "used" | "expired" | "future" | "cancelled" | "invalid";

export interface TicketBreakdown {
  category: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface ScannedTicketData {
  id: string; // e.g. TKT-9019
  invoiceNumber: string;
  visitorName: string;
  mobileNumber: string;
  email: string;
  visitorType: "Individual" | "Family" | "Group" | "VIP" | string;
  attraction: string;
  zone: string;
  gate: string;
  timeSlot: string | null;
  visitDate: string | null; // YYYY-MM-DD
  totalVisitors: number;
  breakdown: TicketBreakdown[];
  totalAmount: number;
  paymentMode: string;
  paymentStatus: "Paid" | "Pending" | "Refunded" | string;
  status: TicketStatus;
  scannedAt?: string;
  validatedBy?: string;
  seats?: string | null;
  bogie?: string | null;
  specialNotes?: string | null;
}

export interface ScanLogItem {
  id: string;
  ticketId: string;
  visitorName: string;
  attraction: string;
  visitorsCount: number;
  status?: TicketStatus;
  timestamp: string;
  verdict: "Allowed" | "Denied" | "ALLOWED" | "DENIED" | string;
  reason?: string | null;
}
