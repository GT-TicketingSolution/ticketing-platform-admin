// // // import { and, eq, inArray } from "drizzle-orm";

// // // import { db } from "@/db";

// // // import {
// // //   users,
// // //   staffRoles,
// // //   staffAttractionAssignments,
// // //   attractions,
// // // } from "@/db/schema";

// // // import { requireAuth } from "@/lib/auth/require-auth";
// // // import { success, failure } from "@/lib/api/response";

// // // import { z } from "zod";
// // // import { hashPassword } from "@/lib/auth/password";

// // // const updateStaffSchema = z.object({
// // //   name: z.string().min(2).max(150).optional(),

// // //   email: z.string().email().optional(),

// // //   phone: z.string().max(20).optional(),

// // //   password: z.string().min(8).optional(),

// // //   roles: z.array(z.string().min(1)).optional(),

// // //   attractionIds: z.array(z.string().uuid()).optional(),

// // //   status: z.enum(["ACTIVE", "SUSPENDED", "DISABLED"]).optional(),
// // // });

// // // export async function GET(
// // //   request: Request,
// // //   {
// // //     params,
// // //   }: {
// // //     params: Promise<{
// // //       staffId: string;
// // //     }>;
// // //   },
// // // ) {
// // //   try {
// // //     // ---------------------------------------------
// // //     // Authentication
// // //     // ---------------------------------------------
// // //     const auth = await requireAuth(request);

// // //     if (auth.user.role !== "ADMIN") {
// // //       return failure("Admin access required.", 403, "FORBIDDEN");
// // //     }

// // //     // ---------------------------------------------
// // //     // Get staff ID
// // //     // ---------------------------------------------
// // //     const { staffId } = await params;

// // //     if (!staffId) {
// // //       return failure("Staff ID is required.", 400, "STAFF_ID_REQUIRED");
// // //     }

// // //     // ---------------------------------------------
// // //     // Get staff
// // //     // ---------------------------------------------
// // //     const [staff] = await db
// // //       .select({
// // //         id: users.id,
// // //         name: users.name,
// // //         email: users.email,
// // //         phone: users.phone,
// // //         role: users.role,
// // //         status: users.status,
// // //         createdAt: users.createdAt,
// // //         updatedAt: users.updatedAt,
// // //         lastLoginAt: users.lastLoginAt,
// // //       })
// // //       .from(users)
// // //       .where(and(eq(users.id, staffId), eq(users.role, "STAFF")))
// // //       .limit(1);

// // //     if (!staff) {
// // //       return failure("Staff not found.", 404, "STAFF_NOT_FOUND");
// // //     }

// // //     // ---------------------------------------------
// // //     // Get staff roles
// // //     // ---------------------------------------------
// // //     const roles = await db
// // //       .select({
// // //         id: staffRoles.id,
// // //         role: staffRoles.role,
// // //       })
// // //       .from(staffRoles)
// // //       .where(eq(staffRoles.staffId, staffId));

// // //     // ---------------------------------------------
// // //     // Get assigned attractions
// // //     // ---------------------------------------------
// // //     const attractionsResult = await db
// // //       .select({
// // //         id: attractions.id,
// // //         name: attractions.name,
// // //         type: attractions.type,
// // //         status: attractions.status,
// // //       })
// // //       .from(staffAttractionAssignments)
// // //       .innerJoin(
// // //         attractions,
// // //         eq(staffAttractionAssignments.attractionId, attractions.id),
// // //       )
// // //       .where(eq(staffAttractionAssignments.staffId, staffId));

// // //     // ---------------------------------------------
// // //     // Response
// // //     // ---------------------------------------------
// // //     return success({
// // //       staff: {
// // //         ...staff,

// // //         roles,

// // //         attractions: attractionsResult,
// // //       },
// // //     });
// // //   } catch (error) {
// // //     console.error("Get staff details error:", error);

// // //     return failure(
// // //       "Unable to fetch staff details.",
// // //       500,
// // //       "INTERNAL_SERVER_ERROR",
// // //     );
// // //   }
// // // }

// // // export async function PUT(
// // //   request: Request,
// // //   {
// // //     params,
// // //   }: {
// // //     params: Promise<{
// // //       staffId: string;
// // //     }>;
// // //   },
// // // ) {
// // //   try {
// // //     // ---------------------------------------------
// // //     // Authentication
// // //     // ---------------------------------------------
// // //     const auth = await requireAuth(request);

// // //     if (auth.user.role !== "ADMIN") {
// // //       return failure("Admin access required.", 403, "FORBIDDEN");
// // //     }

// // //     // ---------------------------------------------
// // //     // Get staff ID
// // //     // ---------------------------------------------
// // //     const { staffId } = await params;

// // //     if (!staffId) {
// // //       return failure("Staff ID is required.", 400, "STAFF_ID_REQUIRED");
// // //     }

// // //     // ---------------------------------------------
// // //     // Validate request body
// // //     // ---------------------------------------------
// // //     const body = await request.json();

// // //     const parsed = updateStaffSchema.safeParse(body);

// // //     if (!parsed.success) {
// // //       return failure("Invalid staff details.", 400, "VALIDATION_ERROR");
// // //     }

// // //     const data = parsed.data;

// // //     // ---------------------------------------------
// // //     // Check staff exists
// // //     // ---------------------------------------------
// // //     const [existingStaff] = await db
// // //       .select({
// // //         id: users.id,
// // //         role: users.role,
// // //       })
// // //       .from(users)
// // //       .where(eq(users.id, staffId))
// // //       .limit(1);

// // //     if (!existingStaff) {
// // //       return failure("Staff not found.", 404, "STAFF_NOT_FOUND");
// // //     }

// // //     if (existingStaff.role !== "STAFF") {
// // //       return failure("User is not a staff member.", 400, "NOT_A_STAFF");
// // //     }

// // //     // ---------------------------------------------
// // //     // Check email uniqueness
// // //     // ---------------------------------------------
// // //     if (data.email !== undefined) {
// // //       const email = data.email.trim().toLowerCase();

// // //       const [existingEmail] = await db
// // //         .select({
// // //           id: users.id,
// // //         })
// // //         .from(users)
// // //         .where(eq(users.email, email))
// // //         .limit(1);

// // //       if (existingEmail && existingEmail.id !== staffId) {
// // //         return failure("Email already exists.", 409, "EMAIL_ALREADY_EXISTS");
// // //       }
// // //     }

