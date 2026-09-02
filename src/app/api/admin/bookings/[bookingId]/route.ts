import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/db";

import { bookings, bookingItems, bookingSeats, attractions } from "@/db/schema";

import { requireAuth } from "@/lib/auth/require-auth";
import {
  requireModuleAccess,
  hasAttractionAccess,
} from "@/lib/auth/authorization";

import { success, failure } from "@/lib/api/response";

// =====================================================
// GET BOOKING DETAILS
// =====================================================

export async function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      bookingId: string;
    }>;
  },
) {
  try {
    // =====================================================
    // 1. AUTHENTICATION
    // =====================================================

    const auth = await requireAuth(request);

    // =====================================================
    // 2. MODULE AUTHORIZATION
    // =====================================================

    await requireModuleAccess(auth, "BOOKINGS");

    // =====================================================
    // 3. BOOKING ID
    // =====================================================

    const { bookingId } = await params;

    if (!bookingId) {
      return failure("Booking ID is required.", 400, "BOOKING_ID_REQUIRED");
    }

    // =====================================================
    // 4. FIND BOOKING
    //
    // We intentionally fetch the attractionId first.
    // Then we verify whether this user can access that
    // attraction.
    // =====================================================

    const [booking] = await db
      .select({
        id: bookings.id,

        bookingId: bookings.bookingNumber,

        customerName: bookings.customerName,

        mobileNumber: bookings.mobileNumber,

        gstNumber: bookings.gstNumber,

        visitAt: bookings.visitAt,

        paymentMode: bookings.paymentMode,

        status: bookings.status,

        totalAmount: bookings.totalAmount,

        amountPaid: bookings.amountPaid,

        createdAt: bookings.createdAt,

        updatedAt: bookings.updatedAt,

        attractionId: attractions.id,

        attractionName: attractions.name,
      })
      .from(bookings)
      .innerJoin(attractions, eq(bookings.attractionId, attractions.id))
      .where(and(eq(bookings.id, bookingId), isNull(bookings.deletedAt)))
      .limit(1);

    if (!booking) {
      return failure("Booking not found.", 404, "BOOKING_NOT_FOUND");
    }

    // =====================================================
    // 5. ATTRACTION AUTHORIZATION
    // =====================================================

    const hasAccess = await hasAttractionAccess(auth, booking.attractionId);

    if (!hasAccess) {
      return failure(
        "You do not have access to this booking.",
        403,
        "FORBIDDEN",
      );
    }

    // =====================================================
    // 6. BOOKING ITEMS
    // =====================================================

    const items = await db
      .select({
        id: bookingItems.id,

        category: bookingItems.category,

        quantity: bookingItems.quantity,

        unitPrice: bookingItems.unitPrice,

        totalPrice: bookingItems.totalPrice,
      })
      .from(bookingItems)
      .where(eq(bookingItems.bookingId, booking.id));

    // =====================================================
    // 7. BOOKING SEATS
    // =====================================================

    const seats = await db
      .select({
        id: bookingSeats.id,

        bogie: bookingSeats.bogie,

        seatNumber: bookingSeats.seatNumber,
      })
      .from(bookingSeats)
      .where(eq(bookingSeats.bookingId, booking.id));

    // =====================================================
    // 8. RESPONSE
    // =====================================================

    return success({
      booking: {
        id: booking.id,

        bookingId: booking.bookingId,

        bookedAt: booking.createdAt,

        status: booking.status,

        customer: {
          name: booking.customerName,
          mobile: booking.mobileNumber,
          gstNumber: booking.gstNumber,
        },

        attraction: {
          id: booking.attractionId,
          name: booking.attractionName,
        },

        visitAt: booking.visitAt,

        payment: {
          mode: booking.paymentMode,

          totalAmount: Number(booking.totalAmount),

          amountPaid: Number(booking.amountPaid),

          amountDue: Number(booking.totalAmount) - Number(booking.amountPaid),
        },

        items: items.map((item) => ({
          id: item.id,

          category: item.category,

          quantity: Number(item.quantity),

          unitPrice: Number(item.unitPrice),

          totalPrice: Number(item.totalPrice),
        })),

        visitors: {
          total: items.reduce(
            (total, item) => total + Number(item.quantity),
            0,
          ),
        },

        seats: {
          total: seats.length,

          items: seats.map((seat) => ({
            id: seat.id,

            bogie: seat.bogie,

            seatNumber: seat.seatNumber,
          })),
        },

        createdAt: booking.createdAt,

        updatedAt: booking.updatedAt,
      },
    });
  } catch (error) {
    // =====================================================
    // AUTHORIZATION ERRORS
    // =====================================================

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return failure("Authentication required.", 401, "UNAUTHORIZED");
    }

    if (error instanceof Error && error.message === "FORBIDDEN") {
      return failure(
        "You do not have permission to access this resource.",
        403,
        "FORBIDDEN",
      );
    }

    if (error instanceof Error && error.message === "USER_HAS_NO_ADMIN") {
      return failure("User is not associated with an admin.", 403, "FORBIDDEN");
    }

    return failure(
      "Unable to fetch booking details.",
      500,
      "INTERNAL_SERVER_ERROR",
    );
  }
}

