import { NextRequest } from "next/server";

import { and, eq, ilike, or } from "drizzle-orm";

import { z } from "zod";

import { db } from "@/db";

import { customers } from "@/db/schema";

import { requireAuth } from "@/lib/auth/require-auth";

import { requireModuleAccess, getAdminId } from "@/lib/auth/authorization";

import { success, failure } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  try {
    // ---------------------------------------------
    // AUTHENTICATION
    // ---------------------------------------------

    const auth = await requireAuth(request);

    await requireModuleAccess(auth, "TICKET_BOOKING");

    const adminId = getAdminId(auth);

    // ---------------------------------------------
    // QUERY PARAMETERS
    // ---------------------------------------------

    const searchParams = request.nextUrl.searchParams;

    const search = searchParams.get("search")?.trim() || "";

    const limitParam = searchParams.get("limit") || "20";

    const limit = Math.min(Math.max(Number(limitParam) || 20, 1), 50);

    // ---------------------------------------------
    // CONDITIONS
    // ---------------------------------------------

    const conditions = [
      eq(customers.adminId, adminId),
      eq(customers.isDeleted, false),
    ];

    // ---------------------------------------------
    // SEARCH
    // ---------------------------------------------

    if (search) {
      conditions.push(
        or(
          ilike(customers.name, `%${search}%`),
          ilike(customers.mobile, `%${search}%`),
          ilike(customers.gstn, `%${search}%`),
        )!,
      );
    }

    // ---------------------------------------------
    // FETCH CUSTOMERS
    // ---------------------------------------------

    const rows = await db
      .select({
        id: customers.id,
        name: customers.name,
        mobile: customers.mobile,
        gstn: customers.gstn,
        createdAt: customers.createdAt,
      })
      .from(customers)
      .where(and(...conditions))
      .orderBy(customers.name)
      .limit(limit);

    // ---------------------------------------------
    // RESPONSE
    // ---------------------------------------------

    return success({
      items: rows.map((customer) => ({
        id: customer.id,
        name: customer.name,
        mobile: customer.mobile,
        gstn: customer.gstn,
        createdAt: customer.createdAt,
      })),
      count: rows.length,
    });
  } catch (error) {
    console.error("Get ticketing booking customers error:", error);

    // ---------------------------------------------
    // AUTH ERRORS
    // ---------------------------------------------

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return failure("Authentication required.", 401, "UNAUTHORIZED");
    }

    if (error instanceof Error && error.message === "ACCOUNT_NOT_ACTIVE") {
      return failure("Account is not active.", 403, "ACCOUNT_NOT_ACTIVE");
    }

    if (error instanceof Error && error.message === "FORBIDDEN") {
      return failure(
        "You do not have permission to access ticketing.",
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

const createCustomerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Customer name is required.")
    .max(150, "Customer name is too long."),

  mobile: z
    .string()
    .trim()
    .min(10, "Valid mobile number is required.")
    .max(20, "Mobile number is too long."),

  gstn: z.string().trim().max(20, "GSTN is too long.").optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    // ---------------------------------------------
    // AUTHENTICATION
    // ---------------------------------------------

    const auth = await requireAuth(request);

    await requireModuleAccess(auth, "TICKET_BOOKING");

    const adminId = getAdminId(auth);

    // ---------------------------------------------
    // REQUEST BODY
    // ---------------------------------------------

    const body = await request.json();

    const parsed = createCustomerSchema.safeParse(body);

    if (!parsed.success) {
      return failure(
        parsed.error.issues[0]?.message || "Invalid customer details.",
        400,
        "VALIDATION_ERROR",
      );
    }

    const name = parsed.data.name;

    const mobile = parsed.data.mobile;

    const gstn = parsed.data.gstn?.trim() || null;

    // ---------------------------------------------
    // CHECK EXISTING CUSTOMER
    // ---------------------------------------------

    const [existingCustomer] = await db
      .select({
        id: customers.id,
        name: customers.name,
        mobile: customers.mobile,
        gstn: customers.gstn,
        isDeleted: customers.isDeleted,
      })
      .from(customers)
      .where(and(eq(customers.adminId, adminId), eq(customers.mobile, mobile)))
      .limit(1);

    if (existingCustomer) {
      // -------------------------------------------
      // RESTORE SOFT-DELETED CUSTOMER
      // -------------------------------------------

      if (existingCustomer.isDeleted) {
        const [restoredCustomer] = await db
          .update(customers)
          .set({
            name,
            gstn,
            isDeleted: false,
            deletedAt: null,
            deletedBy: null,
            updatedAt: new Date(),
          })
          .where(eq(customers.id, existingCustomer.id))
          .returning({
            id: customers.id,
            name: customers.name,
            mobile: customers.mobile,
            gstn: customers.gstn,
            createdAt: customers.createdAt,
            updatedAt: customers.updatedAt,
          });

        return success(
          {
            customer: restoredCustomer,
          },
          200,
        );
      }

      return failure(
        "A customer with this mobile number already exists.",
        409,
        "CUSTOMER_ALREADY_EXISTS",
      );
    }

    // ---------------------------------------------
    // CREATE CUSTOMER
    // ---------------------------------------------

    const [customer] = await db
      .insert(customers)
      .values({
        adminId,

        name,

        mobile,

        gstn,
      })
      .returning({
        id: customers.id,
        name: customers.name,
        mobile: customers.mobile,
        gstn: customers.gstn,
        createdAt: customers.createdAt,
        updatedAt: customers.updatedAt,
      });

    // ---------------------------------------------
    // RESPONSE
    // ---------------------------------------------

    return success(
      {
        customer,
      },
      201,
    );
  } catch (error) {
    console.error("Create ticketing booking customer error:", error);

    // ---------------------------------------------
    // AUTH ERRORS
    // ---------------------------------------------

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return failure("Authentication required.", 401, "UNAUTHORIZED");
    }

    if (error instanceof Error && error.message === "ACCOUNT_NOT_ACTIVE") {
      return failure("Account is not active.", 403, "ACCOUNT_NOT_ACTIVE");
    }

    if (error instanceof Error && error.message === "FORBIDDEN") {
      return failure(
        "You do not have permission to access ticketing.",
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

    return failure("Unable to create customer.", 500, "INTERNAL_SERVER_ERROR");
  }
}
