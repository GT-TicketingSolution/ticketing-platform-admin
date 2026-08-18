import { and, count, eq } from "drizzle-orm";

import { db } from "@/db";
import { users, bookings } from "@/db/schema";

export async function getManagerDashboardRepository(managerId: string) {
  // =====================================================
  // 1. Get staff belonging to this manager
  // =====================================================

  const staffData = await db
    .select({
      id: users.id,
      name: users.name,
      status: users.status,
    })
    .from(users)
    .where(and(eq(users.managerId, managerId), eq(users.role, "STAFF")));

  // =====================================================
  // 2. Get ticket count for those staff members
  // =====================================================

  const staffTickets = await db
    .select({
      staffId: bookings.createdBy,
      tickets: count(bookings.id),
    })
    .from(bookings)
    .innerJoin(users, eq(bookings.createdBy, users.id))
    .where(and(eq(users.managerId, managerId), eq(users.role, "STAFF")))
    .groupBy(bookings.createdBy);

  // =====================================================
  // 3. Create lookup map
  // =====================================================

  const ticketMap = new Map(
    staffTickets.map((item) => [item.staffId, Number(item.tickets ?? 0)]),
  );

  // =====================================================
  // 4. Build dashboard staff data
  // =====================================================

  const staff = staffData.map((item) => ({
    id: item.id,

    name: item.name,

    role: ["STAFF"],

    ticketsIssued: ticketMap.get(item.id) ?? 0,

    status: item.status === "ACTIVE" ? "Active" : "Inactive",
  }));

  // =====================================================
  // 5. Dashboard statistics
  // =====================================================

  const totalStaff = staff.length;

  const activeStaff = staff.filter((item) => item.status === "Active").length;

  const totalTicketsProcessed = staff.reduce(
    (total, item) => total + item.ticketsIssued,
    0,
  );

  const estimatedRevenue = totalTicketsProcessed * 250;

  // =====================================================
  // 6. Return dashboard data
  // =====================================================

  return {
    totalStaff,

    activeStaff,

    totalTicketsProcessed,

    estimatedRevenue,

    staff: staff.slice(0, 5),
  };
}
