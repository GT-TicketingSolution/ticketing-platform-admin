import { db } from "@/db";

import { references } from "@/db/schema";

import { and, eq, or, ilike, desc } from "drizzle-orm";

export async function getReferences({
  adminId,
  search,
  page = 1,
  limit = 10,
}: {
  adminId: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const offset = (page - 1) * limit;

  const conditions = [
    eq(references.adminId, adminId),

    eq(references.isDeleted, false),
  ];

  if (search) {
    conditions.push(
      or(
        ilike(references.referenceName, `%${search}%`),

        ilike(references.contactPerson, `%${search}%`),

        ilike(references.mobile, `%${search}%`),
      )!,
    );
  }

  const data = await db.query.references.findMany({
    where: and(...conditions),

    limit,

    offset,

    orderBy: desc(references.createdAt),
  });

  return {
    data,

    page,

    limit,
  };
}

export async function createReference(
  adminId: string,
  data: {
    referenceName: string;
    department?: string;
    contactPerson: string;
    post?: string;
    mobile: string;
  },
) {
  const existing = await db.query.references.findFirst({
    where: and(
      eq(references.adminId, adminId),

      eq(references.mobile, data.mobile),

      eq(references.isDeleted, false),
    ),
  });

  if (existing) {
    throw new Error("REFERENCE_ALREADY_EXISTS");
  }

  const created = await db
    .insert(references)
    .values({
      adminId,

      referenceName: data.referenceName,

      department: data.department,

      contactPerson: data.contactPerson,

      post: data.post,

      mobile: data.mobile,
    })
    .returning();

  return created[0];
}
