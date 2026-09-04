import { and, eq, isNull, inArray, sql } from "drizzle-orm";

import { db } from "@/db";

import {
  transactions,
  bookings,
  attractions,
  attractionsAgainstBooking,
  attractionManagement,
} from "@/db/schema";

import { requireAuth } from "@/lib/auth/require-auth";

import { requireModuleAccess, getAdminId } from "@/lib/auth/authorization";

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
    // 6. ACCESSIBLE ATTRACTIONS
    // =====================================================

    const accessibleAttractionRows = await db
      .select({
        id: attractions.id,
      })
      .from(attractions)
      .where(
        and(eq(attractions.adminId, adminId), eq(attractions.status, "ACTIVE")),
      );

    const accessibleAttractionIds = accessibleAttractionRows.map(
      (item) => item.id,
    );

    if (accessibleAttractionIds.length === 0) {
      return failure(
        "You do not have access to this transaction.",
        403,
        "FORBIDDEN",
      );
    }

    // =====================================================
    // 7. FIND TRANSACTION
    // =====================================================

    const [existingTransaction] = await db
      .select({
        id: transactions.id,

        transactionId: transactions.invoiceNumber,

        deletedAt: transactions.deletedAt,
      })
      .from(transactions)
      .innerJoin(bookings, eq(transactions.bookingId, bookings.id))
      .where(
        and(
          // Requested transaction
          eq(transactions.id, transactionId),

          // Transaction not deleted
          isNull(transactions.deletedAt),

          eq(transactions.isDeleted, false),

          // Booking not deleted
          isNull(bookings.deletedAt),

          eq(bookings.isDeleted, false),

          // =================================================
          // TENANT + ATTRACTION ACCESS
          // =================================================

          sql`EXISTS (
            SELECT 1
            FROM ${attractionsAgainstBooking}
            INNER JOIN ${attractionManagement}
              ON ${attractionsAgainstBooking.attractionManagementId}
              = ${attractionManagement.id}
            INNER JOIN ${attractions}
              ON ${attractionManagement.attractionId}
              = ${attractions.id}
            WHERE
              ${attractionsAgainstBooking.bookingId}
              = ${bookings.id}

              AND ${attractions.adminId}
              = ${adminId}

              AND ${inArray(attractions.id, accessibleAttractionIds)}
          )`,
        ),
      )
      .limit(1);

    // =====================================================
    // 8. NOT FOUND
    // =====================================================

    if (!existingTransaction) {
      return failure("Transaction not found.", 404, "TRANSACTION_NOT_FOUND");
    }

    // =====================================================
    // 9. ALREADY DELETED
    // =====================================================

    if (existingTransaction.deletedAt) {
      return failure(
        "Transaction is already deleted.",
        400,
        "TRANSACTION_ALREADY_DELETED",
      );
    }

    // =====================================================
    // 10. SOFT DELETE TRANSACTION
    // =====================================================

    const [deletedTransaction] = await db
      .update(transactions)
      .set({
        deletedAt: new Date(),

        deletedBy: auth.user.id,

        isDeleted: true,

        updatedAt: new Date(),
      })
      .where(
        and(
          eq(transactions.id, transactionId),
          isNull(transactions.deletedAt),
          eq(transactions.isDeleted, false),
        ),
      )
      .returning({
        id: transactions.id,
      });

    // =====================================================
    // 11. DELETE FAILED
    // =====================================================

    if (!deletedTransaction) {
      return failure(
        "Transaction could not be deleted.",
        400,
        "TRANSACTION_DELETE_FAILED",
      );
    }

    // =====================================================
    // 12. RESPONSE
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
