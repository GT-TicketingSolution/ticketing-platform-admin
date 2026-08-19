import { disableManager } from "@/services/manager.service";
import { failure, success } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/require-admin";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ managerId: string }> },
) {
  try {
    const auth = await requireAdmin(request);

    const { managerId } = await params;

    const manager = await disableManager(auth.adminId, managerId);

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
        return failure(
          "You are not authorized to disable managers.",
          403,
          "FORBIDDEN",
        );
      }

      if (error.message === "MANAGER_NOT_FOUND") {
        return failure("Manager not found.", 404, "MANAGER_NOT_FOUND");
      }
    }

    console.error("Disable manager error:", error);

    return failure("Unable to disable manager.", 500, "INTERNAL_SERVER_ERROR");
  }
}
