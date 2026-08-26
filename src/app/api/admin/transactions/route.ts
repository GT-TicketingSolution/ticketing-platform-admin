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

import { z } from "zod";

import { db } from "@/db";

import { transactions, bookings, attractions } from "@/db/schema";

import { requireAuth } from "@/lib/auth/require-auth";

import {
  requireModuleAccess,
  requireAttractionAccess,
  getAdminId,
  getAccessibleAttractionIds,
} from "@/lib/auth/authorization";

import { success, failure } from "@/lib/api/response";

// =====================================================
// GET TRANSACTIONS
// ADMIN + MANAGER + STAFF WITH MODULE/ATTRACTION ACCESS
// =====================================================

export async function GET(request: NextRequest) {
  try {
    // =====================================================
    // 1. AUTHENTICATION
    // =====================================================

    const auth = await requireAuth(request);

    // =====================================================
    // 2. MODULE AUTHORIZATION
    // =====================================================

    await requireModuleAccess(auth, "TRANSACTIONS");

    // =====================================================
    // 3. TENANT / ADMIN
    // =====================================================

    const adminId = getAdminId(auth);

    // =====================================================
    // 4. QUERY PARAMS
    // =====================================================

    const { searchParams } = new URL(request.url);

    const page = Math.max(Number(searchParams.get("page") || "1"), 1);

    const limit = Math.min(
      Math.max(Number(searchParams.get("limit") || "10"), 1),
      100,
    );

    const search = searchParams.get("search")?.trim() || "";

    const paymentMode = searchParams.get("paymentMode")?.trim() || "";

    const status = searchParams.get("status")?.trim().toUpperCase() || "";

    const fromDate = searchParams.get("fromDate")?.trim() || "";

    const toDate = searchParams.get("toDate")?.trim() || "";

    const attractionId = searchParams.get("attractionId")?.trim() || "";

    const offset = (page - 1) * limit;

    // =====================================================
    // 5. ACCESSIBLE ATTRACTIONS
    // =====================================================

    let accessibleAttractionIds: string[];

    if (auth.user.role === "ADMIN") {
      // Admin can access all attractions belonging
      // to their own tenant.
      const adminAttractions = await db
        .select({
          id: attractions.id,
          name: attractions.name,
        })
        .from(attractions)
        .where(
          and(
            eq(attractions.adminId, adminId),
            eq(attractions.status, "ACTIVE"),
          ),
        );

      accessibleAttractionIds = adminAttractions.map(
        (attraction) => attraction.id,
      );
    } else {
      // Manager / Staff
      accessibleAttractionIds = await getAccessibleAttractionIds(auth);
    }

    // =====================================================
    // 6. NO ATTRACTION ACCESS
    // =====================================================

    if (accessibleAttractionIds.length === 0) {
      return success({
        items: [],

        attractions: [],

        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      });
    }

    // =====================================================
    // 7. ATTRACTIONS FOR FRONTEND DROPDOWN
    // =====================================================

    const attractionRows = await db
      .select({
        id: attractions.id,
        name: attractions.name,
      })
      .from(attractions)
      .where(
        and(
          eq(attractions.adminId, adminId),
          eq(attractions.status, "ACTIVE"),
          inArray(attractions.id, accessibleAttractionIds),
        ),
      )
      .orderBy(attractions.name);

    // =====================================================
    // 8. BASE CONDITIONS
    // =====================================================

    const conditions = [
      isNull(transactions.deletedAt),

      isNull(bookings.deletedAt),

      // Tenant boundary
      eq(attractions.adminId, adminId),

      // User attraction access
      inArray(attractions.id, accessibleAttractionIds),
    ];

    // =====================================================
    // 9. ATTRACTION FILTER
    // =====================================================

    if (attractionId) {
      conditions.push(eq(attractions.id, attractionId));
    }

    // =====================================================
    // 10. SEARCH
    // =====================================================

    if (search) {
      conditions.push(
        or(
          ilike(transactions.transactionNumber, `%${search}%`),

          ilike(bookings.bookingNumber, `%${search}%`),

          ilike(bookings.customerName, `%${search}%`),

          ilike(attractions.name, `%${search}%`),
        )!,
      );
    }

    // =====================================================
    // 11. PAYMENT MODE
    // =====================================================

    if (paymentMode && paymentMode !== "ALL") {
      conditions.push(
        eq(
          transactions.paymentMode,
          paymentMode as (typeof transactions.paymentMode.enumValues)[number],
        ),
      );
    }

    // =====================================================
    // 12. TRANSACTION STATUS
    // =====================================================

    if (status && status !== "ALL") {
      conditions.push(
        eq(
          transactions.status,
          status as (typeof transactions.status.enumValues)[number],
        ),
      );
    }

    // =====================================================
    // 13. FROM DATE
    // =====================================================

    if (fromDate) {
      const startDate = new Date(`${fromDate}T00:00:00.000Z`);

      if (Number.isNaN(startDate.getTime())) {
        return failure("Invalid fromDate.", 400, "INVALID_FROM_DATE");
      }

      conditions.push(gte(transactions.createdAt, startDate));
    }

    // =====================================================
    // 14. TO DATE
    // =====================================================

    if (toDate) {
      const endDate = new Date(`${toDate}T23:59:59.999Z`);

      if (Number.isNaN(endDate.getTime())) {
        return failure("Invalid toDate.", 400, "INVALID_TO_DATE");
      }

      conditions.push(lte(transactions.createdAt, endDate));
    }

    const whereClause = and(...conditions);

    // =====================================================
    // 15. TOTAL COUNT
    // =====================================================

    const [{ count }] = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(transactions)
      .innerJoin(bookings, eq(transactions.bookingId, bookings.id))
      .innerJoin(attractions, eq(bookings.attractionId, attractions.id))
      .where(whereClause);

    const total = Number(count);

    // =====================================================
    // 16. TRANSACTIONS
    // =====================================================

    const transactionRows = await db
      .select({
        id: transactions.id,

        transactionId: transactions.transactionNumber,

        customerName: bookings.customerName,

        bookingId: bookings.bookingNumber,

        attractionId: attractions.id,

        attractionName: attractions.name,

        amount: transactions.amount,

        paymentMode: transactions.paymentMode,

        status: transactions.status,

        transactionDate: transactions.createdAt,
      })
      .from(transactions)
      .innerJoin(bookings, eq(transactions.bookingId, bookings.id))
      .innerJoin(attractions, eq(bookings.attractionId, attractions.id))
      .where(whereClause)
      .orderBy(desc(transactions.createdAt))
      .limit(limit)
      .offset(offset);

    // =====================================================
    // 17. RESPONSE ITEMS
    // =====================================================

    const items = transactionRows.map((transaction) => ({
      id: transaction.id,

      transactionId: transaction.transactionId,

      customerName: transaction.customerName,

      transactionDate: transaction.transactionDate,

      bookingId: transaction.bookingId,

      attraction: {
        id: transaction.attractionId,
        name: transaction.attractionName,
      },

      amount: Number(transaction.amount),

      paymentMode: transaction.paymentMode,

      status: transaction.status,
    }));

    // =====================================================
    // 18. RESPONSE
    // =====================================================

    return success({
      items,

      // Used by frontend:
      // Attraction dropdown
      attractions: attractionRows,

      pagination: {
        page,

        limit,

        total,

        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get transactions error:", error);

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return failure("Authentication required.", 401, "UNAUTHORIZED");
    }

    if (error instanceof Error && error.message === "ACCOUNT_NOT_ACTIVE") {
      return failure("Account is not active.", 403, "ACCOUNT_NOT_ACTIVE");
    }

    if (error instanceof Error && error.message === "FORBIDDEN") {
      return failure(
        "You do not have permission to access transactions.",
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

    return failure(
      "Unable to fetch transactions.",
      500,
      "INTERNAL_SERVER_ERROR",
    );
  }
}

// =====================================================
// POST TRANSACTION
// ADMIN + MANAGER + STAFF WITH ACCESS
// =====================================================

const createTransactionSchema = z.object({
  bookingId: z.string().uuid("Invalid booking ID."),

  amount: z.number().positive("Amount must be greater than 0."),

  paymentMode: z.enum(["CASH", "UPI", "CARD", "ONLINE"]),

  status: z
    .enum(["SUCCESSFUL", "PENDING", "CANCELLED", "FAILED"])
    .optional()
    .default("SUCCESSFUL"),
});

export async function POST(request: NextRequest) {
  try {
    // =====================================================
    // 1. AUTHENTICATION
    // =====================================================

    const auth = await requireAuth(request);

    // =====================================================
    // 2. MODULE AUTHORIZATION
    // =====================================================

    await requireModuleAccess(auth, "TRANSACTIONS");

    // =====================================================
    // 3. TENANT / ADMIN
    // =====================================================

    const adminId = getAdminId(auth);

    // =====================================================
    // 4. REQUEST BODY
    // =====================================================

    const body = await request.json();

    const parsed = createTransactionSchema.safeParse(body);

    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message || "Invalid request data.",
        400,
        "VALIDATION_ERROR",
      );
    }

    const data = parsed.data;

    // =====================================================
    // 5. FIND BOOKING
    // =====================================================

    const [booking] = await db
      .select({
        id: bookings.id,

        bookingNumber: bookings.bookingNumber,

        customerName: bookings.customerName,

        attractionId: bookings.attractionId,

        attractionName: attractions.name,
      })
      .from(bookings)
      .innerJoin(attractions, eq(bookings.attractionId, attractions.id))
      .where(
        and(
          eq(bookings.id, data.bookingId),

          isNull(bookings.deletedAt),

          eq(attractions.adminId, adminId),
        ),
      )
      .limit(1);

    if (!booking) {
      return failure("Booking not found.", 404, "BOOKING_NOT_FOUND");
    }

    // =====================================================
    // 6. ATTRACTION AUTHORIZATION
    // =====================================================

    try {
      await requireAttractionAccess(auth, booking.attractionId);
    } catch (error) {
      if (error instanceof Error && error.message === "FORBIDDEN") {
        return failure(
          "You do not have access to this attraction.",
          403,
          "ATTRACTION_ACCESS_DENIED",
        );
      }

      throw error;
    }

    // =====================================================
    // 7. GENERATE TRANSACTION NUMBER
    // =====================================================

    const transactionNumber = `TXN-${new Date().getFullYear()}-${crypto
      .randomUUID()
      .replace(/-/g, "")
      .slice(0, 8)
      .toUpperCase()}`;

    // =====================================================
    // 8. CREATE TRANSACTION
    // =====================================================

    const [transaction] = await db
      .insert(transactions)
      .values({
        transactionNumber,

        bookingId: data.bookingId,

        amount: data.amount.toFixed(2),

        paymentMode: data.paymentMode,

        status: data.status,
      })
      .returning({
        transactionNumber: transactions.transactionNumber,

        bookingId: transactions.bookingId,

        amount: transactions.amount,

        paymentMode: transactions.paymentMode,

        status: transactions.status,

        createdAt: transactions.createdAt,
      });

    // =====================================================
    // 9. RESPONSE
    // =====================================================

    return success(
      {
        transactionId: transaction.transactionNumber,

        customerName: booking.customerName,

        transactionDate: transaction.createdAt,

        bookingId: booking.bookingNumber,

        attraction: {
          id: booking.attractionId,
          name: booking.attractionName,
        },

        amount: Number(transaction.amount),

        paymentMode: transaction.paymentMode,

        status: transaction.status,
      },
      201,
    );
  } catch (error) {
    console.error("Create transaction error:", error);

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return failure("Authentication required.", 401, "UNAUTHORIZED");
    }

    if (error instanceof Error && error.message === "ACCOUNT_NOT_ACTIVE") {
      return failure("Account is not active.", 403, "ACCOUNT_NOT_ACTIVE");
    }

    if (error instanceof Error && error.message === "FORBIDDEN") {
      return failure(
        "You do not have permission to create transactions.",
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

    return failure(
      "Unable to create transaction.",
      500,
      "INTERNAL_SERVER_ERROR",
    );
  }
}
