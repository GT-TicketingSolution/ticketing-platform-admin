import { z } from "zod";

import { db } from "@/db";

import { references } from "@/db/schema";

import { and, eq } from "drizzle-orm";

import { success, failure } from "@/lib/api/response";

import { requireAuth } from "@/lib/auth/require-auth";

import { getAdminId } from "@/lib/auth/get-admin-id";

const updateReferenceSchema = z.object({
  referenceName: z.string().min(2).max(150),

  department: z.string().max(100).optional(),

  contactPerson: z.string().min(2).max(150),

  post: z.string().max(100).optional(),

  mobile: z.string().max(20),

  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

// =====================================
// UPDATE REFERENCE
// =====================================

export async function PATCH(
  request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  try {
    const auth = await requireAuth(request);

    if (!["ADMIN", "MANAGER", "STAFF"].includes(auth.user.role)) {
      return failure("Forbidden", 403, "FORBIDDEN");
    }

    const { id } = await context.params;

    const adminId = getAdminId(auth);

    const body = await request.json();

    const parsed = updateReferenceSchema.safeParse(body);

    if (!parsed.success) {
      return failure("Invalid reference data", 400, "VALIDATION_ERROR");
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

        post: parsed.data.post,

        mobile: parsed.data.mobile,

        status: parsed.data.status,

        updatedAt: new Date(),
      })
      .where(eq(references.id, id))
      .returning();

    return success(updated[0]);
  } catch (error) {
    console.error("Update reference error", error);

    return failure("Unable to update reference", 500, "INTERNAL_SERVER_ERROR");
  }
}

// =====================================
// SOFT DELETE REFERENCE
// =====================================

export async function DELETE(
  request: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  try {
    const auth = await requireAuth(request);

    if (!["ADMIN", "MANAGER", "STAFF"].includes(auth.user.role)) {
      return failure("Forbidden", 403, "FORBIDDEN");
    }

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
        deletedAt: new Date(),

        deletedBy: auth.user.id,

        isDeleted: true,

        updatedAt: new Date(),
      })
      .where(eq(references.id, id));

    return success({
      message: "Reference deleted successfully",
    });
  } catch (error) {
    console.error("Delete reference error", error);

    return failure("Unable to delete reference", 500, "INTERNAL_SERVER_ERROR");
  }
}
