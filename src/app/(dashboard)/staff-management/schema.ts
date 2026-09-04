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
  /** Optional: whether this staff can view reports */
  canViewReports: z.boolean().optional(),
  /** Optional: how many hours this staff can access reports (positive integer) */
  reportViewDurationHours: z
    .preprocess((val) => {
      if (val === "" || val === null || val === undefined) return undefined;
      const parsed = Number(val);
      return isNaN(parsed) ? val : parsed;
    }, z.number({ message: "Duration must be a valid number" })
        .int("Duration must be a whole number")
        .positive("Duration must be greater than 0")
        .optional()
        .nullable()
    ),
});

export type StaffFormData = z.infer<typeof staffSchema>;

