import { eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import {
  attractions,
  attractionManagement,
  attractionManagementSeatLayouts,
  seatLayouts,
} from "@/db/schema";

import { success, failure } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/require-auth";
import { getAccessibleAttractionIds } from "@/lib/auth/authorization";

// =====================================================
// GET ALL ATTRACTIONS
// =====================================================

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);

    let managementData;

    // =====================================================
    // ADMIN
    // =====================================================

    if (auth.user.role === "ADMIN") {
      managementData = await db
        .select({
          id: attractionManagement.id,

          attractionId: attractions.id,

          name: attractions.name,

          category: attractions.type,

          image: attractionManagement.image,

          timing: attractionManagement.timing,

          pricing: {
            adult: attractionManagement.adultPrice,

            child: attractionManagement.childPrice,

            student: attractionManagement.studentPrice,

            senior: attractionManagement.seniorPrice,

            foreigner: attractionManagement.foreignerPrice,
          },

          hasSeating: attractionManagement.hasSeating,

          description: attractionManagement.description,

          status: attractions.status,

          // Existing legacy column
          seatLayoutId: attractionManagement.seatLayoutId,
        })
        .from(attractionManagement)
        .innerJoin(
          attractions,
          eq(attractionManagement.attractionId, attractions.id),
        )
        .where(eq(attractionManagement.adminId, auth.user.id));
    }

    // =====================================================
    // MANAGER / STAFF
    // =====================================================
    else {
      const allowedIds = await getAccessibleAttractionIds(auth);

      if (!allowedIds.length) {
        return success([]);
      }

      managementData = await db
        .select({
          id: attractionManagement.id,

          attractionId: attractions.id,

          name: attractions.name,

          category: attractions.type,

          image: attractionManagement.image,

          timing: attractionManagement.timing,

          pricing: {
            adult: attractionManagement.adultPrice,

            child: attractionManagement.childPrice,

            student: attractionManagement.studentPrice,

            senior: attractionManagement.seniorPrice,

            foreigner: attractionManagement.foreignerPrice,
          },

          hasSeating: attractionManagement.hasSeating,

          description: attractionManagement.description,

          status: attractions.status,

          // Existing legacy column
          seatLayoutId: attractionManagement.seatLayoutId,
        })
        .from(attractionManagement)
        .innerJoin(
          attractions,
          eq(attractionManagement.attractionId, attractions.id),
        )
        .where(inArray(attractionManagement.attractionId, allowedIds));
    }

    // =====================================================
    // NO DATA
    // =====================================================

    if (!managementData.length) {
      return success([]);
    }

    // =====================================================
    // GET ALL SEAT LAYOUT MAPPINGS
    // =====================================================

    const managementIds = managementData.map((item) => item.id);

    const seatLayoutMappings = await db
      .select({
        attractionManagementId:
          attractionManagementSeatLayouts.attractionManagementId,

        seatLayoutId: attractionManagementSeatLayouts.seatLayoutId,

        seatLayout: seatLayouts,
      })
      .from(attractionManagementSeatLayouts)
      .innerJoin(
        seatLayouts,
        eq(attractionManagementSeatLayouts.seatLayoutId, seatLayouts.id),
      )
      .where(
        inArray(
          attractionManagementSeatLayouts.attractionManagementId,
          managementIds,
        ),
      );

    // =====================================================
    // GROUP SEAT LAYOUTS BY ATTRACTION
    // =====================================================

    const seatLayoutsByManagementId = new Map<
      string,
      typeof seatLayoutMappings
    >();

    for (const mapping of seatLayoutMappings) {
      const existing =
        seatLayoutsByManagementId.get(mapping.attractionManagementId) ?? [];

      existing.push(mapping);

      seatLayoutsByManagementId.set(mapping.attractionManagementId, existing);
    }

    // =====================================================
    // FINAL RESPONSE
    // =====================================================

    const result = managementData.map((item) => {
      const mappings = seatLayoutsByManagementId.get(item.id) ?? [];

      return {
        ...item,

        seatLayouts: mappings.map((mapping) => mapping.seatLayout),
      };
    });

    return success(result);
  } catch (error) {
    console.error("Get attraction management error:", error);

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return failure("Unauthorized", 401, "UNAUTHORIZED");
    }

    return failure("Unable to fetch attractions", 500, "INTERNAL_SERVER_ERROR");
  }
}

// =====================================================
// CREATE ATTRACTION
// =====================================================

// export async function POST(request: Request) {
//   try {
//     const auth = await requireAuth(request);

//     if (auth.user.role !== "ADMIN") {
//       return failure("Only admin can create attraction", 403, "FORBIDDEN");
//     }

//     const body = await request.json();

//     const {
//       attractionId,
//       image,
//       description,
//       timing,

//       adultPrice,
//       childPrice,
//       studentPrice,
//       seniorPrice,
//       foreignerPrice,

//       hasSeating = false,
//     } = body;

