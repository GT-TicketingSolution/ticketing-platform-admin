import { and, eq, ilike, isNull, count, desc } from "drizzle-orm";

import { db } from "@/db";
import { customers } from "@/db/schema";

// =====================================================
// GET CUSTOMERS
// =====================================================

export async function getCustomers({
  adminId,
  page = 1,
  limit = 10,
  search,
}: {
  adminId: string;
  page?: number;
  limit?: number;
  search?: string;
}) {
  const offset = (page - 1) * limit;

  const conditions = [
    eq(customers.adminId, adminId),
    eq(customers.isDeleted, false),
  ];

  if (search) {
    conditions.push(ilike(customers.name, `%${search}%`));
  }

  const data = await db
    .select({
      id: customers.id,
      name: customers.name,
      mobile: customers.mobile,
      gstn: customers.gstn,
      createdAt: customers.createdAt,
    })
    .from(customers)
    .where(and(...conditions))
    .orderBy(desc(customers.createdAt))
    .limit(limit)
    .offset(offset);

  const totalResult = await db
    .select({
      count: count(customers.id),
    })
    .from(customers)
    .where(and(...conditions));

  const total = Number(totalResult[0]?.count ?? 0);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// =====================================================
// CREATE CUSTOMER
// =====================================================

export async function createCustomer(
  adminId: string,
  data: {
    name: string;
    mobile: string;
    gstn?: string;
  },
) {
  const existing = await db.query.customers.findFirst({
    where: and(
      eq(customers.adminId, adminId),

      eq(customers.mobile, data.mobile),

      eq(customers.isDeleted, false),
    ),
  });

  if (existing) {
    throw new Error("CUSTOMER_ALREADY_EXISTS");
  }

  const created = await db
    .insert(customers)
    .values({
      adminId,

      name: data.name,

      mobile: data.mobile,

      gstn: data.gstn,
    })
    .returning();

  return created[0];
}

// =====================================================
// UPDATE CUSTOMER
// =====================================================

export async function updateCustomer(
  adminId: string,
  id: string,
  data: {
    name: string;
    mobile: string;
    gstn?: string;
  },
) {
  const existing = await db.query.customers.findFirst({
    where: and(
      eq(customers.id, id),

      eq(customers.adminId, adminId),

      eq(customers.isDeleted, false),
    ),
  });

  if (!existing) {
    throw new Error("CUSTOMER_NOT_FOUND");
  }

  const updated = await db
    .update(customers)
    .set({
      name: data.name,

      mobile: data.mobile,

      gstn: data.gstn,

      updatedAt: new Date(),
    })
    .where(eq(customers.id, id))
    .returning();

  return updated[0];
}

// =====================================================
// SOFT DELETE CUSTOMER
// =====================================================

export async function deleteCustomer(
  adminId: string,
  id: string,
  deletedBy: string,
) {
  const existing = await db.query.customers.findFirst({
    where: and(
      eq(customers.id, id),

      eq(customers.adminId, adminId),

      eq(customers.isDeleted, false),
    ),
  });

  if (!existing) {
    throw new Error("CUSTOMER_NOT_FOUND");
  }

  await db
    .update(customers)
    .set({
      isDeleted: true,

      deletedAt: new Date(),

      deletedBy,

      updatedAt: new Date(),
    })
    .where(eq(customers.id, id));

  return true;
}
