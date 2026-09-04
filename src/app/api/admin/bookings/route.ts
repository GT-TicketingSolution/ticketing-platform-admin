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
  arrayContains,
  count,
} from "drizzle-orm";

import crypto from "crypto";

import { db } from "@/db";

import {
  bookings,
  bookingItems,
  bookingSeats,
  attractions,
  transactions,
  attractionsAgainstBooking,
  categoryOfAttractionAgainstBooking,
  attractionManagement,
  attractionCategory,
} from "@/db/schema";

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

// export async function GET(request: NextRequest) {
//   try {
//     // =====================================================
//     // 1. AUTHENTICATION
//     // =====================================================

//     const auth = await requireAuth(request);

//     // =====================================================
//     // 2. MODULE AUTHORIZATION
//     // =====================================================

//     await requireModuleAccess(auth, "BOOKINGS");

//     // =====================================================
//     // 3. TENANT / ADMIN
//     // =====================================================

//     const adminId = getAdminId(auth);

//     // =====================================================
//     // 4. QUERY PARAMS
//     // =====================================================

//     const { searchParams } = new URL(request.url);

//     const page = Math.max(Number(searchParams.get("page") || "1"), 1);

//     const limit = Math.min(
//       Math.max(Number(searchParams.get("limit") || "10"), 1),
//       100,
//     );

//     const search = searchParams.get("search")?.trim() || "";

//     const attractionId = searchParams.get("attractionId")?.trim() || "";

//     const status = searchParams.get("status")?.trim().toUpperCase() || "";

//     const fromDate = searchParams.get("fromDate")?.trim() || "";

//     const toDate = searchParams.get("toDate")?.trim() || "";

//     const offset = (page - 1) * limit;

//     // =====================================================
//     // 5. BASE SECURITY CONDITIONS
//     // =====================================================

//     const conditions = [
//       isNull(bookings.deletedAt),

//       eq(bookings.isDeleted, false),

//       eq(attractions.adminId, adminId),
//     ];

//     // =====================================================
//     // 6. MANAGER / STAFF ATTRACTION ACCESS
//     // =====================================================

//     if (auth.user.role !== "ADMIN") {
//       const accessibleAttractionIds = await getAccessibleAttractionIds(auth);

//       if (accessibleAttractionIds.length === 0) {
//         return success({
//           items: [],
//           pagination: {
//             page,
//             limit,
//             total: 0,
//             totalPages: 0,
//           },
//         });
//       }

//       conditions.push(inArray(attractions.id, accessibleAttractionIds));
//     }

//     // =====================================================
//     // 7. SEARCH
//     // =====================================================

//     if (search) {
//       conditions.push(
//         or(
//           ilike(bookings.bookingNumber, `%${search}%`),

//           ilike(bookings.customerName, `%${search}%`),

//           ilike(bookings.mobileNumber, `%${search}%`),

//           ilike(attractions.name, `%${search}%`),

//           sql`${bookings.totalAmount}::text ILIKE ${`%${search}%`}`,
//         )!,
//       );
//     }

//     // =====================================================
//     // 8. ATTRACTION FILTER
//     // =====================================================

//     if (attractionId) {
//       conditions.push(arrayContains(bookings.attractionId, [attractionId]));
//     }

//     // =====================================================
//     // 9. STATUS FILTER
//     // =====================================================

//     if (
//       status === "PENDING" ||
//       status === "CONFIRMED" ||
//       status === "CANCELLED"
//     ) {
//       conditions.push(eq(bookings.status, status));
//     }

//     // =====================================================
//     // 10. FROM DATE
//     // =====================================================

//     if (fromDate) {
//       const startDate = new Date(`${fromDate}T00:00:00.000Z`);

//       if (Number.isNaN(startDate.getTime())) {
//         return failure("Invalid fromDate.", 400, "INVALID_FROM_DATE");
//       }

//       conditions.push(gte(bookings.visitAt, startDate));
//     }

//     // =====================================================
//     // 11. TO DATE
//     // =====================================================

//     if (toDate) {
//       const endDate = new Date(`${toDate}T23:59:59.999Z`);

//       if (Number.isNaN(endDate.getTime())) {
//         return failure("Invalid toDate.", 400, "INVALID_TO_DATE");
//       }

//       conditions.push(lte(bookings.visitAt, endDate));
//     }

//     // =====================================================
//     // 12. WHERE
//     // =====================================================

