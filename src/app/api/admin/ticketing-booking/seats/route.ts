import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";

import {
  attractionManagement,
  attractionManagementSeatLayouts,
  seatLayouts,
  bookingSeats,
  bookings,
  attractionTimeSlots,
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
    const slotId = searchParams.get("slotId");
    const date = searchParams.get("date");

    if (!attractionId) {
      return failure(
        "Attraction ID is required.",
        400,
        "ATTRACTION_ID_REQUIRED",
      );
    }

    if (!slotId) {
      return failure("Slot ID is required.", 400, "SLOT_ID_REQUIRED");
    }

    if (!date) {
      return failure("Date is required.", 400, "DATE_REQUIRED");
    }

    // ---------------------------------------------
    // DATE VALIDATION
    // ---------------------------------------------

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
    // VERIFY SLOT
    // ---------------------------------------------

    const [slot] = await db
      .select({
        id: attractionTimeSlots.id,
      })
      .from(attractionTimeSlots)
      .where(
        and(
          eq(attractionTimeSlots.id, slotId),
          eq(attractionTimeSlots.attractionId, attractionId),
          eq(attractionTimeSlots.isActive, true),
        ),
      )
      .limit(1);

    if (!slot) {
      return failure("Slot not found or inactive.", 404, "SLOT_NOT_FOUND");
    }

    // ---------------------------------------------
    // FETCH ATTRACTION MANAGEMENT
    // ---------------------------------------------

    const [management] = await db
      .select({
        id: attractionManagement.id,
        attractionId: attractionManagement.attractionId,
        hasSeating: attractionManagement.hasSeating,
      })
      .from(attractionManagement)
      .where(eq(attractionManagement.attractionId, attractionId))
      .limit(1);

    if (!management) {
      return failure(
        "Attraction configuration not found.",
        404,
        "ATTRACTION_CONFIGURATION_NOT_FOUND",
      );
    }

    // ---------------------------------------------
    // NO SEATING
    // ---------------------------------------------

    if (!management.hasSeating) {
      return success({
        attractionId,
        slotId,
        date,

        hasSeating: false,

        layout: null,

        totalSeats: 0,
        occupiedCount: 0,
        availableSeats: 0,

        occupiedSeats: [],

        sections: [],
        seats: [],
      });
    }

    // ---------------------------------------------
    // FETCH SEAT LAYOUT MAPPING
    // ---------------------------------------------

    const [layoutMapping] = await db
      .select({
        seatLayoutId: attractionManagementSeatLayouts.seatLayoutId,
      })
      .from(attractionManagementSeatLayouts)
      .where(
        eq(
          attractionManagementSeatLayouts.attractionManagementId,
          management.id,
        ),
      )
      .limit(1);

    if (!layoutMapping) {
      return failure(
        "Seat layout configuration not found.",
        404,
        "SEAT_LAYOUT_CONFIGURATION_NOT_FOUND",
      );
    }

    // ---------------------------------------------
    // FETCH SEAT LAYOUT
    // ---------------------------------------------

    const [layout] = await db
      .select({
        id: seatLayouts.id,
        name: seatLayouts.name,
        rows: seatLayouts.rows,
        cols: seatLayouts.cols,
        hasAisle: seatLayouts.hasAisle,
        aisleAfterCol: seatLayouts.aisleAfterCol,
      })
      .from(seatLayouts)
      .where(
        and(
          eq(seatLayouts.id, layoutMapping.seatLayoutId),
          eq(seatLayouts.status, "ACTIVE"),
        ),
      )
      .limit(1);

    if (!layout) {
      return failure(
        "Active seat layout not found.",
        404,
        "SEAT_LAYOUT_NOT_FOUND",
      );
    }

    // ---------------------------------------------
    // GENERATED SEAT TYPE
    // ---------------------------------------------

    type GeneratedSeat = {
      id: string;
      row: number;
      column: number;
      bogie: string | null;
      seatNumber: string;
      status: "available" | "occupied";
    };

    // ---------------------------------------------
    // GENERATE SEATS
    // ---------------------------------------------

    const generatedSeats: GeneratedSeat[] = [];

    for (let row = 1; row <= layout.rows; row++) {
      for (let col = 1; col <= layout.cols; col++) {
        const rowLabel = String.fromCharCode(64 + row);

        const seatNumber = `${rowLabel}${col}`;

        generatedSeats.push({
          id: `${layout.id}-${row}-${col}`,
          row,
          column: col,
          bogie: null,
          seatNumber,
          status: "available",
        });
      }
    }

    // ---------------------------------------------
    // FETCH BOOKED SEATS
    //
    // IMPORTANT:
    //
    // booking_seats has a UNIQUE constraint:
    //
    // (slot_id, visit_date, bogie, seat_number)
    //
    // Therefore, if a booking_seats row exists,
    // that seat cannot be booked again.
    //
    // We therefore use booking_seats itself as the
    // source of truth for seat availability.
    //
    // Existing booking_seats row -> OCCUPIED
    // No booking_seats row        -> AVAILABLE
    //
    // This also handles PENDING bookings correctly.
    // ---------------------------------------------

    const bookingSeatRows = await db
      .select({
        slotId: bookingSeats.slotId,
        visitDate: bookingSeats.visitDate,
        bogie: bookingSeats.bogie,
        seatNumber: bookingSeats.seatNumber,
        bookingId: bookingSeats.bookingId,
        bookingStatus: bookings.status,
        paymentExpiresAt: bookings.paymentExpiresAt,
      })
      .from(bookingSeats)
      .innerJoin(bookings, eq(bookingSeats.bookingId, bookings.id))
      .where(
        and(eq(bookingSeats.slotId, slotId), eq(bookingSeats.visitDate, date)),
      );

    // ---------------------------------------------
    // OCCUPIED SET
    // ---------------------------------------------

    const occupiedSet = new Set<string>();

    const now = new Date();

    for (const bookingSeat of bookingSeatRows) {
      const status = String(bookingSeat.bookingStatus).toUpperCase();

      // CONFIRMED booking = occupied
      if (
        status === "CONFIRMED" ||
        status === "COMPLETED" ||
        status === "PAID"
      ) {
        occupiedSet.add(bookingSeat.seatNumber);
        continue;
      }

      // PENDING booking:
      // only occupy/lock the seat while payment window is active.
      if (status === "PENDING") {
        if (
          bookingSeat.paymentExpiresAt &&
          new Date(bookingSeat.paymentExpiresAt) > now
        ) {
          occupiedSet.add(bookingSeat.seatNumber);
        }

        // If paymentExpiresAt has passed,
        // do NOT add the seat.
        // It becomes available.
        continue;
      }

      // CANCELLED / EXPIRED / FAILED
      // Do nothing -> seat remains available.
    }

    // ---------------------------------------------
    // DEBUG
    // ---------------------------------------------

    // ---------------------------------------------
    // APPLY STATUS TO GENERATED SEATS
    // ---------------------------------------------

    const seats = generatedSeats.map((seat) => {
      const seatNumber = seat.seatNumber;

      // -------------------------------------------
      // OCCUPIED
      // -------------------------------------------

      if (occupiedSet.has(seatNumber)) {
        return {
          ...seat,
          status: "occupied" as const,
        };
      }

      // -------------------------------------------
      // AVAILABLE
      // -------------------------------------------

      return {
        ...seat,
        status: "available" as const,
      };
    });

    // ---------------------------------------------
    // OCCUPIED SEATS
    // ---------------------------------------------

    const occupiedSeats = seats
      .filter((seat) => seat.status === "occupied")
      .map((seat) => ({
        bogie: seat.bogie,
        seatNumber: seat.seatNumber,
      }));

    // ---------------------------------------------
    // COUNTS
    // ---------------------------------------------

    const totalSeats = seats.length;

    const occupiedCount = occupiedSeats.length;

    const availableSeats = Math.max(0, totalSeats - occupiedCount);

    // ---------------------------------------------
    // SECTION
    // ---------------------------------------------

    const sections = [
      {
        name: "Section A",

        bogie: null,

        totalSeats,

        occupiedSeats: occupiedSeats.map((seat) => seat.seatNumber),

        availableSeats,

        seats,
      },
    ];

    // ---------------------------------------------
    // RESPONSE
    // ---------------------------------------------

    return success({
      attractionId,

      slotId,

      date,

      hasSeating: true,

      layout: {
        id: layout.id,
        name: layout.name,
        rows: layout.rows,
        cols: layout.cols,
        hasAisle: layout.hasAisle,
        aisleAfterCol: layout.aisleAfterCol,
      },

      totalSeats,

      occupiedCount,

      availableSeats,

      occupiedSeats,

      sections,

      seats,
    });
  } catch (error) {
    console.error("Get ticketing booking seats error:", error);

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

    return failure("Unable to fetch seats.", 500, "INTERNAL_SERVER_ERROR");
  }
}
