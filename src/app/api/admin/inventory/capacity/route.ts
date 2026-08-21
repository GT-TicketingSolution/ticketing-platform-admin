import { NextRequest } from "next/server";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";

import {
  attractions,
  attractionDailyCapacities,
  attractionSlotCapacities,
  attractionTimeSlots,
} from "@/db/schema";

import { requireAuth } from "@/lib/auth/require-auth";
import { success, failure } from "@/lib/api/response";

type AddCapacityBody = {
  attractionId: string;
  date: string;
  slot?: string;
  additionalSeats: number;
};

export async function POST(request: NextRequest) {
  try {
    // =====================================================
    // AUTH
    // =====================================================

    const auth = await requireAuth(request);

    if (auth.user.role !== "ADMIN") {
      return failure("Admin access required.", 403, "FORBIDDEN");
    }

    // =====================================================
    // TENANT
    // =====================================================

    const adminId = auth.user.id;

    if (!adminId) {
      return failure("Admin context not found.", 403, "ADMIN_CONTEXT_REQUIRED");
    }

    // =====================================================
    // BODY
    // =====================================================

    const body = (await request.json()) as AddCapacityBody;

    const { attractionId, date, slot, additionalSeats } = body;

    // =====================================================
    // VALIDATION
    // =====================================================

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

    // =====================================================
    // VERIFY ATTRACTION OWNERSHIP
    // =====================================================

    const [attraction] = await db
      .select({
        id: attractions.id,
        name: attractions.name,
        status: attractions.status,
      })
      .from(attractions)
      .where(
        and(
          eq(attractions.id, attractionId),
          eq(attractions.adminId, adminId),
          eq(attractions.status, "ACTIVE"),
        ),
      )
      .limit(1);

    if (!attraction) {
      return failure("Attraction not found.", 404, "ATTRACTION_NOT_FOUND");
    }

    // =====================================================
    // TRANSACTION
    // =====================================================

    const result = await db.transaction(async (tx) => {
      // ---------------------------------------------------
      // FIND DAILY CAPACITY
      // ---------------------------------------------------

      const [dailyCapacity] = await tx
        .select({
          id: attractionDailyCapacities.id,
          attractionId: attractionDailyCapacities.attractionId,
          capacityDate: attractionDailyCapacities.capacityDate,
          totalCapacity: attractionDailyCapacities.totalCapacity,
        })
        .from(attractionDailyCapacities)
        .where(
          and(
            eq(attractionDailyCapacities.attractionId, attractionId),

            eq(attractionDailyCapacities.capacityDate, date),
          ),
        )
        .limit(1);

      // ===================================================
      // CREATE DAILY CAPACITY
      // ===================================================

      if (!dailyCapacity) {
        const [created] = await tx
          .insert(attractionDailyCapacities)
          .values({
            attractionId,

            capacityDate: date,

            totalCapacity: additionalSeats,
          })
          .returning({
            id: attractionDailyCapacities.id,

            attractionId: attractionDailyCapacities.attractionId,

            capacityDate: attractionDailyCapacities.capacityDate,

            totalCapacity: attractionDailyCapacities.totalCapacity,
          });

        return {
          dailyCapacity: created,

          allocation: "DAILY",

          slotsUpdated: 0,
        };
      }

      // ===================================================
      // UPDATE DAILY CAPACITY
      // ===================================================

      const newDailyCapacity =
        Number(dailyCapacity.totalCapacity) + additionalSeats;

      const [updatedDailyCapacity] = await tx
        .update(attractionDailyCapacities)
        .set({
          totalCapacity: newDailyCapacity,

          updatedAt: new Date(),
        })
        .where(eq(attractionDailyCapacities.id, dailyCapacity.id))
        .returning({
          id: attractionDailyCapacities.id,

          attractionId: attractionDailyCapacities.attractionId,

          capacityDate: attractionDailyCapacities.capacityDate,

          totalCapacity: attractionDailyCapacities.totalCapacity,
        });

      // ===================================================
      // IF NO SLOT WAS PROVIDED
      // ===================================================

      if (!slot || slot === "ALL") {
        return {
          dailyCapacity: updatedDailyCapacity,

          allocation: "DAILY",

          slotsUpdated: 0,
        };
      }

      // ===================================================
      // FIND TIME SLOT
      // ===================================================

      const [timeSlot] = await tx
        .select({
          id: attractionTimeSlots.id,

          slotTime: attractionTimeSlots.slotTime,

          attractionId: attractionTimeSlots.attractionId,

          isActive: attractionTimeSlots.isActive,
        })
        .from(attractionTimeSlots)
        .where(
          and(
            eq(attractionTimeSlots.id, slot),

            eq(attractionTimeSlots.attractionId, attractionId),

            eq(attractionTimeSlots.isActive, true),
          ),
        )
        .limit(1);

      if (!timeSlot) {
        throw new Error("Selected slot not found.");
      }

      // ===================================================
      // FIND SLOT CAPACITY
      // ===================================================

      const [slotCapacity] = await tx
        .select({
          id: attractionSlotCapacities.id,

          capacity: attractionSlotCapacities.capacity,
        })
        .from(attractionSlotCapacities)
        .where(
          and(
            eq(attractionSlotCapacities.timeSlotId, timeSlot.id),

            eq(attractionSlotCapacities.capacityDate, date),
          ),
        )
        .limit(1);

      // ===================================================
      // CREATE SLOT CAPACITY
      // ===================================================

      if (!slotCapacity) {
        const [createdSlot] = await tx
          .insert(attractionSlotCapacities)
          .values({
            timeSlotId: timeSlot.id,

            capacityDate: date,

            capacity: additionalSeats,
          })
          .returning({
            id: attractionSlotCapacities.id,

            timeSlotId: attractionSlotCapacities.timeSlotId,

            capacityDate: attractionSlotCapacities.capacityDate,

            capacity: attractionSlotCapacities.capacity,
          });

        return {
          dailyCapacity: updatedDailyCapacity,

          slot: createdSlot,

          allocation: timeSlot.slotTime,

          slotsUpdated: 1,
        };
      }

      // ===================================================
      // UPDATE SLOT CAPACITY
      // ===================================================

      const newSlotCapacity = Number(slotCapacity.capacity) + additionalSeats;

      const [updatedSlot] = await tx
        .update(attractionSlotCapacities)
        .set({
          capacity: newSlotCapacity,

          updatedAt: new Date(),
        })
        .where(eq(attractionSlotCapacities.id, slotCapacity.id))
        .returning({
          id: attractionSlotCapacities.id,

          timeSlotId: attractionSlotCapacities.timeSlotId,

          capacityDate: attractionSlotCapacities.capacityDate,

          capacity: attractionSlotCapacities.capacity,
        });

      return {
        dailyCapacity: updatedDailyCapacity,

        slot: updatedSlot,

        allocation: timeSlot.slotTime,

        slotsUpdated: 1,
      };
    });

    // =====================================================
    // RESPONSE
    // =====================================================

    return success({
      message: "Inventory capacity added successfully.",

      attraction: {
        id: attraction.id,

        name: attraction.name,
      },

      date,

      additionalSeats,

      allocation: slot || "DAILY",

      result,
    });
  } catch (error) {
    console.error("POST /api/admin/inventory/capacity error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Failed to add inventory capacity.";

    return failure(message, 500, "CAPACITY_UPDATE_FAILED");
  }
}
