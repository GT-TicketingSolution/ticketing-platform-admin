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
// import { transactions, bookings, bookingItems, attractions } from "@/db/schema";

// type InvoiceFilters = {
//   page?: number;
//   limit?: number;
//   search?: string;
//   paymentMode?: string;
//   dateFrom?: string;
//   dateTo?: string;
// };

// function buildDateRange(dateFrom?: string, dateTo?: string) {
//   const conditions = [];

//   if (dateFrom) {
//     conditions.push(
//       gte(transactions.createdAt, new Date(`${dateFrom}T00:00:00.000Z`)),
//     );
//   }

//   if (dateTo) {
//     conditions.push(
//       lte(transactions.createdAt, new Date(`${dateTo}T23:59:59.999Z`)),
//     );
//   }

//   return conditions;
// }

// /**
//  * GET INVOICES
//  *
//  * Table:
//  * S.No
//  * Invoice ID
//  * Customer Name
//  * Date & Time
//  * Attraction
//  * Visitors
//  * Amount
//  * Payment Mode
//  * Actions
//  */
// export async function getInvoices(filters: InvoiceFilters) {
//   // --------------------------------------------------
//   // PAGINATION
//   // --------------------------------------------------

//   const page = Math.max(Number(filters.page) || 1, 1);

//   const limit = Math.min(Math.max(Number(filters.limit) || 10, 1), 100);

//   const offset = (page - 1) * limit;

//   // --------------------------------------------------
//   // FILTER CONDITIONS
//   // --------------------------------------------------

//   const conditions = [
//     // Soft-deleted transactions are excluded
//     isNull(transactions.deletedAt),

//     // Soft-deleted bookings are excluded
//     isNull(bookings.deletedAt),
//   ];

//   // --------------------------------------------------
//   // SEARCH
//   // --------------------------------------------------

//   if (filters.search?.trim()) {
//     const search = `%${filters.search.trim()}%`;

//     conditions.push(
//       or(
//         ilike(transactions.invoiceNumber, search),
//         ilike(transactions.transactionNumber, search),
//         ilike(bookings.customerName, search),
//         ilike(attractions.name, search),
//       )!,
//     );
//   }

//   // --------------------------------------------------
//   // PAYMENT MODE FILTER
//   // --------------------------------------------------

//   if (filters.paymentMode && filters.paymentMode !== "ALL") {
//     conditions.push(eq(transactions.paymentMode, filters.paymentMode as any));
//   }

//   // --------------------------------------------------
//   // DATE FILTER
//   // --------------------------------------------------

//   conditions.push(...buildDateRange(filters.dateFrom, filters.dateTo));

//   const whereClause = and(...conditions);

//   // --------------------------------------------------
//   // SUMMARY
//   // --------------------------------------------------

//   const [summary] = await db
//     .select({
//       // Only successful transactions contribute to revenue
//       totalRevenue: sql<string>`
//         COALESCE(
//           SUM(
//             CASE
//               WHEN ${transactions.status} = 'SUCCESSFUL'
//               THEN ${transactions.amount}
//               ELSE 0
//             END
//           ),
//           0
//         )
//       `,

//       totalInvoices: sql<number>`
//         COUNT(${transactions.id})
//       `,

//       paidInvoices: sql<number>`
//         COUNT(
//           CASE
//             WHEN ${transactions.status} = 'SUCCESSFUL'
//             THEN 1
//           END
//         )
//       `,
//     })
//     .from(transactions)
//     .innerJoin(bookings, eq(transactions.bookingId, bookings.id))
//     .innerJoin(attractions, eq(bookings.attractionId, attractions.id))
//     .where(whereClause);

//   // --------------------------------------------------
//   // TOTAL COUNT
//   // --------------------------------------------------

//   const [countResult] = await db
//     .select({
//       total: sql<number>`
//         COUNT(${transactions.id})
//       `,
//     })
//     .from(transactions)
//     .innerJoin(bookings, eq(transactions.bookingId, bookings.id))
//     .innerJoin(attractions, eq(bookings.attractionId, attractions.id))
//     .where(whereClause);

//   const total = Number(countResult?.total || 0);

//   // --------------------------------------------------
//   // INVOICE LIST
//   // --------------------------------------------------

//   const rows = await db
//     .select({
//       id: transactions.id,

//       bookingId: transactions.bookingId,

