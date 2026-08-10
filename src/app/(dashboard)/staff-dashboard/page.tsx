"use client";

import {
  Ticket,
  ScanLine,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";
import { colors, typography } from "@/lib/theme";

// Mock ticket stats for staff dashboard
const STAFF_STATS = {
  ticketsIssuedToday: 142,
  ticketsPendingScan: 28,
  ticketsValidated: 114,
  revenue: 35500,
};

const RECENT_TICKETS = [
  { id: "TKT-9021", visitor: "Priya Singh", type: "Adult", amount: 250, time: "11:45 AM", status: "Validated" },
  { id: "TKT-9020", visitor: "Rahul Gupta", type: "Group (5)", amount: 1000, time: "11:32 AM", status: "Pending Scan" },
  { id: "TKT-9019", visitor: "Sunita Devi", type: "Child", amount: 125, time: "11:18 AM", status: "Validated" },
  { id: "TKT-9018", visitor: "Manish Rao", type: "Adult", amount: 250, time: "11:02 AM", status: "Validated" },
  { id: "TKT-9017", visitor: "Kavya Nair", type: "Senior", amount: 150, time: "10:55 AM", status: "Cancelled" },
];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  "Validated": { bg: "#F0FDF4", text: "#16A34A" },
  "Pending Scan": { bg: "#FFF7ED", text: "#EA580C" },
  "Cancelled": { bg: "#FEF2F2", text: "#DC2626" },
};

