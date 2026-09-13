import { eq } from "drizzle-orm";

import { db } from "@/db";
import { attractionSeats } from "@/db/schema";

import { success, failure } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireModuleAccess } from "@/lib/auth/authorization";

export async function DELETE(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const auth = await requireAuth(request);

    await requireModuleAccess(auth, "ATTRACTION_MANAGEMENT");

    const { id } = await context.params;

    if (!id || !id.trim()) {
      return failure(
        "Attraction seat ID is required.",
        400,
        "VALIDATION_ERROR",
      );
    }

    const deletedSeats = await db
      .delete(attractionSeats)
      .where(eq(attractionSeats.id, id))
      .returning({
        id: attractionSeats.id,
      });

    if (deletedSeats.length === 0) {
      return failure(
        "Attraction seat not found.",
        404,
        "NOT_FOUND",
      );
    }

    return success({
      message: "Attraction seat deleted successfully",
      attractionSeatId: id,
    });
  } catch (error) {
    console.error("Delete attraction seat error:", error);

    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return failure(
          "Authentication required.",
          401,
          "UNAUTHORIZED",
        );
      }

      if (error.message === "ACCOUNT_NOT_ACTIVE") {
        return failure(
          "Account is not active.",
          403,
          "ACCOUNT_NOT_ACTIVE",
        );
      }

      if (error.message === "FORBIDDEN") {
        return failure(
          "You are not authorized to access attraction management.",
          403,
          "FORBIDDEN",
        );
      }

      const errorStr = error.message.toLowerCase();

      if (
        errorStr.includes("foreign key") ||
        errorStr.includes("23503")
      ) {
        return failure(
          "This attraction seat cannot be deleted because it is referenced by another record.",
          409,
          "CONFLICT",
        );
      }
    }

    return failure(
      "Unable to delete attraction seat.",
      500,
      "INTERNAL_SERVER_ERROR",
    );
  }
}
