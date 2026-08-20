import { NextRequest } from "next/server";

import { and, eq, inArray } from "drizzle-orm";

import { z } from "zod";

import { db } from "@/db";

import {
  attractions,
  attractionManagement,
  attractionTimeSlots,
  bookingItems,
  bookingSeats,
  bookings,
  customers,
  transactions,
} from "@/db/schema";

import { requireAuth } from "@/lib/auth/require-auth";

import {
  requireModuleAccess,
  requireAttractionAccess,
  getAdminId,
} from "@/lib/auth/authorization";

import { success, failure } from "@/lib/api/response";

/* =========================================================
   VALIDATION
========================================================= */

const bookingItemSchema = z.object({
  attractionId: z.string().uuid(),
  category: z.string().trim().min(1),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
  totalPrice: z.number().nonnegative(),
});

const bookingSeatSchema = z.object({
  slotId: z.string().uuid(),
  visitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid visit date."),
  bogie: z.string().trim().max(50).nullable().optional(),
  seatNumber: z.string().trim().min(1).max(50),
});

const createBookingSchema = z.object({
  customer: z.object({
    id: z.string().uuid().nullable().optional(),
    name: z.string().trim().min(1).max(150),
    mobile: z.string().trim().min(10).max(20),
    gstn: z.string().trim().max(20).nullable().optional(),
  }),

  attractionId: z.string().uuid(),

  visitAt: z.string().datetime(),

  items: z.array(bookingItemSchema).min(1),

  seats: z.array(bookingSeatSchema).default([]),

  subtotal: z.number().nonnegative(),

  gstAmount: z.number().nonnegative().default(0),

  gstAdjustment: z.number().default(0),

  roundOff: z.number().default(0),

  discountAmount: z.number().nonnegative().default(0),

  totalAmount: z.number().nonnegative(),

  amountPaid: z.number().nonnegative(),

  payment: z.object({
    mode: z.enum(["CASH", "UPI", "CARD", "ONLINE"]),

    amountReceived: z.number().nonnegative().optional(),
  }),
});

/* =========================================================
   POST
========================================================= */

