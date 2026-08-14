import { eq } from "drizzle-orm";

import { db } from "@/db";
import { systemModules } from "@/db/schema";
import { success, failure } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/require-auth";

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);

    if (auth.user.role !== "ADMIN") {
      return failure("Admin access required.", 403, "FORBIDDEN");
    }

    const modules = await db
      .select({
        id: systemModules.id,
        key: systemModules.key,
        name: systemModules.name,
        description: systemModules.description,
        isActive: systemModules.isActive,
      })
      .from(systemModules)
      .where(eq(systemModules.isActive, "ACTIVE"))
      .orderBy(systemModules.name);

    return success(modules);
  } catch (error) {
    console.error("Get system modules error:", error);

    return failure(
      "Unable to fetch system modules.",
      500,
      "INTERNAL_SERVER_ERROR",
    );
  }
}