//       invoiceId: transactions.invoiceNumber,

//       transactionNumber: transactions.transactionNumber,

//       customerName: bookings.customerName,

//       // Transaction/invoice creation date
//       dateTime: transactions.createdAt,

//       // Actual booking visit date/time
//       visitAt: bookings.visitAt,

//       attractionId: attractions.id,

//       attractionName: attractions.name,

//       amount: transactions.amount,

//       paymentMode: transactions.paymentMode,

//       status: transactions.status,
//     })
//     .from(transactions)
//     .innerJoin(bookings, eq(transactions.bookingId, bookings.id))
//     .innerJoin(attractions, eq(bookings.attractionId, attractions.id))
//     .where(whereClause)
//     .orderBy(desc(transactions.createdAt))
//     .limit(limit)
//     .offset(offset);

//   // --------------------------------------------------
//   // VISITOR COUNTS
//   // --------------------------------------------------

//   const bookingIds = rows.map((row) => row.bookingId);

//   const visitorCounts =
//     bookingIds.length > 0
//       ? await db
//           .select({
//             bookingId: bookingItems.bookingId,

//             totalVisitors: sql<number>`
//               COALESCE(
//                 SUM(${bookingItems.quantity}),
//                 0
//               )
//             `,
//           })
//           .from(bookingItems)
//           .where(inArray(bookingItems.bookingId, bookingIds))
//           .groupBy(bookingItems.bookingId)
//       : [];

//   const visitorMap = new Map(
//     visitorCounts.map((item) => [item.bookingId, Number(item.totalVisitors)]),
//   );

//   // --------------------------------------------------
//   // FORMAT RESPONSE
//   // --------------------------------------------------

//   const items = rows.map((invoice, index) => ({
//     sNo: offset + index + 1,

//     id: invoice.id,

//     invoiceId: invoice.invoiceId || invoice.transactionNumber,

//     customerName: invoice.customerName,

//     dateTime: invoice.dateTime,

//     visitAt: invoice.visitAt,

//     attraction: {
//       id: invoice.attractionId,
//       name: invoice.attractionName,
//     },

//     visitors: visitorMap.get(invoice.bookingId) || 0,

//     amount: Number(invoice.amount),

//     paymentMode: invoice.paymentMode,

//     status: invoice.status,
//   }));

//   // --------------------------------------------------
//   // FINAL RESPONSE
//   // --------------------------------------------------

//   return {
//     summary: {
//       totalRevenue: Number(summary?.totalRevenue || 0),

//       totalInvoices: Number(summary?.totalInvoices || 0),

//       paidInvoices: Number(summary?.paidInvoices || 0),
//     },

//     items,

//     pagination: {
//       page,

//       limit,

//       total,

//       totalPages: total === 0 ? 0 : Math.ceil(total / limit),
//     },
//   };
// }

// export async function getInvoiceById(invoiceId: string) {
//   // --------------------------------------------------
//   // INVOICE
//   // --------------------------------------------------

//   const [invoice] = await db
//     .select({
//       id: transactions.id,

//       invoiceId: transactions.invoiceNumber,

//       transactionNumber: transactions.transactionNumber,

//       amount: transactions.amount,

//       paymentMode: transactions.paymentMode,

//       status: transactions.status,

//       createdAt: transactions.createdAt,

//       updatedAt: transactions.updatedAt,

//       bookingId: bookings.id,

//       bookingNumber: bookings.bookingNumber,

//       customerName: bookings.customerName,

//       mobileNumber: bookings.mobileNumber,

//       visitAt: bookings.visitAt,

//       attractionId: attractions.id,

//       attractionName: attractions.name,
//     })
//     .from(transactions)
//     .innerJoin(bookings, eq(transactions.bookingId, bookings.id))
//     .innerJoin(attractions, eq(bookings.attractionId, attractions.id))
//     .where(
//       and(
//         eq(transactions.id, invoiceId),

//         // Soft delete
//         isNull(transactions.deletedAt),
//         isNull(bookings.deletedAt),
//       ),
//     )
//     .limit(1);

//   if (!invoice) {
//     return null;
//   }

//   // --------------------------------------------------
//   // VISITORS
//   // --------------------------------------------------

//   const visitorItems = await db
//     .select({
//       id: bookingItems.id,

