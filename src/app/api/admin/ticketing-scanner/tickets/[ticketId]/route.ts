import { NextRequest } from "next/server";

interface RouteContext {
  params: Promise<{
    ticketId: string;
  }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
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
    // MOCK DATA
    // ---------------------------------------------

    const mockTicket = {
      id: normalizedTicketId,

      invoiceNumber: "INV-2026-0001",

      visitorName: "Rahul Sharma",

      mobileNumber: "9876543210",

      email: "rahul.sharma@example.com",

      visitorType: "Family",

      attraction: "Imagicaa Theme Park",

      zone: "Adventure Zone",

      gate: "Gate 1",

      timeSlot: "10:30 AM",

      visitDate: "2026-09-04",

      totalVisitors: 4,

      breakdown: [
        {
          category: "Adult",
          quantity: 2,
          unitPrice: 1200,
          total: 2400,
        },
        {
          category: "Child",
          quantity: 2,
          unitPrice: 800,
          total: 1600,
        },
      ],

      totalAmount: 4000,

      paymentMode: "ONLINE",

      paymentStatus: "Paid",

      status: "valid",

      seats: "A1, A2, A3, A4",

      bogie: "Bogie 1",

      specialNotes: "Guest requested wheelchair assistance.",
    };

    // ---------------------------------------------
    // RESPONSE
    // ---------------------------------------------

    return Response.json(
      {
        success: true,
        data: {
          ticket: mockTicket,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Get scanner ticket error:", error);

    return Response.json(
      {
        success: false,
        message: "Unable to fetch ticket.",
        code: "INTERNAL_SERVER_ERROR",
      },
      { status: 500 },
    );
  }
}
