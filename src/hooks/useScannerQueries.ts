import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getData, postData } from "@/lib/api/apiService";
import { AppUrl } from "@/lib/api/endpoints";
import { showSuccessNotify } from "@/lib/notify";
import { showErrorOnce } from "@/lib/api/axiosConfig";

export interface ScannerSummary {
  totalScans: number;
  allowedAdmitted: number;
  rejectedIssues: number;
}

export interface ScanItem {
  id: string;
  ticketId: string;
  visitorName: string;
  attraction: string;
  visitorsCount: number;
  verdict: "ALLOWED" | "DENIED" | string;
  reason: string | null;
  timestamp: string;
  scannedBy?: string;
}

export interface ScansResponse {
  scans: ScanItem[];
  pagination: {
    limit: number;
    count: number;
  };
  summary?: ScannerSummary;
}

export interface TicketBreakdown {
  category: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface ScannerTicketDetails {
  id: string;
  invoiceNumber: string;
  visitorName: string;
  mobileNumber: string;
  email: string;
  visitorType: "Individual" | "Family" | "Group" | "VIP" | string;
  attraction: string;
  zone: string;
  gate: string;
  timeSlot: string | null;
  visitDate: string | null;
  totalVisitors: number;
  breakdown: TicketBreakdown[];
  totalAmount: number;
  paymentMode: string;
  paymentStatus: "Paid" | "Pending" | "Refunded" | string;
  status: "valid" | "used" | "expired" | "future" | "cancelled" | "invalid";
  seats: string | null;
  bogie: string | null;
  specialNotes: string | null;
}

export interface TicketResponse {
  ticket: ScannerTicketDetails;
}

export interface AdmitResponse {
  admission: {
    ticketId: string;
    bookingId: string;
    visitorName: string;
    mobileNumber: string;
    attraction: {
      id: string;
      name: string;
    } | null;
    status: string;
    verdict: string;
    admittedAt: string;
    admittedBy: string;
  };
}

export interface RejectResponse {
  rejection: {
    ticketId: string;
    bookingId: string;
    visitorName: string;
    mobileNumber: string;
    attraction: {
      id: string;
      name: string;
    } | null;
    status: string;
    verdict: string;
    reason: string;
    rejectedAt: string;
    rejectedBy: string;
  };
}

export const scannerKeys = {
  all: ["scanner"] as const,
  scans: (limit = 20) => [...scannerKeys.all, "scans", limit] as const,
  ticket: (ticketId: string) => [...scannerKeys.all, "ticket", ticketId] as const,
};

/**
 * Fetch recent scans list and summary counters (GET /api/admin/ticketing-scanner/scans)
 */
export function useRecentScans(limit = 20) {
  return useQuery<ScansResponse>({
    queryKey: scannerKeys.scans(limit),
    queryFn: async () => {
      const res = await getData<any>(AppUrl.scanner.scans(limit));
      const payload = res?.data ?? res;
      const scans: ScanItem[] = Array.isArray(payload?.scans) ? payload.scans : [];
      const summary: ScannerSummary = payload?.summary || {
        totalScans: scans.length,
        allowedAdmitted: scans.filter((s) => s.verdict === "ALLOWED" || s.verdict === "Allowed").length,
        rejectedIssues: scans.filter((s) => s.verdict !== "ALLOWED" && s.verdict !== "Allowed").length,
      };

      return {
        scans,
        pagination: payload?.pagination || { limit, count: scans.length },
        summary,
      };
    },
    staleTime: 15 * 1000,
    refetchOnWindowFocus: true,
  });
}

/**
 * Fetch ticket details by ticket ID / barcode / QR code string
 */
export async function fetchTicketDetails(ticketId: string): Promise<ScannerTicketDetails> {
  const res = await getData<any>(AppUrl.scanner.getTicket(ticketId));
  const payload = res?.data ?? res;
  if (!payload?.ticket) {
    throw new Error("TICKET_NOT_FOUND");
  }
  return payload.ticket;
}

/**
 * Mutation to admit a valid ticket (POST /api/admin/ticketing-scanner/tickets/:ticketId/admit)
 */
export function useAdmitTicketMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ticketId: string) => {
      return postData<AdmitResponse, void>(AppUrl.scanner.admit(ticketId));
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: scannerKeys.all });
      showSuccessNotify(
        `Ticket ${data?.admission?.ticketId || ""} admitted successfully!`,
        "Visitor Admitted"
      );
    },
    onError: (error: any) => {
      const code = error?.response?.data?.code || error?.code;
      const messageMap: Record<string, string> = {
        TICKET_CANCELLED: "Cancelled ticket cannot be admitted.",
        TICKET_NOT_CONFIRMED: "Only confirmed tickets can be admitted.",
        TICKET_EXPIRED: "Ticket expired.",
        FUTURE_TICKET: "Ticket is not valid today.",
        PAYMENT_PENDING: "Payment is pending.",
        TICKET_ALREADY_USED: "Ticket has already been admitted.",
        TICKET_NOT_FOUND: "Ticket not found.",
      };

      const displayMessage =
        (code && messageMap[code]) ||
        error?.response?.data?.message ||
        error?.error?.message ||
        error?.message ||
        "Unable to admit ticket.";

      showErrorOnce(displayMessage, "Admission Failed");
    },
  });
}

/**
 * Mutation to reject a ticket (POST /api/admin/ticketing-scanner/tickets/:ticketId/reject)
 */
export function useRejectTicketMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ticketId, reason }: { ticketId: string; reason: string }) => {
      return postData<RejectResponse, { reason: string }>(
        AppUrl.scanner.reject(ticketId),
        { reason }
      );
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: scannerKeys.all });
      showSuccessNotify(
        `Entry rejected for ticket ${data?.rejection?.ticketId || ""}.`,
        "Entry Denied"
      );
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message ||
        error?.error?.message ||
        error?.message ||
        "Unable to record ticket rejection.";
      showErrorOnce(message, "Rejection Failed");
    },
  });
}
