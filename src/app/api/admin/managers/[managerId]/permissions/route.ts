// import { z } from "zod";
// import { and, eq, inArray } from "drizzle-orm";

// import { db } from "@/db";

// import {
//   users,
//   systemModules,
//   attractions,
//   attractionModules,
//   managerSystemModulePermissions,
//   managerAttractionPermissions,
//   managerAttractionModulePermissions,
// } from "@/db/schema";

// import { success, failure } from "@/lib/api/response";
// import { requireAuth } from "@/lib/auth/require-auth";

// const permissionsSchema = z.object({
//   systemModuleIds: z.array(z.string().uuid()).default([]),

//   attractionPermissions: z
//     .array(
//       z.object({
//         attractionId: z.string().uuid(),
//         moduleIds: z.array(z.string().uuid()).default([]),
//       }),
//     )
//     .default([]),
// });

// // ======================================================
// // GET /api/admin/managers/:managerId/permissions
// // ======================================================

// export async function GET(
//   request: Request,
//   { params }: { params: Promise<{ managerId: string }> },
// ) {
//   try {
//     const auth = await requireAuth(request);

//     if (auth.user.role !== "ADMIN") {
//       return failure("Admin access required.", 403, "FORBIDDEN");
//     }

//     const { managerId } = await params;

//     // --------------------------------------------------
//     // Check manager
//     // --------------------------------------------------

//     const [manager] = await db
//       .select({
//         id: users.id,
//         name: users.name,
//         email: users.email,
//         role: users.role,
//         status: users.status,
//       })
//       .from(users)
//       .where(and(eq(users.id, managerId), eq(users.role, "MANAGER")))
//       .limit(1);

//     if (!manager) {
//       return failure("Manager not found.", 404, "MANAGER_NOT_FOUND");
//     }

//     // --------------------------------------------------
//     // System module permissions
//     // --------------------------------------------------

//     const systemModulePermissions = await db
//       .select({
//         id: systemModules.id,
//         key: systemModules.key,
//         name: systemModules.name,
//         description: systemModules.description,
//         isActive: systemModules.isActive,
//       })
//       .from(managerSystemModulePermissions)
//       .innerJoin(
//         systemModules,
//         eq(managerSystemModulePermissions.moduleId, systemModules.id),
//       )
//       .where(eq(managerSystemModulePermissions.managerId, managerId));

//     // --------------------------------------------------
//     // Attraction permissions
//     // --------------------------------------------------

//     const attractionPermissions = await db
//       .select({
//         id: attractions.id,
//         name: attractions.name,
//         type: attractions.type,
//         status: attractions.status,
//       })
//       .from(managerAttractionPermissions)
//       .innerJoin(
//         attractions,
//         eq(managerAttractionPermissions.attractionId, attractions.id),
//       )
//       .where(eq(managerAttractionPermissions.managerId, managerId));

//     // --------------------------------------------------
//     // Attraction module permissions
//     // --------------------------------------------------

//     const attractionModulePermissions = await db
//       .select({
//         id: attractionModules.id,
//         attractionId: attractionModules.attractionId,
//         key: attractionModules.key,
//         name: attractionModules.name,
//         description: attractionModules.description,
//         isActive: attractionModules.isActive,
//       })
//       .from(managerAttractionModulePermissions)
//       .innerJoin(
//         attractionModules,
//         eq(
//           managerAttractionModulePermissions.attractionModuleId,
//           attractionModules.id,
//         ),
//       )
//       .where(eq(managerAttractionModulePermissions.managerId, managerId));

//     // --------------------------------------------------
//     // Build attraction -> modules structure
//     // --------------------------------------------------

//     const attractionsWithModules = attractionPermissions.map((attraction) => ({
//       ...attraction,

//       modules: attractionModulePermissions.filter(
//         (module) => module.attractionId === attraction.id,
//       ),
//     }));

//     return success({
//       manager,

//       systemModules: systemModulePermissions,

//       attractions: attractionsWithModules,
//     });
//   } catch (error) {
//     console.error("Get manager permissions error:", error);

