import { z } from "zod";

export const createManagerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(150),

  email: z.string().trim().email("Invalid email address").max(255),

  phone: z.string().trim().max(20).optional().or(z.literal("")),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100),

  status: z.enum(["ACTIVE", "SUSPENDED", "DISABLED"]).optional(),
});

export const updateManagerSchema = z.object({
  name: z.string().trim().min(2).max(150).optional(),

  email: z.string().trim().email().max(255).optional(),

  phone: z.string().trim().max(20).optional().or(z.literal("")),

  status: z.enum(["ACTIVE", "SUSPENDED", "DISABLED"]).optional(),

  password: z.string().min(8).max(100).optional(),
});

export type CreateManagerInput = z.infer<typeof createManagerSchema>;

export type UpdateManagerInput = z.infer<typeof updateManagerSchema>;
