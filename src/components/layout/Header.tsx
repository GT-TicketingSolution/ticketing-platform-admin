"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Bell,
  AlignRight,
  ChevronDown,
  Settings,
  KeyRound,
  LogOut,
  Landmark,
  Ticket,
  BookOpen,
  CircleDollarSign,
  FileText,
  Boxes,
  Cctv,
  UserRound,
  ClipboardList,
  BarChart2,
  Users,
  UserCheck,
  UserCog,
  ScanLine,
  LayoutDashboard,
} from "lucide-react";
import { colors, typography, spacing } from "@/lib/theme";
import ChangePasswordModal from "@/components/modals/ChangePasswordModal";
import EditProfileModal from "@/components/modals/EditProfileModal";

interface HeaderProps {
  title?: string;
  isMobile?: boolean;
  userRole?: string;
  onMenuClick?: () => void;
  /** Left offset = current sidebar width so header spans the content area */
  sidebarWidth?: number;
}

const ROUTE_HEADER_MAP: Record<string, { title: string; icon: React.ElementType }> = {
  "/attraction-management": { title: "Attraction Management", icon: Landmark },
  "/ticket-booking": { title: "Ticket Booking", icon: Ticket },
  "/bookings": { title: "Bookings", icon: BookOpen },
  "/transactions": { title: "Transactions", icon: CircleDollarSign },
  "/invoices": { title: "Invoices", icon: FileText },
  "/inventory": { title: "Inventory / Capacity", icon: Boxes },
  "/cctv-monitoring": { title: "CCTV Monitoring", icon: Cctv },
  "/customer-management": { title: "Customer Management", icon: UserRound },
  "/complimentary-passes": { title: "Complimentary Passes", icon: ClipboardList },
  "/reports": { title: "Reports", icon: BarChart2 },
  "/user-management": { title: "User Management", icon: Users },
  "/manager-management": { title: "Manager Management", icon: UserCheck },
  "/staff-management": { title: "Staff Management", icon: UserCog },
  "/dashboard": { title: "Dashboard", icon: LayoutDashboard },
  "/manager-dashboard": { title: "Manager Dashboard", icon: LayoutDashboard },
  "/staff-dashboard": { title: "Staff Dashboard", icon: LayoutDashboard },
  "/scanner": { title: "Ticket Scanner", icon: ScanLine },
  "/settings": { title: "Settings", icon: Settings },
};

