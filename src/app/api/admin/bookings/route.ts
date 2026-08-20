import { NextRequest } from "next/server";

import {
  and,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNull,
  lte,
  or,
  sql,
} from "drizzle-orm";

import { db } from "@/db";

import { bookings, bookingItems, bookingSeats, attractions } from "@/db/schema";

import { requireAuth } from "@/lib/auth/require-auth";

import {
  requireModuleAccess,
  requireAttractionAccess,
  getAdminId,
  getAccessibleAttractionIds,
} from "@/lib/auth/authorization";

import { success, failure } from "@/lib/api/response";

// =====================================================
// GET BOOKINGS
// =====================================================

export async function GET(request: NextRequest) {
  try {
    // ---------------------------------------------
    // Authentication
    // ---------------------------------------------

    const auth = await requireAuth(request);

    // ---------------------------------------------
    // Module authorization
    // ---------------------------------------------

    await requireModuleAccess(auth, "BOOKINGS");

    // ---------------------------------------------
    // Tenant / Admin
    // ---------------------------------------------

    const adminId = getAdminId(auth);

    // ---------------------------------------------
    // Query params
    // ---------------------------------------------

    const { searchParams } = new URL(request.url);

    const page = Math.max(Number(searchParams.get("page") || "1"), 1);

    const limit = Math.min(
      Math.max(Number(searchParams.get("limit") || "10"), 1),
      100,
    );

    const search = searchParams.get("search")?.trim() || "";

    const attractionId = searchParams.get("attractionId")?.trim() || "";

    const status = searchParams.get("status")?.trim() || "";

    const fromDate = searchParams.get("fromDate")?.trim() || "";

    const toDate = searchParams.get("toDate")?.trim() || "";

    const offset = (page - 1) * limit;

    // ---------------------------------------------
    // BASE SECURITY CONDITIONS
    // ---------------------------------------------

    /*
     * Every user must stay inside their admin/tenant.
     *
     * ADMIN:
     *   attractions.adminId = adminId
     *
     * MANAGER:
     *   attractions.adminId = adminId
     *   +
     *   attraction assigned to manager
     *
     * STAFF:
     *   attractions.adminId = adminId
     *   +
     *   attraction assigned to staff
     */

    const conditions = [
      isNull(bookings.deletedAt),

      // Tenant isolation
      eq(attractions.adminId, adminId),
    ];

    // ---------------------------------------------
    // MANAGER / STAFF ATTRACTION ISOLATION
    // ---------------------------------------------

    if (auth.user.role !== "ADMIN") {
      const accessibleAttractionIds = await getAccessibleAttractionIds(auth);

      /*
       * No assigned attractions means no bookings.
       *
       * IMPORTANT:
       * Do not remove this condition.
       * Returning [] is safer than allowing access.
       */

      if (accessibleAttractionIds.length === 0) {
        return success({
          items: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
          },
        });
      }

      conditions.push(inArray(attractions.id, accessibleAttractionIds));
    }

    // ---------------------------------------------
    // Search
    // ---------------------------------------------

    if (search) {
      conditions.push(
        or(
          ilike(bookings.bookingNumber, `%${search}%`),
          ilike(bookings.customerName, `%${search}%`),
          ilike(bookings.mobileNumber, `%${search}%`),
        )!,
      );
    }

    // ---------------------------------------------
    // Attraction filter
    // ---------------------------------------------

    if (attractionId) {
      /*
       * This is safe because the base conditions already
       * enforce tenant + attraction authorization.
       */
      conditions.push(eq(bookings.attractionId, attractionId));
    }

    // ---------------------------------------------
    // Status filter
    // ---------------------------------------------

    if (
      status === "PENDING" ||
      status === "CONFIRMED" ||
      status === "CANCELLED"
    ) {
      conditions.push(eq(bookings.status, status));
    }

    // ---------------------------------------------
    // From date
    // ---------------------------------------------

    if (fromDate) {
      const startDate = new Date(`${fromDate}T00:00:00.000Z`);

      if (Number.isNaN(startDate.getTime())) {
        return failure("Invalid fromDate.", 400, "INVALID_FROM_DATE");
      }

      conditions.push(gte(bookings.visitAt, startDate));
    }

    // ---------------------------------------------
    // To date
    // ---------------------------------------------

    if (toDate) {
      const endDate = new Date(`${toDate}T23:59:59.999Z`);

      if (Number.isNaN(endDate.getTime())) {
        return failure("Invalid toDate.", 400, "INVALID_TO_DATE");
      }

      conditions.push(lte(bookings.visitAt, endDate));
    }

    // ---------------------------------------------
    // WHERE
    // ---------------------------------------------

    const whereClause = and(...conditions);

    // ---------------------------------------------
    // TOTAL COUNT
    // ---------------------------------------------

    const [{ count }] = await db
      .select({
        count: sql<number>`
          count(distinct ${bookings.id})
        `,
      })
      .from(bookings)
      .innerJoin(attractions, eq(bookings.attractionId, attractions.id))
      .where(whereClause);

    const total = Number(count);

    // ---------------------------------------------
    // BOOKING LIST
    // ---------------------------------------------

    const bookingRows = await db
      .select({
        id: bookings.id,

        bookingId: bookings.bookingNumber,

        customerName: bookings.customerName,

        mobileNumber: bookings.mobileNumber,

        bookingDate: bookings.visitAt,

        attractionId: attractions.id,

        attractionName: attractions.name,

        totalVisitors: sql<number>`
          COALESCE(
            SUM(${bookingItems.quantity}),
            0
          )
        `,

        amount: bookings.totalAmount,

        amountPaid: bookings.amountPaid,

        paymentMode: bookings.paymentMode,

        status: bookings.status,
      })
      .from(bookings)
      .innerJoin(attractions, eq(bookings.attractionId, attractions.id))
      .leftJoin(bookingItems, eq(bookingItems.bookingId, bookings.id))
      .where(whereClause)
      .groupBy(
        bookings.id,
        bookings.bookingNumber,
        bookings.customerName,
        bookings.mobileNumber,
        bookings.visitAt,
        attractions.id,
        attractions.name,
        bookings.totalAmount,
        bookings.amountPaid,
        bookings.paymentMode,
        bookings.status,
      )
      .orderBy(desc(bookings.visitAt))
      .limit(limit)
      .offset(offset);

    // ---------------------------------------------
    // FORMAT RESPONSE
    // ---------------------------------------------

    const items = bookingRows.map((booking) => ({
      id: booking.id,

      bookingId: booking.bookingId,

      customerName: booking.customerName,

      mobileNumber: booking.mobileNumber,

      bookingDate: booking.bookingDate,

      attraction: {
        id: booking.attractionId,
        name: booking.attractionName,
      },

      visitors: {
        total: Number(booking.totalVisitors) || 0,
      },

      amount: Number(booking.amount),

      amountPaid: Number(booking.amountPaid),

      paymentMode: booking.paymentMode,

      status: booking.status,
    }));

    // ---------------------------------------------
    // RESPONSE
    // ---------------------------------------------

    return success({
      items,

      pagination: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get bookings error:", error);

    // ---------------------------------------------
    // AUTHORIZATION ERRORS
    // ---------------------------------------------

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return failure("Authentication required.", 401, "UNAUTHORIZED");
    }

    if (error instanceof Error && error.message === "ACCOUNT_NOT_ACTIVE") {
      return failure("Account is not active.", 403, "ACCOUNT_NOT_ACTIVE");
    }

    if (error instanceof Error && error.message === "FORBIDDEN") {
      return failure(
        "You do not have permission to access bookings.",
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

    return failure("Unable to fetch bookings.", 500, "INTERNAL_SERVER_ERROR");
  }
}

// =====================================================
// POST BOOKING
// =====================================================

export async function POST(request: NextRequest) {
  try {
    // ---------------------------------------------
    // Authentication
    // ---------------------------------------------

    const auth = await requireAuth(request);

    // ---------------------------------------------
    // Module authorization
    // ---------------------------------------------

    await requireModuleAccess(auth, "BOOKINGS");

    // ---------------------------------------------
    // Tenant / Admin
    // ---------------------------------------------

    const adminId = getAdminId(auth);

    // ---------------------------------------------
    // Request body
    // ---------------------------------------------

    const body = await request.json();

    const {
      customerName,
      mobileNumber,
      gstNumber,
      attractionId,
      visitDate,
      visitTime,
      paymentMode,
      status,
      tickets,
      seats,
    } = body;

    // ---------------------------------------------
    // Basic validation
    // ---------------------------------------------

    if (!customerName || typeof customerName !== "string") {
      return failure(
        "Customer name is required.",
        400,
        "CUSTOMER_NAME_REQUIRED",
      );
    }

    if (!mobileNumber || typeof mobileNumber !== "string") {
      return failure(
        "Mobile number is required.",
        400,
        "MOBILE_NUMBER_REQUIRED",
      );
    }

    if (!attractionId) {
      return failure("Attraction is required.", 400, "ATTRACTION_ID_REQUIRED");
    }

    if (!visitDate || !visitTime) {
      return failure(
        "Visit date and time are required.",
        400,
        "VISIT_DATETIME_REQUIRED",
      );
    }

    if (!paymentMode) {
      return failure("Payment mode is required.", 400, "PAYMENT_MODE_REQUIRED");
    }

    if (!Array.isArray(tickets) || tickets.length === 0) {
      return failure(
        "At least one ticket is required.",
        400,
        "TICKETS_REQUIRED",
      );
    }

    // ---------------------------------------------
    // ATTRACTION AUTHORIZATION
    // ---------------------------------------------

    /*
     * This is critical.
     *
     * ADMIN:
     *   attraction must belong to admin
     *
     * MANAGER:
     *   attraction must be assigned to manager
     *
     * STAFF:
     *   attraction must be assigned to staff
     */

    try {
      await requireAttractionAccess(auth, attractionId);
    } catch (error) {
      if (error instanceof Error && error.message === "FORBIDDEN") {
        /*
         * Return 404 instead of revealing whether
         * another user's attraction exists.
         */
        return failure(
          "Attraction not found or access denied.",
          404,
          "ATTRACTION_NOT_FOUND",
        );
      }

      throw error;
    }

    // ---------------------------------------------
    // Validate attraction belongs to admin
    // ---------------------------------------------

    const [attraction] = await db
      .select({
        id: attractions.id,
        name: attractions.name,
      })
      .from(attractions)
      .where(
        and(
          eq(attractions.id, attractionId),

          /*
           * Additional tenant isolation.
           *
           * Even if an authorization mapping is
           * accidentally incorrect, this prevents
           * crossing admin boundaries.
           */
          eq(attractions.adminId, adminId),
        ),
      )
      .limit(1);

    if (!attraction) {
      return failure(
        "Attraction not found or access denied.",
        404,
        "ATTRACTION_NOT_FOUND",
      );
    }

    // ---------------------------------------------
    // Calculate ticket totals
    // ---------------------------------------------

    let totalAmount = 0;

    let normalizedTickets;

    try {
      normalizedTickets = tickets.map(
        (ticket: {
          attractionId?: string;
          category: string;
          quantity: number;
          unitPrice: number;
        }) => {
          const ticketAttractionId = ticket.attractionId || attractionId;
          const quantity = Number(ticket.quantity);

          const unitPrice = Number(ticket.unitPrice);

          if (
            !ticket.category ||
            !Number.isInteger(quantity) ||
            quantity <= 0 ||
            !Number.isFinite(unitPrice) ||
            unitPrice < 0
          ) {
            throw new Error("INVALID_TICKET");
          }

          const totalPrice = quantity * unitPrice;

          totalAmount += totalPrice;

          return {
            attractionId: ticketAttractionId,
            category: ticket.category.trim(),

            quantity,

            unitPrice: unitPrice.toFixed(2),

            totalPrice: totalPrice.toFixed(2),
          };
        },
      );
    } catch (error) {
      if (error instanceof Error && error.message === "INVALID_TICKET") {
        return failure("Invalid ticket details.", 400, "INVALID_TICKET");
      }

      throw error;
    }

    // ---------------------------------------------
    // Visit datetime
    // ---------------------------------------------

    const visitAt = new Date(`${visitDate}T${visitTime}:00`);

    if (Number.isNaN(visitAt.getTime())) {
      return failure(
        "Invalid visit date or time.",
        400,
        "INVALID_VISIT_DATETIME",
      );
    }

    // ---------------------------------------------
    // Booking number
    // ---------------------------------------------

    const bookingNumber = `BK-${Date.now()}`;

    // ---------------------------------------------
    // Create booking transactionally
    // ---------------------------------------------

    const result = await db.transaction(async (tx) => {
      // -----------------------------------------
      // Create booking
      // -----------------------------------------

      const [booking] = await tx
        .insert(bookings)
        .values({
          bookingNumber,

          customerName: customerName.trim(),

          mobileNumber: mobileNumber.trim(),

          gstNumber: gstNumber?.trim() || null,

          attractionId,

          visitAt,

          paymentMode,

          status:
            status === "PENDING" ||
            status === "CANCELLED" ||
            status === "CONFIRMED"
              ? status
              : "CONFIRMED",

          totalAmount: totalAmount.toFixed(2),

          amountPaid: totalAmount.toFixed(2),

          updatedAt: new Date(),
        })
        .returning();

      if (!booking) {
        throw new Error("BOOKING_CREATE_FAILED");
      }

      // -----------------------------------------
      // Booking items
      // -----------------------------------------

      await tx.insert(bookingItems).values(
        normalizedTickets.map((ticket) => ({
          bookingId: booking.id,

          category: ticket.category,
          attractionId: ticket.attractionId,

          quantity: ticket.quantity,

          unitPrice: ticket.unitPrice,

          totalPrice: ticket.totalPrice,
        })),
      );

      // -----------------------------------------
      // Booking seats
      // -----------------------------------------

      if (Array.isArray(seats) && seats.length > 0) {
        await tx.insert(bookingSeats).values(
          seats.map(
            (seat: {
              slotId: string;
              visitDate: string;
              bogie?: string;
              seatNumber: string;
            }) => ({
              bookingId: booking.id,
              slotId: seat.slotId,
              visitDate: seat.visitDate,
              bogie: seat.bogie?.trim() || null,
              seatNumber: seat.seatNumber.trim(),
            }),
          ),
        );
      }

      return booking;
    });

    // ---------------------------------------------
    // Response
    // ---------------------------------------------

    return success(
      {
        booking: {
          id: result.id,

          bookingId: result.bookingNumber,

          customerName: result.customerName,

          mobileNumber: result.mobileNumber,

          gstNumber: result.gstNumber,

          attraction: {
            id: attraction.id,
            name: attraction.name,
          },

          visitAt: result.visitAt,

          paymentMode: result.paymentMode,

          status: result.status,

          totalAmount: Number(result.totalAmount),

          amountPaid: Number(result.amountPaid),

          tickets: normalizedTickets,

          seats: Array.isArray(seats) ? seats : [],
        },
      },
      201,
    );
  } catch (error) {
    console.error("Create booking error:", error);

    // ---------------------------------------------
    // AUTHORIZATION ERRORS
    // ---------------------------------------------

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

    // ---------------------------------------------
    // Booking creation error
    // ---------------------------------------------

    if (error instanceof Error && error.message === "BOOKING_CREATE_FAILED") {
      return failure("Unable to create booking.", 500, "BOOKING_CREATE_FAILED");
    }

    return failure("Unable to create booking.", 500, "INTERNAL_SERVER_ERROR");
  }
}