// // //     // ---------------------------------------------
// // //     // Validate attractions
// // //     // ---------------------------------------------
// // //     if (data.attractionIds !== undefined) {
// // //       if (data.attractionIds.length > 0) {
// // //         const existingAttractions = await db
// // //           .select({
// // //             id: attractions.id,
// // //           })
// // //           .from(attractions)
// // //           .where(inArray(attractions.id, data.attractionIds));

// // //         const existingIds = new Set(
// // //           existingAttractions.map((attraction) => attraction.id),
// // //         );

// // //         const invalidIds = data.attractionIds.filter(
// // //           (id) => !existingIds.has(id),
// // //         );

// // //         if (invalidIds.length > 0) {
// // //           return failure(
// // //             "One or more attractions are invalid.",
// // //             400,
// // //             "INVALID_ATTRACTION",
// // //           );
// // //         }
// // //       }
// // //     }

// // //     // ---------------------------------------------
// // //     // Prepare user update
// // //     // ---------------------------------------------
// // //     const updateData: {
// // //       name?: string;
// // //       email?: string;
// // //       phone?: string | null;
// // //       passwordHash?: string;
// // //       status?: "ACTIVE" | "SUSPENDED" | "DISABLED";
// // //       updatedAt: Date;
// // //     } = {
// // //       updatedAt: new Date(),
// // //     };

// // //     if (data.name !== undefined) {
// // //       updateData.name = data.name.trim();
// // //     }

// // //     if (data.email !== undefined) {
// // //       updateData.email = data.email.trim().toLowerCase();
// // //     }

// // //     if (data.phone !== undefined) {
// // //       updateData.phone = data.phone.trim() || null;
// // //     }

// // //     if (data.status !== undefined) {
// // //       updateData.status = data.status;
// // //     }

// // //     if (data.password !== undefined) {
// // //       updateData.passwordHash = await hashPassword(data.password);
// // //     }

// // //     // ---------------------------------------------
// // //     // Update staff user
// // //     // ---------------------------------------------
// // //     const [updatedStaff] = await db
// // //       .update(users)
// // //       .set(updateData)
// // //       .where(and(eq(users.id, staffId), eq(users.role, "STAFF")))
// // //       .returning({
// // //         id: users.id,
// // //         name: users.name,
// // //         email: users.email,
// // //         phone: users.phone,
// // //         role: users.role,
// // //         status: users.status,
// // //         createdAt: users.createdAt,
// // //         updatedAt: users.updatedAt,
// // //         lastLoginAt: users.lastLoginAt,
// // //       });

// // //     if (!updatedStaff) {
// // //       return failure("Staff not found.", 404, "STAFF_NOT_FOUND");
// // //     }

// // //     // ---------------------------------------------
// // //     // Update roles
// // //     // ---------------------------------------------
// // //     if (data.roles !== undefined) {
// // //       await db.delete(staffRoles).where(eq(staffRoles.staffId, staffId));

// // //       if (data.roles.length > 0) {
// // //         await db.insert(staffRoles).values(
// // //           data.roles.map((role) => ({
// // //             staffId,
// // //             role: role.trim(),
// // //           })),
// // //         );
// // //       }
// // //     }

// // //     // ---------------------------------------------
// // //     // Update attractions
// // //     // ---------------------------------------------
// // //     if (data.attractionIds !== undefined) {
// // //       await db
// // //         .delete(staffAttractionAssignments)
// // //         .where(eq(staffAttractionAssignments.staffId, staffId));

// // //       if (data.attractionIds.length > 0) {
// // //         await db.insert(staffAttractionAssignments).values(
// // //           data.attractionIds.map((attractionId) => ({
// // //             staffId,
// // //             attractionId,
// // //           })),
// // //         );
// // //       }
// // //     }

// // //     // ---------------------------------------------
// // //     // Response
// // //     // ---------------------------------------------
// // //     return success({
// // //       staff: updatedStaff,
// // //     });
// // //   } catch (error) {
// // //     console.error("Update staff error:", error);

// // //     return failure("Unable to update staff.", 500, "INTERNAL_SERVER_ERROR");
// // //   }
// // // }

// // // export async function DELETE(
// // //   request: Request,
// // //   {
// // //     params,
// // //   }: {
// // //     params: Promise<{
// // //       staffId: string;
// // //     }>;
// // //   },
// // // ) {
// // //   try {
// // //     // ---------------------------------------------
// // //     // Authentication
// // //     // ---------------------------------------------
// // //     const auth = await requireAuth(request);

// // //     if (auth.user.role !== "ADMIN") {
// // //       return failure("Admin access required.", 403, "FORBIDDEN");
// // //     }

// // //     // ---------------------------------------------
// // //     // Get staff ID
// // //     // ---------------------------------------------
// // //     const { staffId } = await params;

// // //     if (!staffId) {
// // //       return failure("Staff ID is required.", 400, "STAFF_ID_REQUIRED");
// // //     }

// // //     // ---------------------------------------------
// // //     // Check staff exists
// // //     // ---------------------------------------------
// // //     const [existingStaff] = await db
// // //       .select({
// // //         id: users.id,
// // //         role: users.role,
// // //       })
// // //       .from(users)
// // //       .where(eq(users.id, staffId))
// // //       .limit(1);

// // //     if (!existingStaff) {
// // //       return failure("Staff not found.", 404, "STAFF_NOT_FOUND");
// // //     }

// // //     if (existingStaff.role !== "STAFF") {
// // //       return failure("User is not a staff member.", 400, "NOT_A_STAFF");
// // //     }

// // //     // ---------------------------------------------
// // //     // Delete staff roles
// // //     // ---------------------------------------------
// // //     await db.delete(staffRoles).where(eq(staffRoles.staffId, staffId));

// // //     // ---------------------------------------------
// // //     // Delete attraction assignments
// // //     // ---------------------------------------------
// // //     await db
// // //       .delete(staffAttractionAssignments)
// // //       .where(eq(staffAttractionAssignments.staffId, staffId));

// // //     // ---------------------------------------------
// // //     // Delete staff user
// // //     // ---------------------------------------------
// // //     const [deletedStaff] = await db
// // //       .delete(users)
// // //       .where(and(eq(users.id, staffId), eq(users.role, "STAFF")))
// // //       .returning({
// // //         id: users.id,
// // //         name: users.name,
// // //         email: users.email,
// // //         role: users.role,
// // //       });

// // //     if (!deletedStaff) {
// // //       return failure("Staff could not be deleted.", 404, "STAFF_NOT_FOUND");
// // //     }

// // //     // ---------------------------------------------
// // //     // Response
// // //     // ---------------------------------------------
// // //     return success({
// // //       message: "Staff deleted successfully.",
// // //       staff: deletedStaff,
// // //     });
// // //   } catch (error) {
// // //     console.error("Delete staff error:", error);

