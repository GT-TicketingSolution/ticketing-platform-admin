import { and, desc, eq, ilike, or, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  users,
  systemModules,
  systemModuleRolePermissions,
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
    .where(eq(users.email, email))
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

    /* ---------------------------------------------------------------- */
    /* Default system modules                                           */
    /* ---------------------------------------------------------------- */

    const defaultManagerModuleKeys = [
      "DASHBOARD",
      "BOOKINGS",
      "INVOICES",
      "REPORTS",
      "TRANSACTIONS",
      "SEAT_MANAGEMENT",
    ] as const;

    const defaultSystemModules = await tx
      .select({
        moduleId: systemModules.id,
      })
      .from(systemModules)
      .where(
        and(
          eq(systemModules.isActive, "ACTIVE"),
          sql`${systemModules.key} IN (${sql.join(
            defaultManagerModuleKeys.map((key) => sql`${key}`),
            sql`, `,
          )})`,
        ),
      );

    if (defaultSystemModules.length > 0) {
      await tx.insert(managerSystemModulePermissions).values(
        defaultSystemModules.map(({ moduleId }) => ({
          managerId: manager.id,
          moduleId,
        })),
      );
    }

    /* ---------------------------------------------------------------- */
    /* Attraction permissions                                           */
    /* ---------------------------------------------------------------- */

    if (data.attractionPermissions?.length) {
      const attractionIds = [
        ...new Set(
          data.attractionPermissions.map(
            (permission) => permission.attractionId,
          ),
        ),
      ];

      /* -------------------------------------------------------------- */
      /* Validate attractions                                           */
      /* -------------------------------------------------------------- */

      const allowedAttractions = await tx
        .select({
          id: attractions.id,
        })
        .from(attractions)
        .where(
          and(
            eq(attractions.adminId, adminId),
            sql`${attractions.id} IN (${sql.join(
              attractionIds.map((id) => sql`${id}`),
              sql`, `,
            )})`,
          ),
        );

      const allowedAttractionIds = new Set(
        allowedAttractions.map((attraction) => attraction.id),
      );

      /* -------------------------------------------------------------- */
      /* Assign attractions to manager                                  */
      /* -------------------------------------------------------------- */

      const validAttractionIds = attractionIds.filter((id) =>
        allowedAttractionIds.has(id),
      );

      if (validAttractionIds.length) {
        await tx.insert(managerAttractionPermissions).values(
          validAttractionIds.map((attractionId) => ({
            managerId: manager.id,
            attractionId,
          })),
        );
      }

      /* -------------------------------------------------------------- */
      /* Get system module IDs from payload                             */
      /* -------------------------------------------------------------- */

      const requestedSystemModuleIds = [
        ...new Set(
          data.attractionPermissions.flatMap(
            (permission) => permission.moduleIds,
          ),
        ),
      ];

      if (requestedSystemModuleIds.length) {
        /* ------------------------------------------------------------ */
        /* Get system modules                                            */
        /* ------------------------------------------------------------ */

        const requestedSystemModules = await tx
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
              sql`${systemModules.id} IN (${sql.join(
                requestedSystemModuleIds.map((id) => sql`${id}`),
                sql`, `,
              )})`,
            ),
          );

        /* ------------------------------------------------------------ */
        /* Map system module ID → system module                         */
        /* ------------------------------------------------------------ */

        const systemModuleMap = new Map<
          string,
          {
            id: string;
            key: string;
            name: string;
            description: string | null;
          }
        >();

        for (const module of requestedSystemModules) {
          systemModuleMap.set(module.id, module);
        }

        /* ------------------------------------------------------------ */
        /* Create attraction modules                                    */
        /* ------------------------------------------------------------ */

        const attractionModulesToCreate: Array<{
          attractionId: string;
          key: string;
          name: string;
          description: string | null;
          isActive: "ACTIVE";
        }> = [];

        for (const permission of data.attractionPermissions) {
          if (!allowedAttractionIds.has(permission.attractionId)) {
            continue;
          }

          for (const systemModuleId of permission.moduleIds) {
            const systemModule = systemModuleMap.get(systemModuleId);

            if (!systemModule) {
              continue;
            }

            attractionModulesToCreate.push({
              attractionId: permission.attractionId,
              key: systemModule.key,
              name: systemModule.name,
              description: systemModule.description,
              isActive: "ACTIVE",
            });
          }
        }

        /* ------------------------------------------------------------ */
        /* Remove duplicate attraction modules                         */
        /* ------------------------------------------------------------ */

        const uniqueAttractionModules = Array.from(
          new Map(
            attractionModulesToCreate.map((module) => [
              `${module.attractionId}:${module.key}`,
              module,
            ]),
          ).values(),
        );

        /* ------------------------------------------------------------ */
        /* Insert attraction modules and get their IDs                 */
        /* ------------------------------------------------------------ */

        const createdAttractionModules = uniqueAttractionModules.length
          ? await tx
              .insert(attractionModules)
              .values(uniqueAttractionModules)
              .returning({
                id: attractionModules.id,
                attractionId: attractionModules.attractionId,
                key: attractionModules.key,
              })
          : [];

        /* ------------------------------------------------------------ */
        /* Create lookup: attraction + key → attraction module ID      */
        /* ------------------------------------------------------------ */

        const attractionModuleMap = new Map<string, string>();

        for (const module of createdAttractionModules) {
          attractionModuleMap.set(
            `${module.attractionId}:${module.key}`,
            module.id,
          );
        }

        /* ------------------------------------------------------------ */
        /* Create manager attraction module permissions                */
        /* ------------------------------------------------------------ */

        const managerModulePermissions: Array<{
          managerId: string;
          attractionModuleId: string;
        }> = [];

        for (const permission of data.attractionPermissions) {
          if (!allowedAttractionIds.has(permission.attractionId)) {
            continue;
          }

          for (const systemModuleId of permission.moduleIds) {
            const systemModule = systemModuleMap.get(systemModuleId);

            if (!systemModule) {
              continue;
            }

            const attractionModuleId = attractionModuleMap.get(
              `${permission.attractionId}:${systemModule.key}`,
            );

            if (!attractionModuleId) {
              continue;
            }

            managerModulePermissions.push({
              managerId: manager.id,
              attractionModuleId,
            });
          }
        }

        /* ------------------------------------------------------------ */
        /* Remove duplicate permissions                                */
        /* ------------------------------------------------------------ */

        const uniqueManagerModulePermissions = Array.from(
          new Map(
            managerModulePermissions.map((permission) => [
              `${permission.managerId}:${permission.attractionModuleId}`,
              permission,
            ]),
          ).values(),
        );

        /* ------------------------------------------------------------ */
        /* Assign modules to manager                                   */
        /* ------------------------------------------------------------ */

        if (uniqueManagerModulePermissions.length) {
          await tx
            .insert(managerAttractionModulePermissions)
            .values(uniqueManagerModulePermissions);
        }
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
    status?: "ACTIVE" | "INACTIVE";
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
