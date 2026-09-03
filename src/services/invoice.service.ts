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
  isNotNull,
} from "drizzle-orm";

import { db } from "@/db";
import {
  transactions,
  bookings,
  bookingItems,
  attractions,
  users,
} from "@/db/schema";

/* =========================================================
   TYPES
========================================================= */

export type InvoiceFilters = {
  adminId: string;

  page?: number;
  limit?: number;
  search?: string;
  paymentMode?: string;
  dateFrom?: string;
  dateTo?: string;
};

/* =========================================================
   DATE RANGE
========================================================= */

function buildDateRange(dateFrom?: string, dateTo?: string) {
  const conditions = [];

  if (dateFrom) {
    const from = new Date(`${dateFrom}T00:00:00.000Z`);

    if (!Number.isNaN(from.getTime())) {
      conditions.push(gte(transactions.createdAt, from));
    }
  }

  if (dateTo) {
    const to = new Date(`${dateTo}T23:59:59.999Z`);

    if (!Number.isNaN(to.getTime())) {
      conditions.push(lte(transactions.createdAt, to));
    }
  }

  return conditions;
}

/* =========================================================
   GET INVOICES
========================================================= */

export async function getInvoices(filters: InvoiceFilters) {
  // --------------------------------------------------
  // PAGINATION
  // --------------------------------------------------

  const page = Math.max(Number(filters.page) || 1, 1);

  const limit = Math.min(Math.max(Number(filters.limit) || 10, 1), 100);

  const offset = (page - 1) * limit;

  // --------------------------------------------------
  // TENANT
  // --------------------------------------------------

  const adminId = filters.adminId;

  // --------------------------------------------------
  // FILTER CONDITIONS
  // --------------------------------------------------

  const conditions = [
    // Transaction must not be deleted
    isNull(transactions.deletedAt),

    // Booking must not be deleted
    isNull(bookings.deletedAt),

    // CRITICAL:
    // Invoice must belong to an attraction owned
    // by the authenticated admin.
    eq(attractions.adminId, adminId),
  ];

  // --------------------------------------------------
  // SEARCH
  // --------------------------------------------------

  if (filters.search?.trim()) {
    const search = `%${filters.search.trim()}%`;

    conditions.push(
      or(
        ilike(transactions.invoiceNumber, search),

        ilike(bookings.customerName, search),

        ilike(attractions.name, search),
      )!,
    );
  }

  // --------------------------------------------------
  // PAYMENT MODE
  // --------------------------------------------------

  if (filters.paymentMode && filters.paymentMode !== "ALL") {
    conditions.push(
      eq(
        transactions.paymentMode,
        filters.paymentMode as (typeof transactions.paymentMode.enumValues)[number],
      ),
    );
  }

  // --------------------------------------------------
  // DATE FILTER
  // --------------------------------------------------

  conditions.push(...buildDateRange(filters.dateFrom, filters.dateTo));

  const whereClause = and(...conditions);

  // ==================================================
  // SUMMARY
  // ==================================================

  const [summary] = await db
    .select({
      totalRevenue: sql<string>`
        COALESCE(
          SUM(
            CASE
              WHEN ${transactions.status} = 'SUCCESSFUL'
              THEN ${transactions.amount}
              ELSE 0
            END
          ),
          0
        )
      `,

      totalInvoices: sql<number>`
        COUNT(${transactions.id})
      `,

      paidInvoices: sql<number>`
        COUNT(
          CASE
            WHEN ${transactions.status} = 'SUCCESSFUL'
            THEN 1
          END
        )
      `,
    })
    .from(transactions)
    .innerJoin(bookings, eq(transactions.bookingId, bookings.id))
    .innerJoin(attractions, eq(bookings.attractionId, attractions.id))
    .where(whereClause);

  // ==================================================
  // TOTAL COUNT
  // ==================================================

  const [countResult] = await db
    .select({
      total: sql<number>`
        COUNT(${transactions.id})
      `,
    })
    .from(transactions)
    .innerJoin(bookings, eq(transactions.bookingId, bookings.id))
    .innerJoin(attractions, eq(bookings.attractionId, attractions.id))
    .where(whereClause);

  const total = Number(countResult?.total || 0);

  // ==================================================
  // INVOICE LIST
  // ==================================================

  const rows = await db
    .select({
      id: transactions.id,

      bookingId: transactions.bookingId,

      invoiceNumber: transactions.invoiceNumber,

      customerName: bookings.customerName,

      dateTime: transactions.createdAt,

      visitAt: bookings.visitAt,

      attractionId: attractions.id,

      attractionName: attractions.name,

      amount: transactions.amount,

      paymentMode: transactions.paymentMode,

      status: transactions.status,
    })
    .from(transactions)
    .innerJoin(bookings, eq(transactions.bookingId, bookings.id))
    .innerJoin(attractions, eq(bookings.attractionId, attractions.id))
    .where(whereClause)
    .orderBy(desc(transactions.createdAt))
    .limit(limit)
    .offset(offset);

  // ==================================================
  // VISITOR COUNTS
  // ==================================================

  const bookingIds = rows.map((row) => row.bookingId);

  const visitorCounts =
    bookingIds.length > 0
      ? await db
          .select({
            bookingId: bookingItems.bookingId,

            totalVisitors: sql<number>`
              COALESCE(
                SUM(${bookingItems.quantity}),
                0
              )
            `,
          })
          .from(bookingItems)
          .where(inArray(bookingItems.bookingId, bookingIds))
          .groupBy(bookingItems.bookingId)
      : [];

  const visitorMap = new Map(
    visitorCounts.map((item) => [item.bookingId, Number(item.totalVisitors)]),
  );

  // ==================================================
  // FORMAT RESPONSE
  // ==================================================

  const items = rows.map((invoice, index) => ({
    sNo: offset + index + 1,

    id: invoice.id,

    invoiceNumber: invoice.invoiceNumber,

    customerName: invoice.customerName,

    dateTime: invoice.dateTime,

    visitAt: invoice.visitAt,

    attraction: {
      id: invoice.attractionId,

      name: invoice.attractionName,
    },

    visitors: visitorMap.get(invoice.bookingId) || 0,

    amount: Number(invoice.amount),

    paymentMode: invoice.paymentMode,

    status: invoice.status,
  }));

  // ==================================================
  // FINAL RESPONSE
  // ==================================================

  return {
    summary: {
      totalRevenue: Number(summary?.totalRevenue || 0),

      totalInvoices: Number(summary?.totalInvoices || 0),

      paidInvoices: Number(summary?.paidInvoices || 0),
    },

    items,

    pagination: {
      page,

      limit,

      total,

      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
}

/* =========================================================
   GET INVOICE BY ID
========================================================= */

/* =========================================================
   GET INVOICE BY ID
========================================================= */

export async function getInvoiceById(invoiceId: string, adminId: string) {
  // --------------------------------------------------
  // GET INVOICE + BOOKING + CUSTOMER + ATTRACTION
  // --------------------------------------------------

  const [invoice] = await db
    .select({
      id: transactions.id,

      // IMPORTANT:
      // invoiceId from invoice_number, NOT transactions.id
      invoiceId: transactions.invoiceNumber,

      amount: transactions.amount,

      paymentMode: transactions.paymentMode,

      status: transactions.status,

      createdAt: transactions.createdAt,

      updatedAt: transactions.updatedAt,

      // Booking
      bookingId: bookings.id,

      bookingNumber: bookings.bookingNumber,

      customerName: bookings.customerName,

      mobileNumber: bookings.mobileNumber,

      gstNumber: bookings.gstNumber,

      visitAt: bookings.visitAt,

      // Attraction
      attractionId: attractions.id,

      attractionName: attractions.name,
    })
    .from(transactions)
    .innerJoin(bookings, eq(transactions.bookingId, bookings.id))
    .innerJoin(attractions, eq(bookings.attractionId, attractions.id))
    .where(
      and(
        // IMPORTANT:
        // URL is /invoices/INV-2026-1001
        // so search invoice_number
        eq(transactions.invoiceNumber, invoiceId),

        isNull(transactions.deletedAt),

        isNull(bookings.deletedAt),

        eq(attractions.adminId, adminId),
      ),
    )
    .limit(1);

  // --------------------------------------------------
  // NOT FOUND
  // --------------------------------------------------

  if (!invoice) {
    return null;
  }

  // ==================================================
  // GET TICKETS
  // ==================================================

  const ticketRows = await db
    .select({
      id: bookingItems.id,

      category: bookingItems.category,

      quantity: bookingItems.quantity,

      unitPrice: bookingItems.unitPrice,

      totalPrice: bookingItems.totalPrice,
    })
    .from(bookingItems)
    .where(eq(bookingItems.bookingId, invoice.bookingId));

  // ==================================================
  // TOTAL VISITORS
  // ==================================================

  const totalVisitors = ticketRows.reduce(
    (total, item) => total + Number(item.quantity || 0),
    0,
  );

  // ==================================================
  // TICKET SUMMARY
  // ==================================================

  const tickets = ticketRows.map((item) => ({
    id: item.id,

    category: item.category,

    quantity: Number(item.quantity),

    unitPrice: Number(item.unitPrice),

    total: Number(item.totalPrice),
  }));

  // ==================================================
  // CALCULATE SUMMARY
  // ==================================================

  const subtotal = tickets.reduce((total, ticket) => total + ticket.total, 0);

  // ==================================================
  // RESPONSE
  // ==================================================

  return {
    invoiceId: invoice.invoiceId,

    generatedAt: invoice.createdAt,

    customer: {
      name: invoice.customerName,

      mobileNumber: invoice.mobileNumber,

      gstn: invoice.gstNumber,
    },

    booking: {
      id: invoice.bookingId,

      bookingId: invoice.bookingNumber,

      attraction: {
        id: invoice.attractionId,

        name: invoice.attractionName,
      },

      visitDate: invoice.visitAt,

      paymentMode: invoice.paymentMode,
    },

    tickets,

    summary: {
      totalVisitors,

      subtotal,

      discount: 0,

      grandTotal: Number(invoice.amount),
    },
  };
}

export async function generateInvoiceNumber(userId: string): Promise<string> {
  const [user] = await db
    .select({
      invoicePrefix: users.invoiceNumberForUsersInitialPart,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  if (!user.invoicePrefix) {
    throw new Error("INVOICE_PREFIX_NOT_CONFIGURED");
  }

  const [lastTransaction] = await db
    .select({
      invoiceNumber: transactions.invoiceNumber,
    })
    .from(transactions)
    .where(isNotNull(transactions.invoiceNumber))
    .orderBy(desc(transactions.createdAt))
    .limit(1);

  let nextNumber = 1;

  if (lastTransaction?.invoiceNumber) {
    const match = lastTransaction.invoiceNumber.match(/(\d+)$/);

    if (match) {
      nextNumber = Number(match[1]) + 1;
    }
  }

  return `${user.invoicePrefix}${String(nextNumber).padStart(5, "0")}`;
}
