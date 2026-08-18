// import { and, asc, eq, gte, ilike, lte, sql } from "drizzle-orm";

// import { db } from "@/db";
// import {
//   attractions,
//   attractionDailyCapacities,
//   attractionSlotCapacities,
//   attractionTimeSlots,
// } from "@/db/schema";

// export type InventoryFilters = {
//   page?: number;
//   limit?: number;
//   search?: string;
//   attractionId?: string;
//   dateFrom?: string;
//   dateTo?: string;
// };

// type UpsertDailyCapacityInput = {
//   attractionId: string;
//   capacityDate: string;
//   totalCapacity: number;
// };

// export async function getInventory(filters: InventoryFilters = {}) {
//   const page = Math.max(Number(filters.page) || 1, 1);
//   const limit = Math.min(Math.max(Number(filters.limit) || 10, 1), 100);

//   const offset = (page - 1) * limit;

//   const conditions = [];

//   // Attraction filter
//   if (filters.attractionId) {
//     conditions.push(
//       eq(attractionDailyCapacities.attractionId, filters.attractionId),
//     );
//   }

//   // Search attraction name
//   if (filters.search?.trim()) {
//     conditions.push(ilike(attractions.name, `%${filters.search.trim()}%`));
//   }

//   // Date from
//   if (filters.dateFrom) {
//     conditions.push(
//       gte(attractionDailyCapacities.capacityDate, filters.dateFrom),
//     );
//   }

//   // Date to
//   if (filters.dateTo) {
//     conditions.push(
//       lte(attractionDailyCapacities.capacityDate, filters.dateTo),
//     );
//   }

//   const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

//   // --------------------------------------------------
//   // TOTAL
//   // --------------------------------------------------

//   const [countResult] = await db
//     .select({
//       total: sql<number>`COUNT(*)`,
//     })
//     .from(attractionDailyCapacities)
//     .innerJoin(
//       attractions,
//       eq(attractionDailyCapacities.attractionId, attractions.id),
//     )
//     .where(whereClause);

//   const total = Number(countResult?.total || 0);

//   // --------------------------------------------------
//   // DAILY INVENTORY
//   // --------------------------------------------------

//   const dailyRows = await db
//     .select({
//       id: attractionDailyCapacities.id,

//       attractionId: attractions.id,

//       attractionName: attractions.name,

//       capacityDate: attractionDailyCapacities.capacityDate,

//       totalCapacity: attractionDailyCapacities.totalCapacity,
//     })
//     .from(attractionDailyCapacities)
//     .innerJoin(
//       attractions,
//       eq(attractionDailyCapacities.attractionId, attractions.id),
//     )
//     .where(whereClause)
//     .orderBy(asc(attractionDailyCapacities.capacityDate), asc(attractions.name))
//     .limit(limit)
//     .offset(offset);

//   // --------------------------------------------------
//   // SLOT INVENTORY
//   // --------------------------------------------------

//   const inventoryIds = dailyRows.map((row) => row.id);

//   const slotRows =
//     inventoryIds.length > 0
//       ? await db
//           .select({
//             attractionId: attractionDailyCapacities.attractionId,

//             capacityDate: attractionSlotCapacities.capacityDate,

//             slotId: attractionTimeSlots.id,

//             slotTime: attractionTimeSlots.slotTime,

//             isActive: attractionTimeSlots.isActive,

//             capacity: attractionSlotCapacities.capacity,
//           })
//           .from(attractionSlotCapacities)
//           .innerJoin(
//             attractionTimeSlots,
//             eq(attractionSlotCapacities.timeSlotId, attractionTimeSlots.id),
//           )
//           .innerJoin(
//             attractionDailyCapacities,
//             and(
//               eq(
//                 attractionSlotCapacities.capacityDate,
//                 attractionDailyCapacities.capacityDate,
//               ),
//               eq(
//                 attractionTimeSlots.attractionId,
//                 attractionDailyCapacities.attractionId,
//               ),
//             ),
//           )
//           .where(
//             sql`${attractionDailyCapacities.id} IN (${sql.join(
//               inventoryIds.map((id) => sql`${id}`),
//               sql`, `,
//             )})`,
//           )
//           .orderBy(
//             asc(attractionSlotCapacities.capacityDate),
//             asc(attractionTimeSlots.slotTime),
//           )
//       : [];

//   // --------------------------------------------------
//   // GROUP SLOTS
//   // --------------------------------------------------

//   const slotMap = new Map<string, typeof slotRows>();

//   for (const slot of slotRows) {
//     const key = `${slot.attractionId}_${slot.capacityDate}`;

//     const existing = slotMap.get(key) || [];

//     existing.push(slot);

//     slotMap.set(key, existing);
//   }

//   // --------------------------------------------------
//   // RESPONSE
//   // --------------------------------------------------

//   const items = dailyRows.map((row, index) => {
//     const key = `${row.attractionId}_${row.capacityDate}`;

//     const slots = slotMap.get(key) || [];

//     const totalSlotCapacity = slots.reduce(
//       (sum, slot) => sum + Number(slot.capacity || 0),
//       0,
//     );

