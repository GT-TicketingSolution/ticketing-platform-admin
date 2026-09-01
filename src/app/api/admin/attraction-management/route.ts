// import { eq, inArray } from "drizzle-orm";

// import { db } from "@/db";
// import {
//   attractions,
//   attractionManagement,
//   attractionManagementSeatLayouts,
//   seatLayouts,
//   attractionSeats,
//   seatLayoutSeats,
// } from "@/db/schema";

// import { success, failure } from "@/lib/api/response";
// import { requireAuth } from "@/lib/auth/require-auth";
// import {
//   requireModuleAccess,
//   getAccessibleAttractionIds,
// } from "@/lib/auth/authorization";
// import {
//   getLegacySeatLayoutId,
//   expandSeatLayoutIds,
//   listTimeSlotsByAttractionIds,
//   parseCategorySeatCounts,
//   parseTimeSlotsPayload,
//   replaceAttractionSeatLayouts,
//   resolveSeatLayoutIds,
//   syncAttractionTimeSlots,
//   validateSeatLayoutsForAdmin,
// } from "@/services/attraction-management.service";

// // =====================================================
// // GET ALL ATTRACTIONS
// // =====================================================

// export async function GET(request: Request) {
//   try {
//     const auth = await requireAuth(request);

//     let managementData;

//     await requireModuleAccess(auth, "ATTRACTION_MANAGEMENT");

//     // =====================================================
//     // ADMIN
//     // =====================================================

//     if (auth.user.role === "ADMIN") {
//       managementData = await db
//         .select({
//           id: attractionManagement.id,

//           attractionId: attractions.id,

//           name: attractions.name,

//           category: attractions.type,

//           image: attractionManagement.image,

//           timing: attractionManagement.timing,

//           duration: attractionManagement.duration,

//           durationUnit: attractionManagement.durationUnit,

//           pricing: {
//             adult: attractionManagement.adultPrice,

//             child: attractionManagement.childPrice,

//             student: attractionManagement.studentPrice,

//             senior: attractionManagement.seniorPrice,

//             foreigner: attractionManagement.foreignerPrice,
//           },

//           seating: {
//             adult: attractionManagement.adultSeats,

//             child: attractionManagement.childSeats,

//             student: attractionManagement.studentSeats,

//             senior: attractionManagement.seniorSeats,

//             foreigner: attractionManagement.foreignerSeats,
//           },

//           hasSeating: attractionManagement.hasSeating,

//           description: attractionManagement.description,

//           status: attractions.status,

//           // Existing legacy column
//           seatLayoutId: attractionManagement.seatLayoutId,
//         })
//         .from(attractionManagement)
//         .innerJoin(
//           attractions,
//           eq(attractionManagement.attractionId, attractions.id),
//         )
//         .where(eq(attractionManagement.adminId, auth.user.id));
//     }

//     // =====================================================
//     // MANAGER / STAFF
//     // =====================================================
//     else {
//       const allowedIds = await getAccessibleAttractionIds(auth);

//       if (!allowedIds.length) {
//         return success([]);
//       }

//       managementData = await db
//         .select({
//           id: attractionManagement.id,

//           attractionId: attractions.id,

//           name: attractions.name,

//           category: attractions.type,

//           image: attractionManagement.image,

//           timing: attractionManagement.timing,

//           duration: attractionManagement.duration,

//           durationUnit: attractionManagement.durationUnit,

//           pricing: {
//             adult: attractionManagement.adultPrice,

//             child: attractionManagement.childPrice,

//             student: attractionManagement.studentPrice,

//             senior: attractionManagement.seniorPrice,

//             foreigner: attractionManagement.foreignerPrice,
//           },

//           seating: {
//             adult: attractionManagement.adultSeats,

//             child: attractionManagement.childSeats,

//             student: attractionManagement.studentSeats,

//             senior: attractionManagement.seniorSeats,

//             foreigner: attractionManagement.foreignerSeats,
//           },

//           hasSeating: attractionManagement.hasSeating,

//           description: attractionManagement.description,

//           status: attractions.status,

//           // Existing legacy column
//           seatLayoutId: attractionManagement.seatLayoutId,
//         })
//         .from(attractionManagement)
//         .innerJoin(
//           attractions,
//           eq(attractionManagement.attractionId, attractions.id),
//         )
//         .where(inArray(attractionManagement.attractionId, allowedIds));
//     }

//     // =====================================================
//     // NO DATA
//     // =====================================================

//     if (!managementData.length) {
//       return success([]);
//     }

//     // =====================================================
//     // GET ALL SEAT LAYOUT MAPPINGS
//     // =====================================================

//     const managementIds = managementData.map((item) => item.id);
//     const attractionIds = managementData.map((item) => item.attractionId);

//     const seatLayoutMappings = await db
//       .select({
//         attractionManagementId:
//           attractionManagementSeatLayouts.attractionManagementId,

//         seatLayoutId: attractionManagementSeatLayouts.seatLayoutId,

