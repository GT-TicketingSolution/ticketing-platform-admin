import { eq, and, isNotNull } from "drizzle-orm";

import { db } from "@/db";
import { users, staffSystemModulePermissions } from "@/db/schema";

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
      gst: users.gst,
      cin: users.cin,
      profileLink: users.profileLink,
      invoiceNumberForUsersInitialPart: users.invoiceNumberForUsersInitialPart,

      next_renewal_date: users.nextRenewalDate,
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

  const today = new Date();

  let userRenewalData:
    | {
      next_renewal_date: Date;
      days_left_for_renewal: number;
      message: string;
    }
    | undefined;

  if (user.next_renewal_date) {
    const renewalDate = new Date(user.next_renewal_date);

    // Removing time portion so we're comparing calendar days
    const todayDate = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );

    const renewalDateOnly = new Date(
      renewalDate.getFullYear(),
      renewalDate.getMonth(),
      renewalDate.getDate(),
    );

    const differenceInMs = renewalDateOnly.getTime() - todayDate.getTime();

    const daysLeft = Math.ceil(differenceInMs / (1000 * 60 * 60 * 24));

    if (daysLeft <= 30) {
      userRenewalData = {
        next_renewal_date: user.next_renewal_date,
        days_left_for_renewal: Math.max(daysLeft, 0),
        message:
          daysLeft < 0
            ? "Your application renewal has expired. Please pay the renewal amount immediately to continue using the platform."
            : daysLeft === 0
              ? "Your subscription is due for renewal today."
              : `Your application renewal is due soon. Please pay the renewal amount to continue using the platform without interruption.`,
      };
    }
  }

  if (user.role === "STAFF") {
    const [reportAccess] = await db
      .select({
        reportAccessTiming: staffSystemModulePermissions.reportAccessTiming,
        reportAccessUnit: staffSystemModulePermissions.reportAccessUnit,
      })
      .from(staffSystemModulePermissions)
      .where(
        and(
          eq(staffSystemModulePermissions.staffId, userId),
          isNotNull(staffSystemModulePermissions.reportAccessTiming)
        )
      )
      .limit(1);

    return {
      ...user,
      reportAccessTiming: reportAccess?.reportAccessTiming ?? null,
      reportAccessUnit: reportAccess?.reportAccessUnit ?? null,
      ...(userRenewalData && {
        user_renewal_data: userRenewalData,
      }),
    };
  }

  return {
    ...user,
    ...(userRenewalData && {
      user_renewal_data: userRenewalData,
    }),
  };
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
    gst?: string;
    cin?: string;
    profileLink?: string;
    invoiceNumberForUsersInitialPart?: string | null;
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
      gst: users.gst,
      cin: users.cin,
      profileLink: users.profileLink,
      invoiceNumberForUsersInitialPart: users.invoiceNumberForUsersInitialPart,
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
    gst?: string | null;
    cin?: string | null;
    profileLink?: string | null;
    invoiceNumberForUsersInitialPart?: string | null;
    updatedAt: Date;
  } = {
    name: data.name.trim(),
    email: normalizedEmail,
    phone:
      data.phone && data.phone.trim().length > 0 ? data.phone.trim() : null,
    updatedAt: new Date(),

    gst: data.gst && data.gst.trim().length > 0 ? data.gst.trim() : null,

    cin: data.cin && data.cin.trim().length > 0 ? data.cin.trim() : null,

    invoiceNumberForUsersInitialPart:
      data.invoiceNumberForUsersInitialPart &&
        data.invoiceNumberForUsersInitialPart.trim().length > 0
        ? data.invoiceNumberForUsersInitialPart.trim()
        : null,
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
          gst: users.gst,
          cin: users.cin,
          profileLink: users.profileLink,
          invoiceNumberForUsersInitialPart:
            users.invoiceNumberForUsersInitialPart,
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
      gst: users.gst,
      cin: users.cin,
      profileLink: users.profileLink,
      invoiceNumberForUsersInitialPart: users.invoiceNumberForUsersInitialPart,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    });

  if (!updatedUser) {
    throw new Error("USER_NOT_FOUND");
  }

  return updatedUser;
}
