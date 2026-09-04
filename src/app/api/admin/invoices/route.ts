// import { NextRequest } from "next/server";

// import {
//   and,
//   desc,
//   eq,
//   gte,
//   ilike,
//   inArray,
//   isNull,
//   lte,
//   or,
//   sql,
// } from "drizzle-orm";

// import { db } from "@/db";

// import {
//   transactions,
//   bookings,
//   attractions,
//   bookingItems,
//   managerAttractionPermissions,
// } from "@/db/schema";

// import { requireAuth } from "@/lib/auth/require-auth";
// import { success, failure } from "@/lib/api/response";
// import { requireModuleAccess } from "@/lib/auth/authorization";

// export async function GET(request: NextRequest) {
//   try {
//     // =====================================================
//     // AUTHENTICATION
//     // =====================================================

//     const auth = await requireAuth(request);

//     await requireModuleAccess(auth, "INVOICES");

//     // =====================================================
//     // TENANT
//     // =====================================================

//     const adminId =
//       auth.user.role === "ADMIN" ? auth.user.id : auth.user.adminId;

//     if (!adminId) {
//       return failure("Admin context not found.", 403, "ADMIN_CONTEXT_REQUIRED");
//     }

//     // =====================================================
//     // QUERY PARAMS
//     // =====================================================

//     const { searchParams } = new URL(request.url);

//     const page = Math.max(Number(searchParams.get("page")) || 1, 1);

//     const limit = Math.min(
//       Math.max(Number(searchParams.get("limit")) || 10, 1),
//       100,
//     );

//     const offset = (page - 1) * limit;

//     const search = searchParams.get("search")?.trim() || "";

//     const paymentMode = searchParams.get("paymentMode")?.trim().toUpperCase();

//     const dateFrom = searchParams.get("dateFrom")?.trim();

//     const dateTo = searchParams.get("dateTo")?.trim();

//     // =====================================================
//     // ACCESSIBLE ATTRACTIONS
//     // =====================================================

//     let accessibleAttractionIds: string[] = [];

//     // -----------------------------------------------------
//     // ADMIN
//     // -----------------------------------------------------

//     if (auth.user.role === "ADMIN") {
//       const adminAttractions = await db
//         .select({
//           id: attractions.id,
//         })
//         .from(attractions)
//         .where(
//           and(
//             eq(attractions.adminId, adminId),
//             eq(attractions.status, "ACTIVE"),
//           ),
//         );

//       accessibleAttractionIds = adminAttractions.map((item) => item.id);
//     }

//     // -----------------------------------------------------
//     // MANAGER
//     // -----------------------------------------------------
//     else if (auth.user.role === "MANAGER") {
//       const managerAttractions = await db
//         .select({
//           attractionId: managerAttractionPermissions.attractionId,
//         })
//         .from(managerAttractionPermissions)
//         .innerJoin(
//           attractions,
//           eq(managerAttractionPermissions.attractionId, attractions.id),
//         )
//         .where(
//           and(
//             eq(managerAttractionPermissions.managerId, auth.user.id),
//             eq(attractions.adminId, adminId),
//             eq(attractions.status, "ACTIVE"),
//           ),
//         );

//       accessibleAttractionIds = managerAttractions.map(
//         (item) => item.attractionId,
//       );
//     }

//     // -----------------------------------------------------
//     // STAFF
//     // -----------------------------------------------------
//     // Keep the same behavior as your existing route:
//     // staff can access active attractions under their admin.
//     // -----------------------------------------------------
//     else {
//       const staffAttractions = await db
//         .select({
//           id: attractions.id,
//         })
//         .from(attractions)
//         .where(
//           and(
//             eq(attractions.adminId, adminId),
//             eq(attractions.status, "ACTIVE"),
//           ),
//         );

//       accessibleAttractionIds = staffAttractions.map((item) => item.id);
//     }

//     // =====================================================
//     // NO ACCESS
//     // =====================================================

//     if (accessibleAttractionIds.length === 0) {
//       return success({
//         summary: {
//           totalRevenue: 0,
//           totalInvoices: 0,
//           paidInvoices: 0,
//         },

//         items: [],

//         pagination: {
//           page,
//           limit,
//           total: 0,
//           totalPages: 0,
//         },
//       });
//     }

