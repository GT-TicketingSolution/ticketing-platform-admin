import { z } from "zod";

const attractionPermissionSchema = z.object({
  attractionId: z.string(),
  modules: z.array(z.string()),
});

export const addManagerSchema = z.object({
  name: z.string().min(2, "Full name must be at least 2 characters"),
  phone: z
    .string()
    .length(10, "Phone number must be exactly 10 digits")
    .regex(/^\d+$/, "Phone number must contain only numbers"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters"),
  attraction: z.string().optional(),
  status: z.enum(["Active", "Inactive"]),
  allowedModules: z.array(z.string()),
  attractionManagementEnabled: z.boolean(),
  attractionPermissions: z.array(attractionPermissionSchema),
});

export type AddManagerFormData = z.infer<typeof addManagerSchema>;
