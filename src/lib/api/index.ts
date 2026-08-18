/**
 * Central API Client Module
 * Exporting all API endpoints, Axios instance, and reusable HTTP helpers.
 */

export { default as axiosInstance, ERROR_MESSAGES, showErrorOnce } from "./axiosConfig";
export { AppUrl, default as endpoints } from "./endpoints";
export {
  getData,
  postData,
  putData,
  patchData,
  deleteData,
  type ApiResponse,
} from "./apiService";
