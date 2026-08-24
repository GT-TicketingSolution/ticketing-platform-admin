import { NextRequest } from "next/server";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";

import {
  bookings,
  bookingItems,
  bookingSeats,
  attractions,
  attractionManagement,
} from "@/db/schema";

import { requireAuth } from "@/lib/auth/require-auth";

import {
  requireModuleAccess,
  requireAttractionAccess,
  getAdminId,
} from "@/lib/auth/authorization";

import { success, failure } from "@/lib/api/response";

interface RouteContext {
  params: Promise<{
    ticketId: string;
  }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    // ---------------------------------------------
    // AUTH
    // ---------------------------------------------

    const auth = await requireAuth(request);

    await requireModuleAccess(auth, "SCANNER");

    const adminId = getAdminId(auth);

    // ---------------------------------------------
    // PARAMS
    // ---------------------------------------------

    const { ticketId } = await context.params;

    if (!ticketId?.trim()) {
      return failure("Ticket ID is required.", 400, "TICKET_ID_REQUIRED");
    }

    const normalizedTicketId = ticketId.trim();

    // ---------------------------------------------
    // FETCH BOOKING
    // ---------------------------------------------

    const [booking] = await db
      .select({
        id: bookings.id,
        bookingNumber: bookings.bookingNumber,

        customerName: bookings.customerName,
        mobileNumber: bookings.mobileNumber,
        gstNumber: bookings.gstNumber,

        attractionId: bookings.attractionId,

        visitAt: bookings.visitAt,

        paymentMode: bookings.paymentMode,
        status: bookings.status,

        totalAmount: bookings.totalAmount,
        amountPaid: bookings.amountPaid,

        createdAt: bookings.createdAt,
      })
      .from(bookings)
      .innerJoin(attractions, eq(attractions.id, bookings.attractionId))
      .where(
        and(
          eq(bookings.bookingNumber, normalizedTicketId),
          eq(attractions.adminId, adminId),
        ),
      )
      .limit(1);

    if (!booking) {
      return failure("Ticket not found.", 404, "TICKET_NOT_FOUND");
    }

    // ---------------------------------------------
    // ATTRACTION ACCESS
    // ---------------------------------------------

    try {
      await requireAttractionAccess(auth, booking.attractionId);
    } catch (error) {
      if (error instanceof Error && error.message === "FORBIDDEN") {
        return failure(
          "Ticket not found or access denied.",
          404,
          "TICKET_NOT_FOUND",
        );
      }

      throw error;
    }

    // ---------------------------------------------
    // FETCH ATTRACTION
    // ---------------------------------------------

    const [attraction] = await db
      .select({
        id: attractions.id,
        name: attractions.name,
        category: attractions.type,

        image: attractionManagement.image,

        description: attractionManagement.description,

        timing: attractionManagement.timing,

        hasSeating: attractionManagement.hasSeating,
      })
      .from(attractions)
      .innerJoin(
        attractionManagement,
        eq(attractionManagement.attractionId, attractions.id),
      )
      .where(
        and(
          eq(attractions.id, booking.attractionId),
          eq(attractions.adminId, adminId),
          eq(attractionManagement.adminId, adminId),
        ),
      )
      .limit(1);

    if (!attraction) {
      return failure(
        "Attraction associated with this ticket was not found.",
        404,
        "ATTRACTION_NOT_FOUND",
      );
    }

    // ---------------------------------------------
    // FETCH BOOKING ITEMS
    // ---------------------------------------------

    const items = await db
      .select({
        category: bookingItems.category,
        quantity: bookingItems.quantity,
        unitPrice: bookingItems.unitPrice,
        totalPrice: bookingItems.totalPrice,
      })
      .from(bookingItems)
      .where(eq(bookingItems.bookingId, booking.id));

    // ---------------------------------------------
    // FETCH SEATS
    // ---------------------------------------------

    const seats = await db
      .select({
        slotId: bookingSeats.slotId,
        visitDate: bookingSeats.visitDate,
        bogie: bookingSeats.bogie,
        seatNumber: bookingSeats.seatNumber,
      })
      .from(bookingSeats)
      .where(eq(bookingSeats.bookingId, booking.id));

