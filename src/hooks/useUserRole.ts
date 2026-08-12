"use client";

import { useState, useEffect, useCallback } from "react";
import { getManagerSession, getManagerAllowedModules, StoredManager } from "@/lib/managerAuth";

export type UserRole = "Admin" | "Manager" | "Staff";

export const USER_ROLE_EVENT = "ticketing_user_role_changed";

export function useUserRole() {
  const [role, setRoleState] = useState<UserRole>("Admin");
  const [managerSession, setManagerSession] = useState<ReturnType<typeof getManagerSession>>(null);
  const [managerAllowedModules, setManagerAllowedModules] = useState<Set<string> | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const syncRoleFromStorage = useCallback(() => {
    if (typeof window === "undefined") return;
    const saved = (sessionStorage.getItem("userRole") as UserRole) || "Admin";
    setRoleState(saved);

    if (saved === "Manager") {
      const session = getManagerSession();
      setManagerSession(session);
      setManagerAllowedModules(getManagerAllowedModules(session));
    } else {
      setManagerSession(null);
      setManagerAllowedModules(null);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    syncRoleFromStorage();

    const handleStorage = () => syncRoleFromStorage();
    window.addEventListener("storage", handleStorage);
    window.addEventListener(USER_ROLE_EVENT, handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(USER_ROLE_EVENT, handleStorage);
    };
  }, [syncRoleFromStorage]);

  const setRole = useCallback((newRole: UserRole) => {
    sessionStorage.setItem("userRole", newRole);
    setRoleState(newRole);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(USER_ROLE_EVENT));
    }
  }, []);

  const hasPermission = useCallback(
    (moduleName: string): boolean => {
      if (role === "Admin") return true;
      if (role === "Staff") {
        return ["Ticket Booking", "Scanner"].includes(moduleName);
      }
      if (role === "Manager") {
        if (!managerAllowedModules) return true; // Full manager access default if no restrict array
        return managerAllowedModules.has(moduleName);
      }
      return false;
    },
    [role, managerAllowedModules]
  );

  return {
    role,
    setRole,
    isLoading,
    isAdmin: role === "Admin",
    isManager: role === "Manager",
    isStaff: role === "Staff",
    managerSession,
    managerAllowedModules,
    hasPermission,
  };
}
