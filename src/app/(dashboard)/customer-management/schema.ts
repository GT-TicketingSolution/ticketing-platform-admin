import { z } from "zod";

/**
 * Customer Form Validation Schema using Zod
 * Used for both Add Customer and Edit Customer modal forms
 */
export const customerSchema = z.object({
  name: z
    .string()
    .min(1, "Customer name is required")
    .min(2, "Customer name must be at least 2 characters")
    .max(150, "Customer name cannot exceed 150 characters"),
  mobile: z
    .string()
    .min(1, "Mobile number is required")
    .max(20, "Mobile number cannot exceed 20 characters")
    .refine((val) => {
      const cleanVal = val.replace(/\s/g, "");
      return /^(\+91)?[6-9]\d{9}$/.test(cleanVal) || cleanVal.length >= 7;
    }, "Please enter a valid mobile number"),
  gstn: z
    .string()
    .max(20, "GSTN cannot exceed 20 characters")
    .optional()
    .or(z.literal("")),
});

export type CustomerFormData = z.infer<typeof customerSchema>;

/**
 * Validate customer data against the customerSchema.
 * Returns an object with `success: boolean` and `errors: Record<string, string>`.
 */
export function validateCustomer(data: { name: string; mobile: string; gstn?: string }) {
  const result = customerSchema.safeParse(data);
  if (!result.success) {
    const errors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0] as string;
      if (!errors[field]) {
        errors[field] = issue.message;
      }
    }
    return { success: false, errors };
  }
  return { success: true, errors: {}, data: result.data };
}
