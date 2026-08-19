import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  users,
  managerSystemModulePermissions,
  managerAttractionPermissions,
  managerAttractionModulePermissions,
  systemModules,
  attractions,
  attractionModules,
} from "@/db/schema";

import { hashPassword } from "@/lib/auth/password";

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

  const total = Number(count);

  return {
    managers,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

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

  const existingUser = await db
    .select({
      id: users.id,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingUser.length > 0) {
    throw new Error("EMAIL_ALREADY_EXISTS");
  }

  const passwordHash = await hashPassword(data.password);

  return await db.transaction(async (tx) => {
    // 1. Create manager
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

    // =========================================================
    // 2. SYSTEM MODULE PERMISSIONS
    // =========================================================

    if (data.systemModuleIds?.length) {
      const uniqueSystemModuleIds = [...new Set(data.systemModuleIds)];

      const validSystemModules = await tx
        .select({
          id: systemModules.id,
        })
        .from(systemModules)
        .where(
          and(
            inArray(systemModules.id, uniqueSystemModuleIds),
            eq(systemModules.isActive, "ACTIVE"),
          ),
        );

      if (validSystemModules.length !== uniqueSystemModuleIds.length) {
        throw new Error("INVALID_SYSTEM_MODULE");
      }

      await tx.insert(managerSystemModulePermissions).values(
        uniqueSystemModuleIds.map((moduleId) => ({
          managerId: manager.id,
          moduleId,
        })),
      );
    }

    // =========================================================
    // 3. ATTRACTION PERMISSIONS
    // =========================================================

    if (data.attractionPermissions?.length) {
      const attractionIds = [
        ...new Set(
          data.attractionPermissions.map(({ attractionId }) => attractionId),
        ),
      ];

      // ---------------------------------------------------------
      // 3a. Verify attractions belong to this admin
      // ---------------------------------------------------------

      const validAttractions = await tx
        .select({
          id: attractions.id,
        })
        .from(attractions)
        .where(
          and(
            inArray(attractions.id, attractionIds),
            eq(attractions.adminId, adminId),
          ),
        );

      if (validAttractions.length !== attractionIds.length) {
        throw new Error("INVALID_ATTRACTION");
      }

      // ---------------------------------------------------------
      // 3b. Give manager access to attractions
      // ---------------------------------------------------------

      await tx.insert(managerAttractionPermissions).values(
        attractionIds.map((attractionId) => ({
          managerId: manager.id,
          attractionId,
        })),
      );

      // ---------------------------------------------------------
      // 3c. Collect requested attraction modules
      // ---------------------------------------------------------

      const requestedModules = data.attractionPermissions.flatMap(
        ({ attractionId, moduleIds }) =>
          moduleIds.map((attractionModuleId) => ({
            attractionId,
            attractionModuleId,
          })),
      );

      if (requestedModules.length) {
        const moduleIds = [
          ...new Set(
            requestedModules.map(
              ({ attractionModuleId }) => attractionModuleId,
            ),
          ),
        ];

        // -------------------------------------------------------
        // 3d. Verify every module belongs to the specified
        //     attraction
        // -------------------------------------------------------

        const validModules = await tx
          .select({
            id: attractionModules.id,
            attractionId: attractionModules.attractionId,
          })
          .from(attractionModules)
          .where(
            and(
              inArray(attractionModules.id, moduleIds),
              eq(attractionModules.isActive, "ACTIVE"),
            ),
          );

        // Create a lookup:
        //
        // moduleId -> attractionId
        //
        const validModuleMap = new Map(
          validModules.map((module) => [module.id, module.attractionId]),
        );

        // -------------------------------------------------------
        // 3e. Verify module belongs to the attraction requested
        // -------------------------------------------------------

        for (const requested of requestedModules) {
          const actualAttractionId = validModuleMap.get(
            requested.attractionModuleId,
          );

          if (!actualAttractionId) {
            throw new Error("INVALID_ATTRACTION_MODULE");
          }

          if (actualAttractionId !== requested.attractionId) {
            throw new Error("ATTRACTION_MODULE_MISMATCH");
          }
        }

        // -------------------------------------------------------
        // 3f. Insert module permissions
        // -------------------------------------------------------

        const uniqueModulePermissions = [
          ...new Map(
            requestedModules.map((item) => [
              `${item.attractionId}:${item.attractionModuleId}`,
              item,
            ]),
          ).values(),
        ];

        await tx.insert(managerAttractionModulePermissions).values(
          uniqueModulePermissions.map(({ attractionModuleId }) => ({
            managerId: manager.id,
            attractionModuleId,
          })),
        );
      }
    }

    return manager;
  });
}

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
  const [existingManager] = await db
    .select({
      id: users.id,
      role: users.role,
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

  if (!existingManager) {
    throw new Error("MANAGER_NOT_FOUND");
  }

  if (existingManager.role !== "MANAGER") {
    throw new Error("NOT_A_MANAGER");
  }

  /*
   * Check email uniqueness only when email is changing
   */
  if (data.email !== undefined) {
    const email = data.email.trim().toLowerCase();

    const [existingEmail] = await db
      .select({
        id: users.id,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingEmail && existingEmail.id !== managerId) {
      throw new Error("EMAIL_ALREADY_EXISTS");
    }
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
