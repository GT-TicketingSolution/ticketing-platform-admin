import { z } from "zod";

import { resetPassword } from "@/services/password-reset.service";

import { success, failure } from "@/lib/api/response";

const resetPasswordSchema = z.object({
  token: z.string().min(1),

  password: z
    .string()
    .min(8, "Password must contain at least 8 characters")
    .max(128, "Password is too long"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const parsed = resetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return failure(
        "Invalid reset password request.",
        400,
        "VALIDATION_ERROR",
      );
    }

    await resetPassword(parsed.data.token, parsed.data.password);

    return success({
      message: "Password reset successfully.",
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "INVALID_OR_EXPIRED_TOKEN"
    ) {
      return failure(
        "Reset link is invalid or has expired.",
        400,
        "INVALID_OR_EXPIRED_TOKEN",
      );
    }

    console.error("Reset password error:", error);

    return failure("Unable to reset password.", 500, "INTERNAL_SERVER_ERROR");
  }
}
