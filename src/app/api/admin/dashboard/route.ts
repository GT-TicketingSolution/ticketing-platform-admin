import { and, desc, eq, gte, ilike, isNull, lte, or, sql } from "drizzle-orm";

import { db } from "@/db";

import {
  users,
  bookings,
  transactions,
  attractions,
  managerAttractionPermissions,
  staffAttractionAssignments,
} from "@/db/schema";

import { requireAuth } from "@/lib/auth/require-auth";
import { success, failure } from "@/lib/api/response";

function getDateRange(period: string, dateFrom?: string, dateTo?: string) {
  const now = new Date();

  // ---------------------------------------------
  // Custom
  // ---------------------------------------------

  if (period === "custom") {
    const from = dateFrom ? new Date(`${dateFrom}T00:00:00.000Z`) : null;

    const to = dateTo ? new Date(`${dateTo}T23:59:59.999Z`) : null;

    return { from, to };
  }

  // ---------------------------------------------
  // Today
  // ---------------------------------------------

  if (period === "today") {
    const from = new Date(now);

    from.setHours(0, 0, 0, 0);

    const to = new Date(now);

    to.setHours(23, 59, 59, 999);

    return { from, to };
  }

  // ---------------------------------------------
  // Week
  // ---------------------------------------------

  if (period === "week") {
    const from = new Date(now);

    from.setDate(now.getDate() - 6);
    from.setHours(0, 0, 0, 0);

    return {
      from,
      to: now,
    };
  }

  // ---------------------------------------------
  // Month
  // ---------------------------------------------

  if (period === "month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);

    return {
      from,
      to: now,
    };
  }

  // ---------------------------------------------
  // Year
  // ---------------------------------------------

  if (period === "year") {
    const from = new Date(now.getFullYear(), 0, 1);

    return {
      from,
      to: now,
    };
  }

  // ---------------------------------------------
  // All
  // ---------------------------------------------

  return {
    from: null,
    to: null,
  };
}

