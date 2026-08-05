/**
 * Design System Theme Tokens
 * All colors, spacing, and typography tokens used across the application.
 * Import from this file to ensure consistency and easy global updates.
 * Never hard-code colors in components — always import from here.
 */

export const colors = {

  // Sidebar

  sidebar: {
    bg: "#0C2A42",
    divider: "#2372A5",
    activeBg: "#F4BC43",
    activeText: "#011B2F",
    itemText: "#FFFFFF",
    iconColor: "#FFFFFF",
    activeIconColor: "#011B2F",
    width: 268,
    collapsedWidth: 68,
    hoverBg: "rgba(35, 114, 165, 0.25)",
    tooltipBg: "#1A3D5C",
    tooltipText: "#FFFFFF",
  },

  // Header

  header: {
    bg: "#FFFFFF",
    border: "#E5E7EB",
    title: "#011B2F",
    userNameText: "#011B2F",
    userRoleText: "#A0A0A0",
    iconColor: "#000000",
    avatarBg: "#002A45",
    shadow: "0 1px 4px rgba(0,0,0,0.06)",
  },

  // Brand / Primary

  brand: {
    primary: "#F4BC43",
    primaryDark: "#011B2F",
    accent: "#2372A5",
  },

  // Backgrounds

  bg: {
    page: "#F0F4F8",
    card: "#FFFFFF",
    dark: "#0C2A42",
  },

  // Text

  text: {
    primary: "#011B2F",
    secondary: "#2372A5",
    muted: "#A0A0A0",
    white: "#FFFFFF",
  },

  // Status
  status: {
    success: "#22C55E",
    warning: "#F4BC43",
    error: "#EF4444",
    info: "#2372A5",
  },
} as const;

export const typography = {
  fontFamily: {
    sans: "'Plus Jakarta Sans', sans-serif",
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  fontSize: {
    xs: "12px",
    sm: "14px",
    base: "16px",
    lg: "18px",
    xl: "20px",
    "2xl": "24px",
    "3xl": "30px",
  },
  lineHeight: {
    tight: "20px",
    normal: "25px",
    base: "24px",
    relaxed: "28px",
  },
} as const;

export const spacing = {
  sidebarWidth: 268,
  sidebarCollapsedWidth: 68,
  headerHeight: 78,
} as const;
