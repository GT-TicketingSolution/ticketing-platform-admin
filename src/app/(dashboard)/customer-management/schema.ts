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
    .max(60, "Customer name cannot exceed 60 characters"),
  mobile: z
    .string()
    .min(1, "Mobile number is required")
    .refine((val) => {
      const cleanVal = val.replace(/\s/g, "");
      return /^(\+91)?[6-9]\d{9}$/.test(cleanVal);
    }, "Please enter a valid 10-digit mobile number"),
  gstn: z
    .string()
    .min(1, "GSTN number is required")
    .refine((val) => {
      const cleanGstn = val.trim().toUpperCase();
      // GSTN format: 2 digits, 5 letters, 4 digits, 1 letter, 1 alphanumeric/z/etc, 15 chars total
      return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(cleanGstn);
    }, "Please enter a valid 15-character GSTN format (e.g. 08ABCDE1234F1Z5)"),
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
