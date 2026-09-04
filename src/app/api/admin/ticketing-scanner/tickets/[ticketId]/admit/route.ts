import { NextRequest } from "next/server";

export async function POST(
  request: NextRequest,
  context: {
    params: Promise<{
      ticketId: string;
    }>;
  },
) {
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

  const now = new Date();

  return Response.json(
    {
      success: true,
      data: {
        admission: {
          ticketId: ticketId.trim(),

          bookingId: "mock-booking-001",

          visitorName: "Rahul Sharma",

          mobileNumber: "9876543210",

          attraction: {
            id: "mock-attraction-001",
            name: "Imagicaa Theme Park",
          },

          status: "used",

          verdict: "Allowed",

          admittedAt: now.toISOString(),

          admittedBy: "mock-user-001",
        },
      },
    },
    { status: 200 },
  );
}
