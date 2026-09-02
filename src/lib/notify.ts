/**
 * notify.ts
 * Central configuration and reusable helpers for notify-bolt notifications & confirmations.
 * Configured with sentence case messaging (First letter capital, rest small).
 */

import { showNotify, setNotifyDefaults } from "notify-bolt";
import { showToast } from "@/components/ui/Toast";

// Global defaults configuration
setNotifyDefaults({
  mode: "light",
  defaultSize: "sm",
  animation: "slide-up",
  confirmButtonText: "Yes",
  cancelButtonText: "No",
  allowOutsideClick: true,
  showCloseIcon: false,
});

/**
 * Reusable helper to show success notifications via Toast message across the entire application.
 */
export function showSuccessNotify(message: string = "Operation completed successfully!", title: string = "") {
  const text = message || title || "Operation completed successfully!";
  showToast(text, "success");
}

/**
 * Reusable helper to show error notify-bolt modal without auto-closing (for API errors).
 */
export function showErrorNotify(message: string = "An error occurred.", title: string = "Error") {
  return showNotify({
    title,
    message,
    variant: "classic",
    status: "error",
    allowOutsideClick: true,
    animation: "slide-up",
    size: "sm",
    showCloseIcon: true,
    showDenyButton: false,
    showCancelButton: false,
    showConfirmButton: true,
    confirmButtonText: "OK",
    focusConfirm: true,
    celebrate: false,
  });
}

// Deduplication flag — prevents multiple Access Denied modals from stacking
let _accessDeniedModalOpen = false;

/**
 * Shows a persistent "Access Denied" modal that:
 * - Cannot be dismissed by clicking outside (allowOutsideClick: false).
 * - Has no close (X) icon.
 * - Redirects the user to /login on OK.
 * - Does NOT clear localStorage (only logout should do that).
 *
 * Designed for MODULE_ACCESS_DENIED / 403 API errors.
 */
export async function showAccessDeniedModal(message?: string) {
  if (typeof window === "undefined") return;
  if (_accessDeniedModalOpen) return; // prevent stacking

  _accessDeniedModalOpen = true;

  try {
    await showNotify({
      title: "Access Denied",
      message: message || "You do not have permission to access this module.",
      variant: "classic",
      status: "error",
      animation: "slide-up",
      size: "sm",
      allowOutsideClick: false,
      showCloseIcon: false,
      showDenyButton: false,
      showCancelButton: false,
      showConfirmButton: true,
      confirmButtonText: "OK",
      focusConfirm: true,
      celebrate: false,
    });
  } catch {
    // dismissed
  } finally {
    _accessDeniedModalOpen = false;
    // Redirect to login — localStorage is NOT cleared here.
    // Only the explicit logout action should clear localStorage.
    window.location.replace("/login");
  }
}

// Deduplication flag — prevents multiple Session Expired modals from stacking
let _sessionExpiredModalOpen = false;

/**
 * Shows a persistent "Session Expired" modal that:
 * - Cannot be dismissed by clicking outside (allowOutsideClick: false).
 * - Has no close (X) icon.
 * - Redirects the user to /login on OK.
 * - Does NOT clear localStorage (only logout should do that).
 *
 * Designed for 401 Unauthorized / session timeout errors.
 */
export async function showSessionExpiredModal(message?: string) {
  if (typeof window === "undefined") return;
  if (_sessionExpiredModalOpen) return; // prevent stacking

  // Don't show if already on the login page
  if (window.location.pathname.startsWith("/login")) return;

  _sessionExpiredModalOpen = true;

  try {
    await showNotify({
      title: "Session Expired",
      message: message || "Your session has expired. Please log in again.",
      variant: "classic",
      status: "warning",
      animation: "slide-up",
      size: "sm",
      allowOutsideClick: false,
      showCloseIcon: false,
      showDenyButton: false,
      showCancelButton: false,
      showConfirmButton: true,
      confirmButtonText: "OK",
      focusConfirm: true,
      celebrate: false,
    });
  } catch {
    // dismissed
  } finally {
    _sessionExpiredModalOpen = false;
    // Redirect to login — localStorage is NOT cleared here.
    // Only the explicit logout action should clear localStorage.
    window.location.replace("/login");
  }
}


