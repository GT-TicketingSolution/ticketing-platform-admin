import { z } from "zod";
import type { BulkAttractionPayload } from "./types";

/** Allowed file extensions for Bulk Upload */
export const ALLOWED_BULK_FILE_EXTENSIONS = [".csv", ".xls", ".xlsx"] as const;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Validates whether a given File matches allowed CSV / XLS / XLSX extensions
 */
export function isAllowedBulkFile(file: File): boolean {
  if (!file || !file.name) return false;
  const lowerName = file.name.toLowerCase();
  return ALLOWED_BULK_FILE_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
}

/**
 * Form validation schema for React Hook Form in BulkUploadModal (Zod v4)
 */
export const bulkUploadFormSchema = z.object({
  file: z
    .custom<File>((val) => val instanceof File, {
      message: "Please select a file to upload.",
    })
    .refine((file) => file.size <= MAX_FILE_SIZE, {
      message: "File size must not exceed 10MB.",
    })
    .refine((file) => isAllowedBulkFile(file), {
      message: "Only CSV, XLS, XLSX Files are supported.",
    }),
});

export type BulkUploadFormData = z.infer<typeof bulkUploadFormSchema>;

/** Helper: safely parse a numeric value from string or number */
function safeNum(val: unknown): number {
  if (val === undefined || val === null || val === "") return 0;
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  const cleaned = String(val).replace(/[^0-9.-]+/g, "");
  const num = Number(cleaned);
  return isNaN(num) ? 0 : num;
}

/** Helper: safely parse a boolean from various formats */
function safeBool(val: unknown): boolean {
  if (typeof val === "boolean") return val;
  if (typeof val === "number") return val === 1;
  if (typeof val === "string") {
    const lower = val.trim().toLowerCase();
    return lower === "true" || lower === "1" || lower === "yes" || lower === "y";
  }
  return false;
}

/**
 * Zod schema for validating a single parsed Attraction row from CSV/XLS/XLSX (Zod v4 compatible).
 * image and description are optional.
 */
export const bulkAttractionRowSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Attraction name is required.")
    .max(120, "Attraction name cannot exceed 120 characters."),
  type: z.string().trim().min(1, "Attraction type/category is required."),
  image: z.string().trim().nullable().optional(),
  description: z.string().trim().nullable().optional(),
  timing: z.string().trim().nullable().optional(),
  adultPrice: z.number().min(0, "Adult price must be a non-negative number."),
  childPrice: z.number().min(0, "Child price must be non-negative."),
  studentPrice: z.number().min(0, "Student price must be non-negative."),
  seniorPrice: z.number().min(0, "Senior price must be non-negative."),
  foreignerPrice: z.number().min(0, "Foreigner price must be non-negative."),
  hasSeating: z.boolean(),
});

export type ValidatedBulkAttractionRow = z.infer<typeof bulkAttractionRowSchema>;

/**
 * Validates an array of parsed rows from the bulk upload file.
 * Throws a descriptive error if required headers/fields are missing or invalid.
 */
export function validateBulkUploadRows(rawRows: Record<string, any>[]): BulkAttractionPayload {
  if (!Array.isArray(rawRows) || rawRows.length === 0) {
    throw new Error(
      "No data rows found in the uploaded file.\nEnsure the first row contains column headers and following rows contain data."
    );
  }

  if (rawRows.length > 500) {
    throw new Error("Maximum 500 records can be uploaded at a time.");
  }

  const errors: string[] = [];
  const validItems: BulkAttractionPayload = [];

  rawRows.forEach((row, index) => {
    const rowNumber = index + 2; // Row 1 is header in Excel/CSV

    // Normalize keys to support variations like "attraction_name", "Attraction Name", "Adult Price", etc.
    const n: Record<string, any> = {};
    Object.keys(row).forEach((key) => {
      const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
      n[cleanKey] = row[key];
    });

    const candidate = {
      name:
        String(n["name"] || n["attractionname"] || n["attraction"] || n["title"] || "").trim(),
      type:
        String(n["type"] || n["category"] || n["attractiontype"] || "RIDE").trim(),
      image: n["image"] || n["imageurl"] || null,
      description: n["description"] || n["desc"] || null,
      timing: n["timing"] || n["timings"] || n["time"] || null,
      adultPrice: safeNum(n["adultprice"] ?? n["adult"] ?? n["price"] ?? 0),
      childPrice: safeNum(n["childprice"] ?? n["child"] ?? 0),
      studentPrice: safeNum(n["studentprice"] ?? n["student"] ?? 0),
      seniorPrice: safeNum(n["seniorprice"] ?? n["senior"] ?? 0),
      foreignerPrice: safeNum(n["foreignerprice"] ?? n["foreigner"] ?? 0),
      hasSeating: safeBool(n["hasseating"] ?? n["seating"] ?? false),
    };

    const parsed = bulkAttractionRowSchema.safeParse(candidate);

    if (!parsed.success) {
      const fieldErrors = parsed.error.issues
        .map((issue) => `${issue.path.join(".") || "field"}: ${issue.message}`)
        .join(", ");
      errors.push(`Row ${rowNumber}: ${fieldErrors}`);
    } else {
      const data = parsed.data;
      validItems.push({
        name: data.name,
        type: data.type,
        image: data.image ?? null,
        description: data.description ?? null,
        timing: data.timing ?? null,
        adultPrice: data.adultPrice,
        childPrice: data.childPrice,
        studentPrice: data.studentPrice,
        seniorPrice: data.seniorPrice,
        foreignerPrice: data.foreignerPrice,
        hasSeating: data.hasSeating,
        attractionName: data.name,
      });
    }
  });

  if (errors.length > 0) {
    const errorSummary = errors.slice(0, 5).join("\n");
    const remaining = errors.length > 5 ? `\n...and ${errors.length - 5} more row error(s).` : "";
    throw new Error(`Validation failed:\n${errorSummary}${remaining}`);
  }

  return validItems;
}
