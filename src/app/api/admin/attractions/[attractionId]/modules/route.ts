// // import { and, eq } from "drizzle-orm";

// // import { db } from "@/db";
// // import { attractions, attractionModules } from "@/db/schema";
// // import { success, failure } from "@/lib/api/response";
// // import { requireAdmin } from "@/lib/auth/require-admin";

// // export async function GET(
// //   request: Request,
// //   { params }: { params: Promise<{ attractionId: string }> },
// // ) {
// //   try {
// //     const auth = await requireAdmin(request);

// //     const adminId = auth.adminId;

// //     const { attractionId } = await params;

// //     // Check attraction exists
// //     const [attraction] = await db
// //       .select({
// //         id: attractions.id,
// //         name: attractions.name,
// //         type: attractions.type,
// //         status: attractions.status,
// //       })
// //       .from(attractions)
// //       .where(eq(attractions.id, attractionId))
// //       .limit(1);

// //     if (!attraction) {
// //       return failure("Attraction not found.", 404, "ATTRACTION_NOT_FOUND");
// //     }

// //     const modules = await db
// //       .select({
// //         id: attractionModules.id,
// //         attractionId: attractionModules.attractionId,
// //         key: attractionModules.key,
// //         name: attractionModules.name,
// //         description: attractionModules.description,
// //         isActive: attractionModules.isActive,
// //       })
// //       .from(attractionModules)
// //       .where(
// //         and(
// //           eq(attractionModules.attractionId, attractionId),
// //           eq(attractionModules.isActive, "ACTIVE"),
// //         ),
// //       )
// //       .orderBy(attractionModules.name);

// //     return success({
// //       attraction,
// //       modules,
// //     });
// //   } catch (error) {
// //     console.error("Get attraction modules error:", error);

// //     return failure(
// //       "Unable to fetch attraction modules.",
// //       500,
// //       "INTERNAL_SERVER_ERROR",
// //     );
// //   }
// // }
// import { and, eq } from "drizzle-orm";

// import { db } from "@/db";
// import { attractions, attractionModules } from "@/db/schema";

// import { success, failure } from "@/lib/api/response";
// import { requireAdmin } from "@/lib/auth/require-admin";

// export async function GET(
//   request: Request,
//   { params }: { params: Promise<{ attractionId: string }> },
// ) {
//   try {
//     const auth = await requireAdmin(request);

//     const adminId = auth.adminId;

//     const { attractionId } = await params;

//     // Make sure this attraction belongs to the logged-in admin
//     const [attraction] = await db
//       .select({
//         id: attractions.id,
//         name: attractions.name,
//         type: attractions.type,
//         status: attractions.status,
//       })
//       .from(attractions)
//       .where(
//         and(eq(attractions.id, attractionId), eq(attractions.adminId, adminId)),
//       )
//       .limit(1);

//     if (!attraction) {
//       return failure("Attraction not found.", 404, "ATTRACTION_NOT_FOUND");
//     }

//     const modules = await db
//       .select({
//         id: attractionModules.id,
//         attractionId: attractionModules.attractionId,
//         key: attractionModules.key,
//         name: attractionModules.name,
//         description: attractionModules.description,
//         isActive: attractionModules.isActive,
//       })
//       .from(attractionModules)
//       .where(
//         and(
//           eq(attractionModules.attractionId, attractionId),
//           eq(attractionModules.isActive, "ACTIVE"),
//         ),
//       )
//       .orderBy(attractionModules.name);

//     return success({
//       attraction,
//       modules,
//     });
//   } catch (error) {
//     console.error("Get attraction modules error:", error);

//     if (error instanceof Error && error.message === "FORBIDDEN") {
//       return failure("Admin access required.", 403, "FORBIDDEN");
//     }

//     if (error instanceof Error && error.message === "UNAUTHORIZED") {
//       return failure("Unauthorized.", 401, "UNAUTHORIZED");
//     }

//     return failure(
//       "Unable to fetch attraction modules.",
//       500,
//       "INTERNAL_SERVER_ERROR",
//     );
//   }
// }
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { attractions, attractionModules } from "@/db/schema";

import { success, failure } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/require-auth";
import { hasAttractionAccess } from "@/lib/auth/authorization";

export async function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      attractionId: string;
    }>;
  },
) {
  try {
    // =====================================================
    // Authentication
    // =====================================================

    const auth = await requireAuth(request);

    // =====================================================
    // Attraction ID
    // =====================================================

    const { attractionId } = await params;

    if (!attractionId) {
      return failure(
        "Attraction ID is required.",
        400,
        "ATTRACTION_ID_REQUIRED",
      );
    }

    // =====================================================
    // Authorization
    // =====================================================

    const allowed = await hasAttractionAccess(auth, attractionId);

    if (!allowed) {
      return failure(
        "You do not have access to this attraction.",
        403,
        "FORBIDDEN",
      );
    }

    // =====================================================
    // Get attraction
    // =====================================================

    const [attraction] = await db
      .select({
        id: attractions.id,
        name: attractions.name,
        type: attractions.type,
        status: attractions.status,
      })
      .from(attractions)
      .where(eq(attractions.id, attractionId))
      .limit(1);

    if (!attraction) {
      return failure("Attraction not found.", 404, "ATTRACTION_NOT_FOUND");
    }

    // =====================================================
    // Get modules
    // =====================================================

    const modules = await db
      .select({
        id: attractionModules.id,
        attractionId: attractionModules.attractionId,
        key: attractionModules.key,
        name: attractionModules.name,
        description: attractionModules.description,
        isActive: attractionModules.isActive,
      })
      .from(attractionModules)
      .where(
        and(
          eq(attractionModules.attractionId, attractionId),
          eq(attractionModules.isActive, "ACTIVE"),
        ),
      )
      .orderBy(attractionModules.name);

    // =====================================================
    // Response
    // =====================================================

    return success({
      attraction,
      modules,
    });
  } catch (error) {
    console.error("Get attraction modules error:", error);

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return failure("Unauthorized.", 401, "UNAUTHORIZED");
    }

    if (error instanceof Error && error.message === "FORBIDDEN") {
      return failure(
        "You do not have access to this attraction.",
        403,
        "FORBIDDEN",
      );
    }

    return failure(
      "Unable to fetch attraction modules.",
      500,
      "INTERNAL_SERVER_ERROR",
    );
  }
}
