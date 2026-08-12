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
} from "lucide-react";
import { colors, typography } from "@/lib/theme";
import { INITIAL_STAFF, StaffUser } from "@/types/admin";

export default function ManagerDashboardView() {
  const [staff] = useState<StaffUser[]>(INITIAL_STAFF);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredStaff = useMemo(() => {
    return staff.filter(
      (s) =>
        searchQuery === "" ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.role.some((r) => r.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [staff, searchQuery]);

  const totalStaff = filteredStaff.length;
  const activeStaff = filteredStaff.filter((s) => s.status === "Active").length;
  const totalTicketsProcessed = useMemo(
    () => filteredStaff.reduce((sum, s) => sum + s.ticketsIssued, 0),
    [filteredStaff]
  );

  const estimatedRevenue = totalTicketsProcessed * 250;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header Title */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
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
              {totalStaff}
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
              <BookOpen size={14} /> Across All Counters
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
              <ArrowUpRight size={14} /> Based on Tickets × ₹250
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
              Showing {Math.min(5, filteredStaff.length)} of {filteredStaff.length} staff members
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
            View All →
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
              {filteredStaff.slice(0, 5).map((s) => (
                <tr key={s.id} style={{ borderBottom: `1px solid ${colors.header.border}`, transition: "background 0.15s ease" }} className="table-row-hover">
                  <td style={{ padding: "14px 20px", fontWeight: 600 }}>{s.name}</td>
                  <td style={{ padding: "14px 20px" }}>
                    <span style={{ background: colors.bg.page, padding: "4px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: 600, color: colors.brand.accent }}>
                      {s.role.join(", ")}
                    </span>
                  </td>
                  <td style={{ padding: "14px 20px", fontWeight: 700 }}>{s.ticketsIssued.toLocaleString()}</td>
                  <td style={{ padding: "14px 20px" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: 600, background: s.status === "Active" ? "#F0FDF4" : "#FEF2F2", color: s.status === "Active" ? colors.status.success : colors.status.error }}>
                      {s.status === "Active" ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredStaff.length === 0 && (
                <tr><td colSpan={4} style={{ padding: "32px", textAlign: "center", color: colors.text.muted }}>No staff found.</td></tr>
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