//         quantity: attractionManagementSeatLayouts.quantity,

//         seatLayout: seatLayouts,
//       })
//       .from(attractionManagementSeatLayouts)
//       .innerJoin(
//         seatLayouts,
//         eq(attractionManagementSeatLayouts.seatLayoutId, seatLayouts.id),
//       )
//       .where(
//         inArray(
//           attractionManagementSeatLayouts.attractionManagementId,
//           managementIds,
//         ),
//       );

//     // =====================================================
//     // GROUP SEAT LAYOUTS BY ATTRACTION
//     // =====================================================

//     const seatLayoutsByManagementId = new Map<
//       string,
//       typeof seatLayoutMappings
//     >();

//     for (const mapping of seatLayoutMappings) {
//       const existing =
//         seatLayoutsByManagementId.get(mapping.attractionManagementId) ?? [];

//       existing.push(mapping);

//       seatLayoutsByManagementId.set(mapping.attractionManagementId, existing);
//     }

//     // =====================================================
//     // TIME SLOTS (per attraction; each has its own isActive)
//     // =====================================================

//     const timeSlotsByAttractionId = await listTimeSlotsByAttractionIds(
//       db,
//       attractionIds,
//     );

//     // =====================================================
//     // FINAL RESPONSE
//     // =====================================================

//     const result = managementData.map((item) => {
//       const mappings = seatLayoutsByManagementId.get(item.id) ?? [];

//       const seatLayoutIds = expandSeatLayoutIds(
//         mappings.map((mapping) => ({
//           seatLayoutId: mapping.seatLayoutId,
//           quantity: mapping.quantity ?? 1,
//         })),
//       );

//       return {
//         ...item,

//         // Unique layouts with quantity (for APIs / future FE)
//         seatLayouts: mappings.map((mapping) => ({
//           ...mapping.seatLayout,
//           quantity: mapping.quantity ?? 1,
//         })),

//         // Expanded IDs for chip hydrate (same layout may appear N times)
//         seatLayoutIds,

//         timeSlots: timeSlotsByAttractionId.get(item.attractionId) ?? [],
//       };
//     });

//     return success(result);
//   } catch (error) {
//     console.error("Get attraction management error:", error);

//     if (error instanceof Error) {
//       // Authentication
//       if (error.message === "UNAUTHORIZED") {
//         return failure("Authentication required.", 401, "UNAUTHORIZED");
//       }

//       // Account disabled/inactive
//       if (error.message === "ACCOUNT_NOT_ACTIVE") {
//         return failure("Account is not active.", 403, "ACCOUNT_NOT_ACTIVE");
//       }

//       // Module permission / authorization
//       if (error.message === "FORBIDDEN") {
//         return failure(
//           "You are not authorized to access attraction management.",
//           403,
//           "FORBIDDEN",
//         );
//       }
//     }

//     return failure(
//       "Unable to fetch attractions.",
//       500,
//       "INTERNAL_SERVER_ERROR",
//     );
//   }
// }

// // =====================================================
// // CREATE ATTRACTION
// // =====================================================

// // export async function POST(request: Request) {
// //   try {
// //     const auth = await requireAuth(request);

// //     await requireModuleAccess(auth, "ATTRACTION_MANAGEMENT");

// //     if (auth.user.role !== "ADMIN") {
// //       return failure("Only admin can create attraction", 403, "FORBIDDEN");
// //     }

// //     const body = await request.json();

// //     const {
// //       name,
// //       category,
// //       image,
// //       description,
// //       timing,

// //       duration,
// //       durationUnit,

// //       adultPrice = 0,
// //       childPrice = 0,
// //       studentPrice = 0,
// //       seniorPrice = 0,
// //       foreignerPrice = 0,

// //       hasSeating = false,

// //       seatLayoutIds,
// //     } = body;

// //     // ======================================
// //     // VALIDATION
// //     // ======================================

// //     if (!name || !category) {
// //       return failure("Name and category are required", 400, "VALIDATION_ERROR");
// //     }

// //     const resolvedSeatLayouts = resolveSeatLayoutIds({
// //       hasSeating: true,
// //       seatLayoutIds,
// //     });

// //     if (!resolvedSeatLayouts.ok) {
// //       return failure(
// //         resolvedSeatLayouts.message ===
// //           "At least one seat layout is required when seating is enabled"
// //           ? "Seat allocation is required. Select at least one seat layout."
// //           : resolvedSeatLayouts.message,
// //         400,
// //         "VALIDATION_ERROR",
// //       );
// //     }

// //     const seatCounts = parseCategorySeatCounts(body, { required: true });

// //     if (!seatCounts.ok) {
// //       return failure(seatCounts.message, 400, "VALIDATION_ERROR");
// //     }

// //     const timeSlotsParsed = parseTimeSlotsPayload(body);

// //     if (!timeSlotsParsed.ok) {
// //       return failure(timeSlotsParsed.message, 400, "VALIDATION_ERROR");
// //     }

