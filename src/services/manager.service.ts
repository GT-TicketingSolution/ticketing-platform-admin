import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";

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

// export async function createManager(
//   adminId: string,
//   data: {
//     name: string;
//     email: string;
//     phone?: string;
//     password: string;
//     status?: "ACTIVE" | "INACTIVE";
//     attractionPermissions?: AttractionPermissionInput[];
//   },
// ) {
//   const email = data.email.trim().toLowerCase();

//   /* ------------------------------------------------------------------ */
//   /* Prevent duplicate email                                            */
//   /* ------------------------------------------------------------------ */

//   const [existingUser] = await db
//     .select({
//       id: users.id,
//     })
//     .from(users)
//     .where(eq(users.email, email))
//     .limit(1);

//   if (existingUser) {
//     throw new Error("EMAIL_ALREADY_EXISTS");
//   }

//   const passwordHash = await hashPassword(data.password);

//   return db.transaction(async (tx) => {
//     /* ---------------------------------------------------------------- */
//     /* Create manager                                                   */
//     /* ---------------------------------------------------------------- */

//     const [manager] = await tx
//       .insert(users)
//       .values({
//         adminId,
//         name: data.name.trim(),
//         email,
//         phone: data.phone?.trim() || null,
//         passwordHash,
//         role: "MANAGER",
//         status: data.status ?? "ACTIVE",
//       })
//       .returning({
//         id: users.id,
//         name: users.name,
//         email: users.email,
//         phone: users.phone,
//         role: users.role,
//         status: users.status,
//         createdAt: users.createdAt,
//       });

//     if (!manager) {
//       throw new Error("MANAGER_CREATE_FAILED");
//     }

//     /* ---------------------------------------------------------------- */
//     /* Default system modules                                           */
//     /* ---------------------------------------------------------------- */

//     const defaultManagerModuleKeys = [
//       "DASHBOARD",
//       "BOOKINGS",
//       "INVOICES",
//       "REPORTS",
//       "TRANSACTIONS",
//       "SEAT_MANAGEMENT",
//     ] as const;

//     const defaultSystemModules = await tx
//       .select({
//         moduleId: systemModules.id,
//       })
//       .from(systemModules)
//       .where(
//         and(
//           eq(systemModules.isActive, "ACTIVE"),
//           sql`${systemModules.key} IN (${sql.join(
//             defaultManagerModuleKeys.map((key) => sql`${key}`),
//             sql`, `,
//           )})`,
//         ),
//       );

//     if (defaultSystemModules.length > 0) {
//       await tx.insert(managerSystemModulePermissions).values(
//         defaultSystemModules.map(({ moduleId }) => ({
//           managerId: manager.id,
//           moduleId,
//         })),
//       );
//     }

//     /* ---------------------------------------------------------------- */
//     /* Attraction permissions                                           */
//     /* ---------------------------------------------------------------- */

//     if (data.attractionPermissions?.length) {
//       const attractionIds = [
//         ...new Set(
//           data.attractionPermissions.map(
//             (permission) => permission.attractionId,
//           ),
//         ),
//       ];

//       /* -------------------------------------------------------------- */
//       /* Validate attractions                                           */
//       /* -------------------------------------------------------------- */

//       const allowedAttractions = await tx
//         .select({
//           id: attractions.id,
//         })
//         .from(attractions)
//         .where(
//           and(
//             eq(attractions.adminId, adminId),
//             sql`${attractions.id} IN (${sql.join(
//               attractionIds.map((id) => sql`${id}`),
//               sql`, `,
//             )})`,
//           ),
//         );

//       const allowedAttractionIds = new Set(
//         allowedAttractions.map((attraction) => attraction.id),
//       );

//       /* -------------------------------------------------------------- */
//       /* Assign attractions to manager                                  */
//       /* -------------------------------------------------------------- */

//       const validAttractionIds = attractionIds.filter((id) =>
//         allowedAttractionIds.has(id),
//       );

//       if (validAttractionIds.length) {
//         await tx.insert(managerAttractionPermissions).values(
//           validAttractionIds.map((attractionId) => ({
//             managerId: manager.id,
//             attractionId,
//           })),
//         );
//       }

//       /* -------------------------------------------------------------- */
//       /* Get system module IDs from payload                             */
//       /* -------------------------------------------------------------- */

