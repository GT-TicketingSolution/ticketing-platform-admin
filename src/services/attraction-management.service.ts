import { db } from "@/db";
import { attractions, attractionManagement } from "@/db/schema";

import { eq, and, ilike } from "drizzle-orm";

export async function getAttractionManagementService(
  adminId: string,
  search?: string,
) {
  const conditions = [eq(attractionManagement.adminId, adminId)];

  if (search) {
    conditions.push(ilike(attractions.name, `%${search}%`));
  }

  const data = await db
    .select({
      id: attractionManagement.id,

      attractionId: attractions.id,

      name: attractions.name,

      type: attractions.type,

      status: attractions.status,

      image: attractionManagement.image,

      description: attractionManagement.description,

      timing: attractionManagement.timing,

      pricing: {
        adult: attractionManagement.adultPrice,

        child: attractionManagement.childPrice,

        student: attractionManagement.studentPrice,

        senior: attractionManagement.seniorPrice,

        foreigner: attractionManagement.foreignerPrice,
      },

      hasSeating: attractionManagement.hasSeating,

      seatLayoutId: attractionManagement.seatLayoutId,
    })

    .from(attractionManagement)

    .innerJoin(
      attractions,
      eq(attractionManagement.attractionId, attractions.id),
    )

    .where(and(...conditions));

  return data;
}