// //     const seatLayoutOwnership = await validateSeatLayoutsForAdmin(
// //       db,
// //       auth.user.id,
// //       resolvedSeatLayouts.uniqueIds,
// //     );

// //     if (!seatLayoutOwnership.ok) {
// //       return failure(seatLayoutOwnership.message, 400, "VALIDATION_ERROR");
// //     }

// //     // ======================================
// //     // TRANSACTION
// //     // ======================================

// //     const result = await db.transaction(async (tx) => {
// //       // ======================================
// //       // CREATE MAIN ATTRACTION
// //       // ======================================

// //       const attraction = await tx
// //         .insert(attractions)
// //         .values({
// //           adminId: auth.user.id,
// //           name,
// //           type: category,
// //         })
// //         .returning();

// //       // ======================================
// //       // CREATE MANAGEMENT DETAILS
// //       // ======================================

// //       const management = await tx
// //         .insert(attractionManagement)
// //         .values({
// //           adminId: auth.user.id,

// //           attractionId: attraction[0].id,

// //           image: image ?? null,

// //           description: description ?? null,

// //           timing: timing ?? null,

// //           duration: duration ?? null,

// //           durationUnit: durationUnit ?? null,

// //           adultPrice,

// //           childPrice,

// //           studentPrice,

// //           seniorPrice,

// //           foreignerPrice,

// //           ...seatCounts.seats,

// //           hasSeating: true,

// //           // Legacy single-layout column (ticket-booking attractions still read this)
// //           seatLayoutId: getLegacySeatLayoutId(resolvedSeatLayouts.expandedIds),
// //         })
// //         .returning();

// //       // ======================================
// //       // CREATE SEAT LAYOUT MAPPINGS (junction)
// //       // ======================================

// //       const seatLayoutMappings = await replaceAttractionSeatLayouts(
// //         tx,
// //         management[0].id,
// //         resolvedSeatLayouts.assignments,
// //       );

// //       let timeSlots:
// //         | Awaited<ReturnType<typeof syncAttractionTimeSlots>>
// //         | undefined;

// //       if (timeSlotsParsed.sync) {
// //         timeSlots = await syncAttractionTimeSlots(
// //           tx,
// //           attraction[0].id,
// //           timeSlotsParsed.slots,
// //         );
// //       }

// //       return {
// //         attraction: attraction[0],
// //         management: management[0],
// //         seatLayouts: seatLayoutMappings,
// //         timeSlots: timeSlots ?? [],
// //       };
// //     });

// //     // ======================================
// //     // RESPONSE
// //     // ======================================

// //     return success(result);
// //   } catch (error) {
// //     if (error instanceof Error) {
// //       if (error.message.startsWith("TIME_SLOT_NOT_FOUND:")) {
// //         return failure(
// //           `Unknown timeSlots.id: ${error.message.replace("TIME_SLOT_NOT_FOUND:", "")}`,
// //           400,
// //           "VALIDATION_ERROR",
// //         );
// //       }

// //       // Authentication
// //       if (error.message === "UNAUTHORIZED") {
// //         return failure("Authentication required.", 401, "UNAUTHORIZED");
// //       }

// //       // Account inactive
// //       if (error.message === "ACCOUNT_NOT_ACTIVE") {
// //         return failure("Account is not active.", 403, "ACCOUNT_NOT_ACTIVE");
// //       }

// //       // Module permission / role authorization
// //       if (error.message === "FORBIDDEN") {
// //         return failure(
// //           "You are not authorized to access attraction management.",
// //           403,
// //           "FORBIDDEN",
// //         );
// //       }
// //     }

// //     return failure(
// //       "Unable to create attraction.",
// //       500,
// //       "INTERNAL_SERVER_ERROR",
// //     );
// //   }
// // }

// export async function POST(request: Request) {
//   try {
//     const auth = await requireAuth(request);

//     await requireModuleAccess(auth, "ATTRACTION_MANAGEMENT");

//     // ======================================
//     // ONLY ADMIN CAN CREATE
//     // ======================================

//     if (auth.user.role !== "ADMIN") {
//       return failure("Only admin can create attraction", 403, "FORBIDDEN");
//     }

//     const body = await request.json();

//     const {
//       name,
//       category,
//       image,
//       description,
//       timing,

//       duration,
//       durationUnit,

//       adultPrice = 0,
//       childPrice = 0,
//       studentPrice = 0,
//       seniorPrice = 0,
//       foreignerPrice = 0,

//       hasSeating = false,

//       seatLayoutIds,
//     } = body;

//     // ======================================
//     // BASIC VALIDATION
//     // ======================================

//     if (!name || !category) {
//       return failure("Name and category are required", 400, "VALIDATION_ERROR");
//     }

//     // ======================================
//     // RESOLVE SEAT LAYOUTS
//     // ======================================

//     const resolvedSeatLayouts = resolveSeatLayoutIds({
//       hasSeating: true,
//       seatLayoutIds,
//     });

