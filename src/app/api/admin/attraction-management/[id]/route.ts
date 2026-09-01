import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import {
  attractionManagement,
  attractions,
  attractionSeats,
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
  parseCategorySeatCounts,
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
      return failure("Attraction not found or access denied", 403, "FORBIDDEN");
    }

    // =====================================================
    // SEAT LAYOUTS
    // =====================================================

    const shouldSyncSeatLayouts =
      body.seatLayoutIds !== undefined || body.hasSeating !== undefined;

    let seatLayoutAssignments:
      | {
          seatLayoutId: string;
          quantity: number;
        }[]
      | null = null;

    let expandedSeatLayoutIds: string[] | null = null;

    let resolvedSeatLayouts: ReturnType<typeof resolveSeatLayoutIds> | null =
      null;

    if (shouldSyncSeatLayouts) {
      const hasSeating = body.hasSeating === false ? false : true;

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

      // IMPORTANT:
      // assignments contains unique layout + quantity
      //
      // Example input:
      // ["layout-1", "layout-1", "layout-2"]
      //
      // assignments:
      // [
      //   { seatLayoutId: "layout-1", quantity: 2 },
      //   { seatLayoutId: "layout-2", quantity: 1 }
      // ]

      seatLayoutAssignments = resolvedSeatLayouts.assignments;

      // Expanded form:
      //
      // [
      //   "layout-1",
      //   "layout-1",
      //   "layout-2"
      // ]

      expandedSeatLayoutIds = resolvedSeatLayouts.expandedIds;

      // =====================================================
      // VALIDATE LAYOUT OWNERSHIP
      // =====================================================

      const seatLayoutOwnership = await validateSeatLayoutsForAdmin(
        db,
        existing.adminId,
        resolvedSeatLayouts.uniqueIds,
      );

      if (!seatLayoutOwnership.ok) {
        return failure(seatLayoutOwnership.message, 400, "VALIDATION_ERROR");
      }
    }

    // =====================================================
    // SEAT CATEGORY COUNTS
    // =====================================================

    const seatFieldProvided = [
      "adultSeats",
      "childSeats",
      "studentSeats",
      "seniorSeats",
      "foreignerSeats",
    ].some((key) => body[key] !== undefined);

    let parsedSeatCounts: ReturnType<typeof parseCategorySeatCounts> | null =
      null;

    if (seatFieldProvided) {
      parsedSeatCounts = parseCategorySeatCounts(body, {
        required: true,
      });

      if (!parsedSeatCounts.ok) {
        return failure(parsedSeatCounts.message, 400, "VALIDATION_ERROR");
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

      // -----------------------------
      // BASIC DATA
      // -----------------------------

      if (body.image !== undefined) {
        managementUpdate.image = body.image;
      }

      if (body.description !== undefined) {
        managementUpdate.description = body.description;
      }

      if (body.timing !== undefined) {
        managementUpdate.timing = body.timing;
      }

      // -----------------------------
      // DURATION
      // -----------------------------

      if (body.duration !== undefined) {
        managementUpdate.duration = body.duration;
      }

      if (body.durationUnit !== undefined) {
        managementUpdate.durationUnit = body.durationUnit;
      }

      // -----------------------------
      // PRICES
      // -----------------------------

      if (body.adultPrice !== undefined) {
        managementUpdate.adultPrice = body.adultPrice;
      }

      if (body.childPrice !== undefined) {
        managementUpdate.childPrice = body.childPrice;
      }

      if (body.studentPrice !== undefined) {
        managementUpdate.studentPrice = body.studentPrice;
      }

      if (body.seniorPrice !== undefined) {
        managementUpdate.seniorPrice = body.seniorPrice;
      }

      if (body.foreignerPrice !== undefined) {
        managementUpdate.foreignerPrice = body.foreignerPrice;
      }

      // -----------------------------
      // SEATING
      // -----------------------------

      if (body.hasSeating !== undefined) {
        managementUpdate.hasSeating = Boolean(body.hasSeating);
      }

      if (parsedSeatCounts?.ok) {
        Object.assign(managementUpdate, parsedSeatCounts.seats);
      }

      // =====================================================
      // LEGACY SEAT LAYOUT
      // =====================================================

      if (seatLayoutAssignments !== null && expandedSeatLayoutIds !== null) {
        managementUpdate.seatLayoutId = getLegacySeatLayoutId(
          expandedSeatLayoutIds,
        );

        managementUpdate.hasSeating = expandedSeatLayoutIds.length > 0;
      }

      // =====================================================
      // UPDATE MANAGEMENT ROW
      // =====================================================

      const updatedRows = await tx
        .update(attractionManagement)
        .set(managementUpdate)
        .where(eq(attractionManagement.id, id))
        .returning();

      const updated = updatedRows[0];

      // =====================================================
      // SYNC SEAT LAYOUT JUNCTION
      // =====================================================

      let seatLayoutMappings:
        | Awaited<ReturnType<typeof replaceAttractionSeatLayouts>>
        | undefined;

      if (seatLayoutAssignments !== null && resolvedSeatLayouts?.ok) {
        seatLayoutMappings = await replaceAttractionSeatLayouts(
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
          .where(eq(attractionSeats.attractionId, existing.attractionId));

        // ---------------------------------------------
        // CREATE NEW SEATS
        // ---------------------------------------------
        //
        // IMPORTANT:
        //
        // seatLayoutAssignments already contains
        // quantity information.
        //
        // Example:
        //
        // [
        //   {
        //     seatLayoutId: "layout-1",
        //     quantity: 3
        //   },
        //   {
        //     seatLayoutId: "layout-2",
        //     quantity: 1
        //   }
        // ]
        //
        // This creates:
        //
        // layout-1 -> Seat 1
        // layout-1 -> Seat 2
        // layout-1 -> Seat 3
        // layout-2 -> Seat 4
        //
        // ---------------------------------------------

        const attractionSeatRows: {
          attractionId: string;
          seatLayoutId: string;
          name: string;
          seatOrder: number;
        }[] = [];

        let seatOrder = 1;

        for (const assignment of seatLayoutAssignments) {
          const quantity = assignment.quantity ?? 1;

          const layout = resolvedSeatLayouts?.fullObjects.find(
            (layout) => layout.id === assignment.seatLayoutId,
          );

          if (!layout) {
            throw new Error(
              `Seat layout not found: ${assignment.seatLayoutId}`,
            );
          }

          for (let i = 0; i < quantity; i++) {
            attractionSeatRows.push({
              attractionId: existing.attractionId,

              seatLayoutId: assignment.seatLayoutId,

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
          updatedAttractionSeats = await tx
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
        const layoutIds = seatLayoutMappings.map(
          (mapping) => mapping.seatLayoutId,
        );

        if (layoutIds.length > 0) {
          const layouts = await tx
            .select()
            .from(seatLayouts)
            .where(inArray(seatLayouts.id, layoutIds));

          const layoutMap = new Map(
            layouts.map((layout) => [layout.id, layout]),
          );

          seatLayoutsResponse = seatLayoutMappings.map((mapping) => ({
            ...(layoutMap.get(mapping.seatLayoutId) ?? {}),
            quantity: mapping.quantity ?? 1,
          })) as {
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

        seatLayouts: seatLayoutsResponse,

        seatLayoutIds: expandedSeatLayoutIds ?? undefined,

        attractionSeats: updatedAttractionSeats,

        timeSlots,
      };
    });

    // =====================================================
    // RESPONSE
    // =====================================================

    const sanitizedResponse = {
      ...result.management,

      ...(Array.isArray(result.seatLayouts)
        ? {
            seatLayouts: result.seatLayouts.map((layout: any) => ({
              id: layout.id,
              name: layout.name,
              rows: layout.rows,
              cols: layout.cols,
              hasAisle: layout.hasAisle,
              aisleAfterCol: layout.aisleAfterCol,
              status: layout.status,
              quantity: layout.quantity,
              totalSeats: layout.totalSeats,
            })),
          }
        : {}),

      ...(Array.isArray(result.seatLayoutIds) && result.seatLayoutIds.length > 0
        ? {
            seatLayoutIds: result.seatLayoutIds,
          }
        : {}),

      ...(Array.isArray(result.attractionSeats)
        ? {
            attractionSeats: result.attractionSeats.map((seat: any) => ({
              id: seat.id,
              attractionId: seat.attractionId,
              seatLayoutId: seat.seatLayoutId,
              name: seat.name,
              seatOrder: seat.seatOrder,
              createdAt: seat.createdAt,
            })),
          }
        : {}),

      timeSlots: Array.isArray(result.timeSlots)
        ? result.timeSlots.map((slot: any) => ({
            id: slot.id,
            attractionId: slot.attractionId,
            slotTime: slot.slotTime,
            isActive: slot.isActive,
          }))
        : [],
    };

    return success(sanitizedResponse);
  } catch (error) {
    console.error("Update attraction error:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error code:", (error as any).code);
      console.error("Error detail:", (error as any).detail);
    }

    if (error instanceof Error) {
      // =====================================================
      // DATABASE CONSTRAINT ERROR
      // =====================================================

      const errorStr = error.message.toLowerCase();

      if (errorStr.includes("foreign key") || errorStr.includes("23503")) {
        return failure(
          "One or more seat layouts do not exist in the database.",
          400,
          "VALIDATION_ERROR",
        );
      }

      if (errorStr.includes("unique") || errorStr.includes("23505")) {
        return failure(
          "Duplicate seat layout assignment detected.",
          400,
          "VALIDATION_ERROR",
        );
      }

      // =====================================================
      // TIME SLOT ERROR
      // =====================================================

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

      // =====================================================
      // AUTHENTICATION
      // =====================================================

      if (error.message === "UNAUTHORIZED") {
        return failure("Authentication required.", 401, "UNAUTHORIZED");
      }

      // =====================================================
      // ACCOUNT STATUS
      // =====================================================

      if (error.message === "ACCOUNT_NOT_ACTIVE") {
        return failure("Account is not active.", 403, "ACCOUNT_NOT_ACTIVE");
      }

      // =====================================================
      // AUTHORIZATION
      // =====================================================

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