// // //     return failure("Unable to delete staff.", 500, "INTERNAL_SERVER_ERROR");
// // //   }
// // // }
// // import { NextRequest } from "next/server";

// // import { and, eq, ilike, inArray, or, sql } from "drizzle-orm";

// // import { db } from "@/db";

// // import {
// //   users,
// //   staffRoles,
// //   staffAttractionAssignments,
// //   attractions,
// // } from "@/db/schema";

// // import { requireAuth } from "@/lib/auth/require-auth";
// // import { hashPassword } from "@/lib/auth/password";

// // import { success, failure } from "@/lib/api/response";

// // import { z } from "zod";

// // /* =========================================================
// //    VALIDATION
// // ========================================================= */

// // const createStaffSchema = z.object({
// //   name: z.string().min(2).max(150),

// //   email: z.string().email(),

// //   phone: z.string().max(20).optional(),

// //   password: z.string().min(8),

// //   roles: z.array(z.string().min(1)).optional().default([]),

// //   attractionIds: z.array(z.string().uuid()).optional().default([]),

// //   status: z
// //     .enum(["ACTIVE", "SUSPENDED", "DISABLED"])
// //     .optional()
// //     .default("ACTIVE"),
// // });

// // /* =========================================================
// //    GET /api/admin/staff
// // ========================================================= */

// // export async function GET(request: NextRequest) {
// //   try {
// //     // -----------------------------------------------------
// //     // Authentication
// //     // -----------------------------------------------------

// //     const auth = await requireAuth(request);

// //     if (auth.user.role !== "ADMIN") {
// //       return failure("Admin access required.", 403, "FORBIDDEN");
// //     }

// //     // The authenticated admin is the tenant boundary.
// //     const adminId = auth.user.id;

// //     // -----------------------------------------------------
// //     // Query params
// //     // -----------------------------------------------------

// //     const { searchParams } = new URL(request.url);

// //     const page = Math.max(Number(searchParams.get("page") || "1"), 1);

// //     const limit = Math.min(
// //       Math.max(Number(searchParams.get("limit") || "10"), 1),
// //       100,
// //     );

// //     const search = searchParams.get("search")?.trim() || "";

// //     const status = searchParams.get("status");

// //     const attractionId = searchParams.get("attractionId");

// //     const offset = (page - 1) * limit;

// //     // -----------------------------------------------------
// //     // Validate attraction filter belongs to this admin
// //     // -----------------------------------------------------

// //     if (attractionId) {
// //       const [attraction] = await db
// //         .select({
// //           id: attractions.id,
// //         })
// //         .from(attractions)
// //         .where(
// //           and(
// //             eq(attractions.id, attractionId),
// //             eq(attractions.adminId, adminId),
// //           ),
// //         )
// //         .limit(1);

// //       if (!attraction) {
// //         return failure("Attraction not found.", 404, "ATTRACTION_NOT_FOUND");
// //       }
// //     }

// //     // -----------------------------------------------------
// //     // Base staff condition
// //     // -----------------------------------------------------

// //     const conditions = [
// //       eq(users.role, "STAFF"),

// //       // IMPORTANT:
// //       // Only return staff belonging to the authenticated admin.
// //       eq(users.adminId, adminId),
// //     ];

// //     // -----------------------------------------------------
// //     // Search
// //     // -----------------------------------------------------

// //     if (search) {
// //       conditions.push(
// //         or(
// //           ilike(users.name, `%${search}%`),
// //           ilike(users.email, `%${search}%`),
// //           ilike(users.phone, `%${search}%`),
// //         )!,
// //       );
// //     }

// //     // -----------------------------------------------------
// //     // Status filter
// //     // -----------------------------------------------------

// //     if (
// //       status === "ACTIVE" ||
// //       status === "SUSPENDED" ||
// //       status === "DISABLED"
// //     ) {
// //       conditions.push(eq(users.status, status));
// //     }

// //     // -----------------------------------------------------
// //     // Attraction filter
// //     // -----------------------------------------------------

// //     if (attractionId) {
// //       const assignedStaff = await db
// //         .select({
// //           staffId: staffAttractionAssignments.staffId,
// //         })
// //         .from(staffAttractionAssignments)
// //         .innerJoin(
// //           attractions,
// //           eq(staffAttractionAssignments.attractionId, attractions.id),
// //         )
// //         .where(
// //           and(
// //             eq(staffAttractionAssignments.attractionId, attractionId),

// //             // IMPORTANT:
// //             // Assignment must belong to an attraction owned
// //             // by the authenticated admin.
// //             eq(attractions.adminId, adminId),
// //           ),
// //         );

// //       const staffIds = assignedStaff.map((item) => item.staffId);

// //       if (staffIds.length === 0) {
// //         return success({
// //           items: [],

// //           pagination: {
// //             page,
// //             limit,
// //             total: 0,
// //             totalPages: 0,
// //           },
// //         });
// //       }

// //       conditions.push(inArray(users.id, staffIds));
// //     }

// //     // -----------------------------------------------------
// //     // Total count
// //     // -----------------------------------------------------

// //     const [{ count }] = await db
// //       .select({
// //         count: sql<number>`count(*)`,
// //       })
// //       .from(users)
// //       .where(and(...conditions));

// //     const total = Number(count);

// //     // -----------------------------------------------------
// //     // Staff list
// //     // -----------------------------------------------------

// //     const staff = await db
// //       .select({
// //         id: users.id,
// //         name: users.name,
// //         email: users.email,
// //         phone: users.phone,
// //         status: users.status,
// //         joinedDate: users.createdAt,
// //       })
// //       .from(users)
// //       .where(and(...conditions))
// //       .orderBy(sql`${users.createdAt} DESC`)
// //       .limit(limit)
// //       .offset(offset);

// //     // -----------------------------------------------------
// //     // Attach roles + attractions
// //     // -----------------------------------------------------

// //     const staffWithDetails = await Promise.all(
// //       staff.map(async (member) => {
// //         // -----------------------------------------------
// //         // Staff roles
// //         // -----------------------------------------------

// //         const roles = await db
// //           .select({
// //             id: staffRoles.id,
// //             role: staffRoles.role,
// //           })
// //           .from(staffRoles)
// //           .where(eq(staffRoles.staffId, member.id));

// //         // -----------------------------------------------
// //         // Staff attractions
// //         // -----------------------------------------------

// //         const assignedAttractions = await db
// //           .select({
// //             id: attractions.id,
// //             name: attractions.name,
// //           })
// //           .from(staffAttractionAssignments)
// //           .innerJoin(
// //             attractions,
// //             eq(staffAttractionAssignments.attractionId, attractions.id),
// //           )
// //           .where(
// //             and(
// //               eq(staffAttractionAssignments.staffId, member.id),

