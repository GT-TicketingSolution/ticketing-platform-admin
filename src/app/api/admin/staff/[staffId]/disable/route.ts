import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema";

import { requireAuth } from "@/lib/auth/require-auth";
import { success, failure } from "@/lib/api/response";

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      staffId: string;
    }>;
  },
) {
  try {
    // ---------------------------------------------
    // Authentication
    // ---------------------------------------------
    const auth = await requireAuth(request);

    if (auth.user.role !== "ADMIN") {
      return failure("Admin access required.", 403, "FORBIDDEN");
    }

    // ---------------------------------------------
    // Get staff ID
    // ---------------------------------------------
    const { staffId } = await params;

    if (!staffId) {
      return failure("Staff ID is required.", 400, "STAFF_ID_REQUIRED");
    }

    // ---------------------------------------------
    // Disable staff
    // ---------------------------------------------
    const [staff] = await db
      .update(users)
      .set({
        status: "DISABLED",
        updatedAt: new Date(),
      })
      .where(and(eq(users.id, staffId), eq(users.role, "STAFF")))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        role: users.role,
        status: users.status,
        updatedAt: users.updatedAt,
      });

    // ---------------------------------------------
    // Staff not found
    // ---------------------------------------------
    if (!staff) {
      return failure("Staff not found.", 404, "STAFF_NOT_FOUND");
    }

    // ---------------------------------------------
    // Response
    // ---------------------------------------------
    return success({
      staff,
    });
  } catch (error) {
    console.error("Disable staff error:", error);

    return failure("Unable to disable staff.", 500, "INTERNAL_SERVER_ERROR");
  }
}
