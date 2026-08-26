import { and, eq, isNull, inArray } from "drizzle-orm";

import { db } from "@/db";

import { transactions, bookings, attractions } from "@/db/schema";

import { requireAuth } from "@/lib/auth/require-auth";

import {
  requireModuleAccess,
  getAdminId,
  getAccessibleAttractionIds,
} from "@/lib/auth/authorization";

import { success, failure } from "@/lib/api/response";

// =====================================================
// GET TRANSACTION DETAILS
// ADMIN + MANAGER + STAFF WITH ACCESS
// =====================================================

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
    // =====================================================
    // 1. AUTHENTICATION
    // =====================================================

    const auth = await requireAuth(request);

    // =====================================================
    // 2. MODULE AUTHORIZATION
    // =====================================================

    await requireModuleAccess(auth, "TRANSACTIONS");

    // =====================================================
    // 3. TENANT / ADMIN
    // =====================================================

    const adminId = getAdminId(auth);

    // =====================================================
    // 4. TRANSACTION ID
    // =====================================================

    const { transactionId } = await params;

    if (!transactionId) {
      return failure(
        "Transaction ID is required.",
        400,
        "TRANSACTION_ID_REQUIRED",
      );
    }

    // =====================================================
    // 5. ACCESSIBLE ATTRACTIONS
    // =====================================================

    let accessibleAttractionIds: string[];

    if (auth.user.role === "ADMIN") {
      // Admin can access all attractions in their tenant.

      const adminAttractions = await db
        .select({
          id: attractions.id,
        })
        .from(attractions)
        .where(
          and(
            eq(attractions.adminId, adminId),
            eq(attractions.status, "ACTIVE"),
          ),
        );

      accessibleAttractionIds = adminAttractions.map(
        (attraction) => attraction.id,
      );
    } else {
      // Manager / Staff
      accessibleAttractionIds = await getAccessibleAttractionIds(auth);
    }

    // =====================================================
    // 6. NO ATTRACTION ACCESS
    // =====================================================

    if (accessibleAttractionIds.length === 0) {
      return failure("Transaction not found.", 404, "TRANSACTION_NOT_FOUND");
    }

    // =====================================================
    // 7. GET TRANSACTION
    // =====================================================

    const [transaction] = await db
      .select({
        id: transactions.id,

        transactionId: transactions.transactionNumber,

        invoiceNumber: transactions.invoiceNumber,

        amount: transactions.amount,

        paymentMode: transactions.paymentMode,

        status: transactions.status,

        transactionDate: transactions.createdAt,

        bookingNumber: bookings.bookingNumber,

        attractionId: attractions.id,

        attractionName: attractions.name,
      })
      .from(transactions)
      .innerJoin(bookings, eq(transactions.bookingId, bookings.id))
      .innerJoin(attractions, eq(bookings.attractionId, attractions.id))
      .where(
        and(
          eq(transactions.id, transactionId),

          isNull(transactions.deletedAt),

          isNull(bookings.deletedAt),

          // Tenant isolation
          eq(attractions.adminId, adminId),

          // Attraction access
          inArray(attractions.id, accessibleAttractionIds),
        ),
      )
      .limit(1);

    // =====================================================
    // 8. NOT FOUND
    // =====================================================

    if (!transaction) {
      return failure("Transaction not found.", 404, "TRANSACTION_NOT_FOUND");
    }

    // =====================================================
    // 9. RESPONSE
    // =====================================================

    return success({
      transaction: {
        id: transaction.id,

        transactionRef: transaction.transactionId,

        transactionId: transaction.transactionId,

        dateTime: transaction.transactionDate,

        invoiceId: transaction.invoiceNumber,

        bookingId: transaction.bookingNumber,

        attraction: {
          id: transaction.attractionId,
          name: transaction.attractionName,
        },

        paymentMode: transaction.paymentMode,

        amountPaid: Number(transaction.amount),

        status: transaction.status,
      },
    });
  } catch (error) {
    console.error("Get transaction details error:", error);

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return failure("Authentication required.", 401, "UNAUTHORIZED");
    }

    if (error instanceof Error && error.message === "ACCOUNT_NOT_ACTIVE") {
      return failure("Account is not active.", 403, "ACCOUNT_NOT_ACTIVE");
    }

    if (error instanceof Error && error.message === "FORBIDDEN") {
      return failure(
        "You do not have permission to access this transaction.",
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

    return failure(
      "Unable to fetch transaction details.",
      500,
      "INTERNAL_SERVER_ERROR",
    );
  }
}

