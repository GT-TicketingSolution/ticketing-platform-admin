import { and, desc, eq, ilike, or, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  users,
  managerSystemModulePermissions,
  managerAttractionPermissions,
  managerAttractionModulePermissions,
  attractions,
} from "@/db/schema";

import { hashPassword } from "@/lib/auth/password";

/* -------------------------------------------------------------------------- */
/* GET MANAGERS                                                               */
/* -------------------------------------------------------------------------- */

export async function getManagers({
  adminId,
  page = 1,
  limit = 10,
  search,
  status,
}: {
  adminId: string;
  page?: number;
  limit?: number;
  search?: string;
  status?: "ACTIVE" | "SUSPENDED" | "DISABLED";
}) {
  const offset = (page - 1) * limit;

  const conditions = [eq(users.role, "MANAGER"), eq(users.adminId, adminId)];

  if (status) {
    conditions.push(eq(users.status, status));
  }

  if (search?.trim()) {
    const searchTerm = `%${search.trim()}%`;

    conditions.push(
      or(
        ilike(users.name, searchTerm),
        ilike(users.email, searchTerm),
        ilike(users.phone, searchTerm),
      )!,
    );
  }

  const managers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      role: users.role,
      status: users.status,
      createdAt: users.createdAt,
      lastLoginAt: users.lastLoginAt,
    })
    .from(users)
    .where(and(...conditions))
    .orderBy(desc(users.createdAt))
    .limit(limit)
    .offset(offset);

  const [{ count }] = await db
    .select({
      count: sql<number>`count(*)`,
    })
    .from(users)
    .where(and(...conditions));

  return {
    managers,
    pagination: {
      page,
      limit,
      total: Number(count),
      totalPages: Math.ceil(Number(count) / limit),
    },
  };
}

/* -------------------------------------------------------------------------- */
/* CREATE MANAGER                                                             */
/* -------------------------------------------------------------------------- */

export async function createManager(
  adminId: string,
  data: {
    name: string;
    email: string;
    phone?: string;
    password: string;
    status?: "ACTIVE" | "SUSPENDED" | "DISABLED";

    systemModuleIds?: string[];

    attractionPermissions?: {
      attractionId: string;
      moduleIds: string[];
    }[];
  },
) {
  const email = data.email.trim().toLowerCase();

  /* Prevent duplicate email */
  const [existingUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingUser) {
    throw new Error("EMAIL_ALREADY_EXISTS");
  }

  const passwordHash = await hashPassword(data.password);

  return db.transaction(async (tx) => {
    /* ---------------------------------------------------------------------- */
    /* Create manager                                                         */
    /* ---------------------------------------------------------------------- */

    const [manager] = await tx
      .insert(users)
      .values({
        adminId,
        name: data.name.trim(),
        email,
        phone: data.phone?.trim() || null,
        passwordHash,
        role: "MANAGER",
        status: data.status ?? "ACTIVE",
      })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        role: users.role,
        status: users.status,
        createdAt: users.createdAt,
      });

    if (!manager) {
      throw new Error("MANAGER_CREATE_FAILED");
    }

    /* ---------------------------------------------------------------------- */
    /* System module permissions                                              */
    /* ---------------------------------------------------------------------- */

    if (data.systemModuleIds?.length) {
      await tx.insert(managerSystemModulePermissions).values(
        [...new Set(data.systemModuleIds)].map((moduleId) => ({
          managerId: manager.id,
          moduleId,
        })),
      );
    }

    /* ---------------------------------------------------------------------- */
    /* Attraction permissions                                                 */
    /* ---------------------------------------------------------------------- */

    if (data.attractionPermissions?.length) {
      const attractionIds = [
        ...new Set(data.attractionPermissions.map((item) => item.attractionId)),
      ];

      /*
       * IMPORTANT:
       * Only allow attractions owned by this admin.
       * This is the main data-leak protection.
       */
      const allowedAttractions = await tx
        .select({
          id: attractions.id,
        })
        .from(attractions)
        .where(
          and(
            eq(attractions.adminId, adminId),
            // Instead of trusting requested IDs blindly,
            // only select attractions belonging to this admin.
            sql`${attractions.id} IN ${attractionIds}`,
          ),
        );

      const allowedIds = new Set(
        allowedAttractions.map((attraction) => attraction.id),
      );

      const validAttractionIds = attractionIds.filter((id) =>
        allowedIds.has(id),
      );

      if (validAttractionIds.length) {
        await tx.insert(managerAttractionPermissions).values(
          validAttractionIds.map((attractionId) => ({
            managerId: manager.id,
            attractionId,
          })),
        );
      }

      /* -------------------------------------------------------------------- */
      /* Attraction modules                                                   */
      /* -------------------------------------------------------------------- */

      const modulePermissions = data.attractionPermissions.flatMap(
        ({ attractionId, moduleIds }) =>
          moduleIds.map((attractionModuleId) => ({
            attractionId,
            attractionModuleId,
          })),
      );

      if (modulePermissions.length && validAttractionIds.length) {
        /*
         * Only save module IDs supplied by the client.
         * The important isolation is that the attraction itself
         * has already been restricted to this admin.
         */
        await tx.insert(managerAttractionModulePermissions).values(
          modulePermissions
            .filter((item) => allowedIds.has(item.attractionId))
            .map((item) => ({
              managerId: manager.id,
              attractionModuleId: item.attractionModuleId,
            })),
        );
      }
    }

    return manager;
  });
}

