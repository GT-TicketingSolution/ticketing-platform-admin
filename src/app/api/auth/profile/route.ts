import { getProfile, updateProfile } from "@/services/profile.service";
import { updateProfileSchema } from "@/lib/validation/auth.schema";
import { success, failure } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/require-auth";

/* =========================================================
   GET PROFILE
   GET /api/auth/profile
========================================================= */

export async function GET(request: Request) {
  try {
    /*
     * Authenticate the request.
     * User ID comes from the session,
     * never from the request body.
     */
    const auth = await requireAuth(request);

    const profile = await getProfile(auth.user.id);

    return success({
      profile,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return failure("Authentication required.", 401, "UNAUTHORIZED");
    }

    if (error instanceof Error && error.message === "USER_NOT_FOUND") {
      return failure("User not found.", 404, "USER_NOT_FOUND");
    }

    if (error instanceof Error && error.message === "ACCOUNT_NOT_ACTIVE") {
      return failure("Account is not active.", 403, "ACCOUNT_NOT_ACTIVE");
    }

    console.error("Get profile error:", error);

    return failure("Unable to fetch profile.", 500, "INTERNAL_SERVER_ERROR");
  }
}

/* =========================================================
   PATCH PROFILE
   PATCH /api/auth/profile

   Editable:
   - name
   - email
   - phone
   - businessName (ADMIN only)

   Not editable:
   - id
   - role
   - status
   - password

   Business Name:
   - ADMIN: required and editable
   - MANAGER: not allowed
   - STAFF: not allowed
========================================================= */

export async function PATCH(request: Request) {
  try {
    /*
     * Authenticate the request.
     */
    const auth = await requireAuth(request);

    /*
     * Parse request body.
     */
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return failure("Invalid JSON body.", 400, "INVALID_JSON");
    }

    /*
     * Validate request body.
     */
    const parsed = updateProfileSchema.safeParse(body);

    if (!parsed.success) {
      return failure("Invalid profile details.", 400, "VALIDATION_ERROR");
    }

    /*
     * Update only the authenticated user's profile.
     *
     * businessName permissions are handled
     * inside updateProfile() based on the user's role.
     */
    const profile = await updateProfile(auth.user.id, parsed.data);

    return success({
      message: "Profile updated successfully.",
      profile,
    });
  } catch (error) {
    /*
     * Authentication error
     */
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return failure("Authentication required.", 401, "UNAUTHORIZED");
    }

    /*
     * User does not exist
     */
    if (error instanceof Error && error.message === "USER_NOT_FOUND") {
      return failure("User not found.", 404, "USER_NOT_FOUND");
    }

    /*
     * User is suspended/disabled
     */
    if (error instanceof Error && error.message === "ACCOUNT_NOT_ACTIVE") {
      return failure("Account is not active.", 403, "ACCOUNT_NOT_ACTIVE");
    }

    /*
     * Email already belongs to another user
     */
    if (error instanceof Error && error.message === "EMAIL_ALREADY_EXISTS") {
      return failure(
        "Email address is already in use.",
        409,
        "EMAIL_ALREADY_EXISTS",
      );
    }

    /*
     * Business name is required for ADMIN
     */
    if (error instanceof Error && error.message === "BUSINESS_NAME_REQUIRED") {
      return failure(
        "Business name is required for admin users.",
        400,
        "BUSINESS_NAME_REQUIRED",
      );
    }

    /*
     * MANAGER/STAFF attempted to update businessName
     */
    if (
      error instanceof Error &&
      error.message === "BUSINESS_NAME_NOT_ALLOWED"
    ) {
      return failure(
        "Only admin users can update business name.",
        403,
        "BUSINESS_NAME_NOT_ALLOWED",
      );
    }

    /*
     * Unexpected server/database error
     */
    console.error("Update profile error:", error);

    return failure("Unable to update profile.", 500, "INTERNAL_SERVER_ERROR");
  }
}