//     return {
//       sNo: offset + index + 1,

//       id: row.id,

//       attraction: {
//         id: row.attractionId,
//         name: row.attractionName,
//       },

//       date: row.capacityDate,

//       dailyCapacity: row.totalCapacity,

//       slotCapacity: totalSlotCapacity,

//       slots: slots.map((slot) => ({
//         id: slot.slotId,

//         time: slot.slotTime,

//         capacity: slot.capacity,

//         isActive: slot.isActive,
//       })),
//     };
//   });

//   return {
//     items,

//     pagination: {
//       page,
//       limit,
//       total,
//       totalPages: total === 0 ? 0 : Math.ceil(total / limit),
//     },
//   };
// }

// export async function upsertDailyCapacity(input: UpsertDailyCapacityInput) {
//   // --------------------------------------------------
//   // VALIDATION
//   // --------------------------------------------------

//   if (!input.attractionId) {
//     throw new Error("Attraction ID is required.");
//   }

//   if (!input.capacityDate) {
//     throw new Error("Capacity date is required.");
//   }

//   if (!Number.isInteger(input.totalCapacity) || input.totalCapacity < 0) {
//     throw new Error("Total capacity must be a non-negative integer.");
//   }

//   // --------------------------------------------------
//   // CHECK ATTRACTION
//   // --------------------------------------------------

//   const [attraction] = await db
//     .select({
//       id: attractions.id,
//       name: attractions.name,
//     })
//     .from(attractions)
//     .where(eq(attractions.id, input.attractionId))
//     .limit(1);

//   if (!attraction) {
//     throw new Error("Attraction not found.");
//   }

//   // --------------------------------------------------
//   // CHECK EXISTING CAPACITY
//   // --------------------------------------------------

//   const [existing] = await db
//     .select({
//       id: attractionDailyCapacities.id,
//     })
//     .from(attractionDailyCapacities)
//     .where(
//       and(
//         eq(attractionDailyCapacities.attractionId, input.attractionId),
//         eq(attractionDailyCapacities.capacityDate, input.capacityDate),
//       ),
//     )
//     .limit(1);

//   // --------------------------------------------------
//   // UPDATE
//   // --------------------------------------------------

//   if (existing) {
//     const [updated] = await db
//       .update(attractionDailyCapacities)
//       .set({
//         totalCapacity: input.totalCapacity,
//         updatedAt: new Date(),
//       })
//       .where(eq(attractionDailyCapacities.id, existing.id))
//       .returning();

//     return updated;
//   }

//   // --------------------------------------------------
//   // CREATE
//   // --------------------------------------------------

//   const [created] = await db
//     .insert(attractionDailyCapacities)
//     .values({
//       attractionId: input.attractionId,
//       capacityDate: input.capacityDate,
//       totalCapacity: input.totalCapacity,
//     })
//     .returning();

//   return created;
// }
import { and, asc, eq, gte, ilike, lte, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  attractions,
  attractionDailyCapacities,
  attractionSlotCapacities,
  attractionTimeSlots,
} from "@/db/schema";

// =====================================================
// TYPES
// =====================================================

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

// =====================================================
// GET INVENTORY
// =====================================================

