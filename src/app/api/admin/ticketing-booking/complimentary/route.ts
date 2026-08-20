import { NextRequest } from "next/server";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";

import { complimentaryPasses, attractions, references } from "@/db/schema";

import { requireAuth } from "@/lib/auth/require-auth";

import {
  requireModuleAccess,
  requireAttractionAccess,
  getAdminId,
} from "@/lib/auth/authorization";

import { success, failure } from "@/lib/api/response";

export async function POST(request: NextRequest) {
  try {
    // --------------------------------------------------
    // AUTH
    // --------------------------------------------------

    const auth = await requireAuth(request);

    await requireModuleAccess(auth, "BOOKINGS");

    const adminId = getAdminId(auth);

    // --------------------------------------------------
    // BODY
    // --------------------------------------------------

    const body = await request.json();

    const {
      passNo,
      visitorName,
      mobile,
      attractionId,
      visitors,
      referenceId,
      visitDate,
    } = body;

    // --------------------------------------------------
    // VALIDATION
    // --------------------------------------------------

    if (!passNo || typeof passNo !== "string" || !passNo.trim()) {
      return failure("Pass number is required.", 400, "PASS_NUMBER_REQUIRED");
    }

    if (
      !visitorName ||
      typeof visitorName !== "string" ||
      !visitorName.trim()
    ) {
      return failure("Visitor name is required.", 400, "VISITOR_NAME_REQUIRED");
    }

    if (!mobile || typeof mobile !== "string" || !mobile.trim()) {
      return failure(
        "Mobile number is required.",
        400,
        "MOBILE_NUMBER_REQUIRED",
      );
    }

    if (!attractionId) {
      return failure("Attraction is required.", 400, "ATTRACTION_ID_REQUIRED");
    }

    if (!visitDate) {
      return failure("Visit date is required.", 400, "VISIT_DATE_REQUIRED");
    }

    const visitorCount = Number(visitors);

    if (!Number.isInteger(visitorCount) || visitorCount <= 0) {
      return failure(
        "Visitors must be a positive integer.",
        400,
        "INVALID_VISITOR_COUNT",
      );
    }

    // --------------------------------------------------
    // ATTRACTION ACCESS
    // --------------------------------------------------

    try {
      await requireAttractionAccess(auth, attractionId);
    } catch (error) {
      if (error instanceof Error && error.message === "FORBIDDEN") {
        return failure(
          "Attraction not found or access denied.",
          404,
          "ATTRACTION_NOT_FOUND",
        );
      }

      throw error;
    }

    // --------------------------------------------------
    // VERIFY ATTRACTION
    // --------------------------------------------------

    const [attraction] = await db
      .select({
        id: attractions.id,
        name: attractions.name,
      })
      .from(attractions)
      .where(
        and(
          eq(attractions.id, attractionId),
          eq(attractions.adminId, adminId),
          eq(attractions.status, "ACTIVE"),
        ),
      )
      .limit(1);

    if (!attraction) {
      return failure(
        "Attraction not found or access denied.",
        404,
        "ATTRACTION_NOT_FOUND",
      );
    }

    // --------------------------------------------------
    // VERIFY REFERENCE
    // --------------------------------------------------

    if (referenceId) {
      const [reference] = await db
        .select({
          id: references.id,
        })
        .from(references)
        .where(
          and(
            eq(references.id, referenceId),
            eq(references.adminId, adminId),
            eq(references.status, "ACTIVE"),
            eq(references.isDeleted, false),
          ),
        )
        .limit(1);

      if (!reference) {
        return failure(
          "Reference not found or inactive.",
          404,
          "REFERENCE_NOT_FOUND",
        );
      }
    }

    // --------------------------------------------------
    // CHECK PASS NUMBER
    // --------------------------------------------------

    const [existingPass] = await db
      .select({
        id: complimentaryPasses.id,
      })
      .from(complimentaryPasses)
      .where(
        and(
          eq(complimentaryPasses.passId, passNo.trim()),
          eq(complimentaryPasses.adminId, adminId),
          eq(complimentaryPasses.isDeleted, false),
        ),
      )
      .limit(1);

    if (existingPass) {
      return failure(
        "Complimentary pass number already exists.",
        409,
        "PASS_NUMBER_EXISTS",
      );
    }

    // --------------------------------------------------
    // CREATE COMPLIMENTARY PASS
    // --------------------------------------------------

    const [pass] = await db
      .insert(complimentaryPasses)
      .values({
        adminId,

        passId: passNo.trim(),

        visitorName: visitorName.trim(),

        mobile: mobile.trim(),

        attractionId,

        visitors: visitorCount,

        referenceId: referenceId || null,

        status: "ACTIVE",

        visitDate,

        updatedAt: new Date(),
      })
      .returning();

    if (!pass) {
      return failure(
        "Unable to create complimentary pass.",
        500,
        "COMPLIMENTARY_PASS_CREATE_FAILED",
      );
    }

    // --------------------------------------------------
    // RESPONSE
    // --------------------------------------------------

    return success(
      {
        complimentaryPass: {
          id: pass.id,

          passNo: pass.passId,

          visitorName: pass.visitorName,

          mobile: pass.mobile,

          attraction: {
            id: attraction.id,
            name: attraction.name,
          },

          visitors: pass.visitors,

          referenceId: pass.referenceId,

          status: pass.status,

          visitDate: pass.visitDate,

          createdAt: pass.createdAt,
        },
      },
      201,
    );
  } catch (error) {
    console.error("Create complimentary ticket error:", error);

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return failure("Authentication required.", 401, "UNAUTHORIZED");
    }

    if (error instanceof Error && error.message === "ACCOUNT_NOT_ACTIVE") {
      return failure("Account is not active.", 403, "ACCOUNT_NOT_ACTIVE");
    }

    if (error instanceof Error && error.message === "FORBIDDEN") {
      return failure(
        "You do not have permission to create complimentary tickets.",
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

    return failure(
      "Unable to create complimentary ticket.",
      500,
      "INTERNAL_SERVER_ERROR",
    );
  }
}