// //               // IMPORTANT:
// //               // Never expose attractions belonging to another admin.
// //               eq(attractions.adminId, adminId),
// //             ),
// //           );

// //         return {
// //           ...member,
// //           roles,
// //           attractions: assignedAttractions,
// //         };
// //       }),
// //     );

// //     // -----------------------------------------------------
// //     // Response
// //     // -----------------------------------------------------

// //     return success({
// //       items: staffWithDetails,

// //       pagination: {
// //         page,
// //         limit,
// //         total,
// //         totalPages: Math.ceil(total / limit),
// //       },
// //     });
// //   } catch (error) {
// //     if (error instanceof Error) {
// //       if (error.message === "UNAUTHORIZED") {
// //         return failure("Authentication required.", 401, "UNAUTHORIZED");
// //       }

// //       if (error.message === "ACCOUNT_NOT_ACTIVE") {
// //         return failure("Account is not active.", 403, "ACCOUNT_NOT_ACTIVE");
// //       }
// //     }

// //     console.error("Get staff error:", error);

// //     return failure("Unable to fetch staff.", 500, "INTERNAL_SERVER_ERROR");
// //   }
// // }

// // /* =========================================================
// //    POST /api/admin/staff
// // ========================================================= */

// // export async function POST(request: Request) {
// //   try {
// //     // -----------------------------------------------------
// //     // Authentication
// //     // -----------------------------------------------------

// //     const auth = await requireAuth(request);

// //     if (auth.user.role !== "ADMIN") {
// //       return failure("Admin access required.", 403, "FORBIDDEN");
// //     }

// //     // IMPORTANT:
// //     // The authenticated admin becomes the owner of the staff.
// //     const adminId = auth.user.id;

// //     // -----------------------------------------------------
// //     // Validate request body
// //     // -----------------------------------------------------

// //     const body = await request.json();

// //     const parsed = createStaffSchema.safeParse(body);

// //     if (!parsed.success) {
// //       return failure("Invalid staff details.", 400, "VALIDATION_ERROR");
// //     }

// //     const { name, email, phone, password, roles, attractionIds, status } =
// //       parsed.data;

// //     const normalizedEmail = email.trim().toLowerCase();

// //     // -----------------------------------------------------
// //     // Check duplicate email
// //     // -----------------------------------------------------

// //     const [existingUser] = await db
// //       .select({
// //         id: users.id,
// //       })
// //       .from(users)
// //       .where(eq(users.email, normalizedEmail))
// //       .limit(1);

// //     if (existingUser) {
// //       return failure("Email already exists.", 409, "EMAIL_ALREADY_EXISTS");
// //     }

// //     // -----------------------------------------------------
// //     // Validate attractions
// //     // -----------------------------------------------------

// //     if (attractionIds.length > 0) {
// //       const existingAttractions = await db
// //         .select({
// //           id: attractions.id,
// //         })
// //         .from(attractions)
// //         .where(
// //           and(
// //             inArray(attractions.id, attractionIds),

// //             // CRITICAL:
// //             // An admin can only assign their own attractions.
// //             eq(attractions.adminId, adminId),
// //           ),
// //         );

// //       const existingAttractionIds = new Set(
// //         existingAttractions.map((attraction) => attraction.id),
// //       );

// //       const invalidAttractionIds = attractionIds.filter(
// //         (id) => !existingAttractionIds.has(id),
// //       );

// //       if (invalidAttractionIds.length > 0) {
// //         return failure(
// //           "One or more attractions are invalid or do not belong to this admin.",
// //           400,
// //           "INVALID_ATTRACTION",
// //         );
// //       }
// //     }

// //     // -----------------------------------------------------
// //     // Hash password
// //     // -----------------------------------------------------

// //     const passwordHash = await hashPassword(password);

// //     // -----------------------------------------------------
// //     // Create staff
// //     // -----------------------------------------------------

// //     const [staff] = await db
// //       .insert(users)
// //       .values({
// //         name: name.trim(),

// //         email: normalizedEmail,

// //         phone: phone?.trim() || null,

// //         passwordHash,

// //         role: "STAFF",

// //         status,

// //         // CRITICAL:
// //         // Establish tenant ownership.
// //         adminId,
// //       })
// //       .returning({
// //         id: users.id,
// //         name: users.name,
// //         email: users.email,
// //         phone: users.phone,
// //         role: users.role,
// //         status: users.status,
// //         createdAt: users.createdAt,
// //       });

// //     if (!staff) {
// //       throw new Error("STAFF_CREATE_FAILED");
// //     }

// //     // -----------------------------------------------------
// //     // Insert staff roles
// //     // -----------------------------------------------------

// //     if (roles.length > 0) {
// //       await db.insert(staffRoles).values(
// //         roles.map((role) => ({
// //           staffId: staff.id,
// //           role: role.trim(),
// //         })),
// //       );
// //     }

// //     // -----------------------------------------------------
// //     // Insert attraction assignments
// //     // -----------------------------------------------------

// //     if (attractionIds.length > 0) {
// //       await db.insert(staffAttractionAssignments).values(
// //         attractionIds.map((attractionId) => ({
// //           staffId: staff.id,
// //           attractionId,
// //         })),
// //       );
// //     }

// //     // -----------------------------------------------------
// //     // Response
// //     // -----------------------------------------------------

// //     return success(
// //       {
// //         staff,
// //       },
// //       201,
// //     );
// //   } catch (error) {
// //     if (error instanceof Error) {
// //       if (error.message === "UNAUTHORIZED") {
// //         return failure("Authentication required.", 401, "UNAUTHORIZED");
// //       }

// //       if (error.message === "ACCOUNT_NOT_ACTIVE") {
// //         return failure("Account is not active.", 403, "ACCOUNT_NOT_ACTIVE");
// //       }
// //     }

// //     console.error("Create staff error:", error);

// //     return failure("Unable to create staff.", 500, "INTERNAL_SERVER_ERROR");
// //   }
// // }
// import { NextRequest } from "next/server";

// import { and, eq, inArray } from "drizzle-orm";

// import { db } from "@/db";

// import {
//   users,
//   staffRoles,
//   staffAttractionAssignments,
//   attractions,
// } from "@/db/schema";

// import { requireAuth } from "@/lib/auth/require-auth";
// import { hashPassword } from "@/lib/auth/password";

// import { success, failure } from "@/lib/api/response";

// import { z } from "zod";