export async function getInventory(
  filters: InventoryFilters = {
    adminId: "",
  },
) {
  // --------------------------------------------------
  // VALIDATE ADMIN
  // --------------------------------------------------

  if (!filters.adminId) {
    throw new Error("Admin ID is required.");
  }

  // --------------------------------------------------
  // PAGINATION
  // --------------------------------------------------

  const page = Math.max(Number(filters.page) || 1, 1);

  const limit = Math.min(Math.max(Number(filters.limit) || 10, 1), 100);

  const offset = (page - 1) * limit;

  // --------------------------------------------------
  // CONDITIONS
  // --------------------------------------------------

  const conditions = [
    // IMPORTANT:
    // Only inventory belonging to attractions
    // owned by the authenticated admin.
    eq(attractions.adminId, filters.adminId),
  ];

  // --------------------------------------------------
  // ATTRACTION FILTER
  // --------------------------------------------------

  if (filters.attractionId) {
    conditions.push(
      eq(attractionDailyCapacities.attractionId, filters.attractionId),
    );
  }

  // --------------------------------------------------
  // SEARCH ATTRACTION
  // --------------------------------------------------

  if (filters.search?.trim()) {
    conditions.push(ilike(attractions.name, `%${filters.search.trim()}%`));
  }

  // --------------------------------------------------
  // DATE FROM
  // --------------------------------------------------

  if (filters.dateFrom) {
    conditions.push(
      gte(attractionDailyCapacities.capacityDate, filters.dateFrom),
    );
  }

  // --------------------------------------------------
  // DATE TO
  // --------------------------------------------------

  if (filters.dateTo) {
    conditions.push(
      lte(attractionDailyCapacities.capacityDate, filters.dateTo),
    );
  }

  const whereClause = and(...conditions);

  // ==================================================
  // TOTAL
  // ==================================================

  const [countResult] = await db
    .select({
      total: sql<number>`COUNT(*)`,
    })
    .from(attractionDailyCapacities)
    .innerJoin(
      attractions,
      eq(attractionDailyCapacities.attractionId, attractions.id),
    )
    .where(whereClause);

  const total = Number(countResult?.total || 0);

  // ==================================================
  // DAILY INVENTORY
  // ==================================================

  const dailyRows = await db
    .select({
      id: attractionDailyCapacities.id,

      attractionId: attractions.id,

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

  // ==================================================
  // SLOT INVENTORY
  // ==================================================

  const inventoryIds = dailyRows.map((row) => row.id);

  const slotRows =
    inventoryIds.length > 0
      ? await db
          .select({
            attractionId: attractionDailyCapacities.attractionId,

            capacityDate: attractionSlotCapacities.capacityDate,

            slotId: attractionTimeSlots.id,

            slotTime: attractionTimeSlots.slotTime,

            isActive: attractionTimeSlots.isActive,

            capacity: attractionSlotCapacities.capacity,
          })
          .from(attractionSlotCapacities)
          .innerJoin(
            attractionTimeSlots,
            eq(attractionSlotCapacities.timeSlotId, attractionTimeSlots.id),
          )
          .innerJoin(
            attractionDailyCapacities,
            and(
              eq(
                attractionSlotCapacities.capacityDate,
                attractionDailyCapacities.capacityDate,
              ),
              eq(
                attractionTimeSlots.attractionId,
                attractionDailyCapacities.attractionId,
              ),
            ),
          )
          .innerJoin(
            attractions,
            eq(attractionDailyCapacities.attractionId, attractions.id),
          )
          .where(
            and(
              // IMPORTANT:
              // Also scope slot inventory to admin.
              eq(attractions.adminId, filters.adminId),

              sql`${attractionDailyCapacities.id} IN (${sql.join(
                inventoryIds.map((id) => sql`${id}`),
                sql`, `,
              )})`,
            ),
          )
          .orderBy(
            asc(attractionSlotCapacities.capacityDate),
            asc(attractionTimeSlots.slotTime),
          )
      : [];

  // ==================================================
  // GROUP SLOTS
  // ==================================================

  const slotMap = new Map<string, typeof slotRows>();

  for (const slot of slotRows) {
    const key = `${slot.attractionId}_${slot.capacityDate}`;

    const existing = slotMap.get(key) || [];

    existing.push(slot);

    slotMap.set(key, existing);
  }

  // ==================================================
  // RESPONSE
  // ==================================================

  const items = dailyRows.map((row, index) => {
    const key = `${row.attractionId}_${row.capacityDate}`;

    const slots = slotMap.get(key) || [];

    const totalSlotCapacity = slots.reduce(
      (sum, slot) => sum + Number(slot.capacity || 0),
      0,
    );

    return {
      sNo: offset + index + 1,

      id: row.id,

      attraction: {
        id: row.attractionId,
        name: row.attractionName,
      },

      date: row.capacityDate,

      dailyCapacity: row.totalCapacity,

      slotCapacity: totalSlotCapacity,

      slots: slots.map((slot) => ({
        id: slot.slotId,

        time: slot.slotTime,

        capacity: slot.capacity,

        isActive: slot.isActive,
      })),
    };
  });

  // ==================================================
  // FINAL RESPONSE
  // ==================================================

  return {
    items,

    pagination: {
      page,

      limit,

      total,

      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
}

// =====================================================
// UPSERT DAILY CAPACITY
// =====================================================

export async function upsertDailyCapacity(input: UpsertDailyCapacityInput) {
  // --------------------------------------------------
  // VALIDATION
  // --------------------------------------------------

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

  // ==================================================
  // CHECK ATTRACTION OWNERSHIP
  // ==================================================

  const [attraction] = await db
    .select({
      id: attractions.id,
      name: attractions.name,
    })
    .from(attractions)
    .where(
      and(
        eq(attractions.id, input.attractionId),

        // IMPORTANT:
        // Prevent Admin B from modifying
        // Admin A's attraction.
        eq(attractions.adminId, input.adminId),
      ),
    )
    .limit(1);

  if (!attraction) {
    throw new Error("Attraction not found.");
  }

  // ==================================================
  // CHECK EXISTING CAPACITY
  // ==================================================

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

        // IMPORTANT:
        // Keep ownership check even here.
        eq(attractions.adminId, input.adminId),
      ),
    )
    .limit(1);

  // ==================================================
  // UPDATE
  // ==================================================

  if (existing) {
    const [updated] = await db
      .update(attractionDailyCapacities)
      .set({
        totalCapacity: input.totalCapacity,

        updatedAt: new Date(),
      })
      .where(eq(attractionDailyCapacities.id, existing.id))
      .returning();

    return updated;
  }

  // ==================================================
  // CREATE
  // ==================================================

  const [created] = await db
    .insert(attractionDailyCapacities)
    .values({
      attractionId: input.attractionId,

      capacityDate: input.capacityDate,

      totalCapacity: input.totalCapacity,
    })
    .returning();

  return created;
}
