"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  UserCheck,
  UserCog,
  BookOpen,
  IndianRupee,
  FileSpreadsheet,
  Filter,
  Search,
  Building2,
  Calendar,
  ArrowUpRight,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { colors, typography } from "@/lib/theme";
import { exportMultiSectionXLS, XLSSection } from "@/lib/exportUtils";
import DashboardCharts from "@/components/dashboard/DashboardCharts";
import { useDashboard } from "@/hooks/useDashboard";
import { DashboardPeriod } from "./types";

export default function AdminDashboardView() {
  // Filters State
  const [selectedAttraction, setSelectedAttraction] = useState<string>("All");
  const [selectedDateRange, setSelectedDateRange] =
    useState<DashboardPeriod>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch live dashboard data from API
  const { data, isLoading, isFetching, error } = useDashboard({
    period: selectedDateRange,
    attractionId: selectedAttraction === "All" ? undefined : selectedAttraction,
    search: debouncedSearch || undefined,
  });

  // Extract data with strict fallbacks
  const summary = useMemo(() => {
    return {
      totalManagers: data?.summary?.totalManagers ?? 0,
      activeManagers: data?.summary?.activeManagers ?? 0,
      totalStaff: data?.summary?.totalStaff ?? 0,
      activeStaff: data?.summary?.activeStaff ?? 0,
      totalBookings: data?.summary?.totalBookings ?? 0,
      totalEarnings: data?.summary?.totalEarnings ?? 0,
    };
  }, [data?.summary]);

  const attractionFilters = useMemo(() => {
    return data?.filters?.attractions ?? [];
  }, [data?.filters?.attractions]);

  const performance = useMemo(() => {
    return data?.performance ?? { revenue: [], bookings: [] };
  }, [data?.performance]);

  const attractionDistribution = useMemo(() => {
    return data?.attractionDistribution ?? [];
  }, [data?.attractionDistribution]);

  const recentManagers = useMemo(() => {
    return data?.recentManagers?.items ?? [];
  }, [data?.recentManagers?.items]);

  const totalRecentManagers =
    data?.recentManagers?.total ?? recentManagers.length;

  const handleExportXLS = () => {
    const selectedAttractionLabel =
      selectedAttraction === "All"
        ? "All Attractions"
        : attractionFilters.find((a) => a.id === selectedAttraction)?.name ||
          selectedAttraction;

    const sections: XLSSection[] = [
      {
        title: "1. ADMIN DASHBOARD METRICS SUMMARY",
        headers: ["Metric Label", "Value"],
        rows: [
          ["Total Managers", summary.totalManagers],
          ["Active Managers", summary.activeManagers],
          ["Total Staff", summary.totalStaff],
          ["Active Staff", summary.activeStaff],
          ["Total Bookings Processed", summary.totalBookings],
          [
            "Total Revenue Earnings",
            `₹${summary.totalEarnings.toLocaleString("en-IN")}`,
          ],
          ["Selected Period", selectedDateRange],
          ["Selected Attraction", selectedAttractionLabel],
          ["Active Search Query", searchQuery || "None"],
          ["Export Generated At", new Date().toLocaleString()],
        ],
      },
      {
        title: "2. RECENT MANAGERS OVERVIEW",
        headers: [
          "Manager ID",
          "Manager Name",
          "Mobile",
          "Email",
          "Assigned Attraction",
          "Joined Date",
          "Status",
        ],
        rows: recentManagers.map((m) => [
          m.id || "—",
          m.name || "—",
          m.mobile || "—",
          m.email || "—",
          m.attraction?.name || "—",
          m.joinedDate
            ? new Date(m.joinedDate).toLocaleDateString("en-IN")
            : "—",
          m.status || "—",
        ]),
      },
    ];

    exportMultiSectionXLS(
      `Admin_Dashboard_Report_${selectedDateRange}`,
      sections,
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Top Header Actions */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
        }}
      >
        <div
          style={{ display: "flex", alignItems: "center", gap: "10px" }}
        ></div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            type="button"
            onClick={handleExportXLS}
            disabled={
              isLoading ||
              (summary.totalManagers === 0 && summary.totalBookings === 0)
            }
            title={
              isLoading ||
              (summary.totalManagers === 0 && summary.totalBookings === 0)
                ? "No records available to export in dashboard"
                : "Export dashboard report as XLS"
            }
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background:
                isLoading ||
                (summary.totalManagers === 0 && summary.totalBookings === 0)
                  ? "#E2E8F0"
                  : "#107C41",
              color:
                isLoading ||
                (summary.totalManagers === 0 && summary.totalBookings === 0)
                  ? "#94A3B8"
                  : "#FFFFFF",
              border:
                isLoading ||
                (summary.totalManagers === 0 && summary.totalBookings === 0)
                  ? "1px solid #CBD5E1"
                  : "none",
              borderRadius: "8px",
              padding: "10px 18px",
              fontFamily: typography.fontFamily.sans,
              fontWeight: typography.fontWeight.semibold,
              fontSize: "14px",
              cursor:
                isLoading ||
                (summary.totalManagers === 0 && summary.totalBookings === 0)
                  ? "not-allowed"
                  : "pointer",
              opacity:
                isLoading ||
                (summary.totalManagers === 0 && summary.totalBookings === 0)
                  ? 0.7
                  : 1,
              boxShadow:
                isLoading ||
                (summary.totalManagers === 0 && summary.totalBookings === 0)
                  ? "none"
                  : "0 4px 12px rgba(16, 124, 65, 0.25)",
              transition: "all 0.18s ease",
            }}
          >
            <FileSpreadsheet size={18} />
            <span>Export as XLS</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div
          style={{
            background: "#FEF2F2",
            border: "1px solid #FCA5A5",
            borderRadius: "10px",
            padding: "12px 18px",
            color: "#B91C1C",
            fontSize: "13px",
          }}
        >
          <span>
            Unable to fetch dashboard data. Showing latest available statistics.
          </span>
        </div>
      )}

      {/* Filters Bar */}
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "12px",
          padding: "16px 20px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "16px",
          border: `1px solid ${colors.header.border}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Filter size={18} color={colors.brand.accent} />
          <span
            style={{
              fontFamily: typography.fontFamily.sans,
              fontWeight: typography.fontWeight.bold,
              fontSize: "14px",
              color: colors.text.primary,
            }}
          >
            Filters:
          </span>
        </div>

        {/* Period Filter */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Calendar size={16} color={colors.text.muted} />
          <select
            value={selectedDateRange}
            onChange={(e) =>
              setSelectedDateRange(e.target.value as DashboardPeriod)
            }
            style={{
              height: "38px",
              borderRadius: "8px",
              border: `1px solid ${colors.header.border}`,
              padding: "0 12px",
              fontFamily: typography.fontFamily.sans,
              fontSize: "13px",
              color: colors.text.primary,
              outline: "none",
              cursor: "pointer",
              background: "#FFFFFF",
            }}
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        {/* Attraction Filter (API Driven) */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Building2 size={16} color={colors.text.muted} />
          <select
            value={selectedAttraction}
            onChange={(e) => setSelectedAttraction(e.target.value)}
            style={{
              height: "38px",
              borderRadius: "8px",
              border: `1px solid ${colors.header.border}`,
              padding: "0 12px",
              fontFamily: typography.fontFamily.sans,
              fontSize: "13px",
              color: colors.text.primary,
              outline: "none",
              cursor: "pointer",
              background: "#FFFFFF",
              maxWidth: "240px",
            }}
          >
            <option value="All">All Attractions</option>
            {attractionFilters.map((attr) => (
              <option key={attr.id} value={attr.id}>
                {attr.name}
              </option>
            ))}
          </select>
        </div>

        {/* Search Input */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            border: `1px solid ${colors.header.border}`,
            borderRadius: "8px",
            padding: "0 12px",
            height: "38px",
            flex: 1,
            minWidth: "200px",
            background: "#FFFFFF",
          }}
        >
          <Search size={16} color={colors.text.muted} />
          <input
            type="text"
            placeholder="Search by manager name or details..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              border: "none",
              outline: "none",
              fontFamily: typography.fontFamily.sans,
              fontSize: "13px",
              color: colors.text.primary,
              background: "transparent",
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: colors.text.muted,
                fontSize: "12px",
              }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Metric Stat Cards Grid */}
      {isLoading ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
            gap: "18px",
          }}
        >
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                background: "#FFFFFF",
                borderRadius: "12px",
                padding: "20px",
                boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                border: "1px solid #E2E8F0",
              }}
            >
              <div style={{ flex: 1 }}>
                <div
                  className="dash-sk"
                  style={{
                    height: "14px",
                    width: "130px",
                    borderRadius: "4px",
                    marginBottom: "12px",
                  }}
                />
                <div
                  className="dash-sk"
                  style={{
                    height: "28px",
                    width: "70px",
                    borderRadius: "6px",
                    marginBottom: "10px",
                  }}
                />
                <div
                  className="dash-sk"
                  style={{
                    height: "12px",
                    width: "160px",
                    borderRadius: "4px",
                  }}
                />
              </div>
              <div
                className="dash-sk"
                style={{ width: "48px", height: "48px", borderRadius: "12px" }}
              />
            </div>
          ))}
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
            gap: "18px",
          }}
        >
          {/* Total Managers */}
          <Link
            href="/manager-management?status=Active"
            prefetch={true}
            style={{
              background: "#FFFFFF",
              borderRadius: "12px",
              padding: "20px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderLeft: `4px solid ${colors.brand.primary}`,
              textDecoration: "none",
              transition: "all 0.2s ease",
              cursor: "pointer",
            }}
            className="stat-card-hover"
          >
            <div>
              <span
                style={{
                  fontFamily: typography.fontFamily.sans,
                  fontSize: "13px",
                  fontWeight: typography.fontWeight.medium,
                  color: colors.text.muted,
                  display: "block",
                }}
              >
                Total Number of Managers
              </span>
              <span
                style={{
                  fontFamily: typography.fontFamily.sans,
                  fontSize: "28px",
                  fontWeight: typography.fontWeight.bold,
                  color: colors.text.primary,
                  margin: "4px 0",
                  display: "block",
                }}
              >
                {summary.totalManagers}
              </span>
              <span
                style={{
                  fontSize: "12px",
                  color: colors.status.success,
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "3px",
                }}
              >
                <UserCheck size={14} /> {summary.activeManagers} Active Managers
                &bull; View &rarr;
              </span>
            </div>

            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: "rgba(244, 188, 67, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <UserCheck size={24} color={colors.sidebar.bg} />
            </div>
          </Link>

          {/* Total Staff */}
          <Link
            href="/staff-management?status=Active"
            prefetch={true}
            style={{
              background: "#FFFFFF",
              borderRadius: "12px",
              padding: "20px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderLeft: `4px solid ${colors.brand.accent}`,
              textDecoration: "none",
              transition: "all 0.2s ease",
              cursor: "pointer",
            }}
            className="stat-card-hover"
          >
            <div>
              <span
                style={{
                  fontFamily: typography.fontFamily.sans,
                  fontSize: "13px",
                  fontWeight: typography.fontWeight.medium,
                  color: colors.text.muted,
                  display: "block",
                }}
              >
                Total Number of Staff
              </span>
              <span
                style={{
                  fontFamily: typography.fontFamily.sans,
                  fontSize: "28px",
                  fontWeight: typography.fontWeight.bold,
                  color: colors.text.primary,
                  margin: "4px 0",
                  display: "block",
                }}
              >
                {summary.totalStaff}
              </span>
              <span
                style={{
                  fontSize: "12px",
                  color: colors.brand.accent,
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <UserCog size={14} /> {summary.activeStaff} Active Staff &bull;
                View &rarr;
              </span>
            </div>

            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: "rgba(35, 114, 165, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <UserCog size={24} color={colors.brand.accent} />
            </div>
          </Link>

          {/* Total Bookings */}
          <Link
            href="/bookings"
            prefetch={true}
            style={{
              background: "#FFFFFF",
              borderRadius: "12px",
              padding: "20px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderLeft: `4px solid ${colors.status.warning}`,
              textDecoration: "none",
              transition: "all 0.2s ease",
              cursor: "pointer",
            }}
            className="stat-card-hover"
          >
            <div>
              <span
                style={{
                  fontFamily: typography.fontFamily.sans,
                  fontSize: "13px",
                  fontWeight: typography.fontWeight.medium,
                  color: colors.text.muted,
                  display: "block",
                }}
              >
                Total Bookings Processed
              </span>
              <span
                style={{
                  fontFamily: typography.fontFamily.sans,
                  fontSize: "28px",
                  fontWeight: typography.fontWeight.bold,
                  color: colors.text.primary,
                  margin: "4px 0",
                  display: "block",
                }}
              >
                {summary.totalBookings.toLocaleString("en-IN")}
              </span>
              <span
                style={{
                  fontSize: "12px",
                  color: colors.status.warning,
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <BookOpen size={14} /> Bookings &bull; View &rarr;
              </span>
            </div>

            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: "rgba(244, 188, 67, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <BookOpen size={24} color={colors.brand.primary} />
            </div>
          </Link>

          {/* Total Earnings */}
          <div
            style={{
              background: colors.sidebar.bg,
              color: "#FFFFFF",
              borderRadius: "12px",
              padding: "20px",
              boxShadow: "0 4px 14px rgba(12, 42, 66, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <span
                style={{
                  fontFamily: typography.fontFamily.sans,
                  fontSize: "13px",
                  fontWeight: typography.fontWeight.medium,
                  color: "rgba(255, 255, 255, 0.7)",
                  display: "block",
                }}
              >
                Total Earnings
              </span>
              <span
                style={{
                  fontFamily: typography.fontFamily.sans,
                  fontSize: "26px",
                  fontWeight: typography.fontWeight.bold,
                  color: colors.brand.primary,
                  margin: "4px 0",
                  display: "block",
                }}
              >
                ₹{summary.totalEarnings.toLocaleString("en-IN")}
              </span>
              <span
                style={{
                  fontSize: "12px",
                  color: colors.status.success,
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "2px",
                }}
              >
                <ArrowUpRight size={14} /> Overall Ticket Revenue
              </span>
            </div>

            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: "rgba(244, 188, 67, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <IndianRupee size={24} color={colors.brand.primary} />
            </div>
          </div>
        </div>
      )}

      {/* Performance & Distribution Charts */}
      <DashboardCharts
        performance={performance}
        attractionDistribution={attractionDistribution}
        isLoading={isLoading}
      />

      {/* Recent Managers Table */}
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "12px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
          overflow: "hidden",
          border: `1px solid ${colors.header.border}`,
        }}
      >
        <div
          style={{
            padding: "16px 20px",
            borderBottom: `1px solid ${colors.header.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h2
              style={{
                fontFamily: typography.fontFamily.sans,
                fontWeight: typography.fontWeight.bold,
                fontSize: "16px",
                color: colors.text.primary,
                margin: 0,
              }}
            >
              Recent Managers Activity
            </h2>
            <p
              style={{
                margin: "2px 0 0 0",
                fontSize: "12px",
                color: colors.text.muted,
              }}
            >
              Latest managers registered and their performance overview
            </p>
          </div>

          <Link
            href="/manager-management"
            prefetch={true}
            style={{
              fontFamily: typography.fontFamily.sans,
              fontSize: "13px",
              fontWeight: 600,
              color: colors.brand.accent,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "6px 12px",
              borderRadius: "6px",
              transition: "all 0.15s ease",
            }}
            className="view-all-link"
          >
            View All ({totalRecentManagers}) &rarr;
          </Link>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              textAlign: "left",
              fontFamily: typography.fontFamily.sans,
              fontSize: "14px",
            }}
          >
            <thead>
              <tr
                style={{
                  background: "#F8FAFC",
                  borderBottom: `1px solid ${colors.header.border}`,
                  color: colors.text.muted,
                  fontSize: "12px",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                <th style={{ padding: "14px 20px" }}>Manager Name</th>
                <th style={{ padding: "14px 20px" }}>Contact Information</th>
                <th style={{ padding: "14px 20px" }}>Assigned Attraction</th>
                <th style={{ padding: "14px 20px" }}>Joined Date</th>
                <th style={{ padding: "14px 20px" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, rIdx) => (
                  <tr
                    key={`mgr-skeleton-${rIdx}`}
                    style={{
                      borderBottom: `1px solid ${colors.header.border}`,
                      height: "56px",
                    }}
                  >
                    <td style={{ padding: "14px 20px" }}>
                      <div
                        className="dash-sk"
                        style={{
                          height: "14px",
                          width: "120px",
                          borderRadius: "4px",
                        }}
                      />
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      <div
                        className="dash-sk"
                        style={{
                          height: "14px",
                          width: "150px",
                          borderRadius: "4px",
                          marginBottom: "4px",
                        }}
                      />
                      <div
                        className="dash-sk"
                        style={{
                          height: "12px",
                          width: "100px",
                          borderRadius: "4px",
                        }}
                      />
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      <div
                        className="dash-sk"
                        style={{
                          height: "24px",
                          width: "100px",
                          borderRadius: "6px",
                        }}
                      />
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      <div
                        className="dash-sk"
                        style={{
                          height: "14px",
                          width: "90px",
                          borderRadius: "4px",
                        }}
                      />
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      <div
                        className="dash-sk"
                        style={{
                          height: "14px",
                          width: "50px",
                          borderRadius: "4px",
                        }}
                      />
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      <div
                        className="dash-sk"
                        style={{
                          height: "24px",
                          width: "75px",
                          borderRadius: "20px",
                        }}
                      />
                    </td>
                  </tr>
                ))
              ) : recentManagers.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      padding: "32px",
                      textAlign: "center",
                      color: colors.text.muted,
                    }}
                  >
                    No managers found matching current filters.
                  </td>
                </tr>
              ) : (
                recentManagers.map((mgr) => {
                  const isStatusActive =
                    mgr.status === "ACTIVE" ||
                    mgr.status === ("Active" as unknown);
                  const attractionName = mgr.attraction?.name || "—";
                  const joinedDateFormatted = mgr.joinedDate
                    ? new Date(mgr.joinedDate).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    : "—";

                  return (
                    <tr
                      key={mgr.id}
                      style={{
                        borderBottom: `1px solid ${colors.header.border}`,
                        transition: "background 0.15s ease",
                      }}
                      className="table-row-hover"
                    >
                      <td style={{ padding: "14px 20px", fontWeight: 600 }}>
                        {mgr.name || "—"}
                      </td>
                      <td style={{ padding: "14px 20px" }}>
                        <div>{mgr.email || "—"}</div>
                        <div
                          style={{ fontSize: "12px", color: colors.text.muted }}
                        >
                          {mgr.mobile || "—"}
                        </div>
                      </td>
                      <td style={{ padding: "14px 20px" }}>
                        <span
                          style={{
                            background: colors.bg.page,
                            padding: "4px 10px",
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: 600,
                            color: colors.brand.accent,
                          }}
                        >
                          {attractionName}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "14px 20px",
                          color: colors.text.muted,
                        }}
                      >
                        {joinedDateFormatted}
                      </td>
                      {/* <td
                        style={{
                          padding: "14px 20px",
                          fontWeight: 700,
                          color: colors.text.primary,
                        }}
                      >
                        {(mgr.totalBookings ?? 0).toLocaleString("en-IN")}
                      </td> */}
                      <td style={{ padding: "14px 20px" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "4px 10px",
                            borderRadius: "20px",
                            fontSize: "12px",
                            fontWeight: 600,
                            background: isStatusActive ? "#F0FDF4" : "#FEF2F2",
                            color: isStatusActive
                              ? colors.status.success
                              : colors.status.error,
                          }}
                        >
                          {isStatusActive ? (
                            <CheckCircle2 size={13} />
                          ) : (
                            <XCircle size={13} />
                          )}
                          {mgr.status || "—"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        @keyframes dashShimmer {
          0%   { background-position: -600px 0; }
          100% { background-position: 600px 0; }
        }
        .dash-sk {
          background: linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%);
          background-size: 600px 100%;
          animation: dashShimmer 1.4s infinite linear;
        }
        .table-row-hover:hover {
          background: #F8FAFC !important;
        }
        .view-all-link:hover {
          background: ${colors.bg.page} !important;
          color: ${colors.sidebar.bg} !important;
        }
        .stat-card-hover:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 20px rgba(0,0,0,0.08) !important;
        }
      `}</style>
    </div>
  );
}
