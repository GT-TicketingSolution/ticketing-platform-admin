import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";

import { db } from "@/db";
import { seatLayouts } from "@/db/schema";

export type SeatLayoutStatus = "ACTIVE" | "INACTIVE";

export type SeatLayoutAisleDirection = "VERTICAL" | "HORIZONTAL";

const MAX_SEAT_ROWS = Number(process.env.NEXT_PUBLIC_MAX_SEAT_ROWS ?? 200);
const MAX_SEAT_COLS = Number(process.env.NEXT_PUBLIC_MAX_SEAT_COLS ?? 200);

export type SeatLayoutFilters = {
  page?: number;
  limit?: number;
  search?: string;
  status?: SeatLayoutStatus;
  adminId: string;
};

export type CreateSeatLayoutInput = {
  adminId: string;

  name: string;

  rows: number;

  cols: number;

  hasAisle: boolean;

  aisleDirection: SeatLayoutAisleDirection;

  aisleAfterCol: number | null;

  aisleAfterRow: number | null;

  status: SeatLayoutStatus;
};

export type UpdateSeatLayoutInput = {
  name?: string;

  rows?: number;

  cols?: number;

  hasAisle?: boolean;

  aisleDirection?: SeatLayoutAisleDirection;

  aisleAfterCol?: number | null;

  aisleAfterRow?: number | null;

  status?: SeatLayoutStatus;
};

// ============================================================
// GET SEAT LAYOUTS
// ============================================================

