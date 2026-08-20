import { db } from "@/db";

import { attractionManagement } from "@/db/schema";

import { success, failure } from "@/lib/api/response";

import { requireAuth } from "@/lib/auth/require-auth";

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);

    if (auth.user.role !== "ADMIN") {
      return failure("Only admin can bulk upload", 403, "FORBIDDEN");
    }

    const body = await request.json();

    if (!Array.isArray(body)) {
      return failure("Invalid bulk data", 400, "VALIDATION_ERROR");
    }

    const data = body.map((item) => ({
      adminId: auth.user.id,

      attractionId: item.attractionId,

      image: item.image ?? null,

      description: item.description ?? null,

      timing: item.timing ?? null,

      adultPrice: item.adultPrice ?? 0,

      childPrice: item.childPrice ?? 0,

      studentPrice: item.studentPrice ?? 0,

      seniorPrice: item.seniorPrice ?? 0,

      foreignerPrice: item.foreignerPrice ?? 0,

      hasSeating: item.hasSeating ?? false,
    }));

    const inserted = await db
      .insert(attractionManagement)
      .values(data)
      .onConflictDoNothing({
        target: [
          attractionManagement.adminId,
          attractionManagement.attractionId,
        ],
      })
      .returning();

    return success({
      message: `${inserted.length} attractions uploaded successfully`,

      data: inserted,
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
