import { db } from "@/db";
import { attractions, attractionManagement } from "@/db/schema";

import { success, failure } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/require-auth";

import { eq, and } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);

    if (auth.user.role !== "ADMIN") {
      return failure("Only admin can bulk upload", 403, "FORBIDDEN");
    }

    const body = await request.json();

    if (!Array.isArray(body) || body.length === 0) {
      return failure("Invalid bulk data", 400, "VALIDATION_ERROR");
    }

    const results = [];

    for (const item of body) {
      // ==========================================
      // VALIDATE ATTRACTION NAME
      // ==========================================

      if (!item.name) {
        return failure("Attraction name is required", 400, "VALIDATION_ERROR");
      }

      // ==========================================
      // FIND ATTRACTION BY NAME
      // ==========================================

      // ==========================================
      // FIND OR CREATE ATTRACTION
      // ==========================================

      let attraction = await db
        .select({
          id: attractions.id,
          name: attractions.name,
        })
        .from(attractions)
        .where(
          and(
            eq(attractions.name, item.name),
            eq(attractions.adminId, auth.user.id),
          ),
        )
        .limit(1);

      let attractionRecord;

      if (attraction.length > 0) {
        // Attraction already exists
        attractionRecord = attraction[0];
      } else {
        // Attraction doesn't exist → create it
        const created = await db
          .insert(attractions)
          .values({
            adminId: auth.user.id,
            name: item.name,
            type: item.type,
          })
          .returning({
            id: attractions.id,
            name: attractions.name,
          });

        attractionRecord = created[0];
      }

      const attractionId = attractionRecord.id;

      // ==========================================
      // INSERT MANAGEMENT DETAILS
      // ==========================================

      const inserted = await db
        .insert(attractionManagement)
        .values({
          adminId: auth.user.id,

          attractionId,

          image: item.image ?? null,

          description: item.description ?? null,

          timing: item.timing ?? null,

          adultPrice: item.adultPrice ?? 0,

          childPrice: item.childPrice ?? 0,

          studentPrice: item.studentPrice ?? 0,

          seniorPrice: item.seniorPrice ?? 0,

          foreignerPrice: item.foreignerPrice ?? 0,

          hasSeating: item.hasSeating ?? false,
        })
        .onConflictDoNothing({
          target: [
            attractionManagement.adminId,
            attractionManagement.attractionId,
          ],
        })
        .returning();

      if (inserted.length > 0) {
        results.push({
          attraction: attraction[0],
          management: inserted[0],
        });
      }
    }

    return success({
      message: `${results.length} attractions uploaded successfully`,
      data: results,
    });
  } catch (error) {
    console.error("Bulk upload error:", error);

    return failure(
      "Unable to bulk upload attractions",
      500,
      "INTERNAL_SERVER_ERROR",
    );
  }
}
