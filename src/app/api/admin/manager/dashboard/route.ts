import { getManagerDashboardRepository } from "@/services/manager-dashboard.repository";

import { success, failure } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireModuleAccess } from "@/lib/auth/authorization";

export async function GET(request: Request) {
  try {
    // =====================================================
    // AUTHENTICATION
    // =====================================================

    const auth = await requireAuth(request);
    await requireModuleAccess(auth, "DASHBOARD");
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
    // AUTHENTICATION ERRORS
    // =====================================================

    if (error instanceof Error) {
      switch (error.message) {
        case "UNAUTHORIZED":
          return failure("Authentication required.", 401, "UNAUTHORIZED");

        case "ACCOUNT_NOT_ACTIVE":
          return failure("Account is not active.", 403, "ACCOUNT_NOT_ACTIVE");

        case "FORBIDDEN":
          return failure(
            "You do not have permission to access the manager dashboard.",
            403,
            "FORBIDDEN",
          );

        case "MODULE_ACCESS_DENIED":
          return failure(
            "You do not have access to the dashboard module.",
            403,
            "MODULE_ACCESS_DENIED",
          );
      }
    }

    // =====================================================
    // SERVER ERROR
    // =====================================================

    console.error("GET /api/manager/dashboard error:", error);

    return failure(
      "Unable to fetch manager dashboard.",
      500,
      "INTERNAL_SERVER_ERROR",
    );
  }
}
