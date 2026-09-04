"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { usePathname } from "next/navigation";
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
import { confirmLogout, showSuccessNotify, showAccessDeniedModal } from "@/lib/notify";
import { USER_ROLE_EVENT } from "@/hooks/useUserRole";
import { useSystemModules, SystemModule } from "@/hooks/useSystemModuleQueries";

/** Maps route pathname → browser tab title */
const PATH_TITLE_MAP: Record<string, string> = {
  "/dashboard":            "Dashboard | Ticketing Solution",
  "/manager-management":   "Manager Management | Ticketing Solution",
  "/staff-management":     "Staff Management | Ticketing Solution",
  "/seat-management":      "Seat Management | Ticketing Solution",
  "/attraction-management":"Attraction Management | Ticketing Solution",
  "/ticket-booking":       "Ticket Booking | Ticketing Solution",
  "/bookings":             "Bookings | Ticketing Solution",
  "/transactions":         "Transactions | Ticketing Solution",
  "/invoices":             "Scanner Invoices | Ticketing Solution",
  "/inventory":            "Inventory & Capacity | Ticketing Solution",
  "/customer-management":  "Customer Management | Ticketing Solution",
  "/complimentary-passes": "Complimentary Passes | Ticketing Solution",
  "/cctv-monitoring":      "CCTV Monitoring | Ticketing Solution",
  "/reports":              "Reports & Analytics | Ticketing Solution",
  "/scanner":              "Ticket Scanner | Ticketing Solution",
};

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

function resolveModuleTitle(pathname: string): string {
  const clean = (pathname || "").toLowerCase().replace(/\/$/, "");

  if (clean.includes("seat")) return "Seat Management";
  if (clean.includes("attraction")) return "Attraction Management";
  if (clean.includes("ticket") || clean.includes("booking-view")) return "Ticket Booking";
  if (clean.includes("booking")) return "Bookings";
  if (clean.includes("transaction")) return "Transactions";
  if (clean.includes("invoice")) return "Invoices";
  if (clean.includes("inventory")) return "Inventory & Capacity";
  if (clean.includes("customer")) return "Customer Management";
  if (clean.includes("complimentary") || clean.includes("pass")) return "Complimentary Passes";
  if (clean.includes("cctv")) return "CCTV Monitoring";
  if (clean.includes("report")) return "Reports & Analytics";
  if (clean.includes("scanner") || clean.includes("scan")) return "Ticket Scanner";
  if (clean.includes("manager")) return "Manager Management";
  if (clean.includes("staff")) return "Staff Management";
  if (clean.includes("dashboard")) return "Dashboard";

  const segment = clean.split("/").filter(Boolean)[0] || "";
  if (segment) {
    return segment
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }
  return "Dashboard";
}

/** Route definitions: maps route path prefixes to their module label */
const ROUTE_DEFINITIONS: { prefix: string; label: string }[] = [
  { prefix: "/manager-management", label: "Manager Management" },
  { prefix: "/staff-management", label: "Staff Management" },
  { prefix: "/seat-management", label: "Seat Management" },
  { prefix: "/attraction-management", label: "Attraction Management" },
  { prefix: "/ticket-booking", label: "Ticket Booking" },
  { prefix: "/bookings", label: "Bookings" },
  { prefix: "/transactions", label: "Transactions" },
  { prefix: "/invoices", label: "Scanner Invoices" },
  { prefix: "/inventory", label: "Inventory & Capacity" },
  { prefix: "/customer-management", label: "Customer Management" },
  { prefix: "/complimentary-passes", label: "Complimentary Passes" },
  { prefix: "/cctv-monitoring", label: "CCTV Monitoring" },
  { prefix: "/reports", label: "Reports & Analytics" },
  { prefix: "/scanner", label: "Ticket Scanner" },
  { prefix: "/dashboard", label: "Dashboard" },
];

/**
 * Inline route guard helper.
 * Returns whether the given pathname is accessible based on the
 * active system modules returned from the backend.
 */