//     const whereClause = and(...conditions);

//     // =====================================================
//     // 13. TOTAL COUNT
//     // =====================================================

//     const [{ count }] = await db
//       .select({
//         count: sql<number>`
//           count(distinct ${bookings.id})
//         `,
//       })
//       .from(bookings)
//       .innerJoin(attractions, eq(bookings.attractionId, attractions.id))
//       .where(whereClause);

//     const total = Number(count);

//     // =====================================================
//     // 14. BOOKING LIST
//     // =====================================================

//     /*
//      * Do NOT join bookingItems here.
//      *
//      * We fetch bookingItems separately below so that
//      * visitor category information can be returned
//      * without grouping the booking query.
//      */

//     const bookingRows = await db
//       .select({
//         id: bookings.id,

//         bookingId: bookings.bookingNumber,

//         customerName: bookings.customerName,

//         mobileNumber: bookings.mobileNumber,

//         gstNumber: bookings.gstNumber,

//         bookingDate: bookings.visitAt,

//         attractionId: attractions.id,

//         attractionName: attractions.name,

//         subtotal: bookings.subtotal,

//         gstAmount: bookings.gstAmount,

//         gstAdjustment: bookings.gstAdjustment,

//         roundOff: bookings.roundOff,

//         discountAmount: bookings.discountAmount,

//         totalAmount: bookings.totalAmount,

//         amountPaid: bookings.amountPaid,

//         paymentMode: bookings.paymentMode,

//         status: bookings.status,

//         createdAt: bookings.createdAt,

//         updatedAt: bookings.updatedAt,
//       })
//       .from(bookings)
//       .innerJoin(attractions, eq(bookings.attractionId, attractions.id))
//       .where(whereClause)
//       .orderBy(desc(bookings.visitAt))
//       .limit(limit)
//       .offset(offset);

//     // =====================================================
//     // 15. GET BOOKING ITEMS
//     // =====================================================

//     const bookingIds = bookingRows.map((booking) => booking.id);

//     const ticketRows =
//       bookingIds.length > 0
//         ? await db
//             .select({
//               id: bookingItems.id,

//               bookingId: bookingItems.bookingId,

//               attractionId: bookingItems.attractionId,

//               category: bookingItems.category,

//               quantity: bookingItems.quantity,

//               unitPrice: bookingItems.unitPrice,

//               totalPrice: bookingItems.totalPrice,
//             })
//             .from(bookingItems)
//             .where(inArray(bookingItems.bookingId, bookingIds))
//         : [];

//     // =====================================================
//     // 16. GROUP TICKETS BY BOOKING
//     // =====================================================

//     const ticketsByBooking = new Map<
//       string,
//       Array<{
//         id: string;
//         attractionId: string;
//         category: string;
//         quantity: number;
//         unitPrice: number;
//         totalPrice: number;
//       }>
//     >();

//     for (const ticket of ticketRows) {
//       const existing = ticketsByBooking.get(ticket.bookingId) || [];

//       existing.push({
//         id: ticket.id,

//         attractionId: ticket.attractionId,

//         category: ticket.category,

//         quantity: Number(ticket.quantity),

//         unitPrice: Number(ticket.unitPrice),

//         totalPrice: Number(ticket.totalPrice),
//       });

//       ticketsByBooking.set(ticket.bookingId, existing);
//     }

//     // =====================================================
//     // 17. FORMAT RESPONSE
//     // =====================================================

//     const items = bookingRows.map((booking) => {
//       const ticketItems = ticketsByBooking.get(booking.id) || [];

//       // -------------------------------------------------
//       // Aggregate same category
//       // -------------------------------------------------

//       const breakdownMap = new Map<string, number>();

//       for (const ticket of ticketItems) {
//         const current = breakdownMap.get(ticket.category) || 0;

//         breakdownMap.set(ticket.category, current + ticket.quantity);
//       }

//       const visitorBreakdown = Array.from(breakdownMap.entries()).map(
//         ([category, quantity]) => ({
//           category,
//           quantity,
//         }),
//       );

//       // -------------------------------------------------
//       // Total visitors
//       // -------------------------------------------------

//       const totalVisitors = visitorBreakdown.reduce(
//         (sum, visitor) => sum + visitor.quantity,
//         0,
//       );

//       // -------------------------------------------------
//       // Financial values
//       // -------------------------------------------------

