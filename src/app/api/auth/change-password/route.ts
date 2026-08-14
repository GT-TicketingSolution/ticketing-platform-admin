import { z } from "zod";

import { changePassword } from "@/services/password.service";

import { changePasswordSchema } from "@/lib/validation/auth.schema";

import { success, failure } from "@/lib/api/response";

import { requireAuth } from "@/lib/auth/require-auth";

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);

    const body = await request.json();

    const parsed = changePasswordSchema.safeParse(body);

    if (!parsed.success) {
      return failure("Invalid password details.", 400, "VALIDATION_ERROR");
    }

    await changePassword(
      auth.user.id,
      parsed.data.currentPassword,
      parsed.data.newPassword,
    );

    return success({
      message: "Password changed successfully.",
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "INVALID_CURRENT_PASSWORD"
    ) {
      return failure(
        "Current password is incorrect.",
        400,
        "INVALID_CURRENT_PASSWORD",
      );
    }

    if (error instanceof Error && error.message === "USER_NOT_FOUND") {
      return failure("User not found.", 404, "USER_NOT_FOUND");
    }

    if (error instanceof Error && error.message === "ACCOUNT_NOT_ACTIVE") {
      return failure("Account is not active.", 403, "ACCOUNT_NOT_ACTIVE");
    }

    console.error("Change password error:", error);

    return failure("Unable to change password.", 500, "INTERNAL_SERVER_ERROR");
  }
}