/**
 * Confirm before deleting a record — uses sentence case messaging.
 */
export async function confirmDelete(itemLabel: string): Promise<boolean> {
  try {
    const result = await showNotify({
      title: "Delete this item?",
      message: `This action is permanent. Do you wish to proceed with ${itemLabel}?`,
      variant: "classic",
      status: "warning",
      allowOutsideClick: true,
      animation: "slide-up",
      size: "sm",
      showCloseIcon: true,
      showConfirmButton: true,
      showCancelButton: true,
      confirmButtonText: "Yes",
      cancelButtonText: "No",
      focusConfirm: true,
      celebrate: false,
    });
    return result === "confirm";
  } catch {
    return false;
  }
}

/**
 * Confirm before adding a new record — uses sentence case messaging.
 */
export async function confirmAdd(itemLabel: string): Promise<boolean> {
  try {
    const result = await showNotify({
      title: "Add new record?",
      message: `Are you sure you want to add ${itemLabel}?`,
      variant: "classic",
      status: "warning",
      allowOutsideClick: true,
      animation: "slide-up",
      size: "sm",
      showCloseIcon: true,
      showConfirmButton: true,
      showCancelButton: true,
      confirmButtonText: "Yes",
      cancelButtonText: "No",
      focusConfirm: true,
      celebrate: false,
    });
    return result === "confirm";
  } catch {
    return false;
  }
}

/**
 * Confirm before sending a notification — uses sentence case messaging.
 */
export async function confirmNotify(recipient: string): Promise<boolean> {
  try {
    const result = await showNotify({
      title: "Send notification?",
      message: `Send a renewal reminder notification to "${recipient}"?`,
      variant: "classic",
      status: "warning",
      allowOutsideClick: true,
      animation: "slide-up",
      size: "sm",
      showCloseIcon: true,
      showConfirmButton: true,
      showCancelButton: true,
      confirmButtonText: "Yes",
      cancelButtonText: "No",
      focusConfirm: true,
      celebrate: false,
    });
    return result === "confirm";
  } catch {
    return false;
  }
}

/**
 * Confirm a status change — uses sentence case messaging.
 */
export async function confirmStatusChange(
  name: string,
  newStatus: string
): Promise<boolean> {
  try {
    const result = await showNotify({
      title: "Update request status?",
      message: `Do you wish to change the status of "${name}" to "${newStatus}"?`,
      variant: "classic",
      status: "warning",
      allowOutsideClick: true,
      animation: "slide-up",
      size: "sm",
      showCloseIcon: true,
      showConfirmButton: true,
      showCancelButton: true,
      confirmButtonText: "Yes",
      cancelButtonText: "No",
      focusConfirm: true,
      celebrate: false,
    });
    return result === "confirm";
  } catch {
    return false;
  }
}

/**
 * Confirm before logging out — warns the user their session will be ended.
 * No cancel button; top-right close icon provided instead.
 * "Yes, Logout" button styled in theme yellow (#F4BC43).
 */
export async function confirmLogout(): Promise<boolean> {
  try {
    const result = await showNotify({
      title: "Confirm logout?",
      message: "You will be logged out of your session. Any unsaved changes will be lost.",
      variant: "classic",
      status: "warning",
      allowOutsideClick: true,
      animation: "slide-up",
      size: "sm",
      showCloseIcon: true,
      showConfirmButton: true,
      showCancelButton: false,
      confirmButtonText: "Yes, Logout",
      focusConfirm: true,
      style: {
        button: {
          backgroundColor: "#F4BC43",
          color: "#011B2F",
          fontWeight: 600,
          borderRadius: "8px",
          padding: "8px 24px",
          border: "none",
          cursor: "pointer",
          boxShadow: "0 2px 8px rgba(244, 188, 67, 0.3)",
        },
      },
      celebrate: false,
    });
    return result === "confirm";
  } catch {
    return false;
  }
}
