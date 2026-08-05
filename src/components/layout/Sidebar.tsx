"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Ticket,
  BookOpen,
  CircleDollarSign,
  FileText,
  Boxes,
  Cctv,
  Landmark,
  UserRound,
  ClipboardList,
  BarChart2,
  Users,
  Settings,
  CloudUpload,
  LogOut,
  AlignRight,
  X,
} from "lucide-react";
import { colors, typography } from "@/lib/theme";

// ─── Nav items ───────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { label: "Ticket Booking", href: "/ticket-booking", icon: Ticket },
  { label: "Bookings", href: "/bookings", icon: BookOpen },
  { label: "Transactions", href: "/transactions", icon: CircleDollarSign },
  { label: "Invoices", href: "/invoices", icon: FileText },
  { label: "Inventory / Capacity", href: "/inventory", icon: Boxes },
  { label: "CCTV Monitoring", href: "/cctv-monitoring", icon: Cctv },
  { label: "Attraction Management", href: "/attraction-management", icon: Landmark },
  { label: "Customer Management", href: "/customer-management", icon: UserRound },
  { label: "Complimentary Passes", href: "/complimentary-passes", icon: ClipboardList },
  { label: "Reports", href: "/reports", icon: BarChart2 },
  { label: "User Management", href: "/user-management", icon: Users },
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "Backup", href: "/backup", icon: CloudUpload },
];


