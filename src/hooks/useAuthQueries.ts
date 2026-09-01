import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { postData, getData, patchData } from "@/lib/api/apiService";
import { AppUrl } from "@/lib/api/endpoints";
import { showSuccessNotify } from "@/lib/notify";
import { showErrorOnce } from "@/lib/api/axiosConfig";
import { LoginRequestBody, LoginResponseData } from "@/app/(auth)/login/types";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  businessName: string | null;
}

export interface ProfileResponse {
  profile: UserProfile;
}

export interface UpdateProfileRequest {
  name: string;
  email: string;
  phone?: string;
  businessName?: string;
}


export interface UpdateProfileResponse {
  message: string;
  profile: UserProfile;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ChangePasswordResponse {
  message: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface ResetPasswordResponse {
  message: string;
}

export const authKeys = {
  all: ["auth"] as const,
  profile: () => [...authKeys.all, "profile"] as const,
};

/**
 * Module-level flag that is set to `true` the moment the user triggers
 * logout. All queries that use this flag will immediately become disabled,
 * preventing stale or unnecessary API calls (e.g. GET /profile) from firing
 * during the redirect to /login.
 */
let _isLoggingOut = false;

/** Set the logout flag — called inside useLogoutMutation before any cleanup. */
export function setLoggingOut() {
  _isLoggingOut = true;
}

/** Returns true when a logout is in progress. Used to gate queries. */
export function isLoggingOut(): boolean {
  return _isLoggingOut;
}

/**
 * TanStack Mutation Hook for User Login
 */
export function useLoginMutation() {
  const queryClient = useQueryClient();

  return useMutation<LoginResponseData, any, LoginRequestBody>({
    mutationFn: async (credentials: LoginRequestBody) => {
      return postData<LoginResponseData, LoginRequestBody>(
        AppUrl.auth.login,
        credentials
      );
    },
    onSuccess: (data) => {
      if (data?.user?.role) {
        const rawRole = String(data.user.role).toUpperCase();
        const formattedRole =
          rawRole === "STAFF" ? "Staff" : rawRole === "MANAGER" ? "Manager" : "Admin";
        if (typeof window !== "undefined") {
          sessionStorage.setItem("userRole", formattedRole);
          window.dispatchEvent(new Event("ticketing_user_role_changed"));
        }
      }
      /**
       * Invalidate the profile cache key so useProfileQuery (already running
       * in DashboardLayout) immediately refetches GET /api/auth/profile with
       * the correct { profile: { ... } } shape after a successful login.
       * Do NOT use setQueryData here — the login response returns a flat
       * user object, not the { profile: {...} } shape the query expects.
       */
      queryClient.invalidateQueries({ queryKey: authKeys.profile() });
      if (typeof window !== "undefined") {
        sessionStorage.setItem("ticketing_welcome_user", data?.user?.name || "User");
      }
    },
    onError: (error: any) => {
      const serverMessage =
        error?.error?.message ||
        error?.response?.data?.error?.message ||
        error?.message ||
        "Invalid email or password. Please try again.";
      showErrorOnce(serverMessage, "Login Failed");
    },
  });
}

/**
 * TanStack Mutation Hook for User Logout
 *
 * Performs a full cleanup on success:
 *  1. Cancels all in-flight React Query requests
 *  2. Calls POST /api/auth/logout  (revokes the server-side session cookie)
 *  3. Clears the entire React Query cache
 *  4. Wipes localStorage and sessionStorage completely
 *  5. Redirects to /login
 *
 * The confirmation popup is shown by the CALLER (Header) before invoking
 * this mutation, so the API is only hit after the user clicks "Yes, Logout".
 */
export function useLogoutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // 1. Set the logout flag immediately — this disables useProfileQuery
      //    and any other query that checks isLoggingOut(), preventing stale
      //    refetches from firing during the redirect.
      setLoggingOut();

      // 2. Synchronously clear the cache before the API call so no
      //    already-scheduled refetches (e.g. profile) can start.
      queryClient.cancelQueries();
      queryClient.removeQueries();

      return postData(AppUrl.auth.logout);
    },
    onSuccess: () => {
      // Wipe ALL browser storage
      if (typeof window !== "undefined") {
        try { localStorage.clear(); } catch { /* ignore */ }
        try { sessionStorage.clear(); } catch { /* ignore */ }
      }

      // Hard redirect to /login — unmounts all dashboard components
      if (typeof window !== "undefined") {
        window.location.replace("/login");
      }
    },
    onError: (error: any) => {
      // Reset flag if logout failed so profile query can resume
      _isLoggingOut = false;
      const message = error?.error?.message || error?.message || "Failed to logout. Please try again.";
      showErrorOnce(message, "Logout Error");
    },
  });
}


