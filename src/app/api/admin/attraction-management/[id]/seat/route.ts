import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { attractionManagement } from "@/db/schema";

import { success, failure } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/require-auth";
import {
  requireModuleAccess,
  getAccessibleAttractionIds,
} from "@/lib/auth/authorization";
import {
  getLegacySeatLayoutId,
  replaceAttractionSeatLayouts,
  validateSeatLayoutsForAdmin,
} from "@/services/attraction-management.service";

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

    const { seatLayoutId } = body;

    if (!seatLayoutId || typeof seatLayoutId !== "string") {
      return failure("Seat layout id required", 400, "VALIDATION_ERROR");
    }

    // ============================
    // ACCESS CHECK
    // ============================

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

    const ownership = await validateSeatLayoutsForAdmin(
      db,
      existing.adminId,
      [seatLayoutId],
    );

    if (!ownership.ok) {
      return failure(ownership.message, 400, "VALIDATION_ERROR");
    }

    const seatLayoutIds = [seatLayoutId];

    const updated = await db.transaction(async (tx) => {
      // Keep legacy column + hasSeating for ticket-booking attractions API
      const rows = await tx
        .update(attractionManagement)
        .set({
          seatLayoutId: getLegacySeatLayoutId(seatLayoutIds),
          hasSeating: true,
          updatedAt: new Date(),
        })
        .where(eq(attractionManagement.id, id))
        .returning();

      // Keep junction in sync for list + ticket-booking seats API
      const seatLayouts = await replaceAttractionSeatLayouts(tx, id, [
        { seatLayoutId, quantity: 1 },
      ]);

      return {
        management: rows[0],
        seatLayouts,
      };
    });

    return success({
      ...updated.management,
      seatLayouts: updated.seatLayouts,
    });
  } catch (error) {
    // =====================================
    // AUTHENTICATION ERROR
    // =====================================

    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return failure("Authentication required.", 401, "UNAUTHORIZED");
      }

      // =====================================
      // ACCOUNT STATUS ERROR
      // =====================================

      if (error.message === "ACCOUNT_NOT_ACTIVE") {
        return failure("Account is not active.", 403, "ACCOUNT_NOT_ACTIVE");
      }

      // =====================================
      // MODULE / ATTRACTION AUTHORIZATION
      // =====================================

      if (error.message === "FORBIDDEN") {
        return failure(
          "You are not authorized to access this resource.",
          403,
          "FORBIDDEN",
        );
      }
    }

    // =====================================
    // INTERNAL SERVER ERROR
    // =====================================

    return failure("Unable to allocate seat.", 500, "INTERNAL_SERVER_ERROR");
  }
}
