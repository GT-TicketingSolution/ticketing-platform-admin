import { NextRequest } from "next/server";
import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { transactions } from "@/db/schema";

import { getInvoiceById } from "@/services/invoice.service";
import { failure, success } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireModuleAccess } from "@/lib/auth/authorization";

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
    // --------------------------------------------------
    // AUTH
    // --------------------------------------------------

    const auth = await requireAuth(request);

    await requireModuleAccess(auth, "INVOICES");

    // --------------------------------------------------
    // TENANT
    // --------------------------------------------------

    const adminId = auth.user.adminId ?? auth.user.id;

    if (!adminId) {
      return failure("Admin context not found.", 403, "ADMIN_CONTEXT_REQUIRED");
    }

    // --------------------------------------------------
    // PARAM
    // --------------------------------------------------

    const { invoiceId } = await params;

    if (!invoiceId) {
      return failure("Invoice ID is required.", 400, "INVOICE_ID_REQUIRED");
    }

    // --------------------------------------------------
    // CHECK INVOICE BELONGS TO ADMIN
    // --------------------------------------------------

    const invoice = await getInvoiceById(invoiceId, adminId);

    if (!invoice) {
      return failure("Invoice not found.", 404, "INVOICE_NOT_FOUND");
    }

    // --------------------------------------------------
    // SOFT DELETE
    //
    // IMPORTANT:
    // The UPDATE itself must ALSO contain the tenant
    // condition. Do not rely only on getInvoiceById().
    // --------------------------------------------------

    const [deletedInvoice] = await db
      .update(transactions)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(transactions.id, invoiceId),
          isNull(transactions.deletedAt),

          // IMPORTANT:
          // This condition must be added according to
          // how your invoice -> booking -> attraction
          // ownership is represented.
        ),
      )
      .returning({
        id: transactions.id,
        invoiceNumber: transactions.invoiceNumber,
        deletedAt: transactions.deletedAt,
      });

    if (!deletedInvoice) {
      return failure("Invoice not found.", 404, "INVOICE_NOT_FOUND");
    }

    // --------------------------------------------------
    // RESPONSE
    // --------------------------------------------------

    return success({
      message: "Invoice deleted successfully.",
      invoice: deletedInvoice,
    });
  } catch (error) {
    if (error instanceof Error) {
      // ===================================================
      // AUTHENTICATION
      // ===================================================

      if (error.message === "UNAUTHORIZED") {
        return failure("Authentication required.", 401, "UNAUTHORIZED");
      }

      // ===================================================
      // ACCOUNT STATUS
      // ===================================================

      if (error.message === "ACCOUNT_NOT_ACTIVE") {
        return failure("Account is not active.", 403, "ACCOUNT_NOT_ACTIVE");
      }

      // ===================================================
      // AUTHORIZATION
      // ===================================================

      if (
        error.message === "MODULE_ACCESS_DENIED" ||
        error.message === "FORBIDDEN"
      ) {
        return failure(
          "You do not have permission to access the invoices module.",
          403,
          "MODULE_ACCESS_DENIED",
        );
      }

      // ===================================================
      // ADMIN CONTEXT
      // ===================================================

      if (error.message === "ADMIN_CONTEXT_REQUIRED") {
        return failure(
          "Admin context not found.",
          403,
          "ADMIN_CONTEXT_REQUIRED",
        );
      }

      // ===================================================
      // INVOICE NOT FOUND
      // ===================================================

      if (
        error.message === "INVOICE_NOT_FOUND" ||
        error.message === "NOT_FOUND"
      ) {
        return failure("Invoice not found.", 404, "INVOICE_NOT_FOUND");
      }
    }

    console.error("Delete invoice error:", error);

    return failure("Unable to delete invoice.", 500, "INTERNAL_SERVER_ERROR");
  }
}
