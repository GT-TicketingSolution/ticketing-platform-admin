import { NextRequest } from "next/server";
import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { transactions } from "@/db/schema";

import { getInvoiceById } from "@/services/invoice.service";
import { failure, success } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/require-auth";

export async function GET(
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
    // AUTHENTICATION
    // --------------------------------------------------

    const auth = await requireAuth(request);

    if (auth.user.role !== "ADMIN" && auth.user.role !== "MANAGER") {
      return failure("Admin or manager access required.", 403, "FORBIDDEN");
    }

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
    // FETCH INVOICE
    // --------------------------------------------------

    const invoice = await getInvoiceById(invoiceId, adminId);

    if (!invoice) {
      return failure("Invoice not found.", 404, "INVOICE_NOT_FOUND");
    }

    // --------------------------------------------------
    // RESPONSE
    // --------------------------------------------------

    return success({
      invoice,
    });
  } catch (error) {
    console.error("Get invoice details error:", error);

    return failure("Unable to fetch invoice.", 500, "INTERNAL_SERVER_ERROR");
  }
}

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

    // Only ADMIN can delete.
    if (auth.user.role !== "ADMIN") {
      return failure("Admin access required.", 403, "FORBIDDEN");
    }

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
    console.error("Delete invoice error:", error);

    return failure("Unable to delete invoice.", 500, "INTERNAL_SERVER_ERROR");
  }
}
