/**
 * notify.ts
 * Central configuration and reusable helpers for notify-bolt notifications & confirmations.
 * Configured with sentence case messaging (First letter capital, rest small).
 */

import { showNotify, setNotifyDefaults } from "notify-bolt";

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
 * Reusable helper to show success notify-bolt modal.
 */
export function showSuccessNotify(message: string = "This is a test message!", title: string = "") {
  return showNotify({
    title,
    message,
    variant: "classic",
    status: "success",
    allowOutsideClick: true,
    animation: "slide-up",
    size: "sm",
    showCloseIcon: false,
    showDenyButton: false,
    showCancelButton: false,
    showConfirmButton: false,
    timer: 2500,
    timerProgressBar: false,
    focusConfirm: true,
    celebrate: false,
  });
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
      showCloseIcon: false,
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
      showCloseIcon: false,
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
      showCloseIcon: false,
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
      showCloseIcon: false,
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