// =====================================================
// PATCH BOOKING
// =====================================================

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      bookingId: string;
    }>;
  },
) {
  try {
    // =====================================================
    // 1. AUTHENTICATION
    // =====================================================

    const auth = await requireAuth(request);

    // =====================================================
    // 2. MODULE AUTHORIZATION
    // =====================================================

    await requireModuleAccess(auth, "BOOKINGS");

    // =====================================================
    // 3. BOOKING ID
    // =====================================================

    const { bookingId } = await params;

    if (!bookingId) {
      return failure("Booking ID is required.", 400, "BOOKING_ID_REQUIRED");
    }

    // =====================================================
    // 4. REQUEST BODY
    // =====================================================

    const body = await request.json();

    const customerName =
      typeof body.customerName === "string" ? body.customerName.trim() : "";

    const mobileNumber =
      typeof body.mobileNumber === "string" ? body.mobileNumber.trim() : "";

    // =====================================================
    // 5. VALIDATION
    // =====================================================

    if (!customerName) {
      return failure(
        "Customer name is required.",
        400,
        "CUSTOMER_NAME_REQUIRED",
      );
    }

    if (!mobileNumber) {
      return failure(
        "Mobile number is required.",
        400,
        "MOBILE_NUMBER_REQUIRED",
      );
    }

    if (!/^\d{10}$/.test(mobileNumber)) {
      return failure(
        "Mobile number must be exactly 10 digits.",
        400,
        "INVALID_MOBILE_NUMBER",
      );
    }

    // =====================================================
    // 6. FIND BOOKING
    // =====================================================

    const [existingBooking] = await db
      .select({
        id: bookings.id,

        bookingId: bookings.bookingNumber,

        attractionId: bookings.attractionId,
      })
      .from(bookings)
      .where(and(eq(bookings.id, bookingId), isNull(bookings.deletedAt)))
      .limit(1);

    if (!existingBooking) {
      return failure("Booking not found.", 404, "BOOKING_NOT_FOUND");
    }

    // =====================================================
    // 7. ATTRACTION AUTHORIZATION
    // =====================================================

    const hasAccess = (
      await Promise.all(
        existingBooking.attractionId.map((attractionId: string) =>
          hasAttractionAccess(auth, attractionId),
        ),
      )
    ).every(Boolean);

    if (!hasAccess) {
      return failure(
        "You do not have permission to modify this booking.",
        403,
        "FORBIDDEN",
      );
    }

    // =====================================================
    // 8. UPDATE BOOKING
    // =====================================================

    const [updatedBooking] = await db
      .update(bookings)
      .set({
        customerName,

        mobileNumber,

        updatedAt: new Date(),
      })
      .where(and(eq(bookings.id, bookingId), isNull(bookings.deletedAt)))
      .returning({
        id: bookings.id,

        bookingId: bookings.bookingNumber,

        customerName: bookings.customerName,

        mobileNumber: bookings.mobileNumber,

        updatedAt: bookings.updatedAt,
      });

    if (!updatedBooking) {
      return failure("Booking not found.", 404, "BOOKING_NOT_FOUND");
    }

    return success({
      booking: updatedBooking,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return failure("Authentication required.", 401, "UNAUTHORIZED");
    }

    if (error instanceof Error && error.message === "FORBIDDEN") {
      return failure(
        "You do not have permission to modify this booking.",
        403,
        "FORBIDDEN",
      );
    }

    if (error instanceof Error && error.message === "USER_HAS_NO_ADMIN") {
      return failure("User is not associated with an admin.", 403, "FORBIDDEN");
    }

    return failure("Unable to update booking.", 500, "INTERNAL_SERVER_ERROR");
  }
}

// =====================================================
// DELETE BOOKING
// =====================================================

export async function DELETE(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      bookingId: string;
    }>;
  },
) {
  try {
    // =====================================================
    // 1. AUTHENTICATION
    // =====================================================

    const auth = await requireAuth(request);

    // =====================================================
    // 2. MODULE AUTHORIZATION
    // =====================================================

    await requireModuleAccess(auth, "BOOKINGS");

    // =====================================================
    // 3. BOOKING ID
    // =====================================================

    const { bookingId } = await params;

    if (!bookingId) {
      return failure("Booking ID is required.", 400, "BOOKING_ID_REQUIRED");
    }

    // =====================================================
    // 4. FIND BOOKING
    // =====================================================

    const [existingBooking] = await db
      .select({
        id: bookings.id,

        bookingId: bookings.bookingNumber,

        attractionId: bookings.attractionId,

        deletedAt: bookings.deletedAt,
      })
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1);

    if (!existingBooking) {
      return failure("Booking not found.", 404, "BOOKING_NOT_FOUND");
    }

    // =====================================================
    // 5. ALREADY DELETED
    // =====================================================

    if (existingBooking.deletedAt) {
      return failure(
        "Booking is already deleted.",
        400,
        "BOOKING_ALREADY_DELETED",
      );
    }

    // =====================================================
    // 6. ATTRACTION AUTHORIZATION
    // =====================================================

    const hasAccess = (
      await Promise.all(
        existingBooking.attractionId.map((attractionId: string) =>
          hasAttractionAccess(auth, attractionId),
        ),
      )
    ).every(Boolean);

    if (!hasAccess) {
      return failure(
        "You do not have permission to delete this booking.",
        403,
        "FORBIDDEN",
      );
    }

    // =====================================================
    // 7. SOFT DELETE
    // =====================================================

    const [deletedBooking] = await db
      .update(bookings)
      .set({
        deletedAt: new Date(),

        deletedBy: auth.user.id,

        isDeleted: true,

        updatedAt: new Date(),
      })
      .where(and(eq(bookings.id, bookingId), isNull(bookings.deletedAt)))
      .returning({
        id: bookings.id,

        bookingId: bookings.bookingNumber,

        deletedAt: bookings.deletedAt,
      });

    if (!deletedBooking) {
      return failure("Booking could not be deleted.", 404, "BOOKING_NOT_FOUND");
    }

    return success({
      message: "Booking deleted successfully.",

      booking: deletedBooking,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return failure("Authentication required.", 401, "UNAUTHORIZED");
    }

    if (error instanceof Error && error.message === "FORBIDDEN") {
      return failure(
        "You do not have permission to delete this booking.",
        403,
        "FORBIDDEN",
      );
    }

    if (error instanceof Error && error.message === "USER_HAS_NO_ADMIN") {
      return failure("User is not associated with an admin.", 403, "FORBIDDEN");
    }

    return failure("Unable to delete booking.", 500, "INTERNAL_SERVER_ERROR");
  }
}
