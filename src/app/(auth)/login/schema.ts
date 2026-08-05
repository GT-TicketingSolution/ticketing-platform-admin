import * as z from "zod";

export const loginSchema = z.object({
  emailOrUsername: z
    .string()
    .min(1, "Email or Username is required")
    .refine(
      (val) => {
        // If user typed an '@', enforce email validation format
        if (val.includes("@")) {
          return z.string().email().safeParse(val).success;
        }
        // Otherwise allow username of 3+ chars
        return val.length >= 3;
      },
      { message: "Please enter a valid email or username (min 3 characters)" }
    ),
  password: z
    .string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters"),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RoleType = "Admin" | "Manager" | "Staff";
