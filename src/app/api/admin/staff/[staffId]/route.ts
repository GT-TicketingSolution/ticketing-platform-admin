import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db";

import {
  users,
  staffRoles,
  staffAttractionAssignments,
  attractions,
} from "@/db/schema";

import { requireAuth } from "@/lib/auth/require-auth";
import { success, failure } from "@/lib/api/response";

import { z } from "zod";
import { hashPassword } from "@/lib/auth/password";

const updateStaffSchema = z.object({
  name: z.string().min(2).max(150).optional(),

  email: z.string().email().optional(),

  phone: z.string().max(20).optional(),

  password: z.string().min(8).optional(),

  roles: z.array(z.string().min(1)).optional(),

  attractionIds: z.array(z.string().uuid()).optional(),

  status: z.enum(["ACTIVE", "SUSPENDED", "DISABLED"]).optional(),
});

export async function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      staffId: string;
    }>;
  },
) {
  try {
    // ---------------------------------------------
    // Authentication
    // ---------------------------------------------
    const auth = await requireAuth(request);

    if (auth.user.role !== "ADMIN") {
      return failure("Admin access required.", 403, "FORBIDDEN");
    }

    // ---------------------------------------------
    // Get staff ID
    // ---------------------------------------------
    const { staffId } = await params;

    if (!staffId) {
      return failure("Staff ID is required.", 400, "STAFF_ID_REQUIRED");
    }

    // ---------------------------------------------
    // Get staff
    // ---------------------------------------------
    const [staff] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        role: users.role,
        status: users.status,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        lastLoginAt: users.lastLoginAt,
      })
      .from(users)
      .where(and(eq(users.id, staffId), eq(users.role, "STAFF")))
      .limit(1);

    if (!staff) {
      return failure("Staff not found.", 404, "STAFF_NOT_FOUND");
    }

    // ---------------------------------------------
    // Get staff roles
    // ---------------------------------------------
    const roles = await db
      .select({
        id: staffRoles.id,
        role: staffRoles.role,
      })
      .from(staffRoles)
      .where(eq(staffRoles.staffId, staffId));

    // ---------------------------------------------
    // Get assigned attractions
    // ---------------------------------------------
    const attractionsResult = await db
      .select({
        id: attractions.id,
        name: attractions.name,
        type: attractions.type,
        status: attractions.status,
      })
      .from(staffAttractionAssignments)
      .innerJoin(
        attractions,
        eq(staffAttractionAssignments.attractionId, attractions.id),
      )
      .where(eq(staffAttractionAssignments.staffId, staffId));

    // ---------------------------------------------
    // Response
    // ---------------------------------------------
    return success({
      staff: {
        ...staff,

        roles,

        attractions: attractionsResult,
      },
    });
  } catch (error) {
    console.error("Get staff details error:", error);

    return failure(
      "Unable to fetch staff details.",
      500,
      "INTERNAL_SERVER_ERROR",
    );
  }
}