    // ---------------------------------------------
    // VISITOR COUNT
    // ---------------------------------------------

    const totalVisitors = items.reduce(
      (total, item) => total + Number(item.quantity),
      0,
    );

    // ---------------------------------------------
    // VISIT DATE / TIME
    // ---------------------------------------------

    const visitDate = booking.visitAt
      ? booking.visitAt.toISOString().slice(0, 10)
      : null;

    const timeSlot = booking.visitAt
      ? booking.visitAt.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : null;

    // ---------------------------------------------
    // PAYMENT STATUS
    // ---------------------------------------------

    const paymentStatus =
      Number(booking.amountPaid ?? 0) >= Number(booking.totalAmount ?? 0)
        ? "Paid"
        : Number(booking.amountPaid ?? 0) > 0
          ? "Pending"
          : "Pending";

    // ---------------------------------------------
    // TICKET STATUS
    // ---------------------------------------------

    let ticketStatus:
      | "valid"
      | "used"
      | "expired"
      | "future"
      | "cancelled"
      | "invalid" = "valid";

    if (booking.status === "CANCELLED") {
      ticketStatus = "cancelled";
    } else if (booking.visitAt) {
      const today = new Date();
      const visit = new Date(booking.visitAt);

      const todayDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
      );

      const visitDateOnly = new Date(
        visit.getFullYear(),
        visit.getMonth(),
        visit.getDate(),
      );

      if (visitDateOnly < todayDate) {
        ticketStatus = "expired";
      } else if (visitDateOnly > todayDate) {
        ticketStatus = "future";
      } else {
        ticketStatus = "valid";
      }
    }

    // ---------------------------------------------
    // SEAT DISPLAY
    // ---------------------------------------------

    const seatDisplay =
      seats.length > 0
        ? seats
            .map((seat) => seat.seatNumber)
            .filter(Boolean)
            .join(", ")
        : null;

    const bogieDisplay =
      seats.length > 0
        ? Array.from(
            new Set(seats.map((seat) => seat.bogie).filter(Boolean)),
          ).join(", ")
        : null;

    // ---------------------------------------------
    // RESPONSE
    // ---------------------------------------------

    return success({
      ticket: {
        id: booking.bookingNumber,

        invoiceNumber: booking.bookingNumber,

        visitorName: booking.customerName,

        mobileNumber: booking.mobileNumber,

        email: "",

        visitorType:
          totalVisitors > 5
            ? "Group"
            : totalVisitors > 1
              ? "Family"
              : "Individual",

        attraction: attraction.name,

        zone: "",

        gate: "",

        timeSlot,

        visitDate,

        totalVisitors,

        breakdown: items.map((item) => ({
          category: item.category,

          quantity: Number(item.quantity),

          unitPrice: Number(item.unitPrice),

          total: Number(item.totalPrice),
        })),

        totalAmount: Number(booking.totalAmount),

        paymentMode: booking.paymentMode,

        paymentStatus,

        status: ticketStatus,

        seats: seatDisplay,

        bogie: bogieDisplay,

        specialNotes: null,
      },
    });
  } catch (error) {
    console.error("Get scanner ticket error:", error);

    // ---------------------------------------------
    // AUTH ERRORS
    // ---------------------------------------------

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return failure("Authentication required.", 401, "UNAUTHORIZED");
    }

    if (error instanceof Error && error.message === "ACCOUNT_NOT_ACTIVE") {
      return failure("Account is not active.", 403, "ACCOUNT_NOT_ACTIVE");
    }

    if (error instanceof Error && error.message === "FORBIDDEN") {
      return failure(
        "You do not have permission to access this ticket.",
        403,
        "FORBIDDEN",
      );
    }

    if (error instanceof Error && error.message === "USER_HAS_NO_ADMIN") {
      return failure(
        "User is not associated with an admin.",
        403,
        "USER_HAS_NO_ADMIN",
      );
    }

    return failure("Unable to fetch ticket.", 500, "INTERNAL_SERVER_ERROR");
  }
}