function checkPathAllowed(
  pathname: string,
  systemModules?: SystemModule[] | null
): { allowed: boolean; moduleLabel: string } {
  const clean = (pathname || "").toLowerCase().replace(/\/$/, "");

  // Find which module this path requires
  let moduleLabel = "Dashboard";
  let routeHref = "/dashboard";
  for (const def of ROUTE_DEFINITIONS) {
    if (clean === def.prefix || clean.startsWith(`${def.prefix}/`)) {
      moduleLabel = def.label;
      routeHref = def.prefix;
      break;
    }
  }

  // If no modules loaded yet, allow (loading state)
  if (!systemModules || !Array.isArray(systemModules)) {
    return { allowed: true, moduleLabel };
  }

  // Empty list = no access to anything
  if (systemModules.length === 0) {
    return { allowed: false, moduleLabel };
  }

  // Build allowed hrefs from active modules
  const allowedHrefs = new Set<string>();
  for (const mod of systemModules) {
    const isActive =
      String(mod.isActive).toUpperCase() === "ACTIVE" ||
      (mod.isActive as unknown) === true;
    if (!isActive) continue;

    const rawKey = (mod.key || "").toLowerCase();
    const rawName = (mod.name || "").toLowerCase();

    for (const def of ROUTE_DEFINITIONS) {
      const defSlug = def.prefix.replace("/", ""); // e.g. "dashboard"
      const defClean = defSlug.replace(/-/g, "_"); // e.g. "manager_management"
      if (
        rawKey.includes(defSlug.replace(/-/g, "")) ||
        rawKey.includes(defClean) ||
        rawName.includes(defSlug.replace(/-/g, " ")) ||
        rawName.replace(/[^a-z0-9]/g, "_").includes(defClean)
      ) {
        allowedHrefs.add(def.prefix);
      }
    }
  }

  return {
    allowed: allowedHrefs.has(routeHref),
    moduleLabel,
  };
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);


  // Fetch active system modules for route guarding
  const {
    data: systemModules,
    isSuccess: isModulesSuccess,
  } = useSystemModules();


  // Ref to prevent triggering the modal multiple times for the same denied path
  const deniedPathRef = useRef<string | null>(null);

  /**
   * Route guard: fires whenever the user navigates to a new path.
   * If systemModules has loaded and the path is not in the allowed list,
   * show the persistent Access Denied modal → redirect to /login on OK.
   */
  useEffect(() => {
    if (!isModulesSuccess) return; // wait until modules are loaded
    if (deniedPathRef.current === pathname) return; // already handling this path

    const { allowed, moduleLabel } = checkPathAllowed(pathname, systemModules);

    if (!allowed) {
      deniedPathRef.current = pathname;
      showAccessDeniedModal(
        `You do not have permission to access the ${moduleLabel} module.`
      );
    } else {
      // Reset denied ref when navigating to an allowed path
      if (deniedPathRef.current === pathname) {
        deniedPathRef.current = null;
      }
    }
  }, [pathname, isModulesSuccess, systemModules]);

  // True when the current path is actively denied (block child rendering)
  const isCurrentPathDenied = useMemo(() => {
    if (!isModulesSuccess) return false;
    const { allowed } = checkPathAllowed(pathname, systemModules);
    return !allowed;
  }, [pathname, isModulesSuccess, systemModules]);

  /** Update browser title dynamically based on active sidebar module */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const activeName = resolveModuleTitle(pathname);
    const fullTitle = `${activeName} | Ticketing Solution`;
    document.title = fullTitle;

    const raf = requestAnimationFrame(() => {
      document.title = fullTitle;
    });
    const t1 = setTimeout(() => {
      document.title = fullTitle;
    }, 60);
    const t2 = setTimeout(() => {
      document.title = fullTitle;
    }, 200);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [pathname]);

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

      // Check if user just logged in and show welcome toast once on dashboard entry
      const flashUser = sessionStorage.getItem("ticketing_welcome_user");
      if (flashUser) {
        sessionStorage.removeItem("ticketing_welcome_user");
        showSuccessNotify(`Welcome back, ${flashUser}!`, "Login Successful");
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
          {/* Block page content when the route is not permitted —
              the Access Denied modal handles the UX, this prevents
              flashing the restricted page content behind it. */}
          {isCurrentPathDenied ? (
            <div
              style={{
                flex: 1,
                minHeight: "100%",
                background: colors.bg.page,
                pointerEvents: "none",
                userSelect: "none",
                opacity: 0,
              }}
              aria-hidden="true"
            />
          ) : (
            children
          )}

        </main>
      </div>
    </div>
  );
}