//     if (!resolvedSeatLayouts.ok) {
//       return failure(
//         resolvedSeatLayouts.message ===
//           "At least one seat layout is required when seating is enabled"
//           ? "Seat allocation is required. Select at least one seat layout."
//           : resolvedSeatLayouts.message,
//         400,
//         "VALIDATION_ERROR",
//       );
//     }

//     // ======================================
//     // SEAT CATEGORY COUNTS
//     // ======================================

//     const seatCounts = parseCategorySeatCounts(body, {
//       required: true,
//     });

//     if (!seatCounts.ok) {
//       return failure(seatCounts.message, 400, "VALIDATION_ERROR");
//     }

//     // ======================================
//     // TIME SLOTS
//     // ======================================

//     const timeSlotsParsed = parseTimeSlotsPayload(body);

//     if (!timeSlotsParsed.ok) {
//       return failure(timeSlotsParsed.message, 400, "VALIDATION_ERROR");
//     }

//     // ======================================
//     // VALIDATE SEAT LAYOUT OWNERSHIP
//     // ======================================

//     const seatLayoutOwnership = await validateSeatLayoutsForAdmin(
//       db,
//       auth.user.id,
//       resolvedSeatLayouts.uniqueIds,
//     );

//     if (!seatLayoutOwnership.ok) {
//       return failure(seatLayoutOwnership.message, 400, "VALIDATION_ERROR");
//     }

//     // ======================================
//     // TRANSACTION
//     // ======================================

//     const result = await db.transaction(async (tx) => {
//       // ======================================
//       // CREATE ATTRACTION
//       // ======================================

//       const attractionRows = await tx
//         .insert(attractions)
//         .values({
//           adminId: auth.user.id,
//           name,
//           type: category,
//         })
//         .returning();

//       const attraction = attractionRows[0];

//       // ======================================
//       // CREATE ATTRACTION MANAGEMENT
//       // ======================================

//       const managementRows = await tx
//         .insert(attractionManagement)
//         .values({
//           adminId: auth.user.id,

//           attractionId: attraction.id,

//           image: image ?? null,

//           description: description ?? null,

//           timing: timing ?? null,

//           duration: duration ?? null,

//           durationUnit: durationUnit ?? null,

//           adultPrice,

//           childPrice,

//           studentPrice,

//           seniorPrice,

//           foreignerPrice,

//           ...seatCounts.seats,

//           hasSeating: true,

//           // Keep legacy field for existing APIs
//           seatLayoutId: getLegacySeatLayoutId(resolvedSeatLayouts.expandedIds),
//         })
//         .returning();

//       const management = managementRows[0];

//       // ======================================
//       // CREATE ATTRACTION SEAT ALLOCATION
//       // ======================================
//       //
//       // Every selected seat layout gets
//       // one allocation row in attractionSeats.
//       //
//       // Example:
//       //
//       // seatLayoutIds:
//       // [
//       //   "layout-1",
//       //   "layout-2"
//       // ]
//       //
//       // creates:
//       //
//       // attractionSeats:
//       //
//       // layout-1 -> Seat 1 -> order 1
//       // layout-2 -> Seat 2 -> order 2
//       //
//       // ======================================

//       const attractionSeatRows = resolvedSeatLayouts.assignments.map(
//         (assignment, index) => ({
//           attractionId: attraction.id,

//           seatLayoutId: assignment.seatLayoutId,

//           name: `Seat ${index + 1}`,

//           seatOrder: index + 1,
//         }),
//       );

//       let createdAttractionSeats: any[] = [];

//       if (attractionSeatRows.length > 0) {
//         createdAttractionSeats = await tx
//           .insert(attractionSeats)
//           .values(attractionSeatRows)
//           .returning();
//       }

//       // ======================================
//       // CREATE TIME SLOTS
//       // ======================================

//       let timeSlots:
//         | Awaited<ReturnType<typeof syncAttractionTimeSlots>>
//         | undefined;

//       if (timeSlotsParsed.sync) {
//         timeSlots = await syncAttractionTimeSlots(
//           tx,
//           attraction.id,
//           timeSlotsParsed.slots,
//         );
//       }

//       // ======================================
//       // RETURN TRANSACTION RESULT
//       // ======================================

//       return {
//         attraction,

//         management,

//         attractionSeats: createdAttractionSeats,

//         timeSlots: timeSlots ?? [],
//       };
//     });

//     // ======================================
//     // SUCCESS RESPONSE
//     // ======================================

//     return success(result);
//   } catch (error) {
//     console.error("Create attraction error:", error);

//     // ======================================
//     // TIME SLOT ERROR
//     // ======================================

//     if (error instanceof Error) {
//       if (error.message.startsWith("TIME_SLOT_NOT_FOUND:")) {
//         return failure(
//           `Unknown timeSlots.id: ${error.message.replace(
//             "TIME_SLOT_NOT_FOUND:",
//             "",
//           )}`,
//           400,
//           "VALIDATION_ERROR",
//         );
//       }

