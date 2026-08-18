import { and, eq, gte, lte, sql } from "drizzle-orm";

import { db } from "@/db";

import { attractions, bookings, bookingItems, transactions } from "@/db/schema";

interface ReportFilter {
  adminId: string;
  fromDate?: string;
  toDate?: string;
  attractionId?: string;
}

function applyDateFilter(
  conditions: any[],
  fromDate?: string,
  toDate?: string,
) {
  if (fromDate) {
    conditions.push(gte(bookings.visitAt, new Date(fromDate)));
  }

  if (toDate) {
    conditions.push(lte(bookings.visitAt, new Date(`${toDate}T23:59:59`)));
  }
}

// =====================================================
// OVERALL SUMMARY
// =====================================================

export async function getReportSummary(filter: ReportFilter) {
  const conditions = [
    eq(attractions.adminId, filter.adminId),

    eq(bookings.status, "CONFIRMED"),
  ];

  applyDateFilter(conditions, filter.fromDate, filter.toDate);

  if (filter.attractionId) {
    conditions.push(eq(bookings.attractionId, filter.attractionId));
  }

  const result = await db
    .select({
      revenue: sql<number>`
   COALESCE(SUM(${bookings.amountPaid}),0)
   `,

      bookings: sql<number>`
   COUNT(${bookings.id})
   `,

      tickets: sql<number>`
   COALESCE(SUM(${bookingItems.quantity}),0)
   `,
    })
    .from(bookings)

    .leftJoin(bookingItems, eq(bookingItems.bookingId, bookings.id))

    .where(and(...conditions));

  return result[0];
}

// =====================================================
// ATTRACTION REPORT
// =====================================================

export async function getAttractionReports(filter: ReportFilter) {
  const conditions = [
    eq(attractions.adminId, filter.adminId),

    eq(bookings.status, "CONFIRMED"),
  ];

  applyDateFilter(conditions, filter.fromDate, filter.toDate);

  const data = await db
    .select({
      attraction: {
        id: attractions.id,
        name: attractions.name,
        type: attractions.type,
        status: attractions.status,
      },

      revenue: sql<number>`
   COALESCE(
    SUM(${bookings.amountPaid}),
    0
   )
   `,

      bookings: sql<number>`
   COUNT(DISTINCT ${bookings.id})
   `,

      tickets: sql<number>`
   COALESCE(
    SUM(${bookingItems.quantity}),
    0
   )
   `,
    })
    .from(attractions)

    .leftJoin(bookings, eq(bookings.attractionId, attractions.id))

    .leftJoin(bookingItems, eq(bookingItems.bookingId, bookings.id))

    .where(and(...conditions))

    .groupBy(attractions.id);

  return data;
}

// =====================================================
// PAYMENT DISTRIBUTION
// =====================================================

export async function getPaymentDistribution(filter: ReportFilter) {
  const result = await db
    .select({
      mode: transactions.paymentMode,

      amount: sql<number>`
   SUM(${transactions.amount})
   `,
    })
    .from(transactions)

    .innerJoin(bookings, eq(bookings.id, transactions.bookingId))

    .where(and(eq(bookings.status, "CONFIRMED")))

    .groupBy(transactions.paymentMode);

  return result;
}

// =====================================================
// TICKET CATEGORY REPORT
// =====================================================

export async function getTicketBreakdown(filter: ReportFilter) {
  return await db
    .select({
      category: bookingItems.category,

      quantity: sql<number>`
 SUM(${bookingItems.quantity})
 `,

      revenue: sql<number>`
 SUM(${bookingItems.totalPrice})
 `,
    })

    .from(bookingItems)

    .innerJoin(bookings, eq(bookings.id, bookingItems.bookingId))

    .where(eq(bookings.status, "CONFIRMED"))

    .groupBy(bookingItems.category);
}
