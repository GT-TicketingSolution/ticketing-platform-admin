"use client";

import { useMemo } from "react";
import { useUserRole } from "./useUserRole";

export interface StaffReportAccess {
  /** True if the user is a staff member */
  isStaff: boolean;
  /** True if user has permission to view reports (always true for Admin/Manager, conditional for Staff) */
  hasAccess: boolean;
  /** Restricted window in hours (null for Admin/Manager who have unrestricted access) */
  durationHours: number | null;
  /** Earliest date permitted in "YYYY-MM-DD" format (null for Admin/Manager) */
  minDate: string | null;
  /** Formatted duration label (e.g. "Past 24 Hours (1 Day)") */
  accessLabel: string;
  /** Loading state while role or profile or staff data is loading */
  isLoading: boolean;
}

export function useStaffReportAccess(): StaffReportAccess {
  const { role, isStaff, isLoading: isRoleLoading } = useUserRole();

  return useMemo(() => {
    // If not staff (Admin or Manager), full unrestricted access
    if (!isStaff && role !== "Staff") {
      return {
        isStaff: false,
        hasAccess: true,
        durationHours: null,
        minDate: null,
        accessLabel: "Full Historical Access",
        isLoading: isRoleLoading,
      };
    }

    let durationHours = 24; // default 24h

    // Check explicit timing saved in session or local storage
    if (typeof window !== "undefined") {
      const explicitHours =
        sessionStorage.getItem("staffReportTimingHours") ||
        sessionStorage.getItem("lastAssignedReportDurationHours") ||
        localStorage.getItem("staffReportTimingHours");
      if (explicitHours) {
        const parsedHours = Number(explicitHours);
        if (!isNaN(parsedHours) && parsedHours > 0) {
          durationHours = parsedHours;
        }
      } else {
        // Check role string in session storage if available
        try {
          const stored = sessionStorage.getItem("staffRoles");
          if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
              for (const r of parsed) {
                const lower = String(r).toLowerCase();
                const match = lower.match(/(\d+)\s*(h|hours?|d|days?)?/);
                if (match) {
                  const val = parseInt(match[1], 10);
                  const unit = match[2] || "h";
                  durationHours = unit.startsWith("d") ? val * 24 : val;
                  break;
                }
              }
            }
          }
        } catch {
          /* ignore */
        }
      }
    }

    // Ensure valid duration
    if (!durationHours || isNaN(durationHours) || durationHours <= 0) {
      durationHours = 24;
    }

    // Compute minDate (YYYY-MM-DD)
    const minTimestamp = Date.now() - durationHours * 60 * 60 * 1000;
    const minDateObj = new Date(minTimestamp);
    const minDate = minDateObj.toISOString().split("T")[0];

    const days = Math.round((durationHours / 24) * 10) / 10;
    const accessLabel =
      durationHours % 24 === 0
        ? `Past ${durationHours} Hours (${days} ${days === 1 ? "Day" : "Days"})`
        : `Past ${durationHours} Hours`;

    return {
      isStaff: true,
      hasAccess: true,
      durationHours,
      minDate,
      accessLabel,
      isLoading: false,
    };
  }, [role, isStaff, isRoleLoading]);
}
