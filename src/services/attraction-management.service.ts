import { db } from "@/db";
import {
  attractions,
  attractionManagement,
  attractionManagementSeatLayouts,
  attractionTimeSlots,
  seatLayouts,
} from "@/db/schema";

import { eq, and, ilike, inArray, asc } from "drizzle-orm";

/** Executor that supports both `db` and transaction clients. */
type DbExecutor = Pick<typeof db, "select" | "insert" | "delete" | "update">;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Future FE contract — optional on create/update.
 * Omit `timeSlots` → backend leaves existing rows untouched (current UI safe).
 * Send `timeSlots` (including `[]`) → sync that attraction's slots.
 *
 * Keys per item: `id?`, `slotTime`, `isActive`
 */
export type AttractionTimeSlotInput = {
  id?: string;
  slotTime: string;
  isActive: boolean;
};

export type AttractionTimeSlotDto = {
  id: string;
  attractionId: string;
  slotTime: string;
  isActive: boolean;
};

export function getLegacySeatLayoutId(seatLayoutIds: string[]): string | null {
  const unique = [...new Set(seatLayoutIds)];
  if (unique.length !== 1) return null;

  const id = unique[0];
  // Only return if it's a valid UUID format (database requirement)
  // Otherwise return null to use junction table instead
  return UUID_RE.test(id) ? id : null;
}

/**
 * Normalize to HH:MM:SS for Postgres `time`.
 * Accepts "HH:MM" or "HH:MM:SS".
 */
export function normalizeSlotTime(
  raw: unknown,
): { ok: true; value: string } | { ok: false; message: string } {
  if (typeof raw !== "string" || !raw.trim()) {
    return { ok: false, message: "slotTime is required (HH:MM or HH:MM:SS)" };
  }

  const value = raw.trim();
  const match = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/.exec(value);

  if (!match) {
    return {
      ok: false,
      message: `Invalid slotTime "${value}". Use HH:MM or HH:MM:SS (24-hour).`,
    };
  }

  const hours = match[1];
  const minutes = match[2];
  const seconds = match[3] ?? "00";

  return { ok: true, value: `${hours}:${minutes}:${seconds}` };
}

/**
 * Parse optional `timeSlots` from request body.
 * Returns sync:false when the key is omitted (no DB changes).
 */
export function parseTimeSlotsPayload(
  body: Record<string, unknown>,
):
  | { ok: true; sync: false }
  | { ok: true; sync: true; slots: AttractionTimeSlotInput[] }
  | { ok: false; message: string } {
  if (!Object.prototype.hasOwnProperty.call(body, "timeSlots")) {
    return { ok: true, sync: false };
  }

  const raw = body.timeSlots;

  if (!Array.isArray(raw)) {
    return { ok: false, message: "timeSlots must be an array" };
  }

  const slots: AttractionTimeSlotInput[] = [];
  const seenTimes = new Set<string>();

  for (let index = 0; index < raw.length; index++) {
    const item = raw[index];

    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return {
        ok: false,
        message: `timeSlots[${index}] must be an object`,
      };
    }

    const record = item as Record<string, unknown>;
    const normalized = normalizeSlotTime(record.slotTime);

    if (!normalized.ok) {
      return {
        ok: false,
        message: `timeSlots[${index}]: ${normalized.message}`,
      };
    }

    if (seenTimes.has(normalized.value)) {
      return {
        ok: false,
        message: `Duplicate slotTime "${normalized.value}" in timeSlots`,
      };
    }
    seenTimes.add(normalized.value);

    let id: string | undefined;
    if (record.id !== undefined && record.id !== null && record.id !== "") {
      if (typeof record.id !== "string" || !UUID_RE.test(record.id)) {
        return {
          ok: false,
          message: `timeSlots[${index}].id must be a valid UUID`,
        };
      }
      id = record.id;
    }

    if (typeof record.isActive !== "boolean") {
      return {
        ok: false,
        message: `timeSlots[${index}].isActive must be a boolean`,
      };
    }

    slots.push({
      id,
      slotTime: normalized.value,
      isActive: record.isActive,
    });
  }

  return { ok: true, sync: true, slots };
}

function formatSlotTime(value: unknown): string {
  if (typeof value === "string") {
    const normalized = normalizeSlotTime(value);
    return normalized.ok ? normalized.value : value;
  }
  return String(value ?? "");
}