//     return failure(
//       "Unable to fetch manager permissions.",
//       500,
//       "INTERNAL_SERVER_ERROR",
//     );
//   }
// }

// // ======================================================
// // PUT /api/admin/managers/:managerId/permissions
// // ======================================================

// export async function PUT(
//   request: Request,
//   { params }: { params: Promise<{ managerId: string }> },
// ) {
//   try {
//     const auth = await requireAuth(request);

//     if (auth.user.role !== "ADMIN") {
//       return failure("Admin access required.", 403, "FORBIDDEN");
//     }

//     const { managerId } = await params;

//     // --------------------------------------------------
//     // Check manager
//     // --------------------------------------------------

//     const [manager] = await db
//       .select({
//         id: users.id,
//         role: users.role,
//       })
//       .from(users)
//       .where(and(eq(users.id, managerId), eq(users.role, "MANAGER")))
//       .limit(1);

//     if (!manager) {
//       return failure("Manager not found.", 404, "MANAGER_NOT_FOUND");
//     }

//     // --------------------------------------------------
//     // Validate request
//     // --------------------------------------------------

//     const body = await request.json();

//     const parsed = permissionsSchema.safeParse(body);

//     if (!parsed.success) {
//       return failure("Invalid permission details.", 400, "VALIDATION_ERROR");
//     }

//     const { systemModuleIds, attractionPermissions } = parsed.data;

//     // --------------------------------------------------
//     // Validate system modules
//     // --------------------------------------------------

//     if (systemModuleIds.length > 0) {
//       const modules = await db
//         .select({
//           id: systemModules.id,
//         })
//         .from(systemModules)
//         .where(inArray(systemModules.id, systemModuleIds));

//       if (modules.length !== systemModuleIds.length) {
//         return failure(
//           "One or more system modules are invalid.",
//           400,
//           "INVALID_SYSTEM_MODULE",
//         );
//       }
//     }

//     // --------------------------------------------------
//     // Validate attractions
//     // --------------------------------------------------

//     const attractionIds = attractionPermissions.map(
//       (item) => item.attractionId,
//     );

//     if (attractionIds.length > 0) {
//       const attractionsResult = await db
//         .select({
//           id: attractions.id,
//         })
//         .from(attractions)
//         .where(inArray(attractions.id, attractionIds));

//       if (attractionsResult.length !== attractionIds.length) {
//         return failure(
//           "One or more attractions are invalid.",
//           400,
//           "INVALID_ATTRACTION",
//         );
//       }
//     }

//     // --------------------------------------------------
//     // Validate attraction modules
//     // --------------------------------------------------

//     const attractionModuleIds = attractionPermissions.flatMap(
//       (item) => item.moduleIds,
//     );

//     if (attractionModuleIds.length > 0) {
//       const attractionModulesResult = await db
//         .select({
//           id: attractionModules.id,
//           attractionId: attractionModules.attractionId,
//         })
//         .from(attractionModules)
//         .where(inArray(attractionModules.id, attractionModuleIds));

//       if (attractionModulesResult.length !== attractionModuleIds.length) {
//         return failure(
//           "One or more attraction modules are invalid.",
//           400,
//           "INVALID_ATTRACTION_MODULE",
//         );
//       }

//       // Make sure module belongs to the selected attraction
//       for (const permission of attractionPermissions) {
//         for (const moduleId of permission.moduleIds) {
//           const module = attractionModulesResult.find(
//             (item) => item.id === moduleId,
//           );

//           if (module && module.attractionId !== permission.attractionId) {
//             return failure(
//               "Attraction module does not belong to the selected attraction.",
//               400,
//               "INVALID_ATTRACTION_MODULE_MAPPING",
//             );
//           }
//         }
//       }
//     }

//     // --------------------------------------------------
//     // Replace permissions atomically
//     // --------------------------------------------------
//     // --------------------------------------------------
//     // Remove existing permissions
//     // --------------------------------------------------

//     await db
//       .delete(managerSystemModulePermissions)
//       .where(eq(managerSystemModulePermissions.managerId, managerId));

