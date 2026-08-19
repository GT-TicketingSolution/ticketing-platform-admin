import { NextRequest } from "next/server";

import { and, eq, ilike, inArray, or, sql } from "drizzle-orm";

import { db } from "@/db";

import {
  users,
  staffRoles,
  staffAttractionAssignments,
  attractions,
} from "@/db/schema";

import { requireAuth } from "@/lib/auth/require-auth";
import { hashPassword } from "@/lib/auth/password";

import { success, failure } from "@/lib/api/response";

import { z } from "zod";

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

  status: z
    .enum(["ACTIVE", "SUSPENDED", "DISABLED"])
    .optional()
    .default("ACTIVE"),
});

/* =========================================================
   STAFF ACCESS
========================================================= */

/**
 * Staff APIs can be viewed by:
 * - ADMIN
 * - MANAGER
 *
 * STAFF users cannot access these APIs.
 */
function canViewStaff(role: string) {
  return role === "ADMIN" || role === "MANAGER";
}

/**
 * Staff creation is restricted to ADMIN.
 */
function canCreateStaff(role: string) {
  return role === "ADMIN";
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

    // -----------------------------------------------------
    // Authorization
    //
    // ADMIN + MANAGER can view staff.
    // -----------------------------------------------------

    if (!canViewStaff(auth.user.role)) {
      return failure("Admin or manager access required.", 403, "FORBIDDEN");
    }

    // -----------------------------------------------------
    // Determine tenant/admin owner
    //
    // ADMIN:
    //   auth.user.id = adminId
    //
    // MANAGER:
    //   auth.user.adminId = adminId
    //
    // This ensures managers only see staff belonging
    // to their own admin/tenant.
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
    //
    // The attraction must belong to the authenticated
    // admin/tenant.
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

    const conditions = [
      eq(users.role, "STAFF"),

      // CRITICAL:
      // Staff must belong to the authenticated admin.
      eq(users.adminId, adminId),
    ];

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

    if (
      status === "ACTIVE" ||
      status === "SUSPENDED" ||
      status === "DISABLED"
    ) {
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

            // The attraction must belong to this admin.
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

              // Never expose another admin's attractions.
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
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return failure("Authentication required.", 401, "UNAUTHORIZED");
      }

      if (error.message === "ACCOUNT_NOT_ACTIVE") {
        return failure("Account is not active.", 403, "ACCOUNT_NOT_ACTIVE");
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

    // -----------------------------------------------------
    // Authorization
    //
    // Only ADMIN can create staff.
    // MANAGER can view but cannot create.
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

    const normalizedEmail = email.trim().toLowerCase();

    // -----------------------------------------------------
    // Check duplicate email
    // -----------------------------------------------------

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
    //
    // Admin can only assign attractions belonging to
    // that same admin.
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

        // Staff belongs to this admin.
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

    if (roles.length > 0) {
      await db.insert(staffRoles).values(
        roles.map((role) => ({
          staffId: staff.id,
          role: role.trim(),
        })),
      );
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
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return failure("Authentication required.", 401, "UNAUTHORIZED");
      }

      if (error.message === "ACCOUNT_NOT_ACTIVE") {
        return failure("Account is not active.", 403, "ACCOUNT_NOT_ACTIVE");
      }
    }

    console.error("Create staff error:", error);

    return failure("Unable to create staff.", 500, "INTERNAL_SERVER_ERROR");
  }
}

const updateStaffSchema = z.object({
  name: z.string().min(2).max(150).optional(),

  email: z.string().email().optional(),

  phone: z.string().max(20).optional(),

  password: z.string().min(8).optional(),

  roles: z.array(z.string().min(1)).optional(),

  attractionIds: z.array(z.string().uuid()).optional(),

  status: z.enum(["ACTIVE", "SUSPENDED", "DISABLED"]).optional(),
});

