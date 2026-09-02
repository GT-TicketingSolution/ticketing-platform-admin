import { NextRequest } from "next/server";

import { eq } from "drizzle-orm";

import { db } from "@/db";

import {
  attractions,
  bookingItems,
  bookingSeats,
  bookings,
  transactions,
} from "@/db/schema";

import { requireAuth } from "@/lib/auth/require-auth";

import {
  requireModuleAccess,
  requireAttractionAccess,
} from "@/lib/auth/authorization";

import { success, failure } from "@/lib/api/response";

/* =========================================================
   GET BOOKING DETAILS
========================================================= */

export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{
      bookingId: string;
    }>;
  },
) {
  try {
    // ---------------------------------------------
    // AUTHENTICATION
    // ---------------------------------------------

    const auth = await requireAuth(request);

    await requireModuleAccess(auth, "TICKET_BOOKING");

    // ---------------------------------------------
    // BOOKING ID
    // ---------------------------------------------

    const { bookingId } = await context.params;

    if (!bookingId) {
      return failure("Booking ID is required.", 400, "BOOKING_ID_REQUIRED");
    }

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
        attractionName: attractions.name,

        visitAt: bookings.visitAt,

        subtotal: bookings.subtotal,
        gstAmount: bookings.gstAmount,
        gstAdjustment: bookings.gstAdjustment,
        roundOff: bookings.roundOff,
        discountAmount: bookings.discountAmount,

        totalAmount: bookings.totalAmount,
        amountPaid: bookings.amountPaid,

        paymentMode: bookings.paymentMode,
        paymentExpiresAt: bookings.paymentExpiresAt,

        status: bookings.status,

        createdAt: bookings.createdAt,
        updatedAt: bookings.updatedAt,
      })
      .from(bookings)
      .innerJoin(attractions, eq(bookings.attractionId, attractions.id))
      .where(eq(bookings.id, bookingId))
      .limit(1);

    // ---------------------------------------------
    // BOOKING NOT FOUND
    // ---------------------------------------------

    if (!booking) {
      return failure("Booking not found.", 404, "BOOKING_NOT_FOUND");
    }

    // ---------------------------------------------
    // ATTRACTION ACCESS
    // ---------------------------------------------

    try {
      await requireAttractionAccess(auth, booking.attractionId[0]);
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
    // FETCH BOOKING ITEMS
    // ---------------------------------------------

    const items = await db
      .select({
        id: bookingItems.id,

        attractionId: bookingItems.attractionId,

        category: bookingItems.category,

        quantity: bookingItems.quantity,

        unitPrice: bookingItems.unitPrice,

        totalPrice: bookingItems.totalPrice,
      })
      .from(bookingItems)
      .where(eq(bookingItems.bookingId, bookingId));

    // ---------------------------------------------
    // FETCH BOOKING SEATS
    // ---------------------------------------------

    const seats = await db
      .select({
        id: bookingSeats.id,

        slotId: bookingSeats.slotId,

        visitDate: bookingSeats.visitDate,

        bogie: bookingSeats.bogie,

        seatNumber: bookingSeats.seatNumber,
      })
      .from(bookingSeats)
      .where(eq(bookingSeats.bookingId, bookingId));

    // ---------------------------------------------
    // FETCH TRANSACTIONS
    // ---------------------------------------------

    const paymentTransactions = await db
      .select({
        id: transactions.id,

        transactionNumber: transactions.transactionNumber,

        amount: transactions.amount,

        paymentMode: transactions.paymentMode,

        status: transactions.status,

        createdAt: transactions.createdAt,
      })
      .from(transactions)
      .where(eq(transactions.bookingId, bookingId));

    // ---------------------------------------------
    // CALCULATE PAYMENT SUMMARY
    // ---------------------------------------------

    const totalAmount = Number(booking.totalAmount);

    const amountPaid = Number(booking.amountPaid);

    const remainingAmount = Math.max(0, totalAmount - amountPaid);

    // ---------------------------------------------
    // RESPONSE
    // ---------------------------------------------

    return success({
      booking: {
        id: booking.id,

        bookingNumber: booking.bookingNumber,

        customer: {
          name: booking.customerName,
          mobile: booking.mobileNumber,
          gstn: booking.gstNumber,
        },

        attraction: {
          id: booking.attractionId,
          name: booking.attractionName,
        },

        visitAt: booking.visitAt,

        pricing: {
          subtotal: booking.subtotal,
          gstAmount: booking.gstAmount,
          gstAdjustment: booking.gstAdjustment,
          roundOff: booking.roundOff,
          discountAmount: booking.discountAmount,
          totalAmount: booking.totalAmount,
          amountPaid: booking.amountPaid,
          remainingAmount: remainingAmount.toFixed(2),
        },

        paymentMode: booking.paymentMode,
        paymentExpiresAt: booking.paymentExpiresAt,

        status: booking.status,

        items,

        seats,

        transactions: paymentTransactions,

        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt,
      },
    });
  } catch (error) {
    console.error("Get ticketing booking details error:", error);

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

    if (error instanceof Error && error.message === "FORBIDDEN") {
      return failure(
        "You do not have permission to access this booking.",
        403,
        "FORBIDDEN",
      );
    }

    return failure(
      "Unable to fetch booking details.",
      500,
      "INTERNAL_SERVER_ERROR",
    );
  }
}
