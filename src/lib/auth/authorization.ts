// import { and, eq, inArray } from "drizzle-orm";

// import { db } from "@/db";
// import {
//   systemModules,
//   systemModuleRolePermissions,
//   adminSystemModulePermissions,
//   managerSystemModulePermissions,
//   managerAttractionPermissions,
//   staffSystemModulePermissions,
//   staffAttractionAssignments,
//   staffRoles,
// } from "@/db/schema";

// type AuthUser = {
//   id: string;
//   adminId: string | null;
//   role: "ADMIN" | "MANAGER" | "STAFF";
// };

// type AuthContext = {
//   user: AuthUser;
// };

// /**
//  * Returns the admin/owner ID for the current user.
//  *
//  * ADMIN:
//  *   own id
//  *
//  * MANAGER/STAFF:
//  *   users.adminId
//  */
// export function getAdminId(auth: AuthContext): string {
//   if (auth.user.role === "ADMIN") {
//     return auth.user.id;
//   }

//   if (!auth.user.adminId) {
//     throw new Error("USER_HAS_NO_ADMIN");
//   }

//   return auth.user.adminId;
// }

// export async function hasModuleAccess(
//   auth: AuthContext,
//   moduleKey: string,
// ): Promise<boolean> {
//   const [module] = await db
//     .select({
//       id: systemModules.id,
//     })
//     .from(systemModules)
//     .where(
//       and(
//         eq(systemModules.key, moduleKey),
//         eq(systemModules.isActive, "ACTIVE"),
//       ),
//     )
//     .limit(1);

//   if (!module) {
//     return false;
//   }

//   if (auth.user.role === "ADMIN") {
//     const [permission] = await db
//       .select({
//         id: adminSystemModulePermissions.id,
//       })
//       .from(adminSystemModulePermissions)
//       .where(
//         and(
//           eq(adminSystemModulePermissions.adminId, auth.user.id),
//           eq(adminSystemModulePermissions.moduleId, module.id),
//         ),
//       )
//       .limit(1);

//     return !!permission;
//   }

//   if (auth.user.role === "MANAGER") {
//     const [permission] = await db
//       .select({
//         id: managerSystemModulePermissions.id,
//       })
//       .from(managerSystemModulePermissions)
//       .where(
//         and(
//           eq(managerSystemModulePermissions.managerId, auth.user.id),
//           eq(managerSystemModulePermissions.moduleId, module.id),
//         ),
//       )
//       .limit(1);

//     return !!permission;
//   }

//   if (auth.user.role === "STAFF") {
//     const [permission] = await db
//       .select({
//         id: staffSystemModulePermissions.id,
//       })
//       .from(staffSystemModulePermissions)
//       .where(
//         and(
//           eq(staffSystemModulePermissions.staffId, auth.user.id),
//           eq(staffSystemModulePermissions.moduleId, module.id),
//         ),
//       )
//       .limit(1);

//     return !!permission;
//   }

//   return false;
// }

// export async function requireModuleAccess(
//   auth: AuthContext,
//   moduleKey: string,
// ) {
//   const allowed = await hasModuleAccess(auth, moduleKey);

//   if (!allowed) {
//     throw new Error("FORBIDDEN");
//   }
// }

// /**
//  * Get attractions accessible to the current user.
//  */
// export async function getAccessibleAttractionIds(
//   auth: AuthContext,
// ): Promise<string[]> {
//   /*
//    * ADMIN
//    *
//    * Admin owns attractions through attractions.adminId.
//    *
//    * We don't query here because this helper should only
//    * return explicit IDs when needed.
//    */
//   if (auth.user.role === "ADMIN") {
//     return [];
//   }

//   /*
//    * MANAGER
//    */
//   if (auth.user.role === "MANAGER") {
//     const rows = await db
//       .select({
//         attractionId: managerAttractionPermissions.attractionId,
//       })
//       .from(managerAttractionPermissions)
//       .where(eq(managerAttractionPermissions.managerId, auth.user.id));

//     return rows.map((row) => row.attractionId);
//   }