//       const requestedSystemModuleIds = [
//         ...new Set(
//           data.attractionPermissions.flatMap(
//             (permission) => permission.moduleIds,
//           ),
//         ),
//       ];

//       if (requestedSystemModuleIds.length) {
//         /* ------------------------------------------------------------ */
//         /* Get system modules                                            */
//         /* ------------------------------------------------------------ */

//         const requestedSystemModules = await tx
//           .select({
//             id: systemModules.id,
//             key: systemModules.key,
//             name: systemModules.name,
//             description: systemModules.description,
//           })
//           .from(systemModules)
//           .where(
//             and(
//               eq(systemModules.isActive, "ACTIVE"),
//               sql`${systemModules.id} IN (${sql.join(
//                 requestedSystemModuleIds.map((id) => sql`${id}`),
//                 sql`, `,
//               )})`,
//             ),
//           );

//         /* ------------------------------------------------------------ */
//         /* Map system module ID → system module                         */
//         /* ------------------------------------------------------------ */

//         const systemModuleMap = new Map<
//           string,
//           {
//             id: string;
//             key: string;
//             name: string;
//             description: string | null;
//           }
//         >();

//         for (const module of requestedSystemModules) {
//           systemModuleMap.set(module.id, module);
//         }

//         /* ------------------------------------------------------------ */
//         /* Create attraction modules                                    */
//         /* ------------------------------------------------------------ */

//         const attractionModulesToCreate: Array<{
//           attractionId: string;
//           key: string;
//           name: string;
//           description: string | null;
//           isActive: "ACTIVE";
//         }> = [];

//         for (const permission of data.attractionPermissions) {
//           if (!allowedAttractionIds.has(permission.attractionId)) {
//             continue;
//           }

//           for (const systemModuleId of permission.moduleIds) {
//             const systemModule = systemModuleMap.get(systemModuleId);

//             if (!systemModule) {
//               continue;
//             }

//             attractionModulesToCreate.push({
//               attractionId: permission.attractionId,
//               key: systemModule.key,
//               name: systemModule.name,
//               description: systemModule.description,
//               isActive: "ACTIVE",
//             });
//           }
//         }

//         /* ------------------------------------------------------------ */
//         /* Remove duplicate attraction modules                         */
//         /* ------------------------------------------------------------ */

//         const uniqueAttractionModules = Array.from(
//           new Map(
//             attractionModulesToCreate.map((module) => [
//               `${module.attractionId}:${module.key}`,
//               module,
//             ]),
//           ).values(),
//         );

//         /* ------------------------------------------------------------ */
//         /* Insert attraction modules and get their IDs                 */
//         /* ------------------------------------------------------------ */

//         const createdAttractionModules = uniqueAttractionModules.length
//           ? await tx
//               .insert(attractionModules)
//               .values(uniqueAttractionModules)
//               .returning({
//                 id: attractionModules.id,
//                 attractionId: attractionModules.attractionId,
//                 key: attractionModules.key,
//               })
//           : [];

//         /* ------------------------------------------------------------ */
//         /* Create lookup: attraction + key → attraction module ID      */
//         /* ------------------------------------------------------------ */

//         const attractionModuleMap = new Map<string, string>();

//         for (const module of createdAttractionModules) {
//           attractionModuleMap.set(
//             `${module.attractionId}:${module.key}`,
//             module.id,
//           );
//         }

//         /* ------------------------------------------------------------ */
//         /* Create manager attraction module permissions                */
//         /* ------------------------------------------------------------ */

//         const managerModulePermissions: Array<{
//           managerId: string;
//           attractionModuleId: string;
//         }> = [];

//         for (const permission of data.attractionPermissions) {
//           if (!allowedAttractionIds.has(permission.attractionId)) {
//             continue;
//           }

//           for (const systemModuleId of permission.moduleIds) {
//             const systemModule = systemModuleMap.get(systemModuleId);

//             if (!systemModule) {
//               continue;
//             }

//             const attractionModuleId = attractionModuleMap.get(
//               `${permission.attractionId}:${systemModule.key}`,
//             );

//             if (!attractionModuleId) {
//               continue;
//             }

//             managerModulePermissions.push({
//               managerId: manager.id,
//               attractionModuleId,
//             });
//           }
//         }

