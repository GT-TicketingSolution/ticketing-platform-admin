import { z } from "zod";

import { getReferences, createReference } from "@/services/reference.service";

import { success, failure } from "@/lib/api/response";

import { requireAuth } from "@/lib/auth/require-auth";

import { getAdminId } from "@/lib/auth/get-admin-id";

const referenceSchema = z.object({
  referenceName: z.string().min(2).max(150),

  department: z.string().max(100).optional(),

  contactPerson: z.string().min(2).max(150),

  post: z.string().max(100).optional(),

  mobile: z.string().max(20),
});

// ===============================
// GET REFERENCES
// ===============================

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);

    if (!["ADMIN", "MANAGER", "STAFF"].includes(auth.user.role)) {
      return failure("Forbidden", 403, "FORBIDDEN");
    }

    const { searchParams } = new URL(request.url);

    const result = await getReferences({
      adminId: getAdminId(auth),

      search: searchParams.get("search") ?? undefined,

      page: Number(searchParams.get("page") || 1),

      limit: Number(searchParams.get("limit") || 10),
    });

    return success(result);
  } catch (error) {
    console.error("Get references error", error);

    return failure("Unable to fetch references", 500, "INTERNAL_SERVER_ERROR");
  }
}

// ===============================
// CREATE REFERENCE
// ===============================

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);

    if (!["ADMIN", "MANAGER", "STAFF"].includes(auth.user.role)) {
      return failure("Forbidden", 403, "FORBIDDEN");
    }

    const body = await request.json();

    const parsed = referenceSchema.safeParse(body);

    if (!parsed.success) {
      return failure("Invalid reference data", 400, "VALIDATION_ERROR");
    }

    const reference = await createReference(getAdminId(auth), parsed.data);

    return success(reference, 201);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "REFERENCE_ALREADY_EXISTS"
    ) {
      return failure(
        "Reference already exists",
        409,
        "REFERENCE_ALREADY_EXISTS",
      );
    }

    console.error("Create reference error", error);

    return failure("Unable to create reference", 500, "INTERNAL_SERVER_ERROR");
  }
}
