import { and, eq, gte, lte, sql, type SQL } from "drizzle-orm";

import { db } from "@/db";

import {
  attractions,
  attractionManagement,
  bookings,
  bookingItems,
  transactions,
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
    eq(attractions.adminId, filter.adminId),
    eq(bookings.status, "CONFIRMED"),
    eq(bookings.isDeleted, false),
  ];

  const startDate = getStartDate(filter.fromDate);
  const endDate = getEndDate(filter.toDate);

  if (startDate) {
    conditions.push(gte(bookings.visitAt, startDate));
  }

  if (endDate) {
    conditions.push(lte(bookings.visitAt, endDate));
  }

  if (filter.attractionId) {
    conditions.push(eq(bookings.attractionId, filter.attractionId));
  }

  return conditions;
}

/* =========================================================
   OVERALL SUMMARY
========================================================= */

export async function getReportSummary(filter: ReportFilter) {
  const bookingConditions = getBookingConditions(filter);

  /* -------------------------------------------------------
     Revenue + Bookings

     Do NOT join bookingItems here because that would
     duplicate booking revenue for every booking item.
  ------------------------------------------------------- */

  const bookingSummary = await db
    .select({
      revenue: sql<number>`
        COALESCE(
          SUM(${bookings.amountPaid}),
          0
        )
      `,

      bookings: sql<number>`
        COUNT(DISTINCT ${bookings.id})
      `,
    })
    .from(bookings)
    .innerJoin(attractions, eq(bookings.attractionId, attractions.id))
    .where(and(...bookingConditions));

  /* -------------------------------------------------------
     Tickets
  ------------------------------------------------------- */

  const ticketSummary = await db
    .select({
      tickets: sql<number>`
        COALESCE(
          SUM(${bookingItems.quantity}),
          0
        )
      `,
    })
    .from(bookingItems)
    .innerJoin(bookings, eq(bookingItems.bookingId, bookings.id))
    .innerJoin(attractions, eq(bookings.attractionId, attractions.id))
    .where(and(...bookingConditions));

  /* -------------------------------------------------------
     Top Attraction
  ------------------------------------------------------- */

  const topAttraction = await getTopAttraction(filter);

  /* -------------------------------------------------------
     Attraction-wise Reports

     IMPORTANT:
     Do NOT name this variable `attractions`
     because `attractions` is already the imported
     Drizzle table.
  ------------------------------------------------------- */

  const attractionReports = await getAttractionReports(filter);

  /* -------------------------------------------------------
     FINAL RESPONSE
  ------------------------------------------------------- */

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
  const conditions = getBookingConditions(filter);

  const result = await db
    .select({
      id: attractions.id,

      name: attractions.name,

      revenue: sql<number>`
        COALESCE(
          SUM(${bookings.amountPaid}),
          0
        )
      `,
    })
    .from(bookings)
    .innerJoin(attractions, eq(bookings.attractionId, attractions.id))
    .where(and(...conditions))
    .groupBy(attractions.id, attractions.name)
    .orderBy(
      sql`
        COALESCE(
          SUM(${bookings.amountPaid}),
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

  const attractionConditions: SQL[] = [eq(attractions.adminId, filter.adminId)];

  if (filter.attractionId) {
    attractionConditions.push(eq(attractions.id, filter.attractionId));
  }

  /* -------------------------------------------------------
     Attraction Master Data

     Timing + prices come from attractionManagement.
  ------------------------------------------------------- */

  const attractionRows = await db
    .select({
      id: attractions.id,

      name: attractions.name,

      type: attractions.type,

      status: attractions.status,

      timing: attractionManagement.timing,

      adultPrice: attractionManagement.adultPrice,

      childPrice: attractionManagement.childPrice,

      studentPrice: attractionManagement.studentPrice,

      seniorPrice: attractionManagement.seniorPrice,

      foreignerPrice: attractionManagement.foreignerPrice,

      image: attractionManagement.image,
    })
    .from(attractions)
    .leftJoin(
      attractionManagement,
      eq(attractionManagement.attractionId, attractions.id),
    )
    .where(and(...attractionConditions));

  if (attractionRows.length === 0) {
    return [];
  }

  /* -------------------------------------------------------
     Revenue + Booking Count

     Do NOT join bookingItems here.
  ------------------------------------------------------- */

  const bookingConditions = getBookingConditions(filter);

  const revenueRows = await db
    .select({
      attractionId: bookings.attractionId,

      revenue: sql<number>`
        COALESCE(
          SUM(${bookings.amountPaid}),
          0
        )
      `,

      bookings: sql<number>`
        COUNT(DISTINCT ${bookings.id})
      `,
    })
    .from(bookings)
    .innerJoin(attractions, eq(bookings.attractionId, attractions.id))
    .where(and(...bookingConditions))
    .groupBy(bookings.attractionId);

  /* -------------------------------------------------------
     Ticket Count
  ------------------------------------------------------- */

  const ticketRows = await db
    .select({
      attractionId: bookings.attractionId,

      tickets: sql<number>`
        COALESCE(
          SUM(${bookingItems.quantity}),
          0
        )
      `,
    })
    .from(bookingItems)
    .innerJoin(bookings, eq(bookingItems.bookingId, bookings.id))
    .innerJoin(attractions, eq(bookings.attractionId, attractions.id))
    .where(and(...bookingConditions))
    .groupBy(bookings.attractionId);

  /* -------------------------------------------------------
     Ticket Category Breakdown
  ------------------------------------------------------- */

  const ticketCategoryRows = await db
    .select({
      attractionId: bookings.attractionId,

      category: bookingItems.category,

      rate: sql<number>`
        MIN(${bookingItems.unitPrice})
      `,

      quantity: sql<number>`
        COALESCE(
          SUM(${bookingItems.quantity}),
          0
        )
      `,

      revenue: sql<number>`
        COALESCE(
          SUM(${bookingItems.totalPrice}),
          0
        )
      `,
    })
    .from(bookingItems)
    .innerJoin(bookings, eq(bookingItems.bookingId, bookings.id))
    .innerJoin(attractions, eq(bookings.attractionId, attractions.id))
    .where(and(...bookingConditions))
    .groupBy(bookings.attractionId, bookingItems.category);

  /* -------------------------------------------------------
     Payment Distribution

     Only successful transactions.
  ------------------------------------------------------- */

  const paymentConditions: SQL[] = [
    ...bookingConditions,

    eq(transactions.status, "SUCCESSFUL"),

    eq(transactions.isDeleted, false),
  ];

  const paymentRows = await db
    .select({
      attractionId: bookings.attractionId,

      mode: transactions.paymentMode,

      transactions: sql<number>`
        COUNT(${transactions.id})
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
    .innerJoin(attractions, eq(bookings.attractionId, attractions.id))
    .where(and(...paymentConditions))
    .groupBy(bookings.attractionId, transactions.paymentMode);

  /* -------------------------------------------------------
     Recent Transactions

     Includes:
     SUCCESSFUL
     PENDING
     CANCELLED
     FAILED

     Latest 6 per attraction are returned below.
  ------------------------------------------------------- */

  const transactionConditions: SQL[] = [
    ...bookingConditions,

    eq(transactions.isDeleted, false),
  ];

  const transactionRows = await db
    .select({
      attractionId: bookings.attractionId,

      transactionId: transactions.transactionNumber,

      customerName: bookings.customerName,

      dateTime: transactions.createdAt,

      paymentMode: transactions.paymentMode,

      amount: transactions.amount,

      status: transactions.status,
    })
    .from(transactions)
    .innerJoin(bookings, eq(transactions.bookingId, bookings.id))
    .innerJoin(attractions, eq(bookings.attractionId, attractions.id))
    .where(and(...transactionConditions))
    .orderBy(sql`${transactions.createdAt} DESC`);

  /* =======================================================
     BUILD MAPS
  ======================================================= */

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

      rate: Number(row.rate ?? 0),

      quantity: Number(row.quantity ?? 0),

      revenue: Number(row.revenue ?? 0),
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
      transactionId: string;
      customerName: string | null;
      dateTime: Date;
      paymentMode: string;
      amount: number;
      status: string;
    }>
  >();

  for (const row of transactionRows) {
    const existing = transactionMap.get(row.attractionId) ?? [];

    /*
     * Keep latest 6 transactions
     * for each attraction.
     *
     * transactionRows is already ordered
     * newest -> oldest.
     */
    if (existing.length < 6) {
      existing.push({
        transactionId: row.transactionId,

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

        adultRate: Number(attraction.adultPrice ?? 0),

        childRate: Number(attraction.childPrice ?? 0),

        studentRate: Number(attraction.studentPrice ?? 0),

        seniorRate: Number(attraction.seniorPrice ?? 0),

        foreignerRate: Number(attraction.foreignerPrice ?? 0),

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
        COUNT(${transactions.id})
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
    .innerJoin(attractions, eq(bookings.attractionId, attractions.id))
    .where(and(...conditions))
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
      category: bookingItems.category,

      rate: sql<number>`
        MIN(${bookingItems.unitPrice})
      `,

      quantity: sql<number>`
        COALESCE(
          SUM(${bookingItems.quantity}),
          0
        )
      `,

      revenue: sql<number>`
        COALESCE(
          SUM(${bookingItems.totalPrice}),
          0
        )
      `,
    })
    .from(bookingItems)
    .innerJoin(bookings, eq(bookingItems.bookingId, bookings.id))
    .innerJoin(attractions, eq(bookings.attractionId, attractions.id))
    .where(and(...conditions))
    .groupBy(bookingItems.category);

  return result.map((row) => ({
    category: row.category,

    rate: Number(row.rate ?? 0),

    quantity: Number(row.quantity ?? 0),

    revenue: Number(row.revenue ?? 0),
  }));
}
