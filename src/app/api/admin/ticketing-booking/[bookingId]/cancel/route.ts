import { NextRequest } from "next/server";
import { eq, and } from "drizzle-orm";

import { db } from "@/db";
import { bookings } from "@/db/schema";

import { requireAuth } from "@/lib/auth/require-auth";
import {
  requireModuleAccess,
  requireAttractionAccess,
} from "@/lib/auth/authorization";

import { success, failure } from "@/lib/api/response";

interface RouteParams {
  params: Promise<{
    bookingId: string;
  }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // ---------------------------------------------
    // AUTHENTICATION
    // ---------------------------------------------

    const auth = await requireAuth(request);

    await requireModuleAccess(auth, "TICKET_BOOKING");

    // ---------------------------------------------
    // BOOKING ID
    // ---------------------------------------------

    const { bookingId } = await params;

    if (!bookingId) {
      return failure("Booking ID is required.", 400, "BOOKING_ID_REQUIRED");
    }

    // ---------------------------------------------
    // FIND BOOKING
    // ---------------------------------------------

    const [booking] = await db
      .select({
        id: bookings.id,
        bookingNumber: bookings.bookingNumber,
        attractionId: bookings.attractionId,
        status: bookings.status,
        customerName: bookings.customerName,
        mobileNumber: bookings.mobileNumber,
        visitAt: bookings.visitAt,
        totalAmount: bookings.totalAmount,
        amountPaid: bookings.amountPaid,
        paymentMode: bookings.paymentMode,
        createdAt: bookings.createdAt,
        updatedAt: bookings.updatedAt,
      })
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1);

    if (!booking) {
      return failure("Booking not found.", 404, "BOOKING_NOT_FOUND");
    }

    // ---------------------------------------------
    // ATTRACTION ACCESS
    // ---------------------------------------------

    try {
      await requireAttractionAccess(auth, booking.attractionId);
    } catch (error) {
      if (error instanceof Error && error.message === "FORBIDDEN") {
        return failure(
          "You do not have permission to access this booking.",
          403,
          "FORBIDDEN",
        );
      }

      throw error;
    }

    // ---------------------------------------------
    // CHECK BOOKING STATUS
    // ---------------------------------------------

    if (booking.status === "CANCELLED") {
      return success({
        message: "Booking is already cancelled.",
        booking,
      });
    }

    // ---------------------------------------------
    // CANCEL BOOKING
    // ---------------------------------------------

    const [cancelledBooking] = await db
      .update(bookings)
      .set({
        status: "CANCELLED",
        updatedAt: new Date(),
      })
      .where(and(eq(bookings.id, bookingId), eq(bookings.status, "PENDING")))
      .returning({
        id: bookings.id,
        bookingNumber: bookings.bookingNumber,
        attractionId: bookings.attractionId,
        status: bookings.status,
        customerName: bookings.customerName,
        mobileNumber: bookings.mobileNumber,
        visitAt: bookings.visitAt,
        totalAmount: bookings.totalAmount,
        amountPaid: bookings.amountPaid,
        paymentMode: bookings.paymentMode,
        createdAt: bookings.createdAt,
        updatedAt: bookings.updatedAt,
      });

    // ---------------------------------------------
    // RESPONSE
    // ---------------------------------------------

    return success(
      {
        message: "Booking cancelled successfully.",
        booking: cancelledBooking,
      },
      200,
    );
  } catch (error) {
    console.error("Cancel ticketing booking error:", error);

    // ---------------------------------------------
    // AUTH ERRORS
    // ---------------------------------------------

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return failure("Authentication required.", 401, "UNAUTHORIZED");
    }

    if (error instanceof Error && error.message === "ACCOUNT_NOT_ACTIVE") {
      return failure("Account is not active.", 403, "ACCOUNT_NOT_ACTIVE");
    }

    if (error instanceof Error && error.message === "USER_HAS_NO_ADMIN") {
      return failure(
        "User is not associated with an admin.",
        403,
        "USER_HAS_NO_ADMIN",
      );
    }

    return failure("Unable to cancel booking.", 500, "INTERNAL_SERVER_ERROR");
  }
}
