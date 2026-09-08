import {
  and,
  eq,
  gte,
  inArray,
  lte,
  sql,
  isNotNull,
  type SQL,
} from "drizzle-orm";

import { db } from "@/db";

import {
  attractions,
  attractionManagement,
  bookings,
  transactions,
  attractionsAgainstBooking,
  categoryOfAttractionAgainstBooking,
  attractionCategory,
  staffSystemModulePermissions,
  systemModules,
} from "@/db/schema";

export interface ReportFilter {
  adminId: string;
  fromDate?: string;
  toDate?: string;
  attractionId?: string;
}

/* =========================================================
   DATE HELPERS
========================================================= */

function getStartDate(fromDate?: string): Date | undefined {
  if (!fromDate) return undefined;

  return new Date(`${fromDate}T00:00:00`);
}

function getEndDate(toDate?: string): Date | undefined {
  if (!toDate) return undefined;

  return new Date(`${toDate}T23:59:59.999`);
}

/* =========================================================
   COMMON BOOKING CONDITIONS
========================================================= */

function getBookingConditions(filter: ReportFilter): SQL[] {
  const conditions: SQL[] = [
    eq(bookings.status, "CONFIRMED"),
    eq(bookings.isDeleted, false),
  ];

  const startDate = getStartDate(filter.fromDate);
  const endDate = getEndDate(filter.toDate);

  if (startDate) {
    conditions.push(gte(bookings.createdAt, startDate));
  }

  if (endDate) {
    conditions.push(lte(bookings.createdAt, endDate));
  }

  return conditions;
}

/* =========================================================
   TENANT / ATTRACTION CONDITION
========================================================= */

function getAttractionConditions(filter: ReportFilter): SQL[] {
  const conditions: SQL[] = [eq(attractions.adminId, filter.adminId)];

  if (filter.attractionId) {
    conditions.push(eq(attractions.id, filter.attractionId));
  }

  return conditions;
}

/* =========================================================
   OVERALL SUMMARY
========================================================= */

export async function getReportSummary(filter: ReportFilter) {
  const bookingConditions = getBookingConditions(filter);

  /* -------------------------------------------------------
     Revenue + Booking Count
  ------------------------------------------------------- */

  const bookingSummary = await db
    .select({
      revenue: sql<number>`
        COALESCE(
          SUM(
            CASE
              WHEN ${transactions.status} = 'SUCCESSFUL'
               AND ${transactions.isDeleted} = false
              THEN ${transactions.amount}
              ELSE 0
            END
          ),
          0
        )
      `,

      bookings: sql<number>`
        COUNT(DISTINCT ${bookings.id})
      `,
    })
    .from(bookings)
    .innerJoin(
      attractionsAgainstBooking,
      eq(attractionsAgainstBooking.bookingId, bookings.id),
    )
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
    .leftJoin(transactions, eq(transactions.bookingId, bookings.id))
    .where(
      and(
        ...bookingConditions,
        eq(attractionManagement.adminId, filter.adminId),
        ...(filter.attractionId
          ? [eq(attractions.id, filter.attractionId)]
          : []),
      ),
    );

  /* -------------------------------------------------------
     Ticket / Visitor Count
  ------------------------------------------------------- */

  const ticketSummary = await db
    .select({
      tickets: sql<number>`
        COALESCE(
          SUM(
            ${categoryOfAttractionAgainstBooking.noOfVisitors}
          ),
          0
        )
      `,
    })
    .from(bookings)
    .innerJoin(
      attractionsAgainstBooking,
      eq(attractionsAgainstBooking.bookingId, bookings.id),
    )
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
    .innerJoin(
      categoryOfAttractionAgainstBooking,
      eq(
        categoryOfAttractionAgainstBooking.attractionAgainstBookingId,
        attractionsAgainstBooking.id,
      ),
    )
    .where(
      and(
        ...bookingConditions,
        eq(attractionManagement.adminId, filter.adminId),
        ...(filter.attractionId
          ? [eq(attractions.id, filter.attractionId)]
          : []),
      ),
    );

  /* -------------------------------------------------------
     Top Attraction
  ------------------------------------------------------- */

  const topAttraction = await getTopAttraction(filter);

  /* -------------------------------------------------------
     Attraction Reports
  ------------------------------------------------------- */

  const attractionReports = await getAttractionReports(filter);

  return {
    totalRevenue: Number(bookingSummary[0]?.revenue ?? 0),

    totalBookings: Number(bookingSummary[0]?.bookings ?? 0),

    totalTicketsSold: Number(ticketSummary[0]?.tickets ?? 0),

    topAttraction: topAttraction
      ? {
          id: topAttraction.id,
          name: topAttraction.name,
          revenue: Number(topAttraction.revenue ?? 0),
        }
      : null,

    attractions: attractionReports,
  };
}

