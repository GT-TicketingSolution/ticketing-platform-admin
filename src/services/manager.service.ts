import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  users,
  systemModules,
  managerSystemModulePermissions,
  managerAttractionPermissions,
  managerAttractionModulePermissions,
  attractions,
  attractionModules,
} from "@/db/schema";

import { hashPassword } from "@/lib/auth/password";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

type AttractionPermissionInput = {
  attractionId: string;
  moduleIds: string[];
};

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
  status?: "ACTIVE" | "INACTIVE";
}) {
  const offset = (page - 1) * limit;

  /* ---------------------------------------------------------------------- */
  /* Manager filters                                                        */
  /* ---------------------------------------------------------------------- */

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

  /* ---------------------------------------------------------------------- */
  /* Get managers                                                           */
  /* ---------------------------------------------------------------------- */

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

  /* ---------------------------------------------------------------------- */
  /* Get total                                                              */
  /* ---------------------------------------------------------------------- */

  const [{ count }] = await db
    .select({
      count: sql<number>`count(*)`,
    })
    .from(users)
    .where(and(...conditions));

  /* ---------------------------------------------------------------------- */
  /* No managers                                                            */
  /* ---------------------------------------------------------------------- */

  if (!managers.length) {
    return {
      managers: [],
      pagination: {
        page,
        limit,
        total: Number(count),
        totalPages: Math.ceil(Number(count) / limit),
      },
    };
  }

  const managerIds = managers.map((manager) => manager.id);

  /* ---------------------------------------------------------------------- */
  /* Get manager → system module permissions                                */
  /* ---------------------------------------------------------------------- */

  const systemModulePermissions = await db
    .select({
      managerId: managerSystemModulePermissions.managerId,
      moduleId: systemModules.id,
      moduleKey: systemModules.key,
      moduleName: systemModules.name,
    })
    .from(managerSystemModulePermissions)
    .innerJoin(
      systemModules,
      eq(managerSystemModulePermissions.moduleId, systemModules.id),
    )
    .where(sql`${managerSystemModulePermissions.managerId} IN ${managerIds}`);

  /* ---------------------------------------------------------------------- */
  /* Group system modules by manager                                        */
  /* ---------------------------------------------------------------------- */

  const managerSystemModuleMap = new Map<
    string,
    {
      id: string;
      key: string;
      name: string;
    }[]
  >();

  for (const permission of systemModulePermissions) {
    const existing = managerSystemModuleMap.get(permission.managerId) ?? [];

    existing.push({
      id: permission.moduleId,
      key: permission.moduleKey,
      name: permission.moduleName,
    });

    managerSystemModuleMap.set(permission.managerId, existing);
  }

  /* ---------------------------------------------------------------------- */
  /* Get manager → attraction assignments                                   */
  /* ---------------------------------------------------------------------- */

  const attractionPermissions = await db
    .select({
      managerId: managerAttractionPermissions.managerId,
      attractionId: attractions.id,
      attractionName: attractions.name,
      attractionType: attractions.type,
      attractionStatus: attractions.status,
    })
    .from(managerAttractionPermissions)
    .innerJoin(
      attractions,
      eq(managerAttractionPermissions.attractionId, attractions.id),
    )
    .where(
      and(
        sql`${managerAttractionPermissions.managerId} IN ${managerIds}`,
        eq(attractions.adminId, adminId),
      ),
    );

  /* ---------------------------------------------------------------------- */
  /* Get manager → attraction module permissions                            */
  /* ---------------------------------------------------------------------- */

  const attractionModulePermissions = await db
    .select({
      managerId: managerAttractionModulePermissions.managerId,
      attractionModuleId: attractionModules.id,
      attractionId: attractionModules.attractionId,
      moduleKey: attractionModules.key,
      moduleName: attractionModules.name,
    })
    .from(managerAttractionModulePermissions)
    .innerJoin(
      attractionModules,
      eq(
        managerAttractionModulePermissions.attractionModuleId,
        attractionModules.id,
      ),
    )
    .innerJoin(attractions, eq(attractionModules.attractionId, attractions.id))
    .where(
      and(
        sql`${managerAttractionModulePermissions.managerId} IN ${managerIds}`,
        eq(attractions.adminId, adminId),
      ),
    );

  /* ---------------------------------------------------------------------- */
  /* Group attraction modules by manager + attraction                       */
  /* ---------------------------------------------------------------------- */

  const attractionModuleMap = new Map<
    string,
    {
      id: string;
      key: string;
      name: string;
    }[]
  >();

  for (const permission of attractionModulePermissions) {
    const mapKey = `${permission.managerId}:${permission.attractionId}`;

    const existing = attractionModuleMap.get(mapKey) ?? [];

    existing.push({
      id: permission.attractionModuleId,
      key: permission.moduleKey,
      name: permission.moduleName,
    });

    attractionModuleMap.set(mapKey, existing);
  }

  /* ---------------------------------------------------------------------- */
  /* Group attractions by manager                                           */
  /* ---------------------------------------------------------------------- */

  const managerAttractionMap = new Map<
    string,
    {
      id: string;
      name: string;
      type: string;
      status: "ACTIVE" | "INACTIVE";
      moduleIds: string[];
      modules: {
        id: string;
        key: string;
        name: string;
      }[];
    }[]
  >();

  for (const permission of attractionPermissions) {
    const modules =
      attractionModuleMap.get(
        `${permission.managerId}:${permission.attractionId}`,
      ) ?? [];

    const existing = managerAttractionMap.get(permission.managerId) ?? [];

    existing.push({
      id: permission.attractionId,
      name: permission.attractionName,
      type: permission.attractionType,
      status: permission.attractionStatus,

      moduleIds: modules.map((module) => module.id),

      modules,
    });

    managerAttractionMap.set(permission.managerId, existing);
  }

  /* ---------------------------------------------------------------------- */
  /* Attach permissions to managers                                         */
  /* ---------------------------------------------------------------------- */

  const managersWithPermissions = managers.map((manager) => ({
    ...manager,

    systemModules: managerSystemModuleMap.get(manager.id) ?? [],

    attractions: managerAttractionMap.get(manager.id) ?? [],
  }));

  /* ---------------------------------------------------------------------- */
  /* Return                                                                */
  /* ---------------------------------------------------------------------- */

  return {
    managers: managersWithPermissions,

    pagination: {
      page,
      limit,
      total: Number(count),
      totalPages: Math.ceil(Number(count) / limit),
    },
  };
}
/* -------------------------------------------------------------------------- */
/* MANAGER PERMISSIONS                                                        */
/* -------------------------------------------------------------------------- */

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

