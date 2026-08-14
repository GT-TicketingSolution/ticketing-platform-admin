import { and, eq, gt, isNull } from "drizzle-orm";

import { db } from "@/db";

import { users, sessions, passwordResetTokens } from "@/db/schema";

import { generateResetToken, hashResetToken } from "@/lib/auth/reset-token";

import { hashPassword } from "@/lib/auth/password";

import { sendPasswordResetEmail } from "@/services/email.service";

const RESET_TOKEN_EXPIRY_MINUTES = 30;

export async function requestPasswordReset(email: string) {
  const normalizedEmail = email.trim().toLowerCase();

  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      status: users.status,
    })
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  /*
   * Never reveal whether the account exists.
   */
  if (!user) {
    return;
  }

  if (user.status !== "ACTIVE") {
    return;
  }

  /*
   * Invalidate previous reset tokens.
   */
  await db
    .update(passwordResetTokens)
    .set({
      usedAt: new Date(),
    })
    .where(
      and(
        eq(passwordResetTokens.userId, user.id),
        isNull(passwordResetTokens.usedAt),
      ),
    );

  const { token, tokenHash } = generateResetToken();

  const expiresAt = new Date(
    Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000,
  );

  await db.insert(passwordResetTokens).values({
    userId: user.id,
    tokenHash,
    expiresAt,
  });

  const baseUrl = process.env.APP_URL ?? "http://localhost:3000";

  const resetUrl = `${baseUrl}/reset-password?token=${token}`;

  await sendPasswordResetEmail({
    email: user.email,
    name: user.name,
    resetUrl,
  });
}

export async function resetPassword(token: string, newPassword: string) {
  const tokenHash = hashResetToken(token);

  const [resetToken] = await db
    .select({
      id: passwordResetTokens.id,
      userId: passwordResetTokens.userId,
    })
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!resetToken) {
    throw new Error("INVALID_OR_EXPIRED_TOKEN");
  }

  const passwordHash = await hashPassword(newPassword);

  // 1. Update password
  await db
    .update(users)
    .set({
      passwordHash,
      updatedAt: new Date(),
    })
    .where(eq(users.id, resetToken.userId));

  // 2. Mark reset token as used
  await db
    .update(passwordResetTokens)
    .set({
      usedAt: new Date(),
    })
    .where(eq(passwordResetTokens.id, resetToken.id));

  // 3. Revoke all existing sessions
  await db
    .update(sessions)
    .set({
      revokedAt: new Date(),
    })
    .where(
      and(eq(sessions.userId, resetToken.userId), isNull(sessions.revokedAt)),
    );
}
