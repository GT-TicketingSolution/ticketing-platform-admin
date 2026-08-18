// import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";

// import { db } from "@/db";
// import { seatLayouts } from "@/db/schema";

// export type SeatLayoutStatus = "ACTIVE" | "INACTIVE";

// export type SeatLayoutFilters = {
//   page?: number;
//   limit?: number;
//   search?: string;
//   status?: SeatLayoutStatus;
// };

// export type CreateSeatLayoutInput = {
//   name: string;
//   rows: number;
//   cols: number;
//   hasAisle: boolean;
//   aisleAfterCol: number;
//   status: SeatLayoutStatus;
// };

// export type UpdateSeatLayoutInput = {
//   name?: string;
//   rows?: number;
//   cols?: number;
//   hasAisle?: boolean;
//   aisleAfterCol?: number;
//   status?: SeatLayoutStatus;
// };

// export async function getSeatLayouts(filters: SeatLayoutFilters = {}) {
//   const page = Math.max(Number(filters.page) || 1, 1);

//   const limit = Math.min(Math.max(Number(filters.limit) || 12, 1), 100);

//   const offset = (page - 1) * limit;

//   const conditions = [];

//   // ---------------------------------------------
//   // SEARCH
//   // ---------------------------------------------

//   if (filters.search?.trim()) {
//     const searchValue = `%${filters.search.trim()}%`;

//     conditions.push(
//       or(
//         ilike(seatLayouts.name, searchValue),

//         sql`${seatLayouts.rows}::text || 'x' || ${seatLayouts.cols}::text ILIKE ${searchValue}`,
//       ),
//     );
//   }

//   // ---------------------------------------------
//   // STATUS
//   // ---------------------------------------------

//   if (filters.status) {
//     conditions.push(eq(seatLayouts.status, filters.status));
//   }

//   const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

//   // ---------------------------------------------
//   // TOTAL
//   // ---------------------------------------------

//   const [countResult] = await db
//     .select({
//       total: sql<number>`COUNT(*)`,
//     })
//     .from(seatLayouts)
//     .where(whereClause);

//   const total = Number(countResult?.total || 0);

//   // ---------------------------------------------
//   // DATA
//   // ---------------------------------------------

//   const rows = await db
//     .select({
//       id: seatLayouts.id,
//       name: seatLayouts.name,
//       rows: seatLayouts.rows,
//       cols: seatLayouts.cols,
//       hasAisle: seatLayouts.hasAisle,
//       aisleAfterCol: seatLayouts.aisleAfterCol,
//       status: seatLayouts.status,
//       createdAt: seatLayouts.createdAt,
//       updatedAt: seatLayouts.updatedAt,
//     })
//     .from(seatLayouts)
//     .where(whereClause)
//     .orderBy(asc(seatLayouts.name), desc(seatLayouts.createdAt))
//     .limit(limit)
//     .offset(offset);

//   // ---------------------------------------------
//   // RESPONSE
//   // ---------------------------------------------

//   const items = rows.map((row, index) => ({
//     sNo: offset + index + 1,

//     id: row.id,

//     name: row.name,

//     rows: row.rows,

//     cols: row.cols,

//     hasAisle: row.hasAisle,

//     aisleAfterCol: row.aisleAfterCol,

//     status: row.status,

//     totalSeats: row.rows * row.cols,

//     createdAt: row.createdAt,

//     updatedAt: row.updatedAt,
//   }));

//   return {
//     items,

//     pagination: {
//       page,
//       limit,
//       total,
//       totalPages: total === 0 ? 0 : Math.ceil(total / limit),
//     },
//   };
// }

// export async function getSeatLayoutById(seatId: string) {
//   const [seat] = await db
//     .select({
//       id: seatLayouts.id,
//       name: seatLayouts.name,
//       rows: seatLayouts.rows,
//       cols: seatLayouts.cols,
//       hasAisle: seatLayouts.hasAisle,
//       aisleAfterCol: seatLayouts.aisleAfterCol,
//       status: seatLayouts.status,
//       createdAt: seatLayouts.createdAt,
//       updatedAt: seatLayouts.updatedAt,
//     })
//     .from(seatLayouts)
//     .where(eq(seatLayouts.id, seatId))
//     .limit(1);

