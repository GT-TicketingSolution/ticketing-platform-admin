import { NextRequest } from "next/server";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { bookings, ticketPrintLogs } from "@/db/schema";
import { requireAuth } from "@/lib/auth/require-auth";
import { success, failure } from "@/lib/api/response";

/* =========================================================
   VALIDATION SCHEMA
========================================================= */

const printLogSchema = z.object({
  bookingId: z.string().uuid("Invalid booking ID format"),
});

/* =========================================================
   POST /api/admin/ticketing-booking/print-log
   Records every ticket print/reprint event.
   - Computes sequential printCount per booking
   - Automatically designates 1st as "INITIAL", subsequent as "REPRINT"
   - Identifies staff from authenticated session
   - Returns concise confirmation message
========================================================= */

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return failure("Invalid JSON body", 400, "INVALID_JSON");
    }

    const parsed = printLogSchema.safeParse(body);
    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message || "Invalid request data",
        400,
        "VALIDATION_ERROR",
      );
    }

    const { bookingId } = parsed.data;

    // 1. Verify that the booking exists and is not deleted
    const [booking] = await db
      .select({
        id: bookings.id,
      })
      .from(bookings)
      .where(and(eq(bookings.id, bookingId), eq(bookings.isDeleted, false)))
      .limit(1);

    if (!booking) {
      return failure("Booking not found", 404, "BOOKING_NOT_FOUND");
    }

    // 2. Determine previous print count to compute next count & print type
    const [lastLog] = await db
      .select({
        printCount: ticketPrintLogs.printCount,
      })
      .from(ticketPrintLogs)
      .where(eq(ticketPrintLogs.bookingId, bookingId))
      .orderBy(desc(ticketPrintLogs.printCount))
      .limit(1);

    const nextCount = (lastLog?.printCount ?? 0) + 1;
    const printType = nextCount === 1 ? "INITIAL" : "REPRINT";

    // 3. Record print log
    await db.insert(ticketPrintLogs).values({
      bookingId,
      printedBy: auth.user.id,
      printCount: nextCount,
      printType,
    });

    return success(
      {
        message: "Printed successfully",
      },
      201,
    );
  } catch (error) {
    console.error("POST /api/admin/ticketing-booking/print-log error:", error);

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return failure("Authentication required", 401, "UNAUTHORIZED");
    }

    return failure(
      "Unable to record print log",
      500,
      "PRINT_LOG_FAILED",
    );
  }
}
