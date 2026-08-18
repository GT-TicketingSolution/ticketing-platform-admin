import { NextRequest } from "next/server";

import {
  getInventory,
  upsertDailyCapacity,
} from "@/services/inventory.repository";

import { failure, success } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/require-admin";

export async function GET(request: NextRequest) {
  try {
    // --------------------------------------------------
    // AUTH
    // --------------------------------------------------

    const auth = await requireAdmin(request);

    const adminId = auth.adminId;

    // --------------------------------------------------
    // QUERY PARAMS
    // --------------------------------------------------

    const { searchParams } = new URL(request.url);

    const page = Number(searchParams.get("page")) || 1;

    const limit = Number(searchParams.get("limit")) || 10;

    const search = searchParams.get("search") || undefined;

    const attractionId = searchParams.get("attractionId") || undefined;

    const dateFrom = searchParams.get("dateFrom") || undefined;

    const dateTo = searchParams.get("dateTo") || undefined;

    // --------------------------------------------------
    // GET INVENTORY
    //
    // IMPORTANT:
    // Pass adminId so repository only returns
    // inventory belonging to this admin's attractions.
    // --------------------------------------------------

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
    // --------------------------------------------------
    // AUTH
    // --------------------------------------------------

    const auth = await requireAdmin(request);

    const adminId = auth.adminId;

    // --------------------------------------------------
    // BODY
    // --------------------------------------------------

    const body = await request.json();

    const { attractionId, capacityDate, totalCapacity } = body;

    // --------------------------------------------------
    // BASIC VALIDATION
    // --------------------------------------------------

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

    if (!Number.isInteger(Number(totalCapacity)) || Number(totalCapacity) < 0) {
      return failure(
        "Total capacity must be a non-negative integer.",
        400,
        "INVALID_CAPACITY",
      );
    }

    // --------------------------------------------------
    // CREATE / UPDATE DAILY CAPACITY
    //
    // IMPORTANT:
    // adminId is passed so the repository can verify
    // that the attraction belongs to this admin.
    // --------------------------------------------------

    const data = await upsertDailyCapacity({
      adminId,
      attractionId,
      capacityDate,
      totalCapacity: Number(totalCapacity),
    });

    return success(data);
  } catch (error) {
    console.error("Create/update inventory error:", error);

    const message =
      error instanceof Error ? error.message : "Unable to update inventory.";

    return failure(message, 500, "INTERNAL_SERVER_ERROR");
  }
}
