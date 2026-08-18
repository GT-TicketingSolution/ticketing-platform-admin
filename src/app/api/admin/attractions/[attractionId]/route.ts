import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { attractions } from "@/db/schema";

import { success, failure } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/require-auth";
import { hasAttractionAccess } from "@/lib/auth/authorization";

export async function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      attractionId: string;
    }>;
  },
) {
  try {
    // ---------------------------------------------
    // Authentication
    // ---------------------------------------------

    const auth = await requireAuth(request);

    // ---------------------------------------------
    // Attraction ID
    // ---------------------------------------------

    const { attractionId } = await params;

    if (!attractionId) {
      return failure(
        "Attraction ID is required.",
        400,
        "ATTRACTION_ID_REQUIRED",
      );
    }

    // ---------------------------------------------
    // Authorization
    // ---------------------------------------------

    const hasAccess = await hasAttractionAccess(auth, attractionId);

    if (!hasAccess) {
      return failure(
        "You do not have access to this attraction.",
        403,
        "FORBIDDEN",
      );
    }

    // ---------------------------------------------
    // Get attraction
    // ---------------------------------------------

    const [attraction] = await db
      .select({
        id: attractions.id,
        name: attractions.name,
        type: attractions.type,
        status: attractions.status,
        createdAt: attractions.createdAt,
        updatedAt: attractions.updatedAt,
      })
      .from(attractions)
      .where(eq(attractions.id, attractionId))
      .limit(1);

    // ---------------------------------------------
    // Attraction not found
    // ---------------------------------------------

    if (!attraction) {
      return failure("Attraction not found.", 404, "ATTRACTION_NOT_FOUND");
    }

    // ---------------------------------------------
    // Response
    // ---------------------------------------------

    return success({
      attraction,
    });
  } catch (error) {
    console.error("Get attraction details error:", error);

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return failure("Unauthorized.", 401, "UNAUTHORIZED");
    }

    if (error instanceof Error && error.message === "USER_HAS_NO_ADMIN") {
      return failure("User is not associated with an admin.", 403, "FORBIDDEN");
    }

    return failure(
      "Unable to fetch attraction details.",
      500,
      "INTERNAL_SERVER_ERROR",
    );
  }
}
