import { NextRequest } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { attractionSeats, seatBookingHistory, seatLayouts } from "@/db/schema";

import { failure, success } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireModuleAccess } from "@/lib/auth/authorization";

const attractionTripSeatsSchema = z.object({
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
    const auth = await requireAuth(request);

    await requireModuleAccess(auth, "TICKET_BOOKING");

    // --------------------------------------------------
    // Parse request body
    // --------------------------------------------------

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

    // --------------------------------------------------
    // Validate request body
    // --------------------------------------------------

    const validation = attractionTripSeatsSchema.safeParse(body);

    if (!validation.success) {
      return failure(
        validation.error.issues[0]?.message ?? "Invalid request data",
        400,
        "VALIDATION_ERROR",
      );
    }

    const { attractions } = validation.data;

    const attractionIds = [
      ...new Set(attractions.map((item) => item.attractionId)),
    ];

    // --------------------------------------------------
    // 1. Get active attraction seats
    // --------------------------------------------------

    const attractionSeatRows = await db
      .select({
        id: attractionSeats.id,
        attractionId: attractionSeats.attractionId,
        seatLayoutId: attractionSeats.seatLayoutId,
        name: attractionSeats.name,
        seatOrder: attractionSeats.seatOrder,
        isActive: attractionSeats.isActive,
      })
      .from(attractionSeats)
      .where(
        and(
          inArray(attractionSeats.attractionId, attractionIds),
          eq(attractionSeats.isActive, true),
        ),
      );

    // --------------------------------------------------
    // Group attraction seats by attraction
    // --------------------------------------------------

    const attractionSeatMap = new Map<string, typeof attractionSeatRows>();

    for (const row of attractionSeatRows) {
      const existing = attractionSeatMap.get(row.attractionId) ?? [];

      existing.push(row);

      attractionSeatMap.set(row.attractionId, existing);
    }

    // --------------------------------------------------
    // Check every attraction has an active seat
    // --------------------------------------------------

    for (const attractionId of attractionIds) {
      const seats = attractionSeatMap.get(attractionId);

      if (!seats || seats.length === 0) {
        return failure(
          `No active attraction seats found for attraction ${attractionId}`,
          404,
          "ATTRACTION_SEAT_NOT_FOUND",
        );
      }
    }

    // --------------------------------------------------
    // 2. Get seat layout IDs
    // --------------------------------------------------

    const seatLayoutIds = [
      ...new Set(attractionSeatRows.map((seat) => seat.seatLayoutId)),
    ];

    // --------------------------------------------------
    // 3. Get ACTIVE seat layouts
    // --------------------------------------------------

    const seatLayoutRows = await db
      .select({
        id: seatLayouts.id,
        name: seatLayouts.name,
        rows: seatLayouts.rows,
        cols: seatLayouts.cols,
        hasAisle: seatLayouts.hasAisle,
        aisleAfterCol: seatLayouts.aisleAfterCol,
        aisleAfterRow: seatLayouts.aisleAfterRow,
      })
      .from(seatLayouts)
      .where(
        and(
          inArray(seatLayouts.id, seatLayoutIds),
          eq(seatLayouts.status, "ACTIVE"),
        ),
      );

    const seatLayoutMap = new Map(
      seatLayoutRows.map((layout) => [layout.id, layout]),
    );

    // --------------------------------------------------
    // Check every attraction has an ACTIVE seat layout
    // --------------------------------------------------

    for (const attractionId of attractionIds) {
      const seats = attractionSeatMap.get(attractionId)!;

      for (const seat of seats) {
        if (!seatLayoutMap.has(seat.seatLayoutId)) {
          return failure(
            `Assigned seat layout is not active for attraction ${attractionId}`,
            404,
            "SEAT_LAYOUT_NOT_ACTIVE",
          );
        }
      }
    }

    // --------------------------------------------------
    // 4. Get booked seats
    //
    // We query bookings for all requested attractions.
    // attractionSeatId comes from the database, NOT payload.
    // --------------------------------------------------

    const bookedSeatRows = await db
      .select({
        attractionId: seatBookingHistory.attractionId,
        tripNo: seatBookingHistory.tripNo,
        attractionSeatId: seatBookingHistory.attractionSeatId,
        seatNo: seatBookingHistory.seatNo,
      })
      .from(seatBookingHistory)
      .where(inArray(seatBookingHistory.attractionId, attractionIds));

    // --------------------------------------------------
    // Group booked seat numbers by:
    //
    // attractionId + tripNo + attractionSeatId
    // --------------------------------------------------

    const bookedSeatsMap = new Map<string, number[]>();

    for (const booking of bookedSeatRows) {
      const key = [
        booking.attractionId,
        booking.tripNo,
        booking.attractionSeatId,
      ].join(":");

      const existing = bookedSeatsMap.get(key) ?? [];

      existing.push(booking.seatNo);

      bookedSeatsMap.set(key, existing);
    }

    // --------------------------------------------------
    // 5. Build response
    // --------------------------------------------------

    const data = attractions.map((item) => {
      const attractionSeatsForAttraction = attractionSeatMap.get(
        item.attractionId,
      )!;

      const firstSeat = attractionSeatsForAttraction[0];

      const seatLayout = seatLayoutMap.get(firstSeat.seatLayoutId)!;

      return {
        attractionId: item.attractionId,
        currentTripNo: item.currentTripNo,

        seatLayout: {
          seatLayoutId: seatLayout.id,
          name: seatLayout.name,
          rows: seatLayout.rows,
          cols: seatLayout.cols,
          hasAisle: seatLayout.hasAisle,
          aisleAfterCol: seatLayout.aisleAfterCol,
          aisleAfterRow: seatLayout.aisleAfterRow,

          // --------------------------------------------------
          // Every attractionSeat gets its own bookedSeats
          // --------------------------------------------------

          seats: attractionSeatsForAttraction.map((seat) => {
            const key = [item.attractionId, item.currentTripNo, seat.id].join(
              ":",
            );

            return {
              attractionSeatId: seat.id,
              name: seat.name,
              seatOrder: seat.seatOrder,
              bookedSeats: bookedSeatsMap.get(key) ?? [],
            };
          }),
        },
      };
    });

    return success(data);
  } catch (error) {
    console.error(
      "POST /api/admin/ticketing-booking/attraction-trip-seat-availability error:",
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
      "Unable to fetch seat availability",
      500,
      "INTERNAL_SERVER_ERROR",
    );
  }
}
