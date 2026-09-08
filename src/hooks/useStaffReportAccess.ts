"use client";

import { useMemo } from "react";
import { useUserRole } from "./useUserRole";
import { useProfileQuery } from "./useAuthQueries";

export interface StaffReportAccess {
  /** True if the user is a staff member */
  isStaff: boolean;
  /** True if user has permission to view reports (always true for Admin/Manager, conditional for Staff) */
  hasAccess: boolean;
  /** Restricted window in hours (null for Admin/Manager who have unrestricted access) */
  durationHours: number | null;
  /** Raw report access timing from profile (e.g. 72) */
  reportAccessTiming: number | null;
  /** Raw report access unit from profile (e.g. "HOURS") */
  reportAccessUnit: string | null;
  /** Earliest date permitted in "YYYY-MM-DD" format (null for Admin/Manager) */
  minDate: string | null;
  /** Formatted duration label (e.g. "Past 72 Hours (3 Days)") */
  accessLabel: string;
  /** Loading state while role or profile or staff data is loading */
  isLoading: boolean;
}

export function useStaffReportAccess(): StaffReportAccess {
  const { role, isStaff: isStaffRole, isLoading: isRoleLoading } = useUserRole();
  const { data: profileData, isLoading: isProfileLoading } = useProfileQuery();
  const profile = profileData?.profile;

  return useMemo(() => {
    const isStaff =
      isStaffRole ||
      role === "Staff" ||
      profile?.role?.toUpperCase() === "STAFF";

    if (isRoleLoading || isProfileLoading) {
      return {
        isStaff,
        hasAccess: false,
        durationHours: null,
        reportAccessTiming: null,
        reportAccessUnit: null,
        minDate: null,
        accessLabel: "",
        isLoading: true,
      };
    }

    // If not staff (Admin or Manager), full unrestricted access
    if (!isStaff) {
      return {
        isStaff: false,
        hasAccess: true,
        durationHours: null,
        reportAccessTiming: null,
        reportAccessUnit: null,
        minDate: null,
        accessLabel: "Full Historical Access",
        isLoading: false,
      };
    }

    // Strictly read reportAccessTiming & reportAccessUnit from the profile API response
    const timing = profile?.reportAccessTiming;
    const rawUnit = profile?.reportAccessUnit
      ? String(profile.reportAccessUnit).toUpperCase()
      : "";

    // No mock data or frontend defaults allowed
    if (
      timing === null ||
      timing === undefined ||
      typeof timing !== "number" ||
      timing <= 0 ||
      !rawUnit ||
      (rawUnit !== "HOURS" && rawUnit !== "DAYS")
    ) {
      return {
        isStaff: true,
        hasAccess: false,
        durationHours: null,
        reportAccessTiming: null,
        reportAccessUnit: null,
        minDate: null,
        accessLabel: "Access Not Configured",
        isLoading: false,
      };
    }

    const durationHours = rawUnit === "DAYS" ? timing * 24 : timing;
    const days = rawUnit === "DAYS" ? timing : Math.round((timing / 24) * 10) / 10;

    let accessLabel = "";
    if (rawUnit === "HOURS") {
      if (timing >= 24 && timing % 24 === 0) {
        const d = timing / 24;
        accessLabel = `Past ${timing} Hours (${d} ${d === 1 ? "Day" : "Days"})`;
      } else {
        accessLabel = `Past ${timing} Hours`;
      }
    } else {
      // DAYS
      accessLabel = `Past ${timing * 24} Hours (${timing} ${timing === 1 ? "Day" : "Days"})`;
    }

    // Compute minDate (YYYY-MM-DD) based on authorized window
    const now = new Date();
    const minDateObj = new Date(now);
    if (rawUnit === "HOURS") {
      minDateObj.setHours(minDateObj.getHours() - timing);
    } else {
      minDateObj.setDate(minDateObj.getDate() - timing);
    }
    const y = minDateObj.getFullYear();
    const m = String(minDateObj.getMonth() + 1).padStart(2, "0");
    const d = String(minDateObj.getDate()).padStart(2, "0");
    const minDate = `${y}-${m}-${d}`;

    return {
      isStaff: true,
      hasAccess: true,
      durationHours,
      reportAccessTiming: timing,
      reportAccessUnit: rawUnit,
      minDate,
      accessLabel,
      isLoading: false,
    };
  }, [role, isStaffRole, isRoleLoading, isProfileLoading, profile]);
}
