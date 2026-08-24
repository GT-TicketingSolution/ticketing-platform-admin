import { NextRequest } from "next/server";

import { and, eq } from "drizzle-orm";

import { z } from "zod";

import { db } from "@/db";

import { bookings, transactions } from "@/db/schema";

import { requireAuth } from "@/lib/auth/require-auth";

import {
  requireModuleAccess,
  requireAttractionAccess,
  getAdminId,
} from "@/lib/auth/authorization";

import { success, failure } from "@/lib/api/response";

/* =========================================================
   VALIDATION
========================================================= */

const paymentSchema = z.object({
  amountPaid: z.number().nonnegative(),

  payment: z.object({
    mode: z.enum(["CASH", "UPI", "CARD", "ONLINE"]),
  }),
});

/* =========================================================
   POST
========================================================= */

export async function POST(
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

    const adminId = getAdminId(auth);

    // ---------------------------------------------
    // BOOKING ID
    // ---------------------------------------------

    const { bookingId } = await context.params;

    if (!bookingId) {
      return failure("Booking ID is required.", 400, "BOOKING_ID_REQUIRED");
    }

    // ---------------------------------------------
    // REQUEST BODY
    // ---------------------------------------------

    const body = await request.json();

    const parsed = paymentSchema.safeParse(body);

    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message || "Invalid payment details.",
        400,
        "VALIDATION_ERROR",
      );
    }

    const data = parsed.data;

    // ---------------------------------------------
    // FETCH BOOKING
    // ---------------------------------------------

    const [booking] = await db
      .select({
        id: bookings.id,
        attractionId: bookings.attractionId,
        totalAmount: bookings.totalAmount,
        amountPaid: bookings.amountPaid,
        status: bookings.status,
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

    if (booking.status !== "PENDING") {
      return failure(
        `Payment cannot be processed for a booking with status ${booking.status}.`,
        400,
        "INVALID_BOOKING_STATUS",
      );
    }

    // ---------------------------------------------
    // AMOUNT VALIDATION
    // ---------------------------------------------

    const totalAmount = Number(booking.totalAmount);
    const amountPaid = Number(booking.amountPaid);

    const remainingAmount = Math.max(0, totalAmount - amountPaid);

    if (data.amountPaid <= 0) {
      return failure(
        "Payment amount must be greater than zero.",
        400,
        "INVALID_PAYMENT_AMOUNT",
      );
    }

    if (data.amountPaid > remainingAmount) {
      return failure(
        "Payment amount cannot exceed the remaining amount.",
        400,
        "INVALID_PAYMENT_AMOUNT",
      );
    }

    // ---------------------------------------------
    // CREATE PAYMENT + UPDATE BOOKING
    // ---------------------------------------------

    const result = await db.transaction(async (tx) => {
      // -------------------------------------------
      // GENERATE TRANSACTION NUMBER
      // -------------------------------------------

      const transactionNumber = await generateTransactionNumber(tx);

      // -------------------------------------------
      // CREATE TRANSACTION
      // -------------------------------------------

      const [transaction] = await tx
        .insert(transactions)
        .values({
          transactionNumber,

          bookingId: booking.id,

          amount: data.amountPaid.toFixed(2),

          paymentMode: data.payment.mode,

          status: "SUCCESSFUL",
        })
        .returning({
          id: transactions.id,
          transactionNumber: transactions.transactionNumber,
          amount: transactions.amount,
          paymentMode: transactions.paymentMode,
          status: transactions.status,
          createdAt: transactions.createdAt,
        });

      // -------------------------------------------
      // CALCULATE TOTAL PAID
      // -------------------------------------------

      const newAmountPaid = amountPaid + data.amountPaid;

      const newBookingStatus =
        newAmountPaid >= totalAmount ? "CONFIRMED" : "PENDING";

      // -------------------------------------------
      // UPDATE BOOKING
      // -------------------------------------------

      const [updatedBooking] = await tx
        .update(bookings)
        .set({
          amountPaid: newAmountPaid.toFixed(2),

          status: newBookingStatus,
        })
        .where(eq(bookings.id, bookingId))
        .returning({
          id: bookings.id,
          bookingNumber: bookings.bookingNumber,
          totalAmount: bookings.totalAmount,
          amountPaid: bookings.amountPaid,
          status: bookings.status,
        });

      return {
        booking: updatedBooking,
        transaction,
      };
    });

    // ---------------------------------------------
    // RESPONSE
    // ---------------------------------------------

    return success(
      {
        booking: result.booking,

        transaction: result.transaction,

        payment: {
          amountPaid: data.amountPaid,
          paymentMode: data.payment.mode,
          remainingAmount: Math.max(
            0,
            totalAmount - Number(result.booking.amountPaid),
          ),
        },
      },
      200,
    );
  } catch (error) {
    console.error("Ticketing booking payment error:", error);

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

    return failure("Unable to process payment.", 500, "INTERNAL_SERVER_ERROR");
  }
}

/* =========================================================
   TRANSACTION NUMBER
========================================================= */

async function generateTransactionNumber(tx: any): Promise<string> {
  const now = new Date();

  const year = String(now.getFullYear()).slice(-2);

  const month = String(now.getMonth() + 1).padStart(2, "0");

  const day = String(now.getDate()).padStart(2, "0");

  const random = Math.floor(1000 + Math.random() * 9000);

  return `TX-${year}${month}${day}-${random}`;
}