export async function PUT(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      staffId: string;
    }>;
  },
) {
  try {
    // ---------------------------------------------
    // Authentication
    // ---------------------------------------------
    const auth = await requireAuth(request);

    if (auth.user.role !== "ADMIN") {
      return failure("Admin access required.", 403, "FORBIDDEN");
    }

    // ---------------------------------------------
    // Get staff ID
    // ---------------------------------------------
    const { staffId } = await params;

    if (!staffId) {
      return failure("Staff ID is required.", 400, "STAFF_ID_REQUIRED");
    }

    // ---------------------------------------------
    // Validate request body
    // ---------------------------------------------
    const body = await request.json();

    const parsed = updateStaffSchema.safeParse(body);

    if (!parsed.success) {
      return failure("Invalid staff details.", 400, "VALIDATION_ERROR");
    }

    const data = parsed.data;

    // ---------------------------------------------
    // Check staff exists
    // ---------------------------------------------
    const [existingStaff] = await db
      .select({
        id: users.id,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, staffId))
      .limit(1);

    if (!existingStaff) {
      return failure("Staff not found.", 404, "STAFF_NOT_FOUND");
    }

    if (existingStaff.role !== "STAFF") {
      return failure("User is not a staff member.", 400, "NOT_A_STAFF");
    }

    // ---------------------------------------------
    // Check email uniqueness
    // ---------------------------------------------
    if (data.email !== undefined) {
      const email = data.email.trim().toLowerCase();

      const [existingEmail] = await db
        .select({
          id: users.id,
        })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingEmail && existingEmail.id !== staffId) {
        return failure("Email already exists.", 409, "EMAIL_ALREADY_EXISTS");
      }
    }

    // ---------------------------------------------
    // Validate attractions
    // ---------------------------------------------
    if (data.attractionIds !== undefined) {
      if (data.attractionIds.length > 0) {
        const existingAttractions = await db
          .select({
            id: attractions.id,
          })
          .from(attractions)
          .where(inArray(attractions.id, data.attractionIds));

        const existingIds = new Set(
          existingAttractions.map((attraction) => attraction.id),
        );

        const invalidIds = data.attractionIds.filter(
          (id) => !existingIds.has(id),
        );

        if (invalidIds.length > 0) {
          return failure(
            "One or more attractions are invalid.",
            400,
            "INVALID_ATTRACTION",
          );
        }
      }
    }

    // ---------------------------------------------
    // Prepare user update
    // ---------------------------------------------
    const updateData: {
      name?: string;
      email?: string;
      phone?: string | null;
      passwordHash?: string;
      status?: "ACTIVE" | "SUSPENDED" | "DISABLED";
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };

    if (data.name !== undefined) {
      updateData.name = data.name.trim();
    }

    if (data.email !== undefined) {
      updateData.email = data.email.trim().toLowerCase();
    }

    if (data.phone !== undefined) {
      updateData.phone = data.phone.trim() || null;
    }

    if (data.status !== undefined) {
      updateData.status = data.status;
    }

    if (data.password !== undefined) {
      updateData.passwordHash = await hashPassword(data.password);
    }

    // ---------------------------------------------
    // Update staff user
    // ---------------------------------------------
    const [updatedStaff] = await db
      .update(users)
      .set(updateData)
      .where(and(eq(users.id, staffId), eq(users.role, "STAFF")))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        role: users.role,
        status: users.status,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        lastLoginAt: users.lastLoginAt,
      });

    if (!updatedStaff) {
      return failure("Staff not found.", 404, "STAFF_NOT_FOUND");
    }

    // ---------------------------------------------
    // Update roles
    // ---------------------------------------------
    if (data.roles !== undefined) {
      await db.delete(staffRoles).where(eq(staffRoles.staffId, staffId));

      if (data.roles.length > 0) {
        await db.insert(staffRoles).values(
          data.roles.map((role) => ({
            staffId,
            role: role.trim(),
          })),
        );
      }
    }

    // ---------------------------------------------
    // Update attractions
    // ---------------------------------------------
    if (data.attractionIds !== undefined) {
      await db
        .delete(staffAttractionAssignments)
        .where(eq(staffAttractionAssignments.staffId, staffId));

      if (data.attractionIds.length > 0) {
        await db.insert(staffAttractionAssignments).values(
          data.attractionIds.map((attractionId) => ({
            staffId,
            attractionId,
          })),
        );
      }
    }

    // ---------------------------------------------
    // Response
    // ---------------------------------------------
    return success({
      staff: updatedStaff,
    });
  } catch (error) {
    console.error("Update staff error:", error);

    return failure("Unable to update staff.", 500, "INTERNAL_SERVER_ERROR");
  }
}

export async function DELETE(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      staffId: string;
    }>;
  },
) {
  try {
    // ---------------------------------------------
    // Authentication
    // ---------------------------------------------
    const auth = await requireAuth(request);

    if (auth.user.role !== "ADMIN") {
      return failure("Admin access required.", 403, "FORBIDDEN");
    }

    // ---------------------------------------------
    // Get staff ID
    // ---------------------------------------------
    const { staffId } = await params;

    if (!staffId) {
      return failure("Staff ID is required.", 400, "STAFF_ID_REQUIRED");
    }

    // ---------------------------------------------
    // Check staff exists
    // ---------------------------------------------
    const [existingStaff] = await db
      .select({
        id: users.id,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, staffId))
      .limit(1);

    if (!existingStaff) {
      return failure("Staff not found.", 404, "STAFF_NOT_FOUND");
    }

    if (existingStaff.role !== "STAFF") {
      return failure("User is not a staff member.", 400, "NOT_A_STAFF");
    }

    // ---------------------------------------------
    // Delete staff roles
    // ---------------------------------------------
    await db.delete(staffRoles).where(eq(staffRoles.staffId, staffId));

    // ---------------------------------------------
    // Delete attraction assignments
    // ---------------------------------------------
    await db
      .delete(staffAttractionAssignments)
      .where(eq(staffAttractionAssignments.staffId, staffId));

    // ---------------------------------------------
    // Delete staff user
    // ---------------------------------------------
    const [deletedStaff] = await db
      .delete(users)
      .where(and(eq(users.id, staffId), eq(users.role, "STAFF")))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      });

    if (!deletedStaff) {
      return failure("Staff could not be deleted.", 404, "STAFF_NOT_FOUND");
    }

    // ---------------------------------------------
    // Response
    // ---------------------------------------------
    return success({
      message: "Staff deleted successfully.",
      staff: deletedStaff,
    });
  } catch (error) {
    console.error("Delete staff error:", error);

    return failure("Unable to delete staff.", 500, "INTERNAL_SERVER_ERROR");
  }
}