export async function POST(request: NextRequest) {
  try {
    // ---------------------------------------------
    // AUTHENTICATION
    // ---------------------------------------------

    const auth = await requireAuth(request);

    await requireModuleAccess(auth, "BOOKINGS");

    const adminId = getAdminId(auth);

    // ---------------------------------------------
    // REQUEST BODY
    // ---------------------------------------------

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

    // ---------------------------------------------
    // ATTRACTION ACCESS
    // ---------------------------------------------

    try {
      await requireAttractionAccess(auth, data.attractionId);
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
    // VERIFY ATTRACTION
    // ---------------------------------------------

    const [attraction] = await db
      .select({
        id: attractions.id,
        name: attractions.name,
      })
      .from(attractions)
      .where(
        and(
          eq(attractions.id, data.attractionId),
          eq(attractions.adminId, adminId),
          eq(attractions.status, "ACTIVE"),
        ),
      )
      .limit(1);

    if (!attraction) {
      return failure("Attraction not found.", 404, "ATTRACTION_NOT_FOUND");
    }

    // ---------------------------------------------
    // VERIFY CUSTOMER
    // ---------------------------------------------

    let customerId = data.customer.id ?? null;

    if (customerId) {
      const [customer] = await db
        .select({
          id: customers.id,
          name: customers.name,
          mobile: customers.mobile,
          gstn: customers.gstn,
        })
        .from(customers)
        .where(
          and(
            eq(customers.id, customerId),
            eq(customers.adminId, adminId),
            eq(customers.isDeleted, false),
          ),
        )
        .limit(1);

      if (!customer) {
        return failure("Customer not found.", 404, "CUSTOMER_NOT_FOUND");
      }
    } else {
      // -------------------------------------------
      // CREATE CUSTOMER IF NOT PROVIDED
      // -------------------------------------------

      const [existingCustomer] = await db
        .select({
          id: customers.id,
        })
        .from(customers)
        .where(
          and(
            eq(customers.adminId, adminId),
            eq(customers.mobile, data.customer.mobile),
            eq(customers.isDeleted, false),
          ),
        )
        .limit(1);

      if (existingCustomer) {
        customerId = existingCustomer.id;
      } else {
        const [newCustomer] = await db
          .insert(customers)
          .values({
            adminId,
            name: data.customer.name,
            mobile: data.customer.mobile,
            gstn: data.customer.gstn || null,
          })
          .returning({
            id: customers.id,
          });

        customerId = newCustomer.id;
      }
    }

    // ---------------------------------------------
    // VALIDATE SEATS
    // ---------------------------------------------

    if (data.seats.length > 0) {
      const slotIds = [...new Set(data.seats.map((seat) => seat.slotId))];

      const slots = await db
        .select({
          id: attractionTimeSlots.id,
          attractionId: attractionTimeSlots.attractionId,
          isActive: attractionTimeSlots.isActive,
        })
        .from(attractionTimeSlots)
        .where(
          and(
            inArray(attractionTimeSlots.id, slotIds),
            eq(attractionTimeSlots.attractionId, data.attractionId),
            eq(attractionTimeSlots.isActive, true),
          ),
        );

      if (slots.length !== slotIds.length) {
        return failure(
          "One or more selected slots are invalid.",
          400,
          "INVALID_SLOT",
        );
      }

      // -------------------------------------------
      // CHECK DUPLICATE SEATS IN REQUEST
      // -------------------------------------------

      const requestedSeats = new Set<string>();

      for (const seat of data.seats) {
        const key =
          `${seat.slotId}|${seat.visitDate}|` +
          `${seat.bogie ?? ""}|${seat.seatNumber}`;

        if (requestedSeats.has(key)) {
          return failure(
            `Seat ${seat.seatNumber} is selected more than once.`,
            400,
            "DUPLICATE_SEAT",
          );
        }

        requestedSeats.add(key);
      }
    }

    // ---------------------------------------------
    // PAYMENT VALIDATION
    // ---------------------------------------------

    if (data.amountPaid > data.totalAmount) {
      return failure(
        "Amount paid cannot exceed total amount.",
        400,
        "INVALID_PAYMENT_AMOUNT",
      );
    }

    if (
      data.payment.amountReceived !== undefined &&
      data.payment.amountReceived < data.amountPaid
    ) {
      return failure(
        "Amount received cannot be less than amount paid.",
        400,
        "INVALID_AMOUNT_RECEIVED",
      );
    }

    // ---------------------------------------------
    // CREATE EVERYTHING IN TRANSACTION
    // ---------------------------------------------

    const result = await db.transaction(async (tx) => {
      // -------------------------------------------
      // GENERATE BOOKING NUMBER
      // -------------------------------------------

      const bookingNumber = await generateBookingNumber(tx);

      // -------------------------------------------
      // CREATE BOOKING
      // -------------------------------------------

      const [booking] = await tx
        .insert(bookings)
        .values({
          bookingNumber,

          customerName: data.customer.name,

          mobileNumber: data.customer.mobile,

          gstNumber: data.customer.gstn || null,

          attractionId: data.attractionId,

          visitAt: new Date(data.visitAt),

          subtotal: data.subtotal.toFixed(2),

          gstAmount: data.gstAmount.toFixed(2),

          gstAdjustment: data.gstAdjustment.toFixed(2),

          roundOff: data.roundOff.toFixed(2),

          discountAmount: data.discountAmount.toFixed(2),

          paymentMode: data.payment.mode,

          status: "CONFIRMED",

          totalAmount: data.totalAmount.toFixed(2),

          amountPaid: data.amountPaid.toFixed(2),

          createdBy: auth.user.id,
        })
        .returning({
          id: bookings.id,
          bookingNumber: bookings.bookingNumber,
        });

      // -------------------------------------------
      // BOOKING ITEMS
      // -------------------------------------------

      await tx.insert(bookingItems).values(
        data.items.map((item) => ({
          bookingId: booking.id,

          attractionId: item.attractionId,

          category: item.category,

          quantity: item.quantity,

          unitPrice: item.unitPrice.toFixed(2),

          totalPrice: item.totalPrice.toFixed(2),
        })),
      );

      // -------------------------------------------
      // BOOKING SEATS
      // -------------------------------------------

      if (data.seats.length > 0) {
        try {
          await tx.insert(bookingSeats).values(
            data.seats.map((seat) => ({
              bookingId: booking.id,

              slotId: seat.slotId,

              visitDate: seat.visitDate,

              bogie: seat.bogie ?? null,

              seatNumber: seat.seatNumber,
            })),
          );
        } catch (error) {
          // PostgreSQL unique constraint catches
          // concurrent booking of the same seat.
          throw new Error("SEAT_ALREADY_BOOKED");
        }
      }

      // -------------------------------------------
      // CREATE TRANSACTION
      // -------------------------------------------

      const transactionNumber = await generateTransactionNumber(tx);

      const amountReceived = data.payment.amountReceived ?? data.amountPaid;

      const changeReturned = Math.max(0, amountReceived - data.amountPaid);

      const [transaction] = await tx
        .insert(transactions)
        .values({
          transactionNumber,

          bookingId: booking.id,

          amount: data.amountPaid.toFixed(2),

          amountReceived: amountReceived.toFixed(2),

          changeReturned: changeReturned.toFixed(2),

          paymentMode: data.payment.mode,

          status: "SUCCESSFUL",
        })
        .returning({
          id: transactions.id,

          transactionNumber: transactions.transactionNumber,

          amount: transactions.amount,

          amountReceived: transactions.amountReceived,

          changeReturned: transactions.changeReturned,

          paymentMode: transactions.paymentMode,

          status: transactions.status,
        });

      return {
        booking,

        transaction,

        customerId,
      };
    });

    // ---------------------------------------------
    // RESPONSE
    // ---------------------------------------------

    return success(
      {
        booking: {
          id: result.booking.id,

          bookingNumber: result.booking.bookingNumber,

          customerId: result.customerId,

          attractionId: data.attractionId,

          attractionName: attraction.name,

          visitAt: data.visitAt,

          totalAmount: data.totalAmount,

          amountPaid: data.amountPaid,

          seats: data.seats,
        },

        transaction: result.transaction,
      },
      201,
    );
  } catch (error) {
    console.error("Create ticketing booking error:", error);

    // ---------------------------------------------
    // SEAT CONFLICT
    // ---------------------------------------------

    if (error instanceof Error && error.message === "SEAT_ALREADY_BOOKED") {
      return failure(
        "One or more selected seats are already booked. Please refresh the seat map.",
        409,
        "SEAT_ALREADY_BOOKED",
      );
    }

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
        "You do not have permission to create bookings for this attraction.",
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

async function generateBookingNumber(tx: any): Promise<string> {
  const now = new Date();

  const year = String(now.getFullYear()).slice(-2);

  const month = String(now.getMonth() + 1).padStart(2, "0");

  const day = String(now.getDate()).padStart(2, "0");

  const random = Math.floor(1000 + Math.random() * 9000);

  return `BK-${year}${month}${day}-${random}`;
}

/* =========================================================
   TRANSACTION NUMBER
========================================================= */

async function generateTransactionNumber(tx: any): Promise<string> {
  const now = new Date();

  const year = String(now.getFullYear()).slice(-2);

  const month = String(now.getMonth() + 1).padStart(2, "0");

  const day = String(now.getDate()).padStart(2, "0");

  const random = Math.floor(1000 + Math.random() * 9000);

  return `TX-${year}${month}${day}-${random}`;
}
