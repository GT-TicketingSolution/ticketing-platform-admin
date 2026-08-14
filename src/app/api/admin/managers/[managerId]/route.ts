import { z } from "zod";

import {
  getManagerById,
  updateManager,
  disableManager,
} from "@/services/manager.service";

import { success, failure } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/require-auth";

const updateManagerSchema = z.object({
  name: z.string().min(2).max(150).optional(),

  email: z.string().email().optional(),

  phone: z.string().max(20).optional(),

  password: z.string().min(8).optional(),

  status: z.enum(["ACTIVE", "SUSPENDED", "DISABLED"]).optional(),
});

type RouteContext = {
  params: Promise<{
    managerId: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const auth = await requireAuth(request);

    if (auth.user.role !== "ADMIN") {
      return failure("Admin access required.", 403, "FORBIDDEN");
    }

    const { managerId } = await context.params;

    const manager = await getManagerById(managerId);

    return success({
      manager,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "MANAGER_NOT_FOUND") {
      return failure("Manager not found.", 404, "MANAGER_NOT_FOUND");
    }

    console.error("Get manager error:", error);

    return failure("Unable to fetch manager.", 500, "INTERNAL_SERVER_ERROR");
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const auth = await requireAuth(request);

    if (auth.user.role !== "ADMIN") {
      return failure("Admin access required.", 403, "FORBIDDEN");
    }

    const { managerId } = await context.params;

    const body = await request.json();

    const parsed = updateManagerSchema.safeParse(body);

    if (!parsed.success) {
      return failure("Invalid manager details.", 400, "VALIDATION_ERROR");
    }

    const manager = await updateManager(managerId, parsed.data);

    return success({
      manager,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "MANAGER_NOT_FOUND") {
      return failure("Manager not found.", 404, "MANAGER_NOT_FOUND");
    }

    if (error instanceof Error && error.message === "NOT_A_MANAGER") {
      return failure("User is not a manager.", 400, "NOT_A_MANAGER");
    }

    if (error instanceof Error && error.message === "EMAIL_ALREADY_EXISTS") {
      return failure("Email already exists.", 409, "EMAIL_ALREADY_EXISTS");
    }

    console.error("Update manager error:", error);

    return failure("Unable to update manager.", 500, "INTERNAL_SERVER_ERROR");
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const auth = await requireAuth(request);

    if (auth.user.role !== "ADMIN") {
      return failure("Admin access required.", 403, "FORBIDDEN");
    }

    const { managerId } = await context.params;

    const manager = await disableManager(managerId);

    return success({
      message: "Manager disabled successfully.",
      manager,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "MANAGER_NOT_FOUND") {
      return failure("Manager not found.", 404, "MANAGER_NOT_FOUND");
    }

    console.error("Disable manager error:", error);

    return failure("Unable to disable manager.", 500, "INTERNAL_SERVER_ERROR");
  }
}
