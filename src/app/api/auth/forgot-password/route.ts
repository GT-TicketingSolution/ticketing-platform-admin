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
      message:
        "If an account exists with this email, a password reset link has been sent.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);

    return failure(
      "Unable to process password reset request.",
      500,
      "INTERNAL_SERVER_ERROR",
    );
  }
}
