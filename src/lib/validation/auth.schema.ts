import { z } from "zod";

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),

    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password is too long")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),

    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from current password",
    path: ["newPassword"],
  });

export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

export const updateProfileSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters")
      .max(150, "Name cannot exceed 150 characters"),

    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Invalid email address")
      .max(255, "Email cannot exceed 255 characters"),

    phone: z
      .string()
      .trim()
      .max(20, "Phone number cannot exceed 20 characters")
      .optional()
      .or(z.literal("")),

    businessName: z
      .string()
      .trim()
      .min(1, "Business name is required")
      .max(255, "Business name cannot exceed 255 characters")
      .optional()
      .or(z.literal("")),
  })
  .strict();