export default function Header({
  title: propTitle = "",
  isMobile = false,
  userRole,
  onMenuClick,
  sidebarWidth = spacing.sidebarWidth,
}: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [bellHovered, setBellHovered] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [displayRole, setDisplayRole] = useState(userRole || "Admin");

  useEffect(() => {
    if (userRole) {
      setDisplayRole(userRole);
    } else if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("userRole");
      if (saved) setDisplayRole(saved);
    }
  }, [userRole]);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Derive dynamic header info based on pathname if title prop is omitted
  const matchedRoute = ROUTE_HEADER_MAP[pathname] || {
    title: propTitle || "Attraction Management",
    icon: Landmark,
  };
  const activeTitle = propTitle || matchedRoute.title;
  const ActiveIcon = matchedRoute.icon;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = () => {
    setProfileDropdownOpen(false);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("userRole");
      sessionStorage.removeItem("manager_session");
    }
    router.push("/login");
  };

  const menuItems = [
    {
      icon: <Settings size={15} />,
      label: "Settings",
      onClick: () => {
        setProfileDropdownOpen(false);
        setShowSettings(true);
      },
    },
    {
      icon: <KeyRound size={15} />,
      label: "Change Password",
      onClick: () => {
        setProfileDropdownOpen(false);
        setShowChangePassword(true);
      },
    },
    {
      icon: <LogOut size={15} />,
      label: "Logout",
      danger: true,
      onClick: handleLogout,
    },
  ];

  return (
    <>
      <header
        style={{
          height: `${spacing.headerHeight}px`,
          background: "#FFFFFF",
          borderBottom: "1px solid #B3AFAF",
          display: "flex",
          alignItems: "center",
          paddingLeft: isMobile ? "16px" : "32px",
          paddingRight: "24px",
          position: "fixed",
          top: 0,
          left: isMobile ? 0 : sidebarWidth,
          right: 0,
          zIndex: 40,
          boxShadow: colors.header.shadow,
          boxSizing: "border-box",
          gap: "12px",
          transition: "left 0.25s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {/* Mobile hamburger */}
        {isMobile && (
          <button
            onClick={onMenuClick}
            aria-label="Open menu"
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "6px",
              borderRadius: "6px",
              flexShrink: 0,
              transition: "background 0.18s ease",
            }}
            className="header-icon-btn"
          >
            <AlignRight size={22} color="#0C2A42" />
          </button>
        )}

        {/* Page Icon + Title matching Figma spec */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            flex: 1,
            minWidth: 0,
          }}
        >
          {ActiveIcon && (
            <span
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#0C2A42",
                flexShrink: 0,
              }}
            >
              <ActiveIcon size={isMobile ? 22 : 26} strokeWidth={2} color="#0C2A42" />
            </span>
          )}
          <h1
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontStyle: "normal",
              fontWeight: 700,
              fontSize: isMobile ? "16px" : "20px",
              lineHeight: "25px",
              color: "#0C2A42",
              margin: 0,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {activeTitle}
          </h1>
        </div>

        {/* Right-side actions */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: isMobile ? "10px" : "16px",
            flexShrink: 0,
          }}
        >
          {/* ── Notification Bell ── */}
          <div style={{ position: "relative", display: "inline-block" }}>
            <button
              aria-label="Notifications"
              onMouseEnter={() => setBellHovered(true)}
              onMouseLeave={() => setBellHovered(false)}
              style={{
                background: "transparent",
                // border: `1.5px solid ${colors.header.iconColor}`,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "30px",
                height: "30px",
                padding: 0,
                borderRadius: "50%",
                transition: "background 0.18s ease, border-color 0.18s ease",
                flexShrink: 0,
                position: "relative",
              }}
              className="header-bell-btn"
            >
              <Bell size={22} color={colors.header.iconColor} strokeWidth={1.8} />

              {/* Red notification badge counter matching screenshot */}
              {/* <span
                style={{
                  position: "absolute",
                  top: "-5px",
                  right: "-5px",
                  background: "#EF4444",
                  color: "#FFFFFF",
                  fontSize: "10px",
                  fontWeight: 700,
                  borderRadius: "10px",
                  padding: "0 4px",
                  minWidth: "16px",
                  height: "16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: typography.fontFamily.sans,
                  boxShadow: "0 2px 5px rgba(239, 68, 68, 0.4)",
                  border: "1.5px solid #FFFFFF",
                  boxSizing: "border-box",
                }}
              >
                6+
              </span> */}
            </button>

            {/* Bell tooltip */}
            {bellHovered && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: colors.sidebar.tooltipBg,
                  color: colors.sidebar.tooltipText,
                  fontFamily: typography.fontFamily.sans,
                  fontSize: "12px",
                  fontWeight: typography.fontWeight.medium,
                  padding: "4px 10px",
                  borderRadius: "6px",
                  whiteSpace: "nowrap",
                  pointerEvents: "none",
                  zIndex: 100,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.18)",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    bottom: "100%",
                    left: "50%",
                    transform: "translateX(-50%)",
                    borderWidth: "5px",
                    borderStyle: "solid",
                    borderColor: `transparent transparent ${colors.sidebar.tooltipBg} transparent`,
                  }}
                />
                Notifications
              </div>
            )}
          </div>

          {/* Vertical divider */}
          <div
            style={{
              width: "2px",
              height: "36px",
              background: colors.header.border,
              flexShrink: 0,
            }}
          />

          {/* ── Profile Dropdown Trigger ── */}
          <div style={{ position: "relative" }} ref={dropdownRef}>
            <button
              type="button"
              aria-label="Profile menu"
              aria-expanded={profileDropdownOpen}
              onClick={() => setProfileDropdownOpen((prev) => !prev)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "4px 6px",
                borderRadius: "8px",
                transition: "background 0.18s ease",
                flexShrink: 0,
              }}
              className="profile-trigger-btn"
            >
              {/* Avatar circle */}
              <div
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "50%",
                  background: colors.header.avatarBg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <svg
                  width="23"
                  height="23"
                  viewBox="0 0 24 24"
                  fill={colors.text.white}
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" />
                  <path d="M12 14C7.58172 14 4 16.6863 4 20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20C20 16.6863 16.4183 14 12 14Z" />
                </svg>
              </div>

              {/* Name + Role (hidden on mobile) */}
              {!isMobile && (
                <div style={{ display: "flex", flexDirection: "column", textAlign: "left" }}>
                  <span
                    style={{
                      fontFamily: typography.fontFamily.sans,
                      fontWeight: typography.fontWeight.bold,
                      fontSize: "14px",
                      lineHeight: "18px",
                      color: colors.header.userNameText,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Amit Sharma
                  </span>
                  <span
                    style={{
                      fontFamily: typography.fontFamily.sans,
                      fontWeight: typography.fontWeight.bold,
                      fontSize: "12px",
                      lineHeight: "15px",
                      color: colors.header.userRoleText,
                    }}
                  >
                    {displayRole}
                  </span>
                </div>
              )}

              {/* Chevron */}
              <ChevronDown
                size={16}
                color={colors.header.userRoleText}
                style={{
                  transform: profileDropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.22s ease",
                  flexShrink: 0,
                }}
              />
            </button>

            {/* ── Dropdown Menu ── */}
            {profileDropdownOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  right: 0,
                  background: "#FFFFFF",
                  borderRadius: "12px",
                  boxShadow: "0 8px 24px rgba(1, 27, 47, 0.16)",
                  border: `1px solid ${colors.header.border}`,
                  minWidth: "188px",
                  zIndex: 200,
                  overflow: "hidden",
                  animation: "profileDropIn 0.18s ease-out",
                }}
              >
               

                {/* Menu items */}
                <div style={{ padding: "6px 0" }}>
                  {menuItems.map((item) => (
                    <React.Fragment key={item.label}>
                      {item.danger && (
                        <div style={{ height: "1px", background: colors.header.border, margin: "4px 0" }} />
                      )}
                      <button
                        type="button"
                        onClick={item.onClick}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          width: "100%",
                          padding: "9px 14px",
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          fontFamily: typography.fontFamily.sans,
                          fontSize: "13px",
                          fontWeight: item.danger ? 700 : typography.fontWeight.medium,
                          color: item.danger ? "#DC2626" : colors.text.primary,
                          textAlign: "left",
                          transition: "background 0.15s ease",
                        }}
                        className={item.danger ? "dropdown-danger-item" : "dropdown-item"}
                      >
                        <span
                          style={{
                            color: item.danger ? "#DC2626" : colors.brand.accent,
                            display: "flex",
                            flexShrink: 0,
                          }}
                        >
                          {item.icon}
                        </span>
                        {item.label}
                      </button>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Scoped styles */}
        <style>{`
          .header-icon-btn:hover {
            background: ${colors.bg.page} !important;
          }
          .header-bell-btn:hover {
            background: ${colors.bg.page} !important;
            border-color: ${colors.brand.accent} !important;
          }
          .profile-trigger-btn:hover {
            background: ${colors.bg.page} !important;
          }
          .dropdown-item:hover {
            background: ${colors.bg.page} !important;
          }
          .dropdown-danger-item:hover {
            background: #FEF2F2 !important;
          }
          @keyframes profileDropIn {
            from { opacity: 0; transform: translateY(-6px) scale(0.97); }
            to   { opacity: 1; transform: translateY(0)     scale(1);    }
          }
        `}</style>
      </header>

      {/* ── Modals ── */}
      <ChangePasswordModal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
      />
      <EditProfileModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </>
  );
}
