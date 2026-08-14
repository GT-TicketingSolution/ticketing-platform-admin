import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/db";

import { users, sessions } from "@/db/schema";

import { hashPassword, verifyPassword } from "@/lib/auth/password";

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
) {
  const [user] = await db
    .select({
      id: users.id,
      passwordHash: users.passwordHash,
      status: users.status,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  if (user.status !== "ACTIVE") {
    throw new Error("ACCOUNT_NOT_ACTIVE");
  }

  const isCurrentPasswordValid = await verifyPassword(
    currentPassword,
    user.passwordHash,
  );

  if (!isCurrentPasswordValid) {
    throw new Error("INVALID_CURRENT_PASSWORD");
  }

  const newPasswordHash = await hashPassword(newPassword);

  await db
    .update(users)
    .set({
      passwordHash: newPasswordHash,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  /*
   * Revoke all active sessions.
   *
   * The user will need to log in again.
   */
  await db
    .update(sessions)
    .set({
      revokedAt: new Date(),
    })
    .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));

  return {
    success: true,
  };
}
