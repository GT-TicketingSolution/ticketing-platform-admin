"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { colors, spacing } from "@/lib/theme";

/** Breakpoint below which we switch to mobile/tablet drawer mode */
const MOBILE_BREAKPOINT = 1024;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  // true  → screen < 1024px  (tablet + mobile)
  // false → screen ≥ 1024px  (laptop + desktop)
  const [isMobile, setIsMobile] = useState(false);

  // Desktop only: whether the sidebar is collapsed to icon-only mode
  const [collapsed, setCollapsed] = useState(false);

  // Mobile/Tablet only: whether the drawer is open
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Detect breakpoint on mount and on resize
  useEffect(() => {
    const checkBreakpoint = () => {
      const mobile = window.innerWidth < MOBILE_BREAKPOINT;
      setIsMobile(mobile);
      if (!mobile) {
        // Coming back to desktop → close any open drawer
        setDrawerOpen(false);
      }
    };
    checkBreakpoint();
    window.addEventListener("resize", checkBreakpoint);
    return () => window.removeEventListener("resize", checkBreakpoint);
  }, []);

  // Content left margin:
  // • Desktop expanded  → 268px
  // • Desktop collapsed → 68px
  // • Mobile/Tablet     → 0  (sidebar is a floating overlay, not in flow)
  const contentMarginLeft = isMobile
    ? 0
    : collapsed
      ? spacing.sidebarCollapsedWidth
      : spacing.sidebarWidth;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: colors.bg.page }}>
      {/* ── Global Sidebar ── */}
      <Sidebar
        collapsed={collapsed}
        drawerOpen={drawerOpen}
        isMobile={isMobile}
        onDesktopToggle={() => setCollapsed((p) => !p)}
        onDrawerClose={() => setDrawerOpen(false)}
      />

      {/* ── Right panel (shifts with sidebar on desktop only) ── */}
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
        {/* ── Fixed Header – receives sidebar width to set its left offset ── */}
        <Header
          isMobile={isMobile}
          onMenuClick={() => setDrawerOpen(true)}
          sidebarWidth={contentMarginLeft}
        />

        {/* ── Page content (paddingTop reserves space for the fixed header) ── */}
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
