// import { NextRequest } from "next/server";

// import { getInvoices } from "@/services/invoice.service";
// import { failure, success } from "@/lib/api/response";
// import { requireAuth } from "@/lib/auth/require-auth";

// export async function GET(request: NextRequest) {
//   try {
//     // --------------------------------------------------
//     // AUTH
//     // --------------------------------------------------

//     const auth = await requireAuth(request);

//     if (auth.user.role !== "ADMIN") {
//       return failure("Admin access required.", 403, "FORBIDDEN");
//     }

//     // --------------------------------------------------
//     // QUERY PARAMS
//     // --------------------------------------------------

//     const { searchParams } = new URL(request.url);

//     const page = Number(searchParams.get("page")) || 1;

//     const limit = Number(searchParams.get("limit")) || 10;

//     const search = searchParams.get("search") || undefined;

//     const paymentMode = searchParams.get("paymentMode") || undefined;

//     const dateFrom = searchParams.get("dateFrom") || undefined;

//     const dateTo = searchParams.get("dateTo") || undefined;

//     // --------------------------------------------------
//     // GET INVOICES
//     // --------------------------------------------------

//     const data = await getInvoices({
//       page,
//       limit,
//       search,
//       paymentMode,
//       dateFrom,
//       dateTo,
//     });

//     // --------------------------------------------------
//     // RESPONSE
//     // --------------------------------------------------

//     return success(data);
//   } catch (error) {
//     console.error("Get invoices error:", error);

//     return failure("Unable to fetch invoices.", 500, "INTERNAL_SERVER_ERROR");
//   }
// }
import { NextRequest } from "next/server";

import { getInvoices } from "@/services/invoice.service";
import { failure, success } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/require-auth";

export async function GET(request: NextRequest) {
  try {
    // --------------------------------------------------
    // AUTH
    // --------------------------------------------------

    const auth = await requireAuth(request);

    if (auth.user.role !== "ADMIN" && auth.user.role !== "MANAGER") {
      return failure("Admin or manager access required.", 403, "FORBIDDEN");
    }

    // --------------------------------------------------
    // TENANT
    // --------------------------------------------------

    const adminId = auth.user.adminId ?? auth.user.id;

    if (!adminId) {
      return failure("Admin context not found.", 403, "ADMIN_CONTEXT_REQUIRED");
    }

    // --------------------------------------------------
    // QUERY PARAMS
    // --------------------------------------------------

    const { searchParams } = new URL(request.url);

    const page = Math.max(Number(searchParams.get("page")) || 1, 1);

    const limit = Math.min(
      Math.max(Number(searchParams.get("limit")) || 10, 1),
      100,
    );

    const search = searchParams.get("search")?.trim() || undefined;

    const paymentMode = searchParams.get("paymentMode")?.trim() || undefined;

    const dateFrom = searchParams.get("dateFrom")?.trim() || undefined;

    const dateTo = searchParams.get("dateTo")?.trim() || undefined;

    // --------------------------------------------------
    // GET INVOICES
    // --------------------------------------------------

    const data = await getInvoices({
      adminId,
      page,
      limit,
      search,
      paymentMode,
      dateFrom,
      dateTo,
    });

    // --------------------------------------------------
    // RESPONSE
    // --------------------------------------------------

    return success(data);
  } catch (error) {
    console.error("Get invoices error:", error);

    return failure("Unable to fetch invoices.", 500, "INTERNAL_SERVER_ERROR");
  }
}