//     // =====================================================
//     // BASE CONDITIONS
//     // =====================================================

//     const conditions = [
//       // Transaction not deleted
//       isNull(transactions.deletedAt),

//       // Booking not deleted
//       isNull(bookings.deletedAt),

//       // Booking soft-delete flag
//       eq(bookings.isDeleted, false),

//       // ---------------------------------------------------
//       // TENANT ISOLATION
//       //
//       // bookings.attractionId = uuid[]
//       //
//       // attractions.id = uuid
//       //
//       // Therefore we MUST use ANY().
//       // ---------------------------------------------------

//       sql`EXISTS (
//         SELECT 1
//         FROM ${attractions}
//         WHERE
//           ${attractions.id} = ANY(${bookings.attractionId})
//           AND ${attractions.adminId} = ${adminId}
//       )`,

//       // ---------------------------------------------------
//       // USER ATTRACTION ACCESS
//       // ---------------------------------------------------

//       sql`EXISTS (
//         SELECT 1
//         FROM ${attractions}
//         WHERE
//           ${attractions.id} = ANY(${bookings.attractionId})
//           AND ${inArray(attractions.id, accessibleAttractionIds)}
//       )`,
//     ];

//     // =====================================================
//     // SEARCH
//     // =====================================================

//     if (search) {
//       const searchValue = `%${search}%`;

//       conditions.push(
//         or(
//           ilike(transactions.invoiceNumber, searchValue),

//           ilike(bookings.bookingNumber, searchValue),

//           ilike(bookings.customerName, searchValue),

//           ilike(bookings.mobileNumber, searchValue),

//           // Search attraction name
//           sql`EXISTS (
//             SELECT 1
//             FROM ${attractions}
//             WHERE
//               ${attractions.id} = ANY(${bookings.attractionId})
//               AND ${attractions.name} ILIKE ${searchValue}
//           )`,
//         )!,
//       );
//     }

//     // =====================================================
//     // PAYMENT MODE
//     // =====================================================

//     if (paymentMode && paymentMode !== "ALL") {
//       if (
//         paymentMode !== "CASH" &&
//         paymentMode !== "UPI" &&
//         paymentMode !== "CARD" &&
//         paymentMode !== "ONLINE"
//       ) {
//         return failure("Invalid payment mode.", 400, "INVALID_PAYMENT_MODE");
//       }

//       conditions.push(
//         eq(
//           transactions.paymentMode,
//           paymentMode as "CASH" | "UPI" | "CARD" | "ONLINE",
//         ),
//       );
//     }

//     // =====================================================
//     // DATE FROM
//     // =====================================================

//     if (dateFrom) {
//       const startDate = new Date(`${dateFrom}T00:00:00.000Z`);

//       if (Number.isNaN(startDate.getTime())) {
//         return failure("Invalid dateFrom.", 400, "INVALID_DATE_FROM");
//       }

//       conditions.push(gte(transactions.createdAt, startDate));
//     }

//     // =====================================================
//     // DATE TO
//     // =====================================================

//     if (dateTo) {
//       const endDate = new Date(`${dateTo}T23:59:59.999Z`);

//       if (Number.isNaN(endDate.getTime())) {
//         return failure("Invalid dateTo.", 400, "INVALID_DATE_TO");
//       }

//       conditions.push(lte(transactions.createdAt, endDate));
//     }

//     // =====================================================
//     // ATTRACTION FILTER
//     // =====================================================

//     const attractionFilter = searchParams.get("attractionId")?.trim();

//     if (attractionFilter) {
//       conditions.push(
//         sql`${attractionFilter}::uuid = ANY(${bookings.attractionId})`,
//       );
//     }

//     const whereClause = and(...conditions);

//     // =====================================================
//     // TOTAL INVOICES
//     // =====================================================

//     const [countResult] = await db
//       .select({
//         count: sql<number>`COUNT(DISTINCT ${transactions.id})`,
//       })
//       .from(transactions)
//       .innerJoin(bookings, eq(transactions.bookingId, bookings.id))
//       .where(whereClause);

//     const totalInvoices = Number(countResult?.count || 0);

//     // =====================================================
//     // TOTAL REVENUE
//     // =====================================================

