import { NextRequest } from "next/server";

import { and, eq, ilike, inArray, or, sql } from "drizzle-orm";

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
  Validator: ["SCANNER"],
};

/* =========================================================
   VALIDATION
========================================================= */

const createStaffSchema = z.object({
  name: z.string().min(2).max(150),

  email: z.string().email(),

  phone: z.string().max(20).optional(),

  password: z.string().min(8),

  roles: z.array(z.string().min(1)).optional().default([]),

  attractionIds: z.array(z.string().uuid()).optional().default([]),

  status: z.enum(["ACTIVE", "INACTIVE"]).optional().default("ACTIVE"),

  reportAccessTiming: z.number().int().positive().optional(),

  reportAccessUnit: z.string().max(20).optional(),
});

/* =========================================================
   STAFF ACCESS
========================================================= */

function canViewStaff(role: string) {
  return role === "ADMIN" || role === "MANAGER";
}

function canCreateStaff(role: string) {
  return role === "ADMIN" || role === "MANAGER";
}

/* =========================================================
   GET /api/admin/staff
========================================================= */

export async function GET(request: NextRequest) {
  try {
    // -----------------------------------------------------
    // Authentication
    // -----------------------------------------------------

    const auth = await requireAuth(request);

    await requireModuleAccess(auth, "STAFF_MANAGEMENT");

    // -----------------------------------------------------
    // Authorization
    // -----------------------------------------------------

    if (!canViewStaff(auth.user.role)) {
      return failure("Admin or manager access required.", 403, "FORBIDDEN");
    }

    // -----------------------------------------------------
    // Determine tenant/admin owner
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
    // Query params
    // -----------------------------------------------------

    const { searchParams } = new URL(request.url);

    const pageParam = Number(searchParams.get("page") || "1");

    const limitParam = Number(searchParams.get("limit") || "10");

    const page = Number.isFinite(pageParam) ? Math.max(pageParam, 1) : 1;

    const limit = Number.isFinite(limitParam)
      ? Math.min(Math.max(limitParam, 1), 100)
      : 10;

    const search = searchParams.get("search")?.trim() || "";

    const status = searchParams.get("status");

    const attractionId = searchParams.get("attractionId");

    const offset = (page - 1) * limit;

    // -----------------------------------------------------
    // Validate attraction filter
    // -----------------------------------------------------

    if (attractionId) {
      const [attraction] = await db
        .select({
          id: attractions.id,
        })
        .from(attractions)
        .where(
          and(
            eq(attractions.id, attractionId),
            eq(attractions.adminId, adminId),
          ),
        )
        .limit(1);

      if (!attraction) {
        return failure("Attraction not found.", 404, "ATTRACTION_NOT_FOUND");
      }
    }

    // -----------------------------------------------------
    // Base staff conditions
    // -----------------------------------------------------

    const conditions = [eq(users.role, "STAFF"), eq(users.adminId, adminId)];

    // -----------------------------------------------------
    // Search
    // -----------------------------------------------------

    if (search) {
      conditions.push(
        or(
          ilike(users.name, `%${search}%`),
          ilike(users.email, `%${search}%`),
          ilike(users.phone, `%${search}%`),
        )!,
      );
    }

    // -----------------------------------------------------
    // Status filter
    // -----------------------------------------------------

    if (status === "ACTIVE" || status === "INACTIVE") {
      conditions.push(eq(users.status, status));
    }

    // -----------------------------------------------------
    // Attraction filter
    // -----------------------------------------------------

    if (attractionId) {
      const assignedStaff = await db
        .select({
          staffId: staffAttractionAssignments.staffId,
        })
        .from(staffAttractionAssignments)
        .innerJoin(
          attractions,
          eq(staffAttractionAssignments.attractionId, attractions.id),
        )
        .where(
          and(
            eq(staffAttractionAssignments.attractionId, attractionId),
            eq(attractions.adminId, adminId),
          ),
        );

      const staffIds = assignedStaff.map((item) => item.staffId);

      if (staffIds.length === 0) {
        return success({
          items: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
          },
        });
      }

      conditions.push(inArray(users.id, staffIds));
    }

    // -----------------------------------------------------
    // Total count
    // -----------------------------------------------------

    const [{ count }] = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(users)
      .where(and(...conditions));

    const total = Number(count);

    // -----------------------------------------------------
    // Staff list
    // -----------------------------------------------------

    const staff = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        status: users.status,
        joinedDate: users.createdAt,
      })
      .from(users)
      .where(and(...conditions))
      .orderBy(sql`${users.createdAt} DESC`)
      .limit(limit)
      .offset(offset);

    // -----------------------------------------------------
    // Attach roles + attractions
    // -----------------------------------------------------

    const staffWithDetails = await Promise.all(
      staff.map(async (member) => {
        // -----------------------------------------------
        // Staff roles
        // -----------------------------------------------

        const roles = await db
          .select({
            id: staffRoles.id,
            role: staffRoles.role,
          })
          .from(staffRoles)
          .where(eq(staffRoles.staffId, member.id));

        // -----------------------------------------------
        // Staff attractions
        // -----------------------------------------------

        const assignedAttractions = await db
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
              eq(staffAttractionAssignments.staffId, member.id),
              eq(attractions.adminId, adminId),
            ),
          );

        return {
          ...member,
          roles,
          attractions: assignedAttractions,
        };
      }),
    );

    // -----------------------------------------------------
    // Response
    // -----------------------------------------------------

    return success({
      items: staffWithDetails,

      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
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

    console.error("Get staff error:", error);

    return failure("Unable to fetch staff.", 500, "INTERNAL_SERVER_ERROR");
  }
}

