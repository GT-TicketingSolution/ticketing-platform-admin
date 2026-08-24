import { NextRequest } from "next/server";

import { and, eq, ilike, or } from "drizzle-orm";

import { db } from "@/db";

import { references } from "@/db/schema";

import { requireAuth } from "@/lib/auth/require-auth";

import { requireModuleAccess, getAdminId } from "@/lib/auth/authorization";

import { success, failure } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  try {
    // ---------------------------------------------
    // AUTHENTICATION
    // ---------------------------------------------

    const auth = await requireAuth(request);

    await requireModuleAccess(auth, "TICKET_BOOKING");

    const adminId = getAdminId(auth);

    // ---------------------------------------------
    // QUERY PARAMETERS
    // ---------------------------------------------

    const searchParams = request.nextUrl.searchParams;

    const search = searchParams.get("search")?.trim() || "";

    const limitParam = searchParams.get("limit") || "20";

    const limit = Math.min(Math.max(Number(limitParam) || 20, 1), 50);

    // ---------------------------------------------
    // CONDITIONS
    // ---------------------------------------------

    const conditions = [
      eq(references.adminId, adminId),
      eq(references.status, "ACTIVE"),
      eq(references.isDeleted, false),
    ];

    // ---------------------------------------------
    // SEARCH
    // ---------------------------------------------

    if (search) {
      conditions.push(
        or(
          ilike(references.referenceName, `%${search}%`),
          ilike(references.contactPerson, `%${search}%`),
          ilike(references.mobile, `%${search}%`),
          ilike(references.department, `%${search}%`),
          ilike(references.post, `%${search}%`),
        )!,
      );
    }

    // ---------------------------------------------
    // FETCH REFERENCES
    // ---------------------------------------------

    const rows = await db
      .select({
        id: references.id,

        referenceName: references.referenceName,

        department: references.department,

        contactPerson: references.contactPerson,

        post: references.post,

        mobile: references.mobile,

        status: references.status,

        createdAt: references.createdAt,
      })
      .from(references)
      .where(and(...conditions))
      .orderBy(references.referenceName)
      .limit(limit);

    // ---------------------------------------------
    // RESPONSE
    // ---------------------------------------------

    return success({
      items: rows,

      count: rows.length,
    });
  } catch (error) {
    console.error("Get ticketing booking references error:", error);

    // ---------------------------------------------
    // AUTH ERRORS
    // ---------------------------------------------

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return failure("Authentication required.", 401, "UNAUTHORIZED");
    }

    if (error instanceof Error && error.message === "ACCOUNT_NOT_ACTIVE") {
      return failure("Account is not active.", 403, "ACCOUNT_NOT_ACTIVE");
    }

    if (error instanceof Error && error.message === "FORBIDDEN") {
      return failure(
        "You do not have permission to access ticketing.",
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

    return failure("Unable to fetch references.", 500, "INTERNAL_SERVER_ERROR");
  }
}
