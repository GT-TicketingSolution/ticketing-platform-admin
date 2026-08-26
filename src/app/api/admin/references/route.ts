import { z } from "zod";
import { and, desc, eq, ilike, or } from "drizzle-orm";

import { db } from "@/db";
import { references } from "@/db/schema";

import { success, failure } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/require-auth";
import { getAdminId } from "@/lib/auth/get-admin-id";

import { requireModuleAccess } from "@/lib/auth/authorization";

const createSchema = z.object({
  referenceName: z.string().trim().min(1, "Reference name is required"),

  department: z.string().trim().min(1, "Department/Organization is required"),

  contactPerson: z.string().trim().min(1, "Contact person is required"),

  post: z.string().trim().optional(),

  mobile: z
    .string()
    .trim()
    .regex(/^[0-9]{10}$/, "Mobile number must be 10 digits"),

  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

// ======================================================
// GET REFERENCES
// ======================================================

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req);
    await requireModuleAccess(auth, "COMPLIMENTARY_PASSES");

    const params = new URL(req.url).searchParams;

    const search = params.get("search")?.trim() || undefined;

    const page = Math.max(Number(params.get("page") || 1), 1);

    const limit = Math.min(Math.max(Number(params.get("limit") || 10), 1), 100);

    const offset = (page - 1) * limit;

    const adminId = getAdminId(auth);

    const items = await db.query.references.findMany({
      where: and(
        eq(references.adminId, adminId),

        eq(references.isDeleted, false),

        search
          ? or(
              ilike(references.referenceName, `%${search}%`),

              ilike(references.contactPerson, `%${search}%`),

              ilike(references.department, `%${search}%`),

              ilike(references.mobile, `%${search}%`),
            )
          : undefined,
      ),

      orderBy: [desc(references.createdAt)],

      limit,

      offset,
    });

    return success({
      items,

      pagination: {
        page,
        limit,
        hasNextPage: items.length === limit,
      },
    });
  } catch (error) {
    console.error("Get references error:", error);

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return failure("Authentication required.", 401, "UNAUTHORIZED");
    }

    if (error instanceof Error && error.message === "ACCOUNT_NOT_ACTIVE") {
      return failure("Account is not active.", 403, "ACCOUNT_NOT_ACTIVE");
    }

    if (error instanceof Error && error.message === "FORBIDDEN") {
      return failure(
        "You do not have permission to access references.",
        403,
        "FORBIDDEN",
      );
    }

    if (error instanceof Error && error.message === "USER_HAS_NO_ADMIN") {
      return failure(
        "User is not associated with an admin.",
        403,
        "USER_HAS_NO_ADMIN",
      );
    }

    return failure("Unable to fetch references", 500, "INTERNAL_SERVER_ERROR");
  }
}

// ======================================================
// CREATE REFERENCE
// ======================================================

export async function POST(req: Request) {
  try {
    const auth = await requireAuth(req);

    await requireModuleAccess(auth, "COMPLIMENTARY_PASSES");

    const body = await req.json();

    const parsed = createSchema.safeParse(body);

    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message || "Invalid data",
        400,
        "VALIDATION_ERROR",
      );
    }

    const adminId = getAdminId(auth);

    const created = await db
      .insert(references)
      .values({
        adminId,

        referenceName: parsed.data.referenceName,

        department: parsed.data.department,

        contactPerson: parsed.data.contactPerson,

        post: parsed.data.post || null,

        mobile: parsed.data.mobile,

        status: parsed.data.status,
      })
      .returning();

    return success(created[0], 201);
  } catch (error) {
    console.error("Get references error:", error);

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return failure("Authentication required.", 401, "UNAUTHORIZED");
    }

    if (error instanceof Error && error.message === "ACCOUNT_NOT_ACTIVE") {
      return failure("Account is not active.", 403, "ACCOUNT_NOT_ACTIVE");
    }

    if (error instanceof Error && error.message === "FORBIDDEN") {
      return failure(
        "You do not have permission to access references.",
        403,
        "FORBIDDEN",
      );
    }

    if (error instanceof Error && error.message === "USER_HAS_NO_ADMIN") {
      return failure(
        "User is not associated with an admin.",
        403,
        "USER_HAS_NO_ADMIN",
      );
    }

    return failure("Unable to fetch references", 500, "INTERNAL_SERVER_ERROR");
  }
}
