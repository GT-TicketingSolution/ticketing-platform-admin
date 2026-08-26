import { disableManager } from "@/services/manager.service";
import { failure, success } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/require-admin";
import { requireModuleAccess } from "@/lib/auth/authorization";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ managerId: string }> },
) {
  try {
    const auth = await requireAdmin(request);
    await requireModuleAccess(auth, "MANAGER_MANAGEMENT");

    const { managerId } = await params;

    const manager = await disableManager(auth.adminId, managerId);

    return success({
      manager,
    });
  } catch (error) {
    if (error instanceof Error) {
      // -------------------------------------------------
      // AUTHENTICATION
      // -------------------------------------------------

      if (error.message === "UNAUTHORIZED") {
        return failure("Authentication is required.", 401, "UNAUTHORIZED");
      }

      // -------------------------------------------------
      // ACCOUNT STATUS
      // -------------------------------------------------

      if (error.message === "ACCOUNT_NOT_ACTIVE") {
        return failure(
          "Your account is inactive. Please contact the administrator.",
          403,
          "ACCOUNT_NOT_ACTIVE",
        );
      }

      // -------------------------------------------------
      // AUTHORIZATION
      // -------------------------------------------------

      if (error.message === "FORBIDDEN") {
        return failure(
          "You do not have permission to disable managers.",
          403,
          "MANAGER_DISABLE_FORBIDDEN",
        );
      }

      // -------------------------------------------------
      // MANAGER NOT FOUND
      // -------------------------------------------------

      if (error.message === "MANAGER_NOT_FOUND") {
        return failure("Manager not found.", 404, "MANAGER_NOT_FOUND");
      }

      // -------------------------------------------------
      // ALREADY DISABLED
      // -------------------------------------------------

      if (error.message === "MANAGER_ALREADY_DISABLED") {
        return failure(
          "Manager is already disabled.",
          409,
          "MANAGER_ALREADY_DISABLED",
        );
      }

      // -------------------------------------------------
      // INVALID MANAGER
      // -------------------------------------------------

      if (error.message === "NOT_A_MANAGER") {
        return failure(
          "The specified user is not a manager.",
          400,
          "NOT_A_MANAGER",
        );
      }
    }

    // =====================================================
    // INTERNAL SERVER ERROR
    // =====================================================

    console.error("PATCH /api/managers/[managerId]/disable error:", error);

    return failure(
      "Unable to disable manager. Please try again later.",
      500,
      "MANAGER_DISABLE_FAILED",
    );
  }
}