//       const totalAmount = Number(booking.totalAmount) || 0;

//       const amountPaid = Number(booking.amountPaid) || 0;

//       const amountDue = totalAmount - amountPaid;

//       return {
//         id: booking.id,

//         bookingId: booking.bookingId,

//         customer: {
//           name: booking.customerName,

//           mobileNumber: booking.mobileNumber,

//           gstNumber: booking.gstNumber,
//         },

//         dateTime: booking.bookingDate,

//         attraction: {
//           id: booking.attractionId,

//           name: booking.attractionName,
//         },

//         visitors: {
//           total: totalVisitors,

//           breakdown: visitorBreakdown,
//         },

//         tickets: ticketItems,

//         amount: {
//           subtotal: Number(booking.subtotal) || 0,

//           gstAmount: Number(booking.gstAmount) || 0,

//           gstAdjustment: Number(booking.gstAdjustment) || 0,

//           roundOff: Number(booking.roundOff) || 0,

//           discountAmount: Number(booking.discountAmount) || 0,

//           total: totalAmount,

//           paid: amountPaid,

//           due: amountDue,
//         },

//         paymentMode: booking.paymentMode,

//         status: booking.status,

//         createdAt: booking.createdAt,

//         updatedAt: booking.updatedAt,
//       };
//     });

//     // =====================================================
//     // 18. GET ACCESSIBLE ATTRACTIONS FOR FILTER
//     // =====================================================

//     let attractionConditions = [eq(attractions.adminId, adminId)];

//     if (auth.user.role !== "ADMIN") {
//       const accessibleAttractionIds = await getAccessibleAttractionIds(auth);

//       if (accessibleAttractionIds.length === 0) {
//         return success({
//           items,

//           attractions: [],

//           pagination: {
//             page,
//             limit,
//             total,
//             totalPages: total === 0 ? 0 : Math.ceil(total / limit),
//           },
//         });
//       }

//       attractionConditions.push(
//         inArray(attractions.id, accessibleAttractionIds),
//       );
//     }

//     const availableAttractions = await db
//       .select({
//         id: attractions.id,
//         name: attractions.name,
//       })
//       .from(attractions)
//       .where(and(...attractionConditions));

//     // =====================================================
//     // 18. RESPONSE
//     // =====================================================

//     return success({
//       items,

//       attractions: availableAttractions,

//       pagination: {
//         page,
//         limit,
//         total,
//         totalPages: total === 0 ? 0 : Math.ceil(total / limit),
//       },
//     });
//   } catch (error) {
//     if (error instanceof Error && error.message === "UNAUTHORIZED") {
//       return failure("Authentication required.", 401, "UNAUTHORIZED");
//     }

//     if (error instanceof Error && error.message === "ACCOUNT_NOT_ACTIVE") {
//       return failure("Account is not active.", 403, "ACCOUNT_NOT_ACTIVE");
//     }

//     if (error instanceof Error && error.message === "FORBIDDEN") {
//       return failure(
//         "You do not have permission to access bookings.",
//         403,
//         "FORBIDDEN",
//       );
//     }

//     if (error instanceof Error && error.message === "USER_HAS_NO_ADMIN") {
//       return failure(
//         "User is not associated with an admin.",
//         403,
//         "USER_HAS_NO_ADMIN",
//       );
//     }

//     return failure("Unable to fetch bookings.", 500, "INTERNAL_SERVER_ERROR");
//   }
// }

