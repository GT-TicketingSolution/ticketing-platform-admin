import { NextRequest } from "next/server";
import { z } from "zod";

import {
  getSeatLayouts,
  createSeatLayout,
  type SeatLayoutStatus,
} from "@/services/seat.repository";

import { failure, success } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/require-auth";

const createSeatSchema = z.object({
  name: z.string().trim().min(1, "Seat layout name is required.").max(150),

  rows: z.number().int().positive(),

  cols: z.number().int().positive(),

  hasAisle: z.boolean(),

  aisleAfterCol: z.number().int().nonnegative(),

  status: z.enum(["ACTIVE", "INACTIVE"]),
});

export async function GET(request: NextRequest) {
  try {
    // ---------------------------------------------
    // AUTH
    // ---------------------------------------------

    const auth = await requireAuth(request);

    if (auth.user.role !== "ADMIN") {
      return failure("Admin access required.", 403, "FORBIDDEN");
    }

    // ---------------------------------------------
    // QUERY PARAMS
    // ---------------------------------------------

    const { searchParams } = new URL(request.url);

    const page = Number(searchParams.get("page")) || 1;

    const limit = Number(searchParams.get("limit")) || 12;

    const search = searchParams.get("search") || undefined;

    const statusParam = searchParams.get("status");

    const status =
      statusParam === "ACTIVE" || statusParam === "INACTIVE"
        ? (statusParam as SeatLayoutStatus)
        : undefined;

    // ---------------------------------------------
    // GET SEAT LAYOUTS
    // ---------------------------------------------

    const data = await getSeatLayouts({
      page,
      limit,
      search,
      status,

      // IMPORTANT:
      // Always use authenticated admin ID.
      adminId: auth.user.id,
    });

    return success(data);
  } catch (error) {
    console.error("Get seat layouts error:", error);

    return failure(
      "Unable to fetch seat layouts.",
      500,
      "INTERNAL_SERVER_ERROR",
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // ---------------------------------------------
    // AUTH
    // ---------------------------------------------

    const auth = await requireAuth(request);

    if (auth.user.role !== "ADMIN") {
      return failure("Admin access required.", 403, "FORBIDDEN");
    }

    // ---------------------------------------------
    // BODY
    // ---------------------------------------------

    const body = await request.json();

    const parsed = createSeatSchema.safeParse(body);

    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message || "Invalid seat layout data.",
        400,
        "VALIDATION_ERROR",
      );
    }

    // ---------------------------------------------
    // CREATE
    // ---------------------------------------------

    const data = await createSeatLayout({
      ...parsed.data,

      // IMPORTANT:
      // Never take adminId from frontend.
      adminId: auth.user.id,
    });

    return success(data, 201);
  } catch (error) {
    console.error("Create seat layout error:", error);

    const message =
      error instanceof Error ? error.message : "Unable to create seat layout.";

    return failure(message, 500, "INTERNAL_SERVER_ERROR");
  }
}
