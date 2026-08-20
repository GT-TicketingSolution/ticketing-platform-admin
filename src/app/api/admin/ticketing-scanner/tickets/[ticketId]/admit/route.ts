import { NextRequest } from "next/server";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";

import {
  bookings,
  attractions,
  attractionManagement,
  bookingCheckins,
  auditLogs,
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

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    // ---------------------------------------------
    // AUTH
    // ---------------------------------------------

    const auth = await requireAuth(request);

    await requireModuleAccess(auth, "BOOKINGS");

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

        paymentMode: bookings.paymentMode,
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
    // BOOKING STATUS
    // ---------------------------------------------

    if (booking.status === "CANCELLED") {
      return failure(
        "Cancelled ticket cannot be admitted.",
        400,
        "TICKET_CANCELLED",
      );
    }

    if (booking.status !== "CONFIRMED") {
      return failure(
        "Only confirmed tickets can be admitted.",
        400,
        "TICKET_NOT_CONFIRMED",
      );
    }

    // ---------------------------------------------
    // DATE VALIDATION
    // ---------------------------------------------

    const now = new Date();

    const todayDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    const visitDate = new Date(booking.visitAt);

    const visitDateOnly = new Date(
      visitDate.getFullYear(),
      visitDate.getMonth(),
      visitDate.getDate(),
    );

    if (visitDateOnly < todayDate) {
      return failure(
        "This ticket has expired. Entry is only allowed for today's tickets.",
        400,
        "TICKET_EXPIRED",
      );
    }

    if (visitDateOnly > todayDate) {
      return failure(
        "This ticket is scheduled for a future date.",
        400,
        "FUTURE_TICKET",
      );
    }

    // ---------------------------------------------
    // PAYMENT VALIDATION
    // ---------------------------------------------

    const totalAmount = Number(booking.totalAmount ?? 0);

    const amountPaid = Number(booking.amountPaid ?? 0);

    if (amountPaid < totalAmount) {
      return failure(
        "Payment is pending. Ticket cannot be admitted.",
        400,
        "PAYMENT_PENDING",
      );
    }

    // ---------------------------------------------
    // CHECK-IN
    // ---------------------------------------------

    const checkedInAt = new Date();

    const result = await db.transaction(async (tx) => {
      // Check duplicate admission
      const [existingCheckin] = await tx
        .select({
          id: bookingCheckins.id,
          checkedInAt: bookingCheckins.checkedInAt,
          checkedInBy: bookingCheckins.checkedInBy,
        })
        .from(bookingCheckins)
        .where(eq(bookingCheckins.bookingId, booking.id))
        .limit(1);

      if (existingCheckin) {
        throw new Error("TICKET_ALREADY_PROCESSED");
      }

      // Create check-in
      const [checkin] = await tx
        .insert(bookingCheckins)
        .values({
          bookingId: booking.id,
          checkedInBy: auth.user.id,
          checkedInAt,
        })
        .returning();

      if (!checkin) {
        throw new Error("ADMISSION_CREATE_FAILED");
      }

      // Audit
      await tx.insert(auditLogs).values({
        userId: auth.user.id,
        action: "TICKET_ADMITTED",
        entity: "BOOKING",
        entityId: booking.id,
        metadata: JSON.stringify({
          bookingNumber: booking.bookingNumber,
          attractionId: booking.attractionId,
          checkedInAt: checkedInAt.toISOString(),
        }),
      });

      return checkin;
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
        admission: {
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

          status: "used",
          verdict: "Allowed",

          admittedAt: result.checkedInAt,
          admittedBy: result.checkedInBy,
        },
      },
      200,
    );
  } catch (error) {
    console.error("Admit scanner ticket error:", error);

    if (
      error instanceof Error &&
      error.message === "TICKET_ALREADY_PROCESSED"
    ) {
      return failure(
        "This ticket has already been admitted.",
        409,
        "TICKET_ALREADY_USED",
      );
    }

    if (error instanceof Error && error.message === "ADMISSION_CREATE_FAILED") {
      return failure("Unable to admit ticket.", 500, "ADMISSION_CREATE_FAILED");
    }

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return failure("Authentication required.", 401, "UNAUTHORIZED");
    }

    if (error instanceof Error && error.message === "ACCOUNT_NOT_ACTIVE") {
      return failure("Account is not active.", 403, "ACCOUNT_NOT_ACTIVE");
    }

    if (error instanceof Error && error.message === "FORBIDDEN") {
      return failure(
        "You do not have permission to admit tickets.",
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

    return failure("Unable to admit ticket.", 500, "INTERNAL_SERVER_ERROR");
  }
}
