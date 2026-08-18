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
}

export interface ProfileResponse {
  profile: UserProfile;
}

export interface UpdateProfileRequest {
  name: string;
  email: string;
  phone?: string;
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
      showSuccessNotify(
        `Welcome back, ${data?.user?.name || "User"}!`,
        "Login Successful"
      );
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
      // Cancel any pending fetches so they don't race
      await queryClient.cancelQueries();
      return postData(AppUrl.auth.logout);
    },
    onSuccess: () => {
      // 1. Cancel all in-flight queries and remove from cache without triggering refetches
      queryClient.cancelQueries();
      queryClient.removeQueries();

      // 2. Wipe ALL browser storage
      if (typeof window !== "undefined") {
        try { localStorage.clear(); } catch { /* ignore */ }
        try { sessionStorage.clear(); } catch { /* ignore */ }
      }

      // 3. Perform a clean hard redirect to /login
      // This unmounts all dashboard components and cancels all network requests
      if (typeof window !== "undefined") {
        window.location.replace("/login");
      }
    },
    onError: (error: any) => {
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
    onError: (error: any) => {
      const serverMessage =
        error?.error?.message ||
        error?.response?.data?.error?.message ||
        error?.message ||
        "Unable to process password reset request.";
      showErrorOnce(serverMessage, "Request Failed");
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
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}