//     const [revenueResult] = await db
//       .select({
//         totalRevenue: sql<string>`
//           COALESCE(
//             SUM(${transactions.amount}),
//             0
//           )
//         `,
//       })
//       .from(transactions)
//       .innerJoin(bookings, eq(transactions.bookingId, bookings.id))
//       .where(and(...conditions, eq(transactions.status, "SUCCESSFUL")));

//     const totalRevenue = Number(revenueResult?.totalRevenue || 0);

//     // =====================================================
//     // PAID INVOICES
//     // =====================================================

//     const [paidResult] = await db
//       .select({
//         count: sql<number>`COUNT(DISTINCT ${transactions.id})`,
//       })
//       .from(transactions)
//       .innerJoin(bookings, eq(transactions.bookingId, bookings.id))
//       .where(and(...conditions, eq(transactions.status, "SUCCESSFUL")));

//     const paidInvoices = Number(paidResult?.count || 0);

//     // =====================================================
//     // INVOICE LIST
//     // =====================================================

//     const invoiceRows = await db
//       .select({
//         // Transaction UUID
//         id: transactions.id,

//         // Invoice number
//         invoiceNumber: transactions.invoiceNumber,

//         // Booking UUID
//         bookingUuid: bookings.id,

//         // Booking number
//         bookingId: bookings.bookingNumber,

//         customerName: bookings.customerName,

//         mobileNumber: bookings.mobileNumber,

//         gstNumber: bookings.gstNumber,

//         dateTime: transactions.createdAt,

//         visitAt: bookings.visitAt,

//         // IMPORTANT:
//         // This is uuid[]
//         attractionIds: bookings.attractionId,

//         amount: transactions.amount,

//         paymentMode: transactions.paymentMode,

//         status: transactions.status,
//       })
//       .from(transactions)
//       .innerJoin(bookings, eq(transactions.bookingId, bookings.id))
//       .where(whereClause)
//       .orderBy(desc(transactions.createdAt))
//       .limit(limit)
//       .offset(offset);

//     // =====================================================
//     // GET ALL ATTRACTION IDS
//     // =====================================================

//     const allAttractionIds = Array.from(
//       new Set(invoiceRows.flatMap((row) => row.attractionIds || [])),
//     );

//     // =====================================================
//     // FETCH ATTRACTION DETAILS
//     // =====================================================

//     const attractionRows =
//       allAttractionIds.length > 0
//         ? await db
//             .select({
//               id: attractions.id,
//               name: attractions.name,
//             })
//             .from(attractions)
//             .where(
//               and(
//                 inArray(attractions.id, allAttractionIds),
//                 eq(attractions.adminId, adminId),
//               ),
//             )
//         : [];

//     // =====================================================
//     // CREATE ATTRACTION MAP
//     // =====================================================

//     const attractionMap = new Map(
//       attractionRows.map((attraction) => [attraction.id, attraction]),
//     );

//     // =====================================================
//     // BOOKING ITEMS
//     // =====================================================

//     const bookingIds = invoiceRows.map((row) => row.bookingUuid);

//     const itemRows =
//       bookingIds.length > 0
//         ? await db
//             .select({
//               bookingId: bookingItems.bookingId,

//               category: bookingItems.category,

//               quantity: bookingItems.quantity,

//               unitPrice: bookingItems.unitPrice,

//               totalPrice: bookingItems.totalPrice,
//             })
//             .from(bookingItems)
//             .where(inArray(bookingItems.bookingId, bookingIds))
//         : [];

//     // =====================================================
//     // GROUP VISITORS
//     // =====================================================

//     const visitorMap = new Map<string, Map<string, number>>();

//     for (const item of itemRows) {
//       if (!visitorMap.has(item.bookingId)) {
//         visitorMap.set(item.bookingId, new Map<string, number>());
//       }

//       const categoryMap = visitorMap.get(item.bookingId)!;

//       categoryMap.set(
//         item.category,
//         (categoryMap.get(item.category) || 0) + Number(item.quantity || 0),
//       );
//     }

//     // =====================================================
//     // FORMAT ITEMS
//     // =====================================================

//     const items = invoiceRows.map((invoice, index) => {
//       const categories = visitorMap.get(invoice.bookingUuid);