//     await db
//       .delete(managerAttractionModulePermissions)
//       .where(eq(managerAttractionModulePermissions.managerId, managerId));

//     await db
//       .delete(managerAttractionPermissions)
//       .where(eq(managerAttractionPermissions.managerId, managerId));

//     // --------------------------------------------------
//     // Insert system module permissions
//     // --------------------------------------------------

//     if (systemModuleIds.length > 0) {
//       await db.insert(managerSystemModulePermissions).values(
//         systemModuleIds.map((moduleId) => ({
//           managerId,
//           moduleId,
//         })),
//       );
//     }

//     // --------------------------------------------------
//     // Insert attraction permissions
//     // --------------------------------------------------

//     if (attractionPermissions.length > 0) {
//       await db.insert(managerAttractionPermissions).values(
//         attractionPermissions.map(({ attractionId }) => ({
//           managerId,
//           attractionId,
//         })),
//       );
//     }

//     // --------------------------------------------------
//     // Insert attraction module permissions
//     // --------------------------------------------------

//     const modulePermissions = attractionPermissions.flatMap(({ moduleIds }) =>
//       moduleIds.map((attractionModuleId) => ({
//         managerId,
//         attractionModuleId,
//       })),
//     );

//     if (modulePermissions.length > 0) {
//       await db
//         .insert(managerAttractionModulePermissions)
//         .values(modulePermissions);
//     }

//     // ----------------------------------------------
//     // Insert attraction module permissions
//     // ----------------------------------------------

//     return success({
//       message: "Manager permissions updated successfully.",
//     });
//   } catch (error) {
//     console.error("Update manager permissions error:", error);

//     return failure(
//       "Unable to update manager permissions.",
//       500,
//       "INTERNAL_SERVER_ERROR",
//     );
//   }
// }
import { z } from "zod";
import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db";

import {
  users,
  systemModules,
  attractions,
  attractionModules,
  managerSystemModulePermissions,
  managerAttractionPermissions,
  managerAttractionModulePermissions,
} from "@/db/schema";

import { success, failure } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/require-admin";

const permissionsSchema = z.object({
  systemModuleIds: z.array(z.string().uuid()).default([]),

  attractionPermissions: z
    .array(
      z.object({
        attractionId: z.string().uuid(),
        moduleIds: z.array(z.string().uuid()).default([]),
      }),
    )
    .default([]),
});

// ======================================================
// GET /api/admin/managers/:managerId/permissions
// ======================================================

