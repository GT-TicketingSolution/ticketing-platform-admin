import { requireAuth } from "@/lib/auth/require-auth";
import { getAdminId } from "@/lib/auth/get-admin-id";

import { getReport } from "@/services/report.service";

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

    const allowedParams = new Set(["fromDate", "fromTime", "toDate", "toTime"]);

    for (const key of params.keys()) {
      if (!allowedParams.has(key)) {
        return failure(
          `Invalid query parameter: ${key}. Only fromDate, fromTime, toDate and toTime are allowed.`,
          400,
          "INVALID_REPORT_PARAMETER",
        );
      }
    }

    const fromDate = params.get("fromDate")?.trim();
    const fromTime = params.get("fromTime")?.trim();
    const toDate = params.get("toDate")?.trim();
    const toTime = params.get("toTime")?.trim();

    // =====================================================
    // REQUIRED PARAMETERS
    // =====================================================

    if (!fromDate || !fromTime || !toDate || !toTime) {
      return failure(
        "fromDate, fromTime, toDate and toTime are required.",
        400,
        "REPORT_DATE_TIME_REQUIRED",
      );
    }

    // =====================================================
    // DATE/TIME VALIDATION
    // =====================================================

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const timeRegex = /^\d{2}:\d{2}(:\d{2})?$/;

    if (!dateRegex.test(fromDate)) {
      return failure(
        "Invalid fromDate. Expected format: YYYY-MM-DD.",
        400,
        "INVALID_FROM_DATE",
      );
    }

    if (!dateRegex.test(toDate)) {
      return failure(
        "Invalid toDate. Expected format: YYYY-MM-DD.",
        400,
        "INVALID_TO_DATE",
      );
    }

    if (!timeRegex.test(fromTime)) {
      return failure(
        "Invalid fromTime. Expected format: HH:mm or HH:mm:ss.",
        400,
        "INVALID_FROM_TIME",
      );
    }

    if (!timeRegex.test(toTime)) {
      return failure(
        "Invalid toTime. Expected format: HH:mm or HH:mm:ss.",
        400,
        "INVALID_TO_TIME",
      );
    }

    const normalizedFromTime =
      fromTime.length === 5 ? `${fromTime}:00` : fromTime;

    const normalizedToTime = toTime.length === 5 ? `${toTime}:59` : toTime;

    const startDateTime = new Date(`${fromDate}T${normalizedFromTime}.000Z`);

    const endDateTime = new Date(`${toDate}T${normalizedToTime}.999Z`);

    if (Number.isNaN(startDateTime.getTime())) {
      return failure(
        "Invalid report start date/time.",
        400,
        "INVALID_REPORT_START_DATETIME",
      );
    }

    if (Number.isNaN(endDateTime.getTime())) {
      return failure(
        "Invalid report end date/time.",
        400,
        "INVALID_REPORT_END_DATETIME",
      );
    }

    // =====================================================
    // DATE/TIME RANGE VALIDATION
    // =====================================================

    if (startDateTime > endDateTime) {
      return failure(
        "fromDate/fromTime cannot be later than toDate/toTime.",
        400,
        "INVALID_DATE_TIME_RANGE",
      );
    }

    // =====================================================
    // STAFF REPORT ACCESS VALIDATION + REPORT
    // =====================================================
    const data = await getReport({
      adminId,
      staffId: auth.user.role === "STAFF" ? auth.user.id : undefined,
      startDateTime,
      endDateTime,
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

      if (error.message === "REPORT_ACCESS_NOT_CONFIGURED") {
        return failure(
          "Report access is not configured for this staff member.",
          403,
          "REPORT_ACCESS_NOT_CONFIGURED",
        );
      }

      if (error.message === "REPORT_ACCESS_EXPIRED") {
        return failure(
          "The requested report period is outside your report access window.",
          403,
          "REPORT_ACCESS_EXPIRED",
        );
      }
    }

    // =====================================================
    // SERVER ERROR
    // =====================================================

    console.error("Get report error:", error);

    return failure("Unable to generate report.", 500, "REPORT_FETCH_FAILED");
  }
}
