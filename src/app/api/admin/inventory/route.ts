import { NextRequest } from "next/server";

import {
  getInventory,
  upsertDailyCapacity,
} from "@/services/inventory.service";

import { failure, success } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/require-auth";

export async function GET(request: NextRequest) {
  try {
    // =====================================================
    // AUTHENTICATION
    // =====================================================

    const auth = await requireAuth(request);

    if (auth.user.role !== "ADMIN" && auth.user.role !== "MANAGER") {
      return failure("Admin or manager access required.", 403, "FORBIDDEN");
    }

    // =====================================================
    // TENANT
    // =====================================================

    const adminId =
      auth.user.role === "ADMIN" ? auth.user.id : auth.user.adminId;

    if (!adminId) {
      return failure("Admin context not found.", 403, "ADMIN_CONTEXT_REQUIRED");
    }

    // =====================================================
    // QUERY PARAMS
    // =====================================================

    const { searchParams } = new URL(request.url);

    const page = Math.max(Number(searchParams.get("page")) || 1, 1);

    const limit = Math.min(
      Math.max(Number(searchParams.get("limit")) || 10, 1),
      100,
    );

    const search = searchParams.get("search")?.trim() || undefined;

    const attractionId = searchParams.get("attractionId")?.trim() || undefined;

    const dateFrom = searchParams.get("dateFrom")?.trim() || undefined;

    const dateTo = searchParams.get("dateTo")?.trim() || undefined;

    // =====================================================
    // GET INVENTORY
    // =====================================================

    const data = await getInventory({
      adminId,
      page,
      limit,
      search,
      attractionId,
      dateFrom,
      dateTo,
    });

    return success(data);
  } catch (error) {
    console.error("Get inventory error:", error);

    return failure("Unable to fetch inventory.", 500, "INTERNAL_SERVER_ERROR");
  }
}

export async function POST(request: NextRequest) {
  try {
    // =====================================================
    // AUTHENTICATION
    // =====================================================

    const auth = await requireAuth(request);

    if (auth.user.role !== "ADMIN" && auth.user.role !== "MANAGER") {
      return failure("Admin or manager access required.", 403, "FORBIDDEN");
    }

    // =====================================================
    // TENANT
    // =====================================================

    const adminId =
      auth.user.role === "ADMIN" ? auth.user.id : auth.user.adminId;

    if (!adminId) {
      return failure("Admin context not found.", 403, "ADMIN_CONTEXT_REQUIRED");
    }

    // =====================================================
    // BODY
    // =====================================================

    const body = await request.json();

    const { attractionId, capacityDate, totalCapacity } = body;

    // =====================================================
    // VALIDATION
    // =====================================================

    if (!attractionId) {
      return failure(
        "Attraction ID is required.",
        400,
        "ATTRACTION_ID_REQUIRED",
      );
    }

    if (!capacityDate) {
      return failure(
        "Capacity date is required.",
        400,
        "CAPACITY_DATE_REQUIRED",
      );
    }

    const parsedCapacity = Number(totalCapacity);

    if (!Number.isInteger(parsedCapacity) || parsedCapacity < 0) {
      return failure(
        "Total capacity must be a non-negative integer.",
        400,
        "INVALID_CAPACITY",
      );
    }

    // =====================================================
    // CREATE / UPDATE CAPACITY
    // =====================================================

    const data = await upsertDailyCapacity({
      adminId,
      attractionId,
      capacityDate,
      totalCapacity: parsedCapacity,
    });

    return success(data);
  } catch (error) {
    console.error("Create/update inventory error:", error);

    const message =
      error instanceof Error ? error.message : "Unable to update inventory.";

    return failure(message, 500, "INTERNAL_SERVER_ERROR");
  }
}