export async function GET(
  request: Request,
  { params }: { params: Promise<{ managerId: string }> },
) {
  try {
    const auth = await requireAdmin(request);

    const { managerId } = await params;

    // --------------------------------------------------
    // Check manager belongs to current admin
    // --------------------------------------------------

    const [manager] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        status: users.status,
      })
      .from(users)
      .where(
        and(
          eq(users.id, managerId),
          eq(users.role, "MANAGER"),
          eq(users.adminId, auth.adminId),
        ),
      )
      .limit(1);

    if (!manager) {
      return failure("Manager not found.", 404, "MANAGER_NOT_FOUND");
    }

    // --------------------------------------------------
    // System module permissions
    // --------------------------------------------------

    const systemModulePermissions = await db
      .select({
        id: systemModules.id,
        key: systemModules.key,
        name: systemModules.name,
        description: systemModules.description,
        isActive: systemModules.isActive,
      })
      .from(managerSystemModulePermissions)
      .innerJoin(
        systemModules,
        eq(managerSystemModulePermissions.moduleId, systemModules.id),
      )
      .where(eq(managerSystemModulePermissions.managerId, managerId));

    // --------------------------------------------------
    // Attraction permissions
    // --------------------------------------------------

    const attractionPermissions = await db
      .select({
        id: attractions.id,
        name: attractions.name,
        type: attractions.type,
        status: attractions.status,
      })
      .from(managerAttractionPermissions)
      .innerJoin(
        attractions,
        eq(managerAttractionPermissions.attractionId, attractions.id),
      )
      .where(
        and(
          eq(managerAttractionPermissions.managerId, managerId),
          eq(attractions.adminId, auth.adminId),
        ),
      );

    // --------------------------------------------------
    // Attraction module permissions
    // --------------------------------------------------

    const attractionModulePermissions = await db
      .select({
        id: attractionModules.id,
        attractionId: attractionModules.attractionId,
        key: attractionModules.key,
        name: attractionModules.name,
        description: attractionModules.description,
        isActive: attractionModules.isActive,
      })
      .from(managerAttractionModulePermissions)
      .innerJoin(
        attractionModules,
        eq(
          managerAttractionModulePermissions.attractionModuleId,
          attractionModules.id,
        ),
      )
      .innerJoin(
        attractions,
        eq(attractionModules.attractionId, attractions.id),
      )
      .where(
        and(
          eq(managerAttractionModulePermissions.managerId, managerId),
          eq(attractions.adminId, auth.adminId),
        ),
      );

    // --------------------------------------------------
    // Build attraction -> modules structure
    // --------------------------------------------------

    const attractionsWithModules = attractionPermissions.map((attraction) => ({
      ...attraction,

      modules: attractionModulePermissions.filter(
        (module) => module.attractionId === attraction.id,
      ),
    }));

    return success({
      manager,
      systemModules: systemModulePermissions,
      attractions: attractionsWithModules,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return failure("Authentication required.", 401, "UNAUTHORIZED");
    }

    if (error instanceof Error && error.message === "ACCOUNT_NOT_ACTIVE") {
      return failure("Account is not active.", 403, "ACCOUNT_NOT_ACTIVE");
    }

    if (error instanceof Error && error.message === "FORBIDDEN") {
      return failure("Admin access required.", 403, "FORBIDDEN");
    }

    console.error("Get manager permissions error:", error);

    return failure(
      "Unable to fetch manager permissions.",
      500,
      "INTERNAL_SERVER_ERROR",
    );
  }
}

