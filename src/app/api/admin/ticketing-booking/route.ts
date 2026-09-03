import { NextRequest } from "next/server";
import { z } from "zod";
import QRCode from "qrcode";
import crypto from "crypto";
import { eq } from "drizzle-orm";

import { generateInvoiceNumber } from "@/services/invoice.service";

import { db } from "@/db";
import {
  bookings,
  transactions,
  scannerInvoices,
  attractionsAgainstBooking,
  categoryOfAttractionAgainstBooking,
  attractionManagement,
  attractions,
} from "@/db/schema";

import { requireAuth } from "@/lib/auth/require-auth";
import { requireModuleAccess } from "@/lib/auth/authorization";

import { success, failure } from "@/lib/api/response";

/* =========================================================
   VALIDATION
========================================================= */

const categorySchema = z.object({
  categoryId: z.string().uuid(),

  noOfVisitors: z.number().int().nonnegative(),
});

const attractionSchema = z.object({
  attractionManagementId: z.string().uuid(),

  attractionSubtotal: z.number().nonnegative(),

  attractionGst: z.number().nonnegative(),

  attractionRoundoff: z.number(),

  attractionRoundOffGstAdj: z.number(),

  attractionTotalAmount: z.number().nonnegative(),

  categories: z.array(categorySchema).min(1),
});

const createBookingSchema = z.object({
  customerName: z.string().trim().min(1).max(150).nullable().optional(),

  mobileNumber: z.string().trim().min(10).max(20).nullable().optional(),

  gstNumber: z.string().trim().max(20).nullable().optional(),

  totalAmount: z.number().nonnegative(),

  amountReceived: z.number().nonnegative().default(0),

  returnAmount: z.number().nonnegative().default(0),

  paymentMode: z.enum(["CASH", "ONLINE", "CARD", "UPI"]),

  attractions: z.array(attractionSchema).min(1),
});

/* =========================================================
   QR PAYLOAD
========================================================= */
function createQrPayload({
  bookingId,
  invoiceNumber,
  scannerInvoiceId,
  attractionId,
  attractionName,
  categories,
  date,
}: {
  bookingId: string;
  invoiceNumber: string;
  scannerInvoiceId: string;
  attractionId: string;
  attractionName: string;
  categories: {
    categoryId: string;
    noOfVisitors: number;
  }[];
  date: string;
}): string {
  const secret = process.env.QR_SECRET;

  if (!secret) {
    throw new Error("QR_SECRET_NOT_CONFIGURED");
  }

  const data = JSON.stringify({
    bookingId,
    invoiceNumber,
    scannerInvoiceId,
    attractionId,
    attractionName,
    categories,
    date,
  });

  const signature = crypto
    .createHmac("sha256", secret)
    .update(data)
    .digest("hex");

  return JSON.stringify({
    bookingId,
    invoiceNumber,
    scannerInvoiceId,
    attractionId,
    attractionName,
    categories,
    date,
    signature,
  });
}

/* =========================================================
   GENERATE QR
========================================================= */

