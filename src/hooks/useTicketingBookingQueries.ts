"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getData, postData } from "@/lib/api/apiService";
import { AppUrl } from "@/lib/api/endpoints";
import { showSuccessNotify } from "@/lib/notify";
import { showErrorOnce } from "@/lib/api/axiosConfig";

// ── Types 

export interface TicketingAttraction {
  id: string;
  name: string;
  category: string;
  status: string;
  image: string | null;
  pricing: {
    adult: number;
    child: number;
    student: number;
    senior: number;
    foreigner: number;
  };
  hasSeating: boolean;
  seatLayoutId: string | null;
}

export interface TicketingCustomer {
  id: string;
  name: string;
  mobile: string;
  gstn: string | null;
  createdAt?: string;
}

export interface TicketingSlot {
  id: string;
  slotTime: string;
  isActive: boolean;
  capacity: number | null;
  booked: number;
  available: number;
}

export interface TicketingSeat {
  id: string;
  row?: number;
  column?: number;
  bogie?: string | null;
  seatNumber: string;
  status: "available" | "occupied";
}

export interface TicketingBookingItem {
  attractionId: string;
  category: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface TicketingBookingSeat {
  slotId: string;
  visitDate: string;
  bogie?: string | null;
  seatNumber: string;
}

export interface CreateTicketingBookingPayload {
  customer: {
    id?: string | null;
    name: string;
    mobile: string;
    gstn?: string | null;
  };
  attractionId: string;
  visitAt: string;
  items: TicketingBookingItem[];
  seats?: TicketingBookingSeat[];
  subtotal: number;
  gstAmount: number;
  gstAdjustment: number;
  roundOff: number;
  discountAmount: number;
  totalAmount: number;
}

export interface CreateTicketingBookingResponse {
  booking: {
    id: string;
    bookingNumber: string;
    status: string;
    customerId: string;
    attractionId: string;
    attractionName: string;
    visitAt: string;
    totalAmount: number;
    amountPaid: number;
    seats?: TicketingBookingSeat[];
  };
  paymentRequired: boolean;
}

export interface TicketingPaymentPayload {
  amountPaid: number;
  payment: {
    mode: "CASH" | "UPI" | "CARD" | "ONLINE";
  };
}

export interface TicketingPaymentResponse {
  booking: {
    id: string;
    bookingNumber: string;
    totalAmount: string;
    amountPaid: string;
    status: string;
  };
  transaction: {
    id: string;
    transactionNumber: string;
    amount: string;
    paymentMode: string;
    status: string;
    createdAt: string;
  };
  payment: {
    amountPaid: number;
    paymentMode: string;
    remainingAmount: number;
  };
}

export interface TicketingConfirmResponse {
  message?: string;
  booking: {
    id: string;
    bookingNumber: string;
    attractionId?: string;
    status: string;
    customerName?: string | null;
    mobileNumber?: string | null;
    visitAt?: string;
    totalAmount?: string | number;
    amountPaid?: string | number;
    paymentMode?: string;
    paymentExpiresAt?: string;
    createdAt?: string;
    updatedAt?: string;
    [key: string]: unknown;
  };
  qrCodes?: Array<{
    attractionId?: string;
    qrCode: string;
    [key: string]: unknown;
  }>;
}

export interface TicketingCancelResponse {
  message: string;
  booking: {
    id: string;
    bookingNumber: string;
    status: string;
    [key: string]: unknown;
  };
}

export interface CreateTicketingCustomerPayload {
  name: string;
  mobile: string;
  gstn?: string | null;
}

// ── Query Keys ────────────────────────────────────────────────────────────────

export const ticketingBookingKeys = {
  all: ["ticketing-booking"] as const,
  attractions: () => [...ticketingBookingKeys.all, "attractions"] as const,
  customers: (search: string) => [...ticketingBookingKeys.all, "customers", search] as const,
  slots: (attractionId: string, date: string) =>
    [...ticketingBookingKeys.all, "slots", attractionId, date] as const,
  seats: (attractionId: string, slotId: string, date: string) =>
    [...ticketingBookingKeys.all, "seats", attractionId, slotId, date] as const,
};

// ── Queries ───────────────────────────────────────────────────────────────────

/**
 * Fetch attractions accessible to the current user for ticket booking.
 * GET /api/admin/ticketing-booking/attractions
 */
export function useTicketingAttractions() {
  return useQuery<TicketingAttraction[]>({
    queryKey: ticketingBookingKeys.attractions(),
    queryFn: async () => {
      const res = await getData<any>(AppUrl.ticketingBooking.attractions);
      const payload = res?.data ?? res;
      const items = payload?.items ?? (Array.isArray(payload) ? payload : []);
      return items.map((item: any) => ({
        id: item.id,
        name: item.name,
        category: item.category ?? item.type ?? "-",
        status: item.status ?? "ACTIVE",
        image: item.image ?? null,
        pricing: {
          adult: Number(item.pricing?.adult ?? item.adultPrice ?? 0),
          child: Number(item.pricing?.child ?? item.childPrice ?? 0),
          student: Number(item.pricing?.student ?? item.studentPrice ?? 0),
          senior: Number(item.pricing?.senior ?? item.seniorPrice ?? 0),
          foreigner: Number(item.pricing?.foreigner ?? item.foreignerPrice ?? 0),
        },
        hasSeating: item.hasSeating ?? false,
        seatLayoutId: item.seatLayoutId ?? null,
      })) as TicketingAttraction[];
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

/**
 * Search customers for the ticket booking customer selection.
 * GET /api/admin/ticketing-booking/customers?search=&limit=20
 */
export function useTicketingCustomers(search: string, enabled = true) {
  return useQuery<TicketingCustomer[]>({
    queryKey: ticketingBookingKeys.customers(search),
    queryFn: async () => {
      const sp = new URLSearchParams();
      if (search.trim()) sp.set("search", search.trim());
      sp.set("limit", "20");
      const res = await getData<any>(`${AppUrl.ticketingBooking.customers}?${sp.toString()}`);
      const payload = res?.data ?? res;
      const items = payload?.items ?? (Array.isArray(payload) ? payload : []);
      return items.map((c: any): TicketingCustomer => ({
        id: c.id,
        name: c.name,
        mobile: c.mobile,
        gstn: c.gstn ?? null,
        createdAt: c.createdAt,
      }));
    },
    enabled: enabled && search.trim().length >= 1,
    staleTime: 15 * 1000,
  });
}

/**
 * Fetch time slots for an attraction on a given date.
 * GET /api/admin/ticketing-booking/slots?attractionId=&date=
 */
export function useTicketingSlots(attractionId: string, date: string, enabled = true) {
  return useQuery<TicketingSlot[]>({
    queryKey: ticketingBookingKeys.slots(attractionId, date),
    queryFn: async () => {
      const sp = new URLSearchParams({ attractionId, date });
      const res = await getData<any>(`${AppUrl.ticketingBooking.slots}?${sp.toString()}`);
      const payload = res?.data ?? res;
      const items = payload?.items ?? payload?.slots ?? (Array.isArray(payload) ? payload : []);
      return items.map((s: any): TicketingSlot => ({
        id: s.id,
        slotTime: s.displayTime ?? s.slotTime ?? s.startTime ?? "10:00 AM – 10:20 AM",
        isActive: s.isActive ?? true,
        capacity: s.capacity != null ? Number(s.capacity) : null,
        booked: Number(s.booked ?? 0),
        available: Number(s.available ?? (s.capacity != null ? Math.max(0, Number(s.capacity) - Number(s.booked ?? 0)) : 0)),
      }));
    },
    enabled: enabled && !!attractionId && !!date,
    staleTime: 30 * 1000,
  });
}

export interface TicketingSeatsResponse {
  attractionId: string;
  slotId: string;
  date: string;
  hasSeating: boolean;
  layout?: {
    id: string;
    name: string;
    rows: number;
    cols: number;
    hasAisle?: boolean;
    aisleAfterCol?: number;
  } | null;
  totalSeats?: number;
  occupiedCount?: number;
  availableSeats?: number;
  occupiedSeats?: any[];
  sections: Array<{
    name: string;
    bogie: string | null;
    totalSeats: number;
    occupiedSeats: any[];
    availableSeats: number;
    seats?: TicketingSeat[];
  }>;
  seats: TicketingSeat[];
}

// ── Mock Ticketing Seats Generator ───────────────────────────────────────────
function generateMockTicketingSeats(
  attractionId: string,
  slotId: string,
  date: string
): TicketingSeatsResponse {
  const sectionsData = [
    {
      name: "Section A (Coach A)",
      bogie: "Coach A",
      rows: 6,
      cols: 4,
      hasAisle: true,
      aisleAfterCol: 2,
      occupiedSeatNumbers: ["A3", "B2", "D4"],
    },
    {
      name: "Section B (Coach B)",
      bogie: "Coach B",
      rows: 6,
      cols: 4,
      hasAisle: true,
      aisleAfterCol: 2,
      occupiedSeatNumbers: ["A1", "C2", "E3"],
    },
    {
      name: "Section C (VIP Lounge)",
      bogie: "VIP Lounge",
      rows: 4,
      cols: 3,
      hasAisle: false,
      aisleAfterCol: 0,
      occupiedSeatNumbers: ["B1"],
    },
  ];

  const sections = sectionsData.map((sec) => {
    const seats: TicketingSeat[] = [];
    for (let r = 1; r <= sec.rows; r++) {
      for (let c = 1; c <= sec.cols; c++) {
        const rowLetter = String.fromCharCode(64 + r);
        const seatNum = `${rowLetter}${c}`;
        const isOcc = sec.occupiedSeatNumbers.includes(seatNum);
        seats.push({
          id: `${sec.name}-${r}-${c}`,
          row: r,
          column: c,
          bogie: sec.bogie,
          seatNumber: seatNum,
          status: isOcc ? "occupied" : "available",
        });
      }
    }
    const occupiedSeats = seats.filter((s) => s.status === "occupied");
    const totalSeats = seats.length;
    const availableSeats = totalSeats - occupiedSeats.length;

    return {
      name: sec.name,
      bogie: sec.bogie,
      totalSeats,
      occupiedSeats,
      availableSeats,
      seats,
    };
  });

  const allSeats = sections[0].seats;
  const totalSeats = sections.reduce((sum, s) => sum + s.totalSeats, 0);
  const occupiedCount = sections.reduce((sum, s) => sum + s.occupiedSeats.length, 0);
  const availableSeats = totalSeats - occupiedCount;

  return {
    attractionId: attractionId || "mock-attr-1",
    slotId: slotId || "mock-slot-1",
    date: date || new Date().toISOString().slice(0, 10),
    hasSeating: true,
    layout: {
      id: "layout-section-a",
      name: "Standard Coach (6x4)",
      rows: 6,
      cols: 4,
      hasAisle: true,
      aisleAfterCol: 2,
    },
    totalSeats,
    occupiedCount,
    availableSeats,
    occupiedSeats: sections[0].occupiedSeats,
    sections,
    seats: allSeats,
  };
}

/**
 * Fetch seat availability for an attraction slot on a given date (Mock Implementation).
 */
export function useTicketingSeats(
  attractionId: string,
  slotId: string,
  date: string,
  enabled = true
) {
  return useQuery<TicketingSeatsResponse>({
    queryKey: ticketingBookingKeys.seats(attractionId, slotId, date),
    queryFn: async () => {
      // Simulate slight network tick
      await new Promise((resolve) => setTimeout(resolve, 60));
      return generateMockTicketingSeats(attractionId, slotId, date);
    },
    enabled: enabled && (!!attractionId || true),
    staleTime: 30 * 1000,
  });
}

// ── Mutations 

/**
 * Create a new customer (inline, from ticket booking flow).
 * POST /api/admin/ticketing-booking/customers
 */
export function useCreateTicketingCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTicketingCustomerPayload) =>
      postData<any, CreateTicketingCustomerPayload>(
        AppUrl.ticketingBooking.customers,
        payload
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ticketingBookingKeys.all });
      showSuccessNotify("Customer created successfully.");
    },
    onError: (err: any) => {
      showErrorOnce(err?.error?.message || err?.message || "Failed to create customer.");
    },
  });
}

