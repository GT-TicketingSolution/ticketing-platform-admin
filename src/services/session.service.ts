import { createHash, randomBytes } from "crypto";

import { cookies } from "next/headers";

import { and, eq, gt, isNull } from "drizzle-orm";

import { db } from "@/db";

import { sessions, users } from "@/db/schema";

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "ticketing_session";

const SESSION_DAYS = Number(process.env.SESSION_TTL_DAYS || 7);

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function generateToken() {
  return randomBytes(32).toString("hex");
}

/* =========================================================
   CREATE SESSION
========================================================= */

export async function createSession(userId: string) {
  const rawToken = generateToken();

  const tokenHash = hashToken(rawToken);

  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await db.insert(sessions).values({
    userId,
    tokenHash,
    expiresAt,
  });

  return {
    rawToken,
    expiresAt,
  };
}

/* =========================================================
   SET SESSION COOKIE
========================================================= */

export async function setSessionCookie(token: string, expiresAt: Date) {
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,

    secure: process.env.NODE_ENV === "production",

    sameSite: "lax",

    expires: expiresAt,

    path: "/",
  });
}

/* =========================================================
   GET CURRENT USER
========================================================= */

export async function getCurrentUser() {
  const cookieStore = await cookies();

  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const tokenHash = hashToken(token);

  const result = await db
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

  return result[0] ?? null;
}

/* =========================================================
   LOGOUT
========================================================= */

export async function logout() {
  const cookieStore = await cookies();

  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (token) {
    const tokenHash = hashToken(token);

    await db
      .update(sessions)
      .set({
        revokedAt: new Date(),
      })
      .where(eq(sessions.tokenHash, tokenHash));
  }

  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    expires: new Date(0),
    path: "/",
  });
}