/* =========================================================
   POST /api/admin/staff
========================================================= */

export async function POST(request: Request) {
  try {
    // -----------------------------------------------------
    // Authentication
    // -----------------------------------------------------

    const auth = await requireAuth(request);

    await requireModuleAccess(auth, "STAFF_MANAGEMENT");

    // -----------------------------------------------------
    // Authorization
    // -----------------------------------------------------

    if (!canCreateStaff(auth.user.role)) {
      return failure("Admin access required.", 403, "FORBIDDEN");
    }

    // -----------------------------------------------------
    // Admin becomes staff owner
    // -----------------------------------------------------

    const adminId = auth.user.id;

    // -----------------------------------------------------
    // Validate request body
    // -----------------------------------------------------

    const body = await request.json();

    const parsed = createStaffSchema.safeParse(body);

    if (!parsed.success) {
      return failure("Invalid staff details.", 400, "VALIDATION_ERROR");
    }

    const { name, email, phone, password, roles, attractionIds, status } =
      parsed.data;

    // -----------------------------------------------------
    // Normalize roles
    // -----------------------------------------------------

    const normalizedRoles = [...new Set(roles.map((role) => role.trim()))];

    // -----------------------------------------------------
    // Check duplicate email
    // -----------------------------------------------------

    const normalizedEmail = email.trim().toLowerCase();

    const [existingUser] = await db
      .select({
        id: users.id,
      })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existingUser) {
      return failure("Email already exists.", 409, "EMAIL_ALREADY_EXISTS");
    }

    // -----------------------------------------------------
    // Validate attractions
    // -----------------------------------------------------

    if (attractionIds.length > 0) {
      const existingAttractions = await db
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

      const existingAttractionIds = new Set(
        existingAttractions.map((attraction) => attraction.id),
      );

      const invalidAttractionIds = attractionIds.filter(
        (id) => !existingAttractionIds.has(id),
      );

      if (invalidAttractionIds.length > 0) {
        return failure(
          "One or more attractions are invalid or do not belong to this admin.",
          400,
          "INVALID_ATTRACTION",
        );
      }
    }

    // -----------------------------------------------------
    // Resolve modules from roles
    // -----------------------------------------------------

    const moduleKeys = [
      ...new Set(
        normalizedRoles.flatMap((role) => STAFF_ROLE_MODULES[role] ?? []),
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

    // -----------------------------------------------------
    // Hash password
    // -----------------------------------------------------

    const passwordHash = await hashPassword(password);

    // -----------------------------------------------------
    // Create staff
    // -----------------------------------------------------

    const [staff] = await db
      .insert(users)
      .values({
        name: name.trim(),

        email: normalizedEmail,

        phone: phone?.trim() || null,

        passwordHash,

        role: "STAFF",

        status,

        adminId,
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

    if (!staff) {
      throw new Error("STAFF_CREATE_FAILED");
    }

    // -----------------------------------------------------
    // Insert staff roles
    // -----------------------------------------------------

    if (normalizedRoles.length > 0) {
      await db.insert(staffRoles).values(
        normalizedRoles.map((role) => ({
          staffId: staff.id,
          role,
        })),
      );
    }

    // -----------------------------------------------------
    // Insert staff module permissions
    // -----------------------------------------------------

    if (roleModules.length > 0) {
      await db
        .insert(staffSystemModulePermissions)
        .values(
          roleModules.map((module) => ({
            staffId: staff.id,
            moduleId: module.id,
          })),
        )
        .onConflictDoNothing();
    }

    // -----------------------------------------------------
    // Insert attraction assignments
    // -----------------------------------------------------

    if (attractionIds.length > 0) {
      await db.insert(staffAttractionAssignments).values(
        attractionIds.map((attractionId) => ({
          staffId: staff.id,
          attractionId,
        })),
      );
    }

    // -----------------------------------------------------
    // Response
    // -----------------------------------------------------

    return success(
      {
        staff,
      },
      201,
    );
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

    console.error("Create staff error:", error);

    return failure("Unable to create staff.", 500, "INTERNAL_SERVER_ERROR");
  }
}

/* =========================================================
   PATCH /api/admin/staff/[staffId]
========================================================= */

const updateStaffSchema = z.object({
  name: z.string().min(2).max(150).optional(),

  email: z.string().email().optional(),

  phone: z.string().max(20).optional(),

  password: z.string().min(8).optional(),

  roles: z.array(z.string().min(1)).optional(),

  attractionIds: z.array(z.string().uuid()).optional(),

  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),

  reportAccessTiming: z.number().int().positive().optional(),

  reportAccessUnit: z.enum(["HOURS", "DAYS"]).optional(),
});

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

    if (attractionIds) {
      if (attractionIds.length > 0) {
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
      const normalizedRoles = [...new Set(roles.map((role) => role.trim()))];

      // -----------------------------------------------
      // Resolve modules from the new roles
      // -----------------------------------------------

      const moduleKeys = [
        ...new Set(
          normalizedRoles.flatMap((role) => STAFF_ROLE_MODULES[role] ?? []),
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
      // Update roles
      // -----------------------------------------------

      await db.delete(staffRoles).where(eq(staffRoles.staffId, staffId));

      if (normalizedRoles.length > 0) {
        await db.insert(staffRoles).values(
          normalizedRoles.map((role) => ({
            staffId,
            role,
          })),
        );
      }

      // -----------------------------------------------
      // Synchronize module permissions
      // -----------------------------------------------

      await db
        .delete(staffSystemModulePermissions)
        .where(eq(staffSystemModulePermissions.staffId, staffId));

      if (roleModules.length > 0) {
        await db
          .insert(staffSystemModulePermissions)
          .values(
            roleModules.map((module) => ({
              staffId,
              moduleId: module.id,

              reportAccessTiming: reportAccessTiming ?? null,
              reportAccessUnit: reportAccessUnit ?? null,
            })),
          )
          .onConflictDoNothing();
      }
    }

    // -----------------------------------------------------
    // Update attraction assignments
    // -----------------------------------------------------

    if (attractionIds !== undefined) {
      await db
        .delete(staffAttractionAssignments)
        .where(eq(staffAttractionAssignments.staffId, staffId));

      if (attractionIds.length > 0) {
        await db.insert(staffAttractionAssignments).values(
          attractionIds.map((attractionId) => ({
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
