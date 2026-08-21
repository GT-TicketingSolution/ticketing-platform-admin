import { z } from "zod";

import {
  getComplimentaryPasses,
  createComplimentaryPass,
} from "@/services/complimentary-pass.service";

import { success, failure } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/require-auth";
import { getAdminId } from "@/lib/auth/get-admin-id";

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

const allowedRoles = ["ADMIN", "MANAGER", "STAFF"];

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req);

    if (!allowedRoles.includes(auth.user.role)) {
      return failure("Forbidden", 403, "FORBIDDEN");
    }

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

    const data = await getComplimentaryPasses({
      adminId: getAdminId(auth),

      search: params.get("search") ?? undefined,

      attractionId: params.get("attractionId") ?? undefined,

      fromDate: params.get("fromDate") ?? undefined,

      toDate: params.get("toDate") ?? undefined,

      status,

      page: Number(params.get("page") || 1),

      limit: Number(params.get("limit") || 10),
    });

    return success(data);
  } catch (error) {
    console.error("Get complimentary passes error:", error);

    return failure("Unable to fetch passes", 500, "INTERNAL_SERVER_ERROR");
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAuth(req);

    if (!allowedRoles.includes(auth.user.role)) {
      return failure("Forbidden", 403, "FORBIDDEN");
    }

    const body = await req.json();

    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message || "Invalid data",
        400,
        "VALIDATION_ERROR",
      );
    }

    const pass = await createComplimentaryPass(getAdminId(auth), parsed.data);

    return success(pass, 201);
  } catch (error) {
    console.error("Create complimentary pass error:", error);

    return failure("Unable to create pass", 500, "INTERNAL_SERVER_ERROR");
  }
}
