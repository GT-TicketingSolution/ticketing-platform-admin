import { failure } from "@/lib/api/response";

export function getAdminId(auth: {
  user: {
    id: string;
    role: "ADMIN" | "MANAGER" | "STAFF";
    adminId: string | null;
  };
}) {
  if (auth.user.role === "ADMIN") {
    return auth.user.id;
  }

  if (auth.user.role === "MANAGER" && auth.user.adminId) {
    return auth.user.adminId;
  }

  throw new Error("FORBIDDEN");
}
