"use client";

import { useState } from "react";
import { Bell, UserCircle2, AlignRight } from "lucide-react";
import { colors, typography, spacing } from "@/lib/theme";

interface HeaderProps {
  title?: string;
  isMobile?: boolean;
  onMenuClick?: () => void;
  /** Left offset = current sidebar width so header spans the content area */
  sidebarWidth?: number;
}

export default function Header({
  title = "Nahargarh Ticket Booking",
  isMobile = false,
  onMenuClick,
  sidebarWidth = spacing.sidebarWidth,
}: HeaderProps) {
  const [bellHovered, setBellHovered] = useState(false);

  return (
    <header
      style={{
        height: `${spacing.headerHeight}px`,
        background: colors.header.bg,
        borderBottom: `1px solid ${colors.header.border}`,
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
          <AlignRight size={22} color={colors.sidebar.bg} />
        </button>
      )}

      {/* Title */}
      <h1
        style={{
          fontFamily: typography.fontFamily.sans,
          fontStyle: "normal",
          fontWeight: typography.fontWeight.bold,
          fontSize: isMobile ? "16px" : typography.fontSize.xl,
          lineHeight: typography.lineHeight.normal,
          color: colors.header.title,
          margin: 0,
          flex: 1,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {title}
      </h1>

      {/* Right-side actions */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: isMobile ? "10px" : "16px",
          flexShrink: 0,
        }}
      >
        {/* ── Notification Bell Container with Tooltip ── */}
        <div style={{ position: "relative", display: "inline-block" }}>
          <button
            aria-label="Notifications"
            onMouseEnter={() => setBellHovered(true)}
            onMouseLeave={() => setBellHovered(false)}
            style={{
              background: "transparent",
              border: `1.5px solid ${colors.header.iconColor}`,
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
            }}
            className="header-bell-btn"
          >
            <Bell
              size={16}
              color={colors.header.iconColor}
              strokeWidth={1.8}
            />
          </button>

          {/* Hover Tooltip Popup */}
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
              {/* Arrow indicator */}
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

        {/* User avatar + name/role */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          {/* Filled dark avatar circle */}
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
            <div style={{ display: "flex", flexDirection: "column" }}>
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
                Admin
              </span>
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
      `}</style>
    </header>
  );
}
