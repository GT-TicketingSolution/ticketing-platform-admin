import { NextRequest } from "next/server";

import { and, eq, sql } from "drizzle-orm";

import { db } from "@/db";

import {
  attractionTimeSlots,
  attractionSlotCapacities,
  bookingSeats,
  bookings,
} from "@/db/schema";

import { requireAuth } from "@/lib/auth/require-auth";

import {
  requireModuleAccess,
  requireAttractionAccess,
} from "@/lib/auth/authorization";

import { success, failure } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  try {
    // ---------------------------------------------
    // AUTHENTICATION
    // ---------------------------------------------

    const auth = await requireAuth(request);

    await requireModuleAccess(auth, "TICKET_BOOKING");

    // ---------------------------------------------
    // QUERY PARAMETERS
    // ---------------------------------------------

    const searchParams = request.nextUrl.searchParams;

    const attractionId = searchParams.get("attractionId");
    const date = searchParams.get("date");

    if (!attractionId) {
      return failure(
        "Attraction ID is required.",
        400,
        "ATTRACTION_ID_REQUIRED",
      );
    }

    if (!date) {
      return failure("Date is required.", 400, "DATE_REQUIRED");
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return failure("Date must be in YYYY-MM-DD format.", 400, "INVALID_DATE");
    }

    // ---------------------------------------------
    // ATTRACTION ACCESS
    // ---------------------------------------------

    try {
      await requireAttractionAccess(auth, attractionId);
    } catch (error) {
      if (error instanceof Error && error.message === "FORBIDDEN") {
        return failure(
          "Attraction not found or access denied.",
          404,
          "ATTRACTION_NOT_FOUND",
        );
      }

      throw error;
    }

    // ---------------------------------------------
    // FETCH SLOTS
    // ---------------------------------------------

    const rows = await db
      .select({
        id: attractionTimeSlots.id,
        slotTime: attractionTimeSlots.slotTime,
        isActive: attractionTimeSlots.isActive,
        capacity: attractionSlotCapacities.capacity,

        booked: sql<number>`
      COUNT(DISTINCT ${bookingSeats.id})
    `,
      })
      .from(attractionTimeSlots)

      .leftJoin(
        attractionSlotCapacities,
        and(
          eq(attractionSlotCapacities.timeSlotId, attractionTimeSlots.id),
          eq(attractionSlotCapacities.capacityDate, sql`${date}::date`),
        ),
      )

      .leftJoin(
        bookingSeats,
        and(
          eq(bookingSeats.slotId, attractionTimeSlots.id),
          eq(bookingSeats.visitDate, sql`${date}::date`),
        ),
      )

      .leftJoin(
        bookings,
        and(
          eq(bookings.id, bookingSeats.bookingId),
          eq(bookings.status, "CONFIRMED"),
        ),
      )

      .where(
        and(
          eq(attractionTimeSlots.attractionId, attractionId),
          eq(attractionTimeSlots.isActive, true),
        ),
      )

      .groupBy(
        attractionTimeSlots.id,
        attractionTimeSlots.slotTime,
        attractionTimeSlots.isActive,
        attractionSlotCapacities.capacity,
      )

      .orderBy(attractionTimeSlots.slotTime);

    // ---------------------------------------------
    // RESPONSE
    // ---------------------------------------------

    const slots = rows.map((row) => {
      const capacity = Number(row.capacity ?? 0);
      const booked = Number(row.booked ?? 0);

      const available = Math.max(0, capacity - booked);

      return {
        id: row.id,

        startTime: row.slotTime,

        displayTime: formatSlotTime(row.slotTime),

        capacity,

        booked,

        available,

        isActive: row.isActive,

        isFull: available === 0,
      };
    });

    return success({
      attractionId,

      date,

      slots,
    });
  } catch (error) {
    console.error("Get ticketing booking slots error:", error);

    // ---------------------------------------------
    // AUTH ERRORS
    // ---------------------------------------------

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return failure("Authentication required.", 401, "UNAUTHORIZED");
    }

    if (error instanceof Error && error.message === "ACCOUNT_NOT_ACTIVE") {
      return failure("Account is not active.", 403, "ACCOUNT_NOT_ACTIVE");
    }

    if (error instanceof Error && error.message === "FORBIDDEN") {
      return failure(
        "You do not have permission to access this attraction.",
        403,
        "FORBIDDEN",
      );
    }

    if (error instanceof Error && error.message === "USER_HAS_NO_ADMIN") {
      return failure(
        "User is not associated with an admin.",
        403,
        "USER_HAS_NO_ADMIN",
      );
    }

    return failure(
      "Unable to fetch attraction slots.",
      500,
      "INTERNAL_SERVER_ERROR",
    );
  }
}

/* =========================================================
   FORMAT SLOT TIME
========================================================= */

function formatSlotTime(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);

  const start = new Date();

  start.setHours(hours, minutes, 0, 0);

  const end = new Date(start);

  // Your UI currently uses 20-minute slots.
  end.setMinutes(end.getMinutes() + 20);

  return `${formatTime(start)} – ${formatTime(end)}`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}
