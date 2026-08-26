import { NextRequest } from "next/server";
import { z } from "zod";

import {
  getSeatLayouts,
  createSeatLayout,
  type SeatLayoutStatus,
} from "@/services/seat.repository";

import { failure, success } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireModuleAccess } from "@/lib/auth/authorization";

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

    await requireModuleAccess(auth, "SEAT_MANAGEMENT");

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
            "You do not have permission to access seat management.",
            403,
            "FORBIDDEN",
          );

        case "MODULE_ACCESS_DENIED":
          return failure(
            "You do not have access to the seat management module.",
            403,
            "MODULE_ACCESS_DENIED",
          );
      }
    }

    // =====================================================
    // SERVER ERROR
    // =====================================================

    console.error("GET /api/admin/seat-layouts error:", error);

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

    await requireModuleAccess(auth, "SEAT_MANAGEMENT");

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
            "You do not have permission to create seat layouts.",
            403,
            "FORBIDDEN",
          );

        case "MODULE_ACCESS_DENIED":
          return failure(
            "You do not have access to the seat management module.",
            403,
            "MODULE_ACCESS_DENIED",
          );

        case "SEAT_LAYOUT_NOT_FOUND":
          return failure(
            "Seat layout not found.",
            404,
            "SEAT_LAYOUT_NOT_FOUND",
          );

        case "SEAT_LAYOUT_ALREADY_EXISTS":
          return failure(
            "A seat layout with this name already exists.",
            409,
            "SEAT_LAYOUT_ALREADY_EXISTS",
          );
      }
    }

    // =====================================================
    // SERVER ERROR
    // =====================================================

    console.error("POST /api/admin/seat-layouts error:", error);

    return failure(
      "Unable to create seat layout.",
      500,
      "INTERNAL_SERVER_ERROR",
    );
  }
}
