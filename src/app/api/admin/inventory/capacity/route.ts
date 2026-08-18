// import { NextRequest } from "next/server";

// import { db } from "@/db";

// import {
//   attractionInventory,
//   attractionInventorySlots,
//   attractions,
// } from "@/db/schema";

// import { eq, and } from "drizzle-orm";

// import { requireAuth } from "@/lib/auth/require-auth";
// import { success, failure } from "@/lib/api/response";

// type AddCapacityBody = {
//   attractionId: string;
//   date: string;

//   slot?: string;

//   additionalSeats: number;
// };

// export async function POST(request: NextRequest) {
//   try {
//     const auth = await requireAuth(request);

//     if (auth.user.role !== "ADMIN") {
//       return failure("Admin access required.", 403, "FORBIDDEN");
//     }

//     const body = (await request.json()) as AddCapacityBody;

//     const { attractionId, date, slot, additionalSeats } = body;

//     if (!attractionId) {
//       return failure(
//         "Attraction ID is required.",
//         400,
//         "ATTRACTION_ID_REQUIRED",
//       );
//     }

//     if (!date) {
//       return failure("Date is required.", 400, "DATE_REQUIRED");
//     }

//     if (!Number.isInteger(additionalSeats) || additionalSeats <= 0) {
//       return failure(
//         "Additional seats must be a positive integer.",
//         400,
//         "INVALID_SEAT_COUNT",
//       );
//     }

//     const [attraction] = await db
//       .select({
//         id: attractions.id,
//         name: attractions.name,
//       })
//       .from(attractions)
//       .where(eq(attractions.id, attractionId))
//       .limit(1);

//     if (!attraction) {
//       return failure("Attraction not found.", 404, "ATTRACTION_NOT_FOUND");
//     }

//     const result = await db.transaction(async (tx) => {
//       let [inventory] = await tx
//         .select()
//         .from(attractionInventory)
//         .where(
//           and(
//             eq(attractionInventory.attractionId, attractionId),
//             eq(attractionInventory.inventoryDate, date),
//           ),
//         )
//         .limit(1);

//       if (!inventory) {
//         const inserted = await tx
//           .insert(attractionInventory)
//           .values({
//             attractionId,
//             inventoryDate: date,
//             dailyCapacity: additionalSeats,
//           })
//           .returning();

//         inventory = inserted[0];

//         return {
//           inventory,
//           addedTo: "daily",
//         };
//       }

//       await tx
//         .update(attractionInventory)
//         .set({
//           dailyCapacity: inventory.dailyCapacity + additionalSeats,

//           updatedAt: new Date(),
//         })
//         .where(eq(attractionInventory.id, inventory.id));

//       const slots = await tx
//         .select()
//         .from(attractionInventorySlots)
//         .where(eq(attractionInventorySlots.inventoryId, inventory.id));

//       if (slots.length === 0) {
//         return {
//           inventory,
//           addedTo: "daily",
//         };
//       }

//       if (!slot || slot === "ALL") {
//         const base = Math.floor(additionalSeats / slots.length);

//         const remainder = additionalSeats % slots.length;

//         for (let i = 0; i < slots.length; i++) {
//           const extra = base + (i < remainder ? 1 : 0);

//           if (extra === 0) continue;

//           await tx
//             .update(attractionInventorySlots)
//             .set({
//               capacity: slots[i].capacity + extra,

//               updatedAt: new Date(),
//             })
//             .where(eq(attractionInventorySlots.id, slots[i].id));
//         }
//       } else {
//         const [targetSlot] = await tx
//           .select()
//           .from(attractionInventorySlots)
//           .where(
//             and(
//               eq(attractionInventorySlots.inventoryId, inventory.id),
//               eq(attractionInventorySlots.slotTime, slot),
//             ),
//           )
//           .limit(1);

//         if (!targetSlot) {
//           throw new Error("Selected slot not found.");
//         }

//         await tx
//           .update(attractionInventorySlots)
//           .set({
//             capacity: targetSlot.capacity + additionalSeats,

//             updatedAt: new Date(),
//           })
//           .where(eq(attractionInventorySlots.id, targetSlot.id));
//       }

//       return {
//         inventory,
//         addedTo: slot || "ALL",
//       };
//     });

//     return success({
//       message: "Inventory capacity added successfully.",

//       attraction: {
//         id: attraction.id,
//         name: attraction.name,
//       },

//       date,

//       additionalSeats,

//       allocation: slot || "ALL",

//       result,
//     });
//   } catch (error) {
//     console.error("POST /api/admin/inventory/capacity error:", error);

//     return failure(
//       "Failed to add inventory capacity.",
//       500,
//       "CAPACITY_UPDATE_FAILED",
//     );
//   }
// }
import { NextRequest } from "next/server";

import { db } from "@/db";

import {
  attractionInventory,
  attractionInventorySlots,
  attractions,
} from "@/db/schema";

import { eq, and } from "drizzle-orm";

import { requireAdmin } from "@/lib/auth/require-admin";
import { success, failure } from "@/lib/api/response";

