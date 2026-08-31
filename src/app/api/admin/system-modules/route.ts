import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db";

import {
  systemModules,
  adminSystemModulePermissions,
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
       * Admins get:
       *
       * 1. Default modules available to all admins
       * 2. Any additional modules explicitly assigned
       *    to this specific admin
       *
       * Duplicate modules are removed.
       */

      const defaultAdminModules = [
        "DASHBOARD",
        "BOOKINGS",
        "STAFF_MANAGEMENT",
        "ATTRACTION_MANAGEMENT",
        "REPORTS",
        "TRANSACTIONS",
        "INVENTORY_CAPACITY",
        "SEAT_MANAGEMENT",
        "INVOICES",
        "MANAGER_MANAGEMENT",
      ];

      // ---------------------------------------------------
      // Get default admin modules
      // ---------------------------------------------------

      const defaultModules = await db
        .select({
          id: systemModules.id,
          key: systemModules.key,
          name: systemModules.name,
          description: systemModules.description,
          isActive: systemModules.isActive,
          sortOrder: systemModules.sortOrder,
        })
        .from(systemModules)
        .where(
          and(
            inArray(systemModules.key, defaultAdminModules),
            eq(systemModules.isActive, "ACTIVE"),
          ),
        );

      // ---------------------------------------------------
      // Get modules specifically assigned to this admin
      // ---------------------------------------------------

      const assignedModules = await db
        .select({
          id: systemModules.id,
          key: systemModules.key,
          name: systemModules.name,
          description: systemModules.description,
          isActive: systemModules.isActive,
          sortOrder: systemModules.sortOrder,
        })
        .from(adminSystemModulePermissions)
        .innerJoin(
          systemModules,
          eq(adminSystemModulePermissions.moduleId, systemModules.id),
        )
        .where(
          and(
            eq(adminSystemModulePermissions.adminId, user.id),
            eq(systemModules.isActive, "ACTIVE"),
          ),
        );

      // ---------------------------------------------------
      // Merge default + assigned modules
      // ---------------------------------------------------

      const modulesMap = new Map();

      for (const module of defaultModules) {
        modulesMap.set(module.id, module);
      }

      for (const module of assignedModules) {
        modulesMap.set(module.id, module);
      }

      // ---------------------------------------------------
      // Sort by sortOrder
      // ---------------------------------------------------

      const modules = Array.from(modulesMap.values()).sort(
        (a, b) => a.sortOrder - b.sortOrder,
      );

      return success(modules);
    }

    // =====================================================
    // MANAGER
    // =====================================================

    if (user.role === "MANAGER") {
      /*
       * Managers can only see modules explicitly assigned
       * to the authenticated manager.
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
        .orderBy(systemModules.sortOrder);

      return success(modules);
    }

    // =====================================================
    // STAFF
    // =====================================================

    if (user.role === "STAFF") {
      /*
       * Staff can only see modules explicitly assigned
       * to the authenticated staff member.
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
        .orderBy(systemModules.sortOrder);

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
