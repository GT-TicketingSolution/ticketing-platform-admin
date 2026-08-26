import { getAttractionReports } from "@/services/report.service";

import { requireAuth } from "@/lib/auth/require-auth";

import { getAdminId } from "@/lib/auth/get-admin-id";

import { success, failure } from "@/lib/api/response";
import { requireModuleAccess } from "@/lib/auth/authorization";

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req);
    await requireModuleAccess(auth, "REPORTS");

    const params = new URL(req.url).searchParams;

    const data = await getAttractionReports({
      adminId: getAdminId(auth),

      fromDate: params.get("fromDate") ?? undefined,

      toDate: params.get("toDate") ?? undefined,

      attractionId: params.get("attractionId") ?? undefined,
    });

    return success(data);
  } catch (error) {
    // =====================================================
    // AUTHENTICATION / AUTHORIZATION ERRORS
    // =====================================================

    if (error instanceof Error) {
      switch (error.message) {
        case "UNAUTHORIZED":
          return failure("Authentication required.", 401, "UNAUTHORIZED");

        case "ACCOUNT_NOT_ACTIVE":
          return failure("Account is not active.", 403, "ACCOUNT_NOT_ACTIVE");

        case "FORBIDDEN":
          return failure(
            "You do not have permission to access attraction reports.",
            403,
            "FORBIDDEN",
          );

        case "MODULE_ACCESS_DENIED":
          return failure(
            "You do not have access to the reports module.",
            403,
            "MODULE_ACCESS_DENIED",
          );
      }
    }

    // =====================================================
    // SERVER ERROR
    // =====================================================

    console.error("GET /api/admin/reports/attractions error:", error);

    return failure(
      "Unable to fetch attraction reports.",
      500,
      "INTERNAL_SERVER_ERROR",
    );
  }
}