//   return seat ?? null;
// }

// export async function createSeatLayout(input: CreateSeatLayoutInput) {
//   // ---------------------------------------------
//   // VALIDATION
//   // ---------------------------------------------

//   if (!input.name.trim()) {
//     throw new Error("Seat layout name is required.");
//   }

//   if (!Number.isInteger(input.rows) || input.rows <= 0) {
//     throw new Error("Row count must be a positive integer.");
//   }

//   if (!Number.isInteger(input.cols) || input.cols <= 0) {
//     throw new Error("Column count must be a positive integer.");
//   }

//   if (input.hasAisle) {
//     if (
//       input.cols <= 1 ||
//       input.aisleAfterCol < 1 ||
//       input.aisleAfterCol >= input.cols
//     ) {
//       throw new Error(
//         "Aisle position must be between column 1 and columns - 1.",
//       );
//     }
//   }

//   const aisleAfterCol = input.hasAisle ? input.aisleAfterCol : 0;

//   // ---------------------------------------------
//   // CREATE
//   // ---------------------------------------------

//   const [created] = await db
//     .insert(seatLayouts)
//     .values({
//       name: input.name.trim(),

//       rows: input.rows,

//       cols: input.cols,

//       hasAisle: input.hasAisle,

//       aisleAfterCol,

//       status: input.status,
//     })
//     .returning();

//   return created;
// }

// export async function updateSeatLayout(
//   seatId: string,
//   input: UpdateSeatLayoutInput,
// ) {
//   const existing = await getSeatLayoutById(seatId);

//   if (!existing) {
//     throw new Error("Seat layout not found.");
//   }

//   const rows = input.rows ?? existing.rows;

//   const cols = input.cols ?? existing.cols;

//   const hasAisle = input.hasAisle ?? existing.hasAisle;

//   const aisleAfterCol = input.aisleAfterCol ?? existing.aisleAfterCol;

//   // ---------------------------------------------
//   // VALIDATION
//   // ---------------------------------------------

//   if (input.name !== undefined) {
//     if (!input.name.trim()) {
//       throw new Error("Seat layout name is required.");
//     }
//   }

//   if (!Number.isInteger(rows) || rows <= 0) {
//     throw new Error("Row count must be a positive integer.");
//   }

//   if (!Number.isInteger(cols) || cols <= 0) {
//     throw new Error("Column count must be a positive integer.");
//   }

//   if (hasAisle) {
//     if (cols <= 1 || aisleAfterCol < 1 || aisleAfterCol >= cols) {
//       throw new Error(
//         "Aisle position must be between column 1 and columns - 1.",
//       );
//     }
//   }

//   // ---------------------------------------------
//   // UPDATE
//   // ---------------------------------------------

//   const [updated] = await db
//     .update(seatLayouts)
//     .set({
//       ...(input.name !== undefined && {
//         name: input.name.trim(),
//       }),

//       ...(input.rows !== undefined && {
//         rows,
//       }),

//       ...(input.cols !== undefined && {
//         cols,
//       }),

//       ...(input.hasAisle !== undefined && {
//         hasAisle,
//       }),

//       aisleAfterCol: hasAisle ? aisleAfterCol : 0,

//       ...(input.status !== undefined && {
//         status: input.status,
//       }),

//       updatedAt: new Date(),
//     })
//     .where(eq(seatLayouts.id, seatId))
//     .returning();

//   return updated;
// }

// export async function deleteSeatLayout(seatId: string) {
//   const existing = await getSeatLayoutById(seatId);

//   if (!existing) {
//     throw new Error("Seat layout not found.");
//   }

//   const [deleted] = await db
//     .delete(seatLayouts)
//     .where(eq(seatLayouts.id, seatId))
//     .returning({
//       id: seatLayouts.id,
//       name: seatLayouts.name,
//     });

//   return deleted;
// }
import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";

import { db } from "@/db";
import { seatLayouts } from "@/db/schema";

export type SeatLayoutStatus = "ACTIVE" | "INACTIVE";

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
  aisleAfterCol: number;
  status: SeatLayoutStatus;
};

export type UpdateSeatLayoutInput = {
  name?: string;
  rows?: number;
  cols?: number;
  hasAisle?: boolean;
  aisleAfterCol?: number;
  status?: SeatLayoutStatus;
};

