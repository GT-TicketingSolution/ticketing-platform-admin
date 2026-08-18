import { eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { attractions, attractionManagement } from "@/db/schema";

import { success, failure } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/require-auth";
import { getAccessibleAttractionIds } from "@/lib/auth/authorization";

// =====================================================
// GET ALL ATTRATIONS
// =====================================================

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);

    let result;

    // ============================
    // ADMIN
    // ============================

    if (auth.user.role === "ADMIN") {
      result = await db
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
        })
        .from(attractionManagement)
        .innerJoin(
          attractions,
          eq(attractionManagement.attractionId, attractions.id),
        )
        .where(eq(attractionManagement.adminId, auth.user.id));
    }

    // ============================
    // MANAGER / STAFF
    // ============================
    else {
      const allowedIds = await getAccessibleAttractionIds(auth);

      if (!allowedIds.length) {
        return success([]);
      }

      result = await db
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
        })
        .from(attractionManagement)

        .innerJoin(
          attractions,
          eq(attractionManagement.attractionId, attractions.id),
        )

        .where(inArray(attractionManagement.attractionId, allowedIds));
    }

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
    } = body;

    if (!name || !category) {
      return failure("Name and category are required", 400, "VALIDATION_ERROR");
    }

    // ======================================
    // CREATE MAIN ATTRACTION
    // ======================================

    const attraction = await db
      .insert(attractions)
      .values({
        adminId: auth.user.id,

        name,

        // your UI category maps to type
        type: category,
      })
      .returning();

    // ======================================
    // CREATE MANAGEMENT DETAILS
    // ======================================

    const management = await db
      .insert(attractionManagement)
      .values({
        adminId: auth.user.id,

        attractionId: attraction[0].id,

        image,

        description,

        timing,

        adultPrice,

        childPrice,

        studentPrice,

        seniorPrice,

        foreignerPrice,

        hasSeating,
      })
      .returning();

    return success({
      attraction: attraction[0],
      management: management[0],
    });
  } catch (error) {
    console.error("Create attraction error:", error);

    return failure("Unable to create attraction", 500, "INTERNAL_SERVER_ERROR");
  }
}
