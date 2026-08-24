import { z } from "zod";

import { getManagerById, updateManager } from "@/services/manager.service";

import { success, failure } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/require-admin";

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

    const { managerId } = await context.params;

    const manager = await getManagerById(auth.adminId, managerId);

    return success({
      manager,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return failure("Authentication required.", 401, "UNAUTHORIZED");
      }

      if (error.message === "ACCOUNT_NOT_ACTIVE") {
        return failure("Account is not active.", 403, "ACCOUNT_NOT_ACTIVE");
      }

      if (error.message === "FORBIDDEN") {
        return failure("Admin access required.", 403, "FORBIDDEN");
      }

      if (error.message === "MANAGER_NOT_FOUND") {
        return failure("Manager not found.", 404, "MANAGER_NOT_FOUND");
      }
    }

    console.error("Get manager error:", error);

    return failure("Unable to fetch manager.", 500, "INTERNAL_SERVER_ERROR");
  }
}

/* =========================================================
   PATCH /api/managers/[managerId]
========================================================= */

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const auth = await requireAdmin(request);

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
      if (error.message === "UNAUTHORIZED") {
        return failure("Authentication required.", 401, "UNAUTHORIZED");
      }

      if (error.message === "ACCOUNT_NOT_ACTIVE") {
        return failure("Account is not active.", 403, "ACCOUNT_NOT_ACTIVE");
      }

      if (error.message === "FORBIDDEN") {
        return failure("Admin access required.", 403, "FORBIDDEN");
      }

      if (error.message === "MANAGER_NOT_FOUND") {
        return failure("Manager not found.", 404, "MANAGER_NOT_FOUND");
      }

      if (error.message === "NOT_A_MANAGER") {
        return failure("User is not a manager.", 400, "NOT_A_MANAGER");
      }

      if (error.message === "EMAIL_ALREADY_EXISTS") {
        return failure("Email already exists.", 409, "EMAIL_ALREADY_EXISTS");
      }
    }

    console.error("Update manager error:", error);

    return failure("Unable to update manager.", 500, "INTERNAL_SERVER_ERROR");
  }
}
