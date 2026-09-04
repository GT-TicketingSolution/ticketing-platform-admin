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
  users,
  bookings,
  attractions,
  attractionManagement,
  attractionsAgainstBooking,
  managerAttractionPermissions,
  staffAttractionAssignments,
} from "@/db/schema";

import { requireAuth } from "@/lib/auth/require-auth";
import { success, failure } from "@/lib/api/response";
import { requireModuleAccess } from "@/lib/auth/authorization";

/* =========================================================
   DATE RANGE
========================================================= */

function getDateRange(period: string, dateFrom?: string, dateTo?: string) {
  const now = new Date();

  // -------------------------------------------------------
  // Custom
  // -------------------------------------------------------

  if (period === "custom") {
    const from = dateFrom ? new Date(`${dateFrom}T00:00:00.000Z`) : null;

    const to = dateTo ? new Date(`${dateTo}T23:59:59.999Z`) : null;

    return { from, to };
  }

  // -------------------------------------------------------
  // Today
  // -------------------------------------------------------

  if (period === "today") {
    const from = new Date(now);
    from.setHours(0, 0, 0, 0);

    const to = new Date(now);
    to.setHours(23, 59, 59, 999);

    return {
      from,
      to,
    };
  }

  // -------------------------------------------------------
  // Week
  // -------------------------------------------------------

  if (period === "week") {
    const from = new Date(now);

    from.setDate(now.getDate() - 6);
    from.setHours(0, 0, 0, 0);

    return {
      from,
      to: now,
    };
  }

  // -------------------------------------------------------
  // Month
  // -------------------------------------------------------

  if (period === "month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);

    from.setHours(0, 0, 0, 0);

    return {
      from,
      to: now,
    };
  }

  // -------------------------------------------------------
  // Year
  // -------------------------------------------------------

  if (period === "year") {
    const from = new Date(now.getFullYear(), 0, 1);

    from.setHours(0, 0, 0, 0);

    return {
      from,
      to: now,
    };
  }

  // -------------------------------------------------------
  // All
  // -------------------------------------------------------

  return {
    from: null,
    to: null,
  };
}

/* =========================================================
   GET /api/admin/dashboard
========================================================= */

