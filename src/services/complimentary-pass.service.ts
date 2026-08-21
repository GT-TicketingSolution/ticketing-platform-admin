import { db } from "@/db";
import { complimentaryPasses, attractions, references } from "@/db/schema";

import { and, desc, eq, gte, ilike, lte, or } from "drizzle-orm";

// ======================================================
// GET COMPLIMENTARY PASSES
// ======================================================

export async function getComplimentaryPasses(params: {
  adminId: string;
  search?: string;
  attractionId?: string;
  fromDate?: string;
  toDate?: string;
  status?: "ACTIVE" | "USED" | "EXPIRED";
  page: number;
  limit: number;
}) {
  const {
    adminId,
    search,
    attractionId,
    fromDate,
    toDate,
    status,
    page,
    limit,
  } = params;

  const offset = (page - 1) * limit;

  const items = await db
    .select({
      id: complimentaryPasses.id,
      passId: complimentaryPasses.passId,

      adminId: complimentaryPasses.adminId,

      visitorName: complimentaryPasses.visitorName,

      mobile: complimentaryPasses.mobile,

      attractionId: complimentaryPasses.attractionId,

      attractionName: attractions.name,

      visitors: complimentaryPasses.visitors,

      referenceId: complimentaryPasses.referenceId,

      referenceName: references.referenceName,

      status: complimentaryPasses.status,

      visitDate: complimentaryPasses.visitDate,

      deletedAt: complimentaryPasses.deletedAt,

      deletedBy: complimentaryPasses.deletedBy,

      isDeleted: complimentaryPasses.isDeleted,

      createdAt: complimentaryPasses.createdAt,

      updatedAt: complimentaryPasses.updatedAt,
    })
    .from(complimentaryPasses)

    .leftJoin(attractions, eq(complimentaryPasses.attractionId, attractions.id))

    .leftJoin(references, eq(complimentaryPasses.referenceId, references.id))

    .where(
      and(
        eq(complimentaryPasses.adminId, adminId),

        eq(complimentaryPasses.isDeleted, false),

        search
          ? or(
              ilike(complimentaryPasses.visitorName, `%${search}%`),

              ilike(complimentaryPasses.mobile, `%${search}%`),

              ilike(references.referenceName, `%${search}%`),
            )
          : undefined,

        attractionId
          ? eq(complimentaryPasses.attractionId, attractionId)
          : undefined,

        fromDate ? gte(complimentaryPasses.visitDate, fromDate) : undefined,

        toDate ? lte(complimentaryPasses.visitDate, toDate) : undefined,

        status ? eq(complimentaryPasses.status, status) : undefined,
      ),
    )

    .orderBy(desc(complimentaryPasses.createdAt))

    .limit(limit)

    .offset(offset);

  return {
    items,

    pagination: {
      page,
      limit,
      hasNextPage: items.length === limit,
    },
  };
}

// ======================================================
// CREATE COMPLIMENTARY PASS
// ======================================================

export async function createComplimentaryPass(
  adminId: string,
  data: {
    visitorName: string;
    mobile: string;
    attractionId: string;
    visitors: number;
    referenceId: string;
    visitDate: string;
    status: "ACTIVE" | "USED" | "EXPIRED";
  },
) {
  const passId = `CP-${new Date().getFullYear()}-${Date.now()
    .toString()
    .slice(-6)}`;

  const result = await db
    .insert(complimentaryPasses)
    .values({
      adminId,

      passId,

      visitorName: data.visitorName,

      mobile: data.mobile,

      attractionId: data.attractionId,

      visitors: data.visitors,

      referenceId: data.referenceId,

      visitDate: data.visitDate,

      status: data.status,
    })
    .returning();

  return result[0];
}

// ======================================================
// UPDATE COMPLIMENTARY PASS
// ======================================================

export async function updateComplimentaryPass(
  id: string,
  data: {
    visitorName: string;
    mobile: string;
    attractionId: string;
    visitors: number;
    referenceId: string;
    visitDate: string;
    status: "ACTIVE" | "USED" | "EXPIRED";
  },
) {
  const result = await db
    .update(complimentaryPasses)
    .set({
      visitorName: data.visitorName,

      mobile: data.mobile,

      attractionId: data.attractionId,

      visitors: data.visitors,

      referenceId: data.referenceId,

      visitDate: data.visitDate,

      status: data.status,

      updatedAt: new Date(),
    })
    .where(eq(complimentaryPasses.id, id))
    .returning();

  return result[0];
}

// ======================================================
// SOFT DELETE COMPLIMENTARY PASS
// ======================================================

export async function deleteComplimentaryPass(id: string, userId: string) {
  await db
    .update(complimentaryPasses)
    .set({
      deletedAt: new Date(),

      deletedBy: userId,

      isDeleted: true,

      updatedAt: new Date(),
    })
    .where(eq(complimentaryPasses.id, id));
}
