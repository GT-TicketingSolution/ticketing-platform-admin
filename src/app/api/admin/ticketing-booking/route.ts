import { NextRequest } from "next/server";

import { and, eq, inArray, lt } from "drizzle-orm";

import { z } from "zod";

import { db } from "@/db";

import {
  attractions,
  attractionTimeSlots,
  bookingItems,
  bookingSeats,
  bookings,
  customers,
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

    name: z.string().trim().min(1).max(150).nullable().optional(),

    mobile: z.string().trim().min(10).max(20).nullable().optional(),

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
});

/* =========================================================
   POST
   Create PENDING booking + atomically reserve seats
========================================================= */

export async function POST(request: NextRequest) {
  try {
    /* =====================================================
       AUTHENTICATION
    ===================================================== */

    const auth = await requireAuth(request);

    await requireModuleAccess(auth, "TICKET_BOOKING");

    const adminId = getAdminId(auth);

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
       ATTRACTION ACCESS
    ===================================================== */

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

    /* =====================================================
       VERIFY ATTRACTION
    ===================================================== */

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

    /* =====================================================
       VERIFY CUSTOMER
    ===================================================== */

    let customerId = data.customer.id ?? null;

    if (customerId) {
      const [customer] = await db
        .select({
          id: customers.id,
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
    } else if (data.customer.mobile) {
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
            name: data.customer.name ?? "Walk-in Customer",
            mobile: data.customer.mobile,
            gstn: data.customer.gstn || null,
          })
          .returning({
            id: customers.id,
          });

        customerId = newCustomer.id;
      }
    }

    /* =====================================================
       VALIDATE SEATS
    ===================================================== */

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

      /* -----------------------------------------------
         DUPLICATE SEATS IN REQUEST
      ------------------------------------------------ */

      const requestedSeats = new Set<string>();

      for (const seat of data.seats) {
        const key =
          `${seat.slotId}|` +
          `${seat.visitDate}|` +
          `${seat.bogie ?? ""}|` +
          `${seat.seatNumber}`;

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

    /* =====================================================
       PAYMENT EXPIRY
    ===================================================== */

    const paymentExpiresAt = new Date(Date.now() + 2 * 60 * 1000);

    /* =====================================================
       DATABASE TRANSACTION
    ===================================================== */

    const result = await db.transaction(async (tx) => {
      /* ---------------------------------------------------
     CLEANUP EXPIRED PENDING BOOKINGS
  --------------------------------------------------- */

      const now = new Date();

      const expiredBookings = await tx
        .select({
          id: bookings.id,
        })
        .from(bookings)
        .where(
          and(
            eq(bookings.status, "PENDING"),
            lt(bookings.paymentExpiresAt, now),
          ),
        );

      if (expiredBookings.length > 0) {
        const expiredBookingIds = expiredBookings.map((booking) => booking.id);

        // Release seats held by expired bookings
        await tx
          .delete(bookingSeats)
          .where(inArray(bookingSeats.bookingId, expiredBookingIds));

        // We don't have EXPIRED status,
        // so mark the booking as CANCELLED.
        await tx
          .update(bookings)
          .set({
            status: "CANCELLED",
            updatedAt: now,
          })
          .where(inArray(bookings.id, expiredBookingIds));
      }

      /* ---------------------------------------------------
         1. CREATE PENDING BOOKING
      --------------------------------------------------- */

      const bookingNumber = await generateBookingNumber(tx);

      const [booking] = await tx
        .insert(bookings)
        .values({
          bookingNumber,

          customerName: data.customer.name ?? null,
          mobileNumber: data.customer.mobile ?? null,

          gstNumber: data.customer.gstn ?? null,

          attractionId: data.attractionId,

          visitAt: new Date(data.visitAt),

          subtotal: data.subtotal.toFixed(2),

          gstAmount: data.gstAmount.toFixed(2),

          gstAdjustment: data.gstAdjustment.toFixed(2),

          roundOff: data.roundOff.toFixed(2),

          discountAmount: data.discountAmount.toFixed(2),

          paymentExpiresAt,

          paymentMode: "ONLINE",

          status: "PENDING",

          totalAmount: data.totalAmount.toFixed(2),

          amountPaid: "0",

          createdBy: auth.user.id,
        })
        .returning({
          id: bookings.id,

          bookingNumber: bookings.bookingNumber,

          status: bookings.status,
        });

      /* ---------------------------------------------------
         2. BOOKING ITEMS
      --------------------------------------------------- */

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

      /* ---------------------------------------------------
         3. ATOMIC SEAT RESERVATION
      --------------------------------------------------- */

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
        } catch (error: any) {
          const pgError = error?.cause ?? error;

          console.log("========== SEAT INSERT ERROR ==========");
          console.log("code:", pgError?.code);
          console.log("constraint:", pgError?.constraint);
          console.log("detail:", pgError?.detail);

          if (
            pgError?.code === "23505" &&
            pgError?.constraint === "booking_seats_unique_seat"
          ) {
            throw new Error("SEAT_ALREADY_BOOKED");
          }

          throw error;
        }
      }

      return {
        booking,

        customerId,

        paymentExpiresAt,
      };
    });

    /* =====================================================
       SUCCESS
    ===================================================== */

    return success(
      {
        booking: {
          id: result.booking.id,

          bookingNumber: result.booking.bookingNumber,

          status: result.booking.status,

          customerId: result.customerId,

          attractionId: data.attractionId,

          attractionName: attraction.name,

          visitAt: data.visitAt,

          totalAmount: data.totalAmount,

          amountPaid: 0,

          seats: data.seats,

          paymentExpiresAt: result.paymentExpiresAt,
        },

        paymentRequired: true,
      },
      201,
    );
  } catch (error) {
    console.error("Create ticketing booking error:", error);

    /* =====================================================
       SEAT CONFLICT
    ===================================================== */

    if (error instanceof Error && error.message === "SEAT_ALREADY_BOOKED") {
      return failure(
        "One or more selected seats are no longer available. Please refresh the seat map and select another seat.",
        409,
        "SEAT_ALREADY_BOOKED",
      );
    }

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
