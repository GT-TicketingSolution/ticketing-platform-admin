import { NextRequest } from "next/server";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";

import {
  bookings,
  attractions,
  attractionManagement,
  bookingCheckins,
  auditLogs,
  ticketScanLogs,
} from "@/db/schema";

import { requireAuth } from "@/lib/auth/require-auth";

import {
  requireModuleAccess,
  requireAttractionAccess,
  getAdminId,
} from "@/lib/auth/authorization";

import { success, failure } from "@/lib/api/response";

interface RouteContext {
  params: Promise<{
    ticketId: string;
  }>;
}

const REJECTION_REASONS = [
  "Date Mismatch / Expired Ticket",
  "Future Date Ticket (Not Valid Today)",
  "Already Used / Duplicate Entry Attempt",
  "Unrecognized / Fake QR Code",
  "Incorrect Gate / Venue Access",
  "Payment Disputed / Pending",
] as const;

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    // ---------------------------------------------
    // AUTH
    // ---------------------------------------------

    const auth = await requireAuth(request);

    await requireModuleAccess(auth, "SCANNER");

    const adminId = getAdminId(auth);

    // ---------------------------------------------
    // PARAMS
    // ---------------------------------------------

    const { ticketId } = await context.params;

    if (!ticketId?.trim()) {
      return failure("Ticket ID is required.", 400, "TICKET_ID_REQUIRED");
    }

    const normalizedTicketId = ticketId.trim();

    // ---------------------------------------------
    // BODY
    // ---------------------------------------------

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return failure("Invalid JSON request body.", 400, "INVALID_REQUEST_BODY");
    }

    const reason =
      typeof body === "object" &&
      body !== null &&
      "reason" in body &&
      typeof body.reason === "string"
        ? body.reason.trim()
        : "";

    if (!reason) {
      return failure(
        "Rejection reason is required.",
        400,
        "REJECTION_REASON_REQUIRED",
      );
    }

    if (
      !REJECTION_REASONS.includes(reason as (typeof REJECTION_REASONS)[number])
    ) {
      return failure(
        "Invalid rejection reason.",
        400,
        "INVALID_REJECTION_REASON",
      );
    }

    // ---------------------------------------------
    // FETCH BOOKING
    // ---------------------------------------------

    const [booking] = await db
      .select({
        id: bookings.id,
        bookingNumber: bookings.bookingNumber,

        customerName: bookings.customerName,
        mobileNumber: bookings.mobileNumber,

        attractionId: bookings.attractionId,

        visitAt: bookings.visitAt,

        status: bookings.status,

        totalAmount: bookings.totalAmount,
        amountPaid: bookings.amountPaid,
      })
      .from(bookings)
      .innerJoin(attractions, eq(attractions.id, bookings.attractionId))
      .where(
        and(
          eq(bookings.bookingNumber, normalizedTicketId),
          eq(attractions.adminId, adminId),
          eq(bookings.isDeleted, false),
        ),
      )
      .limit(1);

    if (!booking) {
      return failure("Ticket not found.", 404, "TICKET_NOT_FOUND");
    }

    // ---------------------------------------------
    // ATTRACTION ACCESS
    // ---------------------------------------------

    try {
      await requireAttractionAccess(auth, booking.attractionId);
    } catch (error) {
      if (error instanceof Error && error.message === "FORBIDDEN") {
        return failure(
          "Ticket not found or access denied.",
          404,
          "TICKET_NOT_FOUND",
        );
      }

      throw error;
    }

    // ---------------------------------------------
    // ALREADY CHECKED IN
    // ---------------------------------------------

    const [existingCheckin] = await db
      .select({
        id: bookingCheckins.id,
        checkedInAt: bookingCheckins.checkedInAt,
      })
      .from(bookingCheckins)
      .where(eq(bookingCheckins.bookingId, booking.id))
      .limit(1);

    if (existingCheckin) {
      return failure(
        "This ticket has already been admitted and cannot be rejected.",
        409,
        "TICKET_ALREADY_USED",
      );
    }

    // ---------------------------------------------
    // CANCELLED BOOKING
    // ---------------------------------------------

    if (booking.status === "CANCELLED") {
      return failure(
        "This booking is already cancelled.",
        400,
        "TICKET_CANCELLED",
      );
    }

    // ---------------------------------------------
    // RECORD REJECTION
    // ---------------------------------------------

    const rejectedAt = new Date();
    await db.insert(ticketScanLogs).values({
      bookingId: booking.id,
      scannedCode: booking.bookingNumber,
      visitorsCount: 0,
      verdict: "DENIED",
      reason,
      scannedAt: rejectedAt,
      scannedBy: auth.user.id,
    });

    await db.insert(auditLogs).values({
      userId: auth.user.id,

      action: "TICKET_REJECTED",

      entity: "BOOKING",

      entityId: booking.id,

      metadata: JSON.stringify({
        bookingNumber: booking.bookingNumber,

        attractionId: booking.attractionId,

        reason,

        rejectedAt: rejectedAt.toISOString(),
      }),
    });

    // ---------------------------------------------
    // ATTRACTION
    // ---------------------------------------------

    const [attraction] = await db
      .select({
        id: attractions.id,
        name: attractions.name,
      })
      .from(attractions)
      .innerJoin(
        attractionManagement,
        eq(attractionManagement.attractionId, attractions.id),
      )
      .where(
        and(
          eq(attractions.id, booking.attractionId),
          eq(attractions.adminId, adminId),
          eq(attractionManagement.adminId, adminId),
        ),
      )
      .limit(1);

    // ---------------------------------------------
    // RESPONSE
    // ---------------------------------------------

    return success(
      {
        rejection: {
          ticketId: booking.bookingNumber,

          bookingId: booking.id,

          visitorName: booking.customerName,

          mobileNumber: booking.mobileNumber,

          attraction: attraction
            ? {
                id: attraction.id,
                name: attraction.name,
              }
            : null,

          status: "rejected",

          verdict: "Denied",

          reason,

          rejectedAt,

          rejectedBy: auth.user.id,
        },
      },
      200,
    );
  } catch (error) {
    console.error("Reject scanner ticket error:", error);

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
        "You do not have permission to reject tickets.",
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

    return failure("Unable to reject ticket.", 500, "INTERNAL_SERVER_ERROR");
  }
}
