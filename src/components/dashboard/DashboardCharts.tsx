"use client";

import { useState } from "react";
import {
  TrendingUp,
  PieChart,
} from "lucide-react";
import { colors, typography } from "@/lib/theme";
import { DashboardPerformance, AttractionDistributionItem } from "@/app/(dashboard)/dashboard/types";

const DISTRIBUTION_COLORS = [
  "#2372A5",
  "#F4BC43",
  "#0C2A42",
  "#22C55E",
  "#E11D48",
  "#8B5CF6",
  "#F97316",
  "#06B6D4",
];

interface DashboardChartsProps {
  performance?: DashboardPerformance;
  attractionDistribution?: AttractionDistributionItem[];
  isLoading?: boolean;
}

export default function DashboardCharts({
  performance,
  attractionDistribution = [],
  isLoading = false,
}: DashboardChartsProps) {
  const [activeTab, setActiveTab] = useState<"revenue" | "bookings">("revenue");
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

  const revenueData = performance?.revenue || [];
  const bookingsData = performance?.bookings || [];

  const currentChartData = activeTab === "revenue" ? revenueData : bookingsData;

  const rawValues = currentChartData.map((d) => d.value || 0);
  const maxValue = rawValues.length > 0 ? Math.max(...rawValues, 1) : 1;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
        gap: "20px",
      }}
    >
      {/* ── Left Chart: Performance Trends Bar Chart ── */}
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
          minHeight: "340px",
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
                ? "Revenue (INR) breakdown over time"
                : "Total Booking Count over time"}
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
              type="button"
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
              type="button"
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
        {isLoading ? (
          <div
            style={{
              height: "220px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: colors.text.muted,
              fontSize: "13px",
            }}
          >
            Loading trends...
          </div>
        ) : currentChartData.length === 0 ? (
          <div
            style={{
              height: "220px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: "6px",
              color: colors.text.muted,
              fontSize: "13px",
              borderBottom: `1px solid ${colors.header.border}`,
            }}
          >
            <span>No {activeTab} data available for this filter.</span>
          </div>
        ) : (
          <>
            <div
              style={{
                height: "200px",
                display: "flex",
                alignItems: "flex-end",
                gap: "12px",
                paddingTop: "24px",
                position: "relative",
                borderBottom: `1px solid ${colors.header.border}`,
              }}
            >
              {currentChartData.map((item, idx) => {
                const rawVal = item.value || 0;
                const heightPercent = maxValue > 0 ? Math.max(Math.round((rawVal / maxValue) * 100), 4) : 4;
                const isHovered = hoveredBarIndex === idx;

                return (
                  <div
                    key={`${item.month}-${idx}`}
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
                          ? `₹${rawVal.toLocaleString("en-IN")}`
                          : `${rawVal.toLocaleString("en-IN")} bookings`}
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
              {currentChartData.map((item, idx) => (
                <span
                  key={`${item.month}-${idx}`}
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
          </>
        )}
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
          minHeight: "340px",
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
              Revenue breakdown by attraction
            </p>
          </div>
        </div>

        {isLoading ? (
          <div
            style={{
              height: "180px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: colors.text.muted,
              fontSize: "13px",
            }}
          >
            Loading distribution...
          </div>
        ) : attractionDistribution.length === 0 ? (
          <div
            style={{
              height: "180px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: colors.text.muted,
              fontSize: "13px",
            }}
          >
            No attraction distribution data available.
          </div>
        ) : (
          <>
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
              {attractionDistribution.map((item, idx) => {
                const color = DISTRIBUTION_COLORS[idx % DISTRIBUTION_COLORS.length];
                const pct = item.percentage || 0;
                return (
                  <div
                    key={item.attractionId || `attr-${idx}`}
                    style={{
                      width: `${pct}%`,
                      background: color,
                      transition: "width 0.4s ease",
                    }}
                    title={`${item.attractionName}: ${pct}% (₹${(item.revenue || 0).toLocaleString("en-IN")})`}
                  />
                );
              })}
            </div>

            {/* Distribution Details Legend List */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "200px", overflowY: "auto" }}>
              {attractionDistribution.map((item, idx) => {
                const color = DISTRIBUTION_COLORS[idx % DISTRIBUTION_COLORS.length];
                const revenueStr = `₹${(item.revenue || 0).toLocaleString("en-IN")}`;
                const pct = item.percentage || 0;

                return (
                  <div
                    key={item.attractionId || `attr-legend-${idx}`}
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
                          background: color,
                          display: "inline-block",
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ color: colors.text.primary, fontWeight: 500 }}>
                        {item.attractionName || "—"}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <span style={{ fontWeight: 700, color: colors.text.primary }}>
                        {revenueStr}
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
                        {pct}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