export async function listTimeSlotsByAttractionIds(
  executor: DbExecutor,
  attractionIds: string[],
): Promise<Map<string, AttractionTimeSlotDto[]>> {
  const map = new Map<string, AttractionTimeSlotDto[]>();

  if (attractionIds.length === 0) {
    return map;
  }

  const rows = await executor
    .select({
      id: attractionTimeSlots.id,
      attractionId: attractionTimeSlots.attractionId,
      slotTime: attractionTimeSlots.slotTime,
      isActive: attractionTimeSlots.isActive,
    })
    .from(attractionTimeSlots)
    .where(inArray(attractionTimeSlots.attractionId, attractionIds))
    .orderBy(asc(attractionTimeSlots.slotTime));

  for (const row of rows) {
    const list = map.get(row.attractionId) ?? [];
    list.push({
      id: row.id,
      attractionId: row.attractionId,
      slotTime: formatSlotTime(row.slotTime),
      isActive: row.isActive,
    });
    map.set(row.attractionId, list);
  }

  return map;
}

/**
 * Sync time slots for one attraction.
 * - Upsert by id or slotTime
 * - Rows missing from payload are soft-deactivated (isActive=false)
 *   so booking FKs (ON DELETE RESTRICT) are not broken
 */
export async function syncAttractionTimeSlots(
  executor: DbExecutor,
  attractionId: string,
  slots: AttractionTimeSlotInput[],
): Promise<AttractionTimeSlotDto[]> {
  const existing = await executor
    .select({
      id: attractionTimeSlots.id,
      slotTime: attractionTimeSlots.slotTime,
      isActive: attractionTimeSlots.isActive,
    })
    .from(attractionTimeSlots)
    .where(eq(attractionTimeSlots.attractionId, attractionId));

  const byId = new Map(existing.map((row) => [row.id, row]));
  const byTime = new Map(
    existing.map((row) => [formatSlotTime(row.slotTime), row]),
  );

  const keptIds = new Set<string>();

  for (const slot of slots) {
    const matchedById = slot.id ? byId.get(slot.id) : undefined;

    if (slot.id && !matchedById) {
      throw new Error(`TIME_SLOT_NOT_FOUND:${slot.id}`);
    }

    if (matchedById) {
      await executor
        .update(attractionTimeSlots)
        .set({
          slotTime: slot.slotTime,
          isActive: slot.isActive,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(attractionTimeSlots.id, matchedById.id),
            eq(attractionTimeSlots.attractionId, attractionId),
          ),
        );
      keptIds.add(matchedById.id);
      continue;
    }

    const matchedByTime = byTime.get(slot.slotTime);

    if (matchedByTime) {
      await executor
        .update(attractionTimeSlots)
        .set({
          isActive: slot.isActive,
          updatedAt: new Date(),
        })
        .where(eq(attractionTimeSlots.id, matchedByTime.id));
      keptIds.add(matchedByTime.id);
      continue;
    }

    const inserted = await executor
      .insert(attractionTimeSlots)
      .values({
        attractionId,
        slotTime: slot.slotTime,
        isActive: slot.isActive,
      })
      .returning({
        id: attractionTimeSlots.id,
      });

    keptIds.add(inserted[0].id);
  }

  const toDeactivate = existing.filter((row) => !keptIds.has(row.id));

  if (toDeactivate.length > 0) {
    await executor
      .update(attractionTimeSlots)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(
        inArray(
          attractionTimeSlots.id,
          toDeactivate.map((row) => row.id),
        ),
      );
  }

  const map = await listTimeSlotsByAttractionIds(executor, [attractionId]);
  return map.get(attractionId) ?? [];
}

/**
 * Parse and validate per-category seat counts.
 * Required on create; on update validate only when provided.
 */
export function parseCategorySeatCounts(
  body: Record<string, unknown>,
  options: { required: boolean },
):
  | {
      ok: true;
      seats: {
        adultSeats: number;
        childSeats: number;
        studentSeats: number;
        seniorSeats: number;
        foreignerSeats: number;
      };
    }
  | { ok: false; message: string } {
  const keys = [
    "adultSeats",
    "childSeats",
    "studentSeats",
    "seniorSeats",
    "foreignerSeats",
  ] as const;

  const seats = {
    adultSeats: 0,
    childSeats: 0,
    studentSeats: 0,
    seniorSeats: 0,
    foreignerSeats: 0,
  };

  for (const key of keys) {
    const raw = body[key];

    if (raw === undefined || raw === null || raw === "") {
      if (options.required) {
        return {
          ok: false,
          message: `${key} is required and must be at least 1`,
        };
      }
      continue;
    }

    const value = Number(raw);

    if (!Number.isInteger(value) || value < 1) {
      return {
        ok: false,
        message: `${key} must be a whole number of at least 1`,
      };
    }

    seats[key] = value;
  }

  if (options.required) {
    for (const key of keys) {
      if (seats[key] < 1) {
        return {
          ok: false,
          message: `${key} is required and must be at least 1`,
        };
      }
    }
  }

  return { ok: true, seats };
}

/**
 * Normalize seatLayoutIds for create/update.
 * Preserves multiplicity (quantity semantics): same ID may appear more than once.
 * When seating is off, IDs are ignored and cleared.
 */
