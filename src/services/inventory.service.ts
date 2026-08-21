import {
  and,
  asc,
  count,
  eq,
  gte,
  ilike,
  inArray,
  lte,
  ne,
  sql,
} from "drizzle-orm";

import { db } from "@/db";

import {
  attractions,
  attractionDailyCapacities,
  attractionInventory,
  attractionInventorySlots,
  bookings,
  bookingItems,
} from "@/db/schema";

/* =========================================================
   TYPES
========================================================= */

export type InventoryFilters = {
  adminId: string;

  page?: number;
  limit?: number;

  search?: string;

  attractionId?: string;

  dateFrom?: string;

  dateTo?: string;
};

type UpsertDailyCapacityInput = {
  adminId: string;

  attractionId: string;

  capacityDate: string;

  totalCapacity: number;
};

type InventoryStatus = "AVAILABLE" | "NEAR_FULL" | "FULL";

/* =========================================================
   HELPERS
========================================================= */

function getInventoryStatus(capacity: number, booked: number): InventoryStatus {
  if (capacity <= 0) {
    return "FULL";
  }

  const available = Math.max(capacity - booked, 0);

  if (available <= 0) {
    return "FULL";
  }

  const utilization = (booked / capacity) * 100;

  if (utilization >= 90) {
    return "NEAR_FULL";
  }

  return "AVAILABLE";
}

function getUtilizationRate(capacity: number, booked: number): number {
  if (capacity <= 0) {
    return 0;
  }

  return Number(((booked / capacity) * 100).toFixed(2));
}

/* =========================================================
   GET INVENTORY
========================================================= */

