"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  UserCog,
  IndianRupee,
  BookOpen,
  Search,
  ArrowUpRight,
  CheckCircle2,
  XCircle,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { colors, typography } from "@/lib/theme";
import { useManagerDashboard } from "@/hooks/useDashboard";
import { ManagerDashboardStaffItem } from "@/app/(dashboard)/dashboard/types";

const shimmerCSS = `
  @keyframes managerDashShimmer {
    0%   { background-position: -800px 0; }
    100% { background-position: 800px 0; }
  }
  .mdsk {
    background: linear-gradient(90deg, #e8edf2 25%, #f5f7fa 50%, #e8edf2 75%);
    background-size: 800px 100%;
    animation: managerDashShimmer 1.4s infinite linear;
    border-radius: 8px;
  }
`;

function ManagerDashboardSkeleton() {
  return (
    <>
      <style>{shimmerCSS}</style>
      <div style={{ display: "flex", flexDirection: "column", gap: "24px", width: "100%" }}>
        {/* Title row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div className="mdsk" style={{ height: 28, width: 240, marginBottom: 8 }} />
            <div className="mdsk" style={{ height: 16, width: 300 }} />
          </div>
        </div>

        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "18px" }}>
          {[1, 2, 3].map((i: number) => (
            <div key={i} className="mdsk" style={{ height: 110, borderRadius: 12 }} />
          ))}
        </div>

        {/* Staff Table */}
        <div style={{ background: "#FFFFFF", borderRadius: 12, overflow: "hidden", border: "1px solid #E5E7EB", padding: "20px" }}>
          <div className="mdsk" style={{ height: 40, width: "100%", marginBottom: 16 }} />
          {[1, 2, 3, 4, 5].map((i: number) => (
            <div key={i} className="mdsk" style={{ height: 48, width: "100%", marginBottom: 8 }} />
          ))}
        </div>
      </div>
    </>
  );
}

