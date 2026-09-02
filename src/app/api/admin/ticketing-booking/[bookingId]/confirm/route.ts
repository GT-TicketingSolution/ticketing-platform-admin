import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import QRCode from "qrcode";
import crypto from "crypto";

import { db } from "@/db";
import { bookings } from "@/db/schema";

import { requireAuth } from "@/lib/auth/require-auth";
import { requireModuleAccess } from "@/lib/auth/authorization";

import { success, failure } from "@/lib/api/response";

/* =========================================================
   ROUTE PARAMS
========================================================= */

interface RouteParams {
  params: Promise<{
    bookingId: string;
  }>;
}

/* =========================================================
   CREATE QR PAYLOAD
========================================================= */

function createQrPayload(bookingId: string, attractionId: string) {
  const secret = process.env.QR_SECRET;

  if (!secret) {
    throw new Error("QR_SECRET_NOT_CONFIGURED");
  }

  const data = `${bookingId}:${attractionId}`;

  const signature = crypto
    .createHmac("sha256", secret)
    .update(data)
    .digest("hex");

  return JSON.stringify({
    bookingId,
    attractionId,
    signature,
  });
}

/* =========================================================
   GENERATE QR
========================================================= */

async function generateBookingQRCode(bookingId: string, attractionId: string) {
  const payload = createQrPayload(bookingId, attractionId);

  const qrCode = await QRCode.toDataURL(payload);

  return {
    attractionId,
    qrCode,
  };
}

/* =========================================================
   POST
========================================================= */

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // ---------------------------------------------
    // AUTHENTICATION
    // ---------------------------------------------

    const auth = await requireAuth(request);

    await requireModuleAccess(auth, "TICKET_BOOKING");

    // ---------------------------------------------
    // BOOKING ID
    // ---------------------------------------------

    const { bookingId } = await params;

    if (!bookingId) {
      return failure("Booking ID is required.", 400, "BOOKING_ID_REQUIRED");
    }

    // ---------------------------------------------
    // FIND BOOKING
    // ---------------------------------------------

    const [booking] = await db
      .select({
        id: bookings.id,

        bookingNumber: bookings.bookingNumber,

        attractionId: bookings.attractionId,

        status: bookings.status,

        customerName: bookings.customerName,

        mobileNumber: bookings.mobileNumber,

        gstNumber: bookings.gstNumber,

        visitAt: bookings.visitAt,

        subtotal: bookings.subtotal,

        gstAmount: bookings.gstAmount,

        gstAdjustment: bookings.gstAdjustment,

        roundOff: bookings.roundOff,

        discountAmount: bookings.discountAmount,

        totalAmount: bookings.totalAmount,

        amountReceived: bookings.amountReceived,

        returnAmount: bookings.returnAmount,

        paymentMode: bookings.paymentMode,

        paymentExpiresAt: bookings.paymentExpiresAt,

        createdAt: bookings.createdAt,

        updatedAt: bookings.updatedAt,
      })
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1);

    // ---------------------------------------------
    // BOOKING NOT FOUND
    // ---------------------------------------------

    if (!booking) {
      return failure("Booking not found.", 404, "BOOKING_NOT_FOUND");
    }

    // ---------------------------------------------
    // CHECK STATUS
    // ---------------------------------------------

    if (booking.status !== "CONFIRMED") {
      return failure(
        "Booking must be confirmed before generating the QR code.",
        409,
        "INVALID_BOOKING_STATUS",
      );
    }

    // ---------------------------------------------
    // GENERATE QR
    // ---------------------------------------------

    const qrCode = await generateBookingQRCode(
      booking.id,
      booking.attractionId,
    );

    // ---------------------------------------------
    // RESPONSE
    // ---------------------------------------------

    return success(
      {
        message: "Booking QR generated successfully.",

        booking,

        qrCode,
      },
      200,
    );
  } catch (error) {
    console.error("Generate booking QR error:", error);

    // ---------------------------------------------
    // AUTH ERRORS
    // ---------------------------------------------

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return failure("Authentication required.", 401, "UNAUTHORIZED");
    }

    if (error instanceof Error && error.message === "ACCOUNT_NOT_ACTIVE") {
      return failure("Account is not active.", 403, "ACCOUNT_NOT_ACTIVE");
    }

    if (error instanceof Error && error.message === "USER_HAS_NO_ADMIN") {
      return failure(
        "User is not associated with an admin.",
        403,
        "USER_HAS_NO_ADMIN",
      );
    }

    // ---------------------------------------------
    // BOOKING ERRORS
    // ---------------------------------------------

    if (error instanceof Error && error.message === "BOOKING_NOT_FOUND") {
      return failure("Booking not found.", 404, "BOOKING_NOT_FOUND");
    }

    if (error instanceof Error && error.message === "INVALID_BOOKING_STATUS") {
      return failure(
        "Booking must be confirmed before generating the QR code.",
        409,
        "INVALID_BOOKING_STATUS",
      );
    }

    // ---------------------------------------------
    // QR ERROR
    // ---------------------------------------------

    if (
      error instanceof Error &&
      error.message === "QR_SECRET_NOT_CONFIGURED"
    ) {
      return failure(
        "QR configuration is missing.",
        500,
        "QR_SECRET_NOT_CONFIGURED",
      );
    }

    return failure(
      "Unable to generate booking QR.",
      500,
      "INTERNAL_SERVER_ERROR",
    );
  }
}
