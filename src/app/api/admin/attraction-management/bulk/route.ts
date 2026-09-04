import { db } from "@/db";
import { attractions, attractionManagement } from "@/db/schema";
import { success, failure } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireModuleAccess } from "@/lib/auth/authorization";
import { eq, and } from "drizzle-orm";

const MAX_RECORDS = 500;

const REQUIRED_FIELDS = [
  "name",
  "type",
  "image",
  "description",
  "timing",
  "adultPrice",
  "childPrice",
  "studentPrice",
  "seniorPrice",
  "foreignerPrice",
  "hasSeating",
];

export async function POST(request: Request) {
  try {
    // ==========================================
    // AUTHENTICATION
    // ==========================================

    const auth = await requireAuth(request);

    if (auth.user.role !== "ADMIN") {
      return failure("Only admin can bulk upload", 403, "FORBIDDEN");
    }

    await requireModuleAccess(auth, "ATTRACTION_MANAGEMENT");

    // ==========================================
    // PARSE JSON
    // ==========================================

    const body = await request.json();

    // ==========================================
    // VALIDATE ARRAY
    // ==========================================

    if (!Array.isArray(body) || body.length === 0) {
      return failure(
        "Invalid bulk data. Expected a non-empty array.",
        400,
        "VALIDATION_ERROR",
      );
    }

    // ==========================================
    // MAX 500 RECORDS
    // ==========================================

    if (body.length > MAX_RECORDS) {
      return failure(
        `Maximum ${MAX_RECORDS} records can be uploaded at a time.`,
        400,
        "VALIDATION_ERROR",
      );
    }

    // ==========================================
    // VALIDATE REQUIRED COLUMNS
    // ==========================================

    for (let index = 0; index < body.length; index++) {
      const item = body[index];

      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return failure(
          `Invalid data at row ${index + 1}.`,
          400,
          "VALIDATION_ERROR",
        );
      }

      for (const field of REQUIRED_FIELDS) {
        if (!(field in item)) {
          return failure(
            `Missing required column "${field}" at row ${index + 1}.`,
            400,
            "VALIDATION_ERROR",
          );
        }
      }
    }

    // ==========================================
    // VALIDATE REQUIRED VALUES
    // ==========================================

    for (let index = 0; index < body.length; index++) {
      const item = body[index];

      if (typeof item.name !== "string" || item.name.trim() === "") {
        return failure(
          `Attraction name is required at row ${index + 1}.`,
          400,
          "VALIDATION_ERROR",
        );
      }

      if (typeof item.type !== "string" || item.type.trim() === "") {
        return failure(
          `Attraction type is required at row ${index + 1}.`,
          400,
          "VALIDATION_ERROR",
        );
      }
    }

    // ==========================================
    // PROCESS RECORDS
    // ==========================================

    const results = [];

    for (const item of body) {
      const attractionName = item.name.trim();

      // ==========================================
      // FIND EXISTING ATTRACTION
      // ==========================================

      const existingAttraction = await db
        .select({
          id: attractions.id,
          name: attractions.name,
        })
        .from(attractions)
        .where(
          and(
            eq(attractions.name, attractionName),
            eq(attractions.adminId, auth.user.id),
          ),
        )
        .limit(1);

      let attractionRecord;

      // ==========================================
      // CREATE OR UPDATE ATTRACTION
      // ==========================================

      if (existingAttraction.length > 0) {
        // Existing attraction → UPDATE
        const updated = await db
          .update(attractions)
          .set({
            name: attractionName,
            type: item.type,
          })
          .where(
            and(
              eq(attractions.id, existingAttraction[0].id),
              eq(attractions.adminId, auth.user.id),
            ),
          )
          .returning({
            id: attractions.id,
            name: attractions.name,
          });

        attractionRecord = updated[0];
      } else {
        // New attraction → CREATE
        const created = await db
          .insert(attractions)
          .values({
            adminId: auth.user.id,
            name: attractionName,
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
      // CHECK EXISTING MANAGEMENT RECORD
      // ==========================================

      const existingManagement = await db
        .select({
          id: attractionManagement.id,
        })
        .from(attractionManagement)
        .where(
          and(
            eq(attractionManagement.adminId, auth.user.id),
            eq(attractionManagement.attractionId, attractionId),
          ),
        )
        .limit(1);

      let managementRecord;

      // ==========================================
      // CREATE OR UPDATE MANAGEMENT
      // ==========================================

      if (existingManagement.length > 0) {
        // Existing management → UPDATE

        const updated = await db
          .update(attractionManagement)
          .set({
            image: item.image ?? null,
            description: item.description ?? null,
            timing: item.timing ?? null,
            // adultPrice: item.adultPrice ?? 0,
            // childPrice: item.childPrice ?? 0,
            // studentPrice: item.studentPrice ?? 0,
            // seniorPrice: item.seniorPrice ?? 0,
            // foreignerPrice: item.foreignerPrice ?? 0,
            hasSeating: item.hasSeating ?? false,
          })
          .where(
            and(
              eq(attractionManagement.id, existingManagement[0].id),
              eq(attractionManagement.adminId, auth.user.id),
              eq(attractionManagement.attractionId, attractionId),
            ),
          )
          .returning();

        managementRecord = updated[0];
      } else {
        // No management record → CREATE

        const inserted = await db
          .insert(attractionManagement)
          .values({
            adminId: auth.user.id,
            attractionId,

            image: item.image ?? null,
            description: item.description ?? null,
            timing: item.timing ?? null,

            // adultPrice: item.adultPrice ?? 0,
            // childPrice: item.childPrice ?? 0,
            // studentPrice: item.studentPrice ?? 0,
            // seniorPrice: item.seniorPrice ?? 0,
            // foreignerPrice: item.foreignerPrice ?? 0,

            hasSeating: item.hasSeating ?? false,
          })
          .returning();

        managementRecord = inserted[0];
      }

      // ==========================================
      // RESULT
      // ==========================================

      results.push({
        attraction: attractionRecord,
        management: managementRecord,
      });
    }

    // ==========================================
    // RESPONSE
    // ==========================================

    return success({
      message: `${results.length} attractions uploaded successfully`,
      data: results,
    });
  } catch (error) {
    console.error("Bulk upload error:", error);

    // ==========================================
    // AUTHENTICATION ERROR
    // ==========================================

    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return failure("Authentication required.", 401, "UNAUTHORIZED");
      }

      // ==========================================
      // ACCOUNT STATUS ERROR
      // ==========================================

      if (error.message === "ACCOUNT_NOT_ACTIVE") {
        return failure("Account is not active.", 403, "ACCOUNT_NOT_ACTIVE");
      }

      // ==========================================
      // MODULE / ROLE AUTHORIZATION ERROR
      // ==========================================

      if (error.message === "FORBIDDEN") {
        return failure(
          "You are not authorized to access attraction management.",
          403,
          "FORBIDDEN",
        );
      }
    }

    // ==========================================
    // INTERNAL SERVER ERROR
    // ==========================================

    return failure(
      "Unable to bulk upload attractions.",
      500,
      "INTERNAL_SERVER_ERROR",
    );
  }
}