/* =========================================================
   TOP ATTRACTION
========================================================= */

async function getTopAttraction(filter: ReportFilter) {
  const bookingConditions = getBookingConditions(filter);

  const result = await db
    .select({
      id: attractions.id,

      name: attractions.name,

      revenue: sql<number>`
        COALESCE(
          SUM(
            ${attractionsAgainstBooking.attractionTotalAmount}
          ),
          0
        )
      `,
    })
    .from(bookings)
    .innerJoin(
      attractionsAgainstBooking,
      eq(attractionsAgainstBooking.bookingId, bookings.id),
    )
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
        ...bookingConditions,
        eq(attractions.adminId, filter.adminId),
        ...(filter.attractionId
          ? [eq(attractions.id, filter.attractionId)]
          : []),
      ),
    )
    .groupBy(attractions.id, attractions.name)
    .orderBy(
      sql`
        COALESCE(
          SUM(
            ${attractionsAgainstBooking.attractionTotalAmount}
          ),
          0
        ) DESC
      `,
    )
    .limit(1);

  return result[0] ?? null;
}

/* =========================================================
   ATTRACTION REPORT
========================================================= */

export async function getAttractionReports(filter: ReportFilter) {
  /* -------------------------------------------------------
     Attraction Conditions
  ------------------------------------------------------- */

  const attractionConditions = getAttractionConditions(filter);

  /* -------------------------------------------------------
     Attraction Master Data
  ------------------------------------------------------- */

  const attractionRows = await db
    .select({
      id: attractions.id,

      name: attractions.name,

      type: attractions.type,

      status: attractions.status,

      timing: attractionManagement.timing,

      // adultPrice: attractionManagement.adultPrice,

      // childPrice: attractionManagement.childPrice,

      // studentPrice: attractionManagement.studentPrice,

      // seniorPrice: attractionManagement.seniorPrice,

      // foreignerPrice: attractionManagement.foreignerPrice,

      image: attractionManagement.image,
    })
    .from(attractions)
    .innerJoin(
      attractionManagement,
      eq(attractionManagement.attractionId, attractions.id),
    )
    .where(and(...attractionConditions));

  if (attractionRows.length === 0) {
    return [];
  }

  const bookingConditions = getBookingConditions(filter);

  /* -------------------------------------------------------
     Revenue + Booking Count
  ------------------------------------------------------- */

  const revenueRows = await db
    .select({
      attractionId: attractions.id,

      revenue: sql<number>`
        COALESCE(
          SUM(
            ${attractionsAgainstBooking.attractionTotalAmount}
          ),
          0
        )
      `,

      bookings: sql<number>`
        COUNT(DISTINCT ${bookings.id})
      `,
    })
    .from(bookings)
    .innerJoin(
      attractionsAgainstBooking,
      eq(attractionsAgainstBooking.bookingId, bookings.id),
    )
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
        ...bookingConditions,
        eq(attractions.adminId, filter.adminId),
        ...(filter.attractionId
          ? [eq(attractions.id, filter.attractionId)]
          : []),
      ),
    )
    .groupBy(attractions.id);

  /* -------------------------------------------------------
     Ticket / Visitor Count
  ------------------------------------------------------- */

  const ticketRows = await db
    .select({
      attractionId: attractions.id,

      tickets: sql<number>`
        COALESCE(
          SUM(
            ${categoryOfAttractionAgainstBooking.noOfVisitors}
          ),
          0
        )
      `,
    })
    .from(bookings)
    .innerJoin(
      attractionsAgainstBooking,
      eq(attractionsAgainstBooking.bookingId, bookings.id),
    )
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
    .innerJoin(
      categoryOfAttractionAgainstBooking,
      eq(
        categoryOfAttractionAgainstBooking.attractionAgainstBookingId,
        attractionsAgainstBooking.id,
      ),
    )
    .where(
      and(
        ...bookingConditions,
        eq(attractions.adminId, filter.adminId),
        ...(filter.attractionId
          ? [eq(attractions.id, filter.attractionId)]
          : []),
      ),
    )
    .groupBy(attractions.id);

  /* -------------------------------------------------------
     Ticket Category Breakdown
  ------------------------------------------------------- */

  const ticketCategoryRows = await db
    .select({
      attractionId: attractions.id,

      category: attractionCategory.name,

      quantity: sql<number>`
        COALESCE(
          SUM(
            ${categoryOfAttractionAgainstBooking.noOfVisitors}
          ),
          0
        )
      `,
    })
    .from(bookings)
    .innerJoin(
      attractionsAgainstBooking,
      eq(attractionsAgainstBooking.bookingId, bookings.id),
    )
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
    .innerJoin(
      categoryOfAttractionAgainstBooking,
      eq(
        categoryOfAttractionAgainstBooking.attractionAgainstBookingId,
        attractionsAgainstBooking.id,
      ),
    )
    .innerJoin(
      attractionCategory,
      eq(categoryOfAttractionAgainstBooking.categoryId, attractionCategory.id),
    )
    .where(
      and(
        ...bookingConditions,
        eq(attractions.adminId, filter.adminId),
        ...(filter.attractionId
          ? [eq(attractions.id, filter.attractionId)]
          : []),
      ),
    )
    .groupBy(attractions.id, attractionCategory.id, attractionCategory.name);

  /* -------------------------------------------------------
     Payment Distribution
  ------------------------------------------------------- */

  const paymentConditions: SQL[] = [
    ...bookingConditions,

    eq(transactions.status, "SUCCESSFUL"),

    eq(transactions.isDeleted, false),
  ];

  const paymentRows = await db
    .select({
      attractionId: attractions.id,

      mode: transactions.paymentMode,

      transactions: sql<number>`
        COUNT(DISTINCT ${transactions.id})
      `,

      amount: sql<number>`
        COALESCE(
          SUM(
            ${attractionsAgainstBooking.attractionTotalAmount}
          ),
          0
        )
      `,
    })
    .from(transactions)
    .innerJoin(bookings, eq(transactions.bookingId, bookings.id))
    .innerJoin(
      attractionsAgainstBooking,
      eq(attractionsAgainstBooking.bookingId, bookings.id),
    )
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
        ...paymentConditions,
        eq(attractions.adminId, filter.adminId),
        ...(filter.attractionId
          ? [eq(attractions.id, filter.attractionId)]
          : []),
      ),
    )
    .groupBy(attractions.id, transactions.paymentMode);

  /* -------------------------------------------------------
     Recent Transactions / Attraction Bookings
  ------------------------------------------------------- */

  const transactionConditions: SQL[] = [
    ...bookingConditions,

    eq(transactions.isDeleted, false),

    isNotNull(transactions.invoiceNumber),
  ];

  const transactionRows = await db
    .select({
      attractionId: attractions.id,

      invoiceNumber: bookings.invoiceNumber,

      customerName: bookings.customerName,

      dateTime: bookings.createdAt,

      paymentMode: transactions.paymentMode,

      amount: attractionsAgainstBooking.attractionTotalAmount,

      status: bookings.status,
    })
    .from(bookings)
    .innerJoin(
      attractionsAgainstBooking,
      eq(attractionsAgainstBooking.bookingId, bookings.id),
    )
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
    .innerJoin(transactions, eq(transactions.bookingId, bookings.id))
    .where(
      and(
        ...transactionConditions,
        eq(attractions.adminId, filter.adminId),
        ...(filter.attractionId
          ? [eq(attractions.id, filter.attractionId)]
          : []),
      ),
    )
    .orderBy(sql`${bookings.createdAt} DESC`);

  /* =======================================================
     BUILD MAPS
  ======================================================= */

  /* -------------------------------------------------------
     Revenue Map
  ------------------------------------------------------- */

  const revenueMap = new Map<
    string,
    {
      revenue: number;
      bookings: number;
    }
  >();

  for (const row of revenueRows) {
    revenueMap.set(row.attractionId, {
      revenue: Number(row.revenue ?? 0),

      bookings: Number(row.bookings ?? 0),
    });
  }

  /* -------------------------------------------------------
     Ticket Map
  ------------------------------------------------------- */

  const ticketMap = new Map<string, number>();

  for (const row of ticketRows) {
    ticketMap.set(row.attractionId, Number(row.tickets ?? 0));
  }

  /* -------------------------------------------------------
     Category Map
  ------------------------------------------------------- */

  const categoryMap = new Map<
    string,
    Array<{
      category: string;
      rate: number;
      quantity: number;
      revenue: number;
    }>
  >();

  for (const row of ticketCategoryRows) {
    const existing = categoryMap.get(row.attractionId) ?? [];

    existing.push({
      category: row.category,

      // Historical booked price is not available here.
      // Category report is visitor-count based.
      rate: 0,

      quantity: Number(row.quantity ?? 0),

      revenue: 0,
    });

    categoryMap.set(row.attractionId, existing);
  }

  /* -------------------------------------------------------
     Payment Map
  ------------------------------------------------------- */

  const paymentMap = new Map<
    string,
    Array<{
      mode: string;
      transactions: number;
      amount: number;
    }>
  >();

  for (const row of paymentRows) {
    const existing = paymentMap.get(row.attractionId) ?? [];

    existing.push({
      mode: row.mode,
      transactions: Number(row.transactions ?? 0),
      amount: Number(row.amount ?? 0),
    });

    paymentMap.set(row.attractionId, existing);
  }

  /* -------------------------------------------------------
     Transaction Map
  ------------------------------------------------------- */

  const transactionMap = new Map<
    string,
    Array<{
      invoiceNumber: string;
      customerName: string | null;
      dateTime: Date;
      paymentMode: string;
      amount: number;
      status: string;
    }>
  >();

  for (const row of transactionRows) {
    const existing = transactionMap.get(row.attractionId) ?? [];

    if (existing.length < 6) {
      existing.push({
        invoiceNumber: row.invoiceNumber,

        customerName: row.customerName,

        dateTime: row.dateTime,

        paymentMode: row.paymentMode,

        amount: Number(row.amount ?? 0),

        status: row.status,
      });
    }

    transactionMap.set(row.attractionId, existing);
  }

  /* =======================================================
     FINAL ATTRACTION RESPONSE
  ======================================================= */

  return attractionRows.map((attraction) => {
    const revenueData = revenueMap.get(attraction.id);

    return {
      attraction: {
        id: attraction.id,

        name: attraction.name,

        type: attraction.type,

        status: attraction.status,

        timing: attraction.timing,

        // adultRate: Number(attraction.adultPrice ?? 0),

        // childRate: Number(attraction.childPrice ?? 0),

        // studentRate: Number(attraction.studentPrice ?? 0),

        // seniorRate: Number(attraction.seniorPrice ?? 0),

        // foreignerRate: Number(attraction.foreignerPrice ?? 0),

        image: attraction.image,
      },

      revenue: revenueData?.revenue ?? 0,

      bookings: revenueData?.bookings ?? 0,

      tickets: ticketMap.get(attraction.id) ?? 0,

      ticketCategorySales: categoryMap.get(attraction.id) ?? [],

      paymentDistribution: paymentMap.get(attraction.id) ?? [],

      recentTransactions: transactionMap.get(attraction.id) ?? [],
    };
  });
}

