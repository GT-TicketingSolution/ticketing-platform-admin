import { z } from "zod";
import { and, eq } from "drizzle-orm";

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
import { requireModuleAccess } from "@/lib/auth/authorization";
import { saveManagerPermissions } from "@/services/manager.service";

// moduleIds are system module IDs, the same as manager creation.
const permissionsSchema = z.object({
  attractionPermissions: z.array(
    z.object({
      attractionId: z.string().uuid(),
      moduleIds: z.array(z.string().uuid()).default([]),
    }),
  ),
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
    await requireModuleAccess(auth, "MANAGER_MANAGEMENT");

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
    if (error instanceof Error) {
      // Authentication
      if (error.message === "UNAUTHORIZED") {
        return failure("Authentication is required.", 401, "UNAUTHORIZED");
      }

      // Account status
      if (error.message === "ACCOUNT_NOT_ACTIVE") {
        return failure(
          "Your account is inactive. Please contact the administrator.",
          403,
          "ACCOUNT_NOT_ACTIVE",
        );
      }

      // Authorization
      if (error.message === "FORBIDDEN") {
        return failure(
          "You do not have permission to manage manager permissions.",
          403,
          "MANAGER_PERMISSION_ACCESS_FORBIDDEN",
        );
      }

      // Manager
      if (error.message === "MANAGER_NOT_FOUND") {
        return failure("Manager not found.", 404, "MANAGER_NOT_FOUND");
      }
    }

    console.error(
      "GET /api/admin/managers/[managerId]/permissions error:",
      error,
    );

    return failure(
      "Unable to fetch manager permissions. Please try again later.",
      500,
      "MANAGER_PERMISSIONS_FETCH_FAILED",
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
    await requireModuleAccess(auth, "MANAGER_MANAGEMENT");
    const { managerId } = await params;

    // --------------------------------------------------
    // Validate request body
    // --------------------------------------------------

    const body = await request.json();

    const parsed = permissionsSchema.safeParse(body);

    if (!parsed.success) {
      return failure("Invalid permission details.", 400, "VALIDATION_ERROR");
    }

    const { attractionPermissions } = parsed.data;

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
    // Replace permissions atomically
    // --------------------------------------------------

    await db.transaction((tx) =>
      saveManagerPermissions(tx, {
        adminId: auth.adminId,
        managerId,
        attractionPermissions,
      }),
    );

    return success({
      message: "Manager permissions updated successfully.",
    });
  } catch (error) {
    if (error instanceof Error) {
      // Authentication
      if (error.message === "UNAUTHORIZED") {
        return failure("Authentication is required.", 401, "UNAUTHORIZED");
      }

      // Account status
      if (error.message === "ACCOUNT_NOT_ACTIVE") {
        return failure(
          "Your account is inactive. Please contact the administrator.",
          403,
          "ACCOUNT_NOT_ACTIVE",
        );
      }

      // Authorization
      if (error.message === "FORBIDDEN") {
        return failure(
          "You do not have permission to manage manager permissions.",
          403,
          "MANAGER_PERMISSION_ACCESS_FORBIDDEN",
        );
      }

      // Manager
      if (error.message === "MANAGER_NOT_FOUND") {
        return failure("Manager not found.", 404, "MANAGER_NOT_FOUND");
      }

      // System module
      if (error.message === "INVALID_SYSTEM_MODULE") {
        return failure(
          "One or more selected system modules are invalid.",
          400,
          "INVALID_SYSTEM_MODULE",
        );
      }

      // Attraction
      if (error.message === "INVALID_ATTRACTION") {
        return failure(
          "One or more selected attractions are invalid.",
          400,
          "INVALID_ATTRACTION",
        );
      }
    }

    console.error(
      "PUT /api/admin/managers/[managerId]/permissions error:",
      error,
    );

    return failure(
      "Unable to update manager permissions. Please try again later.",
      500,
      "MANAGER_PERMISSIONS_UPDATE_FAILED",
    );
  }
}
