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

// =====================================================
// UPDATE ATTRACTION
// =====================================================

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
      return failure(
        "Attraction not found or access denied",
        403,
        "FORBIDDEN",
      );
    }

    // =====================================================
    // CATEGORIES
    // =====================================================

    const shouldSyncCategories =
      body.categories !== undefined;

    let categoriesToInsert:
      | {
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
        return failure(
          "categories must be an array.",
          400,
          "VALIDATION_ERROR",
        );
      }

      if (body.categories.length === 0) {
        return failure(
          "At least one category is required.",
          400,
          "VALIDATION_ERROR",
        );
      }

      const categoryNames = new Set<string>();

      for (const category of body.categories) {
        // ---------------------------------------------
        // CATEGORY NAME
        // ---------------------------------------------

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

        const normalizedName =
          category.name.trim().toLowerCase();

        if (categoryNames.has(normalizedName)) {
          return failure(
            `Duplicate category name: ${category.name}`,
            400,
            "VALIDATION_ERROR",
          );
        }

        categoryNames.add(normalizedName);

        // ---------------------------------------------
        // BASE PRICE
        // ---------------------------------------------

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

        // ---------------------------------------------
        // FUTURE PRICE
        // ---------------------------------------------

        let futurePrice: number | null = null;

        if (
          category.futurePrice !== undefined &&
          category.futurePrice !== null &&
          category.futurePrice !== ""
        ) {
          futurePrice = Number(category.futurePrice);

          if (
            !Number.isFinite(futurePrice) ||
            futurePrice < 0
          ) {
            return failure(
              `Invalid futurePrice for category: ${category.name}`,
              400,
              "VALIDATION_ERROR",
            );
          }
        }

        // ---------------------------------------------
        // SEAT COUNT
        // ---------------------------------------------

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

        // ---------------------------------------------
        // EFFECTIVE DATE
        // ---------------------------------------------

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

        // ---------------------------------------------
        // PREPARE CATEGORY
        // ---------------------------------------------

        categoriesToInsert ??= [];

        categoriesToInsert.push({
          name: category.name.trim(),
          basePrice,
          futurePrice,
          effectiveFrom,
          noOfSeats,
          imageLink:
            category.imageLink !== undefined
              ? category.imageLink
              : null,
        });
      }
    }

    // =====================================================
    // SEAT LAYOUTS
    // =====================================================

    const shouldSyncSeatLayouts =
      body.seatLayoutIds !== undefined ||
      body.hasSeating !== undefined;

    let seatLayoutAssignments:
      | {
          seatLayoutId: string;
          quantity: number;
          name?: string;
          position?: number;
        }[]
      | null = null;

    let expandedSeatLayoutIds: string[] | null = null;

    let resolvedSeatLayouts:
      | ReturnType<typeof resolveSeatLayoutIds>
      | null = null;

    if (shouldSyncSeatLayouts) {
      const hasSeating =
        body.hasSeating === false ? false : true;

      resolvedSeatLayouts = resolveSeatLayoutIds({
        hasSeating,
        seatLayoutIds: body.seatLayoutIds ?? [],
      });

      if (!resolvedSeatLayouts.ok) {
        return failure(
          resolvedSeatLayouts.message ===
            "At least one seat layout is required when seating is enabled"
            ? "Seat allocation is required. Select at least one seat layout."
            : resolvedSeatLayouts.message,
          400,
          "VALIDATION_ERROR",
        );
      }

      seatLayoutAssignments =
        resolvedSeatLayouts.assignments;

      expandedSeatLayoutIds =
        resolvedSeatLayouts.expandedIds;

      // ---------------------------------------------
      // VALIDATE LAYOUT OWNERSHIP
      // ---------------------------------------------

      const seatLayoutOwnership =
        await validateSeatLayoutsForAdmin(
          db,
          existing.adminId,
          resolvedSeatLayouts.uniqueIds,
        );

      if (!seatLayoutOwnership.ok) {
        return failure(
          seatLayoutOwnership.message,
          400,
          "VALIDATION_ERROR",
        );
      }
    }

    // =====================================================
    // TIME SLOTS
    // =====================================================

    const timeSlotsParsed =
      parseTimeSlotsPayload(body);

    if (!timeSlotsParsed.ok) {
      return failure(
        timeSlotsParsed.message,
        400,
        "VALIDATION_ERROR",
      );
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
        body.category !== undefined
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

            updatedAt: new Date(),
          })
          .where(
            eq(attractions.id, existing.attractionId),
          );
      }

      // =====================================================
      // UPDATE MANAGEMENT
      // =====================================================

      const managementUpdate: Partial<
        typeof attractionManagement.$inferInsert
      > = {
        updatedAt: new Date(),
      };

      // ---------------------------------------------
      // BASIC DATA
      // ---------------------------------------------

      if (body.image !== undefined) {
        managementUpdate.image = body.image;
      }

      if (body.description !== undefined) {
        managementUpdate.description =
          body.description;
      }

      if (body.timing !== undefined) {
        managementUpdate.timing = body.timing;
      }

      // ---------------------------------------------
      // DURATION
      // ---------------------------------------------

      if (body.duration !== undefined) {
        managementUpdate.duration = body.duration;
      }

      if (body.durationUnit !== undefined) {
        managementUpdate.durationUnit =
          body.durationUnit;
      }

      // ---------------------------------------------
      // SEATING
      // ---------------------------------------------

      if (body.hasSeating !== undefined) {
        managementUpdate.hasSeating =
          Boolean(body.hasSeating);
      }

      // =====================================================
      // LEGACY SEAT LAYOUT
      // =====================================================

      if (
        seatLayoutAssignments !== null &&
        expandedSeatLayoutIds !== null
      ) {
        managementUpdate.seatLayoutId =
          getLegacySeatLayoutId(
            expandedSeatLayoutIds,
          );

        managementUpdate.hasSeating =
          expandedSeatLayoutIds.length > 0;
      }

      // =====================================================
      // UPDATE MANAGEMENT ROW
      // =====================================================

      const updatedRows = await tx
        .update(attractionManagement)
        .set(managementUpdate)
        .where(
          eq(attractionManagement.id, id),
        )
        .returning();

      const updated = updatedRows[0];

      // =====================================================
      // UPDATE CATEGORIES
      // =====================================================

      let updatedCategories:
        | (typeof attractionCategory.$inferSelect)[]
        | undefined;

      if (categoriesToInsert !== null) {
        // ---------------------------------------------
        // DELETE OLD CATEGORIES
        // ---------------------------------------------

        await tx
          .delete(attractionCategory)
          .where(
            eq(
              attractionCategory.attractionManagementId,
              id,
            ),
          );

        // ---------------------------------------------
        // INSERT NEW CATEGORIES
        // ---------------------------------------------

        updatedCategories =
          await tx
            .insert(attractionCategory)
            .values(
              categoriesToInsert.map(
                (category) => ({
                  attractionManagementId: id,

                  name: category.name,

                  basePrice:
                    String(category.basePrice),

                  futurePrice:
                    category.futurePrice !==
                      undefined &&
                    category.futurePrice !== null
                      ? String(
                          category.futurePrice,
                        )
                      : null,

                  effectiveFrom:
                    category.effectiveFrom ??
                    null,

                  noOfSeats:
                    category.noOfSeats,

                  imageLink:
                    category.imageLink ??
                    null,
                }),
              ),
            )
            .returning();
      } else {
        // ---------------------------------------------
        // KEEP EXISTING CATEGORIES
        // ---------------------------------------------

        updatedCategories =
          await tx
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
      // SYNC SEAT LAYOUT JUNCTION
      // =====================================================

      let seatLayoutMappings:
        | Awaited<
            ReturnType<
              typeof replaceAttractionSeatLayouts
            >
          >
        | undefined;

      if (
        seatLayoutAssignments !== null &&
        resolvedSeatLayouts?.ok
      ) {
        seatLayoutMappings =
          await replaceAttractionSeatLayouts(
            tx,
            id,
            seatLayoutAssignments,
            resolvedSeatLayouts.fullObjects,
          );
      }

      // =====================================================
      // SYNC ATTRACTION SEATS
      // =====================================================

      let updatedAttractionSeats:
        | (typeof attractionSeats.$inferSelect)[]
        | undefined;

      if (seatLayoutAssignments !== null) {
        // ---------------------------------------------
        // DELETE OLD SEATS
        // ---------------------------------------------

        await tx
          .delete(attractionSeats)
          .where(
            eq(
              attractionSeats.attractionId,
              existing.attractionId,
            ),
          );

        const attractionSeatRows: {
          attractionId: string;
          seatLayoutId: string;
          name: string;
          seatOrder: number;
        }[] = [];

        let seatOrder = 1;

        // ---------------------------------------------
        // CREATE NEW SEATS
        // ---------------------------------------------

        for (
          const [
            index,
            assignment,
          ] of seatLayoutAssignments.entries()
        ) {
          const quantity =
            assignment.quantity ?? 1;

          const layout =
            resolvedSeatLayouts?.fullObjects[index];

          if (!layout) {
            throw new Error(
              `Seat layout not found at position ${
                index + 1
              }`,
            );
          }

          for (
            let i = 0;
            i < quantity;
            i++
          ) {
            attractionSeatRows.push({
              attractionId:
                existing.attractionId,

              seatLayoutId:
                assignment.seatLayoutId,

              // Use the actual seat/layout name
              // instead of "Seat 1", "Seat 2", etc.
              name: layout.name ?? "",

              seatOrder,
            });

            seatOrder++;
          }
        }

        // ---------------------------------------------
        // INSERT NEW SEATS
        // ---------------------------------------------

        if (attractionSeatRows.length > 0) {
          updatedAttractionSeats =
            await tx
              .insert(attractionSeats)
              .values(attractionSeatRows)
              .returning();
        } else {
          updatedAttractionSeats = [];
        }
      }

      // =====================================================
      // TIME SLOTS
      // =====================================================

      let timeSlots:
        | Awaited<
            ReturnType<
              typeof syncAttractionTimeSlots
            >
          >
        | undefined;

      if (timeSlotsParsed.sync) {
        timeSlots =
          await syncAttractionTimeSlots(
            tx,
            existing.attractionId,
            timeSlotsParsed.slots,
          );
      } else {
        const map =
          await listTimeSlotsByAttractionIds(
            tx,
            [existing.attractionId],
          );

        timeSlots =
          map.get(
            existing.attractionId,
          ) ?? [];
      }

      // =====================================================
      // GET SEAT LAYOUT RESPONSE
      // =====================================================

      let seatLayoutsResponse:
        | {
            id: string;
            quantity: number;
            [key: string]: unknown;
          }[]
        | undefined;

      if (seatLayoutMappings !== undefined) {
        const layoutIds =
          seatLayoutMappings.map(
            (mapping) =>
              mapping.seatLayoutId,
          );

        if (layoutIds.length > 0) {
          const layouts =
            await tx
              .select()
              .from(seatLayouts)
              .where(
                inArray(
                  seatLayouts.id,
                  layoutIds,
                ),
              );

          const layoutMap = new Map(
            layouts.map((layout) => [
              layout.id,
              layout,
            ]),
          );

          seatLayoutsResponse =
            seatLayoutMappings.map(
              (mapping) => ({
                ...(layoutMap.get(
                  mapping.seatLayoutId,
                ) ?? {}),

                quantity:
                  mapping.quantity ?? 1,
              }),
            ) as {
              id: string;
              quantity: number;
              [key: string]: unknown;
            }[];
        } else {
          seatLayoutsResponse = [];
        }
      }

      // =====================================================
      // RETURN
      // =====================================================

      return {
        management: updated,

        categories:
          updatedCategories,

        seatLayouts:
          seatLayoutsResponse,

        seatLayoutIds:
          expandedSeatLayoutIds ??
          undefined,

        attractionSeats:
          updatedAttractionSeats,

        timeSlots,
      };
    });

    // =====================================================
    // RESPONSE
    // =====================================================

    const sanitizedResponse = {
      ...result.management,

      // ---------------------------------------------
      // DYNAMIC CATEGORIES
      // ---------------------------------------------

      categories:
        Array.isArray(result.categories)
          ? result.categories.map(
              (category) => ({
                id: category.id,

                name: category.name,

                basePrice:
                  Number(
                    category.basePrice,
                  ),

                futurePrice:
                  category.futurePrice !==
                  null
                    ? Number(
                        category.futurePrice,
                      )
                    : null,

                effectiveFrom:
                  category.effectiveFrom,

                noOfSeats:
                  category.noOfSeats,

                imageLink:
                  category.imageLink,
              }),
            )
          : [],

      // ---------------------------------------------
      // SEAT LAYOUTS
      // ---------------------------------------------

      ...(Array.isArray(
        result.seatLayouts,
      )
        ? {
            seatLayouts:
              result.seatLayouts.map(
                (layout: any) => ({
                  id: layout.id,
                  name: layout.name,
                  rows: layout.rows,
                  cols: layout.cols,
                  hasAisle:
                    layout.hasAisle,
                  aisleAfterCol:
                    layout.aisleAfterCol,
                  status: layout.status,
                  quantity:
                    layout.quantity,
                  totalSeats:
                    layout.totalSeats,
                }),
              ),
          }
        : {}),

      // ---------------------------------------------
      // SEAT LAYOUT IDS
      // ---------------------------------------------

      ...(Array.isArray(
        result.seatLayoutIds,
      ) &&
      result.seatLayoutIds.length > 0
        ? {
            seatLayoutIds:
              result.seatLayoutIds,
          }
        : {}),

      // ---------------------------------------------
      // ATTRACTION SEATS
      // ---------------------------------------------

      ...(Array.isArray(
        result.attractionSeats,
      )
        ? {
            attractionSeats:
              result.attractionSeats.map(
                (seat: any) => ({
                  id: seat.id,

                  attractionId:
                    seat.attractionId,

                  seatLayoutId:
                    seat.seatLayoutId,

                  name: seat.name,

                  seatOrder:
                    seat.seatOrder,

                  createdAt:
                    seat.createdAt,
                }),
              ),
          }
        : {}),

      // ---------------------------------------------
      // TIME SLOTS
      // ---------------------------------------------

      timeSlots:
        Array.isArray(
          result.timeSlots,
        )
          ? result.timeSlots.map(
              (slot: any) => ({
                id: slot.id,

                attractionId:
                  slot.attractionId,

                slotTime:
                  slot.slotTime,

                isActive:
                  slot.isActive,
              }),
            )
          : [],
    };

    return success(
      sanitizedResponse,
    );
  } catch (error) {
    console.error(
      "Update attraction error:",
      error,
    );

    if (error instanceof Error) {
      console.error(
        "Error message:",
        error.message,
      );

      console.error(
        "Error code:",
        (error as any).code,
      );

      console.error(
        "Error detail:",
        (error as any).detail,
      );
    }

    if (error instanceof Error) {
      // =====================================================
      // DATABASE CONSTRAINT ERROR
      // =====================================================

      const errorStr =
        error.message.toLowerCase();

      if (
        errorStr.includes("foreign key") ||
        errorStr.includes("23503")
      ) {
        return failure(
          "One or more seat layouts do not exist in the database.",
          400,
          "VALIDATION_ERROR",
        );
      }

      if (
        errorStr.includes("unique") ||
        errorStr.includes("23505")
      ) {
        return failure(
          "Duplicate seat layout assignment detected.",
          400,
          "VALIDATION_ERROR",
        );
      }

      // =====================================================
      // TIME SLOT ERROR
      // =====================================================

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

      // =====================================================
      // AUTHENTICATION
      // =====================================================

      if (
        error.message ===
        "UNAUTHORIZED"
      ) {
        return failure(
          "Authentication required.",
          401,
          "UNAUTHORIZED",
        );
      }

      // =====================================================
      // ACCOUNT STATUS
      // =====================================================

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

      // =====================================================
      // AUTHORIZATION
      // =====================================================

      if (
        error.message ===
        "FORBIDDEN"
      ) {
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
