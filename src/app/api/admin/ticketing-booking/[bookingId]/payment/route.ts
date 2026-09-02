import { NextRequest } from "next/server";
import { and, eq, sum } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { bookings, transactions } from "@/db/schema";

import { requireAuth } from "@/lib/auth/require-auth";
import { requireModuleAccess } from "@/lib/auth/authorization";

import { success, failure } from "@/lib/api/response";

/* =========================================================
   ROUTE PARAMS
========================================================= */

interface RouteParams {
  params: Promise<{
    bookingId: string;
  }>;
}

/* =========================================================
   VALIDATION
========================================================= */

const paymentSchema = z.object({
  amountReceived: z.number().positive(),

  payment: z.object({
    mode: z.enum(["CASH", "UPI", "CARD", "ONLINE"]),
  }),
});

/* =========================================================
   POST
========================================================= */

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
    // TRANSACTION
    // ---------------------------------------------

    const result = await db.transaction(async (tx) => {
      // -------------------------------------------
      // LOCK BOOKING
      // -------------------------------------------

      const [booking] = await tx
        .select({
          id: bookings.id,
          bookingNumber: bookings.bookingNumber,
          attractionId: bookings.attractionId,
          status: bookings.status,
          totalAmount: bookings.totalAmount,
          amountReceived: bookings.amountReceived,
          returnAmount: bookings.returnAmount,
          paymentMode: bookings.paymentMode,
          paymentExpiresAt: bookings.paymentExpiresAt,
        })
        .from(bookings)
        .where(eq(bookings.id, bookingId))
        .for("update");

      if (!booking) {
        throw new Error("BOOKING_NOT_FOUND");
      }

      // -------------------------------------------
      // CHECK STATUS
      // -------------------------------------------

      if (booking.status === "CONFIRMED") {
        throw new Error("ALREADY_CONFIRMED");
      }

      if (booking.status !== "PENDING") {
        throw new Error("INVALID_BOOKING_STATUS");
      }

      // -------------------------------------------
      // CHECK EXPIRY
      // -------------------------------------------

      if (booking.paymentExpiresAt && new Date() > booking.paymentExpiresAt) {
        await tx
          .update(bookings)
          .set({
            status: "CANCELLED",
            updatedAt: new Date(),
          })
          .where(
            and(eq(bookings.id, bookingId), eq(bookings.status, "PENDING")),
          );

        throw new Error("PAYMENT_EXPIRED");
      }

      // -------------------------------------------
      // TOTAL BOOKING AMOUNT
      // -------------------------------------------

      const totalAmount = Number(booking.totalAmount || 0);

      // -------------------------------------------
      // GET PREVIOUS SUCCESSFUL PAYMENTS
      // -------------------------------------------

      const [paymentTotal] = await tx
        .select({
          totalPaid: sum(transactions.amount),
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.bookingId, bookingId),
            eq(transactions.status, "SUCCESSFUL"),
          ),
        );

      const previousPaid = Number(paymentTotal?.totalPaid || 0);

      // -------------------------------------------
      // REMAINING AMOUNT
      // -------------------------------------------

      const remainingAmount = Math.max(0, totalAmount - previousPaid);

      // -------------------------------------------
      // CUSTOMER RECEIVED AMOUNT
      // -------------------------------------------

      const amountReceived = Number(data.amountReceived);

      if (amountReceived <= 0) {
        throw new Error("INVALID_PAYMENT_AMOUNT");
      }

      // -------------------------------------------
      // CUSTOMER MUST PAY AT LEAST REMAINING
      // -------------------------------------------

      if (amountReceived < remainingAmount) {
        throw new Error("PAYMENT_NOT_COMPLETED");
      }

      // -------------------------------------------
      // ACTUAL PAYMENT AMOUNT
      // -------------------------------------------

      const paymentAmount = remainingAmount;

      // -------------------------------------------
      // RETURN CHANGE
      // -------------------------------------------

      const returnAmount = Math.max(0, amountReceived - paymentAmount);

      // -------------------------------------------
      // GENERATE TRANSACTION NUMBER
      // -------------------------------------------

      const transactionNumber = await generateTransactionNumber(tx);

      // -------------------------------------------
      // INSERT TRANSACTION
      // -------------------------------------------

      const [transaction] = await tx
        .insert(transactions)
        .values({
          transactionNumber,

          bookingId: bookingId,

          amount: paymentAmount.toFixed(2),

          paymentMode: data.payment.mode,

          status: "SUCCESSFUL",
        })
        .returning({
          id: transactions.id,

          transactionNumber: transactions.transactionNumber,

          bookingId: transactions.bookingId,

          amount: transactions.amount,

          paymentMode: transactions.paymentMode,

          status: transactions.status,

          createdAt: transactions.createdAt,
        });

      if (!transaction) {
        throw new Error("TRANSACTION_CREATE_FAILED");
      }

      // -------------------------------------------
      // UPDATE BOOKING
      // -------------------------------------------

      const [updatedBooking] = await tx
        .update(bookings)
        .set({
          amountReceived: amountReceived.toFixed(2),

          returnAmount: returnAmount.toFixed(2),

          paymentMode: data.payment.mode,

          status: "CONFIRMED",

          updatedAt: new Date(),
        })
        .where(and(eq(bookings.id, bookingId), eq(bookings.status, "PENDING")))
        .returning({
          id: bookings.id,

          bookingNumber: bookings.bookingNumber,

          attractionId: bookings.attractionId,

          status: bookings.status,

          totalAmount: bookings.totalAmount,

          amountReceived: bookings.amountReceived,

          returnAmount: bookings.returnAmount,

          paymentMode: bookings.paymentMode,

          paymentExpiresAt: bookings.paymentExpiresAt,

          createdAt: bookings.createdAt,

          updatedAt: bookings.updatedAt,
        });

      if (!updatedBooking) {
        throw new Error("BOOKING_UPDATE_FAILED");
      }

      return {
        booking: updatedBooking,

        transaction,

        payment: {
          amountReceived,

          amountPaid: paymentAmount,

          previousPaid,

          remainingAmount,

          returnAmount,

          paymentMode: data.payment.mode,
        },
      };
    });

    // ---------------------------------------------
    // RESPONSE
    // ---------------------------------------------

    return success(
      {
        message: "Payment completed successfully.",

        booking: result.booking,

        transaction: result.transaction,

        payment: result.payment,
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

    // ---------------------------------------------
    // BOOKING ERRORS
    // ---------------------------------------------

    if (error instanceof Error && error.message === "BOOKING_NOT_FOUND") {
      return failure("Booking not found.", 404, "BOOKING_NOT_FOUND");
    }

    if (error instanceof Error && error.message === "ALREADY_CONFIRMED") {
      return failure("Booking is already confirmed.", 409, "ALREADY_CONFIRMED");
    }

    if (error instanceof Error && error.message === "INVALID_BOOKING_STATUS") {
      return failure(
        "Payment cannot be processed for this booking.",
        409,
        "INVALID_BOOKING_STATUS",
      );
    }

    // ---------------------------------------------
    // PAYMENT ERRORS
    // ---------------------------------------------

    if (error instanceof Error && error.message === "PAYMENT_EXPIRED") {
      return failure(
        "Payment session has expired. Please create a new booking.",
        400,
        "PAYMENT_EXPIRED",
      );
    }

    if (error instanceof Error && error.message === "PAYMENT_NOT_COMPLETED") {
      return failure(
        "Received amount is less than the remaining booking amount.",
        400,
        "PAYMENT_NOT_COMPLETED",
      );
    }

    if (error instanceof Error && error.message === "INVALID_PAYMENT_AMOUNT") {
      return failure("Invalid payment amount.", 400, "INVALID_PAYMENT_AMOUNT");
    }

    // ---------------------------------------------
    // TRANSACTION ERRORS
    // ---------------------------------------------

    if (
      error instanceof Error &&
      error.message === "TRANSACTION_CREATE_FAILED"
    ) {
      return failure(
        "Unable to create payment transaction.",
        500,
        "TRANSACTION_CREATE_FAILED",
      );
    }

    if (error instanceof Error && error.message === "BOOKING_UPDATE_FAILED") {
      return failure(
        "Unable to update booking after payment.",
        500,
        "BOOKING_UPDATE_FAILED",
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