//       const visitors = categories
//         ? Array.from(categories.entries())
//             .map(([category, quantity]) => `${quantity} ${category}`)
//             .join(" + ")
//         : "0";

//       // Resolve all attractions
//       const invoiceAttractions = (invoice.attractionIds || [])
//         .map((id) => attractionMap.get(id))
//         .filter(
//           (
//             attraction,
//           ): attraction is {
//             id: string;
//             name: string;
//           } => Boolean(attraction),
//         );

//       return {
//         sNo: offset + index + 1,

//         // -------------------------------------------------
//         // Invoice
//         // -------------------------------------------------

//         invoiceNumber: invoice.invoiceNumber,

//         // -------------------------------------------------
//         // Customer
//         // -------------------------------------------------

//         customerName: invoice.customerName,

//         mobileNumber: invoice.mobileNumber,

//         gstNumber: invoice.gstNumber,

//         // -------------------------------------------------
//         // Date
//         // -------------------------------------------------

//         dateTime: invoice.dateTime,

//         visitAt: invoice.visitAt,

//         // -------------------------------------------------
//         // MULTIPLE ATTRACTIONS
//         // -------------------------------------------------

//         attractionIds: invoice.attractionIds || [],

//         attractions: invoiceAttractions,

//         // -------------------------------------------------
//         // BACKWARD COMPATIBILITY
//         //
//         // Existing frontend can still use:
//         // invoice.attraction
//         // -------------------------------------------------

//         attraction: invoiceAttractions[0] || null,

//         // -------------------------------------------------
//         // Visitors
//         // -------------------------------------------------

//         visitors,

//         // -------------------------------------------------
//         // Payment
//         // -------------------------------------------------

//         amount: Number(invoice.amount),

//         paymentMode: invoice.paymentMode,

//         status: invoice.status,

//         // -------------------------------------------------
//         // References
//         // -------------------------------------------------

//         bookingId: invoice.bookingId,
//       };
//     });

//     // =====================================================
//     // RESPONSE
//     // =====================================================

//     return success({
//       summary: {
//         totalRevenue,

//         totalInvoices,

//         paidInvoices,
//       },

//       items,

//       pagination: {
//         page,

//         limit,

//         total: totalInvoices,

//         totalPages: totalInvoices === 0 ? 0 : Math.ceil(totalInvoices / limit),
//       },
//     });
//   } catch (error) {
//     if (error instanceof Error) {
//       // =====================================================
//       // AUTHENTICATION ERRORS
//       // =====================================================

//       if (error.message === "UNAUTHORIZED") {
//         return failure("Authentication required.", 401, "UNAUTHORIZED");
//       }

//       if (error.message === "ACCOUNT_NOT_ACTIVE") {
//         return failure("Account is not active.", 403, "ACCOUNT_NOT_ACTIVE");
//       }

//       // =====================================================
//       // MODULE AUTHORIZATION
//       // =====================================================

//       if (
//         error.message === "MODULE_ACCESS_DENIED" ||
//         error.message === "FORBIDDEN"
//       ) {
//         return failure(
//           "You do not have permission to access the invoices module.",
//           403,
//           "MODULE_ACCESS_DENIED",
//         );
//       }

//       // =====================================================
//       // ADMIN CONTEXT
//       // =====================================================

//       if (error.message === "ADMIN_CONTEXT_REQUIRED") {
//         return failure(
//           "Admin context not found.",
//           403,
//           "ADMIN_CONTEXT_REQUIRED",
//         );
//       }

//       // =====================================================
//       // DATABASE / KNOWN ERRORS
//       // =====================================================

//       if (error.message === "INVALID_PAYMENT_MODE") {
//         return failure("Invalid payment mode.", 400, "INVALID_PAYMENT_MODE");
//       }

//       if (error.message === "INVALID_DATE_FROM") {
//         return failure(
//           "Invalid dateFrom. Expected format: YYYY-MM-DD.",
//           400,
//           "INVALID_DATE_FROM",
//         );
//       }

//       if (error.message === "INVALID_DATE_TO") {
//         return failure(
//           "Invalid dateTo. Expected format: YYYY-MM-DD.",
//           400,
//           "INVALID_DATE_TO",
//         );
//       }
//     }

