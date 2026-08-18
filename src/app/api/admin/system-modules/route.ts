import { and, eq } from "drizzle-orm";

import { db } from "@/db";

import {
  systemModules,
  managerSystemModulePermissions,
  staffSystemModulePermissions,
} from "@/db/schema";

import { success, failure } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/require-auth";

/* =========================================================
   GET /api/system-modules
========================================================= */

export async function GET(request: Request) {
  try {
    // =====================================================
    // AUTHENTICATION
    // =====================================================

    const auth = await requireAuth(request);

    const user = auth.user;

    // =====================================================
    // ADMIN
    // =====================================================

    if (user.role === "ADMIN") {
      /*
       * Admins can see every active system module.
       *
       * systemModules are global system configuration,
       * so there is no adminId filter here.
       */
      const modules = await db
        .select({
          id: systemModules.id,
          key: systemModules.key,
          name: systemModules.name,
          description: systemModules.description,
          isActive: systemModules.isActive,
          sortOrder: systemModules.sortOrder,
        })
        .from(systemModules)
        .where(eq(systemModules.isActive, "ACTIVE"))
        .orderBy(systemModules.sortOrder);

      return success(modules);
    }

    // =====================================================
    // MANAGER
    // =====================================================

    if (user.role === "MANAGER") {
      /*
       * Managers can only see modules explicitly assigned
       * to the authenticated manager.
       *
       * IMPORTANT:
       * managerId comes from the authenticated JWT/session.
       * It is NOT accepted from query parameters.
       */

      const modules = await db
        .select({
          id: systemModules.id,
          key: systemModules.key,
          name: systemModules.name,
          description: systemModules.description,
          isActive: systemModules.isActive,
          sortOrder: systemModules.sortOrder,
        })
        .from(managerSystemModulePermissions)
        .innerJoin(
          systemModules,
          eq(managerSystemModulePermissions.moduleId, systemModules.id),
        )
        .where(
          and(
            eq(managerSystemModulePermissions.managerId, user.id),
            eq(systemModules.isActive, "ACTIVE"),
          ),
        )
        .orderBy(systemModules.name);

      return success(modules);
    }

    // =====================================================
    // STAFF
    // =====================================================

    if (user.role === "STAFF") {
      /*
       * Staff can only see modules explicitly assigned
       * to the authenticated staff member.
       *
       * staffId comes from the authenticated user.
       */

      const modules = await db
        .select({
          id: systemModules.id,
          key: systemModules.key,
          name: systemModules.name,
          description: systemModules.description,
          isActive: systemModules.isActive,
          sortOrder: systemModules.sortOrder,
        })
        .from(staffSystemModulePermissions)
        .innerJoin(
          systemModules,
          eq(staffSystemModulePermissions.moduleId, systemModules.id),
        )
        .where(
          and(
            eq(staffSystemModulePermissions.staffId, user.id),
            eq(systemModules.isActive, "ACTIVE"),
          ),
        )
        .orderBy(systemModules.name);

      return success(modules);
    }

    // =====================================================
    // UNSUPPORTED ROLE
    // =====================================================

    return failure("Invalid user role.", 403, "FORBIDDEN");
  } catch (error) {
    // =====================================================
    // AUTH ERRORS
    // =====================================================

    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return failure("Authentication required.", 401, "UNAUTHORIZED");
      }

      if (error.message === "ACCOUNT_NOT_ACTIVE") {
        return failure("Account is not active.", 403, "ACCOUNT_NOT_ACTIVE");
      }
    }

    // =====================================================
    // SERVER ERROR
    // =====================================================

    console.error("Get system modules error:", error);

    return failure(
      "Unable to fetch system modules.",
      500,
      "INTERNAL_SERVER_ERROR",
    );
  }
}