export async function GET(request: Request) {
  try {
    // =================================================
    // AUTHENTICATION
    // =================================================

    const auth = await requireAuth(request);

    if (auth.user.role !== "ADMIN") {
      return failure("Admin access required.", 403, "FORBIDDEN");
    }

    // =================================================
    // QUERY PARAMS
    // =================================================

    const { searchParams } = new URL(request.url);

    const period = searchParams.get("period") || "all";

    const attractionId = searchParams.get("attractionId") || "";

    const search = searchParams.get("search")?.trim() || "";

    const dateFrom = searchParams.get("dateFrom") || "";

    const dateTo = searchParams.get("dateTo") || "";

    const { from, to } = getDateRange(period, dateFrom, dateTo);

    // =================================================
    // ATTRACTIONS
    // =================================================

    const attractionList = await db
      .select({
        id: attractions.id,
        name: attractions.name,
      })
      .from(attractions)
      .where(eq(attractions.status, "ACTIVE"))
      .orderBy(attractions.name);

    // =================================================
    // MANAGER FILTER
    // =================================================

    const managerConditions = [eq(users.role, "MANAGER")];

    if (search) {
      managerConditions.push(
        or(
          ilike(users.name, `%${search}%`),
          ilike(users.email, `%${search}%`),
          ilike(users.phone, `%${search}%`),
        )!,
      );
    }

    // =================================================
    // MANAGER COUNT
    // =================================================

    let managerCountQuery = db
      .select({
        count: sql<number>`count(distinct ${users.id})`,
      })
      .from(users)
      .leftJoin(
        managerAttractionPermissions,
        eq(managerAttractionPermissions.managerId, users.id),
      )
      .where(
        and(
          ...managerConditions,
          ...(attractionId
            ? [eq(managerAttractionPermissions.attractionId, attractionId)]
            : []),
        ),
      );

    const [managerCount] = await managerCountQuery;

    // =================================================
    // ACTIVE MANAGER COUNT
    // =================================================

    const [activeManagerCount] = await db
      .select({
        count: sql<number>`count(distinct ${users.id})`,
      })
      .from(users)
      .leftJoin(
        managerAttractionPermissions,
        eq(managerAttractionPermissions.managerId, users.id),
      )
      .where(
        and(
          eq(users.role, "MANAGER"),
          eq(users.status, "ACTIVE"),
          ...(attractionId
            ? [eq(managerAttractionPermissions.attractionId, attractionId)]
            : []),
        ),
      );

    // =================================================
    // STAFF COUNT
    // =================================================

    const staffConditions = [eq(users.role, "STAFF")];

    if (search) {
      staffConditions.push(
        or(
          ilike(users.name, `%${search}%`),
          ilike(users.email, `%${search}%`),
          ilike(users.phone, `%${search}%`),
        )!,
      );
    }

    const [staffCount] = await db
      .select({
        count: sql<number>`count(distinct ${users.id})`,
      })
      .from(users)
      .leftJoin(
        staffAttractionAssignments,
        eq(staffAttractionAssignments.staffId, users.id),
      )
      .where(
        and(
          ...staffConditions,
          ...(attractionId
            ? [eq(staffAttractionAssignments.attractionId, attractionId)]
            : []),
        ),
      );

    // =================================================
    // ACTIVE STAFF COUNT
    // =================================================

    const [activeStaffCount] = await db
      .select({
        count: sql<number>`count(distinct ${users.id})`,
      })
      .from(users)
      .leftJoin(
        staffAttractionAssignments,
        eq(staffAttractionAssignments.staffId, users.id),
      )
      .where(
        and(
          eq(users.role, "STAFF"),
          eq(users.status, "ACTIVE"),
          ...(attractionId
            ? [eq(staffAttractionAssignments.attractionId, attractionId)]
            : []),
        ),
      );

    // =================================================
    // BOOKING CONDITIONS
    // =================================================

    const bookingConditions = [isNull(bookings.deletedAt)];

    if (attractionId) {
      bookingConditions.push(eq(bookings.attractionId, attractionId));
    }

    if (from) {
      bookingConditions.push(gte(bookings.visitAt, from));
    }

    if (to) {
      bookingConditions.push(lte(bookings.visitAt, to));
    }

    // =================================================
    // TOTAL BOOKINGS
    // =================================================

    const [bookingCount] = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(bookings)
      .where(and(...bookingConditions));

    // =================================================
    // TRANSACTION CONDITIONS
    // =================================================

    const transactionConditions = [
      isNull(transactions.deletedAt),
      eq(transactions.status, "SUCCESSFUL"),
    ];

    if (attractionId) {
      transactionConditions.push(eq(bookings.attractionId, attractionId));
    }

    if (from) {
      transactionConditions.push(gte(transactions.createdAt, from));
    }

    if (to) {
      transactionConditions.push(lte(transactions.createdAt, to));
    }

    // =================================================
    // TOTAL EARNINGS
    // =================================================

    const [earnings] = await db
      .select({
        total: sql<string>`
            COALESCE(
              SUM(${transactions.amount}),
              0
            )
          `,
      })
      .from(transactions)
      .innerJoin(bookings, eq(transactions.bookingId, bookings.id))
      .where(and(...transactionConditions, isNull(bookings.deletedAt)));

    // =================================================
    // PERFORMANCE - REVENUE
    // =================================================

    const revenueRows = await db
      .select({
        month: sql<number>`
            EXTRACT(
              MONTH FROM ${transactions.createdAt}
            )
          `,

        revenue: sql<string>`
            COALESCE(
              SUM(${transactions.amount}),
              0
            )
          `,
      })
      .from(transactions)
      .innerJoin(bookings, eq(transactions.bookingId, bookings.id))
      .where(and(...transactionConditions, isNull(bookings.deletedAt)))
      .groupBy(
        sql`
            EXTRACT(
              MONTH FROM ${transactions.createdAt}
            )
          `,
      )
      .orderBy(
        sql`
            EXTRACT(
              MONTH FROM ${transactions.createdAt}
            )
          `,
      );

    // =================================================
    // PERFORMANCE - BOOKINGS
    // =================================================

    const bookingRows = await db
      .select({
        month: sql<number>`
            EXTRACT(
              MONTH FROM ${bookings.visitAt}
            )
          `,

        bookings: sql<number>`
            COUNT(*)
          `,
      })
      .from(bookings)
      .where(and(...bookingConditions))
      .groupBy(
        sql`
            EXTRACT(
              MONTH FROM ${bookings.visitAt}
            )
          `,
      )
      .orderBy(
        sql`
            EXTRACT(
              MONTH FROM ${bookings.visitAt}
            )
          `,
      );

    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const performance = {
      revenue: revenueRows.map((row) => ({
        month: monthNames[Number(row.month) - 1],

        value: Number(row.revenue),
      })),

      bookings: bookingRows.map((row) => ({
        month: monthNames[Number(row.month) - 1],

        value: Number(row.bookings),
      })),
    };

    // =================================================
    // ATTRACTION DISTRIBUTION
    // =================================================

    const distributionRows = await db
      .select({
        attractionId: attractions.id,

        attractionName: attractions.name,

        revenue: sql<string>`
            COALESCE(
              SUM(${transactions.amount}),
              0
            )
          `,
      })
      .from(transactions)
      .innerJoin(bookings, eq(transactions.bookingId, bookings.id))
      .innerJoin(attractions, eq(bookings.attractionId, attractions.id))
      .where(and(...transactionConditions, isNull(bookings.deletedAt)))
      .groupBy(attractions.id, attractions.name)
      .orderBy(
        desc(
          sql`
              COALESCE(
                SUM(${transactions.amount}),
                0
              )
            `,
        ),
      );

    const totalRevenue = distributionRows.reduce(
      (sum, row) => sum + Number(row.revenue),
      0,
    );

    const attractionDistribution = distributionRows.map((row) => ({
      attractionId: row.attractionId,

      attractionName: row.attractionName,

      revenue: Number(row.revenue),

      percentage:
        totalRevenue === 0
          ? 0
          : Number(((Number(row.revenue) / totalRevenue) * 100).toFixed(1)),
    }));

    // =================================================
    // RECENT MANAGERS
    // =================================================

    const managerRows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        status: users.status,
        joinedDate: users.createdAt,

        attractionId: managerAttractionPermissions.attractionId,

        attractionName: attractions.name,
      })
      .from(users)
      .leftJoin(
        managerAttractionPermissions,
        eq(managerAttractionPermissions.managerId, users.id),
      )
      .leftJoin(
        attractions,
        eq(managerAttractionPermissions.attractionId, attractions.id),
      )
      .where(
        and(
          eq(users.role, "MANAGER"),

          ...(attractionId
            ? [eq(managerAttractionPermissions.attractionId, attractionId)]
            : []),

          ...(search
            ? [
                or(
                  ilike(users.name, `%${search}%`),
                  ilike(users.email, `%${search}%`),
                  ilike(users.phone, `%${search}%`),
                  ilike(attractions.name, `%${search}%`),
                )!,
              ]
            : []),
        ),
      )
      .orderBy(desc(users.createdAt));

    // =================================================
    // GROUP MANAGERS
    // =================================================

    const managerMap = new Map<
      string,
      {
        id: string;
        name: string;
        email: string;
        mobile: string | null;
        status: string;
        joinedDate: Date;
        attractions: {
          id: string;
          name: string;
        }[];
      }
    >();

    for (const row of managerRows) {
      if (!managerMap.has(row.id)) {
        managerMap.set(row.id, {
          id: row.id,
          name: row.name,
          email: row.email,
          mobile: row.phone,
          status: row.status,
          joinedDate: row.joinedDate,
          attractions: [],
        });
      }

      if (row.attractionId && row.attractionName) {
        managerMap.get(row.id)!.attractions.push({
          id: row.attractionId,
          name: row.attractionName,
        });
      }
    }

    const recentManagers = Array.from(managerMap.values())
      .slice(0, 5)
      .map((manager) => ({
        id: manager.id,
        name: manager.name,
        email: manager.email,
        mobile: manager.mobile,

        attraction: manager.attractions[0] ?? null,

        joinedDate: manager.joinedDate,

        // IMPORTANT:
        // bookings currently do not have
        // managerId/processedBy.
        totalBookings: 0,

        status: manager.status,
      }));

    // =================================================
    // RESPONSE
    // =================================================

    return success({
      summary: {
        totalManagers: Number(managerCount?.count ?? 0),

        activeManagers: Number(activeManagerCount?.count ?? 0),

        totalStaff: Number(staffCount?.count ?? 0),

        activeStaff: Number(activeStaffCount?.count ?? 0),

        totalBookings: Number(bookingCount?.count ?? 0),

        totalEarnings: Number(earnings?.total ?? 0),
      },

      filters: {
        attractions: attractionList,
      },

      performance,

      attractionDistribution,

      recentManagers: {
        items: recentManagers,
        total: Number(managerCount?.count ?? 0),
      },

      appliedFilters: {
        period,
        attractionId: attractionId || null,
        search: search || null,
        dateFrom: dateFrom || null,
        dateTo: dateTo || null,
      },
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);

    return failure(
      "Unable to fetch admin dashboard.",
      500,
      "INTERNAL_SERVER_ERROR",
    );
  }
}
