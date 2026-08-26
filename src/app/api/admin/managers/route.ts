import { z } from "zod";

import { getManagers, createManager } from "@/services/manager.service";

import { success, failure } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/require-admin";
import { requireModuleAccess } from "@/lib/auth/authorization";

const createManagerSchema = z.object({
  name: z.string().min(2).max(150),

  email: z.string().email(),

  phone: z.string().max(20).optional(),

  password: z.string().min(8),

  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),

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
    await requireModuleAccess(auth, "MANAGER_MANAGEMENT");

    const { searchParams } = new URL(request.url);

    const page = Math.max(Number(searchParams.get("page") ?? 1), 1);

    const limit = Math.min(
      Math.max(Number(searchParams.get("limit") ?? 10), 1),
      100,
    );

    const search = searchParams.get("search") ?? undefined;

    const status = searchParams.get("status") as
      | "ACTIVE"
      | "INACTIVE"
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
    // =====================================================
    // AUTH ERRORS
    // =====================================================

    if (error instanceof Error) {
      switch (error.message) {
        case "UNAUTHORIZED":
          return failure("Authentication required.", 401, "UNAUTHORIZED");

        case "FORBIDDEN":
          return failure("Admin access required.", 403, "FORBIDDEN");

        case "ACCOUNT_NOT_ACTIVE":
          return failure("Account is not active.", 403, "ACCOUNT_NOT_ACTIVE");

        case "MODULE_ACCESS_DENIED":
          return failure(
            "You do not have access to manager management.",
            403,
            "MODULE_ACCESS_DENIED",
          );
      }
    }

    // =====================================================
    // SERVER ERROR
    // =====================================================

    console.error("GET /api/admin/managers error:", error);

    return failure("Unable to fetch managers.", 500, "INTERNAL_SERVER_ERROR");
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin(request);
    await requireModuleAccess(auth, "MANAGER_MANAGEMENT");

    const body = await request.json();

    const parsed = createManagerSchema.safeParse(body);

    if (!parsed.success) {
      console.error("CREATE MANAGER VALIDATION ERROR:", parsed.error.flatten());

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
    // =====================================================
    // AUTH ERRORS
    // =====================================================

    if (error instanceof Error) {
      switch (error.message) {
        case "UNAUTHORIZED":
          return failure("Authentication required.", 401, "UNAUTHORIZED");

        case "FORBIDDEN":
          return failure("Admin access required.", 403, "FORBIDDEN");

        case "ACCOUNT_NOT_ACTIVE":
          return failure("Account is not active.", 403, "ACCOUNT_NOT_ACTIVE");

        case "MODULE_ACCESS_DENIED":
          return failure(
            "You do not have access to manager management.",
            403,
            "MODULE_ACCESS_DENIED",
          );

        // =================================================
        // MANAGER ERRORS
        // =================================================

        case "EMAIL_ALREADY_EXISTS":
          return failure(
            "A manager with this email already exists.",
            409,
            "EMAIL_ALREADY_EXISTS",
          );

        case "MANAGER_NOT_FOUND":
          return failure("Manager not found.", 404, "MANAGER_NOT_FOUND");

        case "ATTRACTION_NOT_FOUND":
          return failure(
            "One or more selected attractions were not found.",
            404,
            "ATTRACTION_NOT_FOUND",
          );

        case "MODULE_NOT_FOUND":
          return failure(
            "One or more selected modules were not found.",
            404,
            "MODULE_NOT_FOUND",
          );

        case "INVALID_ATTRACTION_PERMISSION":
          return failure(
            "Invalid attraction permission configuration.",
            400,
            "INVALID_ATTRACTION_PERMISSION",
          );

        case "INVALID_MODULE_PERMISSION":
          return failure(
            "Invalid module permission configuration.",
            400,
            "INVALID_MODULE_PERMISSION",
          );

        case "INVALID_ADMIN_CONTEXT":
          return failure(
            "Admin context is invalid.",
            403,
            "INVALID_ADMIN_CONTEXT",
          );
      }
    }

    // =====================================================
    // SERVER ERROR
    // =====================================================

    console.error("POST /api/admin/managers error:", error);

    return failure("Unable to create manager.", 500, "INTERNAL_SERVER_ERROR");
  }
}
