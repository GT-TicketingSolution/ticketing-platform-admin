"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users,
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
import { INITIAL_MANAGERS, INITIAL_STAFF, ManagerUser, StaffUser } from "@/types/admin";
import { exportMultiSectionXLS, XLSSection } from "@/lib/exportUtils";
import DashboardCharts from "@/components/dashboard/DashboardCharts";
import { META_CONSTANTS } from "@/lib/metaConstant";
import { extractUniqueAttractions, matchesAttractionFilter } from "@/lib/filterUtils";

// Manager-specific dashboard
import ManagerDashboard from "@/app/(dashboard)/manager-dashboard/page";

/** Thin role-router — no hooks after any return */
export default function DashboardPage() {
  const router = useRouter();
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    document.title = META_CONSTANTS.dashboard.fullTitle;
    const saved = sessionStorage.getItem("userRole");
    const role = saved ?? "Admin";
    setUserRole(role);
    // Staff have no dashboard — send them straight to Ticket Booking
    if (role === "Staff") {
      router.replace("/ticket-booking");
    }
  }, [router]);

  // Show nothing while role is loading
  if (userRole === null) return null;
  // Staff redirect is in flight
  if (userRole === "Staff") return null;
  // Manager gets their own view
  if (userRole === "Manager") return <ManagerDashboard />;
  // Admin (or any unknown role) gets the full admin dashboard
  return <AdminDashboard />;
}
function AdminDashboard() {
  // State for mock data
  const [managers] = useState<ManagerUser[]>(INITIAL_MANAGERS);
  const [staff] = useState<StaffUser[]>(INITIAL_STAFF);

  // Filters State
  const [selectedAttraction, setSelectedAttraction] = useState<string>("All");
  const [selectedDateRange, setSelectedDateRange] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Unique attractions list — split comma-separated multi-attraction values into individual entries
  const attractionOptions = useMemo(() => {
    return ["All", ...extractUniqueAttractions(managers.map((m) => m.attraction))];
  }, [managers]);

  // Filtered Managers
  const filteredManagers = useMemo(() => {
    return managers.filter((m) => {
      const matchesLoc = matchesAttractionFilter(m.attraction, selectedAttraction);
      const matchesSearch =
        searchQuery === "" ||
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.attraction.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesLoc && matchesSearch;
    });
  }, [managers, selectedAttraction, searchQuery]);

  // Filtered Staff
  const filteredStaff = useMemo(() => {
    return staff.filter((s) => {
      const matchesSearch =
        searchQuery === "" ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.role.some((r) => r.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesSearch;
    });
  }, [staff, searchQuery]);

  // Metrics Calculations
  const totalManagersCount = filteredManagers.length;
  const totalStaffCount = filteredStaff.length;
  const totalBookingsCount = useMemo(() => {
    return filteredManagers.reduce((sum, m) => sum + m.totalBookings, 0);
  }, [filteredManagers]);

  const totalEarnings = useMemo(() => {
    return filteredManagers.reduce((sum, m) => sum + m.revenueGenerated, 0);
  }, [filteredManagers]);

  // Handle Export XLS (Exports Dashboard Stats + Managers + Staff)
  const handleExportXLS = () => {
    const sections: XLSSection[] = [
      {
        title: "1. ADMIN DASHBOARD METRICS SUMMARY",
        headers: ["Metric Label", "Value"],
        rows: [
          ["Total Active Managers", totalManagersCount],
          ["Total Active Staff", totalStaffCount],
          ["Total Bookings Processed", totalBookingsCount],
          ["Total Revenue Earnings", `₹${totalEarnings.toLocaleString("en-IN")}`],
          ["Selected Attraction Filter", selectedAttraction],
          ["Active Search Query", searchQuery || "None"],
          ["Export Generated At", new Date().toLocaleString()],
        ],
      },
      {
        title: "2. MANAGERS DIRECTORY",
        headers: [
          "Manager ID",
          "Manager Name",
          "Phone",
          "Email",
          "Assigned Attraction",
          "Joined Date",
          "Total Bookings",
          "Revenue Generated",
          "Status",
        ],
        rows: filteredManagers.map((m) => [
          m.id,
          m.name,
          m.phone,
          m.email,
          m.attraction,
          m.joinedDate,
          m.totalBookings,
          `₹${m.revenueGenerated.toLocaleString("en-IN")}`,
          m.status,
        ]),
      },
      {
        title: "3. STAFF DIRECTORY",
        headers: [
          "Staff ID",
          "Staff Name",
          "Role",
          "Joined Date",
          "Tickets Processed",
          "Status",
        ],
        rows: filteredStaff.map((s) => [
          s.id,
          s.name,
          s.role.join(", "),
          s.joinedDate,
          s.ticketsIssued,
          s.status,
        ]),
      },
    ];

    exportMultiSectionXLS(`Admin_Dashboard_Report_${selectedAttraction}`, sections);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* ── Top Header Title & Actions ── */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: typography.fontFamily.sans,
              fontWeight: typography.fontWeight.bold,
              fontSize: typography.fontSize["2xl"],
              color: colors.text.primary,
              margin: 0,
            }}
          >
            Admin Dashboard
          </h1>
          <p
            style={{
              fontFamily: typography.fontFamily.sans,
              fontSize: "14px",
              color: colors.text.muted,
              margin: "4px 0 0 0",
            }}
          >
            Overview of managers, staff, transactions, and earnings.
          </p>
        </div>

        {/* Export XLS Button */}
        <button
          onClick={handleExportXLS}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "#107C41", // Excel green accent
            color: "#FFFFFF",
            border: "none",
            borderRadius: "8px",
            padding: "10px 18px",
            fontFamily: typography.fontFamily.sans,
            fontWeight: typography.fontWeight.semibold,
            fontSize: "14px",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(16, 124, 65, 0.25)",
            transition: "all 0.18s ease",
          }}
        >
          <FileSpreadsheet size={18} />
          <span>Export as XLS</span>
        </button>
      </div>

      {/* ── Filters Bar ── */}
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

        {/* Date Range Selector */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Calendar size={16} color={colors.text.muted} />
          <select
            value={selectedDateRange}
            onChange={(e) => setSelectedDateRange(e.target.value)}
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
          </select>
        </div>

        {/* Attraction Filter */}
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
            }}
          >
            {attractionOptions.map((loc) => (
              <option key={loc} value={loc}>
                {loc === "All" ? "All Attractions" : loc}
              </option>
            ))}
          </select>
        </div>

        {/* Search Field */}
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
            placeholder="Search by manager, staff, or attractions"
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

      {/* ── Metric Stat Cards Grid ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
          gap: "18px",
        }}
      >
        {/* Card 1: Total Number of Manager (Clickable → Filters Active) */}
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
              Total Number of Manager
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
              {totalManagersCount}
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
              <UserCheck size={14} /> {filteredManagers.filter((m) => m.status === "Active").length} Active Managers &bull; View Active &rarr;
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

        {/* Card 2: Total Number of Staff (Clickable → Filters Active) */}
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
              {totalStaffCount}
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
              <UserCog size={14} /> {filteredStaff.filter((s) => s.status === "Active").length} Active Staff &bull; View Active &rarr;
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

        {/* Card 3: Total Bookings Processed (Clickable) */}
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
              {totalBookingsCount.toLocaleString("en-IN")}
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
              <BookOpen size={14} /> All Attractions &bull; View &rarr;
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

        {/* Card 4: Total Earnings */}
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
              ₹{totalEarnings.toLocaleString("en-IN")}
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

      {/* ── Dashboard Interactive Charts ── */}
      <DashboardCharts />

      {/* ── Recent Managers Breakdown Table ── */}
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
            padding: "18px 24px",
            borderBottom: `1px solid ${colors.header.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h3
              style={{
                fontFamily: typography.fontFamily.sans,
                fontWeight: typography.fontWeight.bold,
                fontSize: "16px",
                color: colors.text.primary,
                margin: 0,
              }}
            >
              Recent Managers Overview
            </h3>
            <span style={{ fontSize: "13px", color: colors.text.muted }}>
              Showing recent 5 of {filteredManagers.length} managers &bull; Filtered Attraction: <strong>{selectedAttraction}</strong>
            </span>
          </div>

          <Link
            href="/manager-management"
            prefetch={true}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "13px",
              fontWeight: 600,
              color: colors.brand.accent,
              textDecoration: "none",
              padding: "6px 14px",
              borderRadius: "8px",
              border: `1px solid ${colors.header.border}`,
              background: "#FFFFFF",
              transition: "all 0.18s ease",
            }}
            className="view-all-link"
          >
            View All →
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
                <th style={{ padding: "14px 20px" }}>Total Bookings</th>
                <th style={{ padding: "14px 20px" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredManagers.length === 0 ? (
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
                [...filteredManagers]
                  .sort((a, b) => new Date(b.joinedDate).getTime() - new Date(a.joinedDate).getTime())
                  .slice(0, 5)
                  .map((mgr) => (
                    <tr
                      key={mgr.id}
                      style={{
                        borderBottom: `1px solid ${colors.header.border}`,
                        transition: "background 0.15s ease",
                      }}
                      className="table-row-hover"
                    >
                      <td style={{ padding: "14px 20px", fontWeight: 600 }}>
                        {mgr.name}
                      </td>
                      <td style={{ padding: "14px 20px" }}>
                        <div>{mgr.email}</div>
                        <div style={{ fontSize: "12px", color: colors.text.muted }}>
                          {mgr.phone}
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
                          {mgr.attraction}
                        </span>
                      </td>
                      <td style={{ padding: "14px 20px", color: colors.text.muted }}>
                        {mgr.joinedDate}
                      </td>
                      <td
                        style={{
                          padding: "14px 20px",
                          fontWeight: 700,
                          color: colors.text.primary,
                        }}
                      >
                        {mgr.totalBookings.toLocaleString("en-IN")}
                      </td>
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
                            background: mgr.status === "Active" ? "#F0FDF4" : "#FEF2F2",
                            color: mgr.status === "Active" ? colors.status.success : colors.status.error,
                          }}
                        >
                          {mgr.status === "Active" ? (
                            <CheckCircle2 size={13} />
                          ) : (
                            <XCircle size={13} />
                          )}
                          {mgr.status}
                        </span>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
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
