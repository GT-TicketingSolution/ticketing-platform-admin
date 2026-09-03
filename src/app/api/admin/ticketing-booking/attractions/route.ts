import { NextRequest } from "next/server";

import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db";

import {
  attractions,
  attractionManagement,
  attractionCategory,
} from "@/db/schema";

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

    await requireModuleAccess(auth, "TICKET_BOOKING");

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
        status: attractions.status,
        image: attractionManagement.image,

        hasSeating: attractionManagement.hasSeating,
        seatLayoutId: attractionManagement.seatLayoutId,
        duration: attractionManagement.duration,
        durationUnit: attractionManagement.durationUnit,

        managementId: attractionManagement.id,
      })
      .from(attractions)
      .innerJoin(
        attractionManagement,
        eq(attractionManagement.attractionId, attractions.id),
      )
      .where(and(...conditions));

    // ---------------------------------------------
    // FETCH DYNAMIC CATEGORIES / PRICING
    // ---------------------------------------------

    const managementIds = rows.map(
      (row) => row.managementId,
    );

    const categoryRows =
      managementIds.length > 0
        ? await db
            .select({
              id: attractionCategory.id,
              attractionManagementId:
                attractionCategory.attractionManagementId,
              name: attractionCategory.name,
              basePrice: attractionCategory.basePrice,
              futurePrice: attractionCategory.futurePrice,
              effectiveFrom:
                attractionCategory.effectiveFrom,
              noOfSeats: attractionCategory.noOfSeats,
              imageLink: attractionCategory.imageLink,
            })
            .from(attractionCategory)
            .where(
              inArray(
                attractionCategory.attractionManagementId,
                managementIds,
              ),
            )
        : [];

    // ---------------------------------------------
    // GROUP CATEGORIES BY MANAGEMENT ID
    // ---------------------------------------------

    const categoriesByManagement = new Map<
      string,
      typeof categoryRows
    >();

    for (const category of categoryRows) {
      const existing =
        categoriesByManagement.get(
          category.attractionManagementId,
        ) ?? [];

        existing.push(category);

      categoriesByManagement.set(
        category.attractionManagementId,
        existing,
      );
    }

    // ---------------------------------------------
    // RESPONSE
    // ---------------------------------------------

    const items = rows.map((row) => {
      const categories =
        categoriesByManagement.get(
          row.managementId,
        ) ?? [];

      return {
        id: row.id,

        attractionManagementId: row.managementId,

        managementId: row.managementId,

        name: row.name,

        category: row.category,

        status: row.status,

        image: row.image,

        categories: categories.map((category) => ({
          id: category.id,

          attractionManagementId: category.attractionManagementId,

          name: category.name,

          basePrice: Number(category.basePrice),

          futurePrice:
            category.futurePrice !== null
              ? Number(category.futurePrice)
              : null,

          effectiveFrom:
            category.effectiveFrom,

          noOfSeats: category.noOfSeats,

          imageLink: category.imageLink,
        })),

        hasSeating: row.hasSeating,

        seatLayoutId: row.seatLayoutId,

        duration: row.duration,

        durationUnit: row.durationUnit,
      };
    });

    return success({
      items,
    });
  } catch (error) {
    console.error(
      "Get ticketing booking attractions error:",
      error,
    );

    if (
      error instanceof Error &&
      error.message === "UNAUTHORIZED"
    ) {
      return failure(
        "Authentication required.",
        401,
        "UNAUTHORIZED",
      );
    }

    if (
      error instanceof Error &&
      error.message === "ACCOUNT_NOT_ACTIVE"
    ) {
      return failure(
        "Account is not active.",
        403,
        "ACCOUNT_NOT_ACTIVE",
      );
    }

    if (
      error instanceof Error &&
      error.message === "FORBIDDEN"
    ) {
      return failure(
        "You do not have permission to access ticketing.",
        403,
        "FORBIDDEN",
      );
    }

    if (
      error instanceof Error &&
      error.message === "USER_HAS_NO_ADMIN"
    ) {
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