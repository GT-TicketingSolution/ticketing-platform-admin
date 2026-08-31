import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { showNotify } from "notify-bolt";
import { showAccessDeniedModal, showSessionExpiredModal } from "@/lib/notify";

// ── Default Error Messages 
export const ERROR_MESSAGES = {
  BAD_REQUEST: "Invalid request data. Please check your inputs.",
  UNAUTHORIZED: "Your session has expired. Please log in again.",
  FORBIDDEN: "You do not have permission to perform this action.",
  RESOURCE_NOT_FOUND: "The requested resource was not found.",
  CONFLICT: "A record with this information already exists.",
  SERVER_ERROR: "An internal server error occurred. Please try again later.",
  UNEXPECTED_ERROR: "Something went wrong. Please try again.",
  NETWORK_ERROR: "Network error. Please check your internet connection.",
  TIMEOUT: "The request took too long. Please try again later.",
} as const;

// ── Toast Deduplication 
// Tracks the last time each error message was toasted to prevent duplicate toasts.
const toastTimestamps = new Map<string, number>();
const TOAST_COOLDOWN_MS = 4000;

export const showErrorOnce = (message: string, title: string = "Error") => {
  if (typeof window === "undefined") return; // SSR safe

  const now = Date.now();
  const lastShown = toastTimestamps.get(message) || 0;
  if (now - lastShown < TOAST_COOLDOWN_MS) return; // Suppress duplicate

  toastTimestamps.set(message, now);

  try {
    showNotify({
      title,
      message,
      variant: "classic",
      status: "error",
      size: "sm",
      showCloseIcon: true,
      showConfirmButton: true,
      confirmButtonText: "OK",
      allowOutsideClick: true,
    });
  } catch {
    console.error(`[API Error]: ${message}`);
  }
};

// Axios Instance
const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "/api",
  withCredentials: true, // Required for cookie session handling
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

//Request Interceptor 
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      // Add Bearer token if present and no explicit Authorization header is set
      if (token && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError<{ success?: boolean; error?: { message?: string; code?: string }; message?: string }>) => {
    // Skip global error modal for endpoints that handle inline errors (e.g. forgot-password)
    const isForgotPassword = error.config?.url?.includes("/auth/forgot-password");
    if ((error.config as any)?.skipErrorToast || isForgotPassword) {
      return Promise.reject(error);
    }

    if (!error.response) {
      // Detect axios timeout (ECONNABORTED) or fetch-level network timeout
      const isTimeout =
        error.code === "ECONNABORTED" ||
        error.code === "ERR_NETWORK" ||
        (error.message && error.message.toLowerCase().includes("timeout"));

      if (isTimeout) {
        showErrorOnce(ERROR_MESSAGES.TIMEOUT, "Request Timed Out");
      } else {
        showErrorOnce(ERROR_MESSAGES.NETWORK_ERROR, "Connection Error");
      }
      return Promise.reject(error);
    }

    const status = error.response.status;
    const serverMessage =
      error.response.data?.error?.message ||
      error.response.data?.message;

    switch (status) {
      case 400:
        showErrorOnce(serverMessage || ERROR_MESSAGES.BAD_REQUEST, "Validation Error");
        break;
      case 401: {
        const isLoginRequest = error.config?.url?.includes("/auth/login");
        if (isLoginRequest) {
          // Login page failure — plain toast is fine (user is already on /login)
          showErrorOnce(
            serverMessage || "Invalid email or password.",
            "Login Failed"
          );
        } else {
          // Session expired while inside the dashboard —
          // Persistent modal: outside click disabled, OK redirects to /login
          showSessionExpiredModal(
            serverMessage || ERROR_MESSAGES.UNAUTHORIZED
          );
        }
        break;
      }
      case 403: {
        const errorCode = error.response.data?.error?.code || "";
        const isModuleDenied =
          errorCode === "MODULE_ACCESS_DENIED" ||
          serverMessage?.toLowerCase().includes("permission") ||
          serverMessage?.toLowerCase().includes("access");
        if (isModuleDenied) {
          // Persistent modal — blocks outside click, redirects to /login on OK
          showAccessDeniedModal(serverMessage);
        } else {
          showErrorOnce(serverMessage || ERROR_MESSAGES.FORBIDDEN, "Access Denied");
        }
        break;
      }
      case 404:
        showErrorOnce(serverMessage || ERROR_MESSAGES.RESOURCE_NOT_FOUND, "Not Found");
        break;
      case 409:
        showErrorOnce(serverMessage || ERROR_MESSAGES.CONFLICT, "Conflict");
        break;
      case 500:
        showErrorOnce(serverMessage || ERROR_MESSAGES.SERVER_ERROR, "Server Error");
        break;
      default:
        showErrorOnce(serverMessage || ERROR_MESSAGES.UNEXPECTED_ERROR, "Error");
        break;
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
