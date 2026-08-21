import { NextRequest } from "next/server";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";

import { attractions, attractionManagement } from "@/db/schema";

import { requireAuth } from "@/lib/auth/require-auth";

import {
  requireModuleAccess,
  requireAttractionAccess,
  getAdminId,
} from "@/lib/auth/authorization";

import { success, failure } from "@/lib/api/response";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireAuth(request);

    await requireModuleAccess(auth, "TICKET_BOOKING");

    const adminId = getAdminId(auth);

    const { id } = await context.params;

    if (!id) {
      return failure(
        "Attraction ID is required.",
        400,
        "ATTRACTION_ID_REQUIRED",
      );
    }

    // ---------------------------------------------
    // ATTRACTION ACCESS
    // ---------------------------------------------

    try {
      await requireAttractionAccess(auth, id);
    } catch (error) {
      if (error instanceof Error && error.message === "FORBIDDEN") {
        return failure(
          "Attraction not found or access denied.",
          404,
          "ATTRACTION_NOT_FOUND",
        );
      }

      throw error;
    }

    // ---------------------------------------------
    // FETCH
    // ---------------------------------------------

    const [row] = await db
      .select({
        id: attractions.id,
        name: attractions.name,
        category: attractions.type,

        image: attractionManagement.image,

        description: attractionManagement.description,

        timing: attractionManagement.timing,

        adultPrice: attractionManagement.adultPrice,
        childPrice: attractionManagement.childPrice,
        studentPrice: attractionManagement.studentPrice,
        seniorPrice: attractionManagement.seniorPrice,
        foreignerPrice: attractionManagement.foreignerPrice,

        hasSeating: attractionManagement.hasSeating,
        seatLayoutId: attractionManagement.seatLayoutId,
      })
      .from(attractions)
      .innerJoin(
        attractionManagement,
        eq(attractionManagement.attractionId, attractions.id),
      )
      .where(
        and(
          eq(attractions.id, id),
          eq(attractions.adminId, adminId),
          eq(attractions.status, "ACTIVE"),
          eq(attractionManagement.adminId, adminId),
        ),
      )
      .limit(1);

    if (!row) {
      return failure(
        "Attraction not found or access denied.",
        404,
        "ATTRACTION_NOT_FOUND",
      );
    }

    // ---------------------------------------------
    // RESPONSE
    // ---------------------------------------------

    return success({
      attraction: {
        id: row.id,

        name: row.name,

        category: row.category,

        image: row.image,

        description: row.description,

        timing: row.timing,

        pricing: {
          adult: Number(row.adultPrice),
          child: Number(row.childPrice),
          student: Number(row.studentPrice),
          senior: Number(row.seniorPrice),
          foreigner: Number(row.foreignerPrice),
        },

        hasSeating: row.hasSeating,

        seatLayoutId: row.seatLayoutId,
      },
    });
  } catch (error) {
    console.error("Get ticketing booking attraction error:", error);

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return failure("Authentication required.", 401, "UNAUTHORIZED");
    }

    if (error instanceof Error && error.message === "ACCOUNT_NOT_ACTIVE") {
      return failure("Account is not active.", 403, "ACCOUNT_NOT_ACTIVE");
    }

    if (error instanceof Error && error.message === "FORBIDDEN") {
      return failure(
        "You do not have permission to access this attraction.",
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

    return failure("Unable to fetch attraction.", 500, "INTERNAL_SERVER_ERROR");
  }
}