// /* =========================================================
//    VALIDATION
// ========================================================= */

// const updateStaffSchema = z.object({
//   name: z.string().min(2).max(150).optional(),

//   email: z.string().email().optional(),

//   phone: z.string().max(20).optional(),

//   password: z.string().min(8).optional(),

//   roles: z.array(z.string().min(1)).optional(),

//   attractionIds: z.array(z.string().uuid()).optional(),

//   status: z.enum(["ACTIVE", "SUSPENDED", "DISABLED"]).optional(),
// });

// /* =========================================================
//    GET /api/admin/staff/[staffId]
// ========================================================= */

// export async function GET(
//   request: NextRequest,
//   {
//     params,
//   }: {
//     params: Promise<{
//       staffId: string;
//     }>;
//   },
// ) {
//   try {
//     // -----------------------------------------------------
//     // Authentication
//     // -----------------------------------------------------

//     const auth = await requireAuth(request);

//     if (auth.user.role !== "ADMIN") {
//       return failure("Admin access required.", 403, "FORBIDDEN");
//     }

//     const adminId = auth.user.id;

//     // -----------------------------------------------------
//     // Get staff ID
//     // -----------------------------------------------------

//     const { staffId } = await params;

//     if (!staffId) {
//       return failure("Staff ID is required.", 400, "STAFF_ID_REQUIRED");
//     }

//     // -----------------------------------------------------
//     // Get staff
//     //
//     // IMPORTANT:
//     // Staff must belong to the authenticated admin.
//     // -----------------------------------------------------

//     const [staff] = await db
//       .select({
//         id: users.id,
//         name: users.name,
//         email: users.email,
//         phone: users.phone,
//         role: users.role,
//         status: users.status,
//         createdAt: users.createdAt,
//         updatedAt: users.updatedAt,
//         lastLoginAt: users.lastLoginAt,
//       })
//       .from(users)
//       .where(
//         and(
//           eq(users.id, staffId),
//           eq(users.role, "STAFF"),
//           eq(users.adminId, adminId),
//         ),
//       )
//       .limit(1);

//     // -----------------------------------------------------
//     // Staff not found
//     // -----------------------------------------------------

//     if (!staff) {
//       return failure("Staff not found.", 404, "STAFF_NOT_FOUND");
//     }

//     // -----------------------------------------------------
//     // Get staff roles
//     // -----------------------------------------------------

//     const roles = await db
//       .select({
//         id: staffRoles.id,
//         role: staffRoles.role,
//       })
//       .from(staffRoles)
//       .where(eq(staffRoles.staffId, staffId));

//     // -----------------------------------------------------
//     // Get assigned attractions
//     //
//     // IMPORTANT:
//     // Only return attractions owned by this admin.
//     // -----------------------------------------------------

//     const attractionsResult = await db
//       .select({
//         id: attractions.id,
//         name: attractions.name,
//         type: attractions.type,
//         status: attractions.status,
//       })
//       .from(staffAttractionAssignments)
//       .innerJoin(
//         attractions,
//         eq(staffAttractionAssignments.attractionId, attractions.id),
//       )
//       .where(
//         and(
//           eq(staffAttractionAssignments.staffId, staffId),
//           eq(attractions.adminId, adminId),
//         ),
//       );

//     // -----------------------------------------------------
//     // Response
//     // -----------------------------------------------------

//     return success({
//       staff: {
//         ...staff,
//         roles,
//         attractions: attractionsResult,
//       },
//     });
//   } catch (error) {
//     // -----------------------------------------------------
//     // Authentication errors
//     // -----------------------------------------------------

//     if (error instanceof Error) {
//       if (error.message === "UNAUTHORIZED") {
//         return failure("Authentication required.", 401, "UNAUTHORIZED");
//       }

//       if (error.message === "ACCOUNT_NOT_ACTIVE") {
//         return failure("Account is not active.", 403, "ACCOUNT_NOT_ACTIVE");
//       }
//     }

//     console.error("Get staff details error:", error);

//     return failure(
//       "Unable to fetch staff details.",
//       500,
//       "INTERNAL_SERVER_ERROR",
//     );
//   }
// }

// /* =========================================================
//    PUT /api/admin/staff/[staffId]
// ========================================================= */

// export async function PUT(
//   request: NextRequest,
//   {
//     params,
//   }: {
//     params: Promise<{
//       staffId: string;
//     }>;
//   },
// ) {
//   try {
//     // -----------------------------------------------------
//     // Authentication
//     // -----------------------------------------------------

//     const auth = await requireAuth(request);

//     if (auth.user.role !== "ADMIN") {
//       return failure("Admin access required.", 403, "FORBIDDEN");
//     }

//     const adminId = auth.user.id;

//     // -----------------------------------------------------
//     // Get staff ID
//     // -----------------------------------------------------

//     const { staffId } = await params;

//     if (!staffId) {
//       return failure("Staff ID is required.", 400, "STAFF_ID_REQUIRED");
//     }

//     // -----------------------------------------------------
//     // Validate request body
//     // -----------------------------------------------------

//     const body = await request.json();

//     const parsed = updateStaffSchema.safeParse(body);

//     if (!parsed.success) {
//       return failure("Invalid staff details.", 400, "VALIDATION_ERROR");
//     }

//     const data = parsed.data;

//     // -----------------------------------------------------
//     // Check staff exists AND belongs to this admin
//     //
//     // IMPORTANT:
//     // This is the tenant boundary.
//     // -----------------------------------------------------

//     const [existingStaff] = await db
//       .select({
//         id: users.id,
//         role: users.role,
//         adminId: users.adminId,
//       })
//       .from(users)
//       .where(
//         and(
//           eq(users.id, staffId),
//           eq(users.role, "STAFF"),
//           eq(users.adminId, adminId),
//         ),
//       )
//       .limit(1);

//     if (!existingStaff) {
//       return failure("Staff not found.", 404, "STAFF_NOT_FOUND");
//     }

//     // -----------------------------------------------------
//     // Check email uniqueness
//     // -----------------------------------------------------

//     let normalizedEmail: string | undefined;

//     if (data.email !== undefined) {
//       normalizedEmail = data.email.trim().toLowerCase();

//       const [existingEmail] = await db
//         .select({
//           id: users.id,
//         })
//         .from(users)
//         .where(eq(users.email, normalizedEmail))
//         .limit(1);

//       if (existingEmail && existingEmail.id !== staffId) {
//         return failure("Email already exists.", 409, "EMAIL_ALREADY_EXISTS");
//       }
//     }

//     // -----------------------------------------------------
//     // Validate attractions
//     //
//     // IMPORTANT:
//     // Every attraction must belong to the authenticated
//     // admin.
//     // -----------------------------------------------------

