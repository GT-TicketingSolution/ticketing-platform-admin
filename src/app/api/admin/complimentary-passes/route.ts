import { z } from "zod";

import {
  getComplimentaryPasses,
  createComplimentaryPass,
} from "@/services/complimentary-pass.service";

import { success, failure } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/require-auth";
import { getAdminId } from "@/lib/auth/get-admin-id";
import { requireModuleAccess } from "@/lib/auth/authorization";

const schema = z.object({
  visitorName: z.string().trim().min(1, "Visitor name is required"),

  mobile: z
    .string()
    .trim()
    .regex(/^[0-9]{10}$/, "Mobile number must be 10 digits"),

  attractionId: z.string().min(1, "Attraction is required"),

  visitors: z
    .number()
    .int()
    .positive("Number of visitors must be greater than 0"),

  referenceId: z.string().min(1, "Reference is required"),

  visitDate: z.string().min(1, "Visit date is required"),

  status: z.enum(["ACTIVE", "USED", "EXPIRED"]).default("ACTIVE"),
});

// =====================================================
// GET COMPLIMENTARY PASSES
// MODULE: COMPLIMENTARY_PASSES
// =====================================================

export async function GET(req: Request) {
  try {
    // ---------------------------------------------
    // Authentication
    // ---------------------------------------------
    const auth = await requireAuth(req);

    // ---------------------------------------------
    // Module Authorization
    // ---------------------------------------------
    await requireModuleAccess(auth, "COMPLIMENTARY_PASSES");

    // ---------------------------------------------
    // Query Params
    // ---------------------------------------------
    const params = new URL(req.url).searchParams;

    const page = Math.max(Number(params.get("page") || 1), 1);

    const limit = Math.min(Math.max(Number(params.get("limit") || 10), 1), 100);

    const statusParam = params.get("status");

    const status =
      statusParam === "ACTIVE" ||
      statusParam === "USED" ||
      statusParam === "EXPIRED"
        ? statusParam
        : undefined;

    // ---------------------------------------------
    // Get Complimentary Passes
    // ---------------------------------------------
    const data = await getComplimentaryPasses({
      adminId: getAdminId(auth),

      search: params.get("search") ?? undefined,
      attractionId: params.get("attractionId") ?? undefined,

      fromDate: params.get("fromDate") ?? undefined,

      toDate: params.get("toDate") ?? undefined,

      status,

      page,
      limit,
    });

    return success(data);
  } catch (error) {
    console.error("Get complimentary passes error:", error);

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return failure("Authentication required.", 401, "UNAUTHORIZED");
    }

    if (error instanceof Error && error.message === "ACCOUNT_NOT_ACTIVE") {
      return failure("Account is not active.", 403, "ACCOUNT_NOT_ACTIVE");
    }

    if (error instanceof Error && error.message === "FORBIDDEN") {
      return failure(
        "You do not have permission to access complimentary passes.",
        403,
        "FORBIDDEN",
      );
    }

    if (error instanceof Error && error.message === "USER_HAS_NO_ADMIN") {
      return failure(
        "User is not associated with an admin.",
        403,
        "USER_HAS_NO_ADMIN",
      );
    }

    return failure("Unable to fetch passes.", 500, "INTERNAL_SERVER_ERROR");
  }
}

// =====================================================
// POST COMPLIMENTARY PASS
// MODULE: COMPLIMENTARY_PASSES
// =====================================================

export async function POST(req: Request) {
  try {
    // ---------------------------------------------
    // Authentication
    // ---------------------------------------------

    const auth = await requireAuth(req);

    // ---------------------------------------------
    // Module Authorization
    // ---------------------------------------------

    await requireModuleAccess(auth, "COMPLIMENTARY_PASSES");

    // ---------------------------------------------
    // Request Body
    // ---------------------------------------------

    const body = await req.json();

    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message || "Invalid data.",
        400,
        "VALIDATION_ERROR",
      );
    }

    // ---------------------------------------------
    // Create Complimentary Pass
    // ---------------------------------------------

    const pass = await createComplimentaryPass(getAdminId(auth), parsed.data);

    return success(pass, 201);
  } catch (error) {
    console.error("Create complimentary pass error:", error);

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return failure("Authentication required.", 401, "UNAUTHORIZED");
    }

    if (error instanceof Error && error.message === "ACCOUNT_NOT_ACTIVE") {
      return failure("Account is not active.", 403, "ACCOUNT_NOT_ACTIVE");
    }

    if (error instanceof Error && error.message === "FORBIDDEN") {
      return failure(
        "You do not have permission to access complimentary passes.",
        403,
        "FORBIDDEN",
      );
    }

    if (error instanceof Error && error.message === "USER_HAS_NO_ADMIN") {
      return failure(
        "User is not associated with an admin.",
        403,
        "USER_HAS_NO_ADMIN",
      );
    }

    return failure(
      "Unable to create complimentary pass.",
      500,
      "INTERNAL_SERVER_ERROR",
    );
  }
}
