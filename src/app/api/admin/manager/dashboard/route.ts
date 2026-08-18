import { getManagerDashboardRepository } from "@/services/manager-dashboard.repository";

import { success, failure } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/require-auth";

export async function GET(request: Request) {
  try {
    // =====================================================
    // AUTHENTICATION
    // =====================================================

    const auth = await requireAuth(request);
    const user = auth.user;

    // =====================================================
    // MANAGER ONLY
    // =====================================================

    if (user.role !== "MANAGER") {
      return failure(
        "Only managers can access the manager dashboard.",
        403,
        "FORBIDDEN",
      );
    }

    // =====================================================
    // FETCH DASHBOARD
    // =====================================================

    const dashboard = await getManagerDashboardRepository(user.id);

    // =====================================================
    // RESPONSE
    // =====================================================

    return success(dashboard);
  } catch (error) {
    // =====================================================
    // AUTH ERRORS
    // =====================================================

    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return failure("Authentication required.", 401, "UNAUTHORIZED");
      }

      if (error.message === "ACCOUNT_NOT_ACTIVE") {
        return failure("Account is not active.", 403, "ACCOUNT_NOT_ACTIVE");
      }
    }

    // =====================================================
    // SERVER ERROR
    // =====================================================

    console.error("Get manager dashboard error:", error);

    return failure(
      "Unable to fetch manager dashboard.",
      500,
      "INTERNAL_SERVER_ERROR",
    );
  }
}
