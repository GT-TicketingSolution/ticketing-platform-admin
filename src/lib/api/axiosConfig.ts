import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { showNotify } from "notify-bolt";

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
    if (!error.response) {
      showErrorOnce(ERROR_MESSAGES.NETWORK_ERROR, "Connection Error");
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
        const title = isLoginRequest ? "Login Failed" : "Session Expired";
        showErrorOnce(serverMessage || (isLoginRequest ? "Invalid email or password." : ERROR_MESSAGES.UNAUTHORIZED), title);
        if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
          localStorage.removeItem("token");
          sessionStorage.removeItem("token");
        }
        break;
      }
      case 403:
        showErrorOnce(serverMessage || ERROR_MESSAGES.FORBIDDEN, "Access Denied");
        break;
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
