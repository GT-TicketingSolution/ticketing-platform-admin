import { and, desc, eq, ilike, or, sql } from "drizzle-orm";

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
  page = 1,
  limit = 10,
  search,
  status,
}: {
  page?: number;
  limit?: number;
  search?: string;
  status?: "ACTIVE" | "SUSPENDED" | "DISABLED";
}) {
  const offset = (page - 1) * limit;

  const conditions = [eq(users.role, "MANAGER")];

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

export async function createManager(data: {
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
}) {
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

    // 2. System module permissions
    if (data.systemModuleIds?.length) {
      await tx.insert(managerSystemModulePermissions).values(
        data.systemModuleIds.map((moduleId) => ({
          managerId: manager.id,
          moduleId,
        })),
      );
    }

    // 3. Attraction permissions
    if (data.attractionPermissions?.length) {
      // 3a. Give access to attractions
      await tx.insert(managerAttractionPermissions).values(
        data.attractionPermissions.map(({ attractionId }) => ({
          managerId: manager.id,
          attractionId,
        })),
      );

      // 3b. Give access to selected attraction modules
      const modulePermissions = data.attractionPermissions.flatMap(
        ({ moduleIds }) =>
          moduleIds.map((attractionModuleId) => ({
            managerId: manager.id,
            attractionModuleId,
          })),
      );

      if (modulePermissions.length) {
        await tx
          .insert(managerAttractionModulePermissions)
          .values(modulePermissions);
      }
    }

    return manager;
  });
}

export async function getManagerById(managerId: string) {
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
    .where(and(eq(users.id, managerId), eq(users.role, "MANAGER")))
    .limit(1);

  if (!manager) {
    throw new Error("MANAGER_NOT_FOUND");
  }

  return manager;
}

export async function updateManager(
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
    .where(eq(users.id, managerId))
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
    .where(and(eq(users.id, managerId), eq(users.role, "MANAGER")))
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

export async function disableManager(managerId: string) {
  const [manager] = await db
    .update(users)
    .set({
      status: "DISABLED",
      updatedAt: new Date(),
    })
    .where(and(eq(users.id, managerId), eq(users.role, "MANAGER")))
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