/* =========================================================
   PAYMENT DISTRIBUTION
========================================================= */

export async function getPaymentDistribution(filter: ReportFilter) {
  const bookingConditions = getBookingConditions(filter);

  const conditions: SQL[] = [
    ...bookingConditions,

    eq(transactions.status, "SUCCESSFUL"),

    eq(transactions.isDeleted, false),
  ];

  const result = await db
    .select({
      mode: transactions.paymentMode,

      transactions: sql<number>`
        COUNT(DISTINCT ${transactions.id})
      `,

      amount: sql<number>`
        COALESCE(
          SUM(${transactions.amount}),
          0
        )
      `,
    })
    .from(transactions)
    .innerJoin(bookings, eq(transactions.bookingId, bookings.id))
    .innerJoin(
      attractionsAgainstBooking,
      eq(attractionsAgainstBooking.bookingId, bookings.id),
    )
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
        ...conditions,

        eq(attractionManagement.adminId, filter.adminId),

        ...(filter.attractionId
          ? [eq(attractions.id, filter.attractionId)]
          : []),
      ),
    )
    .groupBy(transactions.paymentMode);

  return result.map((row) => ({
    mode: row.mode,

    transactions: Number(row.transactions ?? 0),

    amount: Number(row.amount ?? 0),
  }));
}

