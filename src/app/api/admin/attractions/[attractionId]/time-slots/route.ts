import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { attractions, attractionTimeSlots } from "@/db/schema";

import { success, failure } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/require-admin";

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

    const auth = await requireAdmin(request);

    const adminId = auth.adminId;

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
    // Verify attraction belongs to admin
    // ---------------------------------------------

    const [attraction] = await db
      .select({
        id: attractions.id,
        name: attractions.name,
        type: attractions.type,
        status: attractions.status,
      })
      .from(attractions)
      .where(
        and(eq(attractions.id, attractionId), eq(attractions.adminId, adminId)),
      )
      .limit(1);

    if (!attraction) {
      return failure("Attraction not found.", 404, "ATTRACTION_NOT_FOUND");
    }

    // ---------------------------------------------
    // Get time slots
    // ---------------------------------------------

    const timeSlots = await db
      .select({
        id: attractionTimeSlots.id,
        attractionId: attractionTimeSlots.attractionId,
        slotTime: attractionTimeSlots.slotTime,
        isActive: attractionTimeSlots.isActive,
        createdAt: attractionTimeSlots.createdAt,
        updatedAt: attractionTimeSlots.updatedAt,
      })
      .from(attractionTimeSlots)
      .where(eq(attractionTimeSlots.attractionId, attractionId))
      .orderBy(attractionTimeSlots.slotTime);

    // ---------------------------------------------
    // Response
    // ---------------------------------------------

    return success({
      attraction: {
        id: attraction.id,
        name: attraction.name,
        type: attraction.type,
        status: attraction.status,
      },

      timeSlots,
    });
  } catch (error) {
    console.error("Get attraction time slots error:", error);

    // ---------------------------------------------
    // Authentication errors
    // ---------------------------------------------

    if (error instanceof Error && error.message === "FORBIDDEN") {
      return failure("Admin access required.", 403, "FORBIDDEN");
    }

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return failure("Unauthorized.", 401, "UNAUTHORIZED");
    }

    // ---------------------------------------------
    // Internal error
    // ---------------------------------------------

    return failure(
      "Unable to fetch attraction time slots.",
      500,
      "INTERNAL_SERVER_ERROR",
    );
  }
}
