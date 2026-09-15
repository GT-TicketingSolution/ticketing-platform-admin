import { NextRequest } from "next/server";

import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db";

import {
  users,
  staffRoles,
  staffSystemModulePermissions,
  staffAttractionAssignments,
  attractions,
  managerAttractionPermissions,
  systemModules,
} from "@/db/schema";

import { requireAuth } from "@/lib/auth/require-auth";
import { requireModuleAccess } from "@/lib/auth/authorization";
import { hashPassword } from "@/lib/auth/password";

import { success, failure } from "@/lib/api/response";

import { z } from "zod";

/* =========================================================
   STAFF ROLE → SYSTEM MODULE MAPPING
========================================================= */

const STAFF_ROLE_MODULES: Record<string, string[]> = {
  "Counter Operator": ["TICKET_BOOKING"],
  "Validator": ["SCANNER"],
  "Reports Access": ["REPORTS"],
};

/* =========================================================
   VALIDATION
========================================================= */

const updateStaffSchema = z.object({
  name: z.string().min(2).max(150).optional(),

  email: z.string().email().optional(),

  phone: z.string().max(20).optional(),

  password: z.string().min(8).optional(),

  roles: z
    .array(
      z.object({
        id: z.string().uuid().optional(),
        role: z.string().min(1),
      }),
    )
    .optional(),

  attractionIds: z.array(z.string().uuid()).optional(),

  staffSystemModuleAllowedIds: z.array(z.string().uuid()).optional(),

  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),

  canViewReports: z.boolean().optional(),

  reportAccessTiming: z.number().int().positive().optional(),

  reportAccessUnit: z.enum(["HOURS"]).optional(),
});

