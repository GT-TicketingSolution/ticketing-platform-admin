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
    // AUTHENTICATION ERRORS
    // =====================================================

    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return failure("Authentication required.", 401, "UNAUTHORIZED");
      }

      // ===================================================
      // ACCOUNT STATUS
      // ===================================================

      if (error.message === "ACCOUNT_NOT_ACTIVE") {
        return failure("Account is not active.", 403, "ACCOUNT_NOT_ACTIVE");
      }

      // ===================================================
      // AUTHORIZATION
      // ===================================================

      if (error.message === "FORBIDDEN") {
        return failure(
          "You are not authorized to access attraction reports.",
          403,
          "FORBIDDEN",
        );
      }

      // ===================================================
      // ATTRACTION ERRORS
      // ===================================================

      if (error.message === "ATTRACTION_NOT_FOUND") {
        return failure("Attraction not found.", 404, "ATTRACTION_NOT_FOUND");
      }

      if (error.message === "ATTRACTION_ACCESS_DENIED") {
        return failure(
          "You are not authorized to access this attraction.",
          403,
          "ATTRACTION_ACCESS_DENIED",
        );
      }
    }

    // =====================================================
    // SERVER ERROR
    // =====================================================

    console.error("Get attraction reports error:", error);

    return failure(
      "Unable to fetch attraction reports.",
      500,
      "REPORT_FETCH_FAILED",
    );
  }
}
