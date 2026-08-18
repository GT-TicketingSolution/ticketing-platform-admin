// // import { and, eq } from "drizzle-orm";

// // import { db } from "@/db";
// // import { users } from "@/db/schema";

// // import { requireAuth } from "@/lib/auth/require-auth";
// // import { success, failure } from "@/lib/api/response";

// // export async function PATCH(
// //   request: Request,
// //   {
// //     params,
// //   }: {
// //     params: Promise<{
// //       staffId: string;
// //     }>;
// //   },
// // ) {
// //   try {
// //     // ---------------------------------------------
// //     // Authentication
// //     // ---------------------------------------------
// //     const auth = await requireAuth(request);

// //     if (auth.user.role !== "ADMIN") {
// //       return failure("Admin access required.", 403, "FORBIDDEN");
// //     }

// //     // ---------------------------------------------
// //     // Get staff ID
// //     // ---------------------------------------------
// //     const { staffId } = await params;

// //     if (!staffId) {
// //       return failure("Staff ID is required.", 400, "STAFF_ID_REQUIRED");
// //     }

// //     // ---------------------------------------------
// //     // Disable staff
// //     // ---------------------------------------------
// //     const [staff] = await db
// //       .update(users)
// //       .set({
// //         status: "DISABLED",
// //         updatedAt: new Date(),
// //       })
// //       .where(and(eq(users.id, staffId), eq(users.role, "STAFF")))
// //       .returning({
// //         id: users.id,
// //         name: users.name,
// //         email: users.email,
// //         phone: users.phone,
// //         role: users.role,
// //         status: users.status,
// //         updatedAt: users.updatedAt,
// //       });

// //     // ---------------------------------------------
// //     // Staff not found
// //     // ---------------------------------------------
// //     if (!staff) {
// //       return failure("Staff not found.", 404, "STAFF_NOT_FOUND");
// //     }

// //     // ---------------------------------------------
// //     // Response
// //     // ---------------------------------------------
// //     return success({
// //       staff,
// //     });
// //   } catch (error) {
// //     console.error("Disable staff error:", error);

// //     return failure("Unable to disable staff.", 500, "INTERNAL_SERVER_ERROR");
// //   }
// // }
// import { and, eq } from "drizzle-orm";

// import { db } from "@/db";
// import { users } from "@/db/schema";

// import { requireAuth } from "@/lib/auth/require-auth";
// import { success, failure } from "@/lib/api/response";

// export async function PATCH(
//   request: Request,
//   {
//     params,
//   }: {
//     params: Promise<{
//       staffId: string;
//     }>;
//   },
// ) {
//   try {
//     // ---------------------------------------------
//     // Authentication
//     // ---------------------------------------------
//     const auth = await requireAuth(request);

//     if (auth.user.role !== "ADMIN") {
//       return failure("Admin access required.", 403, "FORBIDDEN");
//     }

//     // ---------------------------------------------
//     // Get staff ID
//     // ---------------------------------------------
//     const { staffId } = await params;

//     if (!staffId) {
//       return failure("Staff ID is required.", 400, "STAFF_ID_REQUIRED");
//     }

//     // ---------------------------------------------
//     // Disable staff
//     //
//     // IMPORTANT:
//     // Staff must belong to the authenticated admin.
//     // This prevents Admin A from disabling
//     // Admin B's staff by knowing their staffId.
//     // ---------------------------------------------
//     const [staff] = await db
//       .update(users)
//       .set({
//         status: "DISABLED",
//         updatedAt: new Date(),
//       })
//       .where(
//         and(
//           eq(users.id, staffId),
//           eq(users.role, "STAFF"),
//           eq(users.adminId, auth.user.id),
//         ),
//       )
//       .returning({
//         id: users.id,
//         name: users.name,
//         email: users.email,
//         phone: users.phone,
//         role: users.role,
//         status: users.status,
//         updatedAt: users.updatedAt,
//       });

//     // ---------------------------------------------
//     // Staff not found / not owned by this admin
//     // ---------------------------------------------
//     if (!staff) {
//       return failure("Staff not found.", 404, "STAFF_NOT_FOUND");
//     }

//     // ---------------------------------------------
//     // Response
//     // ---------------------------------------------
//     return success({
//       staff,
//     });
//   } catch (error) {
//     console.error("Disable staff error:", error);

//     return failure("Unable to disable staff.", 500, "INTERNAL_SERVER_ERROR");
//   }
// }
import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema";

import { requireAuth } from "@/lib/auth/require-auth";
import { success, failure } from "@/lib/api/response";

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      staffId: string;
    }>;
  },
) {
  try {
    // ---------------------------------------------
    // Authentication
    // ---------------------------------------------
    const auth = await requireAuth(request);

    // Staff management is allowed for ADMIN and MANAGER.
    if (!["ADMIN", "MANAGER"].includes(auth.user.role)) {
      return failure("Admin or Manager access required.", 403, "FORBIDDEN");
    }

    // ---------------------------------------------
    // Get staff ID
    // ---------------------------------------------
    const { staffId } = await params;

    if (!staffId) {
      return failure("Staff ID is required.", 400, "STAFF_ID_REQUIRED");
    }

    // ---------------------------------------------
    // Determine tenant/admin owner
    // ---------------------------------------------
    //
    // ADMIN:
    //   auth.user.id is the tenant/admin owner.
    //
    // MANAGER:
    //   auth.user.adminId should point to the
    //   admin who owns the manager and their staff.
    //
    const adminId =
      auth.user.role === "ADMIN" ? auth.user.id : auth.user.adminId;

    if (!adminId) {
      return failure(
        "Admin ownership could not be determined.",
        403,
        "ADMIN_CONTEXT_REQUIRED",
      );
    }

    // ---------------------------------------------
    // Disable staff
    //
    // IMPORTANT:
    // The staff member must:
    //
    // 1. Exist
    // 2. Have STAFF role
    // 3. Belong to the authenticated admin
    //
    // This prevents:
    //
    // Admin A -> disabling Admin B's staff
    // Manager A -> disabling another tenant's staff
    // ---------------------------------------------
    const [staff] = await db
      .update(users)
      .set({
        status: "DISABLED",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(users.id, staffId),
          eq(users.role, "STAFF"),
          eq(users.adminId, adminId),
        ),
      )
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        role: users.role,
        status: users.status,
        updatedAt: users.updatedAt,
      });

    // ---------------------------------------------
    // Staff not found / not owned by tenant
    // ---------------------------------------------
    if (!staff) {
      return failure("Staff not found.", 404, "STAFF_NOT_FOUND");
    }

    // ---------------------------------------------
    // Response
    // ---------------------------------------------
    return success({
      message: "Staff disabled successfully.",
      staff,
    });
  } catch (error) {
    // ---------------------------------------------
    // Authentication errors
    // ---------------------------------------------
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return failure("Authentication required.", 401, "UNAUTHORIZED");
      }

      if (error.message === "ACCOUNT_NOT_ACTIVE") {
        return failure("Account is not active.", 403, "ACCOUNT_NOT_ACTIVE");
      }
    }

    console.error("Disable staff error:", error);

    return failure("Unable to disable staff.", 500, "INTERNAL_SERVER_ERROR");
  }
}
