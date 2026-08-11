"use client";

import { useState } from "react";
import {
  TrendingUp,
  PieChart,
} from "lucide-react";
import { colors, typography } from "@/lib/theme";

// Monthly revenue & booking data
const MONTHLY_DATA = [
  { month: "Jan", revenue: 240000, bookings: 850, managers: 12 },
  { month: "Feb", revenue: 310000, bookings: 1100, managers: 14 },
  { month: "Mar", revenue: 290000, bookings: 980, managers: 14 },
  { month: "Apr", revenue: 420000, bookings: 1450, managers: 16 },
  { month: "May", revenue: 480000, bookings: 1680, managers: 17 },
  { month: "Jun", revenue: 520000, bookings: 1890, managers: 18 },
  { month: "Jul", revenue: 460000, bookings: 1560, managers: 18 },
  { month: "Aug", revenue: 580000, bookings: 2050, managers: 18 },
];

// Attraction revenue breakdown
const ATTRACTION_DISTRIBUTION = [
  { name: "Main Palace Entrance", percentage: 38, color: "#2372A5", val: "₹9.8L" },
  { name: "Wax Museum & Exhibition", percentage: 26, color: "#F4BC43", val: "₹6.7L" },
  { name: "Sheesh Mahal", percentage: 20, color: "#0C2A42", val: "₹5.1L" },
  { name: "Sunset Observation", percentage: 16, color: "#22C55E", val: "₹4.1L" },
];