/* =========================================================
   PATCH /api/admin/staff/[staffId]
========================================================= */

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ staffId: string }> },
) {
  try {
    // -----------------------------------------------------
    // Authentication
    // -----------------------------------------------------

    const auth = await requireAuth(request);

    await requireModuleAccess(auth, "STAFF_MANAGEMENT");

    // -----------------------------------------------------
    // Authorization
    // -----------------------------------------------------

    if (auth.user.role !== "ADMIN" && auth.user.role !== "MANAGER") {
      return failure("Admin or manager access required.", 403, "FORBIDDEN");
    }

    // -----------------------------------------------------
    // Get staffId
    // -----------------------------------------------------

    const { staffId } = await params;

    // -----------------------------------------------------
    // Determine admin owner
    // -----------------------------------------------------

    const adminId =
      auth.user.role === "ADMIN" ? auth.user.id : auth.user.adminId;

    if (!adminId) {
      return failure(
        "Unable to determine admin ownership.",
        403,
        "ADMIN_CONTEXT_NOT_FOUND",
      );
    }

    // -----------------------------------------------------
    // Find staff
    // -----------------------------------------------------

    const [existingStaff] = await db
      .select({
        id: users.id,
        email: users.email,
      })
      .from(users)
      .where(
        and(
          eq(users.id, staffId),
          eq(users.role, "STAFF"),
          eq(users.adminId, adminId),
        ),
      )
      .limit(1);

    if (!existingStaff) {
      return failure("Staff member not found.", 404, "STAFF_NOT_FOUND");
    }

    // -----------------------------------------------------
    // Validate body
    // -----------------------------------------------------

    const body = await request.json();

    const parsed = updateStaffSchema.safeParse(body);

    if (!parsed.success) {
      return failure("Invalid staff details.", 400, "VALIDATION_ERROR");
    }

    const {
      name,
      email,
      phone,
      password,
      roles,
      attractionIds,
      status,
      reportAccessTiming,
      reportAccessUnit,
      staffSystemModuleAllowedIds,
    } = parsed.data;

    // -----------------------------------------------------
    // Check duplicate email
    // -----------------------------------------------------

    if (email) {
      const normalizedEmail = email.trim().toLowerCase();

      const [emailUser] = await db
        .select({
          id: users.id,
        })
        .from(users)
        .where(eq(users.email, normalizedEmail))
        .limit(1);

      if (emailUser && emailUser.id !== staffId) {
        return failure("Email already exists.", 409, "EMAIL_ALREADY_EXISTS");
      }
    }

    // -----------------------------------------------------
    // Validate attractions
    // -----------------------------------------------------

    if (attractionIds !== undefined && attractionIds.length > 0) {
      const validAttractions = await db
        .select({
          id: attractions.id,
        })
        .from(attractions)
        .where(
          and(
            inArray(attractions.id, attractionIds),
            eq(attractions.adminId, adminId),
          ),
        );

      const validIds = new Set(validAttractions.map((item) => item.id));

      const invalidIds = attractionIds.filter((id) => !validIds.has(id));

      if (invalidIds.length > 0) {
        return failure(
          "One or more attractions are invalid or do not belong to this admin.",
          400,
          "INVALID_ATTRACTION",
        );
      }
    }

    // -----------------------------------------------------
    // Prepare staff update
    // -----------------------------------------------------

    const updateData: {
      name?: string;
      email?: string;
      phone?: string | null;
      passwordHash?: string;
      status?: "ACTIVE" | "INACTIVE";
    } = {};

    if (name !== undefined) {
      updateData.name = name.trim();
    }

    if (email !== undefined) {
      updateData.email = email.trim().toLowerCase();
    }

    if (phone !== undefined) {
      updateData.phone = phone.trim() || null;
    }

    if (status !== undefined) {
      updateData.status = status;
    }

    // -----------------------------------------------------
    // Hash new password
    // -----------------------------------------------------

    if (password) {
      updateData.passwordHash = await hashPassword(password);
    }

    // -----------------------------------------------------
    // Update staff
    // -----------------------------------------------------

    let updatedStaff = existingStaff;

    if (Object.keys(updateData).length > 0) {
      const [result] = await db
        .update(users)
        .set(updateData)
        .where(
          and(
            eq(users.id, staffId),
            eq(users.role, "STAFF"),
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
        });

      if (!result) {
        return failure("Unable to update staff.", 500, "STAFF_UPDATE_FAILED");
      }

      updatedStaff = result;
    }

    // -----------------------------------------------------
    // Update roles + module permissions
    // -----------------------------------------------------

    if (roles !== undefined) {
      const normalizedRoles = roles.map((item) => ({
        id: item.id,
        role: item.role.trim(),
      }));

      // -----------------------------------------------
      // Resolve modules from the new roles
      // -----------------------------------------------

      const moduleKeys = [
        ...new Set(
          normalizedRoles.flatMap(
            (item) => STAFF_ROLE_MODULES[item.role] ?? [],
          ),
        ),
      ];

      let roleModules: {
        id: string;
        key: string;
      }[] = [];

      if (moduleKeys.length > 0) {
        roleModules = await db
          .select({
            id: systemModules.id,
            key: systemModules.key,
          })
          .from(systemModules)
          .where(
            and(
              inArray(systemModules.key, moduleKeys),
              eq(systemModules.isActive, "ACTIVE"),
            ),
          );

        if (roleModules.length !== moduleKeys.length) {
          return failure(
            "One or more role modules are not configured.",
            400,
            "ROLE_MODULE_NOT_CONFIGURED",
          );
        }
      }

      // -----------------------------------------------
      // Fetch existing roles
      // -----------------------------------------------

      const existingRoles = await db
        .select({
          id: staffRoles.id,
          role: staffRoles.role,
        })
        .from(staffRoles)
        .where(eq(staffRoles.staffId, staffId));

      const existingRoleIds = new Set(
        existingRoles.map((item) => item.id),
      );

      const incomingRoleIds = new Set(
        normalizedRoles
          .filter((item) => item.id)
          .map((item) => item.id!),
      );

      // -----------------------------------------------
      // Delete only removed roles
      // -----------------------------------------------

      const rolesToDelete = existingRoles
        .filter((item) => !incomingRoleIds.has(item.id))
        .map((item) => item.id);

      if (rolesToDelete.length > 0) {
        await db
          .delete(staffRoles)
          .where(inArray(staffRoles.id, rolesToDelete));
      }

      // -----------------------------------------------
      // Update existing roles / insert new roles
      // -----------------------------------------------

      for (const item of normalizedRoles) {
        if (item.id && existingRoleIds.has(item.id)) {
          await db
            .update(staffRoles)
            .set({
              role: item.role,
            })
            .where(
              and(
                eq(staffRoles.id, item.id),
                eq(staffRoles.staffId, staffId),
              ),
            );
        } else {
          await db.insert(staffRoles).values({
            staffId,
            role: item.role,
          });
        }
      }

      // -----------------------------------------------
      // Synchronize module permissions
      // -----------------------------------------------

      const allowedModuleIds = staffSystemModuleAllowedIds ?? [];

      const existingPermissions = await db
        .select({
          id: staffSystemModulePermissions.id,
          moduleId: staffSystemModulePermissions.moduleId,
        })
        .from(staffSystemModulePermissions)
        .where(eq(staffSystemModulePermissions.staffId, staffId));

      const existingPermissionModuleIds = new Set(
        existingPermissions.map((item) => item.moduleId),
      );

      const incomingPermissionModuleIds = new Set(allowedModuleIds);

      // -----------------------------------------------
      // Delete only removed permissions
      // -----------------------------------------------

      const permissionsToDelete = existingPermissions
        .filter(
          (item) => !incomingPermissionModuleIds.has(item.moduleId),
        )
        .map((item) => item.id);

      if (permissionsToDelete.length > 0) {
        await db
          .delete(staffSystemModulePermissions)
          .where(
            inArray(
              staffSystemModulePermissions.id,
              permissionsToDelete,
            ),
          );
      }

      // -----------------------------------------------
      // Insert only new permissions
      // -----------------------------------------------

      const permissionsToInsert = allowedModuleIds.filter(
        (moduleId) => !existingPermissionModuleIds.has(moduleId),
      );

      if (permissionsToInsert.length > 0) {
        await db
          .insert(staffSystemModulePermissions)
          .values(
            permissionsToInsert.map((moduleId) => ({
              staffId,
              moduleId,

              reportAccessTiming: reportAccessTiming ?? null,
              reportAccessUnit: reportAccessUnit ?? null,
            })),
          )
          .onConflictDoNothing();
      }

      // -----------------------------------------------
      // Update report settings on existing permissions
      // -----------------------------------------------

      if (
        reportAccessTiming !== undefined ||
        reportAccessUnit !== undefined
      ) {
        await db
          .update(staffSystemModulePermissions)
          .set({
            ...(reportAccessTiming !== undefined && {
              reportAccessTiming,
            }),
            ...(reportAccessUnit !== undefined && {
              reportAccessUnit,
            }),
          })
          .where(
            and(
              eq(staffSystemModulePermissions.staffId, staffId),
              inArray(
                staffSystemModulePermissions.moduleId,
                allowedModuleIds,
              ),
            ),
          );
      }
    }

    // -----------------------------------------------------
    // Update attraction assignments
    // -----------------------------------------------------

    if (attractionIds !== undefined) {
      const existingAssignments = await db
        .select({
          id: staffAttractionAssignments.id,
          attractionId: staffAttractionAssignments.attractionId,
        })
        .from(staffAttractionAssignments)
        .where(eq(staffAttractionAssignments.staffId, staffId));

      const existingAttractionIds = new Set(
        existingAssignments.map((item) => item.attractionId),
      );

      const incomingAttractionIds = new Set(attractionIds);

      // -----------------------------------------------
      // Delete only removed assignments
      // -----------------------------------------------

      const assignmentsToDelete = existingAssignments
        .filter(
          (item) => !incomingAttractionIds.has(item.attractionId),
        )
        .map((item) => item.id);

      if (assignmentsToDelete.length > 0) {
        await db
          .delete(staffAttractionAssignments)
          .where(
            inArray(
              staffAttractionAssignments.id,
              assignmentsToDelete,
            ),
          );
      }

      // -----------------------------------------------
      // Insert only new assignments
      // -----------------------------------------------

      const assignmentsToInsert = attractionIds.filter(
        (attractionId) => !existingAttractionIds.has(attractionId),
      );

      if (assignmentsToInsert.length > 0) {
        await db.insert(staffAttractionAssignments).values(
          assignmentsToInsert.map((attractionId) => ({
            staffId,
            attractionId,
          })),
        );
      }
    }

    // -----------------------------------------------------
    // Fetch updated roles
    // -----------------------------------------------------

    const updatedRoles = await db
      .select({
        id: staffRoles.id,
        role: staffRoles.role,
      })
      .from(staffRoles)
      .where(eq(staffRoles.staffId, staffId));

    // -----------------------------------------------------
    // Fetch updated attractions
    // -----------------------------------------------------

    const updatedAttractions = await db
      .select({
        id: attractions.id,
        name: attractions.name,
      })
      .from(staffAttractionAssignments)
      .innerJoin(
        attractions,
        eq(staffAttractionAssignments.attractionId, attractions.id),
      )
      .where(
        and(
          eq(staffAttractionAssignments.staffId, staffId),
          eq(attractions.adminId, adminId),
        ),
      );

    // -----------------------------------------------------
    // Response
    // -----------------------------------------------------

    return success({
      staff: {
        ...updatedStaff,
        roles: updatedRoles,
        attractions: updatedAttractions,
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      switch (error.message) {
        case "UNAUTHORIZED":
          return failure("Authentication required.", 401, "UNAUTHORIZED");

        case "ACCOUNT_NOT_ACTIVE":
          return failure("Account is not active.", 403, "ACCOUNT_NOT_ACTIVE");

        case "FORBIDDEN":
          return failure(
            "You are not authorized to access this module.",
            403,
            "FORBIDDEN",
          );
      }
    }

    console.error("Update staff error:", error);

    return failure("Unable to update staff.", 500, "INTERNAL_SERVER_ERROR");
  }
}

/* =========================================================
   DELETE /api/admin/staff/[staffId]
========================================================= */

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ staffId: string }> },
) {
  try {
    // -----------------------------------------------------
    // Authentication
    // -----------------------------------------------------

    const auth = await requireAuth(request);

    await requireModuleAccess(auth, "STAFF_MANAGEMENT");

    // -----------------------------------------------------
    // Authorization
    // -----------------------------------------------------

    if (auth.user.role !== "ADMIN" && auth.user.role !== "MANAGER") {
      return failure("Admin or manager access required.", 403, "FORBIDDEN");
    }

    // -----------------------------------------------------
    // Get staffId
    // -----------------------------------------------------

    const { staffId } = await params;

    // -----------------------------------------------------
    // Determine admin owner
    // -----------------------------------------------------

    const adminId =
      auth.user.role === "ADMIN" ? auth.user.id : auth.user.adminId;

    if (!adminId) {
      return failure(
        "Unable to determine admin ownership.",
        403,
        "ADMIN_CONTEXT_NOT_FOUND",
      );
    }

    // -----------------------------------------------------
    // Check staff exists and belongs to this admin
    // -----------------------------------------------------

    const [staff] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
      })
      .from(users)
      .where(
        and(
          eq(users.id, staffId),
          eq(users.role, "STAFF"),
          eq(users.adminId, adminId),
        ),
      )
      .limit(1);

    if (!staff) {
      return failure("Staff member not found.", 404, "STAFF_NOT_FOUND");
    }

    // -----------------------------------------------------
    // MANAGER ACCESS CHECK
    // -----------------------------------------------------

    if (auth.user.role === "MANAGER") {
      // -----------------------------------------------
      // Get attractions assigned to manager
      // -----------------------------------------------

      const managerAttractions = await db
        .select({
          attractionId: managerAttractionPermissions.attractionId,
        })
        .from(managerAttractionPermissions)
        .where(eq(managerAttractionPermissions.managerId, auth.user.id));

      const managerAttractionIds = [
        ...new Set(managerAttractions.map((item) => item.attractionId)),
      ];

      if (managerAttractionIds.length === 0) {
        return failure(
          "You are not assigned to any attractions.",
          403,
          "NO_ATTRACTION_ACCESS",
        );
      }

      // -----------------------------------------------
      // Get staff attractions
      // -----------------------------------------------

      const staffAttractions = await db
        .select({
          attractionId: staffAttractionAssignments.attractionId,
        })
        .from(staffAttractionAssignments)
        .where(eq(staffAttractionAssignments.staffId, staffId));

      const staffAttractionIds = [
        ...new Set(staffAttractions.map((item) => item.attractionId)),
      ];

      if (staffAttractionIds.length === 0) {
        return failure(
          "This staff member is not assigned to any attraction you manage.",
          403,
          "STAFF_ATTRACTION_NOT_ASSIGNED",
        );
      }

      // -----------------------------------------------
      // Verify every staff attraction is accessible
      // -----------------------------------------------

      const unauthorizedAttractions = staffAttractionIds.filter(
        (attractionId) => !managerAttractionIds.includes(attractionId),
      );

      if (unauthorizedAttractions.length > 0) {
        return failure(
          "You cannot delete this staff member because they are assigned to attractions outside your access.",
          403,
          "STAFF_ATTRACTION_ACCESS_DENIED",
        );
      }
    }

    // -----------------------------------------------------
    // Delete attraction assignments
    // -----------------------------------------------------

    await db
      .delete(staffAttractionAssignments)
      .where(eq(staffAttractionAssignments.staffId, staffId));

    // -----------------------------------------------------
    // Delete staff module permissions
    // -----------------------------------------------------

    await db
      .delete(staffSystemModulePermissions)
      .where(eq(staffSystemModulePermissions.staffId, staffId));

    // -----------------------------------------------------
    // Delete staff roles
    // -----------------------------------------------------

    await db.delete(staffRoles).where(eq(staffRoles.staffId, staffId));

    // -----------------------------------------------------
    // Delete staff user
    // -----------------------------------------------------

    await db
      .delete(users)
      .where(
        and(
          eq(users.id, staffId),
          eq(users.role, "STAFF"),
          eq(users.adminId, adminId),
        ),
      );

    // -----------------------------------------------------
    // Response
    // -----------------------------------------------------

    return success({
      message: "Staff deleted successfully.",
      staffId,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      switch (error.message) {
        case "UNAUTHORIZED":
          return failure("Authentication required.", 401, "UNAUTHORIZED");

        case "ACCOUNT_NOT_ACTIVE":
          return failure("Account is not active.", 403, "ACCOUNT_NOT_ACTIVE");

        case "FORBIDDEN":
          return failure(
            "You are not authorized to access this module.",
            403,
            "FORBIDDEN",
          );
      }
    }

    console.error("Delete staff error:", error);

    return failure("Unable to delete staff.", 500, "INTERNAL_SERVER_ERROR");
  }
}
