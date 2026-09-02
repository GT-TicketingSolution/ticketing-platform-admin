import { NextRequest } from "next/server";

import { z } from "zod";

import { db } from "@/db";
import { bookings } from "@/db/schema";

import { requireAuth } from "@/lib/auth/require-auth";
import { requireModuleAccess } from "@/lib/auth/authorization";

import { success, failure } from "@/lib/api/response";

/* =========================================================
   VALIDATION
========================================================= */

const createBookingSchema = z.object({
  customerName: z.string().trim().min(1).max(150).nullable().optional(),

  mobileNumber: z.string().trim().min(10).max(20).nullable().optional(),

  gstNumber: z.string().trim().max(20).nullable().optional(),

  attractionId: z.string().uuid(),

  visitAt: z.string().datetime(),

  subtotal: z.number().nonnegative(),

  gstAmount: z.number().nonnegative().default(0),

  gstAdjustment: z.number().default(0),

  roundOff: z.number().default(0),

  discountAmount: z.number().nonnegative().default(0),

  paymentMode: z.enum(["CASH", "ONLINE", "CARD", "UPI"]),

  totalAmount: z.number().nonnegative(),

  amountReceived: z.number().nonnegative().default(0),

  returnAmount: z.number().nonnegative().default(0),
});

/* =========================================================
   POST
   Create simple booking
========================================================= */

export async function POST(request: NextRequest) {
  try {
    /* =====================================================
       AUTHENTICATION
    ===================================================== */

    const auth = await requireAuth(request);

    await requireModuleAccess(auth, "TICKET_BOOKING");

    /* =====================================================
       REQUEST BODY
    ===================================================== */

    const body = await request.json();

    const parsed = createBookingSchema.safeParse(body);

    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message || "Invalid booking details.",
        400,
        "VALIDATION_ERROR",
      );
    }

    const data = parsed.data;

    /* =====================================================
       GENERATE BOOKING NUMBER
    ===================================================== */

    const bookingNumber = generateBookingNumber();

    /* =====================================================
       INSERT INTO BOOKINGS ONLY
    ===================================================== */

    const [booking] = await db
      .insert(bookings)
      .values({
        bookingNumber,

        customerName: data.customerName ?? null,

        mobileNumber: data.mobileNumber ?? null,

        gstNumber: data.gstNumber ?? null,

        attractionId: data.attractionId,

        visitAt: new Date(data.visitAt),

        subtotal: data.subtotal.toFixed(2),

        gstAmount: data.gstAmount.toFixed(2),

        gstAdjustment: data.gstAdjustment.toFixed(2),

        roundOff: data.roundOff.toFixed(2),

        discountAmount: data.discountAmount.toFixed(2),

        paymentMode: data.paymentMode,

        status: "PENDING",

        totalAmount: data.totalAmount.toFixed(2),

        amountReceived: data.amountReceived.toFixed(2),

        returnAmount: data.returnAmount.toFixed(2),

        createdBy: auth.user.id,
      })
      .returning({
        id: bookings.id,
      });

    /* =====================================================
       SUCCESS
    ===================================================== */

    return success(
      {
        bookingId: booking.id,
      },
      201,
    );
  } catch (error) {
    console.error("Create booking error:", error);

    /* =====================================================
       AUTH ERRORS
    ===================================================== */

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return failure("Authentication required.", 401, "UNAUTHORIZED");
    }

    if (error instanceof Error && error.message === "ACCOUNT_NOT_ACTIVE") {
      return failure("Account is not active.", 403, "ACCOUNT_NOT_ACTIVE");
    }

    if (error instanceof Error && error.message === "FORBIDDEN") {
      return failure(
        "You do not have permission to create bookings.",
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

    return failure("Unable to create booking.", 500, "INTERNAL_SERVER_ERROR");
  }
}

/* =========================================================
   BOOKING NUMBER
========================================================= */

function generateBookingNumber(): string {
  const now = new Date();

  const year = String(now.getFullYear()).slice(-2);

  const month = String(now.getMonth() + 1).padStart(2, "0");

  const day = String(now.getDate()).padStart(2, "0");

  const random = Math.floor(1000 + Math.random() * 9000);

  return `BK-${year}${month}${day}-${random}`;
}