// ======================================================
// PUT /api/admin/managers/:managerId/permissions
// ======================================================

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ managerId: string }> },
) {
  try {
    const auth = await requireAdmin(request);

    const { managerId } = await params;

    // --------------------------------------------------
    // Validate request body
    // --------------------------------------------------

    const body = await request.json();

    const parsed = permissionsSchema.safeParse(body);

    if (!parsed.success) {
      return failure("Invalid permission details.", 400, "VALIDATION_ERROR");
    }

    const { systemModuleIds, attractionPermissions } = parsed.data;

    // --------------------------------------------------
    // Remove duplicate IDs
    // --------------------------------------------------

    const uniqueSystemModuleIds = [...new Set(systemModuleIds)];

    const uniqueAttractionPermissions = [
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

    // --------------------------------------------------
    // Check manager belongs to current admin
    // --------------------------------------------------

    const [manager] = await db
      .select({
        id: users.id,
      })
      .from(users)
      .where(
        and(
          eq(users.id, managerId),
          eq(users.role, "MANAGER"),
          eq(users.adminId, auth.adminId),
        ),
      )
      .limit(1);

    if (!manager) {
      return failure("Manager not found.", 404, "MANAGER_NOT_FOUND");
    }

    // --------------------------------------------------
    // Validate system modules
    // --------------------------------------------------

    if (uniqueSystemModuleIds.length > 0) {
      const modules = await db
        .select({
          id: systemModules.id,
        })
        .from(systemModules)
        .where(inArray(systemModules.id, uniqueSystemModuleIds));

      if (modules.length !== uniqueSystemModuleIds.length) {
        return failure(
          "One or more system modules are invalid.",
          400,
          "INVALID_SYSTEM_MODULE",
        );
      }
    }

    // --------------------------------------------------
    // Validate attractions belong to current admin
    // --------------------------------------------------

    const attractionIds = uniqueAttractionPermissions.map(
      ({ attractionId }) => attractionId,
    );

    if (attractionIds.length > 0) {
      const validAttractions = await db
        .select({
          id: attractions.id,
        })
        .from(attractions)
        .where(
          and(
            inArray(attractions.id, attractionIds),
            eq(attractions.adminId, auth.adminId),
          ),
        );

      if (validAttractions.length !== attractionIds.length) {
        return failure(
          "One or more attractions are invalid.",
          400,
          "INVALID_ATTRACTION",
        );
      }
    }

    // --------------------------------------------------
    // Validate attraction modules
    // --------------------------------------------------

    const requestedModules = uniqueAttractionPermissions.flatMap(
      ({ attractionId, moduleIds }) =>
        moduleIds.map((attractionModuleId) => ({
          attractionId,
          attractionModuleId,
        })),
    );

    const attractionModuleIds = [
      ...new Set(
        requestedModules.map(({ attractionModuleId }) => attractionModuleId),
      ),
    ];

    if (attractionModuleIds.length > 0) {
      const validModules = await db
        .select({
          id: attractionModules.id,
          attractionId: attractionModules.attractionId,
        })
        .from(attractionModules)
        .innerJoin(
          attractions,
          eq(attractionModules.attractionId, attractions.id),
        )
        .where(
          and(
            inArray(attractionModules.id, attractionModuleIds),
            eq(attractions.adminId, auth.adminId),
            eq(attractionModules.isActive, "ACTIVE"),
          ),
        );

      if (validModules.length !== attractionModuleIds.length) {
        return failure(
          "One or more attraction modules are invalid.",
          400,
          "INVALID_ATTRACTION_MODULE",
        );
      }

      const validModuleMap = new Map(
        validModules.map((module) => [module.id, module.attractionId]),
      );

      for (const requested of requestedModules) {
        const actualAttractionId = validModuleMap.get(
          requested.attractionModuleId,
        );

        if (!actualAttractionId) {
          return failure(
            "One or more attraction modules are invalid.",
            400,
            "INVALID_ATTRACTION_MODULE",
          );
        }

        if (actualAttractionId !== requested.attractionId) {
          return failure(
            "Attraction module does not belong to the selected attraction.",
            400,
            "INVALID_ATTRACTION_MODULE_MAPPING",
          );
        }
      }
    }

    // --------------------------------------------------
    // Replace permissions atomically
    // --------------------------------------------------

    await db.transaction(async (tx) => {
      // Remove existing permissions

      await tx
        .delete(managerSystemModulePermissions)
        .where(eq(managerSystemModulePermissions.managerId, managerId));

      await tx
        .delete(managerAttractionModulePermissions)
        .where(eq(managerAttractionModulePermissions.managerId, managerId));

      await tx
        .delete(managerAttractionPermissions)
        .where(eq(managerAttractionPermissions.managerId, managerId));

      // Insert system module permissions

      if (uniqueSystemModuleIds.length > 0) {
        await tx.insert(managerSystemModulePermissions).values(
          uniqueSystemModuleIds.map((moduleId) => ({
            managerId,
            moduleId,
          })),
        );
      }

      // Insert attraction permissions

      if (uniqueAttractionPermissions.length > 0) {
        await tx.insert(managerAttractionPermissions).values(
          uniqueAttractionPermissions.map(({ attractionId }) => ({
            managerId,
            attractionId,
          })),
        );
      }

      // Insert attraction module permissions

      if (requestedModules.length > 0) {
        await tx.insert(managerAttractionModulePermissions).values(
          requestedModules.map(({ attractionModuleId }) => ({
            managerId,
            attractionModuleId,
          })),
        );
      }
    });

    return success({
      message: "Manager permissions updated successfully.",
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return failure("Authentication required.", 401, "UNAUTHORIZED");
    }

    if (error instanceof Error && error.message === "ACCOUNT_NOT_ACTIVE") {
      return failure("Account is not active.", 403, "ACCOUNT_NOT_ACTIVE");
    }

    if (error instanceof Error && error.message === "FORBIDDEN") {
      return failure("Admin access required.", 403, "FORBIDDEN");
    }

    console.error("Update manager permissions error:", error);

    return failure(
      "Unable to update manager permissions.",
      500,
      "INTERNAL_SERVER_ERROR",
    );
  }
}
