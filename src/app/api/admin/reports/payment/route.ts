import { getPaymentDistribution } from "@/services/report.service";

import { requireAuth } from "@/lib/auth/require-auth";

import { getAdminId } from "@/lib/auth/get-admin-id";

import { success, failure } from "@/lib/api/response";

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req);

    const params = new URL(req.url).searchParams;

    const data = await getPaymentDistribution({
      adminId: getAdminId(auth),

      fromDate: params.get("fromDate") ?? undefined,

      toDate: params.get("toDate") ?? undefined,

      attractionId: params.get("attractionId") ?? undefined,
    });

    return success(data);
  } catch (error) {
    console.error(error);

    return failure("Unable to fetch payment report", 500, "REPORT_ERROR");
  }
}
