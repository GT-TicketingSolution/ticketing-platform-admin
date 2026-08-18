import { db } from "@/db";
import { complimentaryPasses } from "@/db/schema";
import { and, eq, ilike } from "drizzle-orm";

// GET PASSES

export async function getComplimentaryPasses(params: {
  adminId: string;
  search?: string;
  attractionId?: string;
  fromDate?: string;
  toDate?: string;
  page: number;
  limit: number;
}) {
  const { adminId, search, attractionId, fromDate, toDate, page, limit } =
    params;

  const offset = (page - 1) * limit;

  return db.query.complimentaryPasses.findMany({
    where: and(
      eq(complimentaryPasses.adminId, adminId),

      eq(complimentaryPasses.isDeleted, false),

      search
        ? ilike(complimentaryPasses.visitorName, `%${search}%`)
        : undefined,

      attractionId
        ? eq(complimentaryPasses.attractionId, attractionId)
        : undefined,
    ),

    limit,

    offset,

    with: {
      attraction: true,
      reference: true,
    },
  });
}

// CREATE PASS

export async function createComplimentaryPass(adminId: string, data: any) {
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
    })
    .returning();

  return result[0];
}

// UPDATE PASS

export async function updateComplimentaryPass(id: string, data: any) {
  const result = await db
    .update(complimentaryPasses)
    .set({
      visitorName: data.visitorName,

      mobile: data.mobile,

      attractionId: data.attractionId,

      visitors: data.visitors,

      referenceId: data.referenceId,

      visitDate: data.visitDate,

      updatedAt: new Date(),
    })
    .where(eq(complimentaryPasses.id, id))
    .returning();

  return result[0];
}

// SOFT DELETE

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
