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

              totalAmount: attractionsAgainstBooking.attractionTotalAmount,

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

              noOfVisitors: categoryOfAttractionAgainstBooking.noOfVisitors,
            })
            .from(categoryOfAttractionAgainstBooking)
            .innerJoin(
              attractionCategory,
              eq(
                attractionCategory.id,
                categoryOfAttractionAgainstBooking.categoryId,
              ),
            )
            .where(
              inArray(categoryOfAttractionAgainstBooking.bookingId, bookingIds),
            )
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