const DEFAULT_MANAGER_MODULE_KEYS = [
  "DASHBOARD",
  "BOOKINGS",
  "SCANNER_INVOICES",
  "REPORTS",
  "TRANSACTIONS",
  "SEAT_MANAGEMENT",
];

// Held only while at least one attraction is assigned to the manager.
// Data access stays limited to the assigned attractions.
const ASSIGNED_ATTRACTION_MODULE_KEYS = ["ATTRACTION_MANAGEMENT"];

/**
 * Single write path for manager permissions, used by create and update.
 *
 * attractionPermissions[].moduleIds are system module IDs. The call replaces
 * the manager's permissions with: default modules, modules that come with an
 * assigned attraction, and the requested modules.
 */
export async function saveManagerPermissions(
  tx: DbTransaction,
  {
    adminId,
    managerId,
    attractionPermissions,
  }: {
    adminId: string;
    managerId: string;
    attractionPermissions: AttractionPermissionInput[];
  },
) {
  const permissions = [
    ...new Map(
      attractionPermissions.map((permission) => [
        permission.attractionId,
        {
          attractionId: permission.attractionId,
          moduleIds: [...new Set(permission.moduleIds)],
        },
      ]),
    ).values(),
  ];

  const attractionIds = permissions.map(({ attractionId }) => attractionId);

  const requestedModuleIds = [
    ...new Set(permissions.flatMap(({ moduleIds }) => moduleIds)),
  ];

  /* ------------------------------------------------------------------ */
  /* Validate attractions belong to this admin                           */
  /* ------------------------------------------------------------------ */

  if (attractionIds.length > 0) {
    const validAttractions = await tx
      .select({ id: attractions.id })
      .from(attractions)
      .where(
        and(
          eq(attractions.adminId, adminId),
          inArray(attractions.id, attractionIds),
        ),
      );

    if (validAttractions.length !== attractionIds.length) {
      throw new Error("INVALID_ATTRACTION");
    }
  }

  /* ------------------------------------------------------------------ */
  /* Validate requested system modules                                   */
  /* ------------------------------------------------------------------ */

  const requestedModules =
    requestedModuleIds.length > 0
      ? await tx
          .select({
            id: systemModules.id,
            key: systemModules.key,
            name: systemModules.name,
            description: systemModules.description,
          })
          .from(systemModules)
          .where(
            and(
              eq(systemModules.isActive, "ACTIVE"),
              inArray(systemModules.id, requestedModuleIds),
            ),
          )
      : [];

  if (requestedModules.length !== requestedModuleIds.length) {
    throw new Error("INVALID_SYSTEM_MODULE");
  }

  /* ------------------------------------------------------------------ */
  /* System module grants                                                */
  /* ------------------------------------------------------------------ */

  const baseModuleKeys =
    attractionIds.length > 0
      ? [...DEFAULT_MANAGER_MODULE_KEYS, ...ASSIGNED_ATTRACTION_MODULE_KEYS]
      : DEFAULT_MANAGER_MODULE_KEYS;

  const baseModules = await tx
    .select({ id: systemModules.id })
    .from(systemModules)
    .where(
      and(
        eq(systemModules.isActive, "ACTIVE"),
        inArray(systemModules.key, baseModuleKeys),
      ),
    );

  const grantedModuleIds = [
    ...new Set([
      ...baseModules.map((item) => item.id),
      ...requestedModuleIds,
    ]),
  ];

  await tx
    .delete(managerSystemModulePermissions)
    .where(eq(managerSystemModulePermissions.managerId, managerId));

  if (grantedModuleIds.length > 0) {
    await tx.insert(managerSystemModulePermissions).values(
      grantedModuleIds.map((moduleId) => ({
        managerId,
        moduleId,
      })),
    );
  }

  /* ------------------------------------------------------------------ */
  /* Attraction assignments                                              */
  /* ------------------------------------------------------------------ */

  await tx
    .delete(managerAttractionModulePermissions)
    .where(eq(managerAttractionModulePermissions.managerId, managerId));

  await tx
    .delete(managerAttractionPermissions)
    .where(eq(managerAttractionPermissions.managerId, managerId));

  if (attractionIds.length === 0) {
    return;
  }

  await tx.insert(managerAttractionPermissions).values(
    attractionIds.map((attractionId) => ({
      managerId,
      attractionId,
    })),
  );

  if (requestedModules.length === 0) {
    return;
  }

  /* ------------------------------------------------------------------ */
  /* Attraction modules: reuse the oldest row, create only missing ones  */
  /* ------------------------------------------------------------------ */

  const moduleById = new Map(requestedModules.map((item) => [item.id, item]));

  const existingAttractionModules = await tx
    .select({
      id: attractionModules.id,
      attractionId: attractionModules.attractionId,
      key: attractionModules.key,
    })
    .from(attractionModules)
    .where(
      and(
        inArray(attractionModules.attractionId, attractionIds),
        inArray(
          attractionModules.key,
          requestedModules.map((item) => item.key),
        ),
        eq(attractionModules.isActive, "ACTIVE"),
      ),
    )
    .orderBy(desc(attractionModules.createdAt));

  // Ordered newest first, so the oldest row wins for each pair.
  const attractionModuleIdByPair = new Map(
    existingAttractionModules.map((item) => [
      `${item.attractionId}:${item.key}`,
      item.id,
    ]),
  );

  const missingAttractionModules = permissions.flatMap(
    ({ attractionId, moduleIds }) =>
      moduleIds
        .map((moduleId) => moduleById.get(moduleId)!)
        .filter(
          (item) =>
            !attractionModuleIdByPair.has(`${attractionId}:${item.key}`),
        )
        .map((item) => ({
          attractionId,
          key: item.key,
          name: item.name,
          description: item.description,
          isActive: "ACTIVE" as const,
        })),
  );

  if (missingAttractionModules.length > 0) {
    const createdAttractionModules = await tx
      .insert(attractionModules)
      .values(missingAttractionModules)
      .returning({
        id: attractionModules.id,
        attractionId: attractionModules.attractionId,
        key: attractionModules.key,
      });

    for (const item of createdAttractionModules) {
      attractionModuleIdByPair.set(
        `${item.attractionId}:${item.key}`,
        item.id,
      );
    }
  }

  const moduleGrants = permissions.flatMap(({ attractionId, moduleIds }) =>
    moduleIds.map((moduleId) => ({
      managerId,
      attractionModuleId: attractionModuleIdByPair.get(
        `${attractionId}:${moduleById.get(moduleId)!.key}`,
      )!,
    })),
  );

  if (moduleGrants.length > 0) {
    await tx.insert(managerAttractionModulePermissions).values(moduleGrants);
  }
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
    status?: "ACTIVE" | "INACTIVE";
    attractionPermissions?: AttractionPermissionInput[];
  },
) {
  const email = data.email.trim().toLowerCase();

  /* ------------------------------------------------------------------ */
  /* Prevent duplicate email                                            */
  /* ------------------------------------------------------------------ */

  const [existingUser] = await db
    .select({
      id: users.id,
    })
    .from(users)
    .where(and(eq(users.email, email), eq(users.isDeleted, false)))
    .limit(1);

  if (existingUser) {
    throw new Error("EMAIL_ALREADY_EXISTS");
  }

  const passwordHash = await hashPassword(data.password);

  return db.transaction(async (tx) => {
    /* ---------------------------------------------------------------- */
    /* Create manager                                                   */
    /* ---------------------------------------------------------------- */

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

    await saveManagerPermissions(tx, {
      adminId,
      managerId: manager.id,
      attractionPermissions: data.attractionPermissions ?? [],
    });

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
    status?: "ACTIVE" | "INACTIVE";
  },
) {
  /* ------------------------------------------------------------------ */
  /* Validate manager                                                    */
  /* ------------------------------------------------------------------ */

  const [manager] = await db
    .select({
      id: users.id,
      email: users.email,
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

  /* ------------------------------------------------------------------ */
  /* Check duplicate email                                               */
  /* ------------------------------------------------------------------ */

  if (data.email !== undefined) {
    const email = data.email.trim().toLowerCase();

    const [existingUser] = await db
      .select({
        id: users.id,
      })
      .from(users)
      .where(
        and(
          eq(users.email, email),
          eq(users.isDeleted, false),
          sql`${users.id} <> ${managerId}`,
        ),
      )
      .limit(1);

    if (existingUser) {
      throw new Error("EMAIL_ALREADY_EXISTS");
    }
  }

  /* ------------------------------------------------------------------ */
  /* Prepare user update                                                  */
  /* ------------------------------------------------------------------ */

  const updateData: {
    name?: string;
    email?: string;
    phone?: string | null;
    passwordHash?: string;
    status?: "ACTIVE" | "INACTIVE";
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

  /* ------------------------------------------------------------------ */
  /* Transaction                                                          */
  /* ------------------------------------------------------------------ */

  return db.transaction(async (tx) => {
    /* ================================================================ */
    /* Update manager                                                     */
    /* ================================================================ */

    const [updatedManager] = await tx
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
  });
}

/* -------------------------------------------------------------------------- */
/* DISABLE MANAGER                                                            */
/* -------------------------------------------------------------------------- */

export async function disableManager(adminId: string, managerId: string) {
  const [manager] = await db
    .update(users)
    .set({
      status: "INACTIVE",
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

export async function deleteManager(adminId: string, managerId: string) {
  const [manager] = await db
    .select({
      id: users.id,
      role: users.role,
    })
    .from(users)
    .where(and(eq(users.id, managerId), eq(users.adminId, adminId)))
    .limit(1);

  if (!manager) {
    throw new Error("MANAGER_NOT_FOUND");
  }

  if (manager.role !== "MANAGER") {
    throw new Error("NOT_A_MANAGER");
  }

  await db
    .delete(users)
    .where(
      and(
        eq(users.id, managerId),
        eq(users.adminId, adminId),
        eq(users.role, "MANAGER"),
      ),
    );
}
