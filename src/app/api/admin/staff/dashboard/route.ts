import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth/require-auth";

import { getStaffDashboardService } from "@/services/staff-dashboard.service";

export async function GET(request: Request) {
  try {
    const auth = await requireAuth(request);

    // Only STAFF can access this dashboard
    if (auth.user.role !== "STAFF") {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden",
        },
        {
          status: 403,
        },
      );
    }

    const data = await getStaffDashboardService(auth.user.id);

    return NextResponse.json(
      {
        success: true,
        data,
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error("Staff dashboard error:", error);

    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json(
          {
            success: false,
            message: "Unauthorized",
          },
          {
            status: 401,
          },
        );
      }

      if (error.message === "ACCOUNT_NOT_ACTIVE") {
        return NextResponse.json(
          {
            success: false,
            message: "Account is not active",
          },
          {
            status: 403,
          },
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load staff dashboard",
      },
      {
        status: 500,
      },
    );
  }
}
