import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import {
  attractionManagement,
  attractions,
  attractionSeats,
  attractionCategory,
  seatLayouts,
} from "@/db/schema";

import { success, failure } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/require-auth";
import {
  requireModuleAccess,
  getAccessibleAttractionIds,
} from "@/lib/auth/authorization";
import {
  getLegacySeatLayoutId,
  listTimeSlotsByAttractionIds,
  parseTimeSlotsPayload,
  replaceAttractionSeatLayouts,
  resolveSeatLayoutIds,
  syncAttractionTimeSlots,
  validateSeatLayoutsForAdmin,
} from "@/services/attraction-management.service";

export async function PATCH(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const auth = await requireAuth(request);

    await requireModuleAccess(auth, "ATTRACTION_MANAGEMENT");

    const { id } = await context.params;

    const body = await request.json();

    // =====================================================
    // CHECK OWNERSHIP / ACCESS
    // =====================================================

    let existing;

    if (auth.user.role === "ADMIN") {
      existing = await db.query.attractionManagement.findFirst({
        where: and(
          eq(attractionManagement.id, id),
          eq(attractionManagement.adminId, auth.user.id),
        ),
      });
    } else {
      const allowedIds = await getAccessibleAttractionIds(auth);

      if (!allowedIds.length) {
        return failure("Access denied", 403, "FORBIDDEN");
      }

      existing = await db.query.attractionManagement.findFirst({
        where: and(
          eq(attractionManagement.id, id),
          inArray(attractionManagement.attractionId, allowedIds),
        ),
      });
    }

    if (!existing) {
      return failure("Attraction not found or access denied", 403, "FORBIDDEN");
    }

    // =====================================================
    // CATEGORIES
    // =====================================================

    const shouldSyncCategories = body.categories !== undefined;

    let categoriesToUpdate:
      | {
          id?: string;
          name: string;
          basePrice: number;
          futurePrice?: number | null;
          effectiveFrom?: string | null;
          noOfSeats: number;
          imageLink?: string | null;
        }[]
      | null = null;

    if (shouldSyncCategories) {
      if (!Array.isArray(body.categories)) {
        return failure("categories must be an array.", 400, "VALIDATION_ERROR");
      }

      if (body.categories.length === 0) {
        return failure(
          "At least one category is required.",
          400,
          "VALIDATION_ERROR",
        );
      }

      const categoryNames = new Set<string>();

      categoriesToUpdate = [];

      for (const category of body.categories) {
        if (
          !category ||
          typeof category.name !== "string" ||
          !category.name.trim()
        ) {
          return failure(
            "Each category must have a name.",
            400,
            "VALIDATION_ERROR",
          );
        }

        const normalizedName = category.name.trim().toLowerCase();

        if (categoryNames.has(normalizedName)) {
          return failure(
            `Duplicate category name: ${category.name}`,
            400,
            "VALIDATION_ERROR",
          );
        }

        categoryNames.add(normalizedName);

        const basePrice = Number(category.basePrice);

        if (
          category.basePrice === undefined ||
          category.basePrice === null ||
          category.basePrice === "" ||
          !Number.isFinite(basePrice) ||
          basePrice < 0
        ) {
          return failure(
            `Invalid basePrice for category: ${category.name}`,
            400,
            "VALIDATION_ERROR",
          );
        }

        let futurePrice: number | null = null;

        if (
          category.futurePrice !== undefined &&
          category.futurePrice !== null &&
          category.futurePrice !== ""
        ) {
          futurePrice = Number(category.futurePrice);

          if (!Number.isFinite(futurePrice) || futurePrice < 0) {
            return failure(
              `Invalid futurePrice for category: ${category.name}`,
              400,
              "VALIDATION_ERROR",
            );
          }
        }

        const noOfSeats = Number(category.noOfSeats);

        if (
          category.noOfSeats === undefined ||
          category.noOfSeats === null ||
          category.noOfSeats === "" ||
          !Number.isInteger(noOfSeats) ||
          noOfSeats < 0
        ) {
          return failure(
            `Invalid noOfSeats for category: ${category.name}`,
            400,
            "VALIDATION_ERROR",
          );
        }

        let effectiveFrom: string | null = null;

        if (
          category.effectiveFrom !== undefined &&
          category.effectiveFrom !== null &&
          category.effectiveFrom !== ""
        ) {
          const date = new Date(category.effectiveFrom);

          if (Number.isNaN(date.getTime())) {
            return failure(
              `Invalid effectiveFrom for category: ${category.name}`,
              400,
              "VALIDATION_ERROR",
            );
          }

          effectiveFrom = category.effectiveFrom;
        }

        categoriesToUpdate.push({
          id: category.id,
          name: category.name.trim(),
          basePrice,
          futurePrice,
          effectiveFrom,
          noOfSeats,
          imageLink:
            category.imageLink !== undefined ? category.imageLink : null,
        });
      }
    }

    // =====================================================
    // ATTRACTION SEATS
    // =====================================================
    //
    // body.seatLayoutIds[].id is treated as:
    //
    //     attraction_seats.id
    //
    // FIRST:
    //     Check attraction_seats.id
    //
    // If found:
    //     UPDATE existing row.
    //
    // If NOT found:
    //     Check the SAME ID in seat_layouts.id.
    //
    // If seat_layouts.id exists:
    //     INSERT attraction_seats with:
    //
    //     id            = incoming ID
    //     seatLayoutId  = incoming ID
    //
    // Therefore the frontend does NOT need to send
    // seatLayoutId for a new seat.
    //
    // =====================================================

    const shouldUpdateAttractionSeats = body.seatLayoutIds !== undefined;

    let seatUpdates:
      | {
          id: string;
          name?: string;
          status?: string;
          position?: number;
        }[]
      | null = null;

    if (shouldUpdateAttractionSeats) {
      if (!Array.isArray(body.seatLayoutIds)) {
        return failure(
          "seatLayoutIds must be an array.",
          400,
          "VALIDATION_ERROR",
        );
      }

      seatUpdates = [];

      for (const seat of body.seatLayoutIds) {
        if (!seat || typeof seat.id !== "string" || !seat.id.trim()) {
          return failure(
            "Each seat must contain a valid attraction_seats.id.",
            400,
            "VALIDATION_ERROR",
          );
        }

        if (
          seat.position !== undefined &&
          (!Number.isInteger(Number(seat.position)) ||
            Number(seat.position) < 1)
        ) {
          return failure(
            `Invalid position for seat ${seat.id}.`,
            400,
            "VALIDATION_ERROR",
          );
        }

        if (
          seat.status !== undefined &&
          seat.status !== "active" &&
          seat.status !== "inactive"
        ) {
          return failure(
            `Invalid status for seat ${seat.id}.`,
            400,
            "VALIDATION_ERROR",
          );
        }

        seatUpdates.push({
          id: seat.id.trim(),

          name: seat.name !== undefined ? String(seat.name) : undefined,

          status: seat.status !== undefined ? String(seat.status) : undefined,

          position:
            seat.position !== undefined ? Number(seat.position) : undefined,
        });
      }
    }

    // =====================================================
    // TIME SLOTS
    // =====================================================

    const timeSlotsParsed = parseTimeSlotsPayload(body);

    if (!timeSlotsParsed.ok) {
      return failure(timeSlotsParsed.message, 400, "VALIDATION_ERROR");
    }

    // =====================================================
    // TRANSACTION
    // =====================================================

    const result = await db.transaction(async (tx) => {
      // =====================================================
      // UPDATE ATTRACTION
      // =====================================================

      if (body.name !== undefined || body.category !== undefined) {
        await tx
          .update(attractions)
          .set({
            ...(body.name !== undefined
              ? {
                  name: body.name,
                }
              : {}),

            ...(body.category !== undefined
              ? {
                  type: body.category,
                }
              : {}),

            updatedAt: new Date(),
          })
          .where(eq(attractions.id, existing.attractionId));
      }

      // =====================================================
      // UPDATE MANAGEMENT
      // =====================================================

      const managementUpdate: Partial<
        typeof attractionManagement.$inferInsert
      > = {
        updatedAt: new Date(),
      };

      if (body.image !== undefined) {
        managementUpdate.image = body.image;
      }

      if (body.description !== undefined) {
        managementUpdate.description = body.description;
      }

      if (body.timing !== undefined) {
        managementUpdate.timing = body.timing;
      }

      if (body.duration !== undefined) {
        managementUpdate.duration = body.duration;
      }

      if (body.durationUnit !== undefined) {
        managementUpdate.durationUnit = body.durationUnit;
      }

      if (body.hasSeating !== undefined) {
        managementUpdate.hasSeating = Boolean(body.hasSeating);
      }

      const updatedRows = await tx
        .update(attractionManagement)
        .set(managementUpdate)
        .where(eq(attractionManagement.id, id))
        .returning();

      const updated = updatedRows[0];

      // =====================================================
      // UPDATE CATEGORIES
      // =====================================================

      let updatedCategories:
        | (typeof attractionCategory.$inferSelect)[]
        | undefined;

      if (categoriesToUpdate !== null) {
        for (const category of categoriesToUpdate) {
          if (category.id) {
            await tx
              .update(attractionCategory)
              .set({
                name: category.name,

                basePrice: String(category.basePrice),

                futurePrice:
                  category.futurePrice !== undefined &&
                  category.futurePrice !== null
                    ? String(category.futurePrice)
                    : null,

                effectiveFrom: category.effectiveFrom ?? null,

                noOfSeats: category.noOfSeats,

                imageLink: category.imageLink ?? null,
              })
              .where(
                and(
                  eq(attractionCategory.id, category.id),
                  eq(attractionCategory.attractionManagementId, id),
                ),
              );
          } else {
            await tx.insert(attractionCategory).values({
              attractionManagementId: id,

              name: category.name,

              basePrice: String(category.basePrice),

              futurePrice:
                category.futurePrice !== undefined &&
                category.futurePrice !== null
                  ? String(category.futurePrice)
                  : null,

              effectiveFrom: category.effectiveFrom ?? null,

              noOfSeats: category.noOfSeats,

              imageLink: category.imageLink ?? null,
            });
          }
        }

        updatedCategories = await tx
          .select()
          .from(attractionCategory)
          .where(eq(attractionCategory.attractionManagementId, id));
      } else {
        updatedCategories = await tx
          .select()
          .from(attractionCategory)
          .where(eq(attractionCategory.attractionManagementId, id));
      }

      // =====================================================
      // UPDATE / INSERT ATTRACTION SEATS
      // =====================================================

      let updatedAttractionSeats:
        | (typeof attractionSeats.$inferSelect)[]
        | undefined;

      if (seatUpdates !== null) {
        // ---------------------------------------------------
        // GET ALL EXISTING ATTRACTION SEATS
        // ---------------------------------------------------

        const existingSeats = await tx
          .select()
          .from(attractionSeats)
          .where(eq(attractionSeats.attractionId, existing.attractionId));

        // ---------------------------------------------------
        // MAP BY attraction_seats.id
        // ---------------------------------------------------

        const existingSeatMap = new Map(
          existingSeats.map((seat) => [seat.id, seat]),
        );

        // ---------------------------------------------------
        // PROCESS EACH SEAT
        // ---------------------------------------------------

        for (const seat of seatUpdates) {
          const existingSeat = existingSeatMap.get(seat.id);

          // =================================================
          // CASE 1:
          // attraction_seats.id EXISTS
          // =================================================

          if (existingSeat) {
            const updateData: Partial<typeof attractionSeats.$inferInsert> = {};

            if (seat.name !== undefined) {
              updateData.name = seat.name;
            }

            if (seat.position !== undefined) {
              updateData.seatOrder = seat.position;
            }

            if (seat.status !== undefined) {
              updateData.isActive = seat.status === "active";
            }

            // IMPORTANT:
            //
            // We DO NOT update:
            //
            // id
            // attractionId
            // seatLayoutId
            //
            // Therefore the existing IDs and
            // relationships remain unchanged.

            if (Object.keys(updateData).length > 0) {
              await tx
                .update(attractionSeats)
                .set(updateData)
                .where(
                  and(
                    eq(attractionSeats.id, existingSeat.id),
                    eq(attractionSeats.attractionId, existing.attractionId),
                  ),
                );
            }

            continue;
          }

          // =================================================
          // CASE 2:
          // attraction_seats.id DOES NOT EXIST
          //
          // Check the SAME ID in seat_layouts.id
          // =================================================

          const seatLayout = await tx
            .select({
              id: seatLayouts.id,
            })
            .from(seatLayouts)
            .where(eq(seatLayouts.id, seat.id))
            .limit(1);

          // =================================================
          // seat_layouts.id ALSO DOES NOT EXIST
          // =================================================

          if (!seatLayout.length) {
            throw new Error(`SEAT_LAYOUT_NOT_FOUND:${seat.id}`);
          }

          const newAttractionSeatId = crypto.randomUUID();
          // =================================================
          // seat_layouts.id EXISTS
          //
          // CREATE attraction_seats USING SAME ID
          // =================================================

          await tx.insert(attractionSeats).values({
            // SAME ID AS INCOMING ID
            id: newAttractionSeatId,

            attractionId: existing.attractionId,

            // SAME ID AS seat_layouts.id
            seatLayoutId: seat.id,

            name: seat.name ?? "",

            seatOrder: seat.position ?? 1,

            isActive: seat.status === "active",
          });
        }

        // ---------------------------------------------------
        // GET UPDATED ATTRACTION SEATS
        // ---------------------------------------------------

        updatedAttractionSeats = await tx
          .select()
          .from(attractionSeats)
          .where(eq(attractionSeats.attractionId, existing.attractionId));
      }

      // =====================================================
      // TIME SLOTS
      // =====================================================

      let timeSlots:
        | Awaited<ReturnType<typeof syncAttractionTimeSlots>>
        | undefined;

      if (timeSlotsParsed.sync) {
        timeSlots = await syncAttractionTimeSlots(
          tx,
          existing.attractionId,
          timeSlotsParsed.slots,
        );
      } else {
        const map = await listTimeSlotsByAttractionIds(tx, [
          existing.attractionId,
        ]);

        timeSlots = map.get(existing.attractionId) ?? [];
      }

      // =====================================================
      // RETURN
      // =====================================================

      return {
        management: updated,

        categories: updatedCategories,

        attractionSeats: updatedAttractionSeats,

        timeSlots,
      };
    });

    // =====================================================
    // RESPONSE
    // =====================================================

    const sanitizedResponse = {
      ...result.management,

      // ===================================================
      // CATEGORIES
      // ===================================================

      categories: Array.isArray(result.categories)
        ? result.categories.map((category) => ({
            id: category.id,

            name: category.name,

            basePrice: Number(category.basePrice),

            futurePrice:
              category.futurePrice !== null
                ? Number(category.futurePrice)
                : null,

            effectiveFrom: category.effectiveFrom,

            noOfSeats: category.noOfSeats,

            imageLink: category.imageLink,
          }))
        : [],

      // ===================================================
      // ATTRACTION SEAT IDS
      // ===================================================
      //
      // IMPORTANT:
      //
      // This returns attraction_seats.id.
      //
      // NOT seat_layouts.id.
      //
      // ===================================================

      // seatLayoutIds: Array.isArray(result.attractionSeats)
      //   ? result.attractionSeats.map((seat) => ({
      //       id: seat.id,

      //       name: seat.name,

      //       status: seat.isActive ? "active" : "inactive",

      //       position: seat.seatOrder,
      //     }))
      //   : [],

      // ===================================================
      // ATTRACTION SEATS
      // ===================================================

      attractionSeats: Array.isArray(result.attractionSeats)
        ? result.attractionSeats.map((seat) => ({
            id: seat.id,

            attractionId: seat.attractionId,

            seatLayoutId: seat.seatLayoutId,

            name: seat.name,

            seatOrder: seat.seatOrder,

            isActive: seat.isActive,
          }))
        : [],

      // ===================================================
      // TIME SLOTS
      // ===================================================

      // timeSlots: Array.isArray(result.timeSlots)
      //   ? result.timeSlots.map((slot: any) => ({
      //       id: slot.id,

      //       attractionId: slot.attractionId,

      //       // slotTime: slot.slotTime,

      //       isActive: slot.isActive,
      //     }))
      //   : [],
    };

    return success(sanitizedResponse);
  } catch (error) {
    console.error("Update attraction error:", error);

    if (error instanceof Error) {
      console.error("Error message:", error.message);

      // ===================================================
      // SEAT LAYOUT NOT FOUND
      // ===================================================

      if (error.message.startsWith("SEAT_LAYOUT_NOT_FOUND:")) {
        const seatId = error.message.replace("SEAT_LAYOUT_NOT_FOUND:", "");

        return failure(
          `Seat layout ${seatId} not found. Cannot create attraction seat.`,
          400,
          "VALIDATION_ERROR",
        );
      }

      // ===================================================
      // DATABASE CONSTRAINT ERROR
      // ===================================================

      const errorStr = error.message.toLowerCase();

      if (errorStr.includes("foreign key") || errorStr.includes("23503")) {
        return failure(
          "Invalid attraction seat reference.",
          400,
          "VALIDATION_ERROR",
        );
      }

      if (errorStr.includes("unique") || errorStr.includes("23505")) {
        return failure(
          "Duplicate attraction seat assignment detected.",
          400,
          "VALIDATION_ERROR",
        );
      }

      // ===================================================
      // TIME SLOT ERROR
      // ===================================================

      if (error.message.startsWith("TIME_SLOT_NOT_FOUND:")) {
        return failure(
          `Unknown timeSlots.id: ${error.message.replace(
            "TIME_SLOT_NOT_FOUND:",
            "",
          )}`,
          400,
          "VALIDATION_ERROR",
        );
      }

      // ===================================================
      // AUTHENTICATION
      // ===================================================

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
      // AUTHORIZATION
      // ===================================================

      if (error.message === "FORBIDDEN") {
        return failure(
          "You are not authorized to access attraction management.",
          403,
          "FORBIDDEN",
        );
      }
    }

    return failure(
      "Unable to update attraction.",
      500,
      "INTERNAL_SERVER_ERROR",
    );
  }
}
// =====================================================
// DELETE ATTRACTION
// =====================================================

