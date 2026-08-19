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

      if (error.message === "MANAGER_NOT_FOUND") {
        return failure("Manager not found.", 404, "MANAGER_NOT_FOUND");
      }
    }

    console.error("Create manager error:", error);

    return failure("Unable to create manager.", 500, "INTERNAL_SERVER_ERROR");
  }
}
