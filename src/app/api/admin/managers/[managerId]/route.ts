import { z } from "zod";

import {
  getManagerById,
  updateManager,
  deleteManager,
} from "@/services/manager.service";

import { success, failure } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/require-admin";
import { requireModuleAccess } from "@/lib/auth/authorization";

const updateManagerSchema = z.object({
  name: z.string().min(2).max(150).optional(),

  email: z.string().email().optional(),

  phone: z.string().max(20).optional(),

  password: z.string().min(8).optional(),

  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

type RouteContext = {
  params: Promise<{
    managerId: string;
  }>;
};

/* =========================================================
   GET /api/managers/[managerId]
========================================================= */

export async function GET(request: Request, context: RouteContext) {
  try {
    const auth = await requireAdmin(request);
    await requireModuleAccess(auth, "MANAGER_MANAGEMENT");

    const { managerId } = await context.params;

    const manager = await getManagerById(auth.adminId, managerId);

    return success({
      manager,
    });
  } catch (error) {
    if (error instanceof Error) {
      // Authentication
      if (error.message === "UNAUTHORIZED") {
        return failure("Authentication is required.", 401, "UNAUTHORIZED");
      }

      // Account status
      if (error.message === "ACCOUNT_NOT_ACTIVE") {
        return failure(
          "Your account is inactive. Please contact the administrator.",
          403,
          "ACCOUNT_NOT_ACTIVE",
        );
      }

      // Authorization
      if (error.message === "FORBIDDEN") {
        return failure(
          "You do not have permission to access manager management.",
          403,
          "MANAGER_ACCESS_FORBIDDEN",
        );
      }

      // Manager not found
      if (error.message === "MANAGER_NOT_FOUND") {
        return failure("Manager not found.", 404, "MANAGER_NOT_FOUND");
      }
    }

    console.error("GET /api/managers/[managerId] error:", error);

    return failure(
      "Unable to fetch manager details. Please try again later.",
      500,
      "MANAGER_FETCH_FAILED",
    );
  }
}

/* =========================================================
   PATCH /api/managers/[managerId]
========================================================= */

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const auth = await requireAdmin(request);
    await requireModuleAccess(auth, "MANAGER_MANAGEMENT");

    const { managerId } = await context.params;

    const body = await request.json();

    const parsed = updateManagerSchema.safeParse(body);

    if (!parsed.success) {
      return failure("Invalid manager details.", 400, "VALIDATION_ERROR");
    }

    const manager = await updateManager(auth.adminId, managerId, parsed.data);

    return success({
      manager,
    });
  } catch (error) {
    if (error instanceof Error) {
      // Authentication
      if (error.message === "UNAUTHORIZED") {
        return failure("Authentication is required.", 401, "UNAUTHORIZED");
      }

      // Account status
      if (error.message === "ACCOUNT_NOT_ACTIVE") {
        return failure(
          "Your account is inactive. Please contact the administrator.",
          403,
          "ACCOUNT_NOT_ACTIVE",
        );
      }

      // Authorization
      if (error.message === "FORBIDDEN") {
        return failure(
          "You do not have permission to manage managers.",
          403,
          "MANAGER_ACCESS_FORBIDDEN",
        );
      }

      // Manager not found
      if (error.message === "MANAGER_NOT_FOUND") {
        return failure("Manager not found.", 404, "MANAGER_NOT_FOUND");
      }

      // Target user is not a manager
      if (error.message === "NOT_A_MANAGER") {
        return failure(
          "The specified user is not a manager.",
          400,
          "NOT_A_MANAGER",
        );
      }

      // Duplicate email
      if (error.message === "EMAIL_ALREADY_EXISTS") {
        return failure(
          "This email address is already registered. Please use a different email address.",
          409,
          "EMAIL_ALREADY_EXISTS",
        );
      }
    }

    console.error("PATCH /api/managers/[managerId] error:", error);

    return failure(
      "Unable to update manager. Please try again later.",
      500,
      "MANAGER_UPDATE_FAILED",
    );
  }
}

/* =========================================================
DELETE /api/managers/[managerId]
========================================================= */

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const auth = await requireAdmin(request);
    await requireModuleAccess(auth, "MANAGER_MANAGEMENT");

    const { managerId } = await context.params;

    await deleteManager(auth.adminId, managerId);

    return success({
      message: "Manager deleted successfully.",
    });
  } catch (error) {
    if (error instanceof Error) {
      // Authentication
      if (error.message === "UNAUTHORIZED") {
        return failure("Authentication is required.", 401, "UNAUTHORIZED");
      }

      // Account status
      if (error.message === "ACCOUNT_NOT_ACTIVE") {
        return failure(
          "Your account is inactive. Please contact the administrator.",
          403,
          "ACCOUNT_NOT_ACTIVE",
        );
      }

      // Authorization
      if (error.message === "FORBIDDEN") {
        return failure(
          "You do not have permission to manage managers.",
          403,
          "MANAGER_ACCESS_FORBIDDEN",
        );
      }

      // Manager not found
      if (error.message === "MANAGER_NOT_FOUND") {
        return failure("Manager not found.", 404, "MANAGER_NOT_FOUND");
      }

      // Target user is not a manager
      if (error.message === "NOT_A_MANAGER") {
        return failure(
          "The specified user is not a manager.",
          400,
          "NOT_A_MANAGER",
        );
      }
    }

    console.error("DELETE /api/managers/[managerId] error:", error);

    return failure(
      "Unable to delete manager. Please try again later.",
      500,
      "MANAGER_DELETE_FAILED",
    );
  }
}
