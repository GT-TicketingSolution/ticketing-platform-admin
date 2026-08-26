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
import { requireModuleAccess } from "@/lib/auth/authorization";

type AddCapacityBody = {
  attractionId: string;
  date: string;
  slot?: string;
  additionalSeats: number;
};

export async function POST(request: NextRequest) {
  try {
    // =====================================================
    // AUTHENTICATION
    // =====================================================

    const auth = await requireAuth(request);

    // =====================================================
    // MODULE ACCESS
    // =====================================================

    await requireModuleAccess(auth, "INVENTORY_CAPACITY");

    // =====================================================
    // TENANT
    // =====================================================

    const adminId =
      auth.user.role === "ADMIN" ? auth.user.id : auth.user.adminId;

    if (!adminId) {
      return failure("Admin context not found.", 403, "ADMIN_CONTEXT_REQUIRED");
    }

    // =====================================================
    // BODY
    // =====================================================

    let body: AddCapacityBody;

    try {
      body = (await request.json()) as AddCapacityBody;
    } catch {
      return failure("Invalid JSON request body.", 400, "INVALID_REQUEST_BODY");
    }

    const { attractionId, date, slot, additionalSeats } = body;

    // =====================================================
    // VALIDATION
    // =====================================================

    if (!attractionId || typeof attractionId !== "string") {
      return failure(
        "Attraction ID is required.",
        400,
        "ATTRACTION_ID_REQUIRED",
      );
    }

    if (!date || typeof date !== "string") {
      return failure("Date is required.", 400, "DATE_REQUIRED");
    }

    // YYYY-MM-DD validation
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return failure("Date must be in YYYY-MM-DD format.", 400, "INVALID_DATE");
    }

    const parsedAdditionalSeats = Number(additionalSeats);

    if (
      !Number.isInteger(parsedAdditionalSeats) ||
      parsedAdditionalSeats <= 0
    ) {
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
      return failure(
        "Attraction not found or is not active.",
        404,
        "ATTRACTION_NOT_FOUND",
      );
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
            totalCapacity: parsedAdditionalSeats,
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
        Number(dailyCapacity.totalCapacity) + parsedAdditionalSeats;

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
      // DAILY CAPACITY ONLY
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
        throw new Error("SLOT_NOT_FOUND");
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
            capacity: parsedAdditionalSeats,
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

      const newSlotCapacity =
        Number(slotCapacity.capacity) + parsedAdditionalSeats;

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

      additionalSeats: parsedAdditionalSeats,

      allocation: slot || "DAILY",

      result,
    });
  } catch (error) {
    // =====================================================
    // AUTHENTICATION ERRORS
    // =====================================================

    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return failure("Authentication required.", 401, "UNAUTHORIZED");
      }

      // ===================================================
      // ACCOUNT STATUS
      // ===================================================

      if (error.message === "ACCOUNT_NOT_ACTIVE") {
        return failure("Account is not active.", 403, "ACCOUNT_NOT_ACTIVE");
      }

      // ===================================================
      // MODULE ACCESS
      // ===================================================

      if (
        error.message === "MODULE_ACCESS_DENIED" ||
        error.message === "FORBIDDEN"
      ) {
        return failure(
          "You do not have permission to access the inventory capacity module.",
          403,
          "MODULE_ACCESS_DENIED",
        );
      }

      // ===================================================
      // ADMIN CONTEXT
      // ===================================================

      if (error.message === "ADMIN_CONTEXT_REQUIRED") {
        return failure(
          "Admin context not found.",
          403,
          "ADMIN_CONTEXT_REQUIRED",
        );
      }

      // ===================================================
      // ATTRACTION
      // ===================================================

      if (error.message === "ATTRACTION_NOT_FOUND") {
        return failure("Attraction not found.", 404, "ATTRACTION_NOT_FOUND");
      }

      // ===================================================
      // SLOT
      // ===================================================

      if (error.message === "SLOT_NOT_FOUND") {
        return failure(
          "Selected time slot was not found or is inactive for this attraction.",
          404,
          "SLOT_NOT_FOUND",
        );
      }

      // ===================================================
      // DATABASE CONSTRAINT / CONFLICT
      // ===================================================

      if (error.message.includes("duplicate key")) {
        return failure(
          "Capacity already exists for the selected attraction and date.",
          409,
          "CAPACITY_ALREADY_EXISTS",
        );
      }
    }

    // =====================================================
    // UNKNOWN / DATABASE ERROR
    // =====================================================

    console.error("POST /api/admin/inventory/capacity error:", error);

    return failure(
      "Unable to update inventory capacity.",
      500,
      "INTERNAL_SERVER_ERROR",
    );
  }
}