//     if (data.attractionIds !== undefined) {
//       if (data.attractionIds.length > 0) {
//         const existingAttractions = await db
//           .select({
//             id: attractions.id,
//           })
//           .from(attractions)
//           .where(
//             and(
//               inArray(attractions.id, data.attractionIds),
//               eq(attractions.adminId, adminId),
//             ),
//           );

//         const existingIds = new Set(
//           existingAttractions.map((attraction) => attraction.id),
//         );

//         const invalidIds = data.attractionIds.filter(
//           (id) => !existingIds.has(id),
//         );

//         if (invalidIds.length > 0) {
//           return failure(
//             "One or more attractions are invalid or do not belong to this admin.",
//             400,
//             "INVALID_ATTRACTION",
//           );
//         }
//       }
//     }

//     // -----------------------------------------------------
//     // Prepare user update
//     // -----------------------------------------------------

//     const updateData: {
//       name?: string;
//       email?: string;
//       phone?: string | null;
//       passwordHash?: string;
//       status?: "ACTIVE" | "SUSPENDED" | "DISABLED";
//       updatedAt: Date;
//     } = {
//       updatedAt: new Date(),
//     };

//     if (data.name !== undefined) {
//       updateData.name = data.name.trim();
//     }

//     if (normalizedEmail !== undefined) {
//       updateData.email = normalizedEmail;
//     }

//     if (data.phone !== undefined) {
//       updateData.phone = data.phone.trim() || null;
//     }

//     if (data.status !== undefined) {
//       updateData.status = data.status;
//     }

//     // -----------------------------------------------------
//     // Hash new password if provided
//     // -----------------------------------------------------

//     if (data.password !== undefined) {
//       updateData.passwordHash = await hashPassword(data.password);
//     }

//     // -----------------------------------------------------
//     // Transaction
//     //
//     // User + roles + attractions are updated together.
//     // If anything fails, the transaction rolls back.
//     // -----------------------------------------------------

//     const updatedStaff = await db.transaction(async (tx) => {
//       // ---------------------------------------------------
//       // Update staff user
//       // ---------------------------------------------------

//       const [staff] = await tx
//         .update(users)
//         .set(updateData)
//         .where(
//           and(
//             eq(users.id, staffId),
//             eq(users.role, "STAFF"),
//             eq(users.adminId, adminId),
//           ),
//         )
//         .returning({
//           id: users.id,
//           name: users.name,
//           email: users.email,
//           phone: users.phone,
//           role: users.role,
//           status: users.status,
//           createdAt: users.createdAt,
//           updatedAt: users.updatedAt,
//           lastLoginAt: users.lastLoginAt,
//         });

//       if (!staff) {
//         throw new Error("STAFF_NOT_FOUND");
//       }

//       // ---------------------------------------------------
//       // Update roles
//       //
//       // Only replace roles when roles were included
//       // in the request.
//       // ---------------------------------------------------

//       if (data.roles !== undefined) {
//         await tx.delete(staffRoles).where(eq(staffRoles.staffId, staffId));

//         const cleanedRoles = data.roles
//           .map((role) => role.trim())
//           .filter((role) => role.length > 0);

//         if (cleanedRoles.length > 0) {
//           await tx.insert(staffRoles).values(
//             cleanedRoles.map((role) => ({
//               staffId,
//               role,
//             })),
//           );
//         }
//       }

//       // ---------------------------------------------------
//       // Update attraction assignments
//       //
//       // Only replace assignments when attractionIds were
//       // included in the request.
//       // ---------------------------------------------------

//       if (data.attractionIds !== undefined) {
//         await tx
//           .delete(staffAttractionAssignments)
//           .where(eq(staffAttractionAssignments.staffId, staffId));

//         if (data.attractionIds.length > 0) {
//           await tx.insert(staffAttractionAssignments).values(
//             data.attractionIds.map((attractionId) => ({
//               staffId,
//               attractionId,
//             })),
//           );
//         }
//       }

//       return staff;
//     });

//     // -----------------------------------------------------
//     // Response
//     // -----------------------------------------------------

//     return success({
//       staff: updatedStaff,
//     });
//   } catch (error) {
//     // -----------------------------------------------------
//     // Known errors
//     // -----------------------------------------------------

//     if (error instanceof Error) {
//       if (error.message === "UNAUTHORIZED") {
//         return failure("Authentication required.", 401, "UNAUTHORIZED");
//       }

//       if (error.message === "ACCOUNT_NOT_ACTIVE") {
//         return failure("Account is not active.", 403, "ACCOUNT_NOT_ACTIVE");
//       }

//       if (error.message === "STAFF_NOT_FOUND") {
//         return failure("Staff not found.", 404, "STAFF_NOT_FOUND");
//       }
//     }

//     console.error("Update staff error:", error);

//     return failure("Unable to update staff.", 500, "INTERNAL_SERVER_ERROR");
//   }
// }

// /* =========================================================
//    DELETE /api/admin/staff/[staffId]
// ========================================================= */

// export async function DELETE(
//   request: NextRequest,
//   {
//     params,
//   }: {
//     params: Promise<{
//       staffId: string;
//     }>;
//   },
// ) {
//   try {
//     // -----------------------------------------------------
//     // Authentication
//     // -----------------------------------------------------

//     const auth = await requireAuth(request);

//     if (auth.user.role !== "ADMIN") {
//       return failure("Admin access required.", 403, "FORBIDDEN");
//     }

//     const adminId = auth.user.id;

//     // -----------------------------------------------------
//     // Get staff ID
//     // -----------------------------------------------------

//     const { staffId } = await params;

//     if (!staffId) {
//       return failure("Staff ID is required.", 400, "STAFF_ID_REQUIRED");
//     }

//     // -----------------------------------------------------
//     // Verify staff belongs to this admin
//     // -----------------------------------------------------

//     const [existingStaff] = await db
//       .select({
//         id: users.id,
//         role: users.role,
//       })
//       .from(users)
//       .where(
//         and(
//           eq(users.id, staffId),
//           eq(users.role, "STAFF"),
//           eq(users.adminId, adminId),
//         ),
//       )
//       .limit(1);

//     if (!existingStaff) {
//       return failure("Staff not found.", 404, "STAFF_NOT_FOUND");
//     }

//     // -----------------------------------------------------
//     // Delete everything in a transaction
//     // -----------------------------------------------------

//     const deletedStaff = await db.transaction(async (tx) => {
//       // ---------------------------------------------------
//       // Delete staff roles
//       // ---------------------------------------------------

