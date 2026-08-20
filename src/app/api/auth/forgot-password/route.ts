import { z } from "zod";

import { requestPasswordReset } from "@/services/password-reset.service";

import { success, failure } from "@/lib/api/response";

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const parsed = forgotPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return failure("Invalid email address.", 400, "VALIDATION_ERROR");
    }

    await requestPasswordReset(parsed.data.email);

    return success({
      message: "Password reset link has been sent.",
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "USER_NOT_FOUND") {
        return failure(
          "No account found with this email address.",
          404,
          "USER_NOT_FOUND",
        );
      }

      if (error.message === "ACCOUNT_NOT_ACTIVE") {
        return failure(
          "This account is not active.",
          403,
          "ACCOUNT_NOT_ACTIVE",
        );
      }
    }

    console.error("Forgot password error:", error);

    return failure(
      "Unable to process password reset request.",
      500,
      "INTERNAL_SERVER_ERROR",
    );
  }
}
