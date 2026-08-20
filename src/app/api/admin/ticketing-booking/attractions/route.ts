import { NextRequest } from "next/server";

import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db";

import { attractions, attractionManagement } from "@/db/schema";

import { requireAuth } from "@/lib/auth/require-auth";

import {
  requireModuleAccess,
  getAdminId,
  getAccessibleAttractionIds,
} from "@/lib/auth/authorization";

import { success, failure } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);

    await requireModuleAccess(auth, "BOOKINGS");

    const adminId = getAdminId(auth);

    const conditions = [
      eq(attractions.adminId, adminId),
      eq(attractions.status, "ACTIVE"),
      eq(attractionManagement.adminId, adminId),
    ];

    // ---------------------------------------------
    // MANAGER / STAFF ACCESS
    // ---------------------------------------------

    if (auth.user.role !== "ADMIN") {
      const accessibleAttractionIds = await getAccessibleAttractionIds(auth);

      if (accessibleAttractionIds.length === 0) {
        return success({
          items: [],
        });
      }

      conditions.push(inArray(attractions.id, accessibleAttractionIds));
    }

    // ---------------------------------------------
    // FETCH ATTRACTIONS
    // ---------------------------------------------

    const rows = await db
      .select({
        id: attractions.id,
        name: attractions.name,
        category: attractions.type,

        image: attractionManagement.image,

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
      .where(and(...conditions));

    // ---------------------------------------------
    // RESPONSE
    // ---------------------------------------------

    const items = rows.map((row) => ({
      id: row.id,

      name: row.name,

      category: row.category,

      image: row.image,

      pricing: {
        adult: Number(row.adultPrice),
        child: Number(row.childPrice),
        student: Number(row.studentPrice),
        senior: Number(row.seniorPrice),
        foreigner: Number(row.foreignerPrice),
      },

      hasSeating: row.hasSeating,

      seatLayoutId: row.seatLayoutId,
    }));

    return success({
      items,
    });
  } catch (error) {
    console.error("Get ticketing booking attractions error:", error);

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

    return failure(
      "Unable to fetch attractions.",
      500,
      "INTERNAL_SERVER_ERROR",
    );
  }
}