function PortalTooltip({
  label,
  anchorRef,
  visible,
}: {
  label: string;
  anchorRef: React.RefObject<HTMLElement | null>;
  visible: boolean;
}) {
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (visible && anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setCoords({
        top: rect.top + rect.height / 2,
        left: rect.right + 12,
      });
    }
  }, [visible, anchorRef]);

  if (!visible || !mounted) return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        top: coords.top,
        left: coords.left,
        transform: "translateY(-50%)",
        background: colors.sidebar.tooltipBg,
        color: colors.sidebar.tooltipText,
        fontFamily: typography.fontFamily.sans,
        fontSize: "13px",
        fontWeight: typography.fontWeight.medium,
        padding: "6px 12px",
        borderRadius: "6px",
        whiteSpace: "nowrap",
        pointerEvents: "none",
        zIndex: 99999,
        boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
      }}
    >
      {/* Left arrow */}
      <span
        style={{
          position: "absolute",
          right: "100%",
          top: "50%",
          transform: "translateY(-50%)",
          borderWidth: "5px",
          borderStyle: "solid",
          borderColor: `transparent ${colors.sidebar.tooltipBg} transparent transparent`,
        }}
      />
      {label}
    </div>,
    document.body
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NavItem with portal tooltip
// ─────────────────────────────────────────────────────────────────────────────
function NavItem({
  label,
  href,
  icon: Icon,
  isActive,
  isIconOnly,
}: {
  label: string;
  href: string;
  icon: React.ElementType;
  isActive: boolean;
  isIconOnly: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <Link
        href={href}
        style={{ textDecoration: "none", display: "block", padding: "3px 10px" }}
      >
        <div
          ref={anchorRef as React.RefObject<HTMLDivElement>}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: isIconOnly ? 0 : "12px",
            padding: isIconOnly ? "9px 0" : "8px 10px",
            borderRadius: "8px",
            background: isActive
              ? colors.sidebar.activeBg
              : hovered
                ? colors.sidebar.hoverBg
                : "transparent",
            transition: "background 0.18s ease",
            cursor: "pointer",
            justifyContent: isIconOnly ? "center" : "flex-start",
          }}
        >
          <span
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "20px",
              height: "20px",
              flexShrink: 0,
            }}
          >
            <Icon
              size={18}
              color={isActive ? colors.sidebar.activeIconColor : colors.sidebar.iconColor}
              strokeWidth={isActive ? 2 : 1.5}
            />
          </span>

          {!isIconOnly && (
            <span
              style={{
                fontFamily: typography.fontFamily.sans,
                fontWeight: isActive
                  ? typography.fontWeight.bold
                  : typography.fontWeight.medium,
                fontSize: "14px",
                lineHeight: "20px",
                color: isActive ? colors.sidebar.activeText : colors.sidebar.itemText,
                whiteSpace: "nowrap",
                overflow: "hidden",
              }}
            >
              {label}
            </span>
          )}
        </div>
      </Link>

      {/* Tooltip renders in document.body via portal – never clipped */}
      {isIconOnly && (
        <PortalTooltip
          label={label}
          anchorRef={anchorRef as React.RefObject<HTMLElement | null>}
          visible={hovered}
        />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LogoutItem with portal tooltip
// ─────────────────────────────────────────────────────────────────────────────
function LogoutItem({ isIconOnly }: { isIconOnly: boolean }) {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    router.push("/login");
  };

  return (
    <div style={{ padding: "8px 10px 24px 10px", flexShrink: 0 }}>
      <div
        ref={anchorRef}
        onClick={handleLogout}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: isIconOnly ? 0 : "12px",
          padding: isIconOnly ? "9px 0" : "8px 10px",
          borderRadius: "8px",
          cursor: "pointer",
          background: hovered ? colors.sidebar.hoverBg : "transparent",
          transition: "background 0.18s ease",
          justifyContent: isIconOnly ? "center" : "flex-start",
        }}
      >
        <span
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "22px",
            height: "22px",
            flexShrink: 0,
          }}
        >
          <LogOut size={20} color={colors.sidebar.iconColor} strokeWidth={1.5} />
        </span>
        {!isIconOnly && (
          <span
            style={{
              fontFamily: typography.fontFamily.sans,
              fontWeight: typography.fontWeight.medium,
              fontSize: "14px",
              lineHeight: "20px",
              color: colors.sidebar.itemText,
            }}
          >
            Logout
          </span>
        )}
      </div>

      {isIconOnly && (
        <PortalTooltip
          label="Logout"
          anchorRef={anchorRef as React.RefObject<HTMLElement | null>}
          visible={hovered}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar
// ─────────────────────────────────────────────────────────────────────────────
interface SidebarProps {
  collapsed: boolean;
  drawerOpen: boolean;
  isMobile: boolean;
  onDesktopToggle: () => void;
  onDrawerClose: () => void;
}

export default function Sidebar({
  collapsed,
  drawerOpen,
  isMobile,
  onDesktopToggle,
  onDrawerClose,
}: SidebarProps) {
  const pathname = usePathname();

  // Close drawer on route change
  const closeDrawer = useCallback(onDrawerClose, [onDrawerClose]);
  useEffect(() => {
    if (isMobile && drawerOpen) closeDrawer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const desktopWidth = collapsed
    ? colors.sidebar.collapsedWidth
    : colors.sidebar.width;

  const isIconOnly = !isMobile && collapsed;

  const sidebarStyle: React.CSSProperties = isMobile
    ? {
      width: `${colors.sidebar.width}px`,
      minWidth: `${colors.sidebar.width}px`,
      height: "100vh",
      background: colors.sidebar.bg,
      display: "flex",
      flexDirection: "column",
      position: "fixed",
      left: drawerOpen ? 0 : `-${colors.sidebar.width}px`,
      top: 0,
      zIndex: 60,
      overflowY: "auto",
      overflowX: "hidden",
      transition: "left 0.28s cubic-bezier(0.4,0,0.2,1)",
    }
    : {
      width: `${desktopWidth}px`,
      minWidth: `${desktopWidth}px`,
      height: "100vh",
      background: colors.sidebar.bg,
      display: "flex",
      flexDirection: "column",
      position: "fixed",
      left: 0,
      top: 0,
      zIndex: 50,
      // Do NOT set overflowX:hidden here so tooltips are visible,
      // but we clip only when expanded to prevent label overflow
      overflowY: "auto",
      overflowX: isIconOnly ? "visible" : "hidden",
      transition: "width 0.25s cubic-bezier(0.4,0,0.2,1)",
    };

  return (
    <>
      {/* Mobile backdrop */}
      {isMobile && drawerOpen && (
        <div
          onClick={onDrawerClose}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            zIndex: 59,
            backdropFilter: "blur(2px)",
          }}
        />
      )}

      <aside style={sidebarStyle}>
        {/* ── Top bar ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: isIconOnly ? "center" : "flex-end",
            padding: "14px",
            minHeight: "76px",
            flexShrink: 0,
          }}
        >
          {isMobile ? (
            // Mobile: X close button
            <button
              onClick={onDrawerClose}
              aria-label="Close sidebar"
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "6px",
                marginLeft: "auto",
              }}
              className="sidebar-toggle-btn"
            >
              <X size={22} color={colors.sidebar.iconColor} />
            </button>
          ) : (
            // Desktop: collapse toggle
            <button
              onClick={onDesktopToggle}
              aria-label="Toggle sidebar"
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "6px",
              }}
              className="sidebar-toggle-btn"
            >
              <AlignRight size={24} color={colors.sidebar.iconColor} />
            </button>
          )}
        </div>

        {/* ── Divider ── */}
        <div
          style={{
            height: "1px",
            background: colors.sidebar.divider,
            flexShrink: 0,
          }}
        />

        {/* ── Navigation ── */}
        <nav style={{ flex: 1, padding: "8px 0" }}>
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <NavItem
                key={item.href}
                label={item.label}
                href={item.href}
                icon={item.icon}
                isActive={isActive}
                isIconOnly={isIconOnly}
              />
            );
          })}
        </nav>

        {/* ── Logout ── */}
        <LogoutItem isIconOnly={isIconOnly} />

        {/* ── Scoped styles ── */}
        <style>{`
          .sidebar-toggle-btn:hover {
            background: ${colors.sidebar.hoverBg} !important;
          }
          aside::-webkit-scrollbar { width: 3px; }
          aside::-webkit-scrollbar-track { background: transparent; }
          aside::-webkit-scrollbar-thumb {
            background: ${colors.sidebar.divider};
            border-radius: 4px;
          }
        `}</style>
      </aside>
    </>
  );
}
