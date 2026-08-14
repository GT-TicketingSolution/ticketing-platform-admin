import { logout } from "@/services/session.service";

import { success } from "@/lib/api/response";

export async function POST() {
  await logout();

  return success({
    message: "Logged out successfully.",
  });
}
