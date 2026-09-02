import { z } from "zod";

/**
 * Zod validation schema for Visitor Category
 */
export const visitorCategorySchema = z.object({
  name: z
    .string()
    .min(1, "Category name is required")
    .min(2, "Category name must be at least 2 characters")
    .max(50, "Category name cannot exceed 50 characters"),
  basePrice: z
    .string()
    .min(1, "Base price is required")
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
      message: "Base price must be a non-negative number",
    }),
  image: z.string().optional().nullable(),
  futurePrice: z
    .string()
    .optional()
    .refine((val) => !val || (!isNaN(Number(val)) && Number(val) >= 0), {
      message: "Future price must be a non-negative number",
    }),
  effectiveFrom: z.string().optional(),
  numberOfSeats: z
    .string()
    .min(1, "No. of seats is required")
    .refine(
      (val) =>
        !isNaN(Number(val)) &&
        Number(val) >= 1 &&
        Number.isInteger(Number(val)),
      {
        message: "No. of seats must be a whole number of at least 1",
      },
    ),
});

export type VisitorCategoryFormData = z.infer<typeof visitorCategorySchema>;

/**
 * Zod validation schema for Attraction Form
 */
export const attractionSchema = z.object({
  name: z
    .string()
    .min(1, "Attraction name is required")
    .min(2, "Attraction name must be at least 2 characters")
    .max(80, "Attraction name cannot exceed 80 characters"),
  category: z
    .string()
    .min(1, "Category is required"),
  description: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  status: z.enum(["Active", "Inactive"] as const),
  hasSeating: z.boolean().refine((val) => val === true, {
    message: "Seat allocation is required. Please select at least one seat layout.",
  }),
});

export type AttractionFormData = z.infer<typeof attractionSchema>;

/**
 * Zod validation schema for Seat Layout Configuration
 */
export const seatingConfigSchema = z.object({
  layoutName: z
    .string()
    .min(1, "Layout name is required")
    .min(2, "Layout name must be at least 2 characters")
    .max(60, "Layout name cannot exceed 60 characters"),
  totalSeats: z
    .number({ message: "Total seats must be a number" })
    .min(1, "Total seats must be at least 1")
    .max(500, "Total seats cannot exceed 500"),
  gridStyle: z.string().min(1, "Grid style is required"),
  status: z.enum(["Active", "Inactive"] as const),
});

export type SeatingConfigFormData = z.infer<typeof seatingConfigSchema>;

/**
 * Helper validation function for Visitor Category
 */
export function validateVisitorCategory(data: {
  name: string;
  basePrice: string;
  image?: string | null;
  futurePrice?: string;
  effectiveFrom?: string;
  numberOfSeats?: string;
}) {
  const result = visitorCategorySchema.safeParse({
    ...data,
    numberOfSeats: data.numberOfSeats ?? "",
  });
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

/**
 * Helper validation function for Attraction Form
 */
export function validateAttractionForm(data: {
  name: string;
  category: string;
  description?: string | null;
  image?: string | null;
  status: "Active" | "Inactive";
  hasSeating: boolean;
  allocatedSeatsCount?: number;
}) {
  const result = attractionSchema.safeParse({
    ...data,
    description: data.description ?? "",
    image: data.image ?? "",
  });
  if (!result.success) {
    const errors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      let field = issue.path[0] as string;
      if (field === "hasSeating") {
        field = "seatAllocation";
      }
      if (!errors[field]) errors[field] = issue.message;
    }
    return { success: false, errors };
  }
  return { success: true, errors: {}, data: result.data };
}

/**
 * Helper validation function for Seat Layout Configuration
 */
export function validateSeatingConfig(data: { layoutName: string; totalSeats: number; gridStyle: string; status: "Active" | "Inactive" }) {
  const result = seatingConfigSchema.safeParse(data);
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
