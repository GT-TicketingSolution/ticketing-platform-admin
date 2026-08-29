import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { attractionManagement, attractions } from "@/db/schema";

import { success, failure } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/require-auth";
import {
  requireModuleAccess,
  getAccessibleAttractionIds,
} from "@/lib/auth/authorization";
import {
  getLegacySeatLayoutId,
  replaceAttractionSeatLayouts,
  resolveSeatLayoutIds,
  validateSeatLayoutsForAdmin,
} from "@/services/attraction-management.service";

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
    // Seat layouts (optional on PATCH)
    // - If seatLayoutIds provided OR seating disabled → sync junction + legacy
    // - Otherwise leave existing seat mappings untouched
    // =====================================

    const shouldSyncSeatLayouts =
      body.seatLayoutIds !== undefined || body.hasSeating === false;

    let uniqueSeatLayoutIds: string[] | null = null;

    if (shouldSyncSeatLayouts) {
      const hasSeating = Boolean(
        body.hasSeating ??
          (Array.isArray(body.seatLayoutIds) &&
            body.seatLayoutIds.length > 0),
      );

      const resolvedSeatLayouts = resolveSeatLayoutIds({
        hasSeating,
        seatLayoutIds: body.seatLayoutIds,
      });

      if (!resolvedSeatLayouts.ok) {
        return failure(
          resolvedSeatLayouts.message,
          400,
          "VALIDATION_ERROR",
        );
      }

      uniqueSeatLayoutIds = resolvedSeatLayouts.ids;

      const seatLayoutOwnership = await validateSeatLayoutsForAdmin(
        db,
        existing.adminId,
        uniqueSeatLayoutIds,
      );

      if (!seatLayoutOwnership.ok) {
        return failure(
          seatLayoutOwnership.message,
          400,
          "VALIDATION_ERROR",
        );
      }
    }

    const result = await db.transaction(async (tx) => {
      // =====================================
      // UPDATE MAIN ATTRACTION
      // =====================================

      if (body.name !== undefined || body.category !== undefined) {
        await tx
          .update(attractions)
          .set({
            ...(body.name !== undefined ? { name: body.name } : {}),
            ...(body.category !== undefined ? { type: body.category } : {}),
            updatedAt: new Date(),
          })
          .where(eq(attractions.id, existing.attractionId));
      }

      // =====================================
      // UPDATE MANAGEMENT DATA
      // =====================================

      const managementUpdate: Partial<typeof attractionManagement.$inferInsert> =
        {
          updatedAt: new Date(),
        };

      if (body.image !== undefined) managementUpdate.image = body.image;
      if (body.description !== undefined) {
        managementUpdate.description = body.description;
      }
      if (body.timing !== undefined) managementUpdate.timing = body.timing;
      if (body.adultPrice !== undefined) {
        managementUpdate.adultPrice = body.adultPrice;
      }
      if (body.childPrice !== undefined) {
        managementUpdate.childPrice = body.childPrice;
      }
      if (body.studentPrice !== undefined) {
        managementUpdate.studentPrice = body.studentPrice;
      }
      if (body.seniorPrice !== undefined) {
        managementUpdate.seniorPrice = body.seniorPrice;
      }
      if (body.foreignerPrice !== undefined) {
        managementUpdate.foreignerPrice = body.foreignerPrice;
      }
      if (body.hasSeating !== undefined) {
        managementUpdate.hasSeating = Boolean(body.hasSeating);
      }

      if (uniqueSeatLayoutIds !== null) {
        managementUpdate.seatLayoutId =
          getLegacySeatLayoutId(uniqueSeatLayoutIds);
        // Seating off + empty IDs already resolved; keep hasSeating consistent
        if (body.hasSeating === undefined) {
          managementUpdate.hasSeating = uniqueSeatLayoutIds.length > 0;
        }
      }

      const updated = await tx
        .update(attractionManagement)
        .set(managementUpdate)
        .where(eq(attractionManagement.id, id))
        .returning();

      let seatLayoutMappings:
        | Awaited<ReturnType<typeof replaceAttractionSeatLayouts>>
        | undefined;

      if (uniqueSeatLayoutIds !== null) {
        seatLayoutMappings = await replaceAttractionSeatLayouts(
          tx,
          id,
          uniqueSeatLayoutIds,
        );
      }

      return {
        management: updated[0],
        seatLayouts: seatLayoutMappings,
      };
    });

    // Preserve prior response shape (management row) and add seatLayouts when synced
    return success({
      ...result.management,
      ...(result.seatLayouts !== undefined
        ? { seatLayouts: result.seatLayouts }
        : {}),
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
      // (junction rows cascade via FK on attraction_management_id)
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