/**
 * Create a new PENDING ticketing booking.
 * POST /api/admin/ticketing-booking
 */
export function useCreateTicketingBooking() {
  return useMutation({
    mutationFn: (payload: CreateTicketingBookingPayload) =>
      postData<CreateTicketingBookingResponse, CreateTicketingBookingPayload>(
        AppUrl.ticketingBooking.create,
        payload
      ),
    onError: (err: any) => {
      showErrorOnce(err?.error?.message || err?.message || "Failed to create booking.");
    },
  });
}

/**
 * Process payment for a PENDING booking.
 * POST /api/admin/ticketing-booking/:bookingId/payment
 */
export function useTicketingPayment() {
  return useMutation({
    mutationFn: ({ bookingId, payload }: { bookingId: string; payload: TicketingPaymentPayload }) =>
      postData<TicketingPaymentResponse, TicketingPaymentPayload>(
        AppUrl.ticketingBooking.payment(bookingId),
        payload
      ),
    onError: (err: any) => {
      showErrorOnce(err?.error?.message || err?.message || "Failed to process payment.");
    },
  });
}

/**
 * Confirm a fully paid booking.
 * POST /api/admin/ticketing-booking/:bookingId/confirm
 */
export function useConfirmTicketingBooking() {
  return useMutation({
    mutationFn: (bookingId: string) =>
      postData<TicketingConfirmResponse>(
        AppUrl.ticketingBooking.confirm(bookingId)
      ),
    onSuccess: () => {
      showSuccessNotify("Booking confirmed successfully.");
    },
    onError: (err: any) => {
      showErrorOnce(err?.error?.message || err?.message || "Failed to confirm booking.");
    },
  });
}

/**
 * Cancel a PENDING booking (releases all reserved seats).
 * POST /api/admin/ticketing-booking/:bookingId/cancel
 */
export function useCancelTicketingBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bookingId: string) =>
      postData<TicketingCancelResponse, {}>(
        AppUrl.ticketingBooking.cancel(bookingId),
        {}
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ticketingBookingKeys.all });
      showSuccessNotify("Booking cancelled successfully.");
    },
    onError: (err: any) => {
      showErrorOnce(err?.error?.message || err?.message || "Failed to cancel booking.");
    },
  });
}