/* =========================================================
   TICKET CATEGORY REPORT
========================================================= */

export async function getTicketBreakdown(filter: ReportFilter) {
  const conditions = getBookingConditions(filter);

  const result = await db
    .select({
      category: attractionCategory.name,

      quantity: sql<number>`
        COALESCE(
          SUM(
            ${categoryOfAttractionAgainstBooking.noOfVisitors}
          ),
          0
        )
      `,
    })
    .from(categoryOfAttractionAgainstBooking)
    .innerJoin(
      bookings,
      eq(categoryOfAttractionAgainstBooking.bookingId, bookings.id),
    )
    .innerJoin(
      attractionsAgainstBooking,
      eq(
        categoryOfAttractionAgainstBooking.attractionAgainstBookingId,
        attractionsAgainstBooking.id,
      ),
    )
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
    .innerJoin(
      attractionCategory,
      eq(categoryOfAttractionAgainstBooking.categoryId, attractionCategory.id),
    )
    .where(
      and(
        ...conditions,

        eq(attractionManagement.adminId, filter.adminId),

        ...(filter.attractionId
          ? [eq(attractions.id, filter.attractionId)]
          : []),
      ),
    )
    .groupBy(attractionCategory.id, attractionCategory.name);

  return result.map((row) => ({
    category: row.category,

    rate: 0,

    quantity: Number(row.quantity ?? 0),

    revenue: 0,
  }));
}