/* =========================================================
   PATCH /api/admin/staff/[staffId]
========================================================= */

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ staffId: string }> },
) {
  try {
    /* -----------------------------------------------------
       Authentication
    ----------------------------------------------------- */

    const auth = await requireAuth(request);

    /* -----------------------------------------------------
       Only ADMIN / MANAGER can edit staff
    ----------------------------------------------------- */

    if (auth.user.role !== "ADMIN" && auth.user.role !== "MANAGER") {
      return failure("Admin or manager access required.", 403, "FORBIDDEN");
    }

    /* -----------------------------------------------------
       Get staffId
    ----------------------------------------------------- */

    const { staffId } = await params;

    /* -----------------------------------------------------
       Determine admin/tenant owner
    ----------------------------------------------------- */

    const adminId =
      auth.user.role === "ADMIN" ? auth.user.id : auth.user.adminId;

    if (!adminId) {
      return failure(
        "Unable to determine admin ownership.",
        403,
        "ADMIN_CONTEXT_NOT_FOUND",
      );
    }

    /* -----------------------------------------------------
       Find staff
    ----------------------------------------------------- */

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

    /* -----------------------------------------------------
       Validate body
    ----------------------------------------------------- */

    const body = await request.json();

    const parsed = updateStaffSchema.safeParse(body);

    if (!parsed.success) {
      return failure("Invalid staff details.", 400, "VALIDATION_ERROR");
    }

    const { name, email, phone, password, roles, attractionIds, status } =
      parsed.data;

    /* -----------------------------------------------------
       Check duplicate email
    ----------------------------------------------------- */

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

    /* -----------------------------------------------------
       Validate attractions
    ----------------------------------------------------- */

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

    /* -----------------------------------------------------
       Prepare staff update
    ----------------------------------------------------- */

    const updateData: {
      name?: string;
      email?: string;
      phone?: string | null;
      passwordHash?: string;
      status?: "ACTIVE" | "SUSPENDED" | "DISABLED";
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

    /* -----------------------------------------------------
       Hash new password
    ----------------------------------------------------- */

    if (password) {
      updateData.passwordHash = await hashPassword(password);
    }

    /* -----------------------------------------------------
       Update staff
    ----------------------------------------------------- */

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

    /* -----------------------------------------------------
       Update roles
    ----------------------------------------------------- */

    if (roles !== undefined) {
      await db.delete(staffRoles).where(eq(staffRoles.staffId, staffId));

      if (roles.length > 0) {
        await db.insert(staffRoles).values(
          roles.map((role) => ({
            staffId,
            role: role.trim(),
          })),
        );
      }
    }

    /* -----------------------------------------------------
       Update attraction assignments
    ----------------------------------------------------- */

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

    /* -----------------------------------------------------
       Fetch updated roles
    ----------------------------------------------------- */

    const updatedRoles = await db
      .select({
        id: staffRoles.id,
        role: staffRoles.role,
      })
      .from(staffRoles)
      .where(eq(staffRoles.staffId, staffId));

    /* -----------------------------------------------------
       Fetch updated attractions
    ----------------------------------------------------- */

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

    /* -----------------------------------------------------
       Response
    ----------------------------------------------------- */

    return success({
      staff: {
        ...updatedStaff,
        roles: updatedRoles,
        attractions: updatedAttractions,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return failure("Authentication required.", 401, "UNAUTHORIZED");
      }

      if (error.message === "ACCOUNT_NOT_ACTIVE") {
        return failure("Account is not active.", 403, "ACCOUNT_NOT_ACTIVE");
      }
    }

    console.error("Update staff error:", error);

    return failure("Unable to update staff.", 500, "INTERNAL_SERVER_ERROR");
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ staffId: string }> },
) {
  try {
    /* -----------------------------------------------------
       Authentication
    ----------------------------------------------------- */

    const auth = await requireAuth(request);

    /* -----------------------------------------------------
       Authorization
       Only ADMIN can delete staff
    ----------------------------------------------------- */

    if (auth.user.role !== "ADMIN") {
      return failure("Admin access required.", 403, "FORBIDDEN");
    }

    /* -----------------------------------------------------
       Get staffId
    ----------------------------------------------------- */

    const { staffId } = await params;

    /* -----------------------------------------------------
       Admin ownership
    ----------------------------------------------------- */

    const adminId = auth.user.id;

    /* -----------------------------------------------------
       Check staff exists and belongs to this admin
    ----------------------------------------------------- */

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

    /* -----------------------------------------------------
       Delete attraction assignments
    ----------------------------------------------------- */

    await db
      .delete(staffAttractionAssignments)
      .where(eq(staffAttractionAssignments.staffId, staffId));

    /* -----------------------------------------------------
       Delete staff roles
    ----------------------------------------------------- */

    await db.delete(staffRoles).where(eq(staffRoles.staffId, staffId));

    /* -----------------------------------------------------
       Delete staff user
    ----------------------------------------------------- */

    await db
      .delete(users)
      .where(
        and(
          eq(users.id, staffId),
          eq(users.role, "STAFF"),
          eq(users.adminId, adminId),
        ),
      );

    /* -----------------------------------------------------
       Response
    ----------------------------------------------------- */

    return success({
      message: "Staff deleted successfully.",
      staffId,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return failure("Authentication required.", 401, "UNAUTHORIZED");
      }

      if (error.message === "ACCOUNT_NOT_ACTIVE") {
        return failure("Account is not active.", 403, "ACCOUNT_NOT_ACTIVE");
      }
    }

    console.error("Delete staff error:", error);

    return failure("Unable to delete staff.", 500, "INTERNAL_SERVER_ERROR");
  }
}
