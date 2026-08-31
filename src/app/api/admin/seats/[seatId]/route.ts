import { NextRequest } from "next/server";
import { z } from "zod";

import {
  getSeatLayoutById,
  updateSeatLayout,
  deleteSeatLayout,
} from "@/services/seat.repository";

import { failure, success } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireModuleAccess } from "@/lib/auth/authorization";

const updateSeatSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Seat layout name is required.")
      .max(150)
      .optional(),

    rows: z
      .number()
      .int()
      .positive("Row count must be a positive integer.")
      .max(200, "Row count cannot exceed 200.")
      .optional(),

    cols: z
      .number()
      .int()
      .positive("Column count must be a positive integer.")
      .max(200, "Column count cannot exceed 200.")
      .optional(),

    hasAisle: z.boolean().optional(),

    aisleDirection: z.enum(["VERTICAL", "HORIZONTAL"]).optional(),

    aisleAfterCol: z
      .number()
      .int()
      .nonnegative("Aisle column position cannot be negative.")
      .nullable()
      .optional(),

    aisleAfterRow: z
      .number()
      .int()
      .nonnegative("Aisle row position cannot be negative.")
      .nullable()
      .optional(),

    status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  })
  .superRefine((data, ctx) => {
    // ---------------------------------------------
    // If aisle is explicitly disabled, no position
    // validation is required.
    // ---------------------------------------------

    if (data.hasAisle === false) {
      return;
    }

    // If the PATCH does not contain enough information
    // to determine the final aisle configuration,
    // repository validation will use the existing values.
    if (!data.aisleDirection) {
      return;
    }

    // ---------------------------------------------
    // VERTICAL AISLE
    // ---------------------------------------------

    if (data.aisleDirection === "VERTICAL") {
      if (data.cols !== undefined && data.cols <= 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["cols"],
          message: "At least 2 columns are required for a vertical aisle.",
        });
      }

      if (
        data.aisleAfterCol !== undefined &&
        data.aisleAfterCol !== null &&
        data.cols !== undefined &&
        data.aisleAfterCol >= data.cols
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["aisleAfterCol"],
          message: "Vertical aisle position must be between 0 and columns - 1.",
        });
      }
    }

    // ---------------------------------------------
    // HORIZONTAL AISLE
    // ---------------------------------------------

    if (data.aisleDirection === "HORIZONTAL") {
      if (data.rows !== undefined && data.rows <= 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["rows"],
          message: "At least 2 rows are required for a horizontal aisle.",
        });
      }

      if (
        data.aisleAfterRow !== undefined &&
        data.aisleAfterRow !== null &&
        data.rows !== undefined &&
        data.aisleAfterRow >= data.rows
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["aisleAfterRow"],
          message: "Horizontal aisle position must be between 0 and rows - 1.",
        });
      }
    }
  });

type RouteContext = {
  params: Promise<{
    seatId: string;
  }>;
};

// ============================================================
// GET SINGLE SEAT LAYOUT
// ============================================================

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    // ---------------------------------------------
    // AUTH
    // ---------------------------------------------

    const auth = await requireAuth(request);

    await requireModuleAccess(auth, "SEAT_MANAGEMENT");

    // ---------------------------------------------
    // PARAMS
    // ---------------------------------------------

    const { seatId } = await context.params;

    if (!seatId) {
      return failure("Seat ID is required.", 400, "SEAT_ID_REQUIRED");
    }

    // ---------------------------------------------
    // GET
    // ---------------------------------------------

    const seat = await getSeatLayoutById(
      seatId,

      // IMPORTANT:
      // Only authenticated admin's layouts
      auth.user.id,
    );

    if (!seat) {
      return failure("Seat layout not found.", 404, "SEAT_NOT_FOUND");
    }

    // ---------------------------------------------
    // RESPONSE
    // ---------------------------------------------

    return success({
      ...seat,
      totalSeats: seat.rows * seat.cols,
    });
  } catch (error) {
    console.error("Get seat layout error:", error);

    return failure(
      "Unable to fetch seat layout.",
      500,
      "INTERNAL_SERVER_ERROR",
    );
  }
}

// ============================================================
// UPDATE SEAT LAYOUT
// ============================================================

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    // ---------------------------------------------
    // AUTH
    // ---------------------------------------------

    const auth = await requireAuth(request);

    await requireModuleAccess(auth, "SEAT_MANAGEMENT");

    // ---------------------------------------------
    // PARAMS
    // ---------------------------------------------

    const { seatId } = await context.params;

    if (!seatId) {
      return failure("Seat ID is required.", 400, "SEAT_ID_REQUIRED");
    }

    // ---------------------------------------------
    // BODY
    // ---------------------------------------------

    const body = await request.json();

    const parsed = updateSeatSchema.safeParse(body);

    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message || "Invalid seat layout data.",
        400,
        "VALIDATION_ERROR",
      );
    }

    // ---------------------------------------------
    // UPDATE
    // ---------------------------------------------

    const updated = await updateSeatLayout(
      seatId,

      // IMPORTANT:
      // Ownership comes from authenticated admin.
      auth.user.id,

      parsed.data,
    );

    // ---------------------------------------------
    // RESPONSE
    // ---------------------------------------------

    return success(updated);
  } catch (error) {
    console.error("Update seat layout error:", error);

    const message =
      error instanceof Error ? error.message : "Unable to update seat layout.";

    const status = message === "Seat layout not found." ? 404 : 500;

    return failure(
      message,
      status,
      status === 404 ? "SEAT_NOT_FOUND" : "INTERNAL_SERVER_ERROR",
    );
  }
}

// ============================================================
// DELETE SEAT LAYOUT
// ============================================================

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    // ---------------------------------------------
    // AUTH
    // ---------------------------------------------

    const auth = await requireAuth(request);

    await requireModuleAccess(auth, "SEAT_MANAGEMENT");

    // ---------------------------------------------
    // PARAMS
    // ---------------------------------------------

    const { seatId } = await context.params;

    if (!seatId) {
      return failure("Seat ID is required.", 400, "SEAT_ID_REQUIRED");
    }

    // ---------------------------------------------
    // DELETE
    // ---------------------------------------------

    const deleted = await deleteSeatLayout(
      seatId,

      // IMPORTANT:
      // Admin can only delete their own layout.
      auth.user.id,
    );

    // ---------------------------------------------
    // RESPONSE
    // ---------------------------------------------

    return success({
      message: "Seat layout deleted successfully.",
      seat: deleted,
    });
  } catch (error) {
    console.error("Delete seat layout error:", error);

    const message =
      error instanceof Error ? error.message : "Unable to delete seat layout.";

    const status = message === "Seat layout not found." ? 404 : 500;

    return failure(
      message,
      status,
      status === 404 ? "SEAT_NOT_FOUND" : "INTERNAL_SERVER_ERROR",
    );
  }
}
