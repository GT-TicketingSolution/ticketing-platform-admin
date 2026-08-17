"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { colors, spacing } from "@/lib/theme";
import { ToastProvider } from "@/components/ui/Toast";
import {
  getManagerSession,
  getManagerAllowedModules,
  clearManagerSession,
} from "@/lib/managerAuth";
import { useProfileQuery, useLogoutMutation } from "@/hooks/useAuthQueries";
import { confirmLogout } from "@/lib/notify";

/** Breakpoint below which we switch to mobile/tablet drawer mode */
const MOBILE_BREAKPOINT = 1024;

const ROLE_INITIALS: Record<string, string> = {
  Admin: "AD",
  Manager: "MG",
  Staff: "ST",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isMobile, setIsMobile] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userRole, setUserRole] = useState("Admin");
  /** Modules the current manager is allowed to see (null = not a manager) */
  const [managerAllowedModules, setManagerAllowedModules] = useState<Set<string> | null>(null);

  /**
   * Eagerly prefetch the authenticated user's profile as soon as the
   * dashboard mounts (i.e. immediately after login). The result is
   * stored in React Query's cache so the Header and EditProfileModal
   * can read it instantly without an extra network round-trip.
   */
  useProfileQuery();

  useEffect(() => {
    const saved = sessionStorage.getItem("userRole") ?? "Admin";
    setUserRole(saved);

    if (saved === "Manager") {
      const session = getManagerSession();
      setManagerAllowedModules(getManagerAllowedModules(session));
    } else {
      setManagerAllowedModules(null);
    }
  }, []);

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

  const contentMarginLeft = isMobile
    ? 0
    : collapsed
      ? spacing.sidebarCollapsedWidth
      : spacing.sidebarWidth;

  const roleInitials = ROLE_INITIALS[userRole] ?? userRole.slice(0, 2).toUpperCase();

  const logoutMutation = useLogoutMutation();

  const handleLogout = async () => {
    const confirmed = await confirmLogout();
    if (confirmed) {
      if (userRole === "Manager") clearManagerSession();
      logoutMutation.mutate();
    }
  };

  return (
    <ToastProvider>
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
    </ToastProvider>
  );
}