//   /*
//    * STAFF
//    */
//   if (auth.user.role === "STAFF") {
//     const rows = await db
//       .select({
//         attractionId: staffAttractionAssignments.attractionId,
//       })
//       .from(staffAttractionAssignments)
//       .where(eq(staffAttractionAssignments.staffId, auth.user.id));

//     return rows.map((row) => row.attractionId);
//   }

//   return [];
// }

// /**
//  * Check access to one attraction.
//  */
// export async function hasAttractionAccess(
//   auth: AuthContext,
//   attractionId: string,
// ): Promise<boolean> {
//   /*
//    * ADMIN
//    *
//    * IMPORTANT:
//    * We still need to verify that the attraction belongs
//    * to this admin. Do not simply return true.
//    */
//   if (auth.user.role === "ADMIN") {
//     const { attractions } = await import("@/db/schema");

//     const [attraction] = await db
//       .select({
//         id: attractions.id,
//       })
//       .from(attractions)
//       .where(
//         and(
//           eq(attractions.id, attractionId),
//           eq(attractions.adminId, auth.user.id),
//         ),
//       )
//       .limit(1);

//     return !!attraction;
//   }

//   /*
//    * MANAGER
//    */
//   if (auth.user.role === "MANAGER") {
//     const [permission] = await db
//       .select({
//         id: managerAttractionPermissions.id,
//       })
//       .from(managerAttractionPermissions)
//       .where(
//         and(
//           eq(managerAttractionPermissions.managerId, auth.user.id),
//           eq(managerAttractionPermissions.attractionId, attractionId),
//         ),
//       )
//       .limit(1);

//     return !!permission;
//   }

//   /*
//    * STAFF
//    */
//   if (auth.user.role === "STAFF") {
//     const [assignment] = await db
//       .select({
//         id: staffAttractionAssignments.id,
//       })
//       .from(staffAttractionAssignments)
//       .where(
//         and(
//           eq(staffAttractionAssignments.staffId, auth.user.id),
//           eq(staffAttractionAssignments.attractionId, attractionId),
//         ),
//       )
//       .limit(1);

//     return !!assignment;
//   }

//   return false;
// }

// /**
//  * Require access to one attraction.
//  */
// export async function requireAttractionAccess(
//   auth: AuthContext,
//   attractionId: string,
// ) {
//   const allowed = await hasAttractionAccess(auth, attractionId);

//   if (!allowed) {
//     throw new Error("FORBIDDEN");
//   }
// }
import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db";

import {
  systemModules,
  managerSystemModulePermissions,
  managerAttractionPermissions,
  staffSystemModulePermissions,
  staffAttractionAssignments,
} from "@/db/schema";
import { STAFF_ALLOWED_MODULES } from "@/lib/auth/staff-role-modules";

type AuthUser = {
  id: string;
  adminId: string | null;
  role: "ADMIN" | "MANAGER" | "STAFF";
};

type AuthContext = {
  user: AuthUser;
};

/* =========================================================
   DEFAULT ADMIN MODULES
========================================================= */

/**
 * These modules are available to ALL admins by default.
 *
 * IMPORTANT:
 * These values must exactly match systemModules.key
 * in the database.
 */
export const DEFAULT_ADMIN_MODULES = [
  "DASHBOARD",
  "BOOKINGS",
  "STAFF_MANAGEMENT",
  "ATTRACTION_MANAGEMENT",
  "REPORTS",
  "TRANSACTIONS",
  "INVENTORY_CAPACITY",
  "SEAT_MANAGEMENT",
  "SCANNER_INVOICES",
  "MANAGER_MANAGEMENT",
] as const;

/* =========================================================
   GET ADMIN ID
========================================================= */

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

/* =========================================================
   MODULE ACCESS
========================================================= */

/**
 * Check whether the authenticated user has access
 * to a particular system module.
 *
 * ADMIN:
 *   Uses DEFAULT_ADMIN_MODULES.
 *
 * MANAGER:
 *   Uses managerSystemModulePermissions.
 *
 * STAFF:
 *   Uses staffSystemModulePermissions.
 */