//       await tx.delete(staffRoles).where(eq(staffRoles.staffId, staffId));

//       // ---------------------------------------------------
//       // Delete attraction assignments
//       // ---------------------------------------------------

//       await tx
//         .delete(staffAttractionAssignments)
//         .where(eq(staffAttractionAssignments.staffId, staffId));

//       // ---------------------------------------------------
//       // Delete staff user
//       //
//       // IMPORTANT:
//       // adminId is included again as a final ownership
//       // safeguard.
//       // ---------------------------------------------------

//       const [staff] = await tx
//         .delete(users)
//         .where(
//           and(
//             eq(users.id, staffId),
//             eq(users.role, "STAFF"),
//             eq(users.adminId, adminId),
//           ),
//         )
//         .returning({
//           id: users.id,
//           name: users.name,
//           email: users.email,
//           role: users.role,
//         });

//       if (!staff) {
//         throw new Error("STAFF_DELETE_FAILED");
//       }

//       return staff;
//     });

//     // -----------------------------------------------------
//     // Response
//     // -----------------------------------------------------

//     return success({
//       message: "Staff deleted successfully.",
//       staff: deletedStaff,
//     });
//   } catch (error) {
//     // -----------------------------------------------------
//     // Authentication errors
//     // -----------------------------------------------------

//     if (error instanceof Error) {
//       if (error.message === "UNAUTHORIZED") {
//         return failure("Authentication required.", 401, "UNAUTHORIZED");
//       }

//       if (error.message === "ACCOUNT_NOT_ACTIVE") {
//         return failure("Account is not active.", 403, "ACCOUNT_NOT_ACTIVE");
//       }

//       if (error.message === "STAFF_DELETE_FAILED") {
//         return failure("Staff could not be deleted.", 404, "STAFF_NOT_FOUND");
//       }
//     }

//     console.error("Delete staff error:", error);

//     return failure("Unable to delete staff.", 500, "INTERNAL_SERVER_ERROR");
//   }
// }
import { NextRequest } from "next/server";

import { and, eq, ilike, inArray, or, sql } from "drizzle-orm";

import { db } from "@/db";

import {
  users,
  staffRoles,
  staffAttractionAssignments,
  attractions,
} from "@/db/schema";

import { requireAuth } from "@/lib/auth/require-auth";
import { hashPassword } from "@/lib/auth/password";

import { success, failure } from "@/lib/api/response";

import { z } from "zod";

/* =========================================================
   VALIDATION
========================================================= */

const createStaffSchema = z.object({
  name: z.string().min(2).max(150),

  email: z.string().email(),

  phone: z.string().max(20).optional(),

  password: z.string().min(8),

  roles: z.array(z.string().min(1)).optional().default([]),

  attractionIds: z.array(z.string().uuid()).optional().default([]),

  status: z
    .enum(["ACTIVE", "SUSPENDED", "DISABLED"])
    .optional()
    .default("ACTIVE"),
});

/* =========================================================
   STAFF ACCESS
========================================================= */

/**
 * Staff APIs can be viewed by:
 * - ADMIN
 * - MANAGER
 *
 * STAFF users cannot access these APIs.
 */
function canViewStaff(role: string) {
  return role === "ADMIN" || role === "MANAGER";
}

/**
 * Staff creation is restricted to ADMIN.
 */
function canCreateStaff(role: string) {
  return role === "ADMIN";
}

/* =========================================================
   GET /api/admin/staff
========================================================= */

export async function GET(request: NextRequest) {
  try {
    // -----------------------------------------------------
    // Authentication
    // -----------------------------------------------------

    const auth = await requireAuth(request);

    // -----------------------------------------------------
    // Authorization
    //
    // ADMIN + MANAGER can view staff.
    // -----------------------------------------------------

    if (!canViewStaff(auth.user.role)) {
      return failure("Admin or manager access required.", 403, "FORBIDDEN");
    }

    // -----------------------------------------------------
    // Determine tenant/admin owner
    //
    // ADMIN:
    //   auth.user.id = adminId
    //
    // MANAGER:
    //   auth.user.adminId = adminId
    //
    // This ensures managers only see staff belonging
    // to their own admin/tenant.
    // -----------------------------------------------------

    const adminId =
      auth.user.role === "ADMIN" ? auth.user.id : auth.user.adminId;

    if (!adminId) {
      return failure(
        "Unable to determine admin ownership.",
        403,
        "ADMIN_CONTEXT_NOT_FOUND",
      );
    }

    // -----------------------------------------------------
    // Query params
    // -----------------------------------------------------

    const { searchParams } = new URL(request.url);

    const pageParam = Number(searchParams.get("page") || "1");

    const limitParam = Number(searchParams.get("limit") || "10");

    const page = Number.isFinite(pageParam) ? Math.max(pageParam, 1) : 1;

    const limit = Number.isFinite(limitParam)
      ? Math.min(Math.max(limitParam, 1), 100)
      : 10;

    const search = searchParams.get("search")?.trim() || "";

    const status = searchParams.get("status");

    const attractionId = searchParams.get("attractionId");

    const offset = (page - 1) * limit;

    // -----------------------------------------------------
    // Validate attraction filter
    //
    // The attraction must belong to the authenticated
    // admin/tenant.
    // -----------------------------------------------------

    if (attractionId) {
      const [attraction] = await db
        .select({
          id: attractions.id,
        })
        .from(attractions)
        .where(
          and(
            eq(attractions.id, attractionId),
            eq(attractions.adminId, adminId),
          ),
        )
        .limit(1);

      if (!attraction) {
        return failure("Attraction not found.", 404, "ATTRACTION_NOT_FOUND");
      }
    }

    // -----------------------------------------------------
    // Base staff conditions
    // -----------------------------------------------------

    const conditions = [
      eq(users.role, "STAFF"),

      // CRITICAL:
      // Staff must belong to the authenticated admin.
      eq(users.adminId, adminId),
    ];

    // -----------------------------------------------------
    // Search
    // -----------------------------------------------------

    if (search) {
      conditions.push(
        or(
          ilike(users.name, `%${search}%`),
          ilike(users.email, `%${search}%`),
          ilike(users.phone, `%${search}%`),
        )!,
      );
    }

    // -----------------------------------------------------
    // Status filter
    // -----------------------------------------------------

    if (
      status === "ACTIVE" ||
      status === "SUSPENDED" ||
      status === "DISABLED"
    ) {
      conditions.push(eq(users.status, status));
    }

    // -----------------------------------------------------
    // Attraction filter
    // -----------------------------------------------------

    if (attractionId) {
      const assignedStaff = await db
        .select({
          staffId: staffAttractionAssignments.staffId,
        })
        .from(staffAttractionAssignments)
        .innerJoin(
          attractions,
          eq(staffAttractionAssignments.attractionId, attractions.id),
        )
        .where(
          and(
            eq(staffAttractionAssignments.attractionId, attractionId),

            // The attraction must belong to this admin.
            eq(attractions.adminId, adminId),
          ),
        );

      const staffIds = assignedStaff.map((item) => item.staffId);

      if (staffIds.length === 0) {
        return success({
          items: [],

          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
          },
        });
      }

      conditions.push(inArray(users.id, staffIds));
    }

    // -----------------------------------------------------
    // Total count
    // -----------------------------------------------------

    const [{ count }] = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(users)
      .where(and(...conditions));

    const total = Number(count);

    // -----------------------------------------------------
    // Staff list
    // -----------------------------------------------------

    const staff = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        status: users.status,
        joinedDate: users.createdAt,
      })
      .from(users)
      .where(and(...conditions))
      .orderBy(sql`${users.createdAt} DESC`)
      .limit(limit)
      .offset(offset);

    // -----------------------------------------------------
    // Attach roles + attractions
    // -----------------------------------------------------

    const staffWithDetails = await Promise.all(
      staff.map(async (member) => {
        // -----------------------------------------------
        // Staff roles
        // -----------------------------------------------

        const roles = await db
          .select({
            id: staffRoles.id,
            role: staffRoles.role,
          })
          .from(staffRoles)
          .where(eq(staffRoles.staffId, member.id));

        // -----------------------------------------------
        // Staff attractions
        // -----------------------------------------------

        const assignedAttractions = await db
          .select({
            id: attractions.id,
            name: attractions.name,
          })
          .from(staffAttractionAssignments)
          .innerJoin(
            attractions,
            eq(staffAttractionAssignments.attractionId, attractions.id),
          )
          .where(
            and(
              eq(staffAttractionAssignments.staffId, member.id),

              // Never expose another admin's attractions.
              eq(attractions.adminId, adminId),
            ),
          );

        return {
          ...member,
          roles,
          attractions: assignedAttractions,
        };
      }),
    );

    // -----------------------------------------------------
    // Response
    // -----------------------------------------------------

    return success({
      items: staffWithDetails,

      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return failure("Authentication required.", 401, "UNAUTHORIZED");
      }

      if (error.message === "ACCOUNT_NOT_ACTIVE") {
        return failure("Account is not active.", 403, "ACCOUNT_NOT_ACTIVE");
      }
    }

    console.error("Get staff error:", error);

    return failure("Unable to fetch staff.", 500, "INTERNAL_SERVER_ERROR");
  }
}

