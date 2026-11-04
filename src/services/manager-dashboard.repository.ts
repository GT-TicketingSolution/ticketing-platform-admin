import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  users,
  bookings,
  staffRoles,
  staffAttractionAssignments,
  managerAttractionPermissions,
  attractionManagement,
  attractionsAgainstBooking,
  categoryOfAttractionAgainstBooking,
} from "@/db/schema";

export async function getManagerDashboardRepository(managerId: string) {
  // =====================================================
  // 1. Attractions assigned to this manager
  // =====================================================

  const assignedAttractions = await db
    .select({
      attractionId: managerAttractionPermissions.attractionId,
    })
    .from(managerAttractionPermissions)
    .where(eq(managerAttractionPermissions.managerId, managerId));

  const attractionIds = assignedAttractions.map((item) => item.attractionId);

  // Totals depend on the attraction only, so past numbers stay the same when
  // staff are moved, removed or deleted.
  const bookingScope = and(
    inArray(attractionManagement.attractionId, attractionIds),
    eq(bookings.isDeleted, false),
    eq(bookings.status, "CONFIRMED"),
  );

  // =====================================================
  // 2. Staff working on those attractions
  // =====================================================

  const staffData = await db
    .selectDistinct({
      id: users.id,
      name: users.name,
      status: users.status,
    })
    .from(users)
    .innerJoin(
      staffAttractionAssignments,
      eq(staffAttractionAssignments.staffId, users.id),
    )
    .where(
      and(
        eq(users.role, "STAFF"),
        eq(users.isDeleted, false),
        inArray(staffAttractionAssignments.attractionId, attractionIds),
      ),
    )
    .orderBy(users.name);

  const roleRows = await db
    .select({
      staffId: staffRoles.staffId,
      role: staffRoles.role,
    })
    .from(staffRoles)
    .where(
      inArray(
        staffRoles.staffId,
        staffData.map((item) => item.id),
      ),
    );

  const roleMap = new Map<string, Set<string>>();

  for (const { staffId, role } of roleRows) {
    // Older rows store the timing in the name, e.g. "Reports Access (24h)".
    const name = role.replace(/\s*\(\d+\s*h\)$/i, "");

    roleMap.set(staffId, (roleMap.get(staffId) ?? new Set()).add(name));
  }

  // =====================================================
  // 3. Tickets on those attractions, per booking creator
  // =====================================================

  const ticketRows = await db
    .select({
      staffId: bookings.createdBy,
      tickets: sql<number>`coalesce(sum(${categoryOfAttractionAgainstBooking.noOfVisitors}), 0)::int`,
    })
    .from(categoryOfAttractionAgainstBooking)
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
    .innerJoin(bookings, eq(attractionsAgainstBooking.bookingId, bookings.id))
    .where(bookingScope)
    .groupBy(bookings.createdBy);

  const ticketMap = new Map(
    ticketRows.map((item) => [item.staffId, Number(item.tickets ?? 0)]),
  );

  const totalTicketsProcessed = ticketRows.reduce(
    (total, item) => total + Number(item.tickets ?? 0),
    0,
  );

  // =====================================================
  // 4. Revenue on those attractions
  // =====================================================

  const [revenue] = await db
    .select({
      amount: sql<string>`coalesce(sum(${attractionsAgainstBooking.attractionTotalAmount}), 0)`,
    })
    .from(attractionsAgainstBooking)
    .innerJoin(
      attractionManagement,
      eq(
        attractionsAgainstBooking.attractionManagementId,
        attractionManagement.id,
      ),
    )
    .innerJoin(bookings, eq(attractionsAgainstBooking.bookingId, bookings.id))
    .where(bookingScope);

  // =====================================================
  // 5. Build dashboard staff data
  // =====================================================

  const staff = staffData.map((item) => ({
    id: item.id,

    name: item.name,

    role: [...(roleMap.get(item.id) ?? ["STAFF"])],

    ticketsIssued: ticketMap.get(item.id) ?? 0,

    status: item.status === "ACTIVE" ? "Active" : "Inactive",
  }));

  // =====================================================
  // 6. Return dashboard data
  // =====================================================

  return {
    totalStaff: staff.length,

    activeStaff: staff.filter((item) => item.status === "Active").length,

    totalTicketsProcessed,

    estimatedRevenue: Number(revenue?.amount ?? 0),

    staff,
  };
}