//     // =====================================================
//     // UNKNOWN / INTERNAL ERROR
//     // =====================================================

//     console.error("Get invoices error:", error);

//     return failure("Unable to fetch invoices.", 500, "INTERNAL_SERVER_ERROR");
//   }
// }
import { NextRequest } from "next/server";

import {
  and,
  desc,
  asc,
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
  bookings,
  transactions,
  scannerInvoices,
  attractions,
  attractionManagement,
  attractionsAgainstBooking,
  categoryOfAttractionAgainstBooking,
  managerAttractionPermissions,
  users,
} from "@/db/schema";

import { requireAuth } from "@/lib/auth/require-auth";
import { success, failure } from "@/lib/api/response";
import { requireModuleAccess } from "@/lib/auth/authorization";

export async function GET(request: NextRequest) {
  try {
    // =====================================================
    // AUTHENTICATION
    // =====================================================

    const auth = await requireAuth(request);

    await requireModuleAccess(auth, "SCANNER_INVOICES");

    // =====================================================
    // TENANT
    // =====================================================

    const adminId =
      auth.user.role === "ADMIN" ? auth.user.id : auth.user.adminId;

    if (!adminId) {
      return failure("Admin context not found.", 403, "ADMIN_CONTEXT_REQUIRED");
    }

    // =====================================================
    // QUERY PARAMS
    // =====================================================

    const { searchParams } = new URL(request.url);

    const page = Math.max(Number(searchParams.get("page")) || 1, 1);

    const limit = Math.min(
      Math.max(Number(searchParams.get("limit")) || 10, 1),
      100,
    );

    const offset = (page - 1) * limit;

    const search = searchParams.get("search")?.trim() || "";

    const dateFrom = searchParams.get("dateFrom")?.trim();

    const dateTo = searchParams.get("dateTo")?.trim();

    const attractionFilter = searchParams.get("attractionId")?.trim();

    // =====================================================
    // ACCESSIBLE ATTRACTIONS
    // =====================================================

    let accessibleAttractionIds: string[] = [];

    // -----------------------------------------------------
    // ADMIN
    // -----------------------------------------------------

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

      accessibleAttractionIds = adminAttractions.map((item) => item.id);
    }

    // -----------------------------------------------------
    // MANAGER
    // -----------------------------------------------------
    else if (auth.user.role === "MANAGER") {
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
            eq(managerAttractionPermissions.managerId, auth.user.id),
            eq(attractions.adminId, adminId),
            eq(attractions.status, "ACTIVE"),
          ),
        );

      accessibleAttractionIds = managerAttractions.map(
        (item) => item.attractionId,
      );
    }

    // -----------------------------------------------------
    // STAFF
    // -----------------------------------------------------
    else {
      const staffAttractions = await db
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

      accessibleAttractionIds = staffAttractions.map((item) => item.id);
    }

    // =====================================================
    // NO ACCESS
    // =====================================================

    if (accessibleAttractionIds.length === 0) {
      return success({
        summary: {
          totalRevenue: 0,
          totalInvoices: 0,
          paidInvoices: 0,
        },

        items: [],

        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      });
    }

    // =====================================================
    // BASE CONDITIONS
    // =====================================================

    const conditions = [
      // Booking not deleted
      isNull(bookings.deletedAt),

      eq(bookings.isDeleted, false),

      // Tenant isolation
      eq(bookings.createdBy, bookings.createdBy),

      // Booking must contain at least one attraction
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
          ${attractionsAgainstBooking.bookingId} = ${bookings.id}
          AND ${attractions.adminId} = ${adminId}
      )`,

      // User must have access to at least one
      // attraction belonging to this booking
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
          ${attractionsAgainstBooking.bookingId} = ${bookings.id}
          AND ${inArray(attractions.id, accessibleAttractionIds)}
      )`,
    ];

    // =====================================================
    // SEARCH
    // =====================================================

    if (search) {
      const searchValue = `%${search}%`;

      conditions.push(
        or(
          ilike(bookings.invoiceNumber, searchValue),

          ilike(bookings.customerName, searchValue),

          ilike(bookings.mobileNumber, searchValue),

          ilike(bookings.gstNumber, searchValue),

          // Search attraction name
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
              ${attractionsAgainstBooking.bookingId} = ${bookings.id}
              AND ${attractions.name} ILIKE ${searchValue}
          )`,

          // Search transaction invoice number
          sql`EXISTS (
            SELECT 1
            FROM ${transactions}
            WHERE
              ${transactions.bookingId} = ${bookings.id}
              AND ${transactions.invoiceNumber} ILIKE ${searchValue}
              AND ${transactions.isDeleted} = false
              AND ${transactions.deletedAt} IS NULL
          )`,
        )!,
      );
    }

    // =====================================================
    // DATE FROM
    // =====================================================

    if (dateFrom) {
      const startDate = new Date(`${dateFrom}T00:00:00.000Z`);

      if (Number.isNaN(startDate.getTime())) {
        return failure("Invalid dateFrom.", 400, "INVALID_DATE_FROM");
      }

      conditions.push(gte(bookings.createdAt, startDate));
    }

    // =====================================================
    // DATE TO
    // =====================================================

    if (dateTo) {
      const endDate = new Date(`${dateTo}T23:59:59.999Z`);

      if (Number.isNaN(endDate.getTime())) {
        return failure("Invalid dateTo.", 400, "INVALID_DATE_TO");
      }

      conditions.push(lte(bookings.createdAt, endDate));
    }

    // =====================================================
    // ATTRACTION FILTER
    // =====================================================

    if (attractionFilter) {
      conditions.push(
        sql`EXISTS (
          SELECT 1
          FROM ${attractionsAgainstBooking}
          INNER JOIN ${attractionManagement}
            ON ${attractionsAgainstBooking.attractionManagementId}
            = ${attractionManagement.id}
          WHERE
            ${attractionsAgainstBooking.bookingId} = ${bookings.id}
            AND ${attractionManagement.attractionId} = ${attractionFilter}::uuid
        )`,
      );
    }

    const whereClause = and(...conditions);

    // =====================================================
    // TOTAL INVOICES
    // =====================================================

    const [countResult] = await db
      .select({
        count: sql<number>`COUNT(DISTINCT ${bookings.id})`,
      })
      .from(bookings)
      .where(whereClause);

    const totalInvoices = Number(countResult?.count || 0);

    // =====================================================
    // TOTAL REVENUE
    // =====================================================

    const [revenueResult] = await db
      .select({
        totalRevenue: sql<string>`
      COALESCE(
        SUM(${bookings.totalAmount}),
        0
      )
    `,
      })
      .from(bookings)
      .innerJoin(transactions, eq(transactions.bookingId, bookings.id))
      .where(
        and(
          ...conditions,

          isNull(transactions.deletedAt),

          eq(transactions.isDeleted, false),

          eq(transactions.status, "SUCCESSFUL"),
        ),
      );

    const totalRevenue = Number(revenueResult?.totalRevenue || 0);

    // =====================================================
    // PAID INVOICES
    // =====================================================

    const [paidResult] = await db
      .select({
        count: sql<number>`
      COUNT(DISTINCT ${bookings.id})
    `,
      })
      .from(bookings)
      .innerJoin(transactions, eq(transactions.bookingId, bookings.id))
      .where(
        and(
          ...conditions,

          isNull(transactions.deletedAt),

          eq(transactions.isDeleted, false),

          eq(transactions.status, "SUCCESSFUL"),
        ),
      );

    const paidInvoices = Number(paidResult?.count || 0);

    // =====================================================
    // BOOKING LIST
    // =====================================================

    const bookingRows = await db
      .select({
        id: bookings.id,

        invoiceNumber: bookings.invoiceNumber,

        customerName: bookings.customerName,

        mobileNumber: bookings.mobileNumber,

        gstNumber: bookings.gstNumber,

        totalAmount: bookings.totalAmount,

        status: bookings.status,

        createdAt: bookings.createdAt,
      })
      .from(bookings)
      .where(whereClause)
      .orderBy(asc(bookings.invoiceNumber))
      .limit(limit)
      .offset(offset);

    // =====================================================
    // NO BOOKINGS
    // =====================================================

    if (bookingRows.length === 0) {
      return success({
        summary: {
          totalRevenue,
          totalInvoices,
          paidInvoices,
        },

        items: [],

        pagination: {
          page,
          limit,
          total: totalInvoices,
          totalPages:
            totalInvoices === 0 ? 0 : Math.ceil(totalInvoices / limit),
        },
      });
    }

    // =====================================================
    // BOOKING IDS
    // =====================================================

    const bookingIds = bookingRows.map((booking) => booking.id);

    // =====================================================
    // TRANSACTIONS
    // =====================================================

    const transactionRows = await db
      .select({
        id: transactions.id,

        bookingId: transactions.bookingId,

        invoiceNumber: transactions.invoiceNumber,

        paymentMode: transactions.paymentMode,

        status: transactions.status,

        amount: transactions.amount,
      })
      .from(transactions)
      .where(
        and(
          inArray(transactions.bookingId, bookingIds),
          isNull(transactions.deletedAt),
          eq(transactions.isDeleted, false),
        ),
      )
      .orderBy(desc(transactions.createdAt));

    // =====================================================
    // TRANSACTION MAP
    // =====================================================

    const transactionMap = new Map<string, (typeof transactionRows)[number]>();

    for (const transaction of transactionRows) {
      // Keep the first/latest transaction
      // because query is ordered DESC.
      if (!transactionMap.has(transaction.bookingId)) {
        transactionMap.set(transaction.bookingId, transaction);
      }
    }

    // =====================================================
    // SCANNER INVOICES
    // =====================================================

    const invoiceNumbers = bookingRows.map((booking) => booking.invoiceNumber);

    const scannerInvoiceRows = await db
      .select({
        invoiceNumber: scannerInvoices.invoiceNumber,

        scannerInvoiceStatus: scannerInvoices.scannerInvoiceStatus,

        scannedAt: scannerInvoices.scannedAt,

        scannedByStaffName: users.name,
      })
      .from(scannerInvoices)
      .leftJoin(users, eq(scannerInvoices.scannedByStaffId, users.id))
      .where(
        and(
          inArray(scannerInvoices.invoiceNumber, invoiceNumbers),
          isNull(scannerInvoices.deletedAt),
          eq(scannerInvoices.isDeleted, false),
        ),
      );

    // =====================================================
    // SCANNER INVOICE MAP
    // =====================================================

    const scannerInvoiceMap = new Map(
      scannerInvoiceRows.map((invoice) => [invoice.invoiceNumber, invoice]),
    );

    // =====================================================
    // ATTRACTIONS AGAINST BOOKING
    // =====================================================

    const attractionBookingRows = await db
      .select({
        bookingId: attractionsAgainstBooking.bookingId,

        attractionManagementId:
          attractionsAgainstBooking.attractionManagementId,

        attractionManagementAttractionId: attractionManagement.attractionId,

        attractionId: attractions.id,

        attractionName: attractions.name,
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
        ),
      );

    // =====================================================
    // GROUP ATTRACTIONS BY BOOKING
    // =====================================================

    const attractionMap = new Map<
      string,
      Array<{
        id: string;
        name: string;
      }>
    >();

    for (const row of attractionBookingRows) {
      if (!attractionMap.has(row.bookingId)) {
        attractionMap.set(row.bookingId, []);
      }

      const bookingAttractions = attractionMap.get(row.bookingId)!;

      // Avoid duplicate attraction IDs
      if (!bookingAttractions.some((item) => item.id === row.attractionId)) {
        bookingAttractions.push({
          id: row.attractionId,
          name: row.attractionName,
        });
      }
    }

    // =====================================================
    // VISITOR TOTALS
    // =====================================================

    const visitorRows = await db
      .select({
        bookingId: categoryOfAttractionAgainstBooking.bookingId,

        totalVisitors: sql<number>`
          COALESCE(
            SUM(
              ${categoryOfAttractionAgainstBooking.noOfVisitors}
            ),
            0
          )
        `,
      })
      .from(categoryOfAttractionAgainstBooking)
      .where(inArray(categoryOfAttractionAgainstBooking.bookingId, bookingIds))
      .groupBy(categoryOfAttractionAgainstBooking.bookingId);

    // =====================================================
    // VISITOR MAP
    // =====================================================

    const visitorMap = new Map<string, number>();

    for (const row of visitorRows) {
      visitorMap.set(row.bookingId, Number(row.totalVisitors || 0));
    }

    // =====================================================
    // FORMAT ITEMS
    // =====================================================

    const items = bookingRows.map((booking) => {
      const scannerInvoice = scannerInvoiceMap.get(booking.invoiceNumber);

      const bookingAttractions = attractionMap.get(booking.id) || [];

      const visitors = visitorMap.get(booking.id) || 0;

      return {
        sNo: Number(booking.invoiceNumber.split("/").pop()),

        // -------------------------------------------------
        // INVOICE
        // -------------------------------------------------

        invoiceNumber: booking.invoiceNumber,

        // -------------------------------------------------
        // CUSTOMER
        // -------------------------------------------------

        customerName: booking.customerName,

        mobileNumber: booking.mobileNumber,

        gstNumber: booking.gstNumber,

        // -------------------------------------------------
        // DATE
        // -------------------------------------------------

        dateTime: booking.createdAt,

        // -------------------------------------------------
        // ATTRACTIONS
        // -------------------------------------------------

        attractions: bookingAttractions,

        // -------------------------------------------------
        // VISITORS
        // -------------------------------------------------

        visitors,

        // -------------------------------------------------
        // PAYMENT
        // -------------------------------------------------

        amount: Number(booking.totalAmount),

        // -------------------------------------------------
        // SCANNER INVOICE
        // -------------------------------------------------

        scannerInvoice: scannerInvoice
          ? {
              scannerInvoiceStatus: scannerInvoice.scannerInvoiceStatus,

              scannedByStaff: scannerInvoice.scannedByStaffName,

              scannedAt: scannerInvoice.scannedAt,
            }
          : null,

        // -------------------------------------------------
        // REFERENCES
        // -------------------------------------------------
      };
    });

    // =====================================================
    // RESPONSE
    // =====================================================

    return success({
      summary: {
        totalRevenue,

        totalInvoices,

        paidInvoices,
      },

      items,

      pagination: {
        page,

        limit,

        total: totalInvoices,

        totalPages: totalInvoices === 0 ? 0 : Math.ceil(totalInvoices / limit),
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      // ===================================================
      // AUTHENTICATION ERRORS
      // ===================================================

      if (error.message === "UNAUTHORIZED") {
        return failure("Authentication required.", 401, "UNAUTHORIZED");
      }

      if (error.message === "ACCOUNT_NOT_ACTIVE") {
        return failure("Account is not active.", 403, "ACCOUNT_NOT_ACTIVE");
      }

      // ===================================================
      // MODULE AUTHORIZATION
      // ===================================================

      if (
        error.message === "MODULE_ACCESS_DENIED" ||
        error.message === "FORBIDDEN"
      ) {
        return failure(
          "You do not have permission to access the invoices module.",
          403,
          "MODULE_ACCESS_DENIED",
        );
      }

      // ===================================================
      // ADMIN CONTEXT
      // ===================================================

      if (error.message === "ADMIN_CONTEXT_REQUIRED") {
        return failure(
          "Admin context not found.",
          403,
          "ADMIN_CONTEXT_REQUIRED",
        );
      }

      // ===================================================
      // PAYMENT
      // ===================================================

      if (error.message === "INVALID_PAYMENT_MODE") {
        return failure("Invalid payment mode.", 400, "INVALID_PAYMENT_MODE");
      }

      // ===================================================
      // DATE FROM
      // ===================================================

      if (error.message === "INVALID_DATE_FROM") {
        return failure(
          "Invalid dateFrom. Expected format: YYYY-MM-DD.",
          400,
          "INVALID_DATE_FROM",
        );
      }

      // ===================================================
      // DATE TO
      // ===================================================

      if (error.message === "INVALID_DATE_TO") {
        return failure(
          "Invalid dateTo. Expected format: YYYY-MM-DD.",
          400,
          "INVALID_DATE_TO",
        );
      }
    }

    // =====================================================
    // UNKNOWN / INTERNAL ERROR
    // =====================================================

    console.error("Get invoices error:", error);

    return failure("Unable to fetch invoices.", 500, "INTERNAL_SERVER_ERROR");
  }
}
