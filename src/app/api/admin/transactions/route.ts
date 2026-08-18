// import { NextRequest } from "next/server";
// import { and, desc, eq, gte, ilike, isNull, lte, or, sql } from "drizzle-orm";

// import { db } from "@/db";
// import { transactions, bookings } from "@/db/schema";

// import { requireAuth } from "@/lib/auth/require-auth";
// import { success, failure } from "@/lib/api/response";

// // =====================================================
// // GET TRANSACTIONS
// // =====================================================

// export async function GET(request: NextRequest) {
//   try {
//     // ---------------------------------------------
//     // Authentication
//     // ---------------------------------------------

//     const auth = await requireAuth(request);

//     if (auth.user.role !== "ADMIN") {
//       return failure("Admin access required.", 403, "FORBIDDEN");
//     }

//     // ---------------------------------------------
//     // Query params
//     // ---------------------------------------------

//     const { searchParams } = new URL(request.url);

//     const page = Math.max(Number(searchParams.get("page") || "1"), 1);

//     const limit = Math.min(
//       Math.max(Number(searchParams.get("limit") || "10"), 1),
//       100,
//     );

//     const search = searchParams.get("search")?.trim() || "";
//     const paymentMode = searchParams.get("paymentMode")?.trim() || "";
//     const status = searchParams.get("status")?.trim() || "";

//     const fromDate = searchParams.get("fromDate")?.trim() || "";
//     const toDate = searchParams.get("toDate")?.trim() || "";

//     const offset = (page - 1) * limit;

//     // ---------------------------------------------
//     // Conditions
//     // ---------------------------------------------

//     const conditions = [
//       isNull(transactions.deletedAt),
//       isNull(bookings.deletedAt),
//     ];

//     // ---------------------------------------------
//     // Search
//     // ---------------------------------------------

//     if (search) {
//       conditions.push(
//         or(
//           ilike(transactions.transactionNumber, `%${search}%`),
//           ilike(bookings.bookingNumber, `%${search}%`),
//           ilike(bookings.customerName, `%${search}%`),
//         )!,
//       );
//     }

//     // ---------------------------------------------
//     // Payment mode
//     // ---------------------------------------------

//     if (paymentMode && paymentMode !== "ALL") {
//       conditions.push(
//         eq(
//           transactions.paymentMode,
//           paymentMode as (typeof transactions.paymentMode.enumValues)[number],
//         ),
//       );
//     }

//     // ---------------------------------------------
//     // Transaction status
//     // ---------------------------------------------

//     if (status && status !== "ALL") {
//       conditions.push(
//         eq(
//           transactions.status,
//           status as (typeof transactions.status.enumValues)[number],
//         ),
//       );
//     }

//     // ---------------------------------------------
//     // From date
//     // ---------------------------------------------

//     if (fromDate) {
//       const startDate = new Date(`${fromDate}T00:00:00.000Z`);

//       if (Number.isNaN(startDate.getTime())) {
//         return failure("Invalid fromDate.", 400, "INVALID_FROM_DATE");
//       }

//       conditions.push(gte(transactions.createdAt, startDate));
//     }

//     // ---------------------------------------------
//     // To date
//     // ---------------------------------------------

//     if (toDate) {
//       const endDate = new Date(`${toDate}T23:59:59.999Z`);

//       if (Number.isNaN(endDate.getTime())) {
//         return failure("Invalid toDate.", 400, "INVALID_TO_DATE");
//       }

//       conditions.push(lte(transactions.createdAt, endDate));
//     }

//     const whereClause = and(...conditions);

//     // ---------------------------------------------
//     // Total count
//     // ---------------------------------------------

//     const [{ count }] = await db
//       .select({
//         count: sql<number>`count(*)`,
//       })
//       .from(transactions)
//       .innerJoin(bookings, eq(transactions.bookingId, bookings.id))
//       .where(whereClause);

//     const total = Number(count);

//     // ---------------------------------------------
//     // Get transactions
//     // ---------------------------------------------

//     const transactionRows = await db
//       .select({
//         id: transactions.id,

//         transactionId: transactions.transactionNumber,

//         customerName: bookings.customerName,

//         bookingId: bookings.bookingNumber,

//         amount: transactions.amount,

//         paymentMode: transactions.paymentMode,

//         status: transactions.status,

//         transactionDate: transactions.createdAt,
//       })
//       .from(transactions)
//       .innerJoin(bookings, eq(transactions.bookingId, bookings.id))
//       .where(whereClause)
//       .orderBy(desc(transactions.createdAt))
//       .limit(limit)
//       .offset(offset);

//     // ---------------------------------------------
//     // Response
//     // ---------------------------------------------

//     const items = transactionRows.map((transaction) => ({
//       id: transaction.id,

//       transactionId: transaction.transactionId,

//       customerName: transaction.customerName,

//       transactionDate: transaction.transactionDate,

//       bookingId: transaction.bookingId,

//       amount: Number(transaction.amount),

//       paymentMode: transaction.paymentMode,

//       status: transaction.status,
//     }));

//     return success({
//       items,

//       pagination: {
//         page,
//         limit,
//         total,
//         totalPages: total === 0 ? 0 : Math.ceil(total / limit),
//       },
//     });
//   } catch (error) {
//     console.error("Get transactions error:", error);

//     return failure(
//       "Unable to fetch transactions.",
//       500,
//       "INTERNAL_SERVER_ERROR",
//     );
//   }
// }
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
  managerAttractionPermissions,
} from "@/db/schema";

