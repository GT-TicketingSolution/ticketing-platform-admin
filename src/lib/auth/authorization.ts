import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import {
  systemModules,
  systemModuleRolePermissions,
  managerSystemModulePermissions,
  managerAttractionPermissions,
  staffSystemModulePermissions,
  staffAttractionAssignments,
  staffRoles,
} from "@/db/schema";

type AuthUser = {
  id: string;
  adminId: string | null;
  role: "ADMIN" | "MANAGER" | "STAFF";
};

type AuthContext = {
  user: AuthUser;
};

/**
 * Returns the admin/owner ID for the current user.
 *
 * ADMIN:
 *   own id
 *
 * MANAGER/STAFF:
 *   users.adminId
 */
export function getAdminId(auth: AuthContext): string {
  if (auth.user.role === "ADMIN") {
    return auth.user.id;
  }

  if (!auth.user.adminId) {
    throw new Error("USER_HAS_NO_ADMIN");
  }

  return auth.user.adminId;
}

/**
 * Check whether the current user has access to a system module.
 */
export async function hasModuleAccess(
  auth: AuthContext,
  moduleKey: string,
): Promise<boolean> {
  const [module] = await db
    .select({
      id: systemModules.id,
    })
    .from(systemModules)
    .where(
      and(
        eq(systemModules.key, moduleKey),
        eq(systemModules.isActive, "ACTIVE"),
      ),
    )
    .limit(1);

  if (!module) {
    return false;
  }

  /*
   * ADMIN
   *
   * Admin has all active system modules.
   */
  if (auth.user.role === "ADMIN") {
    return true;
  }

  /*
   * MANAGER
   *
   * First check manager-specific module permission.
   */
  if (auth.user.role === "MANAGER") {
    const [permission] = await db
      .select({
        id: managerSystemModulePermissions.id,
      })
      .from(managerSystemModulePermissions)
      .where(
        and(
          eq(managerSystemModulePermissions.managerId, auth.user.id),
          eq(managerSystemModulePermissions.moduleId, module.id),
        ),
      )
      .limit(1);

    return !!permission;
  }

  /*
   * STAFF
   *
   * Staff can receive access through:
   *
   * 1. direct staff_system_module_permissions
   *
   * We will keep this for now because your current schema
   * already has this table.
   */
  if (auth.user.role === "STAFF") {
    const [permission] = await db
      .select({
        id: staffSystemModulePermissions.id,
      })
      .from(staffSystemModulePermissions)
      .where(
        and(
          eq(staffSystemModulePermissions.staffId, auth.user.id),
          eq(staffSystemModulePermissions.moduleId, module.id),
        ),
      )
      .limit(1);

    return !!permission;
  }

  return false;
}

/**
 * Throw 403 if the user doesn't have module access.
 */
export async function requireModuleAccess(
  auth: AuthContext,
  moduleKey: string,
) {
  const allowed = await hasModuleAccess(auth, moduleKey);

  if (!allowed) {
    throw new Error("FORBIDDEN");
  }
}

/**
 * Get attractions accessible to the current user.
 */
export async function getAccessibleAttractionIds(
  auth: AuthContext,
): Promise<string[]> {
  /*
   * ADMIN
   *
   * Admin owns attractions through attractions.adminId.
   *
   * We don't query here because this helper should only
   * return explicit IDs when needed.
   */
  if (auth.user.role === "ADMIN") {
    return [];
  }

  /*
   * MANAGER
   */
  if (auth.user.role === "MANAGER") {
    const rows = await db
      .select({
        attractionId: managerAttractionPermissions.attractionId,
      })
      .from(managerAttractionPermissions)
      .where(eq(managerAttractionPermissions.managerId, auth.user.id));

    return rows.map((row) => row.attractionId);
  }

  /*
   * STAFF
   */
  if (auth.user.role === "STAFF") {
    const rows = await db
      .select({
        attractionId: staffAttractionAssignments.attractionId,
      })
      .from(staffAttractionAssignments)
      .where(eq(staffAttractionAssignments.staffId, auth.user.id));

    return rows.map((row) => row.attractionId);
  }

  return [];
}

/**
 * Check access to one attraction.
 */
export async function hasAttractionAccess(
  auth: AuthContext,
  attractionId: string,
): Promise<boolean> {
  /*
   * ADMIN
   *
   * IMPORTANT:
   * We still need to verify that the attraction belongs
   * to this admin. Do not simply return true.
   */
  if (auth.user.role === "ADMIN") {
    const { attractions } = await import("@/db/schema");

    const [attraction] = await db
      .select({
        id: attractions.id,
      })
      .from(attractions)
      .where(
        and(
          eq(attractions.id, attractionId),
          eq(attractions.adminId, auth.user.id),
        ),
      )
      .limit(1);

    return !!attraction;
  }

  /*
   * MANAGER
   */
  if (auth.user.role === "MANAGER") {
    const [permission] = await db
      .select({
        id: managerAttractionPermissions.id,
      })
      .from(managerAttractionPermissions)
      .where(
        and(
          eq(managerAttractionPermissions.managerId, auth.user.id),
          eq(managerAttractionPermissions.attractionId, attractionId),
        ),
      )
      .limit(1);

    return !!permission;
  }

  /*
   * STAFF
   */
  if (auth.user.role === "STAFF") {
    const [assignment] = await db
      .select({
        id: staffAttractionAssignments.id,
      })
      .from(staffAttractionAssignments)
      .where(
        and(
          eq(staffAttractionAssignments.staffId, auth.user.id),
          eq(staffAttractionAssignments.attractionId, attractionId),
        ),
      )
      .limit(1);

    return !!assignment;
  }

  return false;
}

/**
 * Require access to one attraction.
 */
export async function requireAttractionAccess(
  auth: AuthContext,
  attractionId: string,
) {
  const allowed = await hasAttractionAccess(auth, attractionId);

  if (!allowed) {
    throw new Error("FORBIDDEN");
  }
}
