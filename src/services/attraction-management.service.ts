import { db } from "@/db";
import {
  attractions,
  attractionManagement,
  attractionManagementSeatLayouts,
  seatLayouts,
} from "@/db/schema";

import { eq, and, ilike, inArray } from "drizzle-orm";

/** Executor that supports both `db` and transaction clients. */
type DbExecutor = Pick<typeof db, "select" | "insert" | "delete" | "update">;

export function getLegacySeatLayoutId(seatLayoutIds: string[]): string | null {
  return seatLayoutIds.length === 1 ? seatLayoutIds[0] : null;
}

/**
 * Normalize seatLayoutIds for create/update.
 * When seating is off, IDs are ignored and cleared.
 */
export function resolveSeatLayoutIds(input: {
  hasSeating: boolean;
  seatLayoutIds: unknown;
}): { ok: true; ids: string[] } | { ok: false; message: string } {
  const { hasSeating, seatLayoutIds } = input;

  if (seatLayoutIds !== undefined && !Array.isArray(seatLayoutIds)) {
    return { ok: false, message: "seatLayoutIds must be an array" };
  }

  const rawIds = hasSeating
    ? ((seatLayoutIds as unknown[] | undefined) ?? [])
    : [];

  if (hasSeating && rawIds.length === 0) {
    return {
      ok: false,
      message:
        "At least one seat layout is required when seating is enabled",
    };
  }

  const uniqueIds = [
    ...new Set(
      rawIds.map((id) => String(id)).filter((id) => id.trim().length > 0),
    ),
  ];

  if (hasSeating && uniqueIds.length === 0) {
    return {
      ok: false,
      message:
        "At least one seat layout is required when seating is enabled",
    };
  }

  return { ok: true, ids: uniqueIds };
}

/**
 * Ensure every seat layout exists and belongs to the tenant admin.
 * Required so create/edit cannot attach another tenant's layouts.
 */
export async function validateSeatLayoutsForAdmin(
  executor: DbExecutor,
  adminId: string,
  seatLayoutIds: string[],
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (seatLayoutIds.length === 0) {
    return { ok: true };
  }

  const existingSeatLayouts = await executor
    .select({
      id: seatLayouts.id,
    })
    .from(seatLayouts)
    .where(
      and(
        inArray(seatLayouts.id, seatLayoutIds),
        eq(seatLayouts.adminId, adminId),
      ),
    );

  const existingIds = new Set(
    existingSeatLayouts.map((layout) => layout.id),
  );

  const invalidSeatLayoutIds = seatLayoutIds.filter(
    (id) => !existingIds.has(id),
  );

  if (invalidSeatLayoutIds.length > 0) {
    return {
      ok: false,
      message: `Invalid seat layout IDs: ${invalidSeatLayoutIds.join(", ")}`,
    };
  }

  return { ok: true };
}

/**
 * Replace junction rows for an attraction management record.
 * Keeps ticket-booking (junction) and list APIs in sync.
 */
export async function replaceAttractionSeatLayouts(
  executor: DbExecutor,
  attractionManagementId: string,
  seatLayoutIds: string[],
) {
  await executor
    .delete(attractionManagementSeatLayouts)
    .where(
      eq(
        attractionManagementSeatLayouts.attractionManagementId,
        attractionManagementId,
      ),
    );

  if (seatLayoutIds.length === 0) {
    return [];
  }

  return executor
    .insert(attractionManagementSeatLayouts)
    .values(
      seatLayoutIds.map((seatLayoutId) => ({
        attractionManagementId,
        seatLayoutId,
      })),
    )
    .returning();
}

export async function getAttractionManagementService(
  adminId: string,
  search?: string,
) {
  const conditions = [eq(attractionManagement.adminId, adminId)];

  if (search) {
    conditions.push(ilike(attractions.name, `%${search}%`));
  }

  const data = await db
    .select({
      id: attractionManagement.id,

      attractionId: attractions.id,

      name: attractions.name,

      type: attractions.type,

      status: attractions.status,

      image: attractionManagement.image,

      description: attractionManagement.description,

      timing: attractionManagement.timing,

      pricing: {
        adult: attractionManagement.adultPrice,

        child: attractionManagement.childPrice,

        student: attractionManagement.studentPrice,

        senior: attractionManagement.seniorPrice,

        foreigner: attractionManagement.foreignerPrice,
      },

      hasSeating: attractionManagement.hasSeating,

      seatLayoutId: attractionManagement.seatLayoutId,
    })

    .from(attractionManagement)

    .innerJoin(
      attractions,
      eq(attractionManagement.attractionId, attractions.id),
    )

    .where(and(...conditions));

  return data;
}
