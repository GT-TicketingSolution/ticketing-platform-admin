import { z } from "zod";

export const staffSchema = z.object({
  name: z
    .string()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name cannot exceed 100 characters"),
  email: z
    .string()
    .min(1, "Email address is required")
    .email("Please enter a valid email address (e.g. staff@gmail.com)"),
  phone: z
    .string()
    .min(1, "Phone number is required")
    .length(10, "Phone number must be exactly 10 digits")
    .regex(/^\d+$/, "Phone number must contain only numbers"),
  password: z
    .string()
    .optional(),
  role: z
    .array(z.string())
    .min(1, "Please select at least one role"),
  assignedAttraction: z
    .array(z.string())
    .min(1, "Please select at least one attraction"),
  status: z.enum(["Active", "Inactive", "ACTIVE", "INACTIVE"] as const),
});

export type StaffFormData = z.infer<typeof staffSchema>;