// ============================================================
// GET SEAT LAYOUTS
// ============================================================

export async function getSeatLayouts(filters: SeatLayoutFilters) {
  const page = Math.max(Number(filters.page) || 1, 1);

  const limit = Math.min(Math.max(Number(filters.limit) || 12, 1), 100);

  const offset = (page - 1) * limit;

  const conditions = [
    // IMPORTANT:
    // Only return layouts belonging to this admin
    eq(seatLayouts.adminId, filters.adminId),
  ];

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

      aisleAfterCol: seatLayouts.aisleAfterCol,

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

    aisleAfterCol: row.aisleAfterCol,

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

      aisleAfterCol: seatLayouts.aisleAfterCol,

      status: seatLayouts.status,

      createdAt: seatLayouts.createdAt,

      updatedAt: seatLayouts.updatedAt,
    })
    .from(seatLayouts)
    .where(
      and(
        eq(seatLayouts.id, seatId),

        // IMPORTANT:
        // Admin can only access their own layout
        eq(seatLayouts.adminId, adminId),
      ),
    )
    .limit(1);

  return seat ?? null;
}

// ============================================================
// CREATE SEAT LAYOUT
// ============================================================

export async function createSeatLayout(input: CreateSeatLayoutInput) {
  // ============================================================
  // VALIDATION
  // ============================================================

  if (!input.adminId) {
    throw new Error("Admin ID is required.");
  }

  if (!input.name.trim()) {
    throw new Error("Seat layout name is required.");
  }

  if (!Number.isInteger(input.rows) || input.rows <= 0) {
    throw new Error("Row count must be a positive integer.");
  }

  if (!Number.isInteger(input.cols) || input.cols <= 0) {
    throw new Error("Column count must be a positive integer.");
  }

  if (input.hasAisle) {
    if (
      input.cols <= 1 ||
      input.aisleAfterCol < 1 ||
      input.aisleAfterCol >= input.cols
    ) {
      throw new Error(
        "Aisle position must be between column 1 and columns - 1.",
      );
    }
  }

  const aisleAfterCol = input.hasAisle ? input.aisleAfterCol : 0;

  // ============================================================
  // CHECK ADMIN
  // ============================================================

  const [admin] = await db
    .select({
      id: seatLayouts.adminId,
    })
    .from(seatLayouts)
    .where(eq(seatLayouts.adminId, input.adminId))
    .limit(1);

  // We don't actually need an existing layout to verify
  // the admin here because adminId comes from requireAuth().
  // The FK on seat_layouts.admin_id guarantees that the user exists.

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

      aisleAfterCol,

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

  const rows = input.rows ?? existing.rows;

  const cols = input.cols ?? existing.cols;

  const hasAisle = input.hasAisle ?? existing.hasAisle;

  const aisleAfterCol = input.aisleAfterCol ?? existing.aisleAfterCol;

  // ============================================================
  // VALIDATION
  // ============================================================

  if (input.name !== undefined) {
    if (!input.name.trim()) {
      throw new Error("Seat layout name is required.");
    }
  }

  if (!Number.isInteger(rows) || rows <= 0) {
    throw new Error("Row count must be a positive integer.");
  }

  if (!Number.isInteger(cols) || cols <= 0) {
    throw new Error("Column count must be a positive integer.");
  }

  if (hasAisle) {
    if (cols <= 1 || aisleAfterCol < 1 || aisleAfterCol >= cols) {
      throw new Error(
        "Aisle position must be between column 1 and columns - 1.",
      );
    }
  }

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

      aisleAfterCol: hasAisle ? aisleAfterCol : 0,

      ...(input.status !== undefined && {
        status: input.status,
      }),

      updatedAt: new Date(),
    })
    .where(
      and(
        eq(seatLayouts.id, seatId),

        // IMPORTANT:
        // Prevent Admin B from updating Admin A's layout
        eq(seatLayouts.adminId, adminId),
      ),
    )
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
    .where(
      and(
        eq(seatLayouts.id, seatId),

        // IMPORTANT:
        // Admin can only delete their own layout
        eq(seatLayouts.adminId, adminId),
      ),
    )
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