export default function ManagerDashboardView() {
  const [searchQuery, setSearchQuery] = useState("");
  const { data, isLoading, isError, error, refetch } = useManagerDashboard();

  const staff: ManagerDashboardStaffItem[] = useMemo(() => {
    return Array.isArray(data?.staff) ? data.staff : [];
  }, [data]);

  const filteredStaff: ManagerDashboardStaffItem[] = useMemo(() => {
    if (!searchQuery.trim()) return staff;
    const query = searchQuery.toLowerCase().trim();
    return staff.filter(
      (s: ManagerDashboardStaffItem) =>
        s.name.toLowerCase().includes(query) ||
        (Array.isArray(s.role) ? s.role : [String(s.role)]).some((r: string) => r.toLowerCase().includes(query)) ||
        (s.status && s.status.toLowerCase().includes(query))
    );
  }, [staff, searchQuery]);

  const totalStaff = data?.totalStaff ?? staff.length;
  const activeStaff = data?.activeStaff ?? staff.filter((s: ManagerDashboardStaffItem) => String(s.status).toUpperCase() === "ACTIVE").length;
  const totalTicketsProcessed = data?.totalTicketsProcessed ?? staff.reduce((sum: number, s: ManagerDashboardStaffItem) => sum + (s.ticketsIssued ?? 0), 0);
  const estimatedRevenue = data?.estimatedRevenue ?? totalTicketsProcessed * 250;

  if (isLoading) {
    return <ManagerDashboardSkeleton />;
  }

  if (isError) {
    const errorMsg = (error as any)?.response?.data?.message || (error as any)?.message || "Failed to load manager dashboard data.";
    return (
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "16px",
          padding: "48px 24px",
          textAlign: "center",
          boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
          border: `1px solid ${colors.header.border}`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "16px",
        }}
      >
        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            background: "#FEF2F2",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <AlertCircle size={28} color="#DC2626" />
        </div>
        <div>
          <h2
            style={{
              fontFamily: typography.fontFamily.sans,
              fontWeight: 700,
              fontSize: "18px",
              color: colors.text.primary,
              margin: "0 0 6px 0",
            }}
          >
            Unable to Load Manager Dashboard
          </h2>
          <p style={{ margin: 0, fontSize: "14px", color: colors.text.muted, maxWidth: "420px" }}>
            {errorMsg}
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 20px",
            borderRadius: "8px",
            background: colors.brand.primary,
            color: colors.sidebar.bg,
            border: "none",
            fontSize: "14px",
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: typography.fontFamily.sans,
            boxShadow: "0 4px 12px rgba(244, 188, 67, 0.3)",
          }}
        >
          <RefreshCw size={15} />
          <span>Try Again</span>
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header Title */}
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
          Manager Dashboard
        </h1>
        <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: colors.text.muted }}>
          Operations &amp; Staff Performance Overview
        </p>
      </div>

      {/* Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "18px" }}>
        <Link
          href="/staff-management"
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
            <span style={{ fontFamily: typography.fontFamily.sans, fontSize: "13px", fontWeight: typography.fontWeight.medium, color: colors.text.muted, display: "block" }}>
              Total Number of Staff
            </span>
            <span style={{ fontFamily: typography.fontFamily.sans, fontSize: "28px", fontWeight: typography.fontWeight.bold, color: colors.text.primary, margin: "4px 0", display: "block" }}>
              {totalStaff.toLocaleString("en-IN")}
            </span>
            <span style={{ fontSize: "12px", color: colors.status.success, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "3px" }}>
              <UserCog size={14} /> {activeStaff} Active &bull; View All &rarr;
            </span>
          </div>
          <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "rgba(244, 188, 67, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <UserCog size={24} color={colors.sidebar.bg} />
          </div>
        </Link>

        <div
          style={{
            background: "#FFFFFF",
            borderRadius: "12px",
            padding: "20px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderLeft: `4px solid ${colors.brand.accent}`,
          }}
        >
          <div>
            <span style={{ fontFamily: typography.fontFamily.sans, fontSize: "13px", fontWeight: typography.fontWeight.medium, color: colors.text.muted, display: "block" }}>
              Total Tickets Processed
            </span>
            <span style={{ fontFamily: typography.fontFamily.sans, fontSize: "28px", fontWeight: typography.fontWeight.bold, color: colors.text.primary, margin: "4px 0", display: "block" }}>
              {totalTicketsProcessed.toLocaleString("en-IN")}
            </span>
            <span style={{ fontSize: "12px", color: colors.brand.accent, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "4px" }}>
              <BookOpen size={14} /> Across All Assigned Counters
            </span>
          </div>
          <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "rgba(35, 114, 165, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <BookOpen size={24} color={colors.brand.accent} />
          </div>
        </div>

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
            <span style={{ fontFamily: typography.fontFamily.sans, fontSize: "13px", fontWeight: typography.fontWeight.medium, color: "rgba(255,255,255,0.7)", display: "block" }}>
              Estimated Revenue
            </span>
            <span style={{ fontFamily: typography.fontFamily.sans, fontSize: "26px", fontWeight: typography.fontWeight.bold, color: colors.brand.primary, margin: "4px 0", display: "block" }}>
              ₹{estimatedRevenue.toLocaleString("en-IN")}
            </span>
            <span style={{ fontSize: "12px", color: colors.status.success, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "2px" }}>
              <ArrowUpRight size={14} /> Live Staff Collections
            </span>
          </div>
          <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "rgba(244, 188, 67, 0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <IndianRupee size={24} color={colors.brand.primary} />
          </div>
        </div>
      </div>

      {/* Recent Staff Table */}
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "12px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
          overflow: "hidden",
          border: `1px solid ${colors.header.border}`,
        }}
      >
        <div style={{ padding: "18px 24px", borderBottom: `1px solid ${colors.header.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h3 style={{ fontFamily: typography.fontFamily.sans, fontWeight: typography.fontWeight.bold, fontSize: "16px", color: colors.text.primary, margin: 0 }}>
              Staff Overview
            </h3>
            <span style={{ fontSize: "13px", color: colors.text.muted }}>
              Showing {filteredStaff.length} staff member{filteredStaff.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", border: `1px solid ${colors.header.border}`, borderRadius: "8px", padding: "0 12px", height: "36px", minWidth: "220px", background: "#FFFFFF" }}>
            <Search size={15} color={colors.text.muted} />
            <input
              type="text"
              placeholder="Search staff..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: "100%", border: "none", outline: "none", fontFamily: typography.fontFamily.sans, fontSize: "13px", color: colors.text.primary, background: "transparent" }}
            />
          </div>

          <Link
            href="/staff-management"
            prefetch={true}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 600, color: colors.brand.accent, textDecoration: "none", padding: "6px 14px", borderRadius: "8px", border: `1px solid ${colors.header.border}`, background: "#FFFFFF", transition: "all 0.18s ease" }}
            className="view-all-link"
          >
            View All Staff →
          </Link>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontFamily: typography.fontFamily.sans, fontSize: "14px" }}>
            <thead>
              <tr style={{ background: "#F8FAFC", borderBottom: `1px solid ${colors.header.border}`, color: colors.text.muted, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                <th style={{ padding: "14px 20px" }}>Staff Name</th>
                <th style={{ padding: "14px 20px" }}>Role</th>
                <th style={{ padding: "14px 20px" }}>Tickets Processed</th>
                <th style={{ padding: "14px 20px" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredStaff.map((s: ManagerDashboardStaffItem) => {
                const isAct = String(s.status).toUpperCase() === "ACTIVE";
                const roles = Array.isArray(s.role) ? s.role : [String(s.role)];
                return (
                  <tr key={s.id} style={{ borderBottom: `1px solid ${colors.header.border}`, transition: "background 0.15s ease" }} className="table-row-hover">
                    <td style={{ padding: "14px 20px", fontWeight: 600 }}>{s.name}</td>
                    <td style={{ padding: "14px 20px" }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                        {roles.map((r: string) => (
                          <span key={r} style={{ background: colors.bg.page, padding: "4px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: 600, color: colors.brand.accent }}>
                            {r}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ padding: "14px 20px", fontWeight: 700 }}>{(typeof s.ticketsIssued === "number" ? s.ticketsIssued : 0).toLocaleString("en-IN")}</td>
                    <td style={{ padding: "14px 20px" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: 600, background: isAct ? "#F0FDF4" : "#FEF2F2", color: isAct ? colors.status.success : colors.status.error }}>
                        {isAct ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                        {isAct ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filteredStaff.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: "32px", textAlign: "center", color: colors.text.muted }}>
                    {searchQuery ? `No staff found matching "${searchQuery}".` : "No staff members assigned to this manager yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        .table-row-hover:hover { background: #F8FAFC !important; }
        .view-all-link:hover { background: ${colors.bg.page} !important; color: ${colors.sidebar.bg} !important; }
        .stat-card-hover:hover { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(0,0,0,0.08) !important; }
      `}</style>
    </div>
  );
}

