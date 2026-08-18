// // import { eq } from "drizzle-orm";

// // import { db } from "@/db";
// // import { attractions } from "@/db/schema";
// // import { success, failure } from "@/lib/api/response";
// // import { requireAuth } from "@/lib/auth/require-auth";

// // export async function GET(request: Request) {
// //   try {
// //     const auth = await requireAuth(request);

// //     if (auth.user.role !== "ADMIN") {
// //       return failure("Admin access required.", 403, "FORBIDDEN");
// //     }

// //     const result = await db
// //       .select({
// //         id: attractions.id,
// //         name: attractions.name,
// //         type: attractions.type,
// //         status: attractions.status,
// //       })
// //       .from(attractions)
// //       .where(
// //         and(eq(attractions.adminId, adminId), eq(attractions.status, "ACTIVE")),
// //       )
// //       .orderBy(attractions.name);

// //     return success(result);
// //   } catch (error) {
// //     console.error("Get attractions error:", error);

// //     return failure(
// //       "Unable to fetch attractions.",
// //       500,
// //       "INTERNAL_SERVER_ERROR",
// //     );
// //   }
// // }
// import { and, eq } from "drizzle-orm";

// import { db } from "@/db";
// import { attractions } from "@/db/schema";
// import { success, failure } from "@/lib/api/response";
// import { requireAdmin } from "@/lib/auth/require-admin";

// export async function GET(request: Request) {
//   try {
//     const auth = await requireAdmin(request);

//     const adminId = auth.adminId;

//     const result = await db
//       .select({
//         id: attractions.id,
//         name: attractions.name,
//         type: attractions.type,
//         status: attractions.status,
//       })
//       .from(attractions)
//       .where(
//         and(eq(attractions.adminId, adminId), eq(attractions.status, "ACTIVE")),
//       )
//       .orderBy(attractions.name);

//     return success(result);
//   } catch (error) {
//     console.error("Get attractions error:", error);

//     if (error instanceof Error && error.message === "FORBIDDEN") {
//       return failure("Admin access required.", 403, "FORBIDDEN");
//     }

//     if (error instanceof Error && error.message === "UNAUTHORIZED") {
//       return failure("Unauthorized.", 401, "UNAUTHORIZED");
//     }

//     return failure(
//       "Unable to fetch attractions.",
//       500,
//       "INTERNAL_SERVER_ERROR",
//     );
//   }
// }
import { eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { attractions } from "@/db/schema";

import { success, failure } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/require-auth";
import { getAccessibleAttractionIds } from "@/lib/auth/authorization";

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);

    // =====================================================
    // ADMIN
    // =====================================================

    if (auth.user.role === "ADMIN") {
      const result = await db
        .select({
          id: attractions.id,
          name: attractions.name,
          type: attractions.type,
          status: attractions.status,
        })
        .from(attractions)
        .where(eq(attractions.adminId, auth.user.id))
        .orderBy(attractions.name);

      return success(result);
    }

    // =====================================================
    // MANAGER / STAFF
    // =====================================================

    const attractionIds = await getAccessibleAttractionIds(auth);

    if (attractionIds.length === 0) {
      return success([]);
    }

    const result = await db
      .select({
        id: attractions.id,
        name: attractions.name,
        type: attractions.type,
        status: attractions.status,
      })
      .from(attractions)
      .where(inArray(attractions.id, attractionIds))
      .orderBy(attractions.name);

    return success(result);
  } catch (error) {
    console.error("Get attractions error:", error);

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return failure("Unauthorized.", 401, "UNAUTHORIZED");
    }

    if (error instanceof Error && error.message === "FORBIDDEN") {
      return failure("Access denied.", 403, "FORBIDDEN");
    }

    return failure(
      "Unable to fetch attractions.",
      500,
      "INTERNAL_SERVER_ERROR",
    );
  }
}