import { requireAuth } from "@/lib/auth/require-auth";
import { success, failure } from "@/lib/api/response";

// =====================================================
// GET TRANSACTIONS
// ADMIN + MANAGER
// =====================================================

export async function GET(request: NextRequest) {
  try {
    // ---------------------------------------------
    // Authentication
    // ---------------------------------------------

    const auth = await requireAuth(request);

    const user = auth.user;

    if (user.role !== "ADMIN" && user.role !== "MANAGER") {
      return failure("Admin or Manager access required.", 403, "FORBIDDEN");
    }

    // ---------------------------------------------
    // Resolve tenant/admin ID
    // ---------------------------------------------

    const adminId = user.role === "ADMIN" ? user.id : user.adminId;

    if (!adminId) {
      return failure(
        "Unable to determine account owner.",
        403,
        "TENANT_NOT_FOUND",
      );
    }

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

    const paymentMode = searchParams.get("paymentMode")?.trim() || "";

    const status = searchParams.get("status")?.trim() || "";

    const fromDate = searchParams.get("fromDate")?.trim() || "";

    const toDate = searchParams.get("toDate")?.trim() || "";

    const attractionId = searchParams.get("attractionId")?.trim() || "";

    const offset = (page - 1) * limit;

    // =================================================
    // MANAGER ATTRACTION ACCESS
    // =================================================

    let allowedAttractionIds: string[] = [];

    if (user.role === "MANAGER") {
      const managerAttractions = await db
        .select({
          attractionId: managerAttractionPermissions.attractionId,
        })
        .from(managerAttractionPermissions)
        .innerJoin(
          attractions,
          eq(managerAttractionPermissions.attractionId, attractions.id),
        )
        .where(
          and(
            eq(managerAttractionPermissions.managerId, user.id),

            // Important tenant boundary
            eq(attractions.adminId, adminId),

            // Only active attractions
            eq(attractions.status, "ACTIVE"),
          ),
        );

      allowedAttractionIds = managerAttractions.map(
        (item) => item.attractionId,
      );

      // Manager has no attraction access
      if (allowedAttractionIds.length === 0) {
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
    }

    // =================================================
    // ATTRACTION FILTER VALIDATION
    // =================================================

    if (attractionId) {
      const [attraction] = await db
        .select({
          id: attractions.id,
        })
        .from(attractions)
        .where(
          and(
            eq(attractions.id, attractionId),
            eq(attractions.adminId, adminId),

            ...(user.role === "MANAGER"
              ? [inArray(attractions.id, allowedAttractionIds)]
              : []),
          ),
        )
        .limit(1);

      if (!attraction) {
        return failure("Attraction not found.", 404, "ATTRACTION_NOT_FOUND");
      }
    }

    // =================================================
    // BASE CONDITIONS
    // =================================================

    const conditions = [
      isNull(transactions.deletedAt),
      isNull(bookings.deletedAt),

      // Tenant boundary
      eq(attractions.adminId, adminId),
    ];

    // ---------------------------------------------
    // Manager attraction restriction
    // ---------------------------------------------

    if (user.role === "MANAGER") {
      conditions.push(inArray(attractions.id, allowedAttractionIds));
    }

    // ---------------------------------------------
    // Attraction filter
    // ---------------------------------------------

    if (attractionId) {
      conditions.push(eq(attractions.id, attractionId));
    }

    // ---------------------------------------------
    // Search
    // ---------------------------------------------

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

    // ---------------------------------------------
    // Payment mode
    // ---------------------------------------------

    if (paymentMode && paymentMode !== "ALL") {
      conditions.push(
        eq(
          transactions.paymentMode,
          paymentMode as (typeof transactions.paymentMode.enumValues)[number],
        ),
      );
    }

    // ---------------------------------------------
    // Transaction status
    // ---------------------------------------------

    if (status && status !== "ALL") {
      conditions.push(
        eq(
          transactions.status,
          status as (typeof transactions.status.enumValues)[number],
        ),
      );
    }

    // ---------------------------------------------
    // From date
    // ---------------------------------------------

    if (fromDate) {
      const startDate = new Date(`${fromDate}T00:00:00.000Z`);

      if (Number.isNaN(startDate.getTime())) {
        return failure("Invalid fromDate.", 400, "INVALID_FROM_DATE");
      }

      conditions.push(gte(transactions.createdAt, startDate));
    }

    // ---------------------------------------------
    // To date
    // ---------------------------------------------

    if (toDate) {
      const endDate = new Date(`${toDate}T23:59:59.999Z`);

      if (Number.isNaN(endDate.getTime())) {
        return failure("Invalid toDate.", 400, "INVALID_TO_DATE");
      }

      conditions.push(lte(transactions.createdAt, endDate));
    }

    const whereClause = and(...conditions);

    // =================================================
    // TOTAL COUNT
    // =================================================

    const [{ count }] = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(transactions)
      .innerJoin(bookings, eq(transactions.bookingId, bookings.id))
      .innerJoin(attractions, eq(bookings.attractionId, attractions.id))
      .where(whereClause);

    const total = Number(count);

    // =================================================
    // TRANSACTIONS
    // =================================================

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

    // =================================================
    // RESPONSE
    // =================================================

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
    console.error("Get transactions error:", error);

    return failure(
      "Unable to fetch transactions.",
      500,
      "INTERNAL_SERVER_ERROR",
    );
  }
}
