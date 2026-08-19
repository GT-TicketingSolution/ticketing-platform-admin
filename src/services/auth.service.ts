import { eq } from "drizzle-orm";

import { db } from "@/db";

import { users, staffRoles } from "@/db/schema";

import { verifyPassword, hashPassword } from "@/lib/auth/password";

import { createSession } from "./session.service";

export type LoginRole = "ADMIN" | "MANAGER" | "STAFF";

export class AuthError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

interface LoginInput {
  email: string;
  password: string;
  role: LoginRole;
}

export async function login(input: LoginInput) {
  const email = input.email.trim().toLowerCase();

  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  const user = result[0];

  if (!user) {
    throw new AuthError("INVALID_CREDENTIALS", "Invalid email or password.");
  }

  if (user.status !== "ACTIVE") {
    throw new AuthError("ACCOUNT_INACTIVE", "Your account is not active.");
  }

  /*
   * VERY IMPORTANT
   *
   * The database role is authoritative.
   *
   * The frontend cannot turn a Staff
   * account into Admin.
   */

  if (user.role !== input.role) {
    throw new AuthError("ROLE_MISMATCH", "Invalid role for this account.");
  }

  const valid = await verifyPassword(input.password, user.passwordHash);

  if (!valid) {
    throw new AuthError("INVALID_CREDENTIALS", "Invalid email or password.");
  }

  let staffRolesList: string[] = [];

  if (user.role === "STAFF") {
    const staffRoleResult = await db
      .select({
        role: staffRoles.role,
      })
      .from(staffRoles)
      .where(eq(staffRoles.staffId, user.id));

    staffRolesList = staffRoleResult.map((item) => item.role);
  }

  const session = await createSession(user.id);

  await db
    .update(users)
    .set({
      lastLoginAt: new Date(),

      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      staffRoles: staffRolesList,
      status: user.status,
    },

    session,
  };
}

/* =========================================================
   CREATE USER
========================================================= */

export async function createUser(input: {
  name: string;
  email: string;
  password: string;
  role: LoginRole;
  phone?: string;
}) {
  const passwordHash = await hashPassword(input.password);

  const result = await db
    .insert(users)
    .values({
      name: input.name,

      email: input.email.trim().toLowerCase(),

      passwordHash,

      role: input.role,

      phone: input.phone,
    })

    .returning({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,

      status: users.status,
    });

  return result[0];
}
