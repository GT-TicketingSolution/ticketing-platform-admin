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

import {
  transactions,
  bookings,
  attractions,
  attractionManagement,
  attractionsAgainstBooking,
  categoryOfAttractionAgainstBooking,
  attractionCategory,
} from "@/db/schema";

import { requireAuth } from "@/lib/auth/require-auth";

import {
  requireModuleAccess,
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

    let accessibleAttractionIds: string[] = [];

    if (auth.user.role === "ADMIN") {
      const adminAttractions = await db
        .select({
          id: attractions.id,
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
    //
    // IMPORTANT:
    //
    // bookings does NOT contain attractionId.
    //
    // Attraction relationship:
    //
    // bookings
    //    ↓
    // attractionsAgainstBooking
    //    ↓
    // attractionManagement
    //    ↓
    // attractions
    // =====================================================

    const conditions = [
      isNull(transactions.deletedAt),

      eq(transactions.isDeleted, false),

      isNull(bookings.deletedAt),

      eq(bookings.isDeleted, false),

      // ---------------------------------------------------
      // Booking belongs to this admin through attraction.
      // ---------------------------------------------------

      sql`EXISTS (
        SELECT 1
        FROM ${attractionsAgainstBooking}
        INNER JOIN ${attractionManagement}
          ON ${attractionsAgainstBooking.attractionManagementId}
          = ${attractionManagement.id}
        INNER JOIN ${attractions}
          ON ${attractionManagement.attractionId}
          = ${attractions.id}
        WHERE
          ${attractionsAgainstBooking.bookingId}
          = ${bookings.id}

          AND ${attractions.adminId}
          = ${adminId}
      )`,

      // ---------------------------------------------------
      // Booking contains an attraction accessible
      // to the current user.
      // ---------------------------------------------------

      sql`EXISTS (
        SELECT 1
        FROM ${attractionsAgainstBooking}
        INNER JOIN ${attractionManagement}
          ON ${attractionsAgainstBooking.attractionManagementId}
          = ${attractionManagement.id}
        INNER JOIN ${attractions}
          ON ${attractionManagement.attractionId}
          = ${attractions.id}
        WHERE
          ${attractionsAgainstBooking.bookingId}
          = ${bookings.id}

          AND ${inArray(attractions.id, accessibleAttractionIds)}
      )`,
    ];

    // =====================================================
    // 9. ATTRACTION FILTER
    // =====================================================

    if (attractionId) {
      conditions.push(
        sql`EXISTS (
          SELECT 1
          FROM ${attractionsAgainstBooking}
          INNER JOIN ${attractionManagement}
            ON ${attractionsAgainstBooking.attractionManagementId}
            = ${attractionManagement.id}
          WHERE
            ${attractionsAgainstBooking.bookingId}
            = ${bookings.id}

            AND ${attractionManagement.attractionId}
            = ${attractionId}::uuid
        )`,
      );
    }

    // =====================================================
    // 10. SEARCH
    // =====================================================

    if (search) {
      const searchValue = `%${search}%`;

      conditions.push(
        or(
          ilike(transactions.invoiceNumber, searchValue),

          ilike(bookings.customerName, searchValue),

          ilike(bookings.mobileNumber, searchValue),

          ilike(bookings.gstNumber, searchValue),

          // Search attraction name.
          sql`EXISTS (
            SELECT 1
            FROM ${attractionsAgainstBooking}
            INNER JOIN ${attractionManagement}
              ON ${attractionsAgainstBooking.attractionManagementId}
              = ${attractionManagement.id}
            INNER JOIN ${attractions}
              ON ${attractionManagement.attractionId}
              = ${attractions.id}
            WHERE
              ${attractionsAgainstBooking.bookingId}
              = ${bookings.id}

              AND ${attractions.name}
              ILIKE ${searchValue}
          )`,
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

    // =====================================================
    // 15. WHERE CLAUSE
    // =====================================================

    const whereClause = and(...conditions);

    // =====================================================
    // 16. TOTAL COUNT
    // =====================================================

    const [{ count: totalCount }] = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(transactions)
      .innerJoin(bookings, eq(transactions.bookingId, bookings.id))
      .where(whereClause);

    const total = Number(totalCount || 0);

    // =====================================================
    // 17. TRANSACTIONS
    // =====================================================

    const transactionRows = await db
      .select({
        id: transactions.id,

        // Same invoice number as bookings.invoiceNumber.
        invoiceNumber: transactions.invoiceNumber,

        customerName: bookings.customerName,

        mobileNumber: bookings.mobileNumber,

        gstNumber: bookings.gstNumber,

        // Used internally for categories.
        bookingId: bookings.id,

        TotalAmount: transactions.amount,

        paymentMode: transactions.paymentMode,

        status: transactions.status,

        // IMPORTANT:
        // This is transactions.createdAt.
        dateTime: transactions.createdAt,
      })
      .from(transactions)
      .innerJoin(bookings, eq(transactions.bookingId, bookings.id))
      .where(whereClause)
      .orderBy(desc(transactions.createdAt))
      .limit(limit)
      .offset(offset);

    // =====================================================
    // 18. NO TRANSACTIONS
    // =====================================================

    if (transactionRows.length === 0) {
      return success({
        items: [],

        attractions: attractionRows,

        pagination: {
          page,
          limit,
          total,
          totalPages: total === 0 ? 0 : Math.ceil(total / limit),
        },
      });
    }

    // =====================================================
    // 19. BOOKING IDS
    // =====================================================

    const bookingIds = Array.from(
      new Set(transactionRows.map((transaction) => transaction.bookingId)),
    );

    // =====================================================
    // 20. GET ATTRACTIONS FOR TRANSACTIONS
    // =====================================================

    const transactionAttractions = await db
      .select({
        bookingId: attractionsAgainstBooking.bookingId,
        attractionId: attractions.id,
        attractionName: attractions.name,

        attractionSubtotal: attractionsAgainstBooking.attractionSubtotal,
        attractionGst: attractionsAgainstBooking.attractionGst,
        attractionRoundoff: attractionsAgainstBooking.attractionRoundoff,
        attractionRoundOffGstAdj:
          attractionsAgainstBooking.attractionRoundOffGstAdj,
        attractionTotalAmount: attractionsAgainstBooking.attractionTotalAmount,
      })
      .from(attractionsAgainstBooking)
      .innerJoin(
        attractionManagement,
        eq(
          attractionsAgainstBooking.attractionManagementId,
          attractionManagement.id,
        ),
      )
      .innerJoin(
        attractions,
        eq(attractionManagement.attractionId, attractions.id),
      )
      .where(
        and(
          inArray(attractionsAgainstBooking.bookingId, bookingIds),
          eq(attractions.adminId, adminId),
          inArray(attractions.id, accessibleAttractionIds),
        ),
      );

    // =====================================================
    // 21. ATTRACTION MAP
    // =====================================================

    const attractionMap = new Map<
      string,
      Array<{
        id: string;
        name: string;
        attractionSubtotal: number;
        attractionGst: number;
        attractionRoundoff: number;
        attractionRoundOffGstAdj: number;
        attractionTotalAmount: number;
      }>
    >();

    for (const row of transactionAttractions) {
      if (!attractionMap.has(row.bookingId)) {
        attractionMap.set(row.bookingId, []);
      }

      const list = attractionMap.get(row.bookingId)!;

      list.push({
        id: row.attractionId,
        name: row.attractionName,
        attractionSubtotal: Number(row.attractionSubtotal || 0),
        attractionGst: Number(row.attractionGst || 0),
        attractionRoundoff: Number(row.attractionRoundoff || 0),
        attractionRoundOffGstAdj: Number(row.attractionRoundOffGstAdj || 0),
        attractionTotalAmount: Number(row.attractionTotalAmount || 0),
      });
    }

    // =====================================================
    // 22. GET CATEGORY DETAILS
    // =====================================================

    const categoryRows = await db
      .select({
        bookingId: categoryOfAttractionAgainstBooking.bookingId,

        categoryId: categoryOfAttractionAgainstBooking.categoryId,

        categoryName: attractionCategory.name,

        noOfSeats: attractionCategory.noOfSeats,
      })
      .from(categoryOfAttractionAgainstBooking)
      .innerJoin(
        attractionCategory,
        eq(
          categoryOfAttractionAgainstBooking.categoryId,
          attractionCategory.id,
        ),
      )
      .where(inArray(categoryOfAttractionAgainstBooking.bookingId, bookingIds));

    // =====================================================
    // 23. CATEGORY MAP
    // =====================================================

    const categoryMap = new Map<
      string,
      Array<{
        id: string;
        name: string;
        noOfSeats: number;
      }>
    >();

    for (const row of categoryRows) {
      if (!categoryMap.has(row.bookingId)) {
        categoryMap.set(row.bookingId, []);
      }

      categoryMap.get(row.bookingId)!.push({
        id: row.categoryId,

        name: row.categoryName,

        noOfSeats: Number(row.noOfSeats || 0),
      });
    }

    // =====================================================
    // 24. RESPONSE ITEMS
    // =====================================================

    const items = transactionRows.map((transaction, index) => {
      const transactionAttractionList =
        attractionMap.get(transaction.bookingId) || [];

      const categories = categoryMap.get(transaction.bookingId) || [];

      const sNo = offset + index + 1;

      return {
        // Transaction UUID
        id: transaction.id,

        // Actual invoice number from transactions table
        invoiceNumber: transaction.invoiceNumber,

        customer: {
          name: transaction.customerName,
          mobileNumber: transaction.mobileNumber,
          gstNumber: transaction.gstNumber,
        },

        // transactions.createdAt
        dateTime: transaction.dateTime,

        attractions: transactionAttractionList,

        grandTotalAmount: Number(transaction.TotalAmount),

        paymentMode: transaction.paymentMode,

        status: transaction.status,

        categories,
      };
    });

    // =====================================================
    // 25. RESPONSE
    // =====================================================

    return success({
      items,

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
