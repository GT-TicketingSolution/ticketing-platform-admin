import { NextRequest } from "next/server";

interface RouteContext {
  params: Promise<{
    ticketId: string;
  }>;
}

const REJECTION_REASONS = [
  "Date Mismatch / Expired Ticket",
  "Future Date Ticket (Not Valid Today)",
  "Already Used / Duplicate Entry Attempt",
  "Unrecognized / Fake QR Code",
  "Incorrect Gate / Venue Access",
  "Payment Disputed / Pending",
] as const;

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    // ---------------------------------------------
    // PARAMS
    // ---------------------------------------------

    const { ticketId } = await context.params;

    if (!ticketId?.trim()) {
      return Response.json(
        {
          success: false,
          message: "Ticket ID is required.",
          code: "TICKET_ID_REQUIRED",
        },
        { status: 400 },
      );
    }

    const normalizedTicketId = ticketId.trim();

    // ---------------------------------------------
    // BODY
    // ---------------------------------------------

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return Response.json(
        {
          success: false,
          message: "Invalid JSON request body.",
          code: "INVALID_REQUEST_BODY",
        },
        { status: 400 },
      );
    }

    const reason =
      typeof body === "object" &&
      body !== null &&
      "reason" in body &&
      typeof body.reason === "string"
        ? body.reason.trim()
        : "";

    // ---------------------------------------------
    // REASON REQUIRED
    // ---------------------------------------------

    if (!reason) {
      return Response.json(
        {
          success: false,
          message: "Rejection reason is required.",
          code: "REJECTION_REASON_REQUIRED",
        },
        { status: 400 },
      );
    }

    // ---------------------------------------------
    // VALIDATE REASON
    // ---------------------------------------------

    if (
      !REJECTION_REASONS.includes(reason as (typeof REJECTION_REASONS)[number])
    ) {
      return Response.json(
        {
          success: false,
          message: "Invalid rejection reason.",
          code: "INVALID_REJECTION_REASON",
        },
        { status: 400 },
      );
    }

    // ---------------------------------------------
    // MOCK DATA
    // ---------------------------------------------

    const rejectedAt = new Date();

    const mockResponse = {
      rejection: {
        ticketId: normalizedTicketId,

        bookingId: "mock-booking-001",

        visitorName: "Rahul Sharma",

        mobileNumber: "9876543210",

        attraction: [
          {
            id: "mock-attraction-001",
            name: "Imagicaa Theme Park",
          },
        ],

        status: "rejected",

        verdict: "Denied",

        reason,

        rejectedAt: rejectedAt.toISOString(),

        rejectedBy: "mock-user-001",
      },
    };

    // ---------------------------------------------
    // RESPONSE
    // ---------------------------------------------

    return Response.json(
      {
        success: true,
        data: mockResponse,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Reject scanner ticket error:", error);

    return Response.json(
      {
        success: false,
        message: "Unable to reject ticket.",
        code: "INTERNAL_SERVER_ERROR",
      },
      { status: 500 },
    );
  }
}
