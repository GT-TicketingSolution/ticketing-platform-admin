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
