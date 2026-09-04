import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // ---------------------------------------------
    // QUERY PARAMS
    // ---------------------------------------------

    const { searchParams } = new URL(request.url);

    const limitParam = Number(searchParams.get("limit") ?? "20");

    const limit = Math.min(
      Math.max(Number.isFinite(limitParam) ? limitParam : 20, 1),
      100,
    );

    // ---------------------------------------------
    // MOCK SCAN HISTORY
    // ---------------------------------------------

    const mockScans = [
      {
        id: "scan-001",

        visitorName: "Rahul Sharma",

        attraction: "Imagicaa Theme Park",

        visitorsCount: 4,

        verdict: "ALLOWED",

        reason: null,

        timestamp: "2026-09-04T12:30:00.000Z",

        scannedBy: "scanner-user-001",
      },

      {
        id: "scan-002",

        visitorName: "Priya Patil",

        attraction: "Imagicaa Theme Park",

        visitorsCount: 2,

        verdict: "DENIED",

        reason: "Date Mismatch / Expired Ticket",

        timestamp: "2026-09-04T11:45:00.000Z",

        scannedBy: "scanner-user-002",
      },

      {
        id: "scan-003",

        visitorName: "Amit Kulkarni",

        attraction: "Water Kingdom",

        visitorsCount: 3,

        verdict: "ALLOWED",

        reason: null,

        timestamp: "2026-09-04T10:20:00.000Z",

        scannedBy: "scanner-user-001",
      },

      {
        id: "scan-004",

        visitorName: "Sneha Joshi",

        attraction: "Imagicaa Theme Park",

        visitorsCount: 1,

        verdict: "DENIED",

        reason: "Already Used / Duplicate Entry Attempt",

        timestamp: "2026-09-04T09:55:00.000Z",

        scannedBy: "scanner-user-003",
      },

      {
        id: "scan-005",

        visitorName: "Vikas Mehta",

        attraction: "Water Kingdom",

        visitorsCount: 5,

        verdict: "ALLOWED",

        reason: null,

        timestamp: "2026-09-04T09:30:00.000Z",

        scannedBy: "scanner-user-002",
      },

      {
        id: "scan-006",

        visitorName: "Neha Shah",

        attraction: "Imagicaa Theme Park",

        visitorsCount: 2,

        verdict: "DENIED",

        reason: "Payment Disputed / Pending",

        timestamp: "2026-09-04T09:10:00.000Z",

        scannedBy: "scanner-user-001",
      },

      {
        id: "scan-007",

        visitorName: "Rohan Deshmukh",

        attraction: "Imagicaa Theme Park",

        visitorsCount: 4,

        verdict: "ALLOWED",

        reason: null,

        timestamp: "2026-09-04T08:50:00.000Z",

        scannedBy: "scanner-user-003",
      },

      {
        id: "scan-008",

        visitorName: "Karan Singh",

        attraction: "Water Kingdom",

        visitorsCount: 1,

        verdict: "DENIED",

        reason: "Unrecognized / Fake QR Code",

        timestamp: "2026-09-04T08:35:00.000Z",

        scannedBy: "scanner-user-002",
      },
    ];

    // ---------------------------------------------
    // APPLY LIMIT
    // ---------------------------------------------

    const scans = mockScans.slice(0, limit);

    // ---------------------------------------------
    // RESPONSE
    // ---------------------------------------------

    return Response.json(
      {
        success: true,

        data: {
          scans,

          pagination: {
            limit,

            count: scans.length,
          },
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Get ticket scanner history error:", error);

    return Response.json(
      {
        success: false,

        message: "Unable to fetch scanner history.",

        code: "INTERNAL_SERVER_ERROR",
      },
      { status: 500 },
    );
  }
}
