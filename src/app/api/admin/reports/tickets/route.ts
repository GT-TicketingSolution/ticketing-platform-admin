import { getTicketBreakdown } from "@/services/report.service";

import { requireAuth } from "@/lib/auth/require-auth";

import { getAdminId } from "@/lib/auth/get-admin-id";

import { success, failure } from "@/lib/api/response";

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req);

    const data = await getTicketBreakdown({
      adminId: getAdminId(auth),
    });

    return success(data);
  } catch (error) {
    return failure("Unable to fetch ticket report", 500, "REPORT_ERROR");
  }
}