export function resolveSeatLayoutIds(input: {
  hasSeating: boolean;
  seatLayoutIds: unknown;
}):
  | {
      ok: true;
      /** Deduped IDs for ownership validation */
      uniqueIds: string[];
      /** Assignments with quantity for DB storage */
      assignments: { seatLayoutId: string; quantity: number }[];
      /** Expanded ID list (ID repeated `quantity` times) for FE chips */
      expandedIds: string[];
      /** Full objects with position and status info for persistence */
      fullObjects: Array<{ id: string; position: number; isEnabled: boolean; name?: string; status?: string }>;
    }
  | { ok: false; message: string } {
  const { hasSeating, seatLayoutIds } = input;

  if (seatLayoutIds !== undefined && !Array.isArray(seatLayoutIds)) {
    return { ok: false, message: "seatLayoutIds must be an array" };
  }

  const rawIds = hasSeating
    ? ((seatLayoutIds as unknown[] | undefined) ?? [])
    : [];

  // Extract IDs from both string and object formats
  // Only count ENABLED seats toward quantity; keep disabled for validation
  const cleaned = rawIds
    .map((item) => {
      if (typeof item === "string") {
        return { id: item.trim(), status: "active" };
      } else if (item && typeof item === "object" && "id" in item) {
        const obj = item as { id?: unknown; status?: string };
        return {
          id: String(obj.id || "").trim(),
          status: obj.status || "active",
        };
      }
      return { id: String(item).trim(), status: "active" };
    })
    .filter((item) => item.id.length > 0);

  // Separate enabled and disabled
  const enabledItems = cleaned.filter((item) => item.status === "active");

  if (hasSeating && enabledItems.length === 0) {
    return {
      ok: false,
      message:
        "At least one seat layout is required when seating is enabled",
    };
  }

  // IMPORTANT: Store each allocation separately, don't consolidate by quantity
  // when there are mixed enabled/disabled states
  // Each row in junction table = 1 allocation with its own enabled/disabled state
  const assignments = cleaned.map((item) => ({
    seatLayoutId: item.id,
    quantity: 1, // Each allocation stored as quantity: 1
  }));

  // Expanded IDs list (same layout ID repeated for each allocation)
  const expandedIds = cleaned.map((item) => item.id);

  // Return all unique IDs (for validation) including disabled ones
  const allUniqueIds = [...new Set(cleaned.map((item) => item.id))];

  // Build full objects array preserving position and enabled status
  const fullObjects = cleaned.map((item, index) => ({
    id: item.id,
    position: index + 1,
    isEnabled: item.status === "active",
    name: (item as any).name,
    status: item.status,
  }));

  return {
    ok: true,
    uniqueIds: allUniqueIds,
    assignments,
    expandedIds,
    fullObjects,
  };
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
 * Stores one row per layout with `quantity` (same layout may be allocated N times).
 * Now also tracks position and isEnabled status.
 */
export async function replaceAttractionSeatLayouts(
  executor: DbExecutor,
  attractionManagementId: string,
  assignments: { seatLayoutId: string; quantity: number }[],
  fullObjects?: Array<{ id: string; position: number; isEnabled: boolean }>,
) {
  await executor
    .delete(attractionManagementSeatLayouts)
    .where(
      eq(
        attractionManagementSeatLayouts.attractionManagementId,
        attractionManagementId,
      ),
    );

  if (assignments.length === 0) {
    return [];
  }

  // Build values with position and isEnabled from fullObjects
  // IMPORTANT: Match by index order, not by ID, since multiple allocations
  // of same layout need different position/isEnabled values
  const valuesToInsert = assignments.map(({ seatLayoutId, quantity }, index) => {
    const fullObj = fullObjects?.[index]; // Match by index, not by ID
    return {
      attractionManagementId,
      seatLayoutId,
      quantity: Math.max(1, quantity),
      position: fullObj?.position ?? index + 1,
      isEnabled: fullObj?.isEnabled ?? true,
    };
  });

  return executor
    .insert(attractionManagementSeatLayouts)
    .values(valuesToInsert)
    .returning();
}

/** Expand junction rows into an ID list for FE chip hydrate (ID × quantity). */
export function expandSeatLayoutIds(
  mappings: { seatLayoutId: string; quantity: number }[],
): string[] {
  return mappings.flatMap(({ seatLayoutId, quantity }) =>
    Array.from({ length: Math.max(1, quantity) }, () => seatLayoutId),
  );
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

      seating: {
        adult: attractionManagement.adultSeats,
        child: attractionManagement.childSeats,
        student: attractionManagement.studentSeats,
        senior: attractionManagement.seniorSeats,
        foreigner: attractionManagement.foreignerSeats,
      },
    })

    .from(attractionManagement)

    .innerJoin(
      attractions,
      eq(attractionManagement.attractionId, attractions.id),
    )

    .where(and(...conditions));

  return data;
}
