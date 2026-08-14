import { getCurrentUser } from "./session.service";

import { hasPermission, type Permission } from "@/lib/auth/permissions";

export async function requireAuth() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("UNAUTHORIZED");
  }

  return user;
}

export async function requirePermission(permission: Permission) {
  const user = await requireAuth();

  if (!hasPermission(user.role, permission)) {
    throw new Error("FORBIDDEN");
  }

  return user;
}
