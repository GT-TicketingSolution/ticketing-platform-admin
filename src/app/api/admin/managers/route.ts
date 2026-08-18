// import { z } from "zod";

// import { getManagers, createManager } from "@/services/manager.service";

// import { success, failure } from "@/lib/api/response";
// import { requireAuth } from "@/lib/auth/require-auth";

// import { requireAdmin } from "@/lib/auth/require-admin";

// const createManagerSchema = z.object({
//   name: z.string().min(2).max(150),

//   email: z.string().email(),

//   phone: z.string().max(20).optional(),

//   password: z.string().min(8),

//   status: z.enum(["ACTIVE", "SUSPENDED", "DISABLED"]).optional(),

//   systemModuleIds: z.array(z.string()).default([]),

//   attractionPermissions: z
//     .array(
//       z.object({
//         attractionId: z.string(),
//         moduleIds: z.array(z.string()).default([]),
//       }),
//     )
//     .default([]),
// });

// export async function GET(request: Request) {
//   try {
//     const auth = await requireAuth(request);

//     if (auth.user.role !== "ADMIN") {
//       return failure("Admin access required.", 403, "FORBIDDEN");
//     }

//     const { searchParams } = new URL(request.url);

//     const page = Math.max(Number(searchParams.get("page") ?? 1), 1);

//     const limit = Math.min(
//       Math.max(Number(searchParams.get("limit") ?? 10), 1),
//       100,
//     );

//     const search = searchParams.get("search") ?? undefined;

//     const status = searchParams.get("status") as
//       | "ACTIVE"
//       | "SUSPENDED"
//       | "DISABLED"
//       | undefined;

//     const result = await getManagers({
//       page,
//       limit,
//       search,
//       status,
//     });

//     return success(result);
//   } catch (error) {
//     console.error("Get managers error:", error);

//     return failure("Unable to fetch managers.", 500, "INTERNAL_SERVER_ERROR");
//   }
// }

// export async function POST(request: Request) {
//   try {
//     const auth = await requireAuth(request);

//     if (auth.user.role !== "ADMIN") {
//       return failure("Admin access required.", 403, "FORBIDDEN");
//     }

//     const body = await request.json();

//     const parsed = createManagerSchema.safeParse(body);

//     if (!parsed.success) {
//       return failure("Invalid manager details.", 400, "VALIDATION_ERROR");
//     }

//     const manager = await createManager(parsed.data);

//     return success(
//       {
//         manager,
//       },
//       201,
//     );
//   } catch (error) {
//     if (error instanceof Error && error.message === "EMAIL_ALREADY_EXISTS") {
//       return failure("Email already exists.", 409, "EMAIL_ALREADY_EXISTS");
//     }

//     console.error("Create manager error:", error);

//     return failure("Unable to create manager.", 500, "INTERNAL_SERVER_ERROR");
//   }
// }
import { z } from "zod";

import { getManagers, createManager } from "@/services/manager.service";

import { success, failure } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/require-admin";

const createManagerSchema = z.object({
  name: z.string().min(2).max(150),

  email: z.string().email(),

  phone: z.string().max(20).optional(),

  password: z.string().min(8),

  status: z.enum(["ACTIVE", "SUSPENDED", "DISABLED"]).optional(),

  systemModuleIds: z.array(z.string()).default([]),

  attractionPermissions: z
    .array(
      z.object({
        attractionId: z.string(),
        moduleIds: z.array(z.string()).default([]),
      }),
    )
    .default([]),
});

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin(request);

    const { searchParams } = new URL(request.url);

    const page = Math.max(Number(searchParams.get("page") ?? 1), 1);

    const limit = Math.min(
      Math.max(Number(searchParams.get("limit") ?? 10), 1),
      100,
    );

    const search = searchParams.get("search") ?? undefined;

    const status = searchParams.get("status") as
      | "ACTIVE"
      | "SUSPENDED"
      | "DISABLED"
      | undefined;

    const result = await getManagers({
      adminId: auth.adminId,
      page,
      limit,
      search,
      status,
    });

    return success(result);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return failure("Unauthorized.", 401, "UNAUTHORIZED");
    }

    if (error instanceof Error && error.message === "FORBIDDEN") {
      return failure("Admin access required.", 403, "FORBIDDEN");
    }

    console.error("Get managers error:", error);

    return failure("Unable to fetch managers.", 500, "INTERNAL_SERVER_ERROR");
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin(request);

    const body = await request.json();

    const parsed = createManagerSchema.safeParse(body);

    if (!parsed.success) {
      return failure("Invalid manager details.", 400, "VALIDATION_ERROR");
    }

    const manager = await createManager(auth.adminId, parsed.data);

    return success(
      {
        manager,
      },
      201,
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return failure("Unauthorized.", 401, "UNAUTHORIZED");
      }

      if (error.message === "FORBIDDEN") {
        return failure("Admin access required.", 403, "FORBIDDEN");
      }

      if (error.message === "EMAIL_ALREADY_EXISTS") {
        return failure("Email already exists.", 409, "EMAIL_ALREADY_EXISTS");
      }

      if (error.message === "INVALID_SYSTEM_MODULE") {
        return failure(
          "One or more system modules are invalid.",
          400,
          "INVALID_SYSTEM_MODULE",
        );
      }

      if (error.message === "INVALID_ATTRACTION") {
        return failure(
          "One or more attractions are invalid.",
          400,
          "INVALID_ATTRACTION",
        );
      }

      if (error.message === "INVALID_ATTRACTION_MODULE") {
        return failure(
          "One or more attraction modules are invalid.",
          400,
          "INVALID_ATTRACTION_MODULE",
        );
      }

      if (error.message === "ATTRACTION_MODULE_MISMATCH") {
        return failure(
          "Attraction module does not belong to the selected attraction.",
          400,
          "ATTRACTION_MODULE_MISMATCH",
        );
      }
    }

    console.error("Create manager error:", error);

    return failure("Unable to create manager.", 500, "INTERNAL_SERVER_ERROR");
  }
}
