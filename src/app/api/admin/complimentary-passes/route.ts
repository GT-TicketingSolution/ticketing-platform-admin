import { z } from "zod";

import {
  getComplimentaryPasses,
  createComplimentaryPass,
} from "@/services/complimentary-pass.service";

import { success, failure } from "@/lib/api/response";

import { requireAuth } from "@/lib/auth/require-auth";

import { getAdminId } from "@/lib/auth/get-admin-id";

const schema = z.object({
  visitorName: z.string(),

  mobile: z.string(),

  attractionId: z.string(),

  visitors: z.number(),

  referenceId: z.string().optional(),

  visitDate: z.string(),
});

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req);

    if (!["ADMIN", "MANAGER", "STAFF"].includes(auth.user.role)) {
      return failure("Forbidden", 403, "FORBIDDEN");
    }

    const params = new URL(req.url).searchParams;

    const data = await getComplimentaryPasses({
      adminId: getAdminId(auth),

      search: params.get("search") ?? undefined,

      attractionId: params.get("attractionId") ?? undefined,

      fromDate: params.get("fromDate") ?? undefined,

      toDate: params.get("toDate") ?? undefined,

      page: Number(params.get("page") || 1),

      limit: Number(params.get("limit") || 10),
    });

    return success(data);
  } catch (error) {
    console.error(error);

    return failure("Unable to fetch passes", 500, "INTERNAL_SERVER_ERROR");
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAuth(req);

    const body = await req.json();

    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return failure("Invalid data", 400, "VALIDATION_ERROR");
    }

    const pass = await createComplimentaryPass(getAdminId(auth), parsed.data);

    return success(pass, 201);
  } catch (error) {
    console.error(error);

    return failure("Unable to create pass", 500, "INTERNAL_SERVER_ERROR");
  }
}