/* -------------------------------------------------------------------------- */
/* GET MANAGER                                                                */
/* -------------------------------------------------------------------------- */

export async function getManagerById(adminId: string, managerId: string) {
  const [manager] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      role: users.role,
      status: users.status,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      lastLoginAt: users.lastLoginAt,
    })
    .from(users)
    .where(
      and(
        eq(users.id, managerId),
        eq(users.role, "MANAGER"),
        eq(users.adminId, adminId),
      ),
    )
    .limit(1);

  if (!manager) {
    throw new Error("MANAGER_NOT_FOUND");
  }

  return manager;
}

/* -------------------------------------------------------------------------- */
/* UPDATE MANAGER                                                             */
/* -------------------------------------------------------------------------- */

export async function updateManager(
  adminId: string,
  managerId: string,
  data: {
    name?: string;
    email?: string;
    phone?: string;
    password?: string;
    status?: "ACTIVE" | "SUSPENDED" | "DISABLED";
  },
) {
  /*
   * This condition prevents Admin A from updating
   * Admin B's manager.
   */
  const [manager] = await db
    .select({
      id: users.id,
    })
    .from(users)
    .where(
      and(
        eq(users.id, managerId),
        eq(users.role, "MANAGER"),
        eq(users.adminId, adminId),
      ),
    )
    .limit(1);

  if (!manager) {
    throw new Error("MANAGER_NOT_FOUND");
  }

  const updateData: {
    name?: string;
    email?: string;
    phone?: string | null;
    passwordHash?: string;
    status?: "ACTIVE" | "SUSPENDED" | "DISABLED";
    updatedAt: Date;
  } = {
    updatedAt: new Date(),
  };

  if (data.name !== undefined) {
    updateData.name = data.name.trim();
  }

  if (data.email !== undefined) {
    updateData.email = data.email.trim().toLowerCase();
  }

  if (data.phone !== undefined) {
    updateData.phone = data.phone.trim() || null;
  }

  if (data.status !== undefined) {
    updateData.status = data.status;
  }

  if (data.password !== undefined) {
    updateData.passwordHash = await hashPassword(data.password);
  }

  const [updatedManager] = await db
    .update(users)
    .set(updateData)
    .where(
      and(
        eq(users.id, managerId),
        eq(users.role, "MANAGER"),
        eq(users.adminId, adminId),
      ),
    )
    .returning({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      role: users.role,
      status: users.status,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      lastLoginAt: users.lastLoginAt,
    });

  if (!updatedManager) {
    throw new Error("MANAGER_NOT_FOUND");
  }

  return updatedManager;
}

/* -------------------------------------------------------------------------- */
/* DISABLE MANAGER                                                            */
/* -------------------------------------------------------------------------- */

export async function disableManager(adminId: string, managerId: string) {
  const [manager] = await db
    .update(users)
    .set({
      status: "DISABLED",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(users.id, managerId),
        eq(users.role, "MANAGER"),
        eq(users.adminId, adminId),
      ),
    )
    .returning({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      role: users.role,
      status: users.status,
    });

  if (!manager) {
    throw new Error("MANAGER_NOT_FOUND");
  }

  return manager;
}