export async function hasModuleAccess(
  auth: AuthContext,
  moduleKey: string,
): Promise<boolean> {
  // =====================================================
  // VERIFY MODULE EXISTS AND IS ACTIVE
  // =====================================================

  const [module] = await db
    .select({
      id: systemModules.id,
      key: systemModules.key,
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

  // =====================================================
  // ADMIN
  // =====================================================

  if (auth.user.role === "ADMIN") {
    /**
     * Admins do NOT need a row in
     * adminSystemModulePermissions.
     *
     * Every admin automatically gets the configured
     * default modules.
     */

    return DEFAULT_ADMIN_MODULES.includes(
      module.key as (typeof DEFAULT_ADMIN_MODULES)[number],
    );
  }

  // =====================================================
  // MANAGER
  // =====================================================

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

  // =====================================================
  // STAFF
  // =====================================================

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

  // =====================================================
  // UNKNOWN ROLE
  // =====================================================

  return false;
}

/* =========================================================
   REQUIRE MODULE ACCESS
========================================================= */

export async function requireModuleAccess(
  auth: AuthContext,
  moduleKey: string,
) {
  const allowed = await hasModuleAccess(auth, moduleKey);

  if (!allowed) {
    throw new Error("FORBIDDEN");
  }
}

/* =========================================================
   GET ACCESSIBLE ATTRACTIONS
========================================================= */

/**
 * Get attractions accessible to the current user.
 */
export async function getAccessibleAttractionIds(
  auth: AuthContext,
): Promise<string[]> {
  // =====================================================
  // ADMIN
  // =====================================================

  /**
   * Admin owns attractions through attractions.adminId.
   *
   * This helper only returns explicit permission IDs,
   * so admins return an empty array here.
   */
  if (auth.user.role === "ADMIN") {
    return [];
  }

  // =====================================================
  // MANAGER
  // =====================================================

  if (auth.user.role === "MANAGER") {
    const rows = await db
      .select({
        attractionId: managerAttractionPermissions.attractionId,
      })
      .from(managerAttractionPermissions)
      .where(eq(managerAttractionPermissions.managerId, auth.user.id));

    return rows.map((row) => row.attractionId);
  }

  // =====================================================
  // STAFF
  // =====================================================

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

/* =========================================================
   CHECK ATTRACTION ACCESS
========================================================= */

/**
 * Check access to one attraction.
 */
export async function hasAttractionAccess(
  auth: AuthContext,
  attractionId: string,
): Promise<boolean> {
  // =====================================================
  // ADMIN
  // =====================================================

  /**
   * Admins can access attractions belonging to their
   * own tenant/admin account.
   *
   * We still verify attractions.adminId.
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

  // =====================================================
  // MANAGER
  // =====================================================

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

  // =====================================================
  // STAFF
  // =====================================================

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
 * Attraction limit for screens and APIs a manager shares with the admin.
 *
 * MANAGER: the assigned attraction IDs.
 * ADMIN / STAFF: undefined, no limit is added by this helper.
 */
export async function getManagerAttractionScope(
  auth: AuthContext,
): Promise<string[] | undefined> {
  return auth.user.role === "MANAGER"
    ? getAccessibleAttractionIds(auth)
    : undefined;
}

/**
 * Modules this user can give to staff.
 *
 * ADMIN: every staff module.
 * MANAGER: only the staff modules the manager holds.
 */
export async function getGrantableStaffModules(auth: AuthContext) {
  const staffModules = await db
    .select({
      id: systemModules.id,
      key: systemModules.key,
    })
    .from(systemModules)
    .where(
      and(
        eq(systemModules.isActive, "ACTIVE"),
        inArray(systemModules.key, STAFF_ALLOWED_MODULES),
      ),
    );

  if (auth.user.role !== "MANAGER") {
    return staffModules;
  }

  const managerModules = await db
    .select({
      moduleId: managerSystemModulePermissions.moduleId,
    })
    .from(managerSystemModulePermissions)
    .where(eq(managerSystemModulePermissions.managerId, auth.user.id));

  const managerModuleIds = new Set(managerModules.map((item) => item.moduleId));

  return staffModules.filter((item) => managerModuleIds.has(item.id));
}

/* =========================================================
   REQUIRE ATTRACTION ACCESS
========================================================= */

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