export async function getSeatLayouts(filters: SeatLayoutFilters) {
  const page = Math.max(Number(filters.page) || 1, 1);

  const limit = Math.min(Math.max(Number(filters.limit) || 12, 1), 100);

  const offset = (page - 1) * limit;

  const conditions = [eq(seatLayouts.adminId, filters.adminId)];

  // ============================================================
  // SEARCH
  // ============================================================

  if (filters.search?.trim()) {
    const searchValue = `%${filters.search.trim()}%`;

    conditions.push(
      or(
        ilike(seatLayouts.name, searchValue),

        sql`
          ${seatLayouts.rows}::text
          || 'x'
          || ${seatLayouts.cols}::text
          ILIKE ${searchValue}
        `,
      )!,
    );
  }

  // ============================================================
  // STATUS
  // ============================================================

  if (filters.status) {
    conditions.push(eq(seatLayouts.status, filters.status));
  }

  const whereClause = and(...conditions);

  // ============================================================
  // TOTAL
  // ============================================================

  const [countResult] = await db
    .select({
      total: sql<number>`COUNT(*)`,
    })
    .from(seatLayouts)
    .where(whereClause);

  const total = Number(countResult?.total || 0);

  // ============================================================
  // DATA
  // ============================================================

  const rows = await db
    .select({
      id: seatLayouts.id,

      adminId: seatLayouts.adminId,

      name: seatLayouts.name,

      rows: seatLayouts.rows,

      cols: seatLayouts.cols,

      hasAisle: seatLayouts.hasAisle,

      aisleDirection: seatLayouts.aisleDirection,

      aisleAfterCol: seatLayouts.aisleAfterCol,

      aisleAfterRow: seatLayouts.aisleAfterRow,

      status: seatLayouts.status,

      createdAt: seatLayouts.createdAt,

      updatedAt: seatLayouts.updatedAt,
    })
    .from(seatLayouts)
    .where(whereClause)
    .orderBy(asc(seatLayouts.name), desc(seatLayouts.createdAt))
    .limit(limit)
    .offset(offset);

  // ============================================================
  // RESPONSE
  // ============================================================

  const items = rows.map((row, index) => ({
    sNo: offset + index + 1,

    id: row.id,

    adminId: row.adminId,

    name: row.name,

    rows: row.rows,

    cols: row.cols,

    hasAisle: row.hasAisle,

    aisleDirection: row.aisleDirection,

    aisleAfterCol: row.aisleAfterCol,

    aisleAfterRow: row.aisleAfterRow,

    status: row.status,

    totalSeats: row.rows * row.cols,

    createdAt: row.createdAt,

    updatedAt: row.updatedAt,
  }));

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

// ============================================================
// GET SEAT LAYOUT BY ID
// ============================================================

export async function getSeatLayoutById(seatId: string, adminId: string) {
  const [seat] = await db
    .select({
      id: seatLayouts.id,

      adminId: seatLayouts.adminId,

      name: seatLayouts.name,

      rows: seatLayouts.rows,

      cols: seatLayouts.cols,

      hasAisle: seatLayouts.hasAisle,

      aisleDirection: seatLayouts.aisleDirection,

      aisleAfterCol: seatLayouts.aisleAfterCol,

      aisleAfterRow: seatLayouts.aisleAfterRow,

      status: seatLayouts.status,

      createdAt: seatLayouts.createdAt,

      updatedAt: seatLayouts.updatedAt,
    })
    .from(seatLayouts)
    .where(and(eq(seatLayouts.id, seatId), eq(seatLayouts.adminId, adminId)))
    .limit(1);

  return seat ?? null;
}

// ============================================================
// CREATE SEAT LAYOUT
// ============================================================

export async function createSeatLayout(input: CreateSeatLayoutInput) {
  // ============================================================
  // BASIC VALIDATION
  // ============================================================

  if (!input.adminId) {
    throw new Error("Admin ID is required.");
  }

  if (!input.name.trim()) {
    throw new Error("Seat layout name is required.");
  }

  // ============================================================
  // ROW VALIDATION
  // ============================================================

  if (!Number.isInteger(input.rows) || input.rows <= 0) {
    throw new Error("Row count must be a positive integer.");
  }

  if (input.rows > MAX_SEAT_ROWS) {
    throw new Error(`Row count cannot exceed ${MAX_SEAT_ROWS}.`);
  }

  // ============================================================
  // COLUMN VALIDATION
  // ============================================================

  if (!Number.isInteger(input.cols) || input.cols <= 0) {
    throw new Error("Column count must be a positive integer.");
  }

  if (input.cols > MAX_SEAT_COLS) {
    throw new Error(`Column count cannot exceed ${MAX_SEAT_COLS}.`);
  }

  // ============================================================
  // AISLE VALIDATION
  // ============================================================

  if (input.hasAisle) {
    // ----------------------------------------------------------
    // VERTICAL AISLE
    // ----------------------------------------------------------

    if (input.aisleDirection === "VERTICAL") {
      if (input.cols <= 1) {
        throw new Error(
          "At least 2 columns are required for a vertical aisle.",
        );
      }

      if (
        input.aisleAfterCol === null ||
        !Number.isInteger(input.aisleAfterCol) ||
        input.aisleAfterCol < 0 ||
        input.aisleAfterCol >= input.cols
      ) {
        throw new Error(
          "Vertical aisle position must be between 0 and columns - 1.",
        );
      }
    }

    // ----------------------------------------------------------
    // HORIZONTAL AISLE
    // ----------------------------------------------------------

    if (input.aisleDirection === "HORIZONTAL") {
      if (input.rows <= 1) {
        throw new Error("At least 2 rows are required for a horizontal aisle.");
      }

      if (
        input.aisleAfterRow === null ||
        !Number.isInteger(input.aisleAfterRow) ||
        input.aisleAfterRow < 0 ||
        input.aisleAfterRow >= input.rows
      ) {
        throw new Error(
          "Horizontal aisle position must be between 0 and rows - 1.",
        );
      }
    }
  }

  // ============================================================
  // NORMALIZE AISLE VALUES
  // ============================================================

  const aisleAfterCol = input.hasAisle ? input.aisleAfterCol : null;

  const aisleAfterRow = input.hasAisle ? input.aisleAfterRow : null;

  // ============================================================
  // CREATE
  // ============================================================

  const [created] = await db
    .insert(seatLayouts)
    .values({
      adminId: input.adminId,

      name: input.name.trim(),

      rows: input.rows,

      cols: input.cols,

      hasAisle: input.hasAisle,

      aisleDirection: input.aisleDirection,

      aisleAfterCol,

      aisleAfterRow,

      status: input.status,
    })
    .returning();

  return {
    ...created,

    totalSeats: created.rows * created.cols,
  };
}

// ============================================================
// UPDATE SEAT LAYOUT
// ============================================================

export async function updateSeatLayout(
  seatId: string,
  adminId: string,
  input: UpdateSeatLayoutInput,
) {
  // ============================================================
  // GET EXISTING
  // ============================================================

  const existing = await getSeatLayoutById(seatId, adminId);

  if (!existing) {
    throw new Error("Seat layout not found.");
  }

  // ============================================================
  // FINAL VALUES
  // ============================================================

  const rows = input.rows ?? existing.rows;

  const cols = input.cols ?? existing.cols;

  const hasAisle = input.hasAisle ?? existing.hasAisle;

  const aisleDirection = input.aisleDirection ?? existing.aisleDirection;

  /*
   * IMPORTANT:
   * Do not use `??` here because null is meaningful.
   *
   * If the caller sends:
   *
   * aisleAfterCol: null
   *
   * we want the final value to be null.
   */

  const aisleAfterCol =
    input.aisleAfterCol !== undefined
      ? input.aisleAfterCol
      : existing.aisleAfterCol;

  const aisleAfterRow =
    input.aisleAfterRow !== undefined
      ? input.aisleAfterRow
      : existing.aisleAfterRow;

  // ============================================================
  // NAME VALIDATION
  // ============================================================

  if (input.name !== undefined) {
    if (!input.name.trim()) {
      throw new Error("Seat layout name is required.");
    }
  }

  // ============================================================
  // ROW VALIDATION
  // ============================================================

  if (!Number.isInteger(rows) || rows <= 0) {
    throw new Error("Row count must be a positive integer.");
  }

  if (rows > MAX_SEAT_ROWS) {
    throw new Error(`Row count cannot exceed ${MAX_SEAT_ROWS}.`);
  }

  // ============================================================
  // COLUMN VALIDATION
  // ============================================================

  if (!Number.isInteger(cols) || cols <= 0) {
    throw new Error("Column count must be a positive integer.");
  }

  if (cols > MAX_SEAT_COLS) {
    throw new Error(`Column count cannot exceed ${MAX_SEAT_COLS}.`);
  }
  // ============================================================
  // AISLE VALIDATION
  // ============================================================

  if (hasAisle) {
    // ----------------------------------------------------------
    // VERTICAL AISLE
    // ----------------------------------------------------------

    if (aisleDirection === "VERTICAL") {
      if (cols <= 1) {
        throw new Error(
          "At least 2 columns are required for a vertical aisle.",
        );
      }

      if (
        aisleAfterCol === null ||
        !Number.isInteger(aisleAfterCol) ||
        aisleAfterCol < 0 ||
        aisleAfterCol >= cols
      ) {
        throw new Error(
          "Vertical aisle position must be between 0 and columns - 1.",
        );
      }
    }

    // ----------------------------------------------------------
    // HORIZONTAL AISLE
    // ----------------------------------------------------------

    if (aisleDirection === "HORIZONTAL") {
      if (rows <= 1) {
        throw new Error("At least 2 rows are required for a horizontal aisle.");
      }

      if (
        aisleAfterRow === null ||
        !Number.isInteger(aisleAfterRow) ||
        aisleAfterRow < 0 ||
        aisleAfterRow >= rows
      ) {
        throw new Error(
          "Horizontal aisle position must be between 0 and rows - 1.",
        );
      }
    }
  }

  // ============================================================
  // NORMALIZE AISLE VALUES
  // ============================================================

  const normalizedAisleAfterCol = hasAisle ? aisleAfterCol : null;

  const normalizedAisleAfterRow = hasAisle ? aisleAfterRow : null;

  // ============================================================
  // UPDATE
  // ============================================================

  const [updated] = await db
    .update(seatLayouts)
    .set({
      ...(input.name !== undefined && {
        name: input.name.trim(),
      }),

      ...(input.rows !== undefined && {
        rows,
      }),

      ...(input.cols !== undefined && {
        cols,
      }),

      ...(input.hasAisle !== undefined && {
        hasAisle,
      }),

      ...(input.aisleDirection !== undefined && {
        aisleDirection,
      }),

      aisleAfterCol: normalizedAisleAfterCol,

      aisleAfterRow: normalizedAisleAfterRow,

      ...(input.status !== undefined && {
        status: input.status,
      }),

      updatedAt: new Date(),
    })
    .where(and(eq(seatLayouts.id, seatId), eq(seatLayouts.adminId, adminId)))
    .returning();

  if (!updated) {
    throw new Error("Seat layout not found.");
  }

  return {
    ...updated,

    totalSeats: updated.rows * updated.cols,
  };
}

// ============================================================
// DELETE SEAT LAYOUT
// ============================================================

export async function deleteSeatLayout(seatId: string, adminId: string) {
  // ============================================================
  // CHECK OWNERSHIP
  // ============================================================

  const existing = await getSeatLayoutById(seatId, adminId);

  if (!existing) {
    throw new Error("Seat layout not found.");
  }

  // ============================================================
  // DELETE
  // ============================================================

  const [deleted] = await db
    .delete(seatLayouts)
    .where(and(eq(seatLayouts.id, seatId), eq(seatLayouts.adminId, adminId)))
    .returning({
      id: seatLayouts.id,

      adminId: seatLayouts.adminId,

      name: seatLayouts.name,
    });

  if (!deleted) {
    throw new Error("Seat layout not found.");
  }

  return deleted;
}
