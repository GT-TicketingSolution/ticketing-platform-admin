import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { attractionManagement } from "@/db/schema";

import { success, failure } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/require-auth";
import { getAccessibleAttractionIds } from "@/lib/auth/authorization";

export async function PATCH(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const auth = await requireAuth(request);

    const { id } = await context.params;

    const body = await request.json();

    const { seatLayoutId } = body;

    if (!seatLayoutId) {
      return failure("Seat layout id required", 400, "VALIDATION_ERROR");
    }

    // ============================
    // ACCESS CHECK
    // ============================

    let allowed = false;

    if (auth.user.role === "ADMIN") {
      const record = await db.query.attractionManagement.findFirst({
        where: and(
          eq(attractionManagement.id, id),

          eq(attractionManagement.adminId, auth.user.id),
        ),
      });

      allowed = !!record;
    } else {
      const ids = await getAccessibleAttractionIds(auth);

      const record = await db.query.attractionManagement.findFirst({
        where: and(
          eq(attractionManagement.id, id),

          inArray(attractionManagement.attractionId, ids),
        ),
      });

      allowed = !!record;
    }

    if (!allowed) {
      return failure("Access denied", 403, "FORBIDDEN");
    }

    const updated = await db
      .update(attractionManagement)
      .set({
        seatLayoutId,

        hasSeating: true,

        updatedAt: new Date(),
      })
      .where(eq(attractionManagement.id, id))
      .returning();

    return success(updated[0]);
  } catch (error) {
    console.error("Seat allocation error:", error);

    return failure("Unable to allocate seat", 500, "INTERNAL_SERVER_ERROR");
  }
}
