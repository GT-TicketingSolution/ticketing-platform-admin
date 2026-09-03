import { NextRequest } from "next/server";
import { z } from "zod";
import QRCode from "qrcode";
import crypto from "crypto";
import { desc, eq, and, isNotNull } from "drizzle-orm";

import { db } from "@/db";
import { bookings, transactions, users } from "@/db/schema";

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

  // Multiple attractions
  attractionId: z.array(z.string().uuid()).min(1),

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
   QR PAYLOAD
========================================================= */

function createQrPayload(bookingId: string, attractionId: string): string {
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
   CREATE BOOKING + TRANSACTION
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
       GENERATE NUMBERS
    ===================================================== */

    const bookingNumber = generateBookingNumber();

    const invoiceNumber = await generateInvoiceNumber(auth.user.id);

    /* =====================================================
       CREATE BOOKING + TRANSACTION
       IN ONE DATABASE TRANSACTION
    ===================================================== */

    const result = await db.transaction(async (tx) => {
      /* ===============================================
             INSERT BOOKING
          =============================================== */

      const [booking] = await tx
        .insert(bookings)
        .values({
          bookingNumber,

          customerName: data.customerName ?? null,

          mobileNumber: data.mobileNumber ?? null,

          gstNumber: data.gstNumber ?? null,

          // uuid[]
          attractionId: data.attractionId,

          visitAt: new Date(data.visitAt),

          subtotal: data.subtotal.toFixed(2),

          gstAmount: data.gstAmount.toFixed(2),

          gstAdjustment: data.gstAdjustment.toFixed(2),

          roundOff: data.roundOff.toFixed(2),

          discountAmount: data.discountAmount.toFixed(2),

          paymentMode: data.paymentMode,

          status: "CONFIRMED",

          totalAmount: data.totalAmount.toFixed(2),

          // Amount paid
          amountPaid: data.amountReceived.toFixed(2),

          amountReceived: data.amountReceived.toFixed(2),

          returnAmount: data.returnAmount.toFixed(2),

          createdBy: auth.user.id,
        })
        .returning({
          id: bookings.id,

          bookingNumber: bookings.bookingNumber,

          attractionId: bookings.attractionId,

          status: bookings.status,
        });

      if (!booking) {
        throw new Error("BOOKING_CREATION_FAILED");
      }

      /* ===============================================
             INSERT TRANSACTION
          =============================================== */

      const [transaction] = await tx
        .insert(transactions)
        .values({
          bookingId: booking.id,

          invoiceNumber,

          amount: data.totalAmount.toFixed(2),

          paymentMode: data.paymentMode,

          status: "SUCCESSFUL",
        })
        .returning({
          id: transactions.id,

          invoiceNumber: transactions.invoiceNumber,

          amount: transactions.amount,

          paymentMode: transactions.paymentMode,

          status: transactions.status,
        });

      if (!transaction) {
        throw new Error("TRANSACTION_CREATION_FAILED");
      }

      return {
        booking,
        transaction,
      };
    });

    /* =====================================================
       GENERATE QR FOR EACH ATTRACTION
    ===================================================== */

    const qrCodes = await Promise.all(
      result.booking.attractionId.map((attractionId) =>
        generateBookingQRCode(result.booking.id, attractionId),
      ),
    );

    /* =====================================================
       SUCCESS
    ===================================================== */

    return success(
      {
        bookingId: result.booking.id,

        bookingNumber: result.booking.bookingNumber,

        status: result.booking.status,

        attractionId: result.booking.attractionId,

        qrCodes,

        // Transaction information
        transaction: {
          id: result.transaction.id,

          invoiceNumber: result.transaction.invoiceNumber,

          amount: Number(result.transaction.amount),

          paymentMode: result.transaction.paymentMode,

          status: result.transaction.status,
        },
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

    /* =====================================================
       QR ERRORS
    ===================================================== */

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

    /* =====================================================
       BOOKING ERRORS
    ===================================================== */

    if (error instanceof Error && error.message === "BOOKING_CREATION_FAILED") {
      return failure(
        "Unable to create booking.",
        500,
        "BOOKING_CREATION_FAILED",
      );
    }

    /* =====================================================
       TRANSACTION ERRORS
    ===================================================== */

    if (
      error instanceof Error &&
      error.message === "TRANSACTION_CREATION_FAILED"
    ) {
      return failure(
        "Unable to create transaction.",
        500,
        "TRANSACTION_CREATION_FAILED",
      );
    }

    /* =====================================================
       DEFAULT ERROR
    ===================================================== */

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

/* =========================================================
   INVOICE NUMBER
========================================================= */

export async function generateInvoiceNumber(userId: string): Promise<string> {
  const [user] = await db
    .select({
      invoicePrefix: users.invoiceNumberForUsersInitialPart,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  if (!user.invoicePrefix) {
    throw new Error("INVOICE_PREFIX_NOT_CONFIGURED");
  }

  // Get the last invoice number
  const [lastTransaction] = await db
    .select({
      invoiceNumber: transactions.invoiceNumber,
    })
    .from(transactions)
    .where(isNotNull(transactions.invoiceNumber))
    .orderBy(desc(transactions.createdAt))
    .limit(1);

  let nextNumber = 1;

  if (lastTransaction?.invoiceNumber) {
    const match = lastTransaction.invoiceNumber.match(/(\d+)$/);

    if (match) {
      nextNumber = Number(match[1]) + 1;
    }
  }

  return `${user.invoicePrefix}${String(nextNumber).padStart(5, "0")}`;
}
