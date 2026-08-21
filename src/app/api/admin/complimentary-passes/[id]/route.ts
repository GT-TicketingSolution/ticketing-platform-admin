import { z } from "zod";

import { db } from "@/db";
import { complimentaryPasses } from "@/db/schema";

import { and, eq } from "drizzle-orm";

import { success, failure } from "@/lib/api/response";

import { requireAuth } from "@/lib/auth/require-auth";

import { getAdminId } from "@/lib/auth/get-admin-id";

const allowedRoles = ["ADMIN", "MANAGER", "STAFF"];

const updateSchema = z.object({
  visitorName: z.string().trim().min(1, "Visitor name is required"),

  mobile: z
    .string()
    .trim()
    .regex(/^[0-9]{10}$/, "Mobile number must be 10 digits"),

  attractionId: z.string().min(1, "Attraction is required"),

  visitors: z.number().int().positive("Visitors must be greater than 0"),

  referenceId: z.string().min(1, "Reference is required"),

  visitDate: z.string().min(1, "Visit date is required"),

  status: z.enum(["ACTIVE", "USED", "EXPIRED"]),
});

// =============================
// UPDATE PASS
// =============================

export async function PATCH(
  req: Request,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const auth = await requireAuth(req);

    if (!allowedRoles.includes(auth.user.role)) {
      return failure("Forbidden", 403, "FORBIDDEN");
    }

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

    const existing = await db.query.complimentaryPasses.findFirst({
      where: and(
        eq(complimentaryPasses.id, id),

        eq(complimentaryPasses.adminId, adminId),

        eq(complimentaryPasses.isDeleted, false),
      ),
    });

    if (!existing) {
      return failure("Pass not found", 404, "NOT_FOUND");
    }

    const updated = await db
      .update(complimentaryPasses)
      .set({
        visitorName: parsed.data.visitorName,

        mobile: parsed.data.mobile,

        attractionId: parsed.data.attractionId,

        visitors: parsed.data.visitors,

        referenceId: parsed.data.referenceId,

        visitDate: parsed.data.visitDate,

        status: parsed.data.status,

        updatedAt: new Date(),
      })
      .where(
        and(
          eq(complimentaryPasses.id, id),

          eq(complimentaryPasses.adminId, adminId),
        ),
      )
      .returning();

    return success(updated[0]);
  } catch (error) {
    console.error("Update complimentary pass error:", error);

    return failure("Unable to update pass", 500, "INTERNAL_SERVER_ERROR");
  }
}

// =============================
// SOFT DELETE PASS
// =============================

export async function DELETE(
  req: Request,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const auth = await requireAuth(req);

    if (!allowedRoles.includes(auth.user.role)) {
      return failure("Forbidden", 403, "FORBIDDEN");
    }

    const { id } = await context.params;

    const adminId = getAdminId(auth);

    const existing = await db.query.complimentaryPasses.findFirst({
      where: and(
        eq(complimentaryPasses.id, id),

        eq(complimentaryPasses.adminId, adminId),

        eq(complimentaryPasses.isDeleted, false),
      ),
    });

    if (!existing) {
      return failure("Pass not found", 404, "NOT_FOUND");
    }

    await db
      .update(complimentaryPasses)
      .set({
        deletedAt: new Date(),

        deletedBy: auth.user.id,

        isDeleted: true,

        updatedAt: new Date(),
      })
      .where(
        and(
          eq(complimentaryPasses.id, id),

          eq(complimentaryPasses.adminId, adminId),
        ),
      );

    return success({
      message: "Complimentary pass deleted successfully",
    });
  } catch (error) {
    console.error("Delete complimentary pass error:", error);

    return failure("Unable to delete pass", 500, "INTERNAL_SERVER_ERROR");
  }
}