export async function GET(request: Request) {
  try {
    // =====================================================
    // AUTHENTICATION
    // =====================================================

    const auth = await requireAuth(request);

    await requireModuleAccess(auth, "DASHBOARD");

    // =====================================================
    // TENANT BOUNDARY
    // =====================================================

    const adminId =
      auth.user.role === "ADMIN" ? auth.user.id : auth.user.adminId;

    if (!adminId) {
      return failure(
        "Admin ownership could not be determined.",
        403,
        "ADMIN_CONTEXT_REQUIRED",
      );
    }

    const isAdmin = auth.user.role === "ADMIN";
    const isManager = auth.user.role === "MANAGER";

    // =====================================================
    // QUERY PARAMS
    // =====================================================

    const { searchParams } = new URL(request.url);

    const period = searchParams.get("period") || "all";

    const attractionId = searchParams.get("attractionId") || "";

    const search = searchParams.get("search")?.trim() || "";

    const dateFrom = searchParams.get("dateFrom") || "";

    const dateTo = searchParams.get("dateTo") || "";

    const { from, to } = getDateRange(period, dateFrom, dateTo);

    // =====================================================
    // GET ACCESSIBLE ATTRACTIONS
    // =====================================================

    let attractionList: {
      id: string;
      name: string;
    }[] = [];

    if (isAdmin) {
      // ---------------------------------------------------
      // ADMIN
      // ---------------------------------------------------

      attractionList = await db
        .select({
          id: attractions.id,
          name: attractions.name,
        })
        .from(attractions)
        .where(
          and(
            eq(attractions.adminId, adminId),
            eq(attractions.status, "ACTIVE"),
          ),
        )
        .orderBy(attractions.name);
    } else {
      // ---------------------------------------------------
      // MANAGER
      // ---------------------------------------------------

      attractionList = await db
        .select({
          id: attractions.id,
          name: attractions.name,
        })
        .from(managerAttractionPermissions)
        .innerJoin(
          attractions,
          and(
            eq(managerAttractionPermissions.attractionId, attractions.id),
            eq(attractions.adminId, adminId),
          ),
        )
        .where(
          and(
            eq(managerAttractionPermissions.managerId, auth.user.id),
            eq(attractions.status, "ACTIVE"),
          ),
        )
        .orderBy(attractions.name);
    }

    // =====================================================
    // VALIDATE ATTRACTION FILTER
    // =====================================================

    if (attractionId) {
      const hasAccess = attractionList.some(
        (attraction) => attraction.id === attractionId,
      );

      if (!hasAccess) {
        return failure("Attraction not found.", 404, "ATTRACTION_NOT_FOUND");
      }
    }

    // =====================================================
    // ACCESSIBLE ATTRACTION IDS
    // =====================================================

    const accessibleAttractionIds = attractionList.map(
      (attraction) => attraction.id,
    );

    // =====================================================
    // MANAGER WITH NO ATTRACTIONS
    // =====================================================

    if (isManager && accessibleAttractionIds.length === 0) {
      return success({
        summary: {
          totalManagers: 0,
          activeManagers: 0,
          totalStaff: 0,
          activeStaff: 0,
          totalBookings: 0,
          totalEarnings: 0,
        },

        filters: {
          attractions: [],
        },

        performance: {
          revenue: [],
          bookings: [],
        },

        attractionDistribution: [],

        recentManagers: {
          items: [],
          total: 0,
        },

        appliedFilters: {
          period,
          attractionId: attractionId || null,
          search: search || null,
          dateFrom: dateFrom || null,
          dateTo: dateTo || null,
        },
      });
    }

    // =====================================================
    // ACCESSIBLE ATTRACTION CONDITION
    //
    // New relationship:
    //
    // bookings
    //   -> attractionsAgainstBooking
    //   -> attractionManagement
    //   -> attractions
    // =====================================================

    const accessibleAttractionCondition =
      accessibleAttractionIds.length > 0
        ? inArray(attractions.id, accessibleAttractionIds)
        : sql`false`;

    // =====================================================
    // MANAGER CONDITIONS
    // =====================================================

    const managerConditions = [
      eq(users.role, "MANAGER"),
      eq(users.adminId, adminId),
    ];

    if (search) {
      managerConditions.push(
        or(
          ilike(users.name, `%${search}%`),
          ilike(users.email, `%${search}%`),
          ilike(users.phone, `%${search}%`),
        )!,
      );
    }

    // =====================================================
    // MANAGER COUNT
    // =====================================================

    const [managerCount] = await db
      .select({
        count: sql<number>`
          count(distinct ${users.id})
        `,
      })
      .from(users)
      .leftJoin(
        managerAttractionPermissions,
        eq(managerAttractionPermissions.managerId, users.id),
      )
      .leftJoin(
        attractions,
        and(
          eq(managerAttractionPermissions.attractionId, attractions.id),
          eq(attractions.adminId, adminId),
        ),
      )
      .where(
        and(
          ...managerConditions,

          ...(isManager
            ? [
                inArray(
                  managerAttractionPermissions.attractionId,
                  accessibleAttractionIds,
                ),
              ]
            : []),

          ...(attractionId
            ? [eq(managerAttractionPermissions.attractionId, attractionId)]
            : []),
        ),
      );

    // =====================================================
    // ACTIVE MANAGER COUNT
    // =====================================================

    const [activeManagerCount] = await db
      .select({
        count: sql<number>`
          count(distinct ${users.id})
        `,
      })
      .from(users)
      .leftJoin(
        managerAttractionPermissions,
        eq(managerAttractionPermissions.managerId, users.id),
      )
      .leftJoin(
        attractions,
        and(
          eq(managerAttractionPermissions.attractionId, attractions.id),
          eq(attractions.adminId, adminId),
        ),
      )
      .where(
        and(
          eq(users.role, "MANAGER"),
          eq(users.status, "ACTIVE"),
          eq(users.adminId, adminId),

          ...(isManager
            ? [
                inArray(
                  managerAttractionPermissions.attractionId,
                  accessibleAttractionIds,
                ),
              ]
            : []),

          ...(attractionId
            ? [eq(managerAttractionPermissions.attractionId, attractionId)]
            : []),
        ),
      );

    // =====================================================
    // STAFF CONDITIONS
    // =====================================================

    const staffConditions = [
      eq(users.role, "STAFF"),
      eq(users.adminId, adminId),
    ];

    if (search) {
      staffConditions.push(
        or(
          ilike(users.name, `%${search}%`),
          ilike(users.email, `%${search}%`),
          ilike(users.phone, `%${search}%`),
        )!,
      );
    }

    // =====================================================
    // STAFF COUNT
    // =====================================================

    const [staffCount] = await db
      .select({
        count: sql<number>`
          count(distinct ${users.id})
        `,
      })
      .from(users)
      .leftJoin(
        staffAttractionAssignments,
        eq(staffAttractionAssignments.staffId, users.id),
      )
      .leftJoin(
        attractions,
        and(
          eq(staffAttractionAssignments.attractionId, attractions.id),
          eq(attractions.adminId, adminId),
        ),
      )
      .where(
        and(
          ...staffConditions,

          ...(isManager
            ? [
                inArray(
                  staffAttractionAssignments.attractionId,
                  accessibleAttractionIds,
                ),
              ]
            : []),

          ...(attractionId
            ? [eq(staffAttractionAssignments.attractionId, attractionId)]
            : []),
        ),
      );

    // =====================================================
    // ACTIVE STAFF COUNT
    // =====================================================

    const [activeStaffCount] = await db
      .select({
        count: sql<number>`
          count(distinct ${users.id})
        `,
      })
      .from(users)
      .leftJoin(
        staffAttractionAssignments,
        eq(staffAttractionAssignments.staffId, users.id),
      )
      .leftJoin(
        attractions,
        and(
          eq(staffAttractionAssignments.attractionId, attractions.id),
          eq(attractions.adminId, adminId),
        ),
      )
      .where(
        and(
          eq(users.role, "STAFF"),
          eq(users.status, "ACTIVE"),
          eq(users.adminId, adminId),

          ...(isManager
            ? [
                inArray(
                  staffAttractionAssignments.attractionId,
                  accessibleAttractionIds,
                ),
              ]
            : []),

          ...(attractionId
            ? [eq(staffAttractionAssignments.attractionId, attractionId)]
            : []),
        ),
      );

    // =====================================================
    // BOOKING CONDITIONS
    //
    // Booking -> AttractionAgainstBooking
    //          -> AttractionManagement
    //          -> Attractions
    // =====================================================

    const bookingConditions = [
      isNull(bookings.deletedAt),
      eq(attractions.adminId, adminId),
    ];

    // -----------------------------------------------------
    // MANAGER ACCESS
    // -----------------------------------------------------

    if (isManager) {
      bookingConditions.push(accessibleAttractionCondition);
    }

    // -----------------------------------------------------
    // ATTRACTION FILTER
    // -----------------------------------------------------

    if (attractionId) {
      bookingConditions.push(eq(attractions.id, attractionId));
    }

    // -----------------------------------------------------
    // DATE FILTER
    //
    // NEW:
    // bookings.createdAt
    // -----------------------------------------------------

    if (from) {
      bookingConditions.push(gte(bookings.createdAt, from));
    }

    if (to) {
      bookingConditions.push(lte(bookings.createdAt, to));
    }

    // =====================================================
    // TOTAL BOOKINGS
    //
    // One booking can have multiple attraction rows.
    //
    // Therefore:
    // COUNT(DISTINCT bookings.id)
    // =====================================================

    const [bookingCount] = await db
      .select({
        count: sql<number>`
          count(distinct ${bookings.id})
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
      .where(and(...bookingConditions));

    // =====================================================
    // REVENUE CONDITIONS
    // =====================================================

    const revenueConditions = [
      isNull(bookings.deletedAt),
      eq(attractions.adminId, adminId),
    ];

    // -----------------------------------------------------
    // MANAGER ACCESS
    // -----------------------------------------------------

    if (isManager) {
      revenueConditions.push(accessibleAttractionCondition);
    }

    // -----------------------------------------------------
    // ATTRACTION FILTER
    // -----------------------------------------------------

    if (attractionId) {
      revenueConditions.push(eq(attractions.id, attractionId));
    }

    // -----------------------------------------------------
    // DATE FILTER
    //
    // Revenue is associated with the booking date.
    // -----------------------------------------------------

    if (from) {
      revenueConditions.push(gte(bookings.createdAt, from));
    }

    if (to) {
      revenueConditions.push(lte(bookings.createdAt, to));
    }

    // =====================================================
    // TOTAL EARNINGS
    //
    // IMPORTANT:
    //
    // Revenue now comes directly from:
    //
    // attractionsAgainstBooking.attractionTotalAmount
    //
    // No transactions join.
    // No SUM(DISTINCT amount).
    // =====================================================

    const [earnings] = await db
      .select({
        total: sql<string>`
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
      .where(and(...revenueConditions));

    // =====================================================
    // PERFORMANCE - REVENUE
    //
    // Group by booking creation month.
    // =====================================================

    const revenueRows = await db
      .select({
        month: sql<number>`
          EXTRACT(
            MONTH FROM ${bookings.createdAt}
          )
        `,

        revenue: sql<string>`
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
      .where(and(...revenueConditions))
      .groupBy(
        sql`
          EXTRACT(
            MONTH FROM ${bookings.createdAt}
          )
        `,
      )
      .orderBy(
        sql`
          EXTRACT(
            MONTH FROM ${bookings.createdAt}
          )
        `,
      );

    // =====================================================
    // PERFORMANCE - BOOKINGS
    // =====================================================

    const bookingRows = await db
      .select({
        month: sql<number>`
          EXTRACT(
            MONTH FROM ${bookings.createdAt}
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
      .where(and(...bookingConditions))
      .groupBy(
        sql`
          EXTRACT(
            MONTH FROM ${bookings.createdAt}
          )
        `,
      )
      .orderBy(
        sql`
          EXTRACT(
            MONTH FROM ${bookings.createdAt}
          )
        `,
      );

    // =====================================================
    // MONTH NAMES
    // =====================================================

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

    // =====================================================
    // ATTRACTION DISTRIBUTION
    //
    // One row in attractionsAgainstBooking represents
    // the amount belonging to one attraction management.
    //
    // Therefore:
    //
    // SUM(attractionTotalAmount)
    // grouped by attractions.id
    // =====================================================

    const distributionRows = await db
      .select({
        attractionId: attractions.id,

        attractionName: attractions.name,

        revenue: sql<string>`
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
        and(
          eq(attractionManagement.attractionId, attractions.id),
          eq(attractions.adminId, adminId),
        ),
      )
      .where(and(...revenueConditions))
      .groupBy(attractions.id, attractions.name)
      .orderBy(
        desc(
          sql`
            COALESCE(
              SUM(
                ${attractionsAgainstBooking.attractionTotalAmount}
              ),
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

    // =====================================================
    // RECENT MANAGERS
    // =====================================================

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
        and(
          eq(managerAttractionPermissions.attractionId, attractions.id),
          eq(attractions.adminId, adminId),
        ),
      )
      .where(
        and(
          eq(users.role, "MANAGER"),
          eq(users.adminId, adminId),

          ...(isManager
            ? [
                inArray(
                  managerAttractionPermissions.attractionId,
                  accessibleAttractionIds,
                ),
              ]
            : []),

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

    // =====================================================
    // GROUP MANAGERS
    // =====================================================

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
        const manager = managerMap.get(row.id)!;

        const alreadyExists = manager.attractions.some(
          (attraction) => attraction.id === row.attractionId,
        );

        if (!alreadyExists) {
          manager.attractions.push({
            id: row.attractionId,

            name: row.attractionName,
          });
        }
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

        status: manager.status,
      }));

    // =====================================================
    // RESPONSE
    // =====================================================

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
      },

      // appliedFilters: {
      //   period,

      //   attractionId: attractionId || null,

      //   search: search || null,

      //   dateFrom: dateFrom || null,

      //   dateTo: dateTo || null,
      // },

      // viewer: {
      //   role: auth.user.role,

      //   adminId,
      // },
    });
  } catch (error) {
    if (error instanceof Error) {
      // ---------------------------------------------------
      // Authentication
      // ---------------------------------------------------

      if (error.message === "UNAUTHORIZED") {
        return failure("Authentication required.", 401, "UNAUTHORIZED");
      }

      // ---------------------------------------------------
      // Account status
      // ---------------------------------------------------

      if (error.message === "ACCOUNT_NOT_ACTIVE") {
        return failure("Account is not active.", 403, "ACCOUNT_NOT_ACTIVE");
      }

      // ---------------------------------------------------
      // Module authorization
      // ---------------------------------------------------

      if (
        error.message === "MODULE_ACCESS_DENIED" ||
        error.message === "FORBIDDEN"
      ) {
        return failure(
          "You do not have permission to access the dashboard module.",
          403,
          "MODULE_ACCESS_DENIED",
        );
      }

      // ---------------------------------------------------
      // Admin / tenant context
      // ---------------------------------------------------

      if (error.message === "ADMIN_CONTEXT_REQUIRED") {
        return failure(
          "Admin ownership could not be determined.",
          403,
          "ADMIN_CONTEXT_REQUIRED",
        );
      }
    }

    console.error("Dashboard error:", error);

    return failure("Unable to fetch dashboard.", 500, "INTERNAL_SERVER_ERROR");
  }
}