type GetReportParams = {
  adminId: string;
  staffId?: string;
  startDateTime: Date;
  endDateTime: Date;
};

export async function getReport({
  adminId,
  staffId,
  startDateTime,
  endDateTime,
}: GetReportParams) {
  // =====================================================
  // STAFF REPORT ACCESS
  // =====================================================

  // Only STAFF has report access timing restrictions.
  // ADMIN and MANAGER bypass this section.
  if (staffId) {
    const permission = await db
      .select({
        reportAccessTiming: staffSystemModulePermissions.reportAccessTiming,
        reportAccessUnit: staffSystemModulePermissions.reportAccessUnit,
      })
      .from(staffSystemModulePermissions)
      .innerJoin(
        systemModules,
        eq(staffSystemModulePermissions.moduleId, systemModules.id),
      )
      .where(
        and(
          eq(staffSystemModulePermissions.staffId, staffId),
          eq(systemModules.key, "REPORTS"),
        ),
      )
      .limit(1);

    if (!permission.length) {
      throw new Error("REPORT_ACCESS_NOT_CONFIGURED");
    }

    const reportAccessTiming = permission[0].reportAccessTiming;

    const reportAccessUnit = permission[0].reportAccessUnit;

    if (
      reportAccessTiming === null ||
      reportAccessTiming <= 0 ||
      !reportAccessUnit ||
      !["HOURS", "DAYS"].includes(reportAccessUnit)
    ) {
      throw new Error("REPORT_ACCESS_NOT_CONFIGURED");
    }

    // =====================================================
    // CALCULATE STAFF REPORT ACCESS WINDOW
    // =====================================================

    const now = new Date();
    const accessStart = new Date(now);

    if (reportAccessUnit === "HOURS") {
      accessStart.setUTCHours(accessStart.getUTCHours() - reportAccessTiming);
    } else {
      accessStart.setUTCDate(accessStart.getUTCDate() - reportAccessTiming);
    }

    // INFO: Keep this log for future debugging. It will help us understand if the report access validation is working correctly.
    console.log("Logging this for future debugging:", {
      now: now,
      accessStart: accessStart,
      startDateTime: startDateTime,
      endDateTime: endDateTime,
    });

    const isValid = startDateTime >= accessStart && endDateTime <= now;

    if (!isValid) {
      throw new Error("REPORT_ACCESS_EXPIRED");
    }
  }

  // =====================================================
  // FETCH ALL ATTRACTIONS
  // =====================================================

  const attractionRows = await db
    .select({
      id: attractions.id,
      name: attractions.name,
      type: attractions.type,
      attractionManagementId: attractionManagement.id,
    })
    .from(attractions)
    .innerJoin(
      attractionManagement,
      eq(attractionManagement.attractionId, attractions.id),
    )
    .where(eq(attractions.adminId, adminId));

  // =====================================================
  // FETCH BOOKINGS IN DATE/TIME RANGE
  // AND SCOPE THEM TO CURRENT ADMIN
  // =====================================================

  const bookingRows = await db
    .selectDistinct({
      id: bookings.id,
      totalAmount: bookings.totalAmount,
    })
    .from(bookings)
    .innerJoin(
      attractionsAgainstBooking,
      eq(attractionsAgainstBooking.bookingId, bookings.id),
    )
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
        gte(bookings.createdAt, startDateTime),
        lte(bookings.createdAt, endDateTime),
        eq(bookings.isDeleted, false),
        eq(attractions.adminId, adminId),
      ),
    );

  const bookingIds = bookingRows.map((booking) => booking.id);

  // =====================================================
  // GRAND TOTAL AMOUNT
  // =====================================================

  const grandTotalAmount = bookingRows.reduce(
    (sum, booking) => sum + Number(booking.totalAmount ?? 0),
    0,
  );

  // =====================================================
  // GRAND TOTAL BOOKINGS
  // =====================================================

  const grandTotalBooking = bookingRows.length;

  // =====================================================
  // NO BOOKINGS
  // =====================================================

  if (!bookingIds.length) {
    return {
      attractions: attractionRows.map((attraction) => ({
        id: attraction.id,
        name: attraction.name,
        type: attraction.type,
      })),

      bookings: {
        grand_total_amount: grandTotalAmount.toFixed(2),

        grand_total_booking: grandTotalBooking,

        attraction_against_booking: [],
      },

      transactions: attractionRows.map((attraction) => ({
        attraction_management_id: attraction.attractionManagementId,

        transactions: [],
      })),
    };
  }

  // =====================================================
  // ATTRACTIONS AGAINST BOOKINGS
  // =====================================================

  const attractionBookingRows = await db
    .select({
      id: attractionsAgainstBooking.id,

      bookingId: attractionsAgainstBooking.bookingId,

      attractionManagementId: attractionsAgainstBooking.attractionManagementId,

      attractionSubtotal: attractionsAgainstBooking.attractionSubtotal,

      attractionGst: attractionsAgainstBooking.attractionGst,

      attractionRoundoff: attractionsAgainstBooking.attractionRoundoff,

      attractionRoundOffGstAdj:
        attractionsAgainstBooking.attractionRoundOffGstAdj,

      attractionTotalAmount: attractionsAgainstBooking.attractionTotalAmount,

      attractionName: attractions.name,
    })
    .from(attractionsAgainstBooking)
    .innerJoin(bookings, eq(attractionsAgainstBooking.bookingId, bookings.id))
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
        eq(bookings.isDeleted, false),
        eq(attractions.adminId, adminId),
      ),
    );

  const attractionBookingIds = attractionBookingRows.map((row) => row.id);

  // =====================================================
  // CATEGORY BOOKING DATA
  // =====================================================

  const categoryBookingRows = attractionBookingIds.length
    ? await db
        .select({
          id: categoryOfAttractionAgainstBooking.id,

          attractionAgainstBookingId:
            categoryOfAttractionAgainstBooking.attractionAgainstBookingId,

          bookingId: categoryOfAttractionAgainstBooking.bookingId,

          categoryId: categoryOfAttractionAgainstBooking.categoryId,

          noOfVisitors: categoryOfAttractionAgainstBooking.noOfVisitors,

          categoryName: attractionCategory.name,

          basePrice: attractionCategory.basePrice,
        })
        .from(categoryOfAttractionAgainstBooking)
        .innerJoin(
          attractionCategory,
          eq(
            categoryOfAttractionAgainstBooking.categoryId,
            attractionCategory.id,
          ),
        )
        .where(
          inArray(
            categoryOfAttractionAgainstBooking.attractionAgainstBookingId,
            attractionBookingIds,
          ),
        )
    : [];

  // =====================================================
  // TRANSACTIONS
  // ONLY FOR THE BOOKINGS IN THIS REPORT
  // =====================================================

  const transactionRows = await db
    .select({
      invoiceId: transactions.invoiceNumber,

      customerName: bookings.customerName,

      amount: transactions.amount,

      paymentMode: transactions.paymentMode,

      status: transactions.status,

      createdAt: transactions.createdAt,

      bookingId: transactions.bookingId,

      attractionManagementId: attractionsAgainstBooking.attractionManagementId,
    })
    .from(transactions)
    .innerJoin(bookings, eq(transactions.bookingId, bookings.id))
    .innerJoin(
      attractionsAgainstBooking,
      eq(attractionsAgainstBooking.bookingId, bookings.id),
    )
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
        inArray(transactions.bookingId, bookingIds),

        gte(transactions.createdAt, startDateTime),

        lte(transactions.createdAt, endDateTime),

        eq(transactions.isDeleted, false),

        eq(bookings.isDeleted, false),

        eq(attractions.adminId, adminId),
      ),
    );

  // =====================================================
  // BOOKINGS
  // GROUPED BY ATTRACTION
  // =====================================================

  const attractionAgainstBookingReport = attractionRows.map((attraction) => {
    const attractionBookings = attractionBookingRows.filter(
      (row) => row.attractionManagementId === attraction.attractionManagementId,
    );

    // ===================================================
    // CATEGORY DATA
    // ===================================================

    const attractionBookingIdSet = new Set(
      attractionBookings.map((row) => row.id),
    );

    const categories = categoryBookingRows.filter((row) =>
      attractionBookingIdSet.has(row.attractionAgainstBookingId),
    );

    const categoryMap = new Map<
      string,
      {
        name: string;
        noOfTickets: number;
        basePrice: number;
      }
    >();

    for (const category of categories) {
      const existing = categoryMap.get(category.categoryId);

      const noOfTickets = Number(category.noOfVisitors ?? 0);
      const basePrice = Number(category.basePrice ?? 0);

      if (existing) {
        existing.noOfTickets += noOfTickets;
      } else {
        categoryMap.set(category.categoryId, {
          name: category.categoryName,
          noOfTickets,
          basePrice,
        });
      }
    }

    // ===================================================
    // ATTRACTION SUBTOTAL
    // ===================================================

    const attractionSubtotal = attractionBookings.reduce(
      (sum, row) => sum + Number(row.attractionSubtotal ?? 0),
      0,
    );

    // ===================================================
    // ATTRACTION GST
    // ===================================================

    const attractionGst = attractionBookings.reduce(
      (sum, row) => sum + Number(row.attractionGst ?? 0),
      0,
    );

    // ===================================================
    // ATTRACTION ROUNDOFF
    // ===================================================

    const attractionRoundoff = attractionBookings.reduce(
      (sum, row) => sum + Number(row.attractionRoundoff ?? 0),
      0,
    );

    // ===================================================
    // ATTRACTION ROUND OFF GST ADJUSTMENT
    // ===================================================

    const attractionRoundOffGstAdj = attractionBookings.reduce(
      (sum, row) => sum + Number(row.attractionRoundOffGstAdj ?? 0),
      0,
    );

    // ===================================================
    // ATTRACTION TOTAL AMOUNT
    // ===================================================

    const attractionTotalAmount = attractionBookings.reduce(
      (sum, row) => sum + Number(row.attractionTotalAmount ?? 0),
      0,
    );

    // ===================================================
    // PAYMENT DISTRIBUTION
    // ===================================================

    const attractionBookingIdSetForPayment = new Set(
      attractionBookings.map((row) => row.bookingId),
    );

    const attractionTransactions = transactionRows.filter((transaction) =>
      attractionBookingIdSetForPayment.has(transaction.bookingId),
    );

    const paymentMap = new Map<
      string,
      {
        count: number;
        totalAmount: number;
      }
    >();

    for (const transaction of attractionTransactions) {
      const paymentMode = transaction.paymentMode;
      const amount = Number(transaction.amount ?? 0);

      const existing = paymentMap.get(paymentMode);

      if (existing) {
        existing.count += 1;
        existing.totalAmount += amount;
      } else {
        paymentMap.set(paymentMode, {
          count: 1,
          totalAmount: amount,
        });
      }
    }

    // ===================================================
    // ATTRACTION AGAINST BOOKING RESPONSE
    // ===================================================

    return {
      attraction_management_id: attraction.attractionManagementId,

      category_of_attraction_against_booking: Array.from(
        categoryMap.values(),
      ).map((category) => ({
        name: category.name,

        no_of_tickets: category.noOfTickets,

        base_price: category.basePrice.toFixed(2),
      })),

      attraction_sub_total: attractionSubtotal.toFixed(2),

      attraction_gst_total: attractionGst.toFixed(2),

      attraction_roundoff_total: attractionRoundoff.toFixed(2),

      attraction_round_off_gst_adj_total: attractionRoundOffGstAdj.toFixed(2),

      attraction_grand_total: attractionTotalAmount.toFixed(2),

      payment_distribution: Array.from(paymentMap.entries()).map(
        ([paymentMode, data]) => ({
          payment_mode: paymentMode,
          count: data.count,
          total_amount: data.totalAmount.toFixed(2),
        }),
      ),
    };
  });

  // =====================================================
  // TOP 6 TRANSACTIONS AGAINST EACH ATTRACTION
  // =====================================================

  // Invoice range from ALL transactions
  const invoiceRange = await db
    .select({
      from: sql<number>`MIN(${transactions.invoiceNumber})`,
      to: sql<number>`MAX(${transactions.invoiceNumber})`,
    })
    .from(transactions)
    .where(
      and(
        gte(transactions.createdAt, startDateTime),
        lte(transactions.createdAt, endDateTime),
      ),
    );

  const attractionTransactionsReport = attractionRows.map((attraction) => {
    const attractionTransactions = transactionRows
      .filter(
        (transaction) =>
          transaction.attractionManagementId ===
          attraction.attractionManagementId,
      )
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

    // Only return latest 6 transactions
    const latestTransactions = attractionTransactions.slice(0, 6);

    return {
      attraction_management_id: attraction.attractionManagementId,

      invoice_range: invoiceRange,

      transactions: latestTransactions.map((transaction) => ({
        invoice_id: transaction.invoiceId,

        customer_name: transaction.customerName,

        date: transaction.createdAt.toISOString().split("T")[0],

        time: transaction.createdAt.toISOString().split("T")[1].substring(0, 8),

        payment_mode: transaction.paymentMode,

        amount: Number(transaction.amount ?? 0).toFixed(2),

        status: transaction.status,
      })),
    };
  });

  // =====================================================
  // FINAL RESPONSE
  // =====================================================

  return {
    attractions: attractionRows.map((attraction) => ({
      id: attraction.id,
      attraction_management_id: attraction.attractionManagementId,

      name: attraction.name,

      type: attraction.type,
    })),

    bookings: {
      grand_total_amount: grandTotalAmount.toFixed(2),

      grand_total_booking: grandTotalBooking,

      attraction_against_booking: attractionAgainstBookingReport,
    },

    transactions: attractionTransactionsReport,
  };
}