//       // ======================================
//       // AUTHENTICATION ERROR
//       // ======================================

//       if (error.message === "UNAUTHORIZED") {
//         return failure("Authentication required.", 401, "UNAUTHORIZED");
//       }

//       // ======================================
//       // ACCOUNT STATUS ERROR
//       // ======================================

//       if (error.message === "ACCOUNT_NOT_ACTIVE") {
//         return failure("Account is not active.", 403, "ACCOUNT_NOT_ACTIVE");
//       }

//       // ======================================
//       // AUTHORIZATION ERROR
//       // ======================================

//       if (error.message === "FORBIDDEN") {
//         return failure(
//           "You are not authorized to access attraction management.",
//           403,
//           "FORBIDDEN",
//         );
//       }
//     }

//     // ======================================
//     // INTERNAL SERVER ERROR
//     // ======================================

//     return failure(
//       "Unable to create attraction.",
//       500,
//       "INTERNAL_SERVER_ERROR",
//     );
//   }
// }
import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db";

import {
  attractions,
  attractionManagement,
  attractionManagementSeatLayouts,
  seatLayouts,
  attractionSeats,
  seatLayoutSeats,
} from "@/db/schema";

import { success, failure } from "@/lib/api/response";

import { requireAuth } from "@/lib/auth/require-auth";

import {
  requireModuleAccess,
  getAccessibleAttractionIds,
} from "@/lib/auth/authorization";

import {
  getLegacySeatLayoutId,
  expandSeatLayoutIds,
  listTimeSlotsByAttractionIds,
  parseCategorySeatCounts,
  parseTimeSlotsPayload,
  replaceAttractionSeatLayouts,
  resolveSeatLayoutIds,
  syncAttractionTimeSlots,
  validateSeatLayoutsForAdmin,
} from "@/services/attraction-management.service";

