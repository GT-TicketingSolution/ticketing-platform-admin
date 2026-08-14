import { z } from "zod";

// ─── Pass Schema ──────────────────────────────────────────────────────────────

export const issuePassSchema = z.object({
  visitorName: z
    .string()
    .min(1, "Visitor name is required")
    .min(2, "Name must be at least 2 characters")
    .max(80, "Name cannot exceed 80 characters"),
  mobile: z
    .string()
    .min(1, "Mobile number is required")
    .refine((val) => {
      const clean = val.replace(/\s/g, "");
      return /^(\+91)?[6-9]\d{9}$/.test(clean);
    }, "Enter a valid 10-digit mobile number"),
  attraction: z
    .string()
    .min(1, "Please select an attraction"),
  visitors: z
    .number({ message: "Visitors must be a number" })
    .int("Visitors must be a whole number")
    .min(1, "At least 1 visitor is required")
    .max(500, "Visitors cannot exceed 500"),
  reference: z
    .string()
    .min(1, "Reference is required")
    .max(80, "Reference cannot exceed 80 characters"),
  fromDate: z
    .string()
    .min(1, "Start date is required"),
  toDate: z
    .string()
    .optional(),
  status: z.enum(["Active", "Used", "Expired"]),
});

export type IssuePassFormData = z.infer<typeof issuePassSchema>;

export function validatePass(data: Partial<IssuePassFormData>) {
  const result = issuePassSchema.safeParse(data);
  if (!result.success) {
    const errors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0] as string;
      if (!errors[field]) errors[field] = issue.message;
    }
    return { success: false, errors };
  }
  return { success: true, errors: {}, data: result.data };
}

// ─── Reference Schema 

export const addReferenceSchema = z.object({
  referenceName: z
    .string()
    .min(1, "Reference name is required")
    .max(80, "Reference name cannot exceed 80 characters"),
  department: z
    .string()
    .min(1, "Department / Organization is required")
    .max(80, "Department cannot exceed 80 characters"),
  contactPerson: z
    .string()
    .min(1, "Contact person is required")
    .max(80, "Contact person cannot exceed 80 characters"),
  post: z.string().optional(),
  mobile: z
    .string()
    .min(1, "Mobile number is required")
    .refine((val) => {
      const clean = val.replace(/\s/g, "");
      return /^(\+91)?[6-9]\d{9}$/.test(clean);
    }, "Enter a valid 10-digit mobile number"),
  status: z.enum(["Active", "Inactive"]),
});

export type AddReferenceFormData = z.infer<typeof addReferenceSchema>;

export function validateReference(data: Partial<AddReferenceFormData>) {
  const result = addReferenceSchema.safeParse(data);
  if (!result.success) {
    const errors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0] as string;
      if (!errors[field]) errors[field] = issue.message;
    }
    return { success: false, errors };
  }
  return { success: true, errors: {}, data: result.data };
}
