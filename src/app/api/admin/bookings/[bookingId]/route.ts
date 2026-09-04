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

    const gstNumber =
      typeof body.gstNumber === "string" ? body.gstNumber.trim() : null;

    const totalAmount =
      body.totalAmount !== undefined ? Number(body.totalAmount) : undefined;

    const amountReceived =
      body.amountReceived !== undefined
        ? Number(body.amountReceived)
        : undefined;

    const returnAmount =
      body.returnAmount !== undefined ? Number(body.returnAmount) : undefined;

    // =====================================================
    // 5. VALIDATION
    // =====================================================

    if (customerName && customerName.length < 2) {
      return failure(
        "Name must be at least 2 characters.",
        400,
        "INVALID_CUSTOMER_NAME",
      );
    }

    if (mobileNumber && !/^[6-9]\d{9}$/.test(mobileNumber)) {
      return failure(
        "Enter a valid 10-digit Indian mobile number.",
        400,
        "INVALID_MOBILE_NUMBER",
      );
    }

    if (
      gstNumber &&
      !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(
        gstNumber,
      )
    ) {
      return failure("Enter a valid GST number.", 400, "INVALID_GST_NUMBER");
    }

    if (
      totalAmount !== undefined &&
      (!Number.isFinite(totalAmount) || totalAmount < 0)
    ) {
      return failure(
        "Total amount must be a valid positive number.",
        400,
        "INVALID_TOTAL_AMOUNT",
      );
    }

    if (
      amountReceived !== undefined &&
      (!Number.isFinite(amountReceived) || amountReceived < 0)
    ) {
      return failure(
        "Amount received must be a valid positive number.",
        400,
        "INVALID_AMOUNT_RECEIVED",
      );
    }

    if (
      returnAmount !== undefined &&
      (!Number.isFinite(returnAmount) || returnAmount < 0)
    ) {
      return failure(
        "Return amount must be a valid positive number.",
        400,
        "INVALID_RETURN_AMOUNT",
      );
    }

    // =====================================================
    // 6. FIND BOOKING
    // =====================================================

    const [existingBooking] = await db
      .select({
        id: bookings.id,

        invoiceNumber: bookings.invoiceNumber,

        totalAmount: bookings.totalAmount,
      })
      .from(bookings)
      .where(and(eq(bookings.id, bookingId), isNull(bookings.deletedAt)))
      .limit(1);

    if (!existingBooking) {
      return failure("Booking not found.", 404, "BOOKING_NOT_FOUND");
    }

    // =====================================================
    // 7. BUILD UPDATE DATA (only include provided fields)
    // =====================================================

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (customerName) {
      updateData.customerName = customerName;
    }

    if (mobileNumber) {
      updateData.mobileNumber = mobileNumber;
    }

    if (gstNumber !== undefined && gstNumber !== null) {
      updateData.gstNumber = gstNumber;
    }

    if (totalAmount !== undefined) {
      updateData.totalAmount = totalAmount.toFixed(2);
    }

    if (amountReceived !== undefined) {
      updateData.amountReceived = amountReceived.toFixed(2);
    }

    if (returnAmount !== undefined) {
      updateData.returnAmount = returnAmount.toFixed(2);
    }

    // =====================================================
    // 8. UPDATE BOOKING
    // =====================================================

    const [updatedBooking] = await db
      .update(bookings)
      .set(updateData)
      .where(and(eq(bookings.id, bookingId), isNull(bookings.deletedAt)))
      .returning({
        id: bookings.id,

        invoiceNumber: bookings.invoiceNumber,

        customerName: bookings.customerName,

        mobileNumber: bookings.mobileNumber,

        gstNumber: bookings.gstNumber,

        totalAmount: bookings.totalAmount,

        amountReceived: bookings.amountReceived,

        returnAmount: bookings.returnAmount,

        updatedAt: bookings.updatedAt,
      });

    if (!updatedBooking) {
      return failure("Booking not found.", 404, "BOOKING_NOT_FOUND");
    }

    return success({
      booking: {
        id: updatedBooking.id,

        invoiceNumber: updatedBooking.invoiceNumber,

        customer: {
          name: updatedBooking.customerName,
          mobileNumber: updatedBooking.mobileNumber,
          gstNumber: updatedBooking.gstNumber,
        },

        amount: {
          total: Number(updatedBooking.totalAmount),
          received: Number(updatedBooking.amountReceived),
          returnAmount: Number(updatedBooking.returnAmount),
        },

        updatedAt: updatedBooking.updatedAt,
      },
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

        invoiceNumber: bookings.invoiceNumber,

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
    // 6. SOFT DELETE
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

        invoiceNumber: bookings.invoiceNumber,

        deletedAt: bookings.deletedAt,
      });

    if (!deletedBooking) {
      return failure("Booking could not be deleted.", 404, "BOOKING_NOT_FOUND");
    }

    return success({
      message: "Booking deleted successfully.",

      booking: {
        id: deletedBooking.id,

        invoiceNumber: deletedBooking.invoiceNumber,

        deletedAt: deletedBooking.deletedAt,
      },
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
