import { and, eq, isNull, inArray, sql } from "drizzle-orm";

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

    /*
     * bookings.attractionIds is UUID[]
     *
     * Therefore we CANNOT do:
     *
     * eq(bookings.attractionIds, attractions.id)
     *
     * because that becomes:
     *
     * uuid[] = uuid
     *
     * Instead we check whether the attraction ID
     * exists inside the booking's attractionIds array.
     */

    const [existingTransaction] = await db
      .select({
        id: transactions.id,

        transactionId: transactions.invoiceNumber,

        deletedAt: transactions.deletedAt,

        attractionId: attractions.id,
      })
      .from(transactions)

      // Transaction -> Booking
      .innerJoin(bookings, eq(transactions.bookingId, bookings.id))

      // Booking -> Attractions
      // bookings.attractionIds is UUID[]

      .where(
        and(
          // Find requested transaction
          eq(transactions.id, transactionId),

          // Tenant isolation
          eq(attractions.adminId, adminId),

          // Booking must not already be deleted
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
    // 9. SOFT DELETE TRANSACTION
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

        transactionId: transactions.invoiceNumber,

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
    // =====================================================
    // ERROR HANDLING
    // =====================================================

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
