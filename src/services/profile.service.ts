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
      businessName: users.businessName,
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
    businessName?: string;
  },
) {
  /*
   * Find authenticated user
   */
  const [existingUser] = await db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      status: users.status,
      businessName: users.businessName,
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
   * Check whether another user already owns this email
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
   * Prepare profile update
   */
  const updateData: {
    name: string;
    email: string;
    phone: string | null;
    businessName?: string;
    updatedAt: Date;
  } = {
    name: data.name.trim(),
    email: normalizedEmail,
    phone:
      data.phone && data.phone.trim().length > 0 ? data.phone.trim() : null,
    updatedAt: new Date(),
  };

  /*
   * Business name belongs to ADMIN.
   *
   * When ADMIN changes the business name,
   * propagate it to all MANAGER and STAFF users
   * belonging to that ADMIN.
   */
  if (existingUser.role === "ADMIN") {
    /*
     * ADMIN must have a business name
     */
    if (!data.businessName || data.businessName.trim().length === 0) {
      throw new Error("BUSINESS_NAME_REQUIRED");
    }

    const businessName = data.businessName.trim();

    updateData.businessName = businessName;

    /*
     * Update ADMIN + MANAGER + STAFF atomically
     */
    return await db.transaction(async (tx) => {
      /*
       * Update ADMIN
       */
      const [updatedAdmin] = await tx
        .update(users)
        .set(updateData)
        .where(eq(users.id, userId))
        .returning({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          status: users.status,
          phone: users.phone,
          businessName: users.businessName,
          lastLoginAt: users.lastLoginAt,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        });

      if (!updatedAdmin) {
        throw new Error("USER_NOT_FOUND");
      }

      /*
       * Propagate business name to all users
       * directly under this ADMIN.
       *
       * This updates both MANAGER and STAFF.
       */
      await tx
        .update(users)
        .set({
          businessName,
          updatedAt: new Date(),
        })
        .where(eq(users.adminId, userId));

      return updatedAdmin;
    });
  }

  /*
   * MANAGER / STAFF / other users
   *
   * They can update their own profile,
   * but cannot change businessName.
   */
  const [updatedUser] = await db
    .update(users)
    .set(updateData)
    .where(eq(users.id, userId))
    .returning({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      status: users.status,
      phone: users.phone,
      businessName: users.businessName,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    });

  if (!updatedUser) {
    throw new Error("USER_NOT_FOUND");
  }

  return updatedUser;
}
