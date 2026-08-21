import { z } from "zod";

// ─── Pass Schema ──────────────────────────────────────────────────────────────

export const issuePassSchema = z.object({
  visitorName: z
    .string()
    .trim()
    .min(1, "Visitor name is required")
    .min(2, "Name must be at least 2 characters")
    .max(80, "Name cannot exceed 80 characters"),
  mobile: z
    .string()
    .trim()
    .min(1, "Mobile number is required")
    .refine((val) => {
      const clean = val.replace(/\D/g, "");
      return clean.length === 10;
    }, "Enter a valid 10-digit mobile number"),
  attractionId: z
    .string()
    .trim()
    .min(1, "Please select an attraction"),
  visitors: z
    .number({ message: "Visitors must be a number" })
    .int("Visitors must be a whole number")
    .min(1, "At least 1 visitor is required")
    .max(500, "Visitors cannot exceed 500"),
  referenceId: z
    .string()
    .trim()
    .min(1, "Please select a reference"),
  visitDate: z
    .string()
    .trim()
    .min(1, "Visit date is required"),
  status: z.enum(["ACTIVE", "USED", "EXPIRED"]).default("ACTIVE"),
});

export type IssuePassFormData = z.infer<typeof issuePassSchema>;

export function validatePass(data: any) {
  const normalized = {
    ...data,
    visitors: typeof data.visitors === "string" ? Number(data.visitors) : data.visitors,
    status: (data.status || "ACTIVE").toUpperCase(),
  };

  const result = issuePassSchema.safeParse(normalized);
  if (!result.success) {
    const errors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0] as string;
      if (!errors[field]) errors[field] = issue.message;
    }
    return { success: false, errors, data: null };
  }
  return { success: true, errors: {}, data: result.data };
}

// ─── Reference Schema ─────────────────────────────────────────────────────────

export const addReferenceSchema = z.object({
  referenceName: z
    .string()
    .trim()
    .min(1, "Reference name is required")
    .max(80, "Reference name cannot exceed 80 characters"),
  department: z
    .string()
    .trim()
    .min(1, "Department / Organization is required")
    .max(80, "Department cannot exceed 80 characters"),
  contactPerson: z
    .string()
    .trim()
    .min(1, "Contact person is required")
    .max(80, "Contact person cannot exceed 80 characters"),
  post: z.string().trim().optional(),
  mobile: z
    .string()
    .trim()
    .min(1, "Mobile number is required")
    .refine((val) => {
      const clean = val.replace(/\D/g, "");
      return clean.length === 10;
    }, "Enter a valid 10-digit mobile number"),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

export type AddReferenceFormData = z.infer<typeof addReferenceSchema>;

export function validateReference(data: any) {
  const normalized = {
    ...data,
    status: (data.status || "ACTIVE").toUpperCase(),
  };

  const result = addReferenceSchema.safeParse(normalized);
  if (!result.success) {
    const errors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0] as string;
      if (!errors[field]) errors[field] = issue.message;
    }
    return { success: false, errors, data: null };
  }
  return { success: true, errors: {}, data: result.data };
}
