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
} from "drizzle-orm";

import { db } from "@/db";

import {
  transactions,
  bookings,
  attractions,
  bookingItems,
  managerAttractionPermissions,
} from "@/db/schema";

import { requireAuth } from "@/lib/auth/require-auth";
import { success, failure } from "@/lib/api/response";
import { requireModuleAccess } from "@/lib/auth/authorization";

export async function GET(request: NextRequest) {
  try {
    // =====================================================
    // AUTHENTICATION
    // =====================================================

    const auth = await requireAuth(request);

    await requireModuleAccess(auth, "INVOICES");

    // =====================================================
    // TENANT
    // =====================================================

    const adminId =
      auth.user.role === "ADMIN" ? auth.user.id : auth.user.adminId;

    if (!adminId) {
      return failure("Admin context not found.", 403, "ADMIN_CONTEXT_REQUIRED");
    }

    // =====================================================
    // QUERY PARAMS
    // =====================================================

    const { searchParams } = new URL(request.url);

    const page = Math.max(Number(searchParams.get("page")) || 1, 1);

    const limit = Math.min(
      Math.max(Number(searchParams.get("limit")) || 10, 1),
      100,
    );

    const offset = (page - 1) * limit;

    const search = searchParams.get("search")?.trim() || "";

    const paymentMode = searchParams.get("paymentMode")?.trim().toUpperCase();

    const dateFrom = searchParams.get("dateFrom")?.trim();

    const dateTo = searchParams.get("dateTo")?.trim();

    // =====================================================
    // ACCESSIBLE ATTRACTIONS
    // =====================================================

    let accessibleAttractionIds: string[] = [];

    // -----------------------------------------------------
    // ADMIN
    // -----------------------------------------------------

    if (auth.user.role === "ADMIN") {
      const adminAttractions = await db
        .select({
          id: attractions.id,
        })
        .from(attractions)
        .where(
          and(
            eq(attractions.adminId, adminId),
            eq(attractions.status, "ACTIVE"),
          ),
        );

      accessibleAttractionIds = adminAttractions.map((item) => item.id);
    }

    // -----------------------------------------------------
    // MANAGER
    // -----------------------------------------------------
    else if (auth.user.role === "MANAGER") {
      const managerAttractions = await db
        .select({
          attractionId: managerAttractionPermissions.attractionId,
        })
        .from(managerAttractionPermissions)
        .innerJoin(
          attractions,
          eq(managerAttractionPermissions.attractionId, attractions.id),
        )
        .where(
          and(
            eq(managerAttractionPermissions.managerId, auth.user.id),
            eq(attractions.adminId, adminId),
            eq(attractions.status, "ACTIVE"),
          ),
        );

      accessibleAttractionIds = managerAttractions.map(
        (item) => item.attractionId,
      );
    }

    // -----------------------------------------------------
    // STAFF
    // -----------------------------------------------------
    // Keep the same behavior as your existing route:
    // staff can access active attractions under their admin.
    // -----------------------------------------------------
    else {
      const staffAttractions = await db
        .select({
          id: attractions.id,
        })
        .from(attractions)
        .where(
          and(
            eq(attractions.adminId, adminId),
            eq(attractions.status, "ACTIVE"),
          ),
        );

      accessibleAttractionIds = staffAttractions.map((item) => item.id);
    }

    // =====================================================
    // NO ACCESS
    // =====================================================

    if (accessibleAttractionIds.length === 0) {
      return success({
        summary: {
          totalRevenue: 0,
          totalInvoices: 0,
          paidInvoices: 0,
        },

        items: [],

        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      });
    }

    // =====================================================
    // BASE CONDITIONS
    // =====================================================

    const conditions = [
      // Transaction not deleted
      isNull(transactions.deletedAt),

      // Booking not deleted
      isNull(bookings.deletedAt),

      // Booking soft-delete flag
      eq(bookings.isDeleted, false),

      // ---------------------------------------------------
      // TENANT ISOLATION
      //
      // bookings.attractionId = uuid[]
      //
      // attractions.id = uuid
      //
      // Therefore we MUST use ANY().
      // ---------------------------------------------------

      sql`EXISTS (
        SELECT 1
        FROM ${attractions}
        WHERE
          ${attractions.id} = ANY(${bookings.attractionId})
          AND ${attractions.adminId} = ${adminId}
      )`,

      // ---------------------------------------------------
      // USER ATTRACTION ACCESS
      // ---------------------------------------------------

      sql`EXISTS (
        SELECT 1
        FROM ${attractions}
        WHERE
          ${attractions.id} = ANY(${bookings.attractionId})
          AND ${inArray(attractions.id, accessibleAttractionIds)}
      )`,
    ];

    // =====================================================
    // SEARCH
    // =====================================================

    if (search) {
      const searchValue = `%${search}%`;

      conditions.push(
        or(
          ilike(transactions.invoiceNumber, searchValue),

          ilike(bookings.bookingNumber, searchValue),

          ilike(bookings.customerName, searchValue),

          ilike(bookings.mobileNumber, searchValue),

          // Search attraction name
          sql`EXISTS (
            SELECT 1
            FROM ${attractions}
            WHERE
              ${attractions.id} = ANY(${bookings.attractionId})
              AND ${attractions.name} ILIKE ${searchValue}
          )`,
        )!,
      );
    }

    // =====================================================
    // PAYMENT MODE
    // =====================================================

    if (paymentMode && paymentMode !== "ALL") {
      if (
        paymentMode !== "CASH" &&
        paymentMode !== "UPI" &&
        paymentMode !== "CARD" &&
        paymentMode !== "ONLINE"
      ) {
        return failure("Invalid payment mode.", 400, "INVALID_PAYMENT_MODE");
      }

      conditions.push(
        eq(
          transactions.paymentMode,
          paymentMode as "CASH" | "UPI" | "CARD" | "ONLINE",
        ),
      );
    }

    // =====================================================
    // DATE FROM
    // =====================================================

    if (dateFrom) {
      const startDate = new Date(`${dateFrom}T00:00:00.000Z`);

      if (Number.isNaN(startDate.getTime())) {
        return failure("Invalid dateFrom.", 400, "INVALID_DATE_FROM");
      }

      conditions.push(gte(transactions.createdAt, startDate));
    }

    // =====================================================
    // DATE TO
    // =====================================================

    if (dateTo) {
      const endDate = new Date(`${dateTo}T23:59:59.999Z`);

      if (Number.isNaN(endDate.getTime())) {
        return failure("Invalid dateTo.", 400, "INVALID_DATE_TO");
      }

      conditions.push(lte(transactions.createdAt, endDate));
    }

    // =====================================================
    // ATTRACTION FILTER
    // =====================================================

    const attractionFilter = searchParams.get("attractionId")?.trim();

    if (attractionFilter) {
      conditions.push(
        sql`${attractionFilter}::uuid = ANY(${bookings.attractionId})`,
      );
    }

    const whereClause = and(...conditions);

    // =====================================================
    // TOTAL INVOICES
    // =====================================================

    const [countResult] = await db
      .select({
        count: sql<number>`COUNT(DISTINCT ${transactions.id})`,
      })
      .from(transactions)
      .innerJoin(bookings, eq(transactions.bookingId, bookings.id))
      .where(whereClause);

    const totalInvoices = Number(countResult?.count || 0);

    // =====================================================
    // TOTAL REVENUE
    // =====================================================

    const [revenueResult] = await db
      .select({
        totalRevenue: sql<string>`
          COALESCE(
            SUM(${transactions.amount}),
            0
          )
        `,
      })
      .from(transactions)
      .innerJoin(bookings, eq(transactions.bookingId, bookings.id))
      .where(and(...conditions, eq(transactions.status, "SUCCESSFUL")));

    const totalRevenue = Number(revenueResult?.totalRevenue || 0);

    // =====================================================
    // PAID INVOICES
    // =====================================================

    const [paidResult] = await db
      .select({
        count: sql<number>`COUNT(DISTINCT ${transactions.id})`,
      })
      .from(transactions)
      .innerJoin(bookings, eq(transactions.bookingId, bookings.id))
      .where(and(...conditions, eq(transactions.status, "SUCCESSFUL")));

    const paidInvoices = Number(paidResult?.count || 0);

    // =====================================================
    // INVOICE LIST
    // =====================================================

    const invoiceRows = await db
      .select({
        // Transaction UUID
        id: transactions.id,

        // Invoice number
        invoiceNumber: transactions.invoiceNumber,

        // Booking UUID
        bookingUuid: bookings.id,

        // Booking number
        bookingId: bookings.bookingNumber,

        customerName: bookings.customerName,

        mobileNumber: bookings.mobileNumber,

        gstNumber: bookings.gstNumber,

        dateTime: transactions.createdAt,

        visitAt: bookings.visitAt,

        // IMPORTANT:
        // This is uuid[]
        attractionIds: bookings.attractionId,

        amount: transactions.amount,

        paymentMode: transactions.paymentMode,

        status: transactions.status,
      })
      .from(transactions)
      .innerJoin(bookings, eq(transactions.bookingId, bookings.id))
      .where(whereClause)
      .orderBy(desc(transactions.createdAt))
      .limit(limit)
      .offset(offset);

    // =====================================================
    // GET ALL ATTRACTION IDS
    // =====================================================

    const allAttractionIds = Array.from(
      new Set(invoiceRows.flatMap((row) => row.attractionIds || [])),
    );

    // =====================================================
    // FETCH ATTRACTION DETAILS
    // =====================================================

    const attractionRows =
      allAttractionIds.length > 0
        ? await db
            .select({
              id: attractions.id,
              name: attractions.name,
            })
            .from(attractions)
            .where(
              and(
                inArray(attractions.id, allAttractionIds),
                eq(attractions.adminId, adminId),
              ),
            )
        : [];

    // =====================================================
    // CREATE ATTRACTION MAP
    // =====================================================

    const attractionMap = new Map(
      attractionRows.map((attraction) => [attraction.id, attraction]),
    );

    // =====================================================
    // BOOKING ITEMS
    // =====================================================

    const bookingIds = invoiceRows.map((row) => row.bookingUuid);

    const itemRows =
      bookingIds.length > 0
        ? await db
            .select({
              bookingId: bookingItems.bookingId,

              category: bookingItems.category,

              quantity: bookingItems.quantity,

              unitPrice: bookingItems.unitPrice,

              totalPrice: bookingItems.totalPrice,
            })
            .from(bookingItems)
            .where(inArray(bookingItems.bookingId, bookingIds))
        : [];

    // =====================================================
    // GROUP VISITORS
    // =====================================================

    const visitorMap = new Map<string, Map<string, number>>();

    for (const item of itemRows) {
      if (!visitorMap.has(item.bookingId)) {
        visitorMap.set(item.bookingId, new Map<string, number>());
      }

      const categoryMap = visitorMap.get(item.bookingId)!;

      categoryMap.set(
        item.category,
        (categoryMap.get(item.category) || 0) + Number(item.quantity || 0),
      );
    }

    // =====================================================
    // FORMAT ITEMS
    // =====================================================

    const items = invoiceRows.map((invoice, index) => {
      const categories = visitorMap.get(invoice.bookingUuid);

      const visitors = categories
        ? Array.from(categories.entries())
            .map(([category, quantity]) => `${quantity} ${category}`)
            .join(" + ")
        : "0";

      // Resolve all attractions
      const invoiceAttractions = (invoice.attractionIds || [])
        .map((id) => attractionMap.get(id))
        .filter(
          (
            attraction,
          ): attraction is {
            id: string;
            name: string;
          } => Boolean(attraction),
        );

      return {
        sNo: offset + index + 1,

        // -------------------------------------------------
        // Invoice
        // -------------------------------------------------

        invoiceNumber: invoice.invoiceNumber,

        // -------------------------------------------------
        // Customer
        // -------------------------------------------------

        customerName: invoice.customerName,

        mobileNumber: invoice.mobileNumber,

        gstNumber: invoice.gstNumber,

        // -------------------------------------------------
        // Date
        // -------------------------------------------------

        dateTime: invoice.dateTime,

        visitAt: invoice.visitAt,

        // -------------------------------------------------
        // MULTIPLE ATTRACTIONS
        // -------------------------------------------------

        attractionIds: invoice.attractionIds || [],

        attractions: invoiceAttractions,

        // -------------------------------------------------
        // BACKWARD COMPATIBILITY
        //
        // Existing frontend can still use:
        // invoice.attraction
        // -------------------------------------------------

        attraction: invoiceAttractions[0] || null,

        // -------------------------------------------------
        // Visitors
        // -------------------------------------------------

        visitors,

        // -------------------------------------------------
        // Payment
        // -------------------------------------------------

        amount: Number(invoice.amount),

        paymentMode: invoice.paymentMode,

        status: invoice.status,

        // -------------------------------------------------
        // References
        // -------------------------------------------------

        bookingId: invoice.bookingId,
      };
    });

    // =====================================================
    // RESPONSE
    // =====================================================

    return success({
      summary: {
        totalRevenue,

        totalInvoices,

        paidInvoices,
      },

      items,

      pagination: {
        page,

        limit,

        total: totalInvoices,

        totalPages: totalInvoices === 0 ? 0 : Math.ceil(totalInvoices / limit),
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      // =====================================================
      // AUTHENTICATION ERRORS
      // =====================================================

      if (error.message === "UNAUTHORIZED") {
        return failure("Authentication required.", 401, "UNAUTHORIZED");
      }

      if (error.message === "ACCOUNT_NOT_ACTIVE") {
        return failure("Account is not active.", 403, "ACCOUNT_NOT_ACTIVE");
      }

      // =====================================================
      // MODULE AUTHORIZATION
      // =====================================================

      if (
        error.message === "MODULE_ACCESS_DENIED" ||
        error.message === "FORBIDDEN"
      ) {
        return failure(
          "You do not have permission to access the invoices module.",
          403,
          "MODULE_ACCESS_DENIED",
        );
      }

      // =====================================================
      // ADMIN CONTEXT
      // =====================================================

      if (error.message === "ADMIN_CONTEXT_REQUIRED") {
        return failure(
          "Admin context not found.",
          403,
          "ADMIN_CONTEXT_REQUIRED",
        );
      }

      // =====================================================
      // DATABASE / KNOWN ERRORS
      // =====================================================

      if (error.message === "INVALID_PAYMENT_MODE") {
        return failure("Invalid payment mode.", 400, "INVALID_PAYMENT_MODE");
      }

      if (error.message === "INVALID_DATE_FROM") {
        return failure(
          "Invalid dateFrom. Expected format: YYYY-MM-DD.",
          400,
          "INVALID_DATE_FROM",
        );
      }

      if (error.message === "INVALID_DATE_TO") {
        return failure(
          "Invalid dateTo. Expected format: YYYY-MM-DD.",
          400,
          "INVALID_DATE_TO",
        );
      }
    }

    // =====================================================
    // UNKNOWN / INTERNAL ERROR
    // =====================================================

    console.error("Get invoices error:", error);

    return failure("Unable to fetch invoices.", 500, "INTERNAL_SERVER_ERROR");
  }
}
