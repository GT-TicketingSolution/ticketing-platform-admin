// import { NextRequest } from "next/server";

// import { and, desc, eq } from "drizzle-orm";

// import { db } from "@/db";

// import { ticketScanLogs, bookings, attractions } from "@/db/schema";

// import { requireAuth } from "@/lib/auth/require-auth";

// import {
//   requireModuleAccess,
//   requireAttractionAccess,
//   getAdminId,
// } from "@/lib/auth/authorization";

// import { success, failure } from "@/lib/api/response";

// export async function GET(request: NextRequest) {
//   try {
//     // ---------------------------------------------
//     // AUTH
//     // ---------------------------------------------

//     const auth = await requireAuth(request);

//     // ADMIN / MANAGER / STAFF with BOOKINGS access
//     await requireModuleAccess(auth, "SCANNER");

//     const adminId = getAdminId(auth);

//     // ---------------------------------------------
//     // QUERY PARAMS
//     // ---------------------------------------------

//     const { searchParams } = new URL(request.url);

//     const limitParam = Number(searchParams.get("limit") ?? "20");

//     const limit = Math.min(
//       Math.max(Number.isFinite(limitParam) ? limitParam : 20, 1),
//       100,
//     );

//     // ---------------------------------------------
//     // FETCH SCAN HISTORY
//     // ---------------------------------------------

//     const scans = await db
//       .select({
//         id: ticketScanLogs.id,

//         ticketId: bookings.bookingNumber,

//         visitorName: bookings.customerName,

//         attractionId: attractions.id,

//         attraction: attractions.name,

//         visitorsCount: ticketScanLogs.visitorsCount,

//         verdict: ticketScanLogs.verdict,

//         reason: ticketScanLogs.reason,

//         scannedAt: ticketScanLogs.scannedAt,

//         scannedBy: ticketScanLogs.scannedBy,
//       })
//       .from(ticketScanLogs)

//       .innerJoin(bookings, eq(ticketScanLogs.bookingId, bookings.id))

//       .innerJoin(attractions, eq(bookings.attractionId, attractions.id))

//       .where(eq(attractions.adminId, adminId))

//       .orderBy(desc(ticketScanLogs.scannedAt))

//       .limit(limit);

//     // ---------------------------------------------
//     // ATTRACTION ACCESS
//     // ---------------------------------------------

//     const accessibleScans = [];

//     for (const scan of scans) {
//       try {
//         await requireAttractionAccess(auth, scan.attractionId);

//         accessibleScans.push(scan);
//       } catch (error) {
//         if (error instanceof Error && error.message === "FORBIDDEN") {
//           continue;
//         }

//         throw error;
//       }
//     }

//     // ---------------------------------------------
//     // RESPONSE
//     // ---------------------------------------------

//     return success({
//       scans: accessibleScans.map((scan) => ({
//         id: scan.id,

//         ticketId: scan.ticketId,

//         visitorName: scan.visitorName,

//         attraction: scan.attraction,

//         visitorsCount: scan.visitorsCount,

//         verdict: scan.verdict,

//         reason: scan.reason,

//         timestamp: scan.scannedAt,

//         scannedBy: scan.scannedBy,
//       })),

//       pagination: {
//         limit,
//         count: accessibleScans.length,
//       },
//     });
//   } catch (error) {
//     console.error("Get ticket scanner history error:", error);

//     // ---------------------------------------------
//     // AUTH ERRORS
//     // ---------------------------------------------

//     if (error instanceof Error && error.message === "UNAUTHORIZED") {
//       return failure("Authentication required.", 401, "UNAUTHORIZED");
//     }

//     if (error instanceof Error && error.message === "ACCOUNT_NOT_ACTIVE") {
//       return failure("Account is not active.", 403, "ACCOUNT_NOT_ACTIVE");
//     }

//     if (error instanceof Error && error.message === "FORBIDDEN") {
//       return failure(
//         "You do not have permission to access scanner history.",
//         403,
//         "FORBIDDEN",
//       );
//     }

//     if (error instanceof Error && error.message === "USER_HAS_NO_ADMIN") {
//       return failure(
//         "User is not associated with an admin.",
//         403,
//         "USER_HAS_NO_ADMIN",
//       );
//     }

//     return failure(
//       "Unable to fetch scanner history.",
//       500,
//       "INTERNAL_SERVER_ERROR",
//     );
//   }
// }
