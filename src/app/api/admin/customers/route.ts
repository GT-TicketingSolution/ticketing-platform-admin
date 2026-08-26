import { z } from "zod";

import { getCustomers, createCustomer } from "@/services/customer.service";

import { success, failure } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/require-auth";
import { getAdminId } from "@/lib/auth/get-admin-id";
import { requireModuleAccess } from "@/lib/auth/authorization";

const customerSchema = z.object({
  name: z.string().min(2).max(150),

  mobile: z.string().max(20),

  gstn: z.string().max(20).optional(),
});

// =====================================================
// GET CUSTOMERS
// =====================================================

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);
    await requireModuleAccess(auth, "CUSTOMER_MANAGEMENT");
    const { searchParams } = new URL(request.url);

    const page = Math.max(Number(searchParams.get("page") ?? 1), 1);

    const limit = Math.min(
      Math.max(Number(searchParams.get("limit") ?? 10), 1),
      100,
    );

    const search = searchParams.get("search") ?? undefined;

    const adminId = getAdminId(auth);

    const result = await getCustomers({
      adminId,
      page,
      limit,
      search,
    });

    return success(result);
  } catch (error) {
    console.error("Get customers error:", error);

    // ---------------------------------------------
    // Authorization Errors
    // ---------------------------------------------

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return failure("Authentication required.", 401, "UNAUTHORIZED");
    }

    if (error instanceof Error && error.message === "ACCOUNT_NOT_ACTIVE") {
      return failure("Account is not active.", 403, "ACCOUNT_NOT_ACTIVE");
    }

    if (error instanceof Error && error.message === "FORBIDDEN") {
      return failure(
        "You do not have permission to access customer management.",
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

    return failure("Unable to fetch customers.", 500, "INTERNAL_SERVER_ERROR");
  }
}

// =====================================================
// CREATE CUSTOMER
// =====================================================

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);

    await requireModuleAccess(auth, "CUSTOMER_MANAGEMENT");

    const body = await request.json();

    const parsed = customerSchema.safeParse(body);

    if (!parsed.success) {
      return failure("Invalid customer data", 400, "VALIDATION_ERROR");
    }

    const adminId = getAdminId(auth);

    const customer = await createCustomer(adminId, parsed.data);

    return success(customer, 201);
  } catch (error) {
    console.error("Get customers error:", error);

    // ---------------------------------------------
    // Authorization Errors
    // ---------------------------------------------

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return failure("Authentication required.", 401, "UNAUTHORIZED");
    }

    if (error instanceof Error && error.message === "ACCOUNT_NOT_ACTIVE") {
      return failure("Account is not active.", 403, "ACCOUNT_NOT_ACTIVE");
    }

    if (error instanceof Error && error.message === "FORBIDDEN") {
      return failure(
        "You do not have permission to access customer management.",
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

    return failure("Unable to fetch customers.", 500, "INTERNAL_SERVER_ERROR");
  }
}
