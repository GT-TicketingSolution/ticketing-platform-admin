import {
  and,
  desc,
  eq,
  exists,
  gte,
  lte,
  sql,
  isNotNull,
  type SQL,
} from "drizzle-orm";

import type { AnyPgColumn } from "drizzle-orm/pg-core";

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

  // Optional. When omitted, the report covers every record the caller can
  // access (ADMIN/MANAGER: all time, STAFF: their full report access window).
  startDateTime?: Date;
  endDateTime?: Date;
};

const LATEST_TRANSACTIONS_PER_ATTRACTION = 6;

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

    // No date range requested: staff can never see beyond their access
    // window, so "everything accessible" means the whole window.
    if (!startDateTime || !endDateTime) {
      startDateTime = accessStart;
      endDateTime = now;
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
  // REPORT SCOPE
  // =====================================================

  // All filtering and aggregation happens in the database, so memory use
  // stays flat no matter how many bookings fall inside the scope.
  // Tenant scope: bookings -> attractionsAgainstBooking -> attractionManagement
  // -> attractions.adminId (bookings has no adminId column).

  const bookingFilters: SQL[] = [eq(bookings.isDeleted, false)];

  if (startDateTime) bookingFilters.push(gte(bookings.createdAt, startDateTime));
  if (endDateTime) bookingFilters.push(lte(bookings.createdAt, endDateTime));

  // For queries that already join through to attractions.
  const bookingScope: SQL[] = [
    ...bookingFilters,
    eq(attractions.adminId, adminId),
  ];

  const transactionScope: SQL[] = [
    ...bookingScope,
    eq(transactions.isDeleted, false),
  ];

  if (startDateTime) {
    transactionScope.push(gte(transactions.createdAt, startDateTime));
  }
  if (endDateTime) {
    transactionScope.push(lte(transactions.createdAt, endDateTime));
  }

  // =====================================================
  // FETCH ALL ATTRACTIONS + GRAND TOTALS
  // =====================================================

  // Grand totals use EXISTS so a booking spanning several attractions is
  // counted once without a DISTINCT over the joined rows.
  const [attractionRows, [totals]] = await Promise.all([
    db
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
      .where(eq(attractions.adminId, adminId)),

    db
      .select({
        grandTotalBooking: sql<number>`count(*)::int`,
        grandTotalAmount: sql<string>`coalesce(sum(${bookings.totalAmount}), 0)`,
      })
      .from(bookings)
      .where(
        and(...bookingFilters, tenantBookingExists(adminId, bookings.id)),
      ),
  ]);

  const grandTotalBooking = Number(totals?.grandTotalBooking ?? 0);
  const grandTotalAmount = Number(totals?.grandTotalAmount ?? 0);

  // =====================================================
  // NO BOOKINGS
  // =====================================================

  if (!grandTotalBooking) {
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
  // PER-ATTRACTION AMOUNTS
  // =====================================================

  const attractionTotalsQuery = db
    .select({
      attractionManagementId: attractionsAgainstBooking.attractionManagementId,
      subtotal: sql<string>`coalesce(sum(${attractionsAgainstBooking.attractionSubtotal}), 0)`,
      gst: sql<string>`coalesce(sum(${attractionsAgainstBooking.attractionGst}), 0)`,
      roundoff: sql<string>`coalesce(sum(${attractionsAgainstBooking.attractionRoundoff}), 0)`,
      roundOffGstAdj: sql<string>`coalesce(sum(${attractionsAgainstBooking.attractionRoundOffGstAdj}), 0)`,
      totalAmount: sql<string>`coalesce(sum(${attractionsAgainstBooking.attractionTotalAmount}), 0)`,
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
    .innerJoin(attractions, eq(attractionManagement.attractionId, attractions.id))
    .where(and(...bookingScope))
    .groupBy(attractionsAgainstBooking.attractionManagementId);

  // =====================================================
  // PER-ATTRACTION CATEGORY TICKETS
  // =====================================================

  const categoriesQuery = db
    .select({
      attractionManagementId: attractionsAgainstBooking.attractionManagementId,
      name: attractionCategory.name,
      basePrice: attractionCategory.basePrice,
      noOfTickets: sql<number>`coalesce(sum(${categoryOfAttractionAgainstBooking.noOfVisitors}), 0)::int`,
    })
    .from(categoryOfAttractionAgainstBooking)
    .innerJoin(
      attractionsAgainstBooking,
      eq(
        categoryOfAttractionAgainstBooking.attractionAgainstBookingId,
        attractionsAgainstBooking.id,
      ),
    )
    .innerJoin(
      attractionCategory,
      eq(categoryOfAttractionAgainstBooking.categoryId, attractionCategory.id),
    )
    .innerJoin(bookings, eq(attractionsAgainstBooking.bookingId, bookings.id))
    .innerJoin(
      attractionManagement,
      eq(
        attractionsAgainstBooking.attractionManagementId,
        attractionManagement.id,
      ),
    )
    .innerJoin(attractions, eq(attractionManagement.attractionId, attractions.id))
    .where(and(...bookingScope))
    .groupBy(
      attractionsAgainstBooking.attractionManagementId,
      categoryOfAttractionAgainstBooking.categoryId,
      attractionCategory.name,
      attractionCategory.basePrice,
    )
    .orderBy(attractionCategory.name);

  // =====================================================
  // PER-ATTRACTION PAYMENT DISTRIBUTION
  // =====================================================

  // Grouped per attraction line, so each transaction counts once for every
  // attraction its booking contains.
  const paymentsQuery = db
    .select({
      attractionManagementId: attractionsAgainstBooking.attractionManagementId,
      paymentMode: transactions.paymentMode,
      count: sql<number>`count(*)::int`,
      totalAmount: sql<string>`coalesce(sum(${transactions.amount}), 0)`,
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
    .innerJoin(attractions, eq(attractionManagement.attractionId, attractions.id))
    .where(and(...transactionScope))
    .groupBy(
      attractionsAgainstBooking.attractionManagementId,
      transactions.paymentMode,
    )
    .orderBy(transactions.paymentMode);

  // =====================================================
  // LATEST TRANSACTIONS PER ATTRACTION
  // =====================================================

  // Ranked in SQL so only the top rows per attraction leave the database.
  const rankedTransactions = db
    .select({
      attractionManagementId: attractionsAgainstBooking.attractionManagementId,
      invoiceId: transactions.invoiceNumber,
      customerName: bookings.customerName,
      amount: transactions.amount,
      paymentMode: transactions.paymentMode,
      status: transactions.status,
      createdAt: transactions.createdAt,
      rowNumber: sql<number>`row_number() over (partition by ${attractionsAgainstBooking.attractionManagementId} order by ${transactions.createdAt} desc)`.as(
        "row_number",
      ),
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
    .innerJoin(attractions, eq(attractionManagement.attractionId, attractions.id))
    .where(and(...transactionScope))
    .as("ranked_transactions");

  const latestTransactionsQuery = db
    .select({
      attractionManagementId: rankedTransactions.attractionManagementId,
      invoiceId: rankedTransactions.invoiceId,
      customerName: rankedTransactions.customerName,
      amount: rankedTransactions.amount,
      paymentMode: rankedTransactions.paymentMode,
      status: rankedTransactions.status,
      createdAt: rankedTransactions.createdAt,
    })
    .from(rankedTransactions)
    .where(
      lte(rankedTransactions.rowNumber, LATEST_TRANSACTIONS_PER_ATTRACTION),
    )
    .orderBy(desc(rankedTransactions.createdAt));

  // =====================================================
  // INVOICE RANGE
  // =====================================================

  // Limited to transactions of this tenant's bookings.
  const invoiceRangeConditions: SQL[] = [
    tenantBookingExists(adminId, transactions.bookingId),
  ];

  if (startDateTime) {
    invoiceRangeConditions.push(gte(transactions.createdAt, startDateTime));
  }
  if (endDateTime) {
    invoiceRangeConditions.push(lte(transactions.createdAt, endDateTime));
  }

  const invoiceRangeQuery = db
    .select({
      from: sql<string | null>`MIN(${transactions.invoiceNumber})`,
      to: sql<string | null>`MAX(${transactions.invoiceNumber})`,
    })
    .from(transactions)
    .where(and(...invoiceRangeConditions));

  // The queries above are independent; run them concurrently.
  const [
    attractionTotalRows,
    categoryRows,
    paymentRows,
    latestTransactionRows,
    invoiceRange,
  ] = await Promise.all([
    attractionTotalsQuery,
    categoriesQuery,
    paymentsQuery,
    latestTransactionsQuery,
    invoiceRangeQuery,
  ]);

  // =====================================================
  // GROUP RESULTS BY ATTRACTION
  // =====================================================

  const totalsByAttraction = new Map(
    attractionTotalRows.map((row) => [row.attractionManagementId, row]),
  );

  const categoriesByAttraction = groupByAttraction(categoryRows);
  const paymentsByAttraction = groupByAttraction(paymentRows);
  const transactionsByAttraction = groupByAttraction(latestTransactionRows);

  // =====================================================
  // BOOKINGS
  // GROUPED BY ATTRACTION
  // =====================================================

  const attractionAgainstBookingReport = attractionRows.map((attraction) => {
    const attractionTotals = totalsByAttraction.get(
      attraction.attractionManagementId,
    );

    return {
      attraction_management_id: attraction.attractionManagementId,

      category_of_attraction_against_booking: (
        categoriesByAttraction.get(attraction.attractionManagementId) ?? []
      ).map((category) => ({
        name: category.name,

        no_of_tickets: Number(category.noOfTickets ?? 0),

        base_price: Number(category.basePrice ?? 0).toFixed(2),
      })),

      attraction_sub_total: Number(attractionTotals?.subtotal ?? 0).toFixed(2),

      attraction_gst_total: Number(attractionTotals?.gst ?? 0).toFixed(2),

      attraction_roundoff_total: Number(attractionTotals?.roundoff ?? 0).toFixed(
        2,
      ),

      attraction_round_off_gst_adj_total: Number(
        attractionTotals?.roundOffGstAdj ?? 0,
      ).toFixed(2),

      attraction_grand_total: Number(attractionTotals?.totalAmount ?? 0).toFixed(
        2,
      ),

      payment_distribution: (
        paymentsByAttraction.get(attraction.attractionManagementId) ?? []
      ).map((payment) => ({
        payment_mode: payment.paymentMode,
        count: Number(payment.count ?? 0),
        total_amount: Number(payment.totalAmount ?? 0).toFixed(2),
      })),
    };
  });

  // =====================================================
  // TOP 6 TRANSACTIONS AGAINST EACH ATTRACTION
  // =====================================================

  const attractionTransactionsReport = attractionRows.map((attraction) => ({
    attraction_management_id: attraction.attractionManagementId,

    invoice_range: invoiceRange,

    transactions: (
      transactionsByAttraction.get(attraction.attractionManagementId) ?? []
    ).map((transaction) => {
      const createdAt = new Date(transaction.createdAt);

      return {
        invoice_id: transaction.invoiceId,

        customer_name: transaction.customerName,

        date: createdAt.toISOString().split("T")[0],

        time: createdAt.toISOString().split("T")[1].substring(0, 8),

        payment_mode: transaction.paymentMode,

        amount: Number(transaction.amount ?? 0).toFixed(2),

        status: transaction.status,
      };
    }),
  }));

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

/**
 * EXISTS condition: the given booking has at least one attraction line
 * belonging to this admin's attractions (bookings has no adminId column).
 */
function tenantBookingExists(adminId: string, bookingId: AnyPgColumn) {
  return exists(
    db
      .select({ one: sql`1` })
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
          eq(attractionsAgainstBooking.bookingId, bookingId),
          eq(attractions.adminId, adminId),
        ),
      ),
  );
}

function groupByAttraction<T extends { attractionManagementId: string }>(
  rows: T[],
) {
  const grouped = new Map<string, T[]>();

  for (const row of rows) {
    const group = grouped.get(row.attractionManagementId);

    if (group) {
      group.push(row);
    } else {
      grouped.set(row.attractionManagementId, [row]);
    }
  }

  return grouped;
}