// =====================================================
// DELETE TRANSACTION
// ADMIN ONLY
// =====================================================

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
    // =====================================================
    // 1. AUTHENTICATION
    // =====================================================

    const auth = await requireAuth(request);

    // =====================================================
    // 2. MODULE AUTHORIZATION
    // =====================================================

    await requireModuleAccess(auth, "TRANSACTIONS");

    // =====================================================
    // 3. ADMIN ONLY
    // =====================================================

    if (auth.user.role !== "ADMIN") {
      return failure("Admin access required.", 403, "FORBIDDEN");
    }

    // =====================================================
    // 4. TENANT / ADMIN
    // =====================================================

    const adminId = getAdminId(auth);

    // =====================================================
    // 5. TRANSACTION ID
    // =====================================================

    const { transactionId } = await params;

    if (!transactionId) {
      return failure(
        "Transaction ID is required.",
        400,
        "TRANSACTION_ID_REQUIRED",
      );
    }

    // =====================================================
    // 6. FIND TRANSACTION
    // =====================================================

    const [existingTransaction] = await db
      .select({
        id: transactions.id,

        transactionId: transactions.transactionNumber,

        deletedAt: transactions.deletedAt,

        attractionId: attractions.id,
      })
      .from(transactions)
      .innerJoin(bookings, eq(transactions.bookingId, bookings.id))
      .innerJoin(attractions, eq(bookings.attractionId, attractions.id))
      .where(
        and(
          eq(transactions.id, transactionId),

          // Tenant isolation
          eq(attractions.adminId, adminId),

          isNull(bookings.deletedAt),
        ),
      )
      .limit(1);

    // =====================================================
    // 7. NOT FOUND
    // =====================================================

    if (!existingTransaction) {
      return failure("Transaction not found.", 404, "TRANSACTION_NOT_FOUND");
    }

    // =====================================================
    // 8. ALREADY DELETED
    // =====================================================

    if (existingTransaction.deletedAt) {
      return failure(
        "Transaction is already deleted.",
        400,
        "TRANSACTION_ALREADY_DELETED",
      );
    }

    // =====================================================
    // 9. SOFT DELETE
    // =====================================================

    const [deletedTransaction] = await db
      .update(transactions)
      .set({
        deletedAt: new Date(),

        deletedBy: auth.user.id,

        isDeleted: true,

        updatedAt: new Date(),
      })
      .where(eq(transactions.id, transactionId))
      .returning({
        id: transactions.id,

        transactionId: transactions.transactionNumber,

        deletedAt: transactions.deletedAt,
      });

    // =====================================================
    // 10. RESPONSE
    // =====================================================

    return success({
      message: "Transaction deleted successfully.",

      transaction: deletedTransaction,
    });
  } catch (error) {
    console.error("Delete transaction error:", error);

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return failure("Authentication required.", 401, "UNAUTHORIZED");
    }

    if (error instanceof Error && error.message === "ACCOUNT_NOT_ACTIVE") {
      return failure("Account is not active.", 403, "ACCOUNT_NOT_ACTIVE");
    }

    if (error instanceof Error && error.message === "FORBIDDEN") {
      return failure(
        "You do not have permission to delete transactions.",
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

    return failure(
      "Unable to delete transaction.",
      500,
      "INTERNAL_SERVER_ERROR",
    );
  }
}
