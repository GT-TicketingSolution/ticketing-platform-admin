import { NextRequest } from "next/server";
import { z } from "zod";
import { inArray, max } from "drizzle-orm";

import { db } from "@/db";
import { seatBookingHistory } from "@/db/schema";

import { failure, success } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireModuleAccess } from "@/lib/auth/authorization";

const attractionTripNoSchema = z.object({
  attractions: z
    .array(
      z.object({
        attractionId: z.string().uuid("Invalid attraction ID"),
        currentTripNo: z
          .number()
          .int("Current trip number must be an integer")
          .nonnegative("Current trip number cannot be negative"),
      }),
    )
    .min(1, "At least one attraction is required"),
});

export async function POST(request: NextRequest) {
  try {
    // Authentication
    const auth = await requireAuth(request);

    // Authorization
    await requireModuleAccess(auth, "TICKET_BOOKING");

    // Parse request body
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return failure(
        "Request body must contain valid JSON",
        400,
        "INVALID_JSON",
      );
    }

    // Validate request body
    const validation = attractionTripNoSchema.safeParse(body);

    if (!validation.success) {
      const firstError = validation.error.issues[0];

      return failure(
        firstError?.message ?? "Invalid request data",
        400,
        "VALIDATION_ERROR",
      );
    }

    const { attractions } = validation.data;

    // Remove duplicate attraction IDs
    const attractionIds = [
      ...new Set(attractions.map((item) => item.attractionId)),
    ];

    // Get maximum trip number for every requested attraction
    const maxTripNumbers = await db
      .select({
        attractionId: seatBookingHistory.attractionId,
        maxTripNo: max(seatBookingHistory.tripNo),
      })
      .from(seatBookingHistory)
      .where(inArray(seatBookingHistory.attractionId, attractionIds))
      .groupBy(seatBookingHistory.attractionId);

    const maxTripNoMap = new Map(
      maxTripNumbers.map((item) => [item.attractionId, item.maxTripNo]),
    );

    // Build response
    const data = attractions.map((item) => ({
      attractionId: item.attractionId,
      currentTripNo: item.currentTripNo,
      newTripNo: maxTripNoMap.get(item.attractionId) ?? 1,
    }));

    return success(data);
  } catch (error) {
    console.error(
      "POST /api/admin/ticketing-booking/attraction-trip-no error:",
      error,
    );

    if (
      error &&
      typeof error === "object" &&
      "status" in error &&
      "code" in error
    ) {
      const err = error as {
        status: number;
        code: string;
        message?: string;
      };

      return failure(err.message ?? "Request failed", err.status, err.code);
    }

    return failure(
      "Unable to fetch attraction trip numbers",
      500,
      "INTERNAL_SERVER_ERROR",
    );
  }
}
