import { NextRequest } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { staffCrowdMode, users } from "@/db/schema";
import { requireAuth } from "@/lib/auth/require-auth";
import { success, failure } from "@/lib/api/response";

/* =========================================================
   VALIDATION SCHEMA
========================================================= */

const toggleCrowdModeSchema = z.object({
  isEnabled: z.boolean(),
});

/* =========================================================
   PATCH /api/admin/staff/crowd-mode
   Enables or disables Crowd Mode for the authenticated staff member.
   - Staff identity is strictly derived from session (auth.user.id)
   - Checks whether admin has granted Crowd Mode permission (isAllowed)
   - Performs atomic upsert on staffCrowdMode
========================================================= */

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAuth(request);

    if (auth.user.role !== "STAFF") {
      return failure(
        "Only staff members can toggle crowd mode.",
        403,
        "FORBIDDEN",
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return failure("Invalid JSON body.", 400, "INVALID_JSON");
    }

    const parsed = toggleCrowdModeSchema.safeParse(body);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message || "Invalid request data.",
        400,
        "VALIDATION_ERROR",
      );
    }

    const { isEnabled } = parsed.data;
    const staffId = auth.user.id;

    // 1. Verify staff exists and is active
    const [staffUser] = await db
      .select({
        id: users.id,
        status: users.status,
      })
      .from(users)
      .where(and(eq(users.id, staffId), eq(users.isDeleted, false)))
      .limit(1);

    if (!staffUser) {
      return failure("Staff member not found.", 404, "STAFF_NOT_FOUND");
    }

    if (staffUser.status !== "ACTIVE") {
      return failure("Account is not active.", 403, "ACCOUNT_NOT_ACTIVE");
    }

    // 2. Check admin permission in staffCrowdMode
    const [currentMode] = await db
      .select({
        isAllowed: staffCrowdMode.isAllowed,
      })
      .from(staffCrowdMode)
      .where(eq(staffCrowdMode.staffId, staffId))
      .limit(1);

    // If no record exists or admin has not permitted crowd mode, block action
    if (!currentMode || !currentMode.isAllowed) {
      return failure(
        "Crowd mode is not permitted for your account by admin.",
        403,
        "CROWD_MODE_NOT_ALLOWED",
      );
    }

    // 3. Atomically update or insert crowd mode status
    const [updated] = await db
      .insert(staffCrowdMode)
      .values({
        staffId,
        isAllowed: true,
        isEnabled,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: staffCrowdMode.staffId,
        set: {
          isEnabled,
          updatedAt: new Date(),
        },
      })
      .returning({
        isAllowed: staffCrowdMode.isAllowed,
        isEnabled: staffCrowdMode.isEnabled,
        updatedAt: staffCrowdMode.updatedAt,
      });

    return success({
      crowdModeAllowed: updated.isAllowed,
      crowdModeEnabled: updated.isEnabled,
      message: `Crowd mode ${updated.isEnabled ? "enabled" : "disabled"} successfully.`,
    });
  } catch (error) {
    console.error("PATCH /api/admin/staff/crowd-mode error:", error);

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return failure("Authentication required.", 401, "UNAUTHORIZED");
    }

    return failure(
      "Unable to update crowd mode status.",
      500,
      "INTERNAL_SERVER_ERROR",
    );
  }
}
