import {
  and,
  arrayContains,
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

  /*
   * bookings.attractionId is now uuid[].
   *
   * Therefore:
   *
   * eq(bookings.attractionId, filter.attractionId)
   *
   * is WRONG.
   *
   * arrayContains() checks whether the booking contains
   * the requested attraction.
   */
  if (filter.attractionId) {
    conditions.push(
      arrayContains(bookings.attractionId, [filter.attractionId]),
    );
  }

  return conditions;
}

/* =========================================================
   TENANT CONDITION FOR BOOKINGS
========================================================= */

/*
 * A booking can contain multiple attraction IDs.
 *
 * We therefore cannot do:
 *
 * eq(bookings.attractionId, attractions.id)
 *
 * Instead, verify that at least one attraction belonging to
 * this admin exists inside bookings.attractionId.
 */
function getTenantBookingCondition(adminId: string): SQL {
  return sql`
    EXISTS (
      SELECT 1
      FROM attractions a
      WHERE a.admin_id = ${adminId}
        AND a.id = ANY(${bookings.attractionId})
    )
  `;
}

/* =========================================================
   OVERALL SUMMARY
========================================================= */

export async function getReportSummary(filter: ReportFilter) {
  const bookingConditions = getBookingConditions(filter);

  /*
   * -------------------------------------------------------
   * Revenue + Booking Count
   * -------------------------------------------------------
   *
   * We intentionally do NOT join attractions here.
   *
   * Joining bookings.attractionId[] against attractions
   * would create multiple rows for multi-attraction bookings.
   *
   * Example:
   *
   * booking.attractionId = [A, B]
   *
   * would produce:
   *
   * booking + A
   * booking + B
   *
   * which could duplicate transaction revenue.
   */

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
    .leftJoin(transactions, eq(transactions.bookingId, bookings.id))
    .where(
      and(...bookingConditions, getTenantBookingCondition(filter.adminId)),
    );

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
    .where(
      and(...bookingConditions, getTenantBookingCondition(filter.adminId)),
    );

  /* -------------------------------------------------------
     Top Attraction
  ------------------------------------------------------- */

  const topAttraction = await getTopAttraction(filter);

  /* -------------------------------------------------------
     Attraction Reports
  ------------------------------------------------------- */

  const attractionReports = await getAttractionReports(filter);

  /* -------------------------------------------------------
     Final Response
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
  /*
   * IMPORTANT:
   *
   * For attraction-level revenue we use
   * bookingItems.attractionId.
   *
   * This prevents one transaction from being duplicated
   * across every attraction in bookings.attractionId[].
   */

  const bookingConditions = getBookingConditions(filter);

  const result = await db
    .select({
      id: attractions.id,

      name: attractions.name,

      revenue: sql<number>`
        COALESCE(
          SUM(
            CASE
              WHEN ${transactions.status} = 'SUCCESSFUL'
               AND ${transactions.isDeleted} = false
              THEN ${bookingItems.totalPrice}
              ELSE 0
            END
          ),
          0
        )
      `,
    })
    .from(bookingItems)
    .innerJoin(bookings, eq(bookingItems.bookingId, bookings.id))
    .innerJoin(attractions, eq(bookingItems.attractionId, attractions.id))
    .leftJoin(transactions, eq(transactions.bookingId, bookings.id))
    .where(
      and(
        ...bookingConditions,

        eq(attractions.adminId, filter.adminId),

        getTenantBookingCondition(filter.adminId),

        ...(filter.attractionId
          ? [eq(bookingItems.attractionId, filter.attractionId)]
          : []),
      ),
    )
    .groupBy(attractions.id, attractions.name)
    .orderBy(
      sql`
        COALESCE(
          SUM(
            CASE
              WHEN ${transactions.status} = 'SUCCESSFUL'
               AND ${transactions.isDeleted} = false
              THEN ${bookingItems.totalPrice}
              ELSE 0
            END
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

  const attractionConditions: SQL[] = [eq(attractions.adminId, filter.adminId)];

  if (filter.attractionId) {
    attractionConditions.push(eq(attractions.id, filter.attractionId));
  }

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
     Common Booking Conditions
  ------------------------------------------------------- */

  const bookingConditions = getBookingConditions(filter);

  /* -------------------------------------------------------
     Revenue + Booking Count
  ------------------------------------------------------- */

  /*
   * Use bookingItems.attractionId.
   *
   * This is critical because bookingItems has:
   *
   * attractionId: uuid
   *
   * while bookings has:
   *
   * attractionId: uuid[]
   */

  const revenueRows = await db
    .select({
      attractionId: bookingItems.attractionId,

      revenue: sql<number>`
        COALESCE(
          SUM(
            CASE
              WHEN ${transactions.status} = 'SUCCESSFUL'
               AND ${transactions.isDeleted} = false
              THEN ${bookingItems.totalPrice}
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
    .from(bookingItems)
    .innerJoin(bookings, eq(bookingItems.bookingId, bookings.id))
    .innerJoin(attractions, eq(bookingItems.attractionId, attractions.id))
    .leftJoin(transactions, eq(transactions.bookingId, bookings.id))
    .where(
      and(
        ...bookingConditions,

        eq(attractions.adminId, filter.adminId),

        getTenantBookingCondition(filter.adminId),

        ...(filter.attractionId
          ? [eq(bookingItems.attractionId, filter.attractionId)]
          : []),
      ),
    )
    .groupBy(bookingItems.attractionId);

  /* -------------------------------------------------------
     Ticket Count
  ------------------------------------------------------- */

  const ticketRows = await db
    .select({
      attractionId: bookingItems.attractionId,

      tickets: sql<number>`
        COALESCE(
          SUM(${bookingItems.quantity}),
          0
        )
      `,
    })
    .from(bookingItems)
    .innerJoin(bookings, eq(bookingItems.bookingId, bookings.id))
    .innerJoin(attractions, eq(bookingItems.attractionId, attractions.id))
    .where(
      and(
        ...bookingConditions,

        eq(attractions.adminId, filter.adminId),

        getTenantBookingCondition(filter.adminId),

        ...(filter.attractionId
          ? [eq(bookingItems.attractionId, filter.attractionId)]
          : []),
      ),
    )
    .groupBy(bookingItems.attractionId);

  /* -------------------------------------------------------
     Ticket Category Breakdown
  ------------------------------------------------------- */

  const ticketCategoryRows = await db
    .select({
      attractionId: bookingItems.attractionId,

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
    .innerJoin(attractions, eq(bookingItems.attractionId, attractions.id))
    .where(
      and(
        ...bookingConditions,

        eq(attractions.adminId, filter.adminId),

        getTenantBookingCondition(filter.adminId),

        ...(filter.attractionId
          ? [eq(bookingItems.attractionId, filter.attractionId)]
          : []),
      ),
    )
    .groupBy(bookingItems.attractionId, bookingItems.category);

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
      attractionId: bookingItems.attractionId,

      mode: transactions.paymentMode,

      transactions: sql<number>`
        COUNT(DISTINCT ${transactions.id})
      `,

      amount: sql<number>`
        COALESCE(
          SUM(
            ${bookingItems.totalPrice}
          ),
          0
        )
      `,
    })
    .from(transactions)
    .innerJoin(bookings, eq(transactions.bookingId, bookings.id))
    .innerJoin(bookingItems, eq(bookingItems.bookingId, bookings.id))
    .innerJoin(attractions, eq(bookingItems.attractionId, attractions.id))
    .where(
      and(
        ...paymentConditions,

        eq(attractions.adminId, filter.adminId),

        getTenantBookingCondition(filter.adminId),

        ...(filter.attractionId
          ? [eq(bookingItems.attractionId, filter.attractionId)]
          : []),
      ),
    )
    .groupBy(bookingItems.attractionId, transactions.paymentMode);

  /* -------------------------------------------------------
     Recent Transactions
  ------------------------------------------------------- */

  const transactionConditions: SQL[] = [
    ...bookingConditions,
    eq(transactions.isDeleted, false),
    isNotNull(transactions.invoiceNumber),
  ];
  const transactionRows = await db
    .select({
      attractionId: bookingItems.attractionId,

      invoiceNumber: transactions.invoiceNumber,

      customerName: bookings.customerName,

      dateTime: transactions.createdAt,

      paymentMode: transactions.paymentMode,

      amount: transactions.amount,

      status: transactions.status,
    })
    .from(transactions)
    .innerJoin(bookings, eq(transactions.bookingId, bookings.id))
    .innerJoin(bookingItems, eq(bookingItems.bookingId, bookings.id))
    .innerJoin(attractions, eq(bookingItems.attractionId, attractions.id))
    .where(
      and(
        ...transactionConditions,

        eq(attractions.adminId, filter.adminId),

        getTenantBookingCondition(filter.adminId),

        ...(filter.attractionId
          ? [eq(bookingItems.attractionId, filter.attractionId)]
          : []),
      ),
    )
    .orderBy(sql`${transactions.createdAt} DESC`);

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

    /*
     * transactionRows is already ordered
     * newest -> oldest.
     *
     * Keep latest 6 per attraction.
     */

    if (existing.length < 6) {
      existing.push({
        invoiceNumber: row.invoiceNumber!,
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
    .where(
      and(
        ...conditions,

        getTenantBookingCondition(filter.adminId),
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
    .where(
      and(
        ...conditions,

        getTenantBookingCondition(filter.adminId),
      ),
    )
    .groupBy(bookingItems.category);

  return result.map((row) => ({
    category: row.category,

    rate: Number(row.rate ?? 0),

    quantity: Number(row.quantity ?? 0),

    revenue: Number(row.revenue ?? 0),
  }));
}
