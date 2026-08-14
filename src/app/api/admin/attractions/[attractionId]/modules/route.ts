import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { attractions, attractionModules } from "@/db/schema";
import { success, failure } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/require-auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ attractionId: string }> },
) {
  try {
    const auth = await requireAuth(request);

    if (auth.user.role !== "ADMIN") {
      return failure("Admin access required.", 403, "FORBIDDEN");
    }

    const { attractionId } = await params;

    // Check attraction exists
    const [attraction] = await db
      .select({
        id: attractions.id,
        name: attractions.name,
        type: attractions.type,
        status: attractions.status,
      })
      .from(attractions)
      .where(eq(attractions.id, attractionId))
      .limit(1);

    if (!attraction) {
      return failure("Attraction not found.", 404, "ATTRACTION_NOT_FOUND");
    }

    const modules = await db
      .select({
        id: attractionModules.id,
        attractionId: attractionModules.attractionId,
        key: attractionModules.key,
        name: attractionModules.name,
        description: attractionModules.description,
        isActive: attractionModules.isActive,
      })
      .from(attractionModules)
      .where(
        and(
          eq(attractionModules.attractionId, attractionId),
          eq(attractionModules.isActive, "ACTIVE"),
        ),
      )
      .orderBy(attractionModules.name);

    return success({
      attraction,
      modules,
    });
  } catch (error) {
    console.error("Get attraction modules error:", error);

    return failure(
      "Unable to fetch attraction modules.",
      500,
      "INTERNAL_SERVER_ERROR",
    );
  }
}
