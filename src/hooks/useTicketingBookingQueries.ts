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
  duration?: number | string | null;
  durationUnit?: string | null;
}

export interface TicketingCustomer {
  id: string;
  name: string;
  mobile: string;
  address?: string | null;
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
  address?: string | null;
  gstn?: string | null;
}

// ── Query Keys ────────────────────────────────────────────────────────────────

export const ticketingBookingKeys = {
  all: ["ticketing-booking"] as const,
  attractions: () => [...ticketingBookingKeys.all, "attractions"] as const,
  customers: (search: string) => [...ticketingBookingKeys.all, "customers", search] as const,
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
      const items = payload?.items ?? payload?.attractions ?? (Array.isArray(payload) ? payload : []);
      return items.map((item: any): TicketingAttraction => ({
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
        duration: item.duration ?? null,
        durationUnit: item.durationUnit ?? null,
      }));
    },
    staleTime: 60 * 1000,
  });
}

/**
 * Search existing customers by name, mobile, or GSTN.
 * GET /api/admin/ticketing-booking/customers?search=
 */
export function useTicketingCustomers(search: string, enabled = true) {
  return useQuery<TicketingCustomer[]>({
    queryKey: ticketingBookingKeys.customers(search),
    queryFn: async () => {
      const sp = new URLSearchParams({ search });
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

// ── Attraction Trip Number Types & Hook ─────────────────────────────────────

export interface AttractionTripNoItem {
  attractionId: string;
  currentTripNo: number;
}

export interface AttractionTripNoRequest {
  attractions: AttractionTripNoItem[];
}

export interface AttractionTripNoResponseItem {
  attractionId: string;
  currentTripNo: number;
  newTripNo: number;
}

export interface AttractionTripNoResponse {
  success: boolean;
  data: AttractionTripNoResponseItem[];
}

/**
 * Fetch attraction trip numbers.
 * POST /api/admin/ticketing-booking/get-attraction-trip-no
 */
export function useAttractionTripNo(
  attractions: AttractionTripNoItem[],
  enabled = true
) {
  return useQuery<AttractionTripNoResponseItem[]>({
    queryKey: [...ticketingBookingKeys.all, "trip-no", attractions],
    queryFn: async () => {
      const res = await postData<any, AttractionTripNoRequest>(
        AppUrl.ticketingBooking.getAttractionTripNo,
        { attractions }
      );
      const payload = res?.data ?? res;
      return Array.isArray(payload) ? payload : [];
    },
    enabled: enabled && attractions.length > 0 && attractions.every((a) => !!a.attractionId),
    staleTime: 10 * 1000,
    refetchOnWindowFocus: true,
  });
}

// ── Attraction Seat Availability Types & Hook ────────────────────────────────

export interface AttractionSeatAvailabilityItem {
  attractionId: string;
  currentTripNo: number;
}

export interface AttractionSeatAvailabilityRequest {
  attractions: AttractionSeatAvailabilityItem[];
}

export interface AttractionSeatItem {
  attractionSeatId: string;
  name: string;
  seatOrder: number;
  bookedSeats?: number[];
}

export interface AttractionSeatLayout {
  seatLayoutId: string;
  name: string;
  rows: number;
  cols: number;
  hasAisle: boolean;
  aisleAfterCol: number | null;
  aisleAfterRow: number | null;
  seats?: AttractionSeatItem[];
}

export interface AttractionSeatAvailabilityData {
  attractionId: string;
  currentTripNo: number;
  seats?: AttractionSeatItem[];
  seatLayout: AttractionSeatLayout;
  bookedSeats?: number[];
}

export interface AttractionSeatAvailabilityResponse {
  success: boolean;
  data: AttractionSeatAvailabilityData[];
}

/**
 * Fetch seat availability for attraction(s) and trip number.
 * POST /api/admin/ticketing-booking/attraction-seat-availability
 */
export function useAttractionSeatAvailability(
  attractions: AttractionSeatAvailabilityItem[],
  enabled = true
) {
  return useQuery<AttractionSeatAvailabilityData[]>({
    queryKey: [...ticketingBookingKeys.all, "seat-availability", attractions],
    queryFn: async () => {
      const res = await postData<any, AttractionSeatAvailabilityRequest>(
        AppUrl.ticketingBooking.attractionSeatAvailability,
        { attractions }
      );
      const payload = res?.data ?? res;
      return Array.isArray(payload) ? payload : [];
    },
    enabled: enabled && attractions.length > 0 && attractions.every((a) => !!a.attractionId),
    staleTime: 10 * 1000,
    refetchOnWindowFocus: true,
  });
}

// ── Attraction Seat Booking Types & Mutation 

export interface AttractionSeatBookingItem {
  attractionId: string;
  tripNo: number;
  attractionSeatId: string;
  seatNo: number[];
}

export interface AttractionSeatBookingRequest {
  bookings: AttractionSeatBookingItem[];
}

export interface AttractionSeatBookingResponse {
  success: boolean;
  data: {
    message: string;
  };
}

/**
 * Create attraction seat booking history.
 * POST /api/admin/ticketing-booking/attraction-seat-booking
 */
export function useCreateAttractionSeatBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AttractionSeatBookingRequest) =>
      postData<AttractionSeatBookingResponse, AttractionSeatBookingRequest>(
        AppUrl.ticketingBooking.attractionSeatBooking,
        payload
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ticketingBookingKeys.all });
    },
    onError: (err: any) => {
      showErrorOnce(err?.error?.message || err?.message || "Failed to create seat booking.");
    },
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
