import { z } from "zod";

import { getCustomers, createCustomer } from "@/services/customer.service";

import { success, failure } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/require-auth";
import { getAdminId } from "@/lib/auth/get-admin-id";

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

    if (auth.user.role !== "ADMIN" && auth.user.role !== "MANAGER") {
      return failure("Forbidden", 403, "FORBIDDEN");
    }

    const { searchParams } = new URL(request.url);

    const page = Math.max(Number(searchParams.get("page") ?? 1), 1);

    const limit = Math.min(
      Math.max(Number(searchParams.get("limit") ?? 10), 1),
      100,
    );

    const search = searchParams.get("search") ?? undefined;

    const adminId = getAdminId(auth);

    // console.log("GET CUSTOMER DEBUG");
    // console.log("GET AUTH USER:", auth.user);
    // console.log("GET ADMIN ID:", adminId);

    const result = await getCustomers({
      adminId,
      page,
      limit,
      search,
    });

    return success(result);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return failure("Unauthorized", 401, "UNAUTHORIZED");
    }

    if (error instanceof Error && error.message === "FORBIDDEN") {
      return failure("Forbidden", 403, "FORBIDDEN");
    }

    console.error("Get customers error:", error);

    return failure("Unable to fetch customers", 500, "INTERNAL_SERVER_ERROR");
  }
}

// =====================================================
// CREATE CUSTOMER
// =====================================================

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);

    if (auth.user.role !== "ADMIN" && auth.user.role !== "MANAGER") {
      return failure("Forbidden", 403, "FORBIDDEN");
    }

    const body = await request.json();

    const parsed = customerSchema.safeParse(body);

    if (!parsed.success) {
      return failure("Invalid customer data", 400, "VALIDATION_ERROR");
    }

    const adminId = getAdminId(auth);

    const customer = await createCustomer(adminId, parsed.data);

    return success(customer, 201);
  } catch (error) {
    if (error instanceof Error && error.message === "CUSTOMER_ALREADY_EXISTS") {
      return failure("Customer already exists", 409, "CUSTOMER_ALREADY_EXISTS");
    }

    if (error instanceof Error && error.message === "FORBIDDEN") {
      return failure("Forbidden", 403, "FORBIDDEN");
    }

    console.error("Create customer error:", error);

    return failure("Unable to create customer", 500, "INTERNAL_SERVER_ERROR");
  }
}
