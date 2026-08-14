import { eq } from "drizzle-orm";

import { db } from "@/db";
import { attractions } from "@/db/schema";
import { success, failure } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/require-auth";

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);

    if (auth.user.role !== "ADMIN") {
      return failure("Admin access required.", 403, "FORBIDDEN");
    }

    const result = await db
      .select({
        id: attractions.id,
        name: attractions.name,
        type: attractions.type,
        status: attractions.status,
      })
      .from(attractions)
      .where(eq(attractions.status, "ACTIVE"))
      .orderBy(attractions.name);

    return success(result);
  } catch (error) {
    console.error("Get attractions error:", error);

    return failure(
      "Unable to fetch attractions.",
      500,
      "INTERNAL_SERVER_ERROR",
    );
  }
}
