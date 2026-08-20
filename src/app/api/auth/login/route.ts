import { z } from "zod";

import { login, AuthError } from "@/services/auth.service";

import { setSessionCookie } from "@/services/session.service";

import { success, failure } from "@/lib/api/response";

export const runtime = "nodejs";

const loginSchema = z.object({
  email: z.email(),

  password: z.string().min(8).max(72),

  role: z.enum(["ADMIN", "MANAGER", "STAFF"]),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return failure("Invalid login data.", 422, "VALIDATION_ERROR");
    }

    const result = await login(parsed.data);

    await setSessionCookie(result.session.rawToken, result.session.expiresAt);

    const redirectTo =
      result.user.role === "STAFF"
        ? result.user.staffRoles.includes("VALIDATOR")
          ? "/scanner"
          : "/ticket-booking"
        : "/dashboard";

    return success({
      user: result.user,
      redirectTo,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return failure(error.message, 401, error.code);
    }

    console.error("LOGIN_ERROR", error);

    return failure("Internal server error.", 500, "INTERNAL_SERVER_ERROR");
  }
}