export async function getInventory(filters: InventoryFilters) {
  /* =======================================================
     VALIDATION
  ======================================================= */

  if (!filters.adminId) {
    throw new Error("Admin ID is required.");
  }

  /* =======================================================
     PAGINATION
  ======================================================= */

  const page = Math.max(Number(filters.page) || 1, 1);

  const limit = Math.min(Math.max(Number(filters.limit) || 10, 1), 100);

  const offset = (page - 1) * limit;

  /* =======================================================
     DATE
  ======================================================= */

  const today = new Date().toISOString().slice(0, 10);

  /* =======================================================
     BASE CONDITIONS
  ======================================================= */

  const conditions = [
    eq(attractions.adminId, filters.adminId),

    eq(attractions.status, "ACTIVE"),
  ];

  /* =======================================================
     ATTRACTION FILTER
  ======================================================= */

  if (filters.attractionId) {
    conditions.push(
      eq(attractionDailyCapacities.attractionId, filters.attractionId),
    );
  }

  /* =======================================================
     SEARCH
  ======================================================= */

  if (filters.search?.trim()) {
    conditions.push(ilike(attractions.name, `%${filters.search.trim()}%`));
  }

  /* =======================================================
     DATE FILTER
  ======================================================= */

  if (filters.dateFrom && filters.dateTo) {
    conditions.push(
      gte(attractionDailyCapacities.capacityDate, filters.dateFrom),
    );

    conditions.push(
      lte(attractionDailyCapacities.capacityDate, filters.dateTo),
    );
  } else if (filters.dateFrom) {
    conditions.push(
      eq(attractionDailyCapacities.capacityDate, filters.dateFrom),
    );
  } else if (filters.dateTo) {
    conditions.push(
      lte(attractionDailyCapacities.capacityDate, filters.dateTo),
    );
  } else {
    conditions.push(eq(attractionDailyCapacities.capacityDate, today));
  }

  const whereClause = and(...conditions);

  /* =======================================================
     TOTAL COUNT
  ======================================================= */

  const [countResult] = await db
    .select({
      total: count(attractionDailyCapacities.id),
    })
    .from(attractionDailyCapacities)
    .innerJoin(
      attractions,
      eq(attractionDailyCapacities.attractionId, attractions.id),
    )
    .where(whereClause);

  const total = Number(countResult?.total || 0);

  /* =======================================================
     DAILY INVENTORY
  ======================================================= */

  const dailyRows = await db
    .select({
      id: attractionDailyCapacities.id,

      attractionId: attractionDailyCapacities.attractionId,

      attractionName: attractions.name,

      capacityDate: attractionDailyCapacities.capacityDate,

      totalCapacity: attractionDailyCapacities.totalCapacity,
    })
    .from(attractionDailyCapacities)
    .innerJoin(
      attractions,
      eq(attractionDailyCapacities.attractionId, attractions.id),
    )
    .where(whereClause)
    .orderBy(asc(attractionDailyCapacities.capacityDate), asc(attractions.name))
    .limit(limit)
    .offset(offset);

  /* =======================================================
     NO DATA
  ======================================================= */

  if (dailyRows.length === 0) {
    return {
      summary: {
        totalDailyCapacity: 0,
        seatsBookedToday: 0,
        seatsAvailable: 0,
        utilizationRate: 0,
        attractionsAtRisk: 0,
      },

      alerts: [],

      items: [],

      pagination: {
        page,
        limit,
        total,
        totalPages: 0,
      },
    };
  }

  /* =======================================================
     DISPLAYED ATTRACTIONS
  ======================================================= */

  const attractionIds = [...new Set(dailyRows.map((row) => row.attractionId))];

  /* =======================================================
     DISPLAYED DATES
  ======================================================= */

  const inventoryDates = [...new Set(dailyRows.map((row) => row.capacityDate))];

  /* =======================================================
     BOOKED TICKETS PER ATTRACTION + DATE
  ======================================================= */

  const bookedRows =
    attractionIds.length > 0 && inventoryDates.length > 0
      ? await db
          .select({
            attractionId: bookings.attractionId,

            visitDate: sql<string>`
              DATE(${bookings.visitAt})
            `,

            booked: sql<number>`
              COALESCE(
                SUM(${bookingItems.quantity}),
                0
              )
            `,
          })
          .from(bookingItems)
          .innerJoin(bookings, eq(bookingItems.bookingId, bookings.id))
          .where(
            and(
              inArray(bookings.attractionId, attractionIds),

              sql`
                DATE(${bookings.visitAt})
                IN (
                  ${sql.join(
                    inventoryDates.map((date) => sql`${date}`),
                    sql`, `,
                  )}
                )
              `,

              ne(bookings.status, "CANCELLED"),

              eq(bookings.isDeleted, false),
            ),
          )
          .groupBy(bookings.attractionId, sql`DATE(${bookings.visitAt})`)
      : [];

  /* =======================================================
     BOOKED MAP
  ======================================================= */

  const bookedMap = new Map<string, number>();

  for (const row of bookedRows) {
    bookedMap.set(
      `${row.attractionId}_${row.visitDate}`,
      Number(row.booked || 0),
    );
  }

  /* =======================================================
     INVENTORY SLOT CAPACITIES
  ======================================================= */

  /*
   * IMPORTANT:
   *
   * attractionDailyCapacities
   * and
   * attractionInventory
   *
   * are different tables.
   *
   * Therefore we match inventory using:
   *
   * attractionId + inventoryDate
   */

  const slotRows =
    attractionIds.length > 0 && inventoryDates.length > 0
      ? await db
          .select({
            inventoryId: attractionInventory.id,

            attractionId: attractionInventory.attractionId,

            inventoryDate: attractionInventory.inventoryDate,

            slotId: attractionInventorySlots.id,

            slotTime: attractionInventorySlots.slotTime,

            capacity: attractionInventorySlots.capacity,
          })
          .from(attractionInventory)
          .innerJoin(
            attractionInventorySlots,
            eq(attractionInventorySlots.inventoryId, attractionInventory.id),
          )
          .innerJoin(
            attractions,
            eq(attractionInventory.attractionId, attractions.id),
          )
          .where(
            and(
              eq(attractions.adminId, filters.adminId),

              eq(attractions.status, "ACTIVE"),

              inArray(attractionInventory.attractionId, attractionIds),

              sql`
                ${attractionInventory.inventoryDate}
                IN (
                  ${sql.join(
                    inventoryDates.map((date) => sql`${date}`),
                    sql`, `,
                  )}
                )
              `,
            ),
          )
          .orderBy(
            asc(attractionInventory.inventoryDate),
            asc(attractionInventorySlots.slotTime),
          )
      : [];

  /* =======================================================
     SLOT IDS
  ======================================================= */

  const slotIds = [...new Set(slotRows.map((slot) => slot.slotId))];

  /* =======================================================
     SLOT BOOKINGS
  ======================================================= */

  /*
   * bookingItems.timeSlotId
   * must correspond to
   * attractionInventorySlots.id
   *
   * bookingItems.quantity
   * is the booked quantity.
   */

  const slotBookedRows =
    slotIds.length > 0
      ? await db
          .select({
            slotId: bookingItems.timeSlotId,

            visitDate: sql<string>`
              DATE(${bookings.visitAt})
            `,

            booked: sql<number>`
              COALESCE(
                SUM(${bookingItems.quantity}),
                0
              )
            `,
          })
          .from(bookingItems)
          .innerJoin(bookings, eq(bookingItems.bookingId, bookings.id))
          .where(
            and(
              inArray(bookingItems.timeSlotId, slotIds),

              sql`
                DATE(${bookings.visitAt})
                IN (
                  ${sql.join(
                    inventoryDates.map((date) => sql`${date}`),
                    sql`, `,
                  )}
                )
              `,

              ne(bookings.status, "CANCELLED"),

              eq(bookings.isDeleted, false),
            ),
          )
          .groupBy(bookingItems.timeSlotId, sql`DATE(${bookings.visitAt})`)
      : [];

  /* =======================================================
     SLOT BOOKED MAP
  ======================================================= */

  const slotBookedMap = new Map<string, number>();

  for (const row of slotBookedRows) {
    if (!row.slotId) {
      continue;
    }

    slotBookedMap.set(
      `${row.slotId}_${row.visitDate}`,
      Number(row.booked || 0),
    );
  }

  /* =======================================================
     GROUP SLOTS
  ======================================================= */

  const slotMap = new Map<string, typeof slotRows>();

  for (const slot of slotRows) {
    const key = `${slot.attractionId}_${slot.inventoryDate}`;

    const existing = slotMap.get(key) || [];

    existing.push(slot);

    slotMap.set(key, existing);
  }

  /* =======================================================
     FORMAT ITEMS
  ======================================================= */

  const items = dailyRows.map((row, index) => {
    const capacity = Number(row.totalCapacity) || 0;

    const booked =
      bookedMap.get(`${row.attractionId}_${row.capacityDate}`) || 0;

    const available = Math.max(capacity - booked, 0);

    const utilizationRate = getUtilizationRate(capacity, booked);

    const status = getInventoryStatus(capacity, booked);

    const key = `${row.attractionId}_${row.capacityDate}`;

    const attractionSlots = slotMap.get(key) || [];

    const slots = attractionSlots.map((slot) => {
      const slotCapacity = Number(slot.capacity) || 0;

      const slotBooked =
        slotBookedMap.get(`${slot.slotId}_${row.capacityDate}`) || 0;

      const slotAvailable = Math.max(slotCapacity - slotBooked, 0);

      return {
        id: slot.slotId,

        time: slot.slotTime,

        capacity: slotCapacity,

        booked: slotBooked,

        available: slotAvailable,

        utilizationRate: getUtilizationRate(slotCapacity, slotBooked),

        status: getInventoryStatus(slotCapacity, slotBooked),

        isActive: true,
      };
    });

    return {
      sNo: offset + index + 1,

      id: row.id,

      attraction: {
        id: row.attractionId,

        name: row.attractionName,
      },

      date: row.capacityDate,

      dailyCapacity: capacity,

      booked,

      available,

      utilizationRate,

      status,

      slots,
    };
  });

  /* =======================================================
     SUMMARY
  ======================================================= */

  const totalDailyCapacity = items.reduce(
    (sum, item) => sum + item.dailyCapacity,
    0,
  );

  const seatsBookedToday = items.reduce((sum, item) => sum + item.booked, 0);

  const seatsAvailable = Math.max(totalDailyCapacity - seatsBookedToday, 0);

  const utilizationRate = getUtilizationRate(
    totalDailyCapacity,
    seatsBookedToday,
  );

  const attractionsAtRisk = items.filter(
    (item) => item.status === "NEAR_FULL" || item.status === "FULL",
  ).length;

  /* =======================================================
     ALERTS
  ======================================================= */

  const alerts: Array<{
    attractionId: string;
    attractionName: string;
    type: InventoryStatus;
    message: string;
  }> = [];

  for (const item of items) {
    const fullSlots = item.slots.filter((slot) => slot.status === "FULL");

    const nearFullSlots = item.slots.filter(
      (slot) => slot.status === "NEAR_FULL",
    );

    /* =====================================================
       ALL SLOTS FULL
    ===================================================== */

    if (item.slots.length > 0 && fullSlots.length === item.slots.length) {
      alerts.push({
        attractionId: item.attraction.id,

        attractionName: item.attraction.name,

        type: "FULL",

        message: `All ${item.slots.length} time slots are fully booked for ${item.date}.`,
      });

      continue;
    }

    /* =====================================================
       FULL SLOTS
    ===================================================== */

    if (fullSlots.length > 0) {
      alerts.push({
        attractionId: item.attraction.id,

        attractionName: item.attraction.name,

        type: "FULL",

        message: `${fullSlots.map((slot) => `${slot.time} slot`).join(" & ")} ${
          fullSlots.length === 1 ? "is" : "are"
        } sold out.`,
      });
    }

    /* =====================================================
       NEAR FULL SLOTS
    ===================================================== */

    for (const slot of nearFullSlots) {
      alerts.push({
        attractionId: item.attraction.id,

        attractionName: item.attraction.name,

        type: "NEAR_FULL",

        message: `${slot.time} has only ${slot.available} seats left.`,
      });
    }

    /* =====================================================
       DAILY CAPACITY NEAR FULL
    ===================================================== */

    if (item.status === "NEAR_FULL") {
      alerts.push({
        attractionId: item.attraction.id,

        attractionName: item.attraction.name,

        type: "NEAR_FULL",

        message: `${item.attraction.name} has only ${item.available} seats available for ${item.date}.`,
      });
    }

    /* =====================================================
       DAILY CAPACITY FULL
    ===================================================== */

    if (item.status === "FULL" && item.slots.length === 0) {
      alerts.push({
        attractionId: item.attraction.id,

        attractionName: item.attraction.name,

        type: "FULL",

        message: `${item.attraction.name} is fully booked for ${item.date}.`,
      });
    }
  }

  /* =======================================================
     RESPONSE
  ======================================================= */

  return {
    summary: {
      totalDailyCapacity,

      seatsBookedToday,

      seatsAvailable,

      utilizationRate,

      attractionsAtRisk,
    },

    alerts,

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
   UPSERT DAILY CAPACITY
========================================================= */

export async function upsertDailyCapacity(input: UpsertDailyCapacityInput) {
  /* =======================================================
     VALIDATION
  ======================================================= */

  if (!input.adminId) {
    throw new Error("Admin ID is required.");
  }

  if (!input.attractionId) {
    throw new Error("Attraction ID is required.");
  }

  if (!input.capacityDate) {
    throw new Error("Capacity date is required.");
  }

  if (!Number.isInteger(input.totalCapacity) || input.totalCapacity < 0) {
    throw new Error("Total capacity must be a non-negative integer.");
  }

  /* =======================================================
     VERIFY ATTRACTION
  ======================================================= */

  const [attraction] = await db
    .select({
      id: attractions.id,

      name: attractions.name,
    })
    .from(attractions)
    .where(
      and(
        eq(attractions.id, input.attractionId),

        eq(attractions.adminId, input.adminId),

        eq(attractions.status, "ACTIVE"),
      ),
    )
    .limit(1);

  if (!attraction) {
    throw new Error("Attraction not found.");
  }

  /* =======================================================
     FIND EXISTING CAPACITY
  ======================================================= */

  const [existing] = await db
    .select({
      id: attractionDailyCapacities.id,
    })
    .from(attractionDailyCapacities)
    .innerJoin(
      attractions,
      eq(attractionDailyCapacities.attractionId, attractions.id),
    )
    .where(
      and(
        eq(attractionDailyCapacities.attractionId, input.attractionId),

        eq(attractionDailyCapacities.capacityDate, input.capacityDate),

        eq(attractions.adminId, input.adminId),
      ),
    )
    .limit(1);

  /* =======================================================
     UPDATE
  ======================================================= */

  if (existing) {
    const [updated] = await db
      .update(attractionDailyCapacities)
      .set({
        totalCapacity: input.totalCapacity,

        updatedAt: new Date(),
      })
      .where(eq(attractionDailyCapacities.id, existing.id))
      .returning();

    return {
      message: "Daily capacity updated successfully.",

      attraction: {
        id: attraction.id,

        name: attraction.name,
      },

      capacityDate: input.capacityDate,

      totalCapacity: Number(updated.totalCapacity),
    };
  }

  /* =======================================================
     CREATE
  ======================================================= */

  const [created] = await db
    .insert(attractionDailyCapacities)
    .values({
      attractionId: input.attractionId,

      capacityDate: input.capacityDate,

      totalCapacity: input.totalCapacity,
    })
    .returning();

  return {
    message: "Daily capacity created successfully.",

    attraction: {
      id: attraction.id,

      name: attraction.name,
    },

    capacityDate: input.capacityDate,

    totalCapacity: Number(created.totalCapacity),
  };
}
