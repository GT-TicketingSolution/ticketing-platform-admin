import { disableManager } from "@/services/manager.service";
import { failure, success } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/require-auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ managerId: string }> },
) {
  try {
    const auth = await requireAuth(request);

    // Only ADMIN can disable managers
    if (auth.user.role !== "ADMIN") {
      return failure(
        "You are not authorized to disable managers.",
        403,
        "FORBIDDEN",
      );
    }

    const { managerId } = await params;

    const manager = await disableManager(managerId);

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

      if (error.message === "MANAGER_NOT_FOUND") {
        return failure("Manager not found.", 404, "MANAGER_NOT_FOUND");
      }
    }

    console.error("Disable manager error:", error);

    return failure("Unable to disable manager.", 500, "INTERNAL_SERVER_ERROR");
  }
}