export default function StaffDashboardPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* ── Header ── */}
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
          Staff Dashboard
        </h1>
        <p style={{ fontFamily: typography.fontFamily.sans, fontSize: "14px", color: colors.text.muted, margin: "4px 0 0 0" }}>
          Today's ticketing activity and quick access to your work tools.
        </p>
      </div>

      {/* ── Stat Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "18px" }}>
        {/* Tickets Issued Today (→ ticket-booking) */}
        <Link
          href="/ticket-booking"
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
          }}
          className="stat-card-hover"
        >
          <div>
            <span style={{ fontFamily: typography.fontFamily.sans, fontSize: "13px", fontWeight: 500, color: colors.text.muted, display: "block" }}>Tickets Issued Today</span>
            <span style={{ fontFamily: typography.fontFamily.sans, fontSize: "28px", fontWeight: 700, color: colors.text.primary, margin: "4px 0", display: "block" }}>
              {STAFF_STATS.ticketsIssuedToday}
            </span>
            <span style={{ fontSize: "12px", color: colors.status.success, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "3px" }}>
              <Ticket size={13} /> Issue Ticket &rarr;
            </span>
          </div>
          <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "rgba(244, 188, 67, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Ticket size={24} color={colors.sidebar.bg} />
          </div>
        </Link>

        {/* Pending Scan (→ scanner) */}
        <Link
          href="/scanner"
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
          }}
          className="stat-card-hover"
        >
          <div>
            <span style={{ fontFamily: typography.fontFamily.sans, fontSize: "13px", fontWeight: 500, color: colors.text.muted, display: "block" }}>Pending Scans</span>
            <span style={{ fontFamily: typography.fontFamily.sans, fontSize: "28px", fontWeight: 700, color: colors.text.primary, margin: "4px 0", display: "block" }}>
              {STAFF_STATS.ticketsPendingScan}
            </span>
            <span style={{ fontSize: "12px", color: colors.brand.accent, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "3px" }}>
              <ScanLine size={13} /> Open Scanner &rarr;
            </span>
          </div>
          <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "rgba(35, 114, 165, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ScanLine size={24} color={colors.brand.accent} />
          </div>
        </Link>

        {/* Tickets Validated */}
        <div style={{ background: "#FFFFFF", borderRadius: "12px", padding: "20px", boxShadow: "0 2px 10px rgba(0,0,0,0.04)", display: "flex", alignItems: "center", justifyContent: "space-between", borderLeft: `4px solid ${colors.status.success}` }}>
          <div>
            <span style={{ fontFamily: typography.fontFamily.sans, fontSize: "13px", fontWeight: 500, color: colors.text.muted, display: "block" }}>Tickets Validated</span>
            <span style={{ fontFamily: typography.fontFamily.sans, fontSize: "28px", fontWeight: 700, color: colors.text.primary, margin: "4px 0", display: "block" }}>
              {STAFF_STATS.ticketsValidated}
            </span>
            <span style={{ fontSize: "12px", color: colors.status.success, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "3px" }}>
              <CheckCircle2 size={13} /> Confirmed Entries
            </span>
          </div>
          <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "rgba(22, 163, 74, 0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CheckCircle2 size={24} color={colors.status.success} />
          </div>
        </div>

        {/* Revenue card */}
        <div style={{ background: colors.sidebar.bg, borderRadius: "12px", padding: "20px", boxShadow: "0 4px 14px rgba(12, 42, 66, 0.15)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <span style={{ fontFamily: typography.fontFamily.sans, fontSize: "13px", fontWeight: 500, color: "rgba(255,255,255,0.7)", display: "block" }}>Today's Revenue</span>
            <span style={{ fontFamily: typography.fontFamily.sans, fontSize: "26px", fontWeight: 700, color: colors.brand.primary, margin: "4px 0", display: "block" }}>
              ₹{STAFF_STATS.revenue.toLocaleString("en-IN")}
            </span>
            <span style={{ fontSize: "12px", color: colors.status.success, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "2px" }}>
              <ArrowUpRight size={14} /> Counter Collections
            </span>
          </div>
          <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "rgba(244, 188, 67, 0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Ticket size={24} color={colors.brand.primary} />
          </div>
        </div>
      </div>

      {/* ── Quick Actions ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <Link
          href="/ticket-booking"
          prefetch={true}
          style={{
            background: colors.brand.primary,
            color: colors.sidebar.bg,
            borderRadius: "12px",
            padding: "18px 24px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            textDecoration: "none",
            fontFamily: typography.fontFamily.sans,
            fontWeight: 700,
            fontSize: "16px",
            boxShadow: "0 4px 14px rgba(244, 188, 67, 0.3)",
            transition: "all 0.18s ease",
          }}
          className="quick-action-btn"
        >
          <div style={{ width: "44px", height: "44px", borderRadius: "10px", background: "rgba(12, 42, 66, 0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Ticket size={22} color={colors.sidebar.bg} />
          </div>
          <div>
            <div style={{ fontSize: "16px", fontWeight: 700 }}>Issue New Ticket</div>
            <div style={{ fontSize: "12px", fontWeight: 500, opacity: 0.7 }}>Book visitor entry tickets</div>
          </div>
        </Link>

        <Link
          href="/scanner"
          prefetch={true}
          style={{
            background: colors.sidebar.bg,
            color: "#FFFFFF",
            borderRadius: "12px",
            padding: "18px 24px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            textDecoration: "none",
            fontFamily: typography.fontFamily.sans,
            fontWeight: 700,
            fontSize: "16px",
            boxShadow: "0 4px 14px rgba(12, 42, 66, 0.2)",
            transition: "all 0.18s ease",
          }}
          className="quick-action-btn"
        >
          <div style={{ width: "44px", height: "44px", borderRadius: "10px", background: "rgba(244, 188, 67, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <ScanLine size={22} color={colors.brand.primary} />
          </div>
          <div>
            <div style={{ fontSize: "16px", fontWeight: 700 }}>Scan & Validate</div>
            <div style={{ fontSize: "12px", fontWeight: 500, opacity: 0.7, color: "rgba(255,255,255,0.7)" }}>Verify visitor entry QR codes</div>
          </div>
        </Link>
      </div>

      {/* ── Recent Tickets Table ── */}
      <div style={{ background: "#FFFFFF", borderRadius: "12px", boxShadow: "0 2px 10px rgba(0,0,0,0.04)", overflow: "hidden", border: `1px solid ${colors.header.border}` }}>
        <div style={{ padding: "18px 24px", borderBottom: `1px solid ${colors.header.border}` }}>
          <h3 style={{ fontFamily: typography.fontFamily.sans, fontWeight: 700, fontSize: "16px", color: colors.text.primary, margin: 0 }}>Recent Tickets</h3>
          <span style={{ fontSize: "13px", color: colors.text.muted }}>Last 5 tickets processed at your counter</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontFamily: typography.fontFamily.sans, fontSize: "14px" }}>
            <thead>
              <tr style={{ background: "#F8FAFC", borderBottom: `1px solid ${colors.header.border}`, color: colors.text.muted, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                <th style={{ padding: "14px 20px" }}>Ticket ID</th>
                <th style={{ padding: "14px 20px" }}>Visitor</th>
                <th style={{ padding: "14px 20px" }}>Type</th>
                <th style={{ padding: "14px 20px" }}>Amount</th>
                <th style={{ padding: "14px 20px" }}>Time</th>
                <th style={{ padding: "14px 20px" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {RECENT_TICKETS.map((t) => (
                <tr key={t.id} style={{ borderBottom: `1px solid ${colors.header.border}` }} className="table-row-hover">
                  <td style={{ padding: "14px 20px", fontWeight: 600, color: colors.brand.accent }}>{t.id}</td>
                  <td style={{ padding: "14px 20px" }}>{t.visitor}</td>
                  <td style={{ padding: "14px 20px" }}>
                    <span style={{ background: colors.bg.page, padding: "3px 8px", borderRadius: "5px", fontSize: "12px", fontWeight: 600, color: colors.text.muted }}>{t.type}</span>
                  </td>
                  <td style={{ padding: "14px 20px", fontWeight: 700 }}>₹{t.amount}</td>
                  <td style={{ padding: "14px 20px", color: colors.text.muted }}>{t.time}</td>
                  <td style={{ padding: "14px 20px" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: 600, background: STATUS_COLORS[t.status]?.bg, color: STATUS_COLORS[t.status]?.text }}>
                      {t.status === "Validated" && <CheckCircle2 size={12} />}
                      {t.status === "Pending Scan" && <Clock size={12} />}
                      {t.status === "Cancelled" && <XCircle size={12} />}
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        .table-row-hover:hover { background: #F8FAFC !important; }
        .stat-card-hover:hover { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(0,0,0,0.08) !important; }
        .quick-action-btn:hover { transform: translateY(-2px); filter: brightness(1.05); }
      `}</style>
    </div>
  );
}
