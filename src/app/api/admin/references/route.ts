import { z } from "zod";
import { and, desc, eq, ilike, or } from "drizzle-orm";

import { db } from "@/db";
import { references } from "@/db/schema";

import { success, failure } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/require-auth";
import { getAdminId } from "@/lib/auth/get-admin-id";

const allowedRoles = ["ADMIN", "MANAGER", "STAFF"];

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

    if (!allowedRoles.includes(auth.user.role)) {
      return failure("Forbidden", 403, "FORBIDDEN");
    }

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

    return failure("Unable to fetch references", 500, "INTERNAL_SERVER_ERROR");
  }
}

// ======================================================
// CREATE REFERENCE
// ======================================================

export async function POST(req: Request) {
  try {
    const auth = await requireAuth(req);

    if (!allowedRoles.includes(auth.user.role)) {
      return failure("Forbidden", 403, "FORBIDDEN");
    }

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
    console.error("Create reference error:", error);

    return failure("Unable to create reference", 500, "INTERNAL_SERVER_ERROR");
  }
}