async function generateBookingQRCode({
  bookingId,
  invoiceNumber,
  scannerInvoiceId,
  attractionId,
  attractionName,
  categories,
  date,
}: {
  bookingId: string;
  invoiceNumber: string;
  scannerInvoiceId: string;
  attractionId: string;
  attractionName: string;
  categories: {
    categoryId: string;
    noOfVisitors: number;
  }[];
  date: string;
}) {
  const payload = createQrPayload({
    bookingId,
    invoiceNumber,
    scannerInvoiceId,
    attractionId,
    attractionName,
    categories,
    date,
  });

  const qrCode = await QRCode.toDataURL(payload);

  return {
    attractionId,
    attractionName,
    qrCode,
  };
}
/* =========================================================
   POST
   CREATE BOOKING + TRANSACTION + SCANNER INVOICE
   + ATTRACTIONS + CATEGORIES
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
       GENERATE INVOICE NUMBER
    ===================================================== */

    const invoiceNumber = await generateInvoiceNumber(auth.user.id);

    /* =====================================================
       DATABASE TRANSACTION
    ===================================================== */

    const result = await db.transaction(async (tx) => {
      /* ===================================================
         1. INSERT BOOKING
      =================================================== */

      const [booking] = await tx
        .insert(bookings)
        .values({
          invoiceNumber,

          customerName: data.customerName ?? null,

          mobileNumber: data.mobileNumber ?? null,

          gstNumber: data.gstNumber ?? null,

          totalAmount: data.totalAmount.toFixed(2),

          status: "CONFIRMED",

          amountReceived: data.amountReceived.toFixed(2),

          returnAmount: data.returnAmount.toFixed(2),

          createdBy: auth.user.id,
        })
        .returning({
          id: bookings.id,

          invoiceNumber: bookings.invoiceNumber,

          totalAmount: bookings.totalAmount,

          status: bookings.status,

          amountReceived: bookings.amountReceived,

          returnAmount: bookings.returnAmount,

          createdAt: bookings.createdAt,
        });

      if (!booking) {
        throw new Error("BOOKING_CREATION_FAILED");
      }

      /* ===================================================
         2. INSERT TRANSACTION
      =================================================== */

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

      /* ===================================================
         3. INSERT SCANNER INVOICE
      =================================================== */

      const [scannerInvoice] = await tx
        .insert(scannerInvoices)
        .values({
          invoiceNumber,
        })
        .returning({
          id: scannerInvoices.id,

          invoiceNumber: scannerInvoices.invoiceNumber,

          scannerInvoiceStatus: scannerInvoices.scannerInvoiceStatus,

          isDeleted: scannerInvoices.isDeleted,
        });

      if (!scannerInvoice) {
        throw new Error("SCANNER_INVOICE_CREATION_FAILED");
      }

      /* ===================================================
         4. INSERT ATTRACTIONS + CATEGORIES
      =================================================== */

      const attractionResults = [];

      for (const attraction of data.attractions) {
        /* ===============================================
           INSERT ATTRACTION AGAINST BOOKING
        =============================================== */

        const [attractionAgainstBooking] = await tx
          .insert(attractionsAgainstBooking)
          .values({
            bookingId: booking.id,

            attractionManagementId: attraction.attractionManagementId,

            attractionSubtotal: attraction.attractionSubtotal.toFixed(2),

            attractionGst: attraction.attractionGst.toFixed(2),

            attractionRoundoff: attraction.attractionRoundoff.toFixed(2),

            attractionRoundOffGstAdj:
              attraction.attractionRoundOffGstAdj.toFixed(2),

            attractionTotalAmount: attraction.attractionTotalAmount.toFixed(2),
          })
          .returning({
            id: attractionsAgainstBooking.id,

            bookingId: attractionsAgainstBooking.bookingId,

            attractionManagementId:
              attractionsAgainstBooking.attractionManagementId,

            attractionSubtotal: attractionsAgainstBooking.attractionSubtotal,

            attractionGst: attractionsAgainstBooking.attractionGst,

            attractionRoundoff: attractionsAgainstBooking.attractionRoundoff,

            attractionRoundOffGstAdj:
              attractionsAgainstBooking.attractionRoundOffGstAdj,

            attractionTotalAmount:
              attractionsAgainstBooking.attractionTotalAmount,
          });

        if (!attractionAgainstBooking) {
          throw new Error("ATTRACTION_BOOKING_CREATION_FAILED");
        }

        /* ===============================================
           INSERT CATEGORIES FOR THIS ATTRACTION
        =============================================== */

        const categoryResults = [];

        for (const category of attraction.categories) {
          const [categoryAgainstBooking] = await tx
            .insert(categoryOfAttractionAgainstBooking)
            .values({
              attractionAgainstBookingId: attractionAgainstBooking.id,

              bookingId: booking.id,

              categoryId: category.categoryId,

              noOfVisitors: category.noOfVisitors,
            })
            .returning({
              id: categoryOfAttractionAgainstBooking.id,

              attractionAgainstBookingId:
                categoryOfAttractionAgainstBooking.attractionAgainstBookingId,

              bookingId: categoryOfAttractionAgainstBooking.bookingId,

              categoryId: categoryOfAttractionAgainstBooking.categoryId,

              noOfVisitors: categoryOfAttractionAgainstBooking.noOfVisitors,
            });

          if (!categoryAgainstBooking) {
            throw new Error("CATEGORY_BOOKING_CREATION_FAILED");
          }

          categoryResults.push(categoryAgainstBooking);
        }

        const [attractionDetails] = await tx
          .select({
            attractionId: attractionManagement.attractionId,
            attractionName: attractions.name,
          })
          .from(attractionManagement)
          .innerJoin(
            attractions,
            eq(attractionManagement.attractionId, attractions.id),
          )
          .where(
            eq(
              attractionManagement.id,
              attractionAgainstBooking.attractionManagementId,
            ),
          )
          .limit(1);

        if (!attractionDetails) {
          throw new Error("ATTRACTION_NOT_FOUND");
        }

        attractionResults.push({
          attraction: {
            ...attractionAgainstBooking,
            attractionId: attractionDetails.attractionId,
            attractionName: attractionDetails.attractionName,
          },
          categories: categoryResults,
        });
      }

      /* ===================================================
         RETURN TRANSACTION RESULT
      =================================================== */

      return {
        booking,

        transaction,

        scannerInvoice,

        attractions: attractionResults,
      };
    });

    /* =====================================================
       GENERATE QR FOR EACH BOOKED ATTRACTION
    ===================================================== */

    const qrCodes = await Promise.all(
      result.attractions.map(({ attraction, categories }) =>
        generateBookingQRCode({
          bookingId: result.booking.id,
          invoiceNumber: result.booking.invoiceNumber,
          scannerInvoiceId: result.scannerInvoice.id,
          attractionId: attraction.attractionId,
          attractionName: attraction.attractionName,
          categories: categories.map((category) => ({
            categoryId: category.categoryId,
            noOfVisitors: category.noOfVisitors,
          })),
          date: result.booking.createdAt.toISOString().split("T")[0],
        }),
      ),
    );

    /* =====================================================
       SUCCESS RESPONSE
    ===================================================== */

    return success(
      {
        bookingId: result.booking.id,

        invoiceNumber: result.booking.invoiceNumber,

        status: result.booking.status,

        totalAmount: Number(result.booking.totalAmount),

        amountReceived: Number(result.booking.amountReceived),

        returnAmount: Number(result.booking.returnAmount),

        transaction: {
          id: result.transaction.id,

          invoiceNumber: result.transaction.invoiceNumber,

          amount: Number(result.transaction.amount),

          paymentMode: result.transaction.paymentMode,

          status: result.transaction.status,
        },

        scannerInvoice: {
          id: result.scannerInvoice.id,

          invoiceNumber: result.scannerInvoice.invoiceNumber,

          scannerInvoiceStatus: result.scannerInvoice.scannerInvoiceStatus,

          isDeleted: result.scannerInvoice.isDeleted,
        },

        attractions: result.attractions.map(({ attraction, categories }) => ({
          id: attraction.id,

          attractionManagementId: attraction.attractionManagementId,

          attractionSubtotal: Number(attraction.attractionSubtotal),

          attractionGst: Number(attraction.attractionGst),

          attractionRoundoff: Number(attraction.attractionRoundoff),

          attractionRoundOffGstAdj: Number(attraction.attractionRoundOffGstAdj),

          attractionTotalAmount: Number(attraction.attractionTotalAmount),

          categories: categories.map((category) => ({
            id: category.id,

            categoryId: category.categoryId,

            noOfVisitors: category.noOfVisitors,
          })),
        })),

        qrCodes,
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
       SCANNER INVOICE ERRORS
    ===================================================== */

    if (
      error instanceof Error &&
      error.message === "SCANNER_INVOICE_CREATION_FAILED"
    ) {
      return failure(
        "Unable to create scanner invoice.",
        500,
        "SCANNER_INVOICE_CREATION_FAILED",
      );
    }

    /* =====================================================
       ATTRACTION ERRORS
    ===================================================== */

    if (
      error instanceof Error &&
      error.message === "ATTRACTION_BOOKING_CREATION_FAILED"
    ) {
      return failure(
        "Unable to add attraction to booking.",
        500,
        "ATTRACTION_BOOKING_CREATION_FAILED",
      );
    }

    /* =====================================================
       CATEGORY ERRORS
    ===================================================== */

    if (
      error instanceof Error &&
      error.message === "CATEGORY_BOOKING_CREATION_FAILED"
    ) {
      return failure(
        "Unable to add attraction category to booking.",
        500,
        "CATEGORY_BOOKING_CREATION_FAILED",
      );
    }

    /* =====================================================
       DEFAULT ERROR
    ===================================================== */

    return failure("Unable to create booking.", 500, "INTERNAL_SERVER_ERROR");
  }
}
