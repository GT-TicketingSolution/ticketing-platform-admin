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
import { requireAuth } from "@/lib/auth/require-auth";

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
    const auth = await requireAuth(request);

    if (auth.user.role !== "ADMIN") {
      return failure("Admin access required.", 403, "FORBIDDEN");
    }

    const { managerId } = await params;

    // --------------------------------------------------
    // Check manager
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
      .where(and(eq(users.id, managerId), eq(users.role, "MANAGER")))
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
      .where(eq(managerAttractionPermissions.managerId, managerId));

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
      .where(eq(managerAttractionModulePermissions.managerId, managerId));

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
    const auth = await requireAuth(request);

    if (auth.user.role !== "ADMIN") {
      return failure("Admin access required.", 403, "FORBIDDEN");
    }

    const { managerId } = await params;

    // --------------------------------------------------
    // Check manager
    // --------------------------------------------------

    const [manager] = await db
      .select({
        id: users.id,
        role: users.role,
      })
      .from(users)
      .where(and(eq(users.id, managerId), eq(users.role, "MANAGER")))
      .limit(1);

    if (!manager) {
      return failure("Manager not found.", 404, "MANAGER_NOT_FOUND");
    }

    // --------------------------------------------------
    // Validate request
    // --------------------------------------------------

    const body = await request.json();

    const parsed = permissionsSchema.safeParse(body);

    if (!parsed.success) {
      return failure("Invalid permission details.", 400, "VALIDATION_ERROR");
    }

    const { systemModuleIds, attractionPermissions } = parsed.data;

    // --------------------------------------------------
    // Validate system modules
    // --------------------------------------------------

    if (systemModuleIds.length > 0) {
      const modules = await db
        .select({
          id: systemModules.id,
        })
        .from(systemModules)
        .where(inArray(systemModules.id, systemModuleIds));

      if (modules.length !== systemModuleIds.length) {
        return failure(
          "One or more system modules are invalid.",
          400,
          "INVALID_SYSTEM_MODULE",
        );
      }
    }

    // --------------------------------------------------
    // Validate attractions
    // --------------------------------------------------

    const attractionIds = attractionPermissions.map(
      (item) => item.attractionId,
    );

    if (attractionIds.length > 0) {
      const attractionsResult = await db
        .select({
          id: attractions.id,
        })
        .from(attractions)
        .where(inArray(attractions.id, attractionIds));

      if (attractionsResult.length !== attractionIds.length) {
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

    const attractionModuleIds = attractionPermissions.flatMap(
      (item) => item.moduleIds,
    );

    if (attractionModuleIds.length > 0) {
      const attractionModulesResult = await db
        .select({
          id: attractionModules.id,
          attractionId: attractionModules.attractionId,
        })
        .from(attractionModules)
        .where(inArray(attractionModules.id, attractionModuleIds));

      if (attractionModulesResult.length !== attractionModuleIds.length) {
        return failure(
          "One or more attraction modules are invalid.",
          400,
          "INVALID_ATTRACTION_MODULE",
        );
      }

      // Make sure module belongs to the selected attraction
      for (const permission of attractionPermissions) {
        for (const moduleId of permission.moduleIds) {
          const module = attractionModulesResult.find(
            (item) => item.id === moduleId,
          );

          if (module && module.attractionId !== permission.attractionId) {
            return failure(
              "Attraction module does not belong to the selected attraction.",
              400,
              "INVALID_ATTRACTION_MODULE_MAPPING",
            );
          }
        }
      }
    }

    // --------------------------------------------------
    // Replace permissions atomically
    // --------------------------------------------------
    // --------------------------------------------------
    // Remove existing permissions
    // --------------------------------------------------

    await db
      .delete(managerSystemModulePermissions)
      .where(eq(managerSystemModulePermissions.managerId, managerId));

    await db
      .delete(managerAttractionModulePermissions)
      .where(eq(managerAttractionModulePermissions.managerId, managerId));

    await db
      .delete(managerAttractionPermissions)
      .where(eq(managerAttractionPermissions.managerId, managerId));

    // --------------------------------------------------
    // Insert system module permissions
    // --------------------------------------------------

    if (systemModuleIds.length > 0) {
      await db.insert(managerSystemModulePermissions).values(
        systemModuleIds.map((moduleId) => ({
          managerId,
          moduleId,
        })),
      );
    }

    // --------------------------------------------------
    // Insert attraction permissions
    // --------------------------------------------------

    if (attractionPermissions.length > 0) {
      await db.insert(managerAttractionPermissions).values(
        attractionPermissions.map(({ attractionId }) => ({
          managerId,
          attractionId,
        })),
      );
    }

    // --------------------------------------------------
    // Insert attraction module permissions
    // --------------------------------------------------

    const modulePermissions = attractionPermissions.flatMap(({ moduleIds }) =>
      moduleIds.map((attractionModuleId) => ({
        managerId,
        attractionModuleId,
      })),
    );

    if (modulePermissions.length > 0) {
      await db
        .insert(managerAttractionModulePermissions)
        .values(modulePermissions);
    }

    // ----------------------------------------------
    // Insert attraction module permissions
    // ----------------------------------------------

    return success({
      message: "Manager permissions updated successfully.",
    });
  } catch (error) {
    console.error("Update manager permissions error:", error);

    return failure(
      "Unable to update manager permissions.",
      500,
      "INTERNAL_SERVER_ERROR",
    );
  }
}
