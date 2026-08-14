import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/db";

import { transactions, bookings, attractions } from "@/db/schema";

import { requireAuth } from "@/lib/auth/require-auth";
import { success, failure } from "@/lib/api/response";

export async function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      transactionId: string;
    }>;
  },
) {
  try {
    // ---------------------------------------------
    // Authentication
    // ---------------------------------------------

    const auth = await requireAuth(request);

    if (auth.user.role !== "ADMIN") {
      return failure("Admin access required.", 403, "FORBIDDEN");
    }

    // ---------------------------------------------
    // Transaction ID
    // ---------------------------------------------

    const { transactionId } = await params;

    if (!transactionId) {
      return failure(
        "Transaction ID is required.",
        400,
        "TRANSACTION_ID_REQUIRED",
      );
    }

    // ---------------------------------------------
    // Get transaction
    // ---------------------------------------------

    const [transaction] = await db
      .select({
        id: transactions.id,

        transactionId: transactions.transactionNumber,

        invoiceNumber: transactions.invoiceNumber,

        amount: transactions.amount,

        paymentMode: transactions.paymentMode,

        status: transactions.status,

        transactionDate: transactions.createdAt,

        updatedAt: transactions.updatedAt,

        bookingId: bookings.id,

        bookingNumber: bookings.bookingNumber,

        customerName: bookings.customerName,

        mobileNumber: bookings.mobileNumber,

        gstNumber: bookings.gstNumber,

        attractionId: attractions.id,

        attractionName: attractions.name,
      })
      .from(transactions)
      .innerJoin(bookings, eq(transactions.bookingId, bookings.id))
      .leftJoin(attractions, eq(bookings.attractionId, attractions.id))
      .where(
        and(
          eq(transactions.id, transactionId),

          // Transaction must not be soft deleted
          isNull(transactions.deletedAt),
        ),
      )
      .limit(1);

    // ---------------------------------------------
    // Transaction not found
    // ---------------------------------------------

    if (!transaction) {
      return failure("Transaction not found.", 404, "TRANSACTION_NOT_FOUND");
    }

    // ---------------------------------------------
    // Response
    // ---------------------------------------------

    return success({
      transaction: {
        id: transaction.id,

        transactionId: transaction.transactionId,

        invoiceNumber: transaction.invoiceNumber,

        booking: {
          id: transaction.bookingId,

          bookingId: transaction.bookingNumber,
        },

        customer: {
          name: transaction.customerName,

          mobile: transaction.mobileNumber,

          gstNumber: transaction.gstNumber,
        },

        attraction: transaction.attractionId
          ? {
              id: transaction.attractionId,

              name: transaction.attractionName,
            }
          : null,

        transactionDate: transaction.transactionDate,

        payment: {
          mode: transaction.paymentMode,

          amount: Number(transaction.amount),

          status: transaction.status,
        },

        createdAt: transaction.transactionDate,

        updatedAt: transaction.updatedAt,
      },
    });
  } catch (error) {
    console.error("Get transaction details error:", error);

    return failure(
      "Unable to fetch transaction details.",
      500,
      "INTERNAL_SERVER_ERROR",
    );
  }
}

export async function DELETE(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      transactionId: string;
    }>;
  },
) {
  try {
    // ---------------------------------------------
    // Authentication
    // ---------------------------------------------

    const auth = await requireAuth(request);

    if (auth.user.role !== "ADMIN") {
      return failure("Admin access required.", 403, "FORBIDDEN");
    }

    // ---------------------------------------------
    // Transaction ID
    // ---------------------------------------------

    const { transactionId } = await params;

    if (!transactionId) {
      return failure(
        "Transaction ID is required.",
        400,
        "TRANSACTION_ID_REQUIRED",
      );
    }

    // ---------------------------------------------
    // Find transaction
    // ---------------------------------------------

    const [existingTransaction] = await db
      .select({
        id: transactions.id,
        transactionId: transactions.transactionNumber,
        deletedAt: transactions.deletedAt,
      })
      .from(transactions)
      .where(eq(transactions.id, transactionId))
      .limit(1);

    if (!existingTransaction) {
      return failure("Transaction not found.", 404, "TRANSACTION_NOT_FOUND");
    }

    // ---------------------------------------------
    // Already soft deleted
    // ---------------------------------------------

    if (existingTransaction.deletedAt) {
      return failure(
        "Transaction is already deleted.",
        400,
        "TRANSACTION_ALREADY_DELETED",
      );
    }

    // ---------------------------------------------
    // SOFT DELETE
    // ---------------------------------------------

    const [deletedTransaction] = await db
      .update(transactions)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(transactions.id, transactionId))
      .returning({
        id: transactions.id,
        transactionId: transactions.transactionNumber,
        deletedAt: transactions.deletedAt,
      });

    // ---------------------------------------------
    // Response
    // ---------------------------------------------

    return success({
      message: "Transaction deleted successfully.",
      transaction: deletedTransaction,
    });
  } catch (error) {
    console.error("Delete transaction error:", error);

    return failure(
      "Unable to delete transaction.",
      500,
      "INTERNAL_SERVER_ERROR",
    );
  }
}
