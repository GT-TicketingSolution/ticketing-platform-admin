import { getCurrentUser } from "@/services/session.service";

import { ROLE_PERMISSIONS } from "@/lib/auth/permissions";

import { success, failure } from "@/lib/api/response";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return failure("Authentication required.", 401, "UNAUTHORIZED");
  }

  return success({
    user,

    permissions: ROLE_PERMISSIONS[user.role],
  });
}
