import { NextRequest } from "next/server";

import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db";

import {
  attractionManagement,
  seatLayouts,
  seatLayoutSeats,
  bookingSeats,
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
    // BASIC DATE VALIDATION
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
    // FETCH ATTRACTION SEAT CONFIGURATION
    // ---------------------------------------------

    const [attraction] = await db
      .select({
        attractionId: attractionManagement.attractionId,
        hasSeating: attractionManagement.hasSeating,
        seatLayoutId: attractionManagement.seatLayoutId,
      })
      .from(attractionManagement)
      .where(eq(attractionManagement.attractionId, attractionId))
      .limit(1);

    if (!attraction) {
      return failure(
        "Attraction configuration not found.",
        404,
        "ATTRACTION_CONFIGURATION_NOT_FOUND",
      );
    }

    // ---------------------------------------------
    // NO SEATING
    // ---------------------------------------------

    if (!attraction.hasSeating || !attraction.seatLayoutId) {
      return success({
        attractionId,
        slotId,
        date,
        hasSeating: false,
        layout: null,
        seats: [],
        occupiedSeats: [],
        availableSeats: 0,
        totalSeats: 0,
      });
    }

    // ---------------------------------------------
    // VERIFY SEAT LAYOUT
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
          eq(seatLayouts.id, attraction.seatLayoutId),
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
    // FETCH SEAT DEFINITIONS
    // ---------------------------------------------

    const seatRows = await db
      .select({
        id: seatLayoutSeats.id,
        rowNumber: seatLayoutSeats.rowNumber,
        colNumber: seatLayoutSeats.colNumber,
        bogie: seatLayoutSeats.bogie,
        seatNumber: seatLayoutSeats.seatNumber,
        isActive: seatLayoutSeats.isActive,
      })
      .from(seatLayoutSeats)
      .where(
        and(
          eq(seatLayoutSeats.seatLayoutId, layout.id),
          eq(seatLayoutSeats.isActive, true),
        ),
      )
      .orderBy(seatLayoutSeats.rowNumber, seatLayoutSeats.colNumber);

    // ---------------------------------------------
    // FETCH OCCUPIED SEATS
    // ---------------------------------------------

    const occupiedRows = await db
      .select({
        bogie: bookingSeats.bogie,
        seatNumber: bookingSeats.seatNumber,
      })
      .from(bookingSeats)
      .where(
        and(eq(bookingSeats.slotId, slotId), eq(bookingSeats.visitDate, date)),
      );

    // ---------------------------------------------
    // OCCUPIED SET
    // ---------------------------------------------

    const occupiedSet = new Set(
      occupiedRows.map((seat) => `${seat.bogie ?? ""}-${seat.seatNumber}`),
    );

    // ---------------------------------------------
    // BUILD SEAT RESPONSE
    // ---------------------------------------------

    const seats = seatRows.map((seat) => {
      const key = `${seat.bogie ?? ""}-${seat.seatNumber}`;

      const occupied = occupiedSet.has(key);

      return {
        id: seat.id,
        row: seat.rowNumber,
        column: seat.colNumber,
        bogie: seat.bogie,
        seatNumber: seat.seatNumber,
        status: occupied ? "occupied" : "available",
      };
    });

    const occupiedSeats = seats
      .filter((seat) => seat.status === "occupied")
      .map((seat) => ({
        bogie: seat.bogie,
        seatNumber: seat.seatNumber,
      }));

    const totalSeats = seats.length;

    const occupiedCount = occupiedSeats.length;

    const availableSeats = Math.max(0, totalSeats - occupiedCount);

    // ---------------------------------------------
    // GROUP BY BOGIE / SECTION
    // ---------------------------------------------

    const sectionMap = new Map<
      string,
      {
        name: string;
        bogie: string | null;
        totalSeats: number;
        occupiedSeats: string[];
        availableSeats: number;
        seats: typeof seats;
      }
    >();

    for (const seat of seats) {
      const sectionKey = seat.bogie ?? "DEFAULT";

      if (!sectionMap.has(sectionKey)) {
        sectionMap.set(sectionKey, {
          name: seat.bogie ? `Section ${seat.bogie}` : "Section A",
          bogie: seat.bogie,
          totalSeats: 0,
          occupiedSeats: [],
          availableSeats: 0,
          seats: [],
        });
      }

      const section = sectionMap.get(sectionKey)!;

      section.totalSeats += 1;
      section.seats.push(seat);

      if (seat.status === "occupied") {
        section.occupiedSeats.push(seat.seatNumber);
      } else {
        section.availableSeats += 1;
      }
    }

    const sections = Array.from(sectionMap.values());

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
