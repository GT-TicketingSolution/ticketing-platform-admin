import { and, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm";

import { db } from "@/db";

import { transactions, bookings } from "@/db/schema";

import { requireAuth } from "@/lib/auth/require-auth";
import { success, failure } from "@/lib/api/response";

export async function GET(request: Request) {
  try {
    // ---------------------------------------------
    // Authentication
    // ---------------------------------------------

    const auth = await requireAuth(request);

    if (auth.user.role !== "ADMIN") {
      return failure("Admin access required.", 403, "FORBIDDEN");
    }

    // ---------------------------------------------
    // Query params
    // ---------------------------------------------

    const { searchParams } = new URL(request.url);

    const page = Math.max(Number(searchParams.get("page") || "1"), 1);

    const limit = Math.min(
      Math.max(Number(searchParams.get("limit") || "10"), 1),
      100,
    );

    const search = searchParams.get("search")?.trim() || "";
    const paymentMode = searchParams.get("paymentMode")?.trim() || "";
    const status = searchParams.get("status")?.trim() || "";

    const fromDate = searchParams.get("fromDate")?.trim() || "";
    const toDate = searchParams.get("toDate")?.trim() || "";

    const offset = (page - 1) * limit;

    // ---------------------------------------------
    // Conditions
    // ---------------------------------------------

    const conditions = [
      // Transaction must not be soft deleted
      sql`${transactions.deletedAt} IS NULL`,
    ];

    // ---------------------------------------------
    // Search
    // ---------------------------------------------

    if (search) {
      conditions.push(
        or(
          ilike(transactions.transactionNumber, `%${search}%`),
          ilike(bookings.bookingNumber, `%${search}%`),
          ilike(bookings.customerName, `%${search}%`),
        )!,
      );
    }

    // ---------------------------------------------
    // Payment mode
    // ---------------------------------------------

    if (paymentMode && paymentMode !== "ALL") {
      conditions.push(
        eq(
          transactions.paymentMode,
          paymentMode as (typeof transactions.paymentMode.enumValues)[number],
        ),
      );
    }

    // ---------------------------------------------
    // Transaction status
    // ---------------------------------------------

    if (status && status !== "ALL") {
      conditions.push(
        eq(
          transactions.status,
          status as (typeof transactions.status.enumValues)[number],
        ),
      );
    }

    // ---------------------------------------------
    // From date
    // ---------------------------------------------

    if (fromDate) {
      const startDate = new Date(`${fromDate}T00:00:00.000Z`);

      conditions.push(gte(transactions.createdAt, startDate));
    }

    // ---------------------------------------------
    // To date
    // ---------------------------------------------

    if (toDate) {
      const endDate = new Date(`${toDate}T23:59:59.999Z`);

      conditions.push(lte(transactions.createdAt, endDate));
    }

    // ---------------------------------------------
    // Get total count
    // ---------------------------------------------

    const [{ count }] = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(transactions)
      .innerJoin(bookings, eq(transactions.bookingId, bookings.id))
      .where(and(...conditions));

    const total = Number(count);

    // ---------------------------------------------
    // Get transactions
    // ---------------------------------------------

    const items = await db
      .select({
        id: transactions.id,

        transactionId: transactions.transactionNumber,

        customerName: bookings.customerName,

        bookingId: bookings.bookingNumber,

        amount: transactions.amount,

        paymentMode: transactions.paymentMode,

        status: transactions.status,

        createdAt: transactions.createdAt,

        updatedAt: transactions.updatedAt,
      })
      .from(transactions)
      .innerJoin(bookings, eq(transactions.bookingId, bookings.id))
      .where(and(...conditions))
      .orderBy(desc(transactions.createdAt))
      .limit(limit)
      .offset(offset);

    // ---------------------------------------------
    // Response
    // ---------------------------------------------

    return success({
      items: items.map((transaction) => ({
        id: transaction.id,

        transactionId: transaction.transactionId,

        customerName: transaction.customerName,

        transactionDate: transaction.createdAt,

        bookingId: transaction.bookingId,

        amount: Number(transaction.amount),

        paymentMode: transaction.paymentMode,

        status: transaction.status,
      })),

      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get transactions error:", error);

    return failure(
      "Unable to fetch transactions.",
      500,
      "INTERNAL_SERVER_ERROR",
    );
  }
}