type AddCapacityBody = {
  attractionId: string;
  date: string;
  slot?: string;
  additionalSeats: number;
};

export async function POST(request: NextRequest) {
  try {
    // --------------------------------------------------
    // AUTH
    // --------------------------------------------------

    const auth = await requireAdmin(request);

    const adminId = auth.adminId;

    // --------------------------------------------------
    // BODY
    // --------------------------------------------------

    const body = (await request.json()) as AddCapacityBody;

    const { attractionId, date, slot, additionalSeats } = body;

    // --------------------------------------------------
    // VALIDATION
    // --------------------------------------------------

    if (!attractionId) {
      return failure(
        "Attraction ID is required.",
        400,
        "ATTRACTION_ID_REQUIRED",
      );
    }

    if (!date) {
      return failure("Date is required.", 400, "DATE_REQUIRED");
    }

    if (!Number.isInteger(additionalSeats) || additionalSeats <= 0) {
      return failure(
        "Additional seats must be a positive integer.",
        400,
        "INVALID_SEAT_COUNT",
      );
    }

    // --------------------------------------------------
    // VERIFY ATTRACTION OWNERSHIP
    //
    // IMPORTANT:
    // Admin can only modify attractions belonging
    // to their own admin account.
    // --------------------------------------------------

    const [attraction] = await db
      .select({
        id: attractions.id,
        name: attractions.name,
      })
      .from(attractions)
      .where(
        and(eq(attractions.id, attractionId), eq(attractions.adminId, adminId)),
      )
      .limit(1);

    if (!attraction) {
      return failure("Attraction not found.", 404, "ATTRACTION_NOT_FOUND");
    }

    // --------------------------------------------------
    // INVENTORY TRANSACTION
    // --------------------------------------------------

    const result = await db.transaction(async (tx) => {
      let [inventory] = await tx
        .select()
        .from(attractionInventory)
        .where(
          and(
            eq(attractionInventory.attractionId, attractionId),
            eq(attractionInventory.inventoryDate, date),
          ),
        )
        .limit(1);

      // --------------------------------------------------
      // CREATE DAILY INVENTORY
      // --------------------------------------------------

      if (!inventory) {
        const inserted = await tx
          .insert(attractionInventory)
          .values({
            attractionId,
            inventoryDate: date,
            dailyCapacity: additionalSeats,
          })
          .returning();

        inventory = inserted[0];

        return {
          inventory,
          addedTo: "daily",
        };
      }

      // --------------------------------------------------
      // UPDATE DAILY CAPACITY
      // --------------------------------------------------

      await tx
        .update(attractionInventory)
        .set({
          dailyCapacity: inventory.dailyCapacity + additionalSeats,

          updatedAt: new Date(),
        })
        .where(eq(attractionInventory.id, inventory.id));

      // --------------------------------------------------
      // GET SLOTS
      // --------------------------------------------------

      const slots = await tx
        .select()
        .from(attractionInventorySlots)
        .where(eq(attractionInventorySlots.inventoryId, inventory.id));

      // --------------------------------------------------
      // NO SLOTS
      // --------------------------------------------------

      if (slots.length === 0) {
        return {
          inventory,
          addedTo: "daily",
        };
      }

      // --------------------------------------------------
      // ALL SLOTS
      // --------------------------------------------------

      if (!slot || slot === "ALL") {
        const base = Math.floor(additionalSeats / slots.length);

        const remainder = additionalSeats % slots.length;

        for (let i = 0; i < slots.length; i++) {
          const extra = base + (i < remainder ? 1 : 0);

          if (extra === 0) continue;

          await tx
            .update(attractionInventorySlots)
            .set({
              capacity: slots[i].capacity + extra,

              updatedAt: new Date(),
            })
            .where(eq(attractionInventorySlots.id, slots[i].id));
        }
      }

      // --------------------------------------------------
      // SPECIFIC SLOT
      // --------------------------------------------------
      else {
        const [targetSlot] = await tx
          .select()
          .from(attractionInventorySlots)
          .where(
            and(
              eq(attractionInventorySlots.inventoryId, inventory.id),
              eq(attractionInventorySlots.slotTime, slot),
            ),
          )
          .limit(1);

        if (!targetSlot) {
          throw new Error("Selected slot not found.");
        }

        await tx
          .update(attractionInventorySlots)
          .set({
            capacity: targetSlot.capacity + additionalSeats,

            updatedAt: new Date(),
          })
          .where(eq(attractionInventorySlots.id, targetSlot.id));
      }

      return {
        inventory,
        addedTo: slot || "ALL",
      };
    });

    // --------------------------------------------------
    // RESPONSE
    // --------------------------------------------------

    return success({
      message: "Inventory capacity added successfully.",

      attraction: {
        id: attraction.id,
        name: attraction.name,
      },

      date,

      additionalSeats,

      allocation: slot || "ALL",

      result,
    });
  } catch (error) {
    console.error("POST /api/admin/inventory/capacity error:", error);

    return failure(
      "Failed to add inventory capacity.",
      500,
      "CAPACITY_UPDATE_FAILED",
    );
  }
}