//     if (!attractionId) {
//       return failure("Attraction id required", 400, "VALIDATION_ERROR");
//     }

//     const created = await db
//       .insert(attractionManagement)
//       .values({
//         adminId: auth.user.id,

//         attractionId,

//         image,

//         description,

//         timing,

//         adultPrice: adultPrice ?? 0,

//         childPrice: childPrice ?? 0,

//         studentPrice: studentPrice ?? 0,

//         seniorPrice: seniorPrice ?? 0,

//         foreignerPrice: foreignerPrice ?? 0,

//         hasSeating,
//       })
//       .returning();

//     return success(created[0]);
//   } catch (error) {
//     console.error("Create attraction error:", error);

//     return failure("Unable to create attraction", 500, "INTERNAL_SERVER_ERROR");
//   }
// }

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);

    if (auth.user.role !== "ADMIN") {
      return failure("Only admin can create attraction", 403, "FORBIDDEN");
    }

    const body = await request.json();

    const {
      name,
      category,
      image,
      description,
      timing,

      adultPrice = 0,
      childPrice = 0,
      studentPrice = 0,
      seniorPrice = 0,
      foreignerPrice = 0,

      hasSeating = false,

      // NEW
      seatLayoutIds = [],
    } = body;

    // ======================================
    // VALIDATION
    // ======================================

    if (!name || !category) {
      return failure("Name and category are required", 400, "VALIDATION_ERROR");
    }

    if (!Array.isArray(seatLayoutIds)) {
      return failure("seatLayoutIds must be an array", 400, "VALIDATION_ERROR");
    }

    // If seating is enabled, at least one seat layout is required
    if (hasSeating && seatLayoutIds.length === 0) {
      return failure(
        "At least one seat layout is required when seating is enabled",
        400,
        "VALIDATION_ERROR",
      );
    }

    // If seating is disabled, ignore seat layouts
    const finalSeatLayoutIds = hasSeating ? seatLayoutIds : [];

    // ======================================
    // REMOVE DUPLICATE SEAT LAYOUT IDS
    // ======================================

    const uniqueSeatLayoutIds = [...new Set(finalSeatLayoutIds)];

    // ======================================
    // VERIFY SEAT LAYOUTS EXIST
    // ======================================

    if (uniqueSeatLayoutIds.length > 0) {
      const existingSeatLayouts = await db
        .select({
          id: seatLayouts.id,
        })
        .from(seatLayouts)
        .where(inArray(seatLayouts.id, uniqueSeatLayoutIds));

      const existingIds = new Set(
        existingSeatLayouts.map((layout) => layout.id),
      );

      const invalidSeatLayoutIds = uniqueSeatLayoutIds.filter(
        (id) => !existingIds.has(id),
      );

      if (invalidSeatLayoutIds.length > 0) {
        return failure(
          `Invalid seat layout IDs: ${invalidSeatLayoutIds.join(", ")}`,
          400,
          "VALIDATION_ERROR",
        );
      }
    }

    // ======================================
    // TRANSACTION
    // ======================================

    const result = await db.transaction(async (tx) => {
      // ======================================
      // CREATE MAIN ATTRACTION
      // ======================================

      const attraction = await tx
        .insert(attractions)
        .values({
          adminId: auth.user.id,
          name,
          type: category,
        })
        .returning();

      // ======================================
      // CREATE MANAGEMENT DETAILS
      // ======================================

      const management = await tx
        .insert(attractionManagement)
        .values({
          adminId: auth.user.id,

          attractionId: attraction[0].id,

          image: image ?? null,

          description: description ?? null,

          timing: timing ?? null,

          adultPrice,

          childPrice,

          studentPrice,

          seniorPrice,

          foreignerPrice,

          hasSeating,

          // Keep old column for now.
          // If there is exactly one layout, store it here.
          seatLayoutId:
            uniqueSeatLayoutIds.length === 1 ? uniqueSeatLayoutIds[0] : null,
        })
        .returning();

      // ======================================
      // CREATE SEAT LAYOUT MAPPINGS
      // ======================================

      let seatLayoutMappings: (typeof attractionManagementSeatLayouts.$inferSelect)[] =
        [];

      if (uniqueSeatLayoutIds.length > 0) {
        seatLayoutMappings = await tx
          .insert(attractionManagementSeatLayouts)
          .values(
            uniqueSeatLayoutIds.map((seatLayoutId) => ({
              attractionManagementId: management[0].id,
              seatLayoutId,
            })),
          )
          .returning();
      }

      return {
        attraction: attraction[0],
        management: management[0],
        seatLayouts: seatLayoutMappings,
      };
    });

    // ======================================
    // RESPONSE
    // ======================================

    return success(result);
  } catch (error) {
    console.error("========== CREATE ATTRACTION ERROR ==========");
    console.error(error);
    console.error("==============================================");

    return failure(
      error instanceof Error ? error.message : "Unable to create attraction",
      500,
      "INTERNAL_SERVER_ERROR",
    );
  }
}
