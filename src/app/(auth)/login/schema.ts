import * as z from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be at most 72 characters"),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RoleType = "Admin" | "Manager" | "Staff";

/** Maps UI role labels to the backend API enum values */
export const ROLE_MAP: Record<RoleType, "ADMIN" | "MANAGER" | "STAFF"> = {
  Admin: "ADMIN",
  Manager: "MANAGER",
  Staff: "STAFF",
};

export type ApiRoleType = "ADMIN" | "MANAGER" | "STAFF";

// Forgot Password
export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

// Reset Password
export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(1, "Password is required")
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Za-z]/, "Must contain at least one letter")
      .regex(/[0-9]/, "Must contain at least one number"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
