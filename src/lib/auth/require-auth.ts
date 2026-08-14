import { eq, and, isNull, gt } from "drizzle-orm";

import { db } from "@/db";

import { users, sessions } from "@/db/schema";

import crypto from "crypto";

function hashSessionToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function requireAuth(request: Request) {
  const cookieHeader = request.headers.get("cookie");

  if (!cookieHeader) {
    throw new Error("UNAUTHORIZED");
  }

  const cookies = Object.fromEntries(
    cookieHeader.split(";").map((cookie) => {
      const [key, ...value] = cookie.trim().split("=");

      return [key, decodeURIComponent(value.join("="))];
    }),
  );

  const sessionToken = cookies.ticketing_session;

  if (!sessionToken) {
    throw new Error("UNAUTHORIZED");
  }

  const tokenHash = hashSessionToken(sessionToken);

  const [result] = await db
    .select({
      sessionId: sessions.id,

      userId: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      status: users.status,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(
      and(
        eq(sessions.tokenHash, tokenHash),

        isNull(sessions.revokedAt),

        gt(sessions.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!result) {
    throw new Error("UNAUTHORIZED");
  }

  if (result.status !== "ACTIVE") {
    throw new Error("ACCOUNT_NOT_ACTIVE");
  }

  return {
    session: {
      id: result.sessionId,
    },

    user: {
      id: result.userId,
      name: result.name,
      email: result.email,
      role: result.role,
      status: result.status,
    },
  };
}