// =====================================================
// GET ALL ATTRACTIONS
// =====================================================

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);

    await requireModuleAccess(auth, "ATTRACTION_MANAGEMENT");

    let managementData;

    // =====================================================
    // ADMIN
    // =====================================================

    if (auth.user.role === "ADMIN") {
      managementData = await db
        .select({
          id: attractionManagement.id,

          attractionId: attractions.id,

          name: attractions.name,

          category: attractions.type,

          image: attractionManagement.image,

          description: attractionManagement.description,

          timing: attractionManagement.timing,

          duration: attractionManagement.duration,

          durationUnit: attractionManagement.durationUnit,

          pricing: {
            adult: attractionManagement.adultPrice,

            child: attractionManagement.childPrice,

            student: attractionManagement.studentPrice,

            senior: attractionManagement.seniorPrice,

            foreigner: attractionManagement.foreignerPrice,
          },

          seating: {
            adult: attractionManagement.adultSeats,

            child: attractionManagement.childSeats,

            student: attractionManagement.studentSeats,

            senior: attractionManagement.seniorSeats,

            foreigner: attractionManagement.foreignerSeats,
          },

          hasSeating: attractionManagement.hasSeating,

          status: attractions.status,

          // Legacy field
          seatLayoutId: attractionManagement.seatLayoutId,
        })
        .from(attractionManagement)
        .innerJoin(
          attractions,
          eq(attractionManagement.attractionId, attractions.id),
        )
        .where(eq(attractionManagement.adminId, auth.user.id));
    }

    // =====================================================
    // MANAGER / STAFF
    // =====================================================
    else {
      const allowedIds = await getAccessibleAttractionIds(auth);

      if (!allowedIds.length) {
        return success([]);
      }

      managementData = await db
        .select({
          id: attractionManagement.id,

          attractionId: attractions.id,

          name: attractions.name,

          category: attractions.type,

          image: attractionManagement.image,

          description: attractionManagement.description,

          timing: attractionManagement.timing,

          duration: attractionManagement.duration,

          durationUnit: attractionManagement.durationUnit,

          pricing: {
            adult: attractionManagement.adultPrice,

            child: attractionManagement.childPrice,

            student: attractionManagement.studentPrice,

            senior: attractionManagement.seniorPrice,

            foreigner: attractionManagement.foreignerPrice,
          },

          seating: {
            adult: attractionManagement.adultSeats,

            child: attractionManagement.childSeats,

            student: attractionManagement.studentSeats,

            senior: attractionManagement.seniorSeats,

            foreigner: attractionManagement.foreignerSeats,
          },

          hasSeating: attractionManagement.hasSeating,

          status: attractions.status,

          // Legacy field
          seatLayoutId: attractionManagement.seatLayoutId,
        })
        .from(attractionManagement)
        .innerJoin(
          attractions,
          eq(attractionManagement.attractionId, attractions.id),
        )
        .where(inArray(attractionManagement.attractionId, allowedIds));
    }

    // =====================================================
    // NO DATA
    // =====================================================

    if (!managementData.length) {
      return success([]);
    }

    // =====================================================
    // IDs
    // =====================================================

    const managementIds = managementData.map((item) => item.id);

    const attractionIds = managementData.map((item) => item.attractionId);

    // =====================================================
    // GET SEAT LAYOUT MAPPINGS
    // =====================================================

    let seatLayoutMappings;
    try {
      // Try with position and isEnabled columns (new schema)
      seatLayoutMappings = await db
        .select({
          attractionManagementId:
            attractionManagementSeatLayouts.attractionManagementId,

          seatLayoutId: attractionManagementSeatLayouts.seatLayoutId,

          quantity: attractionManagementSeatLayouts.quantity,

          position: attractionManagementSeatLayouts.position,

          isEnabled: attractionManagementSeatLayouts.isEnabled,

          seatLayout: seatLayouts,
        })
        .from(attractionManagementSeatLayouts)
        .innerJoin(
          seatLayouts,
          eq(attractionManagementSeatLayouts.seatLayoutId, seatLayouts.id),
        )
        .where(
          inArray(
            attractionManagementSeatLayouts.attractionManagementId,
            managementIds,
          ),
        );
    } catch (error: any) {
      // Fallback: columns don't exist yet, use defaults
      if (
        error.message?.includes("does not exist") ||
        error.cause?.message?.includes("does not exist")
      ) {
        seatLayoutMappings = await db
          .select({
            attractionManagementId:
              attractionManagementSeatLayouts.attractionManagementId,

            seatLayoutId: attractionManagementSeatLayouts.seatLayoutId,

            quantity: attractionManagementSeatLayouts.quantity,

            position: sql<number>`0`,

            isEnabled: sql<boolean>`true`,

            seatLayout: seatLayouts,
          })
          .from(attractionManagementSeatLayouts)
          .innerJoin(
            seatLayouts,
            eq(attractionManagementSeatLayouts.seatLayoutId, seatLayouts.id),
          )
          .where(
            inArray(
              attractionManagementSeatLayouts.attractionManagementId,
              managementIds,
            ),
          );
      } else {
        throw error;
      }
    }

    // =====================================================
    // GROUP MAPPINGS
    // =====================================================

    const seatLayoutsByManagementId = new Map<
      string,
      typeof seatLayoutMappings
    >();

    for (const mapping of seatLayoutMappings) {
      const existing =
        seatLayoutsByManagementId.get(mapping.attractionManagementId) ?? [];

      existing.push(mapping);

      seatLayoutsByManagementId.set(mapping.attractionManagementId, existing);
    }

    // =====================================================
    // TIME SLOTS
    // =====================================================

    const timeSlotsByAttractionId = await listTimeSlotsByAttractionIds(
      db,
      attractionIds,
    );

    // =====================================================
    // GET ATTRACTION SEATS
    // =====================================================

    const attractionSeatRows = await db
      .select({
        id: attractionSeats.id,

        attractionId: attractionSeats.attractionId,

        seatLayoutId: attractionSeats.seatLayoutId,

        name: attractionSeats.name,

        seatOrder: attractionSeats.seatOrder,

        isActive: attractionSeats.isActive,
      })
      .from(attractionSeats)
      .where(inArray(attractionSeats.attractionId, attractionIds));

    // =====================================================
    // GROUP ATTRACTION SEATS
    // =====================================================

    const attractionSeatsByAttractionId = new Map<
      string,
      typeof attractionSeatRows
    >();

    for (const seat of attractionSeatRows) {
      const existing =
        attractionSeatsByAttractionId.get(seat.attractionId) ?? [];

      existing.push(seat);

      attractionSeatsByAttractionId.set(seat.attractionId, existing);
    }

    // =====================================================
    // FINAL RESPONSE
    // =====================================================

    const result = managementData.map((item) => {
      const mappings = seatLayoutsByManagementId.get(item.id) ?? [];

      // IMPORTANT:
      // Do NOT use Set here.
      //
      // If DB has:
      //
      // layout1
      // layout1
      // layout2
      //
      // response becomes:
      //
      // ["layout1", "layout1", "layout2"]

      // Build seatLayoutIds as array of objects with full metadata (position, status)
      // IMPORTANT: Expand by quantity so same layout allocated N times shows N entries
      const seatLayoutIds = mappings
        .flatMap((mapping) => {
          const quantity = mapping.quantity ?? 1;
          return Array.from({ length: quantity }, (_, i) => ({
            id: mapping.seatLayoutId,
            name: mapping.seatLayout?.name || "Layout",
            status: mapping.isEnabled ? "active" : "inactive",
            position: (mapping.position ?? 0) + i,
          }));
        })
        .sort((a, b) => a.position - b.position);

      const seats = attractionSeatsByAttractionId.get(item.attractionId) ?? [];

      return {
        ...item,

        // =================================================
        // SEAT LAYOUTS
        // =================================================

        seatLayouts: mappings.map((mapping) => ({
          ...mapping.seatLayout,

          quantity: mapping.quantity ?? 1,
        })),

        // =================================================
        // EXPANDED IDS - Full objects with position and status
        // =================================================

        seatLayoutIds,

        // =================================================
        // SEAT ALLOCATIONS - For form reconstruction with suffixes
        // =================================================

        seatAllocations: seatLayoutIds.map((layout, idx) => {
          // Count how many times this layout ID appears before this index
          const count = seatLayoutIds.filter((l) => l.id === layout.id).length;
          const indexOfThisId = seatLayoutIds
            .slice(0, idx + 1)
            .filter((l) => l.id === layout.id).length - 1;

          return {
            instanceId: `alloc_${item.id}_${layout.id}_${idx}`,
            layoutId: layout.id,
            isDisabled: layout.status === "inactive",
            suffix: count > 1 ? ` - ${String.fromCharCode(65 + indexOfThisId)}` : "",
          };
        }),

        // =================================================
        // ATTRACTION SEATS
        // =================================================

        attractionSeats: seats,

        // =================================================
        // TIME SLOTS
        // =================================================

        timeSlots: timeSlotsByAttractionId.get(item.attractionId) ?? [],
      };
    });

    return success(result);
  } catch (error) {
    console.error("Get attraction management error:", error);

    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return failure("Authentication required.", 401, "UNAUTHORIZED");
      }

      if (error.message === "ACCOUNT_NOT_ACTIVE") {
        return failure("Account is not active.", 403, "ACCOUNT_NOT_ACTIVE");
      }

      if (error.message === "FORBIDDEN") {
        return failure(
          "You are not authorized to access attraction management.",
          403,
          "FORBIDDEN",
        );
      }
    }

    return failure(
      "Unable to fetch attractions.",
      500,
      "INTERNAL_SERVER_ERROR",
    );
  }
}

