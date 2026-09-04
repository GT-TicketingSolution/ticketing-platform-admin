import { and, eq, isNull } from "drizzle-orm";
import { NextRequest } from "next/server";

import { db } from "@/db";

import {
  scannerInvoices,
  bookings,
  attractions,
  attractionsAgainstBooking,
  attractionManagement,
} from "@/db/schema";

import { requireAuth } from "@/lib/auth/require-auth";

import { requireModuleAccess, getAdminId } from "@/lib/auth/authorization";

import { success, failure } from "@/lib/api/response";

export async function DELETE(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      invoiceId: string;
    }>;
  },
) {
  try {
    // =====================================================
    // AUTHENTICATION
    // =====================================================

    const auth = await requireAuth(request);

    await requireModuleAccess(auth, "SCANNER_INVOICES");

    // =====================================================
    // ADMIN CONTEXT
    // =====================================================

    const adminId = getAdminId(auth);

    if (!adminId) {
      return failure("Admin context not found.", 403, "ADMIN_CONTEXT_REQUIRED");
    }

    // =====================================================
    // ROUTE PARAM
    // =====================================================

    const { invoiceId } = await params;

    if (!invoiceId) {
      return failure("Invoice ID is required.", 400, "INVOICE_ID_REQUIRED");
    }

    // =====================================================
    // FIND INVOICE
    // =====================================================

    const [existingInvoice] = await db
      .select({
        id: scannerInvoices.id,
        invoiceNumber: scannerInvoices.invoiceNumber,
        deletedAt: scannerInvoices.deletedAt,
        isDeleted: scannerInvoices.isDeleted,
      })
      .from(scannerInvoices)
      .innerJoin(
        bookings,
        eq(scannerInvoices.invoiceNumber, bookings.invoiceNumber),
      )
      .where(
        and(
          eq(scannerInvoices.id, invoiceId),

          // Booking must belong to active tenant data
          isNull(bookings.deletedAt),
          eq(bookings.isDeleted, false),

          // Invoice itself must belong to active record
          // We intentionally do NOT filter deletedAt/isDeleted here
          // so we can return "already deleted" correctly.
        ),
      )
      .limit(1);

    // =====================================================
    // NOT FOUND
    // =====================================================

    if (!existingInvoice) {
      return failure("Invoice not found.", 404, "INVOICE_NOT_FOUND");
    }

    // =====================================================
    // ALREADY DELETED
    // =====================================================

    if (existingInvoice.deletedAt || existingInvoice.isDeleted) {
      return failure(
        "Invoice is already deleted.",
        400,
        "INVOICE_ALREADY_DELETED",
      );
    }

    // =====================================================
    // DELETE
    // =====================================================

    const [deletedInvoice] = await db
      .update(scannerInvoices)
      .set({
        deletedAt: new Date(),
        isDeleted: true,
        deletedBy: auth.user.id,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(scannerInvoices.id, invoiceId),
          isNull(scannerInvoices.deletedAt),
          eq(scannerInvoices.isDeleted, false),
        ),
      )
      .returning({
        id: scannerInvoices.id,
      });

    // =====================================================
    // DELETE FAILED
    // =====================================================

    if (!deletedInvoice) {
      return failure(
        "Invoice could not be deleted.",
        400,
        "INVOICE_DELETE_FAILED",
      );
    }

    // =====================================================
    // SUCCESS
    // =====================================================

    return success({
      message: "Invoice deleted successfully.",
      invoice: deletedInvoice,
    });
  } catch (error) {
    console.error("Delete invoice error:", error);

    // =====================================================
    // AUTHENTICATION ERRORS
    // =====================================================

    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return failure("Authentication required.", 401, "UNAUTHORIZED");
      }

      if (error.message === "ACCOUNT_NOT_ACTIVE") {
        return failure("Account is not active.", 403, "ACCOUNT_NOT_ACTIVE");
      }

      // ===================================================
      // MODULE AUTHORIZATION
      // ===================================================

      if (
        error.message === "MODULE_ACCESS_DENIED" ||
        error.message === "FORBIDDEN"
      ) {
        return failure(
          "You do not have permission to delete invoices.",
          403,
          "FORBIDDEN",
        );
      }

      // ===================================================
      // ADMIN CONTEXT
      // ===================================================

      if (error.message === "USER_HAS_NO_ADMIN") {
        return failure(
          "User is not associated with an admin.",
          403,
          "USER_HAS_NO_ADMIN",
        );
      }
    }

    // =====================================================
    // INTERNAL ERROR
    // =====================================================

    return failure("Unable to delete invoice.", 500, "INTERNAL_SERVER_ERROR");
  }
}
