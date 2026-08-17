import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import axiosInstance from "./axiosConfig";

/**
 * Standard API Response Shape from Next.js backend
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Handle API responses with proper data extraction.
 * Extracts `response.data.data` when wrapped in the standard success format,
 * or returns `response.data` directly.
 */
const handleResponse = <T>(response: AxiosResponse<ApiResponse<T> | T>): T => {
  if (!response || response.data === undefined) {
    throw new Error("Invalid response received from server");
  }

  // Check if response conforms to the standard { success: true, data: T } wrapper
  if (
    typeof response.data === "object" &&
    response.data !== null &&
    "success" in response.data &&
    "data" in response.data
  ) {
    return (response.data as ApiResponse<T>).data as T;
  }

  return response.data as T;
};

/**
 * Standardized error handling for rejected requests
 */
const handleError = (error: unknown): ApiResponse<never> => {
  if (axios.isAxiosError(error) && error.response?.data) {
    const errorData = error.response.data;
    if (typeof errorData === "object" && errorData !== null && "error" in errorData) {
      return errorData as ApiResponse<never>;
    }
    return {
      success: false,
      error: {
        code: String(error.response.status || "API_ERROR"),
        message: errorData.message || error.message || "Request failed",
      },
    };
  }

  return {
    success: false,
    error: {
      code: "NETWORK_ERROR",
      message: error instanceof Error ? error.message : "Network error or server unreachable",
    },
  };
};

/**
 * Generic GET request
 * @param url Request URL endpoint
 * @param config Optional Axios request configuration
 */
export const getData = async <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
  try {
    const response = await axiosInstance.get<ApiResponse<T> | T>(url, config);
    return handleResponse<T>(response);
  } catch (error) {
    throw handleError(error);
  }
};

/**
 * Generic POST request
 * @param url Request URL endpoint
 * @param data Request payload
 * @param config Optional Axios request configuration
 */
export const postData = async <T, D = unknown>(
  url: string,
  data?: D,
  config?: AxiosRequestConfig
): Promise<T> => {
  try {
    const response = await axiosInstance.post<ApiResponse<T> | T>(url, data, config);
    return handleResponse<T>(response);
  } catch (error) {
    throw handleError(error);
  }
};

/**
 * Generic PUT request
 * @param url Request URL endpoint
 * @param data Request payload
 * @param config Optional Axios request configuration
 */
export const putData = async <T, D = unknown>(
  url: string,
  data?: D,
  config?: AxiosRequestConfig
): Promise<T> => {
  try {
    const response = await axiosInstance.put<ApiResponse<T> | T>(url, data, config);
    return handleResponse<T>(response);
  } catch (error) {
    throw handleError(error);
  }
};

/**
 * Generic PATCH request
 * @param url Request URL endpoint
 * @param data Request payload
 * @param config Optional Axios request configuration
 */
export const patchData = async <T, D = unknown>(
  url: string,
  data?: D,
  config?: AxiosRequestConfig
): Promise<T> => {
  try {
    const response = await axiosInstance.patch<ApiResponse<T> | T>(url, data, config);
    return handleResponse<T>(response);
  } catch (error) {
    throw handleError(error);
  }
};

/**
 * Generic DELETE request
 * @param url Request URL endpoint
 * @param config Optional Axios request configuration
 */
export const deleteData = async <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
  try {
    const response = await axiosInstance.delete<ApiResponse<T> | T>(url, config);
    return handleResponse<T>(response);
  } catch (error) {
    throw handleError(error);
  }
};
