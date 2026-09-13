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
  listTimeSlotsByAttractionIds,
  parseTimeSlotsPayload,
  syncAttractionTimeSlots,
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
    console.log("PATCH body:", body);

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

    console.log("existing:", existing);

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
    // Existing seat:
    //   attractionSeatId is provided.
    //   Find attraction_seats.id using that value.
    //   Update only mutable fields.
    //
    // New seat:
    //   attractionSeatId is NOT provided.
    //   seatLayoutId is required.
    //   Create a new attraction_seats row.
    //
    // Missing existing seats from the payload are NOT deleted.
    // =====================================================

    const shouldUpdateAttractionSeats = body.seatLayoutIds !== undefined;

    let seatUpdates:
      | {
          attractionSeatId?: string;
          seatLayoutId?: string;
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
        if (!seat) {
          return failure(
            "Invalid seat data.",
            400,
            "VALIDATION_ERROR",
          );
        }

        // -------------------------------------------------
        // attractionSeatId is optional.
        // If provided, it must be a valid non-empty string.
        // -------------------------------------------------

        if (
          seat.attractionSeatId !== undefined &&
          (typeof seat.attractionSeatId !== "string" ||
            !seat.attractionSeatId.trim())
        ) {
          return failure(
            "attractionSeatId must be a valid ID when provided.",
            400,
            "VALIDATION_ERROR",
          );
        }

        // -------------------------------------------------
        // New seat must have seatLayoutId.
        // Existing seat does not need it because its
        // seatLayoutId should not be changed.
        // -------------------------------------------------

        if (
          seat.attractionSeatId === undefined &&
          (seat.seatLayoutId === undefined ||
            seat.seatLayoutId === null ||
            !String(seat.seatLayoutId).trim())
        ) {
          return failure(
            "seatLayoutId is required when creating a new attraction seat.",
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
            `Invalid position for seat ${
              seat.attractionSeatId ?? "new seat"
            }.`,
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
            `Invalid status for seat ${
              seat.attractionSeatId ?? "new seat"
            }.`,
            400,
            "VALIDATION_ERROR",
          );
        }

        seatUpdates.push({
          attractionSeatId:
            seat.attractionSeatId !== undefined
              ? seat.attractionSeatId.trim()
              : undefined,

          seatLayoutId:
            seat.seatLayoutId !== undefined
              ? String(seat.seatLayoutId).trim()
              : undefined,

          name:
            seat.name !== undefined
              ? String(seat.name)
              : undefined,

          status:
            seat.status !== undefined
              ? String(seat.status)
              : undefined,

          position:
            seat.position !== undefined
              ? Number(seat.position)
              : undefined,
        });
      }
    }

    console.log("seatUpdates:", seatUpdates);

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

      if (
        body.name !== undefined ||
        body.category !== undefined ||
        body.status !== undefined
      ) {
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

            ...(body.status !== undefined
              ? {
                  status: body.status,
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
                  eq(
                    attractionCategory.attractionManagementId,
                    id,
                  ),
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
          .where(
            eq(
              attractionCategory.attractionManagementId,
              id,
            ),
          );
      } else {
        updatedCategories = await tx
          .select()
          .from(attractionCategory)
          .where(
            eq(
              attractionCategory.attractionManagementId,
              id,
            ),
          );
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
          .where(
            eq(
              attractionSeats.attractionId,
              existing.attractionId,
            ),
          );

        // ---------------------------------------------------
        // MAP BY attraction_seats.id
        // ---------------------------------------------------

        const existingSeatMap = new Map(
          existingSeats.map((seat) => [seat.id, seat]),
        );

        // ---------------------------------------------------
        // PROCESS EACH INCOMING SEAT
        // ---------------------------------------------------

        for (const seat of seatUpdates) {
          // =================================================
          // CASE 1: EXISTING ATTRACTION SEAT
          // =================================================

          if (seat.attractionSeatId) {
            const existingSeat = existingSeatMap.get(
              seat.attractionSeatId,
            );

            if (!existingSeat) {
              throw new Error(
                `ATTRACTION_SEAT_NOT_FOUND:${seat.attractionSeatId}`,
              );
            }

            const updateData: Partial<
              typeof attractionSeats.$inferInsert
            > = {};

            if (seat.name !== undefined) {
              updateData.name = seat.name;
            }

            if (seat.position !== undefined) {
              updateData.seatOrder = seat.position;
            }

            if (seat.status !== undefined) {
              updateData.isActive = seat.status === "active";
            }

            // Do not update:
            // id
            // attractionId
            // seatLayoutId

            if (Object.keys(updateData).length > 0) {
              await tx
                .update(attractionSeats)
                .set(updateData)
                .where(
                  and(
                    eq(
                      attractionSeats.id,
                      existingSeat.id,
                    ),
                    eq(
                      attractionSeats.attractionId,
                      existing.attractionId,
                    ),
                  ),
                );
            }

            continue;
          }

          // =================================================
          // CASE 2: NEW ATTRACTION SEAT
          // =================================================

          if (!seat.seatLayoutId) {
            throw new Error(
              "SEAT_LAYOUT_ID_REQUIRED",
            );
          }

          // -------------------------------------------------
          // Verify seat layout exists and is active
          // -------------------------------------------------

          const [seatLayout] = await tx
            .select({
              id: seatLayouts.id,
            })
            .from(seatLayouts)
            .where(
              and(
                eq(
                  seatLayouts.id,
                  seat.seatLayoutId,
                ),
                eq(
                  seatLayouts.status,
                  "ACTIVE",
                ),
              ),
            )
            .limit(1);

          if (!seatLayout) {
            throw new Error(
              `SEAT_LAYOUT_NOT_FOUND:${seat.seatLayoutId}`,
            );
          }

          // -------------------------------------------------
          // No ID is provided here.
          // attractionSeats.id uses DB defaultRandom().
          // -------------------------------------------------

          await tx.insert(attractionSeats).values({
            attractionId: existing.attractionId,

            seatLayoutId: seat.seatLayoutId,

            name: seat.name ?? "",

            seatOrder: seat.position ?? 1,

            isActive: seat.status !== "inactive",
          });
        }

        // ---------------------------------------------------
        // GET UPDATED ATTRACTION SEATS
        // ---------------------------------------------------

        updatedAttractionSeats = await tx
          .select()
          .from(attractionSeats)
          .where(
            eq(
              attractionSeats.attractionId,
              existing.attractionId,
            ),
          );
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
    };

    return success(sanitizedResponse);
  } catch (error) {
    console.error("Update attraction error:", error);

    if (error instanceof Error) {
      console.error("Error message:", error.message);

      // ===================================================
      // ATTRACTION SEAT NOT FOUND
      // ===================================================

      if (
        error.message.startsWith(
          "ATTRACTION_SEAT_NOT_FOUND:",
        )
      ) {
        const attractionSeatId = error.message.replace(
          "ATTRACTION_SEAT_NOT_FOUND:",
          "",
        );

        return failure(
          `Attraction seat ${attractionSeatId} not found for this attraction.`,
          400,
          "VALIDATION_ERROR",
        );
      }

      // ===================================================
      // SEAT LAYOUT ID REQUIRED
      // ===================================================

      if (
        error.message ===
        "SEAT_LAYOUT_ID_REQUIRED"
      ) {
        return failure(
          "seatLayoutId is required when creating a new attraction seat.",
          400,
          "VALIDATION_ERROR",
        );
      }

      // ===================================================
      // SEAT LAYOUT NOT FOUND
      // ===================================================

      if (
        error.message.startsWith(
          "SEAT_LAYOUT_NOT_FOUND:",
        )
      ) {
        const seatLayoutId = error.message.replace(
          "SEAT_LAYOUT_NOT_FOUND:",
          "",
        );

        return failure(
          `Seat layout ${seatLayoutId} not found or inactive. Cannot create attraction seat.`,
          400,
          "VALIDATION_ERROR",
        );
      }

      // ===================================================
      // DATABASE CONSTRAINT ERROR
      // ===================================================

      const errorStr = error.message.toLowerCase();

      if (
        errorStr.includes("foreign key") ||
        errorStr.includes("23503")
      ) {
        return failure(
          "Invalid attraction seat reference.",
          400,
          "VALIDATION_ERROR",
        );
      }

      if (
        errorStr.includes("unique") ||
        errorStr.includes("23505")
      ) {
        return failure(
          "Duplicate attraction seat assignment detected.",
          400,
          "VALIDATION_ERROR",
        );
      }

      // ===================================================
      // TIME SLOT ERROR
      // ===================================================

      if (
        error.message.startsWith(
          "TIME_SLOT_NOT_FOUND:",
        )
      ) {
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
        return failure(
          "Authentication required.",
          401,
          "UNAUTHORIZED",
        );
      }

      // ===================================================
      // ACCOUNT STATUS
      // ===================================================

      if (
        error.message ===
        "ACCOUNT_NOT_ACTIVE"
      ) {
        return failure(
          "Account is not active.",
          403,
          "ACCOUNT_NOT_ACTIVE",
        );
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
      return failure(
        "Attraction not found or access denied",
        403,
        "FORBIDDEN",
      );
    }

    // =====================================
    // DELETE BOTH TABLES ATOMICALLY
    // =====================================

    await db.transaction(async (tx) => {
      // Delete management details first.
      // Related junction rows will cascade
      // through attraction_management_id.

      await tx
        .delete(attractionManagement)
        .where(eq(attractionManagement.id, id));

      // Delete main attraction.
      //
      // No transaction/booking records are
      // explicitly deleted here.

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
        return failure(
          "Authentication required.",
          401,
          "UNAUTHORIZED",
        );
      }

      // Account inactive

      if (error.message === "ACCOUNT_NOT_ACTIVE") {
        return failure(
          "Account is not active.",
          403,
          "ACCOUNT_NOT_ACTIVE",
        );
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
