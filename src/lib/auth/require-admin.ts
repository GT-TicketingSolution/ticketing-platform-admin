import { requireAuth } from "./require-auth";

export async function requireAdmin(request: Request) {
  const auth = await requireAuth(request);

  if (auth.user.role !== "ADMIN") {
    throw new Error("FORBIDDEN");
  }

  return {
    ...auth,
    adminId: auth.user.id,
  };
}