// =====================================================
// POST - CREATE ATTRACTION
// =====================================================

export async function POST(request: Request) {
  try {
    const auth = await requireAuth(request);

    await requireModuleAccess(auth, "ATTRACTION_MANAGEMENT");

    // =====================================================
    // ONLY ADMIN
    // =====================================================

    if (auth.user.role !== "ADMIN") {
      return failure("Only admin can create attraction", 403, "FORBIDDEN");
    }

    const body = await request.json();

    const {
      name,
      category,
      image,
      description,
      timing,

      duration,
      durationUnit,

      adultPrice = 0,
      childPrice = 0,
      studentPrice = 0,
      seniorPrice = 0,
      foreignerPrice = 0,

      hasSeating = false,

      seatLayoutIds,
    } = body;

    // =====================================================
    // BASIC VALIDATION
    // =====================================================

    if (!name || !category) {
      return failure("Name and category are required", 400, "VALIDATION_ERROR");
    }

    // =====================================================
    // RESOLVE SEAT LAYOUTS
    // =====================================================

    const resolvedSeatLayouts = resolveSeatLayoutIds({
      hasSeating: true,
      seatLayoutIds,
    });

    if (!resolvedSeatLayouts.ok) {
      return failure(
        resolvedSeatLayouts.message ===
          "At least one seat layout is required when seating is enabled"
          ? "Seat allocation is required. Select at least one seat layout."
          : resolvedSeatLayouts.message,
        400,
        "VALIDATION_ERROR",
      );
    }

    // =====================================================
    // SEAT COUNTS
    // =====================================================

    const seatCounts = parseCategorySeatCounts(body, {
      required: true,
    });

    if (!seatCounts.ok) {
      return failure(seatCounts.message, 400, "VALIDATION_ERROR");
    }

    // =====================================================
    // TIME SLOTS
    // =====================================================

    const timeSlotsParsed = parseTimeSlotsPayload(body);

    if (!timeSlotsParsed.ok) {
      return failure(timeSlotsParsed.message, 400, "VALIDATION_ERROR");
    }

    // =====================================================
    // VALIDATE LAYOUT OWNERSHIP
    // =====================================================

         const seatLayoutOwnership = await validateSeatLayoutsForAdmin(
           db,
           auth.user.id,
           resolvedSeatLayouts.uniqueIds,
         );
     
         if (!seatLayoutOwnership.ok) {
       return failure(seatLayoutOwnership.message, 400, "VALIDATION_ERROR");
     }
 
    // =====================================================
    // TRANSACTION
    // =====================================================

    const result = await db.transaction(async (tx) => {
      // =================================================
      // CREATE ATTRACTION
      // =================================================

      const attractionRows = await tx
        .insert(attractions)
        .values({
          adminId: auth.user.id,

          name,

          type: category,
        })
        .returning();

      const attraction = attractionRows[0];

      // =================================================
      // CREATE MANAGEMENT
      // =================================================

      const managementRows = await tx
        .insert(attractionManagement)
        .values({
          adminId: auth.user.id,

          attractionId: attraction.id,

          image: image ?? null,

          description: description ?? null,

          timing: timing ?? null,

          duration: duration ?? null,

          durationUnit: durationUnit ?? null,

          adultPrice,

          childPrice,

          studentPrice,

          seniorPrice,

          foreignerPrice,

          ...seatCounts.seats,

          hasSeating: true,

          // Legacy field
          seatLayoutId: getLegacySeatLayoutId(resolvedSeatLayouts.expandedIds),
        })
        .returning();

      const management = managementRows[0];

      // =================================================
      // CREATE JUNCTION MAPPINGS
      // =================================================

      const seatLayoutMappings = await replaceAttractionSeatLayouts(
        tx,
        management.id,
        resolvedSeatLayouts.assignments,
        resolvedSeatLayouts.fullObjects,
      );

      // =================================================
      // CREATE ATTRACTION SEATS
      // =================================================
      //
      // IMPORTANT:
      // We intentionally iterate over
      // expandedSeatLayoutIds.
      //
      // Example:
      //
      // seatLayoutIds:
      //
      // [
      //   "layout-1",
      //   "layout-1",
      //   "layout-2"
      // ]
      //
      // creates:
      //
      // Seat 1 -> layout-1
      // Seat 2 -> layout-1
      // Seat 3 -> layout-2
      //
      // Same layout ID is therefore allowed.
      // =================================================

      const expandedSeatLayoutIds = resolvedSeatLayouts.expandedIds;

      const attractionSeatRows = expandedSeatLayoutIds.map(
        (seatLayoutId, index) => ({
          attractionId: attraction.id,

          seatLayoutId,

          name: `Seat ${index + 1}`,

          seatOrder: index + 1,

          isActive: true,
        }),
      );

      let createdAttractionSeats: typeof attractionSeatRows = [];

      if (attractionSeatRows.length > 0) {
        createdAttractionSeats = await tx
          .insert(attractionSeats)
          .values(attractionSeatRows)
          .returning();
      }

      // =================================================
      // TIME SLOTS
      // =================================================

      let timeSlots:
        | Awaited<ReturnType<typeof syncAttractionTimeSlots>>
        | undefined;

      if (timeSlotsParsed.sync) {
        timeSlots = await syncAttractionTimeSlots(
          tx,
          attraction.id,
          timeSlotsParsed.slots,
        );
      }

      // =================================================
      // RETURN
      // =================================================

      return {
        attraction,

        management,

        seatLayouts: seatLayoutMappings,

        seatLayoutIds: expandedSeatLayoutIds,

        attractionSeats: createdAttractionSeats,

        timeSlots: timeSlots ?? [],
      };
    });

    // =====================================================
    // SUCCESS - SANITIZE RESPONSE
    // =====================================================

    const sanitizedResult = {
      attraction: {
        id: result.attraction.id,
        adminId: result.attraction.adminId,
        name: result.attraction.name,
        type: result.attraction.type,
        status: result.attraction.status,
        createdAt: result.attraction.createdAt,
        updatedAt: result.attraction.updatedAt,
      },
      management: result.management,
      seatLayouts: Array.isArray(result.seatLayouts)
        ? result.seatLayouts.map((layout: any) => ({
            id: layout.id,
            name: layout.name,
            rows: layout.rows,
            cols: layout.cols,
            hasAisle: layout.hasAisle,
            aisleAfterCol: layout.aisleAfterCol,
            status: layout.status,
            quantity: layout.quantity,
            totalSeats: layout.totalSeats,
          }))
        : [],
      seatLayoutIds: result.seatLayoutIds,
      attractionSeats: Array.isArray(result.attractionSeats)
        ? result.attractionSeats.map((seat: any) => ({
            id: seat.id,
            attractionId: seat.attractionId,
            seatLayoutId: seat.seatLayoutId,
            name: seat.name,
            seatOrder: seat.seatOrder,
            createdAt: seat.createdAt,
          }))
        : [],
      timeSlots: Array.isArray(result.timeSlots)
        ? result.timeSlots.map((slot: any) => ({
            id: slot.id,
            attractionId: slot.attractionId,
            slotTime: slot.slotTime,
            isActive: slot.isActive,
          }))
        : [],
    };

    return success(sanitizedResult);
  } catch (error) {
    console.error("Create attraction error:", error);

    if (error instanceof Error) {
      if (error.message.startsWith("TIME_SLOT_NOT_FOUND:")) {
        return failure(
          `Unknown timeSlots.id: ${error.message.replace(
            "TIME_SLOT_NOT_FOUND:",
            "",
          )}`,
          400,
          "VALIDATION_ERROR",
        );
      }

      if (error.message === "UNAUTHORIZED") {
        return failure("Authentication required.", 401, "UNAUTHORIZED");
      }

      if (error.message === "ACCOUNT_NOT_ACTIVE") {
        return failure("Account is not active.", 403, "ACCOUNT_NOT_ACTIVE");
      }

      if (error.message === "FORBIDDEN") {
        return failure(
          "You are not authorized to access attraction management.",
          403,
          "FORBIDDEN",
        );
      }
    }

    return failure(
      "Unable to create attraction.",
      500,
      "INTERNAL_SERVER_ERROR",
    );
  }
}