//       quantity: bookingItems.quantity,
//     })
//     .from(bookingItems)
//     .where(eq(bookingItems.bookingId, invoice.bookingId));

//   const totalVisitors = visitorItems.reduce(
//     (total, item) => total + Number(item.quantity || 0),
//     0,
//   );

//   // --------------------------------------------------
//   // RESPONSE
//   // --------------------------------------------------

//   return {
//     id: invoice.id,

//     invoiceId: invoice.invoiceId || invoice.transactionNumber,

//     transactionId: invoice.transactionNumber,

//     customer: {
//       name: invoice.customerName,
//       mobile: invoice.mobileNumber,
//     },

//     booking: {
//       id: invoice.bookingId,
//       bookingId: invoice.bookingNumber,
//       visitAt: invoice.visitAt,
//     },

//     attraction: {
//       id: invoice.attractionId,
//       name: invoice.attractionName,
//     },

//     visitors: {
//       total: totalVisitors,
//     },

//     payment: {
//       mode: invoice.paymentMode,
//       amount: Number(invoice.amount),
//       status: invoice.status,
//     },

//     createdAt: invoice.createdAt,

//     updatedAt: invoice.updatedAt,
//   };
// }
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
} from "drizzle-orm";

import { db } from "@/db";
import { transactions, bookings, bookingItems, attractions } from "@/db/schema";

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

        ilike(transactions.transactionNumber, search),

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

      invoiceId: transactions.invoiceNumber,

      transactionNumber: transactions.transactionNumber,

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

    invoiceId: invoice.invoiceId || invoice.transactionNumber,

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

export async function getInvoiceById(invoiceId: string, adminId: string) {
  // --------------------------------------------------
  // INVOICE
  // --------------------------------------------------

  const [invoice] = await db
    .select({
      id: transactions.id,

      invoiceId: transactions.invoiceNumber,

      transactionNumber: transactions.transactionNumber,

      amount: transactions.amount,

      paymentMode: transactions.paymentMode,

      status: transactions.status,

      createdAt: transactions.createdAt,

      updatedAt: transactions.updatedAt,

      bookingId: bookings.id,

      bookingNumber: bookings.bookingNumber,

      customerName: bookings.customerName,

      mobileNumber: bookings.mobileNumber,

      visitAt: bookings.visitAt,

      attractionId: attractions.id,

      attractionName: attractions.name,
    })
    .from(transactions)
    .innerJoin(bookings, eq(transactions.bookingId, bookings.id))
    .innerJoin(attractions, eq(bookings.attractionId, attractions.id))
    .where(
      and(
        // Requested invoice
        eq(transactions.id, invoiceId),

        // Soft deletes
        isNull(transactions.deletedAt),

        isNull(bookings.deletedAt),

        // CRITICAL TENANT CHECK
        eq(attractions.adminId, adminId),
      ),
    )
    .limit(1);

  // --------------------------------------------------
  // NOT FOUND
  //
  // This also intentionally covers:
  // - invoice doesn't exist
  // - invoice was deleted
  // - invoice belongs to another admin
  // --------------------------------------------------

  if (!invoice) {
    return null;
  }

  // ==================================================
  // VISITORS
  // ==================================================

  const visitorItems = await db
    .select({
      id: bookingItems.id,

      quantity: bookingItems.quantity,
    })
    .from(bookingItems)
    .where(eq(bookingItems.bookingId, invoice.bookingId));

  const totalVisitors = visitorItems.reduce(
    (total, item) => total + Number(item.quantity || 0),
    0,
  );

  // ==================================================
  // RESPONSE
  // ==================================================

  return {
    id: invoice.id,

    invoiceId: invoice.invoiceId || invoice.transactionNumber,

    transactionId: invoice.transactionNumber,

    customer: {
      name: invoice.customerName,

      mobile: invoice.mobileNumber,
    },

    booking: {
      id: invoice.bookingId,

      bookingId: invoice.bookingNumber,

      visitAt: invoice.visitAt,
    },

    attraction: {
      id: invoice.attractionId,

      name: invoice.attractionName,
    },

    visitors: {
      total: totalVisitors,
    },

    payment: {
      mode: invoice.paymentMode,

      amount: Number(invoice.amount),

      status: invoice.status,
    },

    createdAt: invoice.createdAt,

    updatedAt: invoice.updatedAt,
  };
}