export async function GET(request: NextRequest) {
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

    const attractionManagementId =
      searchParams.get("attractionManagementId")?.trim() || "";

    const status = searchParams.get("status")?.trim().toUpperCase() || "";

    const fromDate = searchParams.get("fromDate")?.trim() || "";

    const toDate = searchParams.get("toDate")?.trim() || "";

    const offset = (page - 1) * limit;

    // =====================================================
    // 5. ACCESSIBLE ATTRACTIONS
    // =====================================================

    let accessibleAttractionIds: string[] = [];

    if (auth.user.role !== "ADMIN") {
      accessibleAttractionIds = await getAccessibleAttractionIds(auth);

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
    }

    // =====================================================
    // 6. BASE CONDITIONS
    // =====================================================

    const conditions = [
      isNull(bookings.deletedAt),
      eq(bookings.isDeleted, false),

      // Booking must have at least one attraction
      // belonging to this admin
      sql`EXISTS (
        SELECT 1
        FROM ${attractionsAgainstBooking}
        INNER JOIN ${attractionManagement}
          ON ${attractionManagement.id} = ${attractionsAgainstBooking.attractionManagementId}
        INNER JOIN ${attractions}
          ON ${attractions.id} = ${attractionManagement.attractionId}
        WHERE
          ${attractionsAgainstBooking.bookingId} = ${bookings.id}
          AND ${attractions.adminId} = ${adminId}
      )`,
    ];

    // =====================================================
    // 7. MANAGER / STAFF ACCESS
    // =====================================================

    if (auth.user.role !== "ADMIN") {
      conditions.push(
        sql`EXISTS (
          SELECT 1
          FROM ${attractionsAgainstBooking}
          INNER JOIN ${attractionManagement}
            ON ${attractionManagement.id} = ${attractionsAgainstBooking.attractionManagementId}
          INNER JOIN ${attractions}
            ON ${attractions.id} = ${attractionManagement.attractionId}
          WHERE
            ${attractionsAgainstBooking.bookingId} = ${bookings.id}
            AND ${inArray(attractions.id, accessibleAttractionIds)}
        )`,
      );
    }

    // =====================================================
    // 8. SEARCH
    // =====================================================

    if (search) {
      const searchValue = `%${search}%`;

      conditions.push(
        or(
          ilike(bookings.invoiceNumber, searchValue),

          ilike(bookings.customerName, searchValue),

          ilike(bookings.mobileNumber, searchValue),

          sql`${bookings.totalAmount}::text ILIKE ${searchValue}`,

          // Search attraction name
          sql`EXISTS (
            SELECT 1
            FROM ${attractionsAgainstBooking}
            INNER JOIN ${attractionManagement}
              ON ${attractionManagement.id} = ${attractionsAgainstBooking.attractionManagementId}
            INNER JOIN ${attractions}
              ON ${attractions.id} = ${attractionManagement.attractionId}
            WHERE
              ${attractionsAgainstBooking.bookingId} = ${bookings.id}
              AND ${attractions.name} ILIKE ${searchValue}
          )`,
        )!,
      );
    }

    // =====================================================
    // 9. ATTRACTION FILTER
    // =====================================================

    if (attractionManagementId) {
      conditions.push(
        sql`EXISTS (
          SELECT 1
          FROM ${attractionsAgainstBooking}
          WHERE
            ${attractionsAgainstBooking.bookingId} = ${bookings.id}
            AND ${attractionsAgainstBooking.attractionManagementId} = ${attractionManagementId}::uuid
        )`,
      );
    }

    // =====================================================
    // 10. STATUS FILTER
    // =====================================================

    if (
      status === "PENDING" ||
      status === "CONFIRMED" ||
      status === "CANCELLED"
    ) {
      conditions.push(eq(bookings.status, status));
    }

    // =====================================================
    // 11. FROM DATE (using attractionsAgainstBooking.createdAt)
    // =====================================================

    if (fromDate) {
      const startDate = new Date(`${fromDate}T00:00:00.000Z`);

      if (Number.isNaN(startDate.getTime())) {
        return failure("Invalid fromDate.", 400, "INVALID_FROM_DATE");
      }

      conditions.push(
        sql`EXISTS (
          SELECT 1
          FROM ${attractionsAgainstBooking}
          WHERE
            ${attractionsAgainstBooking.bookingId} = ${bookings.id}
            AND ${attractionsAgainstBooking.createdAt} >= ${startDate}
        )`,
      );
    }

    // =====================================================
    // 12. TO DATE (using attractionsAgainstBooking.createdAt)
    // =====================================================

    if (toDate) {
      const endDate = new Date(`${toDate}T23:59:59.999Z`);

      if (Number.isNaN(endDate.getTime())) {
        return failure("Invalid toDate.", 400, "INVALID_TO_DATE");
      }

      conditions.push(
        sql`EXISTS (
          SELECT 1
          FROM ${attractionsAgainstBooking}
          WHERE
            ${attractionsAgainstBooking.bookingId} = ${bookings.id}
            AND ${attractionsAgainstBooking.createdAt} <= ${endDate}
        )`,
      );
    }

    // =====================================================
    // 13. WHERE CLAUSE
    // =====================================================

    const whereClause = and(...conditions);

    // =====================================================
    // 14. TOTAL COUNT
    // =====================================================

    const [{ count: totalCount }] = await db
      .select({
        count: count(),
      })
      .from(bookings)
      .where(whereClause);

    const total = Number(totalCount || 0);

    // =====================================================
    // 15. GET PAGINATED BOOKINGS
    // =====================================================

    const bookingRows = await db
      .select({
        id: bookings.id,

        invoiceNumber: bookings.invoiceNumber,

        customerName: bookings.customerName,

        mobileNumber: bookings.mobileNumber,

        gstNumber: bookings.gstNumber,

        totalAmount: bookings.totalAmount,

        amountReceived: bookings.amountReceived,

        returnAmount: bookings.returnAmount,

        status: bookings.status,

        createdBy: bookings.createdBy,

        createdAt: bookings.createdAt,

        updatedAt: bookings.updatedAt,
      })
      .from(bookings)
      .where(whereClause)
      .orderBy(desc(bookings.createdAt))
      .limit(limit)
      .offset(offset);

    // =====================================================
    // 16. NO BOOKINGS
    // =====================================================

    if (bookingRows.length === 0) {
      const availableAttractionConditions = [
        eq(attractions.adminId, adminId),
      ];

      if (auth.user.role !== "ADMIN") {
        availableAttractionConditions.push(
          inArray(attractions.id, accessibleAttractionIds),
        );
      }

      const availableAttractions = await db
        .select({
          id: attractions.id,
          name: attractions.name,
        })
        .from(attractions)
        .where(and(...availableAttractionConditions));

      return success({
        items: [],

        attractions: availableAttractions,

        pagination: {
          page,
          limit,
          total,
          totalPages: total === 0 ? 0 : Math.ceil(total / limit),
        },
      });
    }

    // =====================================================
    // 17. GET ATTRACTIONS FOR BOOKINGS
    // =====================================================

    const bookingIds = bookingRows.map((booking) => booking.id);

    const attractionRows =
      bookingIds.length > 0
        ? await db
            .select({
              bookingId: attractionsAgainstBooking.bookingId,

              attractionManagementId:
                attractionsAgainstBooking.attractionManagementId,

              attractionName: attractions.name,

              attractionId: attractionManagement.attractionId,

              subtotal: attractionsAgainstBooking.attractionSubtotal,

              gst: attractionsAgainstBooking.attractionGst,

              roundoff: attractionsAgainstBooking.attractionRoundoff,

              roundOffGstAdj:
                attractionsAgainstBooking.attractionRoundOffGstAdj,

              totalAmount:
                attractionsAgainstBooking.attractionTotalAmount,

              createdAt: attractionsAgainstBooking.createdAt,
            })
            .from(attractionsAgainstBooking)
            .innerJoin(
              attractionManagement,
              eq(
                attractionManagement.id,
                attractionsAgainstBooking.attractionManagementId,
              ),
            )
            .innerJoin(
              attractions,
              eq(attractions.id, attractionManagement.attractionId),
            )
            .where(inArray(attractionsAgainstBooking.bookingId, bookingIds))
        : [];

    // =====================================================
    // 18. GET VISITOR BREAKDOWN BY ATTRACTION
    // =====================================================

    const visitorRows =
      bookingIds.length > 0
        ? await db
            .select({
              bookingId: categoryOfAttractionAgainstBooking.bookingId,

              attractionAgainstBookingId:
                categoryOfAttractionAgainstBooking.attractionAgainstBookingId,

              categoryId: categoryOfAttractionAgainstBooking.categoryId,

              categoryName: attractionCategory.name,

              noOfVisitors:
                categoryOfAttractionAgainstBooking.noOfVisitors,
            })
            .from(categoryOfAttractionAgainstBooking)
            .innerJoin(
              attractionCategory,
              eq(
                attractionCategory.id,
                categoryOfAttractionAgainstBooking.categoryId,
              ),
            )
            .where(inArray(categoryOfAttractionAgainstBooking.bookingId, bookingIds))
        : [];

    // =====================================================
    // 19. GROUP ATTRACTIONS BY BOOKING
    // =====================================================

    const attractionsByBooking = new Map<
      string,
      Array<{
        attractionManagementId: string;
        attractionName: string;
        attractionId: string;
        subtotal: number;
        gst: number;
        roundoff: number;
        roundOffGstAdj: number;
        totalAmount: number;
        createdAt: Date;
      }>
    >();

    for (const attraction of attractionRows) {
      const existing = attractionsByBooking.get(attraction.bookingId) || [];

      existing.push({
        attractionManagementId: attraction.attractionManagementId,
        attractionName: attraction.attractionName,
        attractionId: attraction.attractionId,
        subtotal: Number(attraction.subtotal) || 0,
        gst: Number(attraction.gst) || 0,
        roundoff: Number(attraction.roundoff) || 0,
        roundOffGstAdj: Number(attraction.roundOffGstAdj) || 0,
        totalAmount: Number(attraction.totalAmount) || 0,
        createdAt: attraction.createdAt,
      });

      attractionsByBooking.set(attraction.bookingId, existing);
    }

    // =====================================================
    // 20. GROUP VISITORS BY BOOKING
    // =====================================================

    const visitorsByBooking = new Map<
      string,
      Array<{
        categoryId: string;
        categoryName: string;
        noOfVisitors: number;
      }>
    >();

    for (const visitor of visitorRows) {
      const existing = visitorsByBooking.get(visitor.bookingId) || [];

      existing.push({
        categoryId: visitor.categoryId,
        categoryName: visitor.categoryName,
        noOfVisitors: visitor.noOfVisitors,
      });

      visitorsByBooking.set(visitor.bookingId, existing);
    }

    // =====================================================
    // 21. FORMAT RESPONSE
    // =====================================================

    const items = bookingRows.map((booking) => {
      const bookingAttractions = attractionsByBooking.get(booking.id) || [];
      const bookingVisitors = visitorsByBooking.get(booking.id) || [];

      // Calculate total visitors
      const totalVisitors = bookingVisitors.reduce(
        (sum, v) => sum + v.noOfVisitors,
        0,
      );

      // Calculate grand total amount from all attractions
      const grandTotalAmount = bookingAttractions.reduce(
        (sum, attr) => sum + attr.totalAmount,
        0,
      );

      return {
        id: booking.id,

        invoiceNumber: booking.invoiceNumber,

        customer: {
          name: booking.customerName,
          mobileNumber: booking.mobileNumber,
          gstNumber: booking.gstNumber,
        },

        dateTime:
          bookingAttractions.length > 0
            ? bookingAttractions[0].createdAt
            : booking.createdAt,

        attractions: bookingAttractions.map((attr) => ({
          id: attr.attractionManagementId,
          name: attr.attractionName,
          totalAmount: attr.totalAmount,
        })),

        grandTotalAmount,

        visitors: totalVisitors,

        status: booking.status,

        createdBy: booking.createdBy,

        createdAt: booking.createdAt,

        updatedAt: booking.updatedAt,
      };
    });

    // =====================================================
    // 22. AVAILABLE ATTRACTIONS FOR FILTER
    // =====================================================

    const availableAttractionConditions = [eq(attractions.adminId, adminId)];

    if (auth.user.role !== "ADMIN") {
      availableAttractionConditions.push(
        inArray(attractions.id, accessibleAttractionIds),
      );
    }

    const availableAttractions = await db
      .select({
        id: attractions.id,
        name: attractions.name,
      })
      .from(attractions)
      .where(and(...availableAttractionConditions));

    // =====================================================
    // 23. FINAL RESPONSE
    // =====================================================

    return success({
      items,

      attractions: availableAttractions,

      pagination: {
        page,

        limit,

        total,

        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET /api/admin/bookings error:", error);

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
    // =====================================================
    // 1. AUTHENTICATION
    // =====================================================

    const auth = await requireAuth(request);

    // =====================================================
    // 2. MODULE AUTHORIZATION
    // =====================================================

    await requireModuleAccess(auth, "BOOKINGS");

    // =====================================================
    // 3. TENANT / ADMIN
    // =====================================================

    const adminId = getAdminId(auth);

    // =====================================================
    // 4. REQUEST BODY
    // =====================================================

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

      /*
       * Financial fields
       */
      subtotal,
      gstAmount,
      gstAdjustment,
      roundOff,
      discountAmount,

      tickets,
      seats,
    } = body;

    // =====================================================
    // 5. BASIC VALIDATION
    // =====================================================

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

    if (!/^\d{10}$/.test(mobileNumber.trim())) {
      return failure(
        "Mobile number must be exactly 10 digits.",
        400,
        "INVALID_MOBILE_NUMBER",
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

    // =====================================================
    // 6. ATTRACTION AUTHORIZATION
    // =====================================================

    try {
      await requireAttractionAccess(auth, attractionId);
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

    // =====================================================
    // 7. VALIDATE ATTRACTION TENANT
    // =====================================================

    const [attraction] = await db
      .select({
        id: attractions.id,

        name: attractions.name,
      })
      .from(attractions)
      .where(
        and(
          eq(attractions.id, attractionId),

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

    // =====================================================
    // 8. NORMALIZE TICKETS
    // =====================================================

    let normalizedTickets;

    let calculatedSubtotal = 0;

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

          // ---------------------------------------------
          // Validate
          // ---------------------------------------------

          if (
            !ticket.category ||
            typeof ticket.category !== "string" ||
            !Number.isInteger(quantity) ||
            quantity <= 0 ||
            !Number.isFinite(unitPrice) ||
            unitPrice < 0
          ) {
            throw new Error("INVALID_TICKET");
          }

          // ---------------------------------------------
          // Ensure ticket attraction belongs to
          // the same admin
          // ---------------------------------------------

          if (ticketAttractionId !== attractionId) {
            throw new Error("INVALID_TICKET_ATTRACTION");
          }

          const totalPrice = quantity * unitPrice;

          calculatedSubtotal += totalPrice;

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

      if (
        error instanceof Error &&
        error.message === "INVALID_TICKET_ATTRACTION"
      ) {
        return failure(
          "Ticket attraction must match the booking attraction.",
          400,
          "INVALID_TICKET_ATTRACTION",
        );
      }

      throw error;
    }

    // =====================================================
    // 9. FINANCIAL VALUES
    // =====================================================

    /*
     * If subtotal is provided, validate it against
     * the calculated ticket subtotal.
     *
     * Otherwise use the calculated ticket subtotal.
     */

    const finalSubtotal =
      subtotal === undefined || subtotal === null || subtotal === ""
        ? calculatedSubtotal
        : Number(subtotal);

    if (!Number.isFinite(finalSubtotal) || finalSubtotal < 0) {
      return failure("Invalid subtotal.", 400, "INVALID_SUBTOTAL");
    }

    const finalGstAmount =
      gstAmount === undefined || gstAmount === null || gstAmount === ""
        ? 0
        : Number(gstAmount);

    const finalGstAdjustment =
      gstAdjustment === undefined ||
      gstAdjustment === null ||
      gstAdjustment === ""
        ? 0
        : Number(gstAdjustment);

    const finalRoundOff =
      roundOff === undefined || roundOff === null || roundOff === ""
        ? 0
        : Number(roundOff);

    const finalDiscountAmount =
      discountAmount === undefined ||
      discountAmount === null ||
      discountAmount === ""
        ? 0
        : Number(discountAmount);

    if (!Number.isFinite(finalGstAmount) || finalGstAmount < 0) {
      return failure("Invalid GST amount.", 400, "INVALID_GST_AMOUNT");
    }

    if (!Number.isFinite(finalGstAdjustment)) {
      return failure("Invalid GST adjustment.", 400, "INVALID_GST_ADJUSTMENT");
    }

    if (!Number.isFinite(finalRoundOff)) {
      return failure("Invalid round off.", 400, "INVALID_ROUND_OFF");
    }

    if (!Number.isFinite(finalDiscountAmount) || finalDiscountAmount < 0) {
      return failure(
        "Invalid discount amount.",
        400,
        "INVALID_DISCOUNT_AMOUNT",
      );
    }

    // =====================================================
    // 10. CALCULATE FINAL TOTAL
    // =====================================================

    const totalAmount =
      finalSubtotal +
      finalGstAmount +
      finalGstAdjustment +
      finalRoundOff -
      finalDiscountAmount;

    if (totalAmount < 0) {
      return failure(
        "Booking total cannot be negative.",
        400,
        "INVALID_TOTAL_AMOUNT",
      );
    }

    // =====================================================
    // 11. VISIT DATETIME
    // =====================================================

    const visitAt = new Date(`${visitDate}T${visitTime}:00`);

    if (Number.isNaN(visitAt.getTime())) {
      return failure(
        "Invalid visit date or time.",
        400,
        "INVALID_VISIT_DATETIME",
      );
    }

    // =====================================================
    // 12. SEATS VALIDATION
    // =====================================================

    if (seats !== undefined && !Array.isArray(seats)) {
      return failure("Seats must be an array.", 400, "INVALID_SEATS");
    }

    // =====================================================
    // 13. BOOKING NUMBER
    // =====================================================

    const bookingNumber = `BK-${Date.now()}`;

    // =====================================================
    // 14. CREATE TRANSACTION
    // =====================================================

    const result = await db.transaction(async (tx) => {
      // =============================================
      // CREATE BOOKING
      // =============================================

      const [booking] = await tx
        .insert(bookings)
        .values({
          bookingNumber,

          customerName: customerName.trim(),

          mobileNumber: mobileNumber.trim(),

          gstNumber: gstNumber?.trim() || null,

          attractionId,

          visitAt,

          subtotal: finalSubtotal.toFixed(2),

          gstAmount: finalGstAmount.toFixed(2),

          gstAdjustment: finalGstAdjustment.toFixed(2),

          roundOff: finalRoundOff.toFixed(2),

          discountAmount: finalDiscountAmount.toFixed(2),

          paymentMode,

          status:
            status === "PENDING" ||
            status === "CANCELLED" ||
            status === "CONFIRMED"
              ? status
              : "CONFIRMED",

          totalAmount: totalAmount.toFixed(2),

          amountPaid: totalAmount.toFixed(2),

          createdBy: auth.user.id,

          updatedAt: new Date(),
        })
        .returning();

      if (!booking) {
        throw new Error("BOOKING_CREATE_FAILED");
      }

      // =============================================
      // BOOKING ITEMS
      // =============================================

      await tx.insert(bookingItems).values(
        normalizedTickets.map((ticket) => ({
          bookingId: booking.id,

          attractionId: ticket.attractionId,

          category: ticket.category,

          quantity: ticket.quantity,

          unitPrice: ticket.unitPrice,

          totalPrice: ticket.totalPrice,
        })),
      );

      // =============================================
      // BOOKING SEATS
      // =============================================

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

      const transactionNumber = await generateTransactionNumber(tx);

      const invoiceNumber = await generateInvoiceNumber(tx);

      await tx.insert(transactions).values({
        invoiceNumber,

        bookingId: booking.id,

        amount: totalAmount.toFixed(2),

        paymentMode,

        status: "SUCCESSFUL",
      });

      return booking;
    });

    // =============================================
    // CREATE TRANSACTION / INVOICE
    // =============================================

    // =====================================================
    // 15. RESPONSE
    // =====================================================

    return success(
      {
        booking: {
          id: result.id,

          bookingId: result.bookingNumber,

          customer: {
            name: result.customerName,

            mobileNumber: result.mobileNumber,

            gstNumber: result.gstNumber,
          },

          attraction: {
            id: attraction.id,

            name: attraction.name,
          },

          visitAt: result.visitAt,

          payment: {
            mode: result.paymentMode,

            subtotal: Number(result.subtotal),

            gstAmount: Number(result.gstAmount),

            gstAdjustment: Number(result.gstAdjustment),

            roundOff: Number(result.roundOff),

            discountAmount: Number(result.discountAmount),

            totalAmount: Number(result.totalAmount),

            amountPaid: Number(result.amountPaid),

            amountDue: Number(result.totalAmount) - Number(result.amountPaid),
          },

          status: result.status,

          tickets: normalizedTickets,

          seats: Array.isArray(seats) ? seats : [],

          createdAt: result.createdAt,

          updatedAt: result.updatedAt,
        },
      },
      201,
    );
  } catch (error) {
    // =====================================================
    // AUTHORIZATION ERRORS
    // =====================================================

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

    if (error instanceof Error && error.message === "BOOKING_CREATE_FAILED") {
      return failure("Unable to create booking.", 500, "BOOKING_CREATE_FAILED");
    }

    return failure("Unable to create booking.", 500, "INTERNAL_SERVER_ERROR");
  }
}

// =====================================================
// TRANSACTION NUMBER
// =====================================================

async function generateTransactionNumber(tx: any): Promise<string> {
  const year = new Date().getFullYear();

  const random = crypto
    .randomUUID()
    .replace(/-/g, "")
    .slice(0, 8)
    .toUpperCase();

  return `TXN-${year}-${random}`;
}

// =====================================================
// INVOICE NUMBER
// =====================================================

async function generateInvoiceNumber(tx: any): Promise<string> {
  const year = new Date().getFullYear();

  const random = Math.floor(1000 + Math.random() * 9000);

  return `INV-${year}-${random}`;
}
