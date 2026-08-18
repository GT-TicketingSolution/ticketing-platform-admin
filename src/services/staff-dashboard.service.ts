import { and, desc, eq, gte, lt, sql } from "drizzle-orm";

import { db } from "@/db";
import { bookings } from "@/db/schema";

export async function getStaffDashboardService(staffId: string) {
  const now = new Date();

  // Start of today
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  // Start of tomorrow
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

  // Today's bookings created by this staff member
  const [stats] = await db
    .select({
      ticketsIssuedToday: sql<number>`
        count(*)::int
      `,

      ticketsPendingScan: sql<number>`
        count(*) filter (
          where ${bookings.status} = 'PENDING'
        )::int
      `,

      revenue: sql<number>`
        coalesce(sum(${bookings.amountPaid}), 0)::numeric
      `,
    })
    .from(bookings)
    .where(
      and(
        eq(bookings.createdBy, staffId),

        gte(bookings.createdAt, startOfToday),

        lt(bookings.createdAt, startOfTomorrow),

        eq(bookings.isDeleted, false),
      ),
    );

  // Recent 5 bookings created by this staff member
  const recentTickets = await db
    .select({
      id: bookings.id,

      bookingNumber: bookings.bookingNumber,

      visitor: bookings.customerName,

      amount: bookings.amountPaid,

      time: bookings.createdAt,

      status: bookings.status,
    })
    .from(bookings)
    .where(
      and(
        eq(bookings.createdBy, staffId),

        eq(bookings.isDeleted, false),
      ),
    )
    .orderBy(desc(bookings.createdAt))
    .limit(5);

  return {
    ticketsIssuedToday: Number(stats?.ticketsIssuedToday ?? 0),

    ticketsPendingScan: Number(stats?.ticketsPendingScan ?? 0),

    // Cannot accurately calculate validated tickets
    // until the database has validation information.
    ticketsValidated: 0,

    revenue: Number(stats?.revenue ?? 0),

    recentTickets: recentTickets.map((ticket) => ({
      id: ticket.bookingNumber,

      visitor: ticket.visitor,

      // Your current bookings table does not have ticket type.
      type: "Ticket",

      amount: Number(ticket.amount),

      time: ticket.time,

      status:
        ticket.status === "CONFIRMED"
          ? "Confirmed"
          : ticket.status === "PENDING"
            ? "Pending Scan"
            : "Cancelled",
    })),
  };
}