export async function DELETE(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const auth = await requireAuth(request);

    await requireModuleAccess(auth, "ATTRACTION_MANAGEMENT");

    const { id } = await context.params;

    // =====================================
    // FIND AND CHECK ACCESS
    // =====================================

    let existing;

    // ============================
    // ADMIN
    // ============================

    if (auth.user.role === "ADMIN") {
      existing = await db.query.attractionManagement.findFirst({
        where: and(
          eq(attractionManagement.id, id),
          eq(attractionManagement.adminId, auth.user.id),
        ),
      });
    }

    // ============================
    // MANAGER / STAFF
    // ============================
    else {
      const allowedIds = await getAccessibleAttractionIds(auth);

      if (!allowedIds.length) {
        return failure("Access denied", 403, "FORBIDDEN");
      }

      existing = await db.query.attractionManagement.findFirst({
        where: and(
          eq(attractionManagement.id, id),
          inArray(attractionManagement.attractionId, allowedIds),
        ),
      });
    }

    if (!existing) {
      return failure("Attraction not found or access denied", 403, "FORBIDDEN");
    }

    // =====================================
    // DELETE BOTH TABLES ATOMICALLY
    // =====================================

    await db.transaction(async (tx) => {
      // Delete management details first
      // (junction rows cascade via FK on attraction_management_id)
      await tx
        .delete(attractionManagement)
        .where(eq(attractionManagement.id, id));

      // Delete main attraction
      await tx
        .delete(attractions)
        .where(eq(attractions.id, existing.attractionId));
    });

    return success({
      message: "Attraction deleted successfully",
    });
  } catch (error) {
    if (error instanceof Error) {
      // Authentication
      if (error.message === "UNAUTHORIZED") {
        return failure("Authentication required.", 401, "UNAUTHORIZED");
      }

      // Account inactive
      if (error.message === "ACCOUNT_NOT_ACTIVE") {
        return failure("Account is not active.", 403, "ACCOUNT_NOT_ACTIVE");
      }

      // Module authorization
      if (error.message === "FORBIDDEN") {
        return failure(
          "You are not authorized to access attraction management.",
          403,
          "FORBIDDEN",
        );
      }
    }

    return failure(
      "Unable to delete attraction.",
      500,
      "INTERNAL_SERVER_ERROR",
    );
  }
}