export default function DashboardCharts() {
  const [activeTab, setActiveTab] = useState<"revenue" | "bookings">("revenue");
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

  const maxValue = Math.max(
    ...MONTHLY_DATA.map((d) => (activeTab === "revenue" ? d.revenue : d.bookings))
  );

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
        gap: "20px",
      }}
    >
      {/* ── Left Chart: Monthly Performance Bar Chart ── */}
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "12px",
          padding: "22px 24px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
          border: `1px solid ${colors.header.border}`,
          display: "flex",
          flexDirection: "column",
          gap: "18px",
        }}
      >
        {/* Chart Header & Tab Toggle */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <TrendingUp size={18} color={colors.brand.accent} />
              <h3
                style={{
                  fontFamily: typography.fontFamily.sans,
                  fontWeight: typography.fontWeight.bold,
                  fontSize: "16px",
                  color: colors.text.primary,
                  margin: 0,
                }}
              >
                Performance Trends
              </h3>
            </div>
            <p
              style={{
                fontFamily: typography.fontFamily.sans,
                fontSize: "12px",
                color: colors.text.muted,
                margin: "4px 0 0 0",
              }}
            >
              {activeTab === "revenue"
                ? "Monthly Revenue (INR) across all attractions"
                : "Total Monthly Booking Count"}
            </p>
          </div>

          {/* Tab Switcher */}
          <div
            style={{
              display: "flex",
              background: colors.bg.page,
              borderRadius: "8px",
              padding: "3px",
              gap: "2px",
            }}
          >
            <button
              onClick={() => setActiveTab("revenue")}
              style={{
                border: "none",
                borderRadius: "6px",
                padding: "6px 12px",
                background: activeTab === "revenue" ? colors.sidebar.bg : "transparent",
                color: activeTab === "revenue" ? "#FFFFFF" : colors.text.muted,
                fontFamily: typography.fontFamily.sans,
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.18s ease",
              }}
            >
              Revenue
            </button>
            <button
              onClick={() => setActiveTab("bookings")}
              style={{
                border: "none",
                borderRadius: "6px",
                padding: "6px 12px",
                background: activeTab === "bookings" ? colors.sidebar.bg : "transparent",
                color: activeTab === "bookings" ? "#FFFFFF" : colors.text.muted,
                fontFamily: typography.fontFamily.sans,
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.18s ease",
              }}
            >
              Bookings
            </button>
          </div>
        </div>

        {/* Visual SVG / HTML Bar Chart */}
        <div
          style={{
            height: "220px",
            display: "flex",
            alignItems: "flex-end",
            gap: "12px",
            paddingTop: "24px",
            position: "relative",
            borderBottom: `1px solid ${colors.header.border}`,
          }}
        >
          {MONTHLY_DATA.map((item, idx) => {
            const rawVal = activeTab === "revenue" ? item.revenue : item.bookings;
            const heightPercent = Math.round((rawVal / maxValue) * 100);
            const isHovered = hoveredBarIndex === idx;

            return (
              <div
                key={item.month}
                onMouseEnter={() => setHoveredBarIndex(idx)}
                onMouseLeave={() => setHoveredBarIndex(null)}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  height: "100%",
                  justifyContent: "flex-end",
                  position: "relative",
                  cursor: "pointer",
                }}
              >
                {/* Tooltip on hover */}
                {isHovered && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: `calc(${heightPercent}% + 8px)`,
                      background: colors.sidebar.bg,
                      color: "#FFFFFF",
                      padding: "4px 8px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.18)",
                      zIndex: 10,
                      fontFamily: typography.fontFamily.sans,
                    }}
                  >
                    {activeTab === "revenue"
                      ? `₹${item.revenue.toLocaleString("en-IN")}`
                      : `${item.bookings} bookings`}
                  </div>
                )}

                {/* Animated bar element */}
                <div
                  style={{
                    width: "100%",
                    maxWidth: "28px",
                    height: `${heightPercent}%`,
                    background:
                      activeTab === "revenue"
                        ? isHovered
                          ? colors.brand.primary
                          : "linear-gradient(180deg, #2372A5 0%, #0C2A42 100%)"
                        : isHovered
                          ? "#16A34A"
                          : "linear-gradient(180deg, #F4BC43 0%, #E5AF36 100%)",
                    borderRadius: "6px 6px 0 0",
                    transition: "height 0.3s cubic-bezier(0.4, 0, 0.2, 1), background 0.18s ease",
                    boxShadow: isHovered ? "0 4px 12px rgba(0,0,0,0.15)" : "none",
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* X-Axis Month Labels */}
        <div style={{ display: "flex", justifyContent: "space-between", padding: "0 4px" }}>
          {MONTHLY_DATA.map((item, idx) => (
            <span
              key={item.month}
              style={{
                fontFamily: typography.fontFamily.sans,
                fontSize: "12px",
                fontWeight: hoveredBarIndex === idx ? 700 : 500,
                color: hoveredBarIndex === idx ? colors.brand.accent : colors.text.muted,
                textAlign: "center",
                flex: 1,
              }}
            >
              {item.month}
            </span>
          ))}
        </div>
      </div>

      {/* ── Right Chart: Attraction Revenue Share & Distribution ── */}
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "12px",
          padding: "22px 24px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
          border: `1px solid ${colors.header.border}`,
          display: "flex",
          flexDirection: "column",
          gap: "18px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <PieChart size={18} color={colors.brand.accent} />
              <h3
                style={{
                  fontFamily: typography.fontFamily.sans,
                  fontWeight: typography.fontWeight.bold,
                  fontSize: "16px",
                  color: colors.text.primary,
                  margin: 0,
                }}
              >
                Attraction Distribution
              </h3>
            </div>
            <p
              style={{
                fontFamily: typography.fontFamily.sans,
                fontSize: "12px",
                color: colors.text.muted,
                margin: "4px 0 0 0",
              }}
            >
              Revenue breakdown by key attraction points
            </p>
          </div>
        </div>

        {/* Progress Bar Breakdown Stack */}
        <div
          style={{
            height: "16px",
            borderRadius: "8px",
            background: colors.bg.page,
            display: "flex",
            overflow: "hidden",
            margin: "8px 0",
          }}
        >
          {ATTRACTION_DISTRIBUTION.map((item) => (
            <div
              key={item.name}
              style={{
                width: `${item.percentage}%`,
                background: item.color,
                transition: "width 0.4s ease",
              }}
              title={`${item.name}: ${item.percentage}% (${item.val})`}
            />
          ))}
        </div>

        {/* Distribution Details Legend List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {ATTRACTION_DISTRIBUTION.map((item) => (
            <div
              key={item.name}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: "13px",
                fontFamily: typography.fontFamily.sans,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span
                  style={{
                    width: "12px",
                    height: "12px",
                    borderRadius: "3px",
                    background: item.color,
                    display: "inline-block",
                  }}
                />
                <span style={{ color: colors.text.primary, fontWeight: 500 }}>
                  {item.name}
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontWeight: 700, color: colors.text.primary }}>
                  {item.val}
                </span>
                <span
                  style={{
                    background: colors.bg.page,
                    padding: "2px 8px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: colors.text.muted,
                    minWidth: "36px",
                    textAlign: "right",
                  }}
                >
                  {item.percentage}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
