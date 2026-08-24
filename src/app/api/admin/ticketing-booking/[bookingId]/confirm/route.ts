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

    // if (booking.status !== "PENDING") {
    //   if (booking.status === "CONFIRMED") {
    //     return success({
    //       message: "Booking is already confirmed.",
    //       booking,
    //     });
    //   }

    //   return failure(
    //     `Booking with status ${booking.status} cannot be confirmed.`,
    //     409,
    //     "INVALID_BOOKING_STATUS",
    //   );
    // }

    // ---------------------------------------------
    // CONFIRM BOOKING
    // ---------------------------------------------

    // ---------------------------------------------
    // CONFIRM BOOKING
    // ---------------------------------------------

    const confirmedBooking = await db.transaction(async (tx) => {
      // -------------------------------------------
      // LOCK BOOKING
      // -------------------------------------------

      const [lockedBooking] = await tx
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
        .for("update");

      if (!lockedBooking) {
        throw new Error("BOOKING_NOT_FOUND");
      }

      // -------------------------------------------
      // CHECK BOOKING STATUS
      // -------------------------------------------

      if (lockedBooking.status === "CONFIRMED") {
        return {
          alreadyConfirmed: true as const,
          booking: lockedBooking,
        };
      }

      if (lockedBooking.status !== "PENDING") {
        throw new Error("INVALID_BOOKING_STATUS");
      }

      // -------------------------------------------
      // CHECK PAYMENT
      // -------------------------------------------

      const totalAmount = Number(lockedBooking.totalAmount);
      const amountPaid = Number(lockedBooking.amountPaid);

      if (amountPaid < totalAmount) {
        throw new Error("PAYMENT_NOT_COMPLETED");
      }

      // -------------------------------------------
      // CONFIRM BOOKING
      // -------------------------------------------

      const [confirmed] = await tx
        .update(bookings)
        .set({
          status: "CONFIRMED",
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

      if (!confirmed) {
        throw new Error("BOOKING_UPDATE_FAILED");
      }

      return {
        alreadyConfirmed: false as const,
        booking: confirmed,
      };
    });

    // ---------------------------------------------
    // RESPONSE
    // ---------------------------------------------

    if (confirmedBooking.alreadyConfirmed) {
      return success({
        message: "Booking is already confirmed.",
        booking: confirmedBooking.booking,
      });
    }

    return success(
      {
        message: "Booking confirmed successfully.",
        booking: confirmedBooking.booking,
      },
      200,
    );
  } catch (error) {
    console.error("Confirm ticketing booking error:", error);

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

    if (error instanceof Error && error.message === "PAYMENT_NOT_COMPLETED") {
      return failure(
        "Booking cannot be confirmed until full payment is completed.",
        409,
        "PAYMENT_NOT_COMPLETED",
      );
    }

    if (error instanceof Error && error.message === "BOOKING_NOT_FOUND") {
      return failure("Booking not found.", 404, "BOOKING_NOT_FOUND");
    }

    if (error instanceof Error && error.message === "INVALID_BOOKING_STATUS") {
      return failure(
        "Only pending bookings can be confirmed.",
        409,
        "INVALID_BOOKING_STATUS",
      );
    }

    if (error instanceof Error && error.message === "BOOKING_UPDATE_FAILED") {
      return failure(
        "Unable to confirm booking.",
        500,
        "BOOKING_UPDATE_FAILED",
      );
    }

    return failure("Unable to confirm booking.", 500, "INTERNAL_SERVER_ERROR");
  }
}
