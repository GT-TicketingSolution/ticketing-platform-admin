import { and, desc, eq, ilike, or, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  users,
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
  /* Attach attractions to managers                                         */
  /* ---------------------------------------------------------------------- */

  const managersWithPermissions = managers.map((manager) => ({
    ...manager,
    attractions: managerAttractionMap.get(manager.id) ?? [],
  }));

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
    status?: "ACTIVE" | "SUSPENDED" | "DISABLED";

    systemModuleIds?: string[];

    attractionPermissions?: AttractionPermissionInput[];
  },
) {
  const email = data.email.trim().toLowerCase();

  /* ---------------------------------------------------------------------- */
  /* Prevent duplicate email                                                */
  /* ---------------------------------------------------------------------- */

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
    /* -------------------------------------------------------------------- */
    /* Create manager                                                       */
    /* -------------------------------------------------------------------- */

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

    /* -------------------------------------------------------------------- */
    /* System module permissions                                            */
    /* -------------------------------------------------------------------- */

    if (data.systemModuleIds?.length) {
      const uniqueSystemModuleIds = [...new Set(data.systemModuleIds)];

      await tx.insert(managerSystemModulePermissions).values(
        uniqueSystemModuleIds.map((moduleId) => ({
          managerId: manager.id,
          moduleId,
        })),
      );
    }

    /* -------------------------------------------------------------------- */
    /* Attraction permissions                                               */
    /* -------------------------------------------------------------------- */

    if (data.attractionPermissions?.length) {
      /*
       * Remove duplicate attraction assignments.
       */
      const attractionIds = [
        ...new Set(
          data.attractionPermissions.map(
            (permission: AttractionPermissionInput) => permission.attractionId,
          ),
        ),
      ];

      /* ------------------------------------------------------------------ */
      /* Validate attractions                                               */
      /* ------------------------------------------------------------------ */

      /*
       * Only attractions belonging to this admin are allowed.
       */
      const allowedAttractions = await tx
        .select({
          id: attractions.id,
        })
        .from(attractions)
        .where(
          and(
            eq(attractions.adminId, adminId),
            sql`${attractions.id} IN ${attractionIds}`,
          ),
        );

      const allowedAttractionIds = new Set(
        allowedAttractions.map((attraction) => attraction.id),
      );

      const validAttractionIds = attractionIds.filter((id) =>
        allowedAttractionIds.has(id),
      );

      /* ------------------------------------------------------------------ */
      /* Create attraction assignments                                      */
      /* ------------------------------------------------------------------ */

      if (validAttractionIds.length) {
        await tx.insert(managerAttractionPermissions).values(
          validAttractionIds.map((attractionId) => ({
            managerId: manager.id,
            attractionId,
          })),
        );
      }

      /* ------------------------------------------------------------------ */
      /* Prepare requested module permissions                               */
      /* ------------------------------------------------------------------ */

      const requestedModulePermissions: {
        attractionId: string;
        attractionModuleId: string;
      }[] = data.attractionPermissions.flatMap(
        (permission: AttractionPermissionInput) =>
          permission.moduleIds.map((attractionModuleId) => ({
            attractionId: permission.attractionId,
            attractionModuleId,
          })),
      );

      if (requestedModulePermissions.length) {
        /* ---------------------------------------------------------------- */
        /* Get valid modules                                                */
        /* ---------------------------------------------------------------- */

        /*
         * Fetch the actual attraction for every requested module.
         *
         * This is the important part.
         *
         * We don't trust the attractionId coming from the frontend.
         */
        const requestedModuleIds = [
          ...new Set(
            requestedModulePermissions.map(
              (permission) => permission.attractionModuleId,
            ),
          ),
        ];

        const validModules = await tx
          .select({
            moduleId: attractionModules.id,
            attractionId: attractionModules.attractionId,
          })
          .from(attractionModules)
          .innerJoin(
            attractions,
            eq(attractionModules.attractionId, attractions.id),
          )
          .where(
            and(
              eq(attractions.adminId, adminId),
              sql`${attractionModules.id} IN ${requestedModuleIds}`,
            ),
          );

        /* ---------------------------------------------------------------- */
        /* Map module → actual attraction                                  */
        /* ---------------------------------------------------------------- */

        const moduleAttractionMap = new Map<string, string>();

        for (const module of validModules) {
          moduleAttractionMap.set(module.moduleId, module.attractionId);
        }

        /* ---------------------------------------------------------------- */
        /* Validate module belongs to selected attraction                   */
        /* ---------------------------------------------------------------- */

        const validModulePermissions = requestedModulePermissions.filter(
          (permission) => {
            /*
             * Attraction must belong to this admin.
             */
            if (!allowedAttractionIds.has(permission.attractionId)) {
              return false;
            }

            /*
             * Module must exist and belong to the SAME attraction.
             */
            const actualAttractionId = moduleAttractionMap.get(
              permission.attractionModuleId,
            );

            return actualAttractionId === permission.attractionId;
          },
        );

        /* ---------------------------------------------------------------- */
        /* Remove duplicate module assignments                              */
        /* ---------------------------------------------------------------- */

        const uniqueModulePermissions = Array.from(
          new Map(
            validModulePermissions.map((permission) => [
              `${permission.attractionId}:${permission.attractionModuleId}`,
              permission,
            ]),
          ).values(),
        );

        /* ---------------------------------------------------------------- */
        /* Insert valid module permissions                                  */
        /* ---------------------------------------------------------------- */

        if (uniqueModulePermissions.length) {
          await tx.insert(managerAttractionModulePermissions).values(
            uniqueModulePermissions.map((permission) => ({
              managerId: manager.id,
              attractionModuleId: permission.attractionModuleId,
            })),
          );
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
