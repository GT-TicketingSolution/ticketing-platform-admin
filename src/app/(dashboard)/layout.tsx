"use client";

import { useState, useEffect, useMemo } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { colors, spacing } from "@/lib/theme";
import {
  getManagerSession,
  getManagerAllowedModules,
  clearManagerSession,
} from "@/lib/managerAuth";
import { useProfileQuery, useLogoutMutation } from "@/hooks/useAuthQueries";
import { SIDEBAR_COLLAPSE_EVENT } from "@/components/ticket-booking/TicketBookingView";
import { confirmLogout } from "@/lib/notify";
import { USER_ROLE_EVENT } from "@/hooks/useUserRole";

/** Breakpoint below which we switch to mobile/tablet drawer mode */
const MOBILE_BREAKPOINT = 1024;

const ROLE_INITIALS: Record<string, string> = {
  Admin: "AD",
  Manager: "MG",
  Staff: "ST",
};

/** Maps the backend role enum value to a display-friendly label */
function toDisplayRole(raw: string | undefined | null): string {
  if (!raw) return "-";
  const upper = raw.toUpperCase();
  if (upper === "STAFF") return "Staff";
  if (upper === "MANAGER") return "Manager";
  if (upper === "ADMIN") return "Admin";
  return "-";
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isMobile, setIsMobile] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  /**
   * Eagerly prefetch the authenticated user's profile as soon as the
   * dashboard mounts (i.e. immediately after login).
   */
  const { data: profileData, isError: isProfileError } = useProfileQuery();
  const [mountedRole, setMountedRole] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("userRole");
      if (saved && saved !== "Admin" && saved !== "-") {
        setMountedRole(saved);
      }
    }
  }, []);

  /**
   * Derive the role from the authoritative profile API first.
   * If profile API has an error or role is missing, falls back to '-' (never defaults to Admin).
   */
  const userRole = useMemo(() => {
    if (isProfileError) return "-";
    if (profileData?.profile?.role) {
      return toDisplayRole(profileData.profile.role);
    }
    if (mountedRole) return mountedRole;
    return "-";
  }, [profileData?.profile?.role, mountedRole, isProfileError]);

  /** Keep sessionStorage in sync so other hooks (useUserRole, etc.) stay consistent */
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (userRole && userRole !== "-") {
        sessionStorage.setItem("userRole", userRole);
        window.dispatchEvent(new Event(USER_ROLE_EVENT));
      }
    }
  }, [userRole]);

  /** Modules the current manager is allowed to see (null = not a manager) */
  const managerAllowedModules = useMemo(() => {
    if (userRole === "Manager") {
      const session = getManagerSession();
      return getManagerAllowedModules(session);
    }
    return null;
  }, [userRole]);

  useEffect(() => {
    const checkBreakpoint = () => {
      const mobile = window.innerWidth < MOBILE_BREAKPOINT;
      setIsMobile(mobile);
      if (!mobile) setDrawerOpen(false);
    };
    checkBreakpoint();
    window.addEventListener("resize", checkBreakpoint);
    return () => window.removeEventListener("resize", checkBreakpoint);
  }, []);

  /** Listen for TicketBookingView sidebar collapse requests */
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ collapsed: boolean }>).detail;
      if (!isMobile) setCollapsed(detail.collapsed);
    };
    window.addEventListener(SIDEBAR_COLLAPSE_EVENT, handler);
    return () => window.removeEventListener(SIDEBAR_COLLAPSE_EVENT, handler);
  }, [isMobile]);

  const contentMarginLeft = isMobile
    ? 0
    : collapsed
      ? spacing.sidebarCollapsedWidth
      : spacing.sidebarWidth;

  const roleInitials = userRole && userRole !== "-"
    ? (ROLE_INITIALS[userRole] ?? userRole.slice(0, 2).toUpperCase())
    : "-";

  const logoutMutation = useLogoutMutation();

  const handleLogout = async () => {
    const confirmed = await confirmLogout();
    if (confirmed) {
      if (userRole === "Manager") clearManagerSession();
      logoutMutation.mutate();
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: colors.bg.page }}>
      <Sidebar
        collapsed={collapsed}
        drawerOpen={drawerOpen}
        isMobile={isMobile}
        roleName={userRole}
        roleInitials={roleInitials}
        managerAllowedModules={managerAllowedModules}
        onDesktopToggle={() => setCollapsed((p) => !p)}
        onDrawerClose={() => setDrawerOpen(false)}
        onLogout={handleLogout}
      />

      <div
        style={{
          marginLeft: `${contentMarginLeft}px`,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          minWidth: 0,
          transition: "margin-left 0.25s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        <Header
          isMobile={isMobile}
          userRole={userRole}
          onMenuClick={() => setDrawerOpen(true)}
          sidebarWidth={contentMarginLeft}
        />

        <main
          style={{
            flex: 1,
            padding: isMobile ? "16px" : "24px",
            paddingTop: `${spacing.headerHeight + (isMobile ? 16 : 24)}px`,
            boxSizing: "border-box",
            background: colors.bg.page,
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