/**
 * TanStack Mutation Hook for Update Profile
 */
export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();

  return useMutation<UpdateProfileResponse, any, UpdateProfileRequest>({
    mutationFn: async (data: UpdateProfileRequest) => {
      return patchData<UpdateProfileResponse, UpdateProfileRequest>(
        AppUrl.auth.updateProfile,
        data
      );
    },
    onSuccess: (data) => {
      // Update the cached profile with fresh data from server
      queryClient.setQueryData(authKeys.profile(), { profile: data.profile });
      showSuccessNotify("Profile updated successfully!", "Profile Saved");
    },
    onError: (error: any) => {
      const serverMessage =
        error?.error?.message ||
        error?.response?.data?.error?.message ||
        error?.message ||
        "Failed to update profile. Please try again.";
      showErrorOnce(serverMessage, "Update Failed");
    },
  });
}

/**
 * TanStack Mutation Hook for Change Password
 */
export function useChangePasswordMutation() {
  return useMutation<ChangePasswordResponse, any, ChangePasswordRequest>({
    mutationFn: async (data: ChangePasswordRequest) => {
      return postData<ChangePasswordResponse, ChangePasswordRequest>(
        AppUrl.auth.changePassword,
        data
      );
    },
    onSuccess: (data) => {
      showSuccessNotify(
        data?.message || "Password changed successfully.",
        "Password Changed"
      );
    },
    onError: (error: any) => {
      const serverMessage =
        error?.error?.message ||
        error?.response?.data?.error?.message ||
        error?.message ||
        "Unable to change password.";
      showErrorOnce(serverMessage, "Change Password Failed");
    },
  });
}

/**
 * TanStack Mutation Hook for Forgot Password
 */
export function useForgotPasswordMutation() {
  return useMutation<ForgotPasswordResponse, any, ForgotPasswordRequest>({
    mutationFn: async (data: ForgotPasswordRequest) => {
      return postData<ForgotPasswordResponse, ForgotPasswordRequest>(
        AppUrl.auth.forgotPassword,
        data
      );
    },
  });
}

/**
 * TanStack Mutation Hook for Reset Password
 */
export function useResetPasswordMutation() {
  return useMutation<ResetPasswordResponse, any, ResetPasswordRequest>({
    mutationFn: async (data: ResetPasswordRequest) => {
      return postData<ResetPasswordResponse, ResetPasswordRequest>(
        AppUrl.auth.resetPassword,
        data
      );
    },
    onError: (error: any) => {
      const serverMessage =
        error?.error?.message ||
        error?.response?.data?.error?.message ||
        error?.message ||
        "Unable to reset password.";
      showErrorOnce(serverMessage, "Reset Password Failed");
    },
  });
}

/**
 * TanStack Query Hook for Profile
 * Enabled by default — always active so the dashboard layout can prefetch
 * the profile immediately after login.
 */
export function useProfileQuery(enabled = true) {
  return useQuery<ProfileResponse>({
    queryKey: authKeys.profile(),
    queryFn: async () => {
      return getData<ProfileResponse>(AppUrl.auth.getProfile);
    },
    // Never run when logout is in progress — prevents the profile API from
    // being called after the user clicks logout but before the page unloads.
    enabled: enabled && !_isLoggingOut,
    staleTime: 5 * 60 * 1000,
  });
}
