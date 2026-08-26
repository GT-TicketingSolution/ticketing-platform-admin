import { requireAuth } from "@/lib/auth/require-auth";
import { getAdminId } from "@/lib/auth/get-admin-id";

import { getReportSummary } from "@/services/report.service";

import { success, failure } from "@/lib/api/response";
import { requireModuleAccess } from "@/lib/auth/authorization";

export async function GET(req: Request) {
  try {
    // =====================================================
    // AUTHENTICATION
    // =====================================================

    const auth = await requireAuth(req);

    // =====================================================
    // MODULE ACCESS
    // =====================================================

    await requireModuleAccess(auth, "REPORTS");

    // =====================================================
    // TENANT
    // =====================================================

    const adminId = getAdminId(auth);

    if (!adminId) {
      return failure("Admin context not found.", 403, "ADMIN_CONTEXT_REQUIRED");
    }

    // =====================================================
    // QUERY PARAMETERS
    // =====================================================

    const params = new URL(req.url).searchParams;

    const fromDate = params.get("fromDate")?.trim() || undefined;
    const toDate = params.get("toDate")?.trim() || undefined;
    const attractionId = params.get("attractionId")?.trim() || undefined;

    // =====================================================
    // DATE VALIDATION
    // =====================================================

    if (fromDate) {
      const parsedFromDate = new Date(`${fromDate}T00:00:00.000Z`);

      if (Number.isNaN(parsedFromDate.getTime())) {
        return failure(
          "Invalid fromDate. Expected format: YYYY-MM-DD.",
          400,
          "INVALID_FROM_DATE",
        );
      }
    }

    if (toDate) {
      const parsedToDate = new Date(`${toDate}T23:59:59.999Z`);

      if (Number.isNaN(parsedToDate.getTime())) {
        return failure(
          "Invalid toDate. Expected format: YYYY-MM-DD.",
          400,
          "INVALID_TO_DATE",
        );
      }
    }

    // =====================================================
    // DATE RANGE VALIDATION
    // =====================================================

    if (fromDate && toDate) {
      const startDate = new Date(`${fromDate}T00:00:00.000Z`);
      const endDate = new Date(`${toDate}T23:59:59.999Z`);

      if (startDate > endDate) {
        return failure(
          "fromDate cannot be later than toDate.",
          400,
          "INVALID_DATE_RANGE",
        );
      }
    }

    // =====================================================
    // FETCH REPORT SUMMARY
    // =====================================================

    const data = await getReportSummary({
      adminId,
      fromDate,
      toDate,
      attractionId,
    });

    // =====================================================
    // RESPONSE
    // =====================================================

    return success(data);
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

      if (error.message === "FORBIDDEN") {
        return failure(
          "You are not authorized to access reports.",
          403,
          "FORBIDDEN",
        );
      }

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

    console.error("Get report summary error:", error);

    return failure(
      "Unable to generate report summary.",
      500,
      "REPORT_SUMMARY_FETCH_FAILED",
    );
  }
}
