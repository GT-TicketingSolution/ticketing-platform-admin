import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { attractionManagement, attractions } from "@/db/schema";

import { success, failure } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/require-auth";
import {
  requireModuleAccess,
  getAccessibleAttractionIds,
} from "@/lib/auth/authorization";

// =====================================================
// UPDATE ATTRACTION
// =====================================================

export async function PATCH(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const auth = await requireAuth(request);

    await requireModuleAccess(auth, "ATTRACTION_MANAGEMENT");

    const { id } = await context.params;

    const body = await request.json();

    // =====================================
    // Check ownership/access
    // =====================================

    let existing;

    if (auth.user.role === "ADMIN") {
      existing = await db.query.attractionManagement.findFirst({
        where: and(
          eq(attractionManagement.id, id),
          eq(attractionManagement.adminId, auth.user.id),
        ),
      });
    } else {
      const ids = await getAccessibleAttractionIds(auth);

      existing = await db.query.attractionManagement.findFirst({
        where: and(
          eq(attractionManagement.id, id),
          inArray(attractionManagement.attractionId, ids),
        ),
      });
    }

    if (!existing) {
      return failure("Access denied", 403, "FORBIDDEN");
    }

    // =====================================
    // UPDATE MAIN ATTRACTION
    // =====================================

    await db
      .update(attractions)
      .set({
        name: body.name,

        type: body.category,

        updatedAt: new Date(),
      })
      .where(eq(attractions.id, existing.attractionId));

    // =====================================
    // UPDATE MANAGEMENT DATA
    // =====================================

    const updated = await db
      .update(attractionManagement)
      .set({
        image: body.image,

        description: body.description,

        timing: body.timing,

        adultPrice: body.adultPrice,

        childPrice: body.childPrice,

        studentPrice: body.studentPrice,

        seniorPrice: body.seniorPrice,

        foreignerPrice: body.foreignerPrice,

        hasSeating: body.hasSeating,

        updatedAt: new Date(),
      })
      .where(eq(attractionManagement.id, id))
      .returning();

    return success(updated[0]);
  } catch (error) {
    if (error instanceof Error) {
      // Authentication
      if (error.message === "UNAUTHORIZED") {
        return failure("Authentication required.", 401, "UNAUTHORIZED");
      }

      // Account inactive
      if (error.message === "ACCOUNT_NOT_ACTIVE") {
        return failure("Account is not active.", 403, "ACCOUNT_NOT_ACTIVE");
      }

      // Module authorization
      if (error.message === "FORBIDDEN") {
        return failure(
          "You are not authorized to access attraction management.",
          403,
          "FORBIDDEN",
        );
      }
    }

    return failure(
      "Unable to update attraction.",
      500,
      "INTERNAL_SERVER_ERROR",
    );
  }
}

// =====================================================
// DELETE ATTRACTION
// =====================================================

export async function DELETE(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const auth = await requireAuth(request);

    await requireModuleAccess(auth, "ATTRACTION_MANAGEMENT");

    const { id } = await context.params;

    // =====================================
    // FIND AND CHECK ACCESS
    // =====================================

    let existing;

    // ============================
    // ADMIN
    // ============================

    if (auth.user.role === "ADMIN") {
      existing = await db.query.attractionManagement.findFirst({
        where: and(
          eq(attractionManagement.id, id),
          eq(attractionManagement.adminId, auth.user.id),
        ),
      });
    }

    // ============================
    // MANAGER / STAFF
    // ============================
    else {
      const allowedIds = await getAccessibleAttractionIds(auth);

      if (!allowedIds.length) {
        return failure("Access denied", 403, "FORBIDDEN");
      }

      existing = await db.query.attractionManagement.findFirst({
        where: and(
          eq(attractionManagement.id, id),
          inArray(attractionManagement.attractionId, allowedIds),
        ),
      });
    }

    if (!existing) {
      return failure("Attraction not found or access denied", 403, "FORBIDDEN");
    }

    // =====================================
    // DELETE BOTH TABLES ATOMICALLY
    // =====================================

    await db.transaction(async (tx) => {
      // Delete management details first
      await tx
        .delete(attractionManagement)
        .where(eq(attractionManagement.id, id));

      // Delete main attraction
      await tx
        .delete(attractions)
        .where(eq(attractions.id, existing.attractionId));
    });

    return success({
      message: "Attraction deleted successfully",
    });
  } catch (error) {
    if (error instanceof Error) {
      // Authentication
      if (error.message === "UNAUTHORIZED") {
        return failure("Authentication required.", 401, "UNAUTHORIZED");
      }

      // Account inactive
      if (error.message === "ACCOUNT_NOT_ACTIVE") {
        return failure("Account is not active.", 403, "ACCOUNT_NOT_ACTIVE");
      }

      // Module authorization
      if (error.message === "FORBIDDEN") {
        return failure(
          "You are not authorized to access attraction management.",
          403,
          "FORBIDDEN",
        );
      }
    }

    return failure(
      "Unable to delete attraction.",
      500,
      "INTERNAL_SERVER_ERROR",
    );
  }
}
