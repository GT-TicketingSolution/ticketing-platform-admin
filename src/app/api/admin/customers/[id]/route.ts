import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { customers } from "@/db/schema";

import { success, failure } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/require-auth";
import { getAdminId } from "@/lib/auth/get-admin-id";
import { requireModuleAccess } from "@/lib/auth/authorization";

import { z } from "zod";

// =====================================================
// VALIDATION
// =====================================================

const updateCustomerSchema = z.object({
  name: z.string().min(2).max(150),

  mobile: z.string().max(20),

  gstn: z.string().max(20).optional(),
});

// =====================================================
// UPDATE CUSTOMER
// =====================================================

export async function PATCH(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const auth = await requireAuth(request);

    await requireModuleAccess(auth, "CUSTOMER_MANAGEMENT");

    const { id } = await context.params;

    const adminId = getAdminId(auth);

    const body = await request.json();

    const parsed = updateCustomerSchema.safeParse(body);

    if (!parsed.success) {
      return failure("Invalid customer data", 400, "VALIDATION_ERROR");
    }

    const existing = await db.query.customers.findFirst({
      where: and(eq(customers.id, id), eq(customers.isDeleted, false)),
    });

    if (!existing) {
      return failure("Customer not found", 404, "NOT_FOUND");
    }

    const updated = await db
      .update(customers)
      .set({
        name: parsed.data.name,

        mobile: parsed.data.mobile,

        gstn: parsed.data.gstn,

        updatedAt: new Date(),
      })
      .where(eq(customers.id, id))
      .returning();

    return success(updated[0]);
  } catch (error) {
    console.error("Update customer error:", error);

    // ---------------------------------------------
    // Authorization Errors
    // ---------------------------------------------

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return failure("Authentication required.", 401, "UNAUTHORIZED");
    }

    if (error instanceof Error && error.message === "ACCOUNT_NOT_ACTIVE") {
      return failure("Account is not active.", 403, "ACCOUNT_NOT_ACTIVE");
    }

    if (error instanceof Error && error.message === "FORBIDDEN") {
      return failure(
        "You do not have permission to access customer management.",
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

    return failure("Unable to update customer.", 500, "INTERNAL_SERVER_ERROR");
  }
}

// =====================================================
// SOFT DELETE CUSTOMER
// =====================================================

export async function DELETE(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const auth = await requireAuth(request);

    await requireModuleAccess(auth, "CUSTOMER_MANAGEMENT");

    const { id } = await context.params;

    const adminId = getAdminId(auth);

    const existing = await db.query.customers.findFirst({
      where: and(
        eq(customers.id, id),

        eq(customers.isDeleted, false),
      ),
    });

    if (!existing) {
      return failure("Customer not found", 404, "NOT_FOUND");
    }

    await db
      .update(customers)
      .set({
        isDeleted: true,

        deletedAt: new Date(),

        deletedBy: auth.user.id,

        updatedAt: new Date(),
      })
      .where(eq(customers.id, id));

    return success({
      message: "Customer deleted successfully",
    });
  } catch (error) {
    console.error("Update customer error:", error);

    // ---------------------------------------------
    // Authorization Errors
    // ---------------------------------------------

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return failure("Authentication required.", 401, "UNAUTHORIZED");
    }

    if (error instanceof Error && error.message === "ACCOUNT_NOT_ACTIVE") {
      return failure("Account is not active.", 403, "ACCOUNT_NOT_ACTIVE");
    }

    if (error instanceof Error && error.message === "FORBIDDEN") {
      return failure(
        "You do not have permission to access customer management.",
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

    return failure("Unable to update customer.", 500, "INTERNAL_SERVER_ERROR");
  }
}
