import { z } from "zod";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { references } from "@/db/schema";

import { success, failure } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/require-auth";
import { getAdminId } from "@/lib/auth/get-admin-id";

import { requireModuleAccess } from "@/lib/auth/authorization";

const updateSchema = z.object({
  referenceName: z.string().trim().min(1, "Reference name is required"),

  department: z.string().trim().min(1, "Department/Organization is required"),

  contactPerson: z.string().trim().min(1, "Contact person is required"),

  post: z.string().trim().optional(),

  mobile: z
    .string()
    .trim()
    .regex(/^[0-9]{10}$/, "Mobile number must be 10 digits"),

  status: z.enum(["ACTIVE", "INACTIVE"]),
});

// ======================================================
// UPDATE REFERENCE
// ======================================================

export async function PATCH(
  req: Request,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const auth = await requireAuth(req);

    await requireModuleAccess(auth, "COMPLIMENTARY_PASSES");

    const { id } = await context.params;

    const adminId = getAdminId(auth);

    const body = await req.json();

    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message || "Invalid data",
        400,
        "VALIDATION_ERROR",
      );
    }

    const existing = await db.query.references.findFirst({
      where: and(
        eq(references.id, id),

        eq(references.adminId, adminId),

        eq(references.isDeleted, false),
      ),
    });

    if (!existing) {
      return failure("Reference not found", 404, "NOT_FOUND");
    }

    const updated = await db
      .update(references)
      .set({
        referenceName: parsed.data.referenceName,

        department: parsed.data.department,

        contactPerson: parsed.data.contactPerson,

        post: parsed.data.post || null,

        mobile: parsed.data.mobile,

        status: parsed.data.status,

        updatedAt: new Date(),
      })
      .where(
        and(
          eq(references.id, id),

          eq(references.adminId, adminId),
        ),
      )
      .returning();

    return success(updated[0]);
  } catch (error) {
    // ==================================================
    // AUTH ERRORS
    // ==================================================

    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return failure("Authentication required.", 401, "UNAUTHORIZED");
      }

      if (error.message === "ACCOUNT_NOT_ACTIVE") {
        return failure("Account is not active.", 403, "ACCOUNT_NOT_ACTIVE");
      }

      if (error.message === "FORBIDDEN") {
        return failure(
          "You are not authorized to update references.",
          403,
          "FORBIDDEN",
        );
      }
    }

    // ==================================================
    // SERVER ERROR
    // ==================================================

    console.error("Update reference error:", error);

    return failure("Unable to update reference.", 500, "INTERNAL_SERVER_ERROR");
  }
}

// ======================================================
// DELETE REFERENCE
// ======================================================

export async function DELETE(
  req: Request,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const auth = await requireAuth(req);

    await requireModuleAccess(auth, "COMPLIMENTARY_PASSES");
    const { id } = await context.params;

    const adminId = getAdminId(auth);

    const existing = await db.query.references.findFirst({
      where: and(
        eq(references.id, id),

        eq(references.adminId, adminId),

        eq(references.isDeleted, false),
      ),
    });

    if (!existing) {
      return failure("Reference not found", 404, "NOT_FOUND");
    }

    await db
      .update(references)
      .set({
        isDeleted: true,

        deletedAt: new Date(),

        deletedBy: auth.user.id,

        updatedAt: new Date(),
      })
      .where(
        and(
          eq(references.id, id),

          eq(references.adminId, adminId),
        ),
      );

    return success({
      message: "Reference deleted successfully",
    });
  } catch (error) {
    // ==================================================
    // AUTH ERRORS
    // ==================================================

    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return failure("Authentication required.", 401, "UNAUTHORIZED");
      }

      if (error.message === "ACCOUNT_NOT_ACTIVE") {
        return failure("Account is not active.", 403, "ACCOUNT_NOT_ACTIVE");
      }

      if (error.message === "FORBIDDEN") {
        return failure(
          "You are not authorized to delete references.",
          403,
          "FORBIDDEN",
        );
      }
    }

    // ==================================================
    // SERVER ERROR
    // ==================================================

    console.error("Delete reference error:", error);

    return failure("Unable to delete reference.", 500, "INTERNAL_SERVER_ERROR");
  }
}
