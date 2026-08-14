import { eq } from "drizzle-orm";

import { db } from "@/db";

import { users } from "@/db/schema";

/* =========================================================
   GET PROFILE
========================================================= */

export async function getProfile(userId: string) {
  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      status: users.status,
      phone: users.phone,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
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

  return user;
}

/* =========================================================
   UPDATE PROFILE
========================================================= */

export async function updateProfile(
  userId: string,
  data: {
    name: string;
    email: string;
    phone?: string;
  },
) {
  /*
   * Find authenticated user
   */
  const [existingUser] = await db
    .select({
      id: users.id,
      email: users.email,
      status: users.status,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!existingUser) {
    throw new Error("USER_NOT_FOUND");
  }

  if (existingUser.status !== "ACTIVE") {
    throw new Error("ACCOUNT_NOT_ACTIVE");
  }

  /*
   * Normalize email
   */
  const normalizedEmail = data.email.trim().toLowerCase();

  /*
   * Check whether another user already
   * owns this email.
   */
  if (normalizedEmail !== existingUser.email.toLowerCase()) {
    const [emailOwner] = await db
      .select({
        id: users.id,
      })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (emailOwner && emailOwner.id !== userId) {
      throw new Error("EMAIL_ALREADY_EXISTS");
    }
  }

  /*
   * Update profile
   */
  const [updatedUser] = await db
    .update(users)
    .set({
      name: data.name.trim(),

      email: normalizedEmail,

      phone:
        data.phone && data.phone.trim().length > 0 ? data.phone.trim() : null,

      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      status: users.status,
      phone: users.phone,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    });

  if (!updatedUser) {
    throw new Error("USER_NOT_FOUND");
  }

  return updatedUser;
}