/* =========================================================
   POST /api/admin/staff
========================================================= */

export async function POST(request: Request) {
  try {
    // -----------------------------------------------------
    // Authentication
    // -----------------------------------------------------

    const auth = await requireAuth(request);

    // -----------------------------------------------------
    // Authorization
    //
    // Only ADMIN can create staff.
    // MANAGER can view but cannot create.
    // -----------------------------------------------------

    if (!canCreateStaff(auth.user.role)) {
      return failure("Admin access required.", 403, "FORBIDDEN");
    }

    // -----------------------------------------------------
    // Admin becomes staff owner
    // -----------------------------------------------------

    const adminId = auth.user.id;

    // -----------------------------------------------------
    // Validate request body
    // -----------------------------------------------------

    const body = await request.json();

    const parsed = createStaffSchema.safeParse(body);

    if (!parsed.success) {
      return failure("Invalid staff details.", 400, "VALIDATION_ERROR");
    }

    const { name, email, phone, password, roles, attractionIds, status } =
      parsed.data;

    const normalizedEmail = email.trim().toLowerCase();

    // -----------------------------------------------------
    // Check duplicate email
    // -----------------------------------------------------

    const [existingUser] = await db
      .select({
        id: users.id,
      })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existingUser) {
      return failure("Email already exists.", 409, "EMAIL_ALREADY_EXISTS");
    }

    // -----------------------------------------------------
    // Validate attractions
    //
    // Admin can only assign attractions belonging to
    // that same admin.
    // -----------------------------------------------------

    if (attractionIds.length > 0) {
      const existingAttractions = await db
        .select({
          id: attractions.id,
        })
        .from(attractions)
        .where(
          and(
            inArray(attractions.id, attractionIds),
            eq(attractions.adminId, adminId),
          ),
        );

      const existingAttractionIds = new Set(
        existingAttractions.map((attraction) => attraction.id),
      );

      const invalidAttractionIds = attractionIds.filter(
        (id) => !existingAttractionIds.has(id),
      );

      if (invalidAttractionIds.length > 0) {
        return failure(
          "One or more attractions are invalid or do not belong to this admin.",
          400,
          "INVALID_ATTRACTION",
        );
      }
    }

    // -----------------------------------------------------
    // Hash password
    // -----------------------------------------------------

    const passwordHash = await hashPassword(password);

    // -----------------------------------------------------
    // Create staff
    // -----------------------------------------------------

    const [staff] = await db
      .insert(users)
      .values({
        name: name.trim(),

        email: normalizedEmail,

        phone: phone?.trim() || null,

        passwordHash,

        role: "STAFF",

        status,

        // Staff belongs to this admin.
        adminId,
      })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        role: users.role,
        status: users.status,
        createdAt: users.createdAt,
      });

    if (!staff) {
      throw new Error("STAFF_CREATE_FAILED");
    }

    // -----------------------------------------------------
    // Insert staff roles
    // -----------------------------------------------------

    if (roles.length > 0) {
      await db.insert(staffRoles).values(
        roles.map((role) => ({
          staffId: staff.id,
          role: role.trim(),
        })),
      );
    }

    // -----------------------------------------------------
    // Insert attraction assignments
    // -----------------------------------------------------

    if (attractionIds.length > 0) {
      await db.insert(staffAttractionAssignments).values(
        attractionIds.map((attractionId) => ({
          staffId: staff.id,
          attractionId,
        })),
      );
    }

    // -----------------------------------------------------
    // Response
    // -----------------------------------------------------

    return success(
      {
        staff,
      },
      201,
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return failure("Authentication required.", 401, "UNAUTHORIZED");
      }

      if (error.message === "ACCOUNT_NOT_ACTIVE") {
        return failure("Account is not active.", 403, "ACCOUNT_NOT_ACTIVE");
      }
    }

    console.error("Create staff error:", error);

    return failure("Unable to create staff.", 500, "INTERNAL_SERVER_ERROR");
  }
}