//         /* ------------------------------------------------------------ */
//         /* Remove duplicate permissions                                */
//         /* ------------------------------------------------------------ */

//         const uniqueManagerModulePermissions = Array.from(
//           new Map(
//             managerModulePermissions.map((permission) => [
//               `${permission.managerId}:${permission.attractionModuleId}`,
//               permission,
//             ]),
//           ).values(),
//         );

//         /* ------------------------------------------------------------ */
//         /* Assign modules to manager                                   */
//         /* ------------------------------------------------------------ */

//         if (uniqueManagerModulePermissions.length) {
//           await tx
//             .insert(managerAttractionModulePermissions)
//             .values(uniqueManagerModulePermissions);
//         }
//       }
//     }

//     return manager;
//   });
// }

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
          inArray(systemModules.key, defaultManagerModuleKeys),
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
      /* -------------------------------------------------------------- */
      /* Get unique attraction IDs                                      */
      /* -------------------------------------------------------------- */

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
            inArray(attractions.id, attractionIds),
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

      if (validAttractionIds.length > 0) {
        await tx.insert(managerAttractionPermissions).values(
          validAttractionIds.map((attractionId) => ({
            managerId: manager.id,
            attractionId,
          })),
        );
      }

      /* ==============================================================
       * SYSTEM MODULE PERMISSIONS
       * ============================================================== */

      /*
       * Example payload:
       *
       * attraction-A -> [module-A, module-B]
       * attraction-B -> [module-A, module-C]
       *
       * Result:
       *
       * module-A
       * module-B
       * module-C
       *
       * module-A is inserted only ONCE into
       * manager_system_module_permissions.
       */

      const requestedSystemModuleIds = [
        ...new Set(
          data.attractionPermissions.flatMap(
            (permission) => permission.moduleIds,
          ),
        ),
      ];

      /* -------------------------------------------------------------- */
      /* Get requested system modules                                  */
      /* -------------------------------------------------------------- */

      const requestedSystemModules =
        requestedSystemModuleIds.length > 0
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
                  inArray(systemModules.id, requestedSystemModuleIds),
                ),
              )
          : [];

      /* -------------------------------------------------------------- */
      /* Insert system modules ONCE per manager                         */
      /* -------------------------------------------------------------- */

      if (requestedSystemModules.length > 0) {
        await tx
          .insert(managerSystemModulePermissions)
          .values(
            requestedSystemModules.map((module) => ({
              managerId: manager.id,
              moduleId: module.id,
            })),
          )
          .onConflictDoNothing();
      }

      /* -------------------------------------------------------------- */
      /* Map system module ID -> system module                          */
      /* -------------------------------------------------------------- */

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

      /* ==============================================================
       * ATTRACTION MODULES
       * ============================================================== */

      /*
       * attractionModules is attraction-specific.
       *
       * Therefore:
       *
       * attraction-A + module-A
       *
       * and
       *
       * attraction-B + module-A
       *
       * are TWO different attractionModules records.
       */

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

      /* -------------------------------------------------------------- */
      /* Remove duplicate attraction + module combinations             */
      /* -------------------------------------------------------------- */

      const uniqueAttractionModules = Array.from(
        new Map(
          attractionModulesToCreate.map((module) => [
            `${module.attractionId}:${module.key}`,
            module,
          ]),
        ).values(),
      );

      /* -------------------------------------------------------------- */
      /* Insert attraction modules                                      */
      /* -------------------------------------------------------------- */

      const createdAttractionModules =
        uniqueAttractionModules.length > 0
          ? await tx
              .insert(attractionModules)
              .values(uniqueAttractionModules)
              .returning({
                id: attractionModules.id,
                attractionId: attractionModules.attractionId,
                key: attractionModules.key,
              })
          : [];

      /* -------------------------------------------------------------- */
      /* Map attraction + module key -> attractionModule ID             */
      /* -------------------------------------------------------------- */

      const attractionModuleMap = new Map<string, string>();

      for (const module of createdAttractionModules) {
        attractionModuleMap.set(
          `${module.attractionId}:${module.key}`,
          module.id,
        );
      }

      /* ==============================================================
       * MANAGER ATTRACTION MODULE PERMISSIONS
       * ============================================================== */

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

      /* -------------------------------------------------------------- */
      /* Remove duplicate permissions                                   */
      /* -------------------------------------------------------------- */

      const uniqueManagerModulePermissions = Array.from(
        new Map(
          managerModulePermissions.map((permission) => [
            `${permission.managerId}:${permission.attractionModuleId}`,
            permission,
          ]),
        ).values(),
      );

      /* -------------------------------------------------------------- */
      /* Insert manager attraction-module permissions                   */
      /* -------------------------------------------------------------- */

      if (uniqueManagerModulePermissions.length > 0) {
        await tx
          .insert(managerAttractionModulePermissions)
          .values(uniqueManagerModulePermissions)
          .onConflictDoNothing();
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

// export async function updateManager(
//   adminId: string,
//   managerId: string,
//   data: {
//     name?: string;
//     email?: string;
//     phone?: string;
//     password?: string;
//     status?: "ACTIVE" | "INACTIVE";
//   },
// ) {
//   /*
//    * This condition prevents Admin A from updating
//    * Admin B's manager.
//    */
//   const [manager] = await db
//     .select({
//       id: users.id,
//     })
//     .from(users)
//     .where(
//       and(
//         eq(users.id, managerId),
//         eq(users.role, "MANAGER"),
//         eq(users.adminId, adminId),
//       ),
//     )
//     .limit(1);

//   if (!manager) {
//     throw new Error("MANAGER_NOT_FOUND");
//   }

//   const updateData: {
//     name?: string;
//     email?: string;
//     phone?: string | null;
//     passwordHash?: string;
//     status?: "ACTIVE" | "INACTIVE";
//     updatedAt: Date;
//   } = {
//     updatedAt: new Date(),
//   };

//   if (data.name !== undefined) {
//     updateData.name = data.name.trim();
//   }

//   if (data.email !== undefined) {
//     updateData.email = data.email.trim().toLowerCase();
//   }

//   if (data.phone !== undefined) {
//     updateData.phone = data.phone.trim() || null;
//   }

//   if (data.status !== undefined) {
//     updateData.status = data.status;
//   }

//   if (data.password !== undefined) {
//     updateData.passwordHash = await hashPassword(data.password);
//   }

//   const [updatedManager] = await db
//     .update(users)
//     .set(updateData)
//     .where(
//       and(
//         eq(users.id, managerId),
//         eq(users.role, "MANAGER"),
//         eq(users.adminId, adminId),
//       ),
//     )
//     .returning({
//       id: users.id,
//       name: users.name,
//       email: users.email,
//       phone: users.phone,
//       role: users.role,
//       status: users.status,
//       createdAt: users.createdAt,
//       updatedAt: users.updatedAt,
//       lastLoginAt: users.lastLoginAt,
//     });

//   if (!updatedManager) {
//     throw new Error("MANAGER_NOT_FOUND");
//   }

//   return updatedManager;
// }

export async function updateManager(
  adminId: string,
  managerId: string,
  data: {
    name?: string;
    email?: string;
    phone?: string;
    password?: string;
    status?: "ACTIVE" | "INACTIVE";

    systemModuleIds?: string[];

    attractionPermissions?: AttractionPermissionInput[];
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
      .where(and(eq(users.email, email), sql`${users.id} <> ${managerId}`))
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

    /* ================================================================ */
    /* SYSTEM MODULE PERMISSIONS                                         */
    /* ================================================================ */

    /*
     * If systemModuleIds is supplied explicitly, replace the manager's
     * existing system-module permissions.
     *
     * Example:
     *
     * systemModuleIds: [
     *   module-A,
     *   module-B,
     *   module-A
     * ]
     *
     * becomes:
     *
     * module-A
     * module-B
     */

    if (data.systemModuleIds !== undefined) {
      const uniqueSystemModuleIds = [...new Set(data.systemModuleIds)];

      /* -------------------------------------------------------------- */
      /* Delete old system-module permissions                           */
      /* -------------------------------------------------------------- */

      await tx
        .delete(managerSystemModulePermissions)
        .where(eq(managerSystemModulePermissions.managerId, managerId));

      /* -------------------------------------------------------------- */
      /* Validate requested system modules                              */
      /* -------------------------------------------------------------- */

      if (uniqueSystemModuleIds.length > 0) {
        const validSystemModules = await tx
          .select({
            id: systemModules.id,
          })
          .from(systemModules)
          .where(
            and(
              eq(systemModules.isActive, "ACTIVE"),
              inArray(systemModules.id, uniqueSystemModuleIds),
            ),
          );

        /* ------------------------------------------------------------ */
        /* Insert once per manager                                      */
        /* ------------------------------------------------------------ */

        if (validSystemModules.length > 0) {
          await tx
            .insert(managerSystemModulePermissions)
            .values(
              validSystemModules.map((module) => ({
                managerId,
                moduleId: module.id,
              })),
            )
            .onConflictDoNothing();
        }
      }
    }

    /* ================================================================ */
    /* ATTRACTION PERMISSIONS                                            */
    /* ================================================================ */

    if (data.attractionPermissions !== undefined) {
      /* -------------------------------------------------------------- */
      /* Delete old manager attraction-module permissions               */
      /* -------------------------------------------------------------- */

      await tx
        .delete(managerAttractionModulePermissions)
        .where(eq(managerAttractionModulePermissions.managerId, managerId));

      /* -------------------------------------------------------------- */
      /* Delete old attraction assignments                              */
      /* -------------------------------------------------------------- */

      await tx
        .delete(managerAttractionPermissions)
        .where(eq(managerAttractionPermissions.managerId, managerId));

      /* -------------------------------------------------------------- */
      /* Nothing selected                                                */
      /* -------------------------------------------------------------- */

      if (data.attractionPermissions.length === 0) {
        return updatedManager;
      }

      /* -------------------------------------------------------------- */
      /* Unique attraction IDs                                          */
      /* -------------------------------------------------------------- */

      const attractionIds = [
        ...new Set(
          data.attractionPermissions.map(
            (permission) => permission.attractionId,
          ),
        ),
      ];

      /* -------------------------------------------------------------- */
      /* Validate attractions belong to admin                           */
      /* -------------------------------------------------------------- */

      const allowedAttractions = await tx
        .select({
          id: attractions.id,
        })
        .from(attractions)
        .where(
          and(
            eq(attractions.adminId, adminId),
            inArray(attractions.id, attractionIds),
          ),
        );

      const allowedAttractionIds = new Set(
        allowedAttractions.map((attraction) => attraction.id),
      );

      /* -------------------------------------------------------------- */
      /* Assign valid attractions                                       */
      /* -------------------------------------------------------------- */

      const validAttractionIds = attractionIds.filter((id) =>
        allowedAttractionIds.has(id),
      );

      if (validAttractionIds.length > 0) {
        await tx
          .insert(managerAttractionPermissions)
          .values(
            validAttractionIds.map((attractionId) => ({
              managerId,
              attractionId,
            })),
          )
          .onConflictDoNothing();
      }

      /* ============================================================= */
      /* COLLECT SYSTEM MODULE IDS FROM ALL ATTRACTIONS                 */
      /* ============================================================= */

      /*
       * Example:
       *
       * attraction-1:
       *   [module-A, module-B]
       *
       * attraction-2:
       *   [module-A, module-C]
       *
       * Final:
       *
       * [module-A, module-B, module-C]
       *
       * module-A is NOT duplicated.
       */

      const requestedSystemModuleIds = [
        ...new Set(
          data.attractionPermissions.flatMap(
            (permission) => permission.moduleIds,
          ),
        ),
      ];

      /* -------------------------------------------------------------- */
      /* Get system modules                                              */
      /* -------------------------------------------------------------- */

      const requestedSystemModules =
        requestedSystemModuleIds.length > 0
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
                  inArray(systemModules.id, requestedSystemModuleIds),
                ),
              )
          : [];

      /* -------------------------------------------------------------- */
      /* Map system module ID -> system module                           */
      /* -------------------------------------------------------------- */

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

      /* ============================================================= */
      /* SYNC SYSTEM MODULE PERMISSIONS                                  */
      /* ============================================================= */

      /*
       * IMPORTANT:
       *
       * These are manager-level permissions.
       *
       * Therefore module-A is inserted only once even if:
       *
       * attraction-1 -> module-A
       * attraction-2 -> module-A
       * attraction-3 -> module-A
       */

      await tx
        .delete(managerSystemModulePermissions)
        .where(eq(managerSystemModulePermissions.managerId, managerId));

      if (requestedSystemModules.length > 0) {
        await tx
          .insert(managerSystemModulePermissions)
          .values(
            requestedSystemModules.map((module) => ({
              managerId,
              moduleId: module.id,
            })),
          )
          .onConflictDoNothing();
      }

      /* ============================================================= */
      /* ATTRACTION MODULES                                              */
      /* ============================================================= */

      const requestedAttractionModuleKeys = data.attractionPermissions.flatMap(
        (permission) =>
          permission.moduleIds
            .map((moduleId) => ({
              attractionId: permission.attractionId,
              systemModule: systemModuleMap.get(moduleId),
            }))
            .filter(
              (
                item,
              ): item is {
                attractionId: string;
                systemModule: {
                  id: string;
                  key: string;
                  name: string;
                  description: string | null;
                };
              } => Boolean(item.systemModule),
            )
            .map((item) => ({
              attractionId: item.attractionId,
              key: item.systemModule.key,
            })),
      );

      /* -------------------------------------------------------------- */
      /* Remove duplicate attraction + module combinations              */
      /* -------------------------------------------------------------- */

      const uniqueAttractionModuleKeys = Array.from(
        new Map(
          requestedAttractionModuleKeys.map((item) => [
            `${item.attractionId}:${item.key}`,
            item,
          ]),
        ).values(),
      );

      /* -------------------------------------------------------------- */
      /* Get existing attraction modules                                */
      /* -------------------------------------------------------------- */

      const existingAttractionModules =
        uniqueAttractionModuleKeys.length > 0
          ? await tx
              .select({
                id: attractionModules.id,
                attractionId: attractionModules.attractionId,
                key: attractionModules.key,
              })
              .from(attractionModules)
              .where(
                inArray(attractionModules.attractionId, validAttractionIds),
              )
          : [];

      /* -------------------------------------------------------------- */
      /* Map attraction + key -> attraction module ID                   */
      /* -------------------------------------------------------------- */

      const attractionModuleMap = new Map<string, string>();

      for (const module of existingAttractionModules) {
        attractionModuleMap.set(
          `${module.attractionId}:${module.key}`,
          module.id,
        );
      }

      /* -------------------------------------------------------------- */
      /* Create missing attraction modules                              */
      /* -------------------------------------------------------------- */

      const modulesToCreate = uniqueAttractionModuleKeys
        .filter(
          ({ attractionId, key }) =>
            allowedAttractionIds.has(attractionId) &&
            !attractionModuleMap.has(`${attractionId}:${key}`),
        )
        .map(({ attractionId, key }) => {
          const systemModule = requestedSystemModules.find(
            (module) => module.key === key,
          );

          return {
            attractionId,
            key,
            name: systemModule?.name ?? key,
            description: systemModule?.description ?? null,
            isActive: "ACTIVE" as const,
          };
        });

      /* -------------------------------------------------------------- */
      /* Insert missing attraction modules                             */
      /* -------------------------------------------------------------- */

      if (modulesToCreate.length > 0) {
        const created = await tx
          .insert(attractionModules)
          .values(modulesToCreate)
          .returning({
            id: attractionModules.id,
            attractionId: attractionModules.attractionId,
            key: attractionModules.key,
          });

        for (const module of created) {
          attractionModuleMap.set(
            `${module.attractionId}:${module.key}`,
            module.id,
          );
        }
      }

      /* ============================================================= */
      /* MANAGER ATTRACTION MODULE PERMISSIONS                          */
      /* ============================================================= */

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
            managerId,
            attractionModuleId,
          });
        }
      }

      /* -------------------------------------------------------------- */
      /* Remove duplicate permissions                                   */
      /* -------------------------------------------------------------- */

      const uniqueManagerModulePermissions = Array.from(
        new Map(
          managerModulePermissions.map((permission) => [
            `${permission.managerId}:${permission.attractionModuleId}`,
            permission,
          ]),
        ).values(),
      );

      /* -------------------------------------------------------------- */
      /* Insert attraction-module permissions                           */
      /* -------------------------------------------------------------- */

      if (uniqueManagerModulePermissions.length > 0) {
        await tx
          .insert(managerAttractionModulePermissions)
          .values(uniqueManagerModulePermissions)
          .onConflictDoNothing();
      }
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
