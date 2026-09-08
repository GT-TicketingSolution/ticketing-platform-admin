"use client";

import React from "react";
import {
  ChevronDown,
  ChevronUp,
  Ticket,
  CreditCard,
  Building2,
  Download,
  Printer,
  ExternalLink,
} from "lucide-react";
import { AttractionReportData } from "@/lib/reportsData";
import { colors } from "@/lib/theme";
import { exportToCSV } from "@/lib/exportUtils";
import StatusBadge from "@/components/ui/StatusBadge";

interface AttractionReportCardProps {
  report: AttractionReportData;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onSelectSingle: (attractionName: string) => void;
  fromDate?: string;
  toDate?: string;
  onPrint?: (report: AttractionReportData) => void;
}

export default function AttractionReportCard({
  report,
  isExpanded,
  onToggleExpand,
  onSelectSingle,
  fromDate,
  toDate,
  onPrint,
}: AttractionReportCardProps) {
  const { attraction, totalRevenue, totalTicketsSold, totalBookings, categoryBreakdown, paymentBreakdown, transactions } = report;
  const hasData = totalRevenue > 0 || totalTicketsSold > 0 || totalBookings > 0;

  const handleExportAttractionCSV = (e: React.MouseEvent) => {
    e.stopPropagation();
    const headers = ["Transaction ID", "Customer Name", "Date/Time", "Amount (₹)", "Payment Mode", "Status"];
    const rows: (string | number | boolean)[][] = transactions.map((t) => [
      t.invoiceId || t.id || "",
      t.customerName || "",
      t.dateTime || t.transactionDate || "",
      t.amount ?? 0,
      t.paymentMode || "",
      t.status || "",
    ]);

    exportToCSV(
      `${attraction.name.replace(/\s+/g, "_")}_Sales_Report_${fromDate || "all"}_to_${toDate || "all"}`,
      headers,
      rows
    );
  };

  return (
    <div
      style={{
        backgroundColor: colors.bg.card,
        borderRadius: "14px",
        border: `1px solid ${isExpanded ? "#2372A5" : "#E2E8F0"}`,
        boxShadow: isExpanded
          ? "0 10px 25px -5px rgba(35, 114, 165, 0.12), 0 8px 10px -6px rgba(35, 114, 165, 0.05)"
          : "0 2px 8px rgba(0,0,0,0.04)",
        transition: "all 0.25s ease-in-out",
        overflow: "hidden",
        marginBottom: "16px",
      }}
    >
      {/* Accordion Header Row */}
      <div
        onClick={onToggleExpand}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "18px 24px",
          cursor: "pointer",
          userSelect: "none",
          backgroundColor: isExpanded ? "#F8FAFC" : "#FFFFFF",
          transition: "background-color 0.2s ease",
        }}
      >
        {/* Left Side: Image/Icon, Name & Badges */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px", flex: 1 }}>
          {attraction.image ? (
            <img
              src={attraction.image}
              alt={attraction.name}
              style={{
                width: 52,
                height: 52,
                borderRadius: 12,
                objectFit: "cover",
                border: "2px solid #E2E8F0",
                backgroundColor: "#F1F5F9",
              }}
              onError={(e) => {
                // Fallback to icon if image fails to load
                (e.target as HTMLElement).style.display = "none";
              }}
            />
          ) : (
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 12,
                backgroundColor: "#E0F2FE",
                color: "#0284C7",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
              }}
            >
              <Building2 size={24} />
            </div>
          )}

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: "17px",
                  fontWeight: 700,
                  color: colors.text.primary,
                  letterSpacing: "-0.01em",
                }}
              >
                {attraction.name}
              </h3>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  padding: "3px 10px",
                  borderRadius: "20px",
                  backgroundColor: "#E0F2FE",
                  color: "#0369A1",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {attraction.category}
              </span>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  padding: "3px 10px",
                  borderRadius: "20px",
                  backgroundColor: attraction.status === "Active" ? "#DCFCE7" : "#FEE2E2",
                  color: attraction.status === "Active" ? "#15803D" : "#B91C1C",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    backgroundColor: attraction.status === "Active" ? "#22C55E" : "#EF4444",
                  }}
                />
                {attraction.status}
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "16px", marginTop: "6px", fontSize: "13px", color: colors.text.muted }}>
              {attraction.timing ? (
                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  {attraction.timing}
                </span>
              ) : null}
              {/* <span>•</span>
              <span style={{ fontWeight: 500, color: "#475569" }}>
                Adult Rate: ₹{attraction.pricing?.adult ?? 100}
              </span> */}
            </div>
          </div>
        </div>

        {/* Center/Right: Quick Metrics Pills */}
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          {/* Revenue Pill */}
          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: "11px", fontWeight: 600, color: colors.text.muted, textTransform: "uppercase" }}>
              Total Revenue
            </span>
            <div style={{ fontSize: "18px", fontWeight: 800, color: "#0F172A", display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
              <span style={{ color: "#16A34A", marginRight: "2px" }}>₹</span>
              {totalRevenue.toLocaleString("en-IN")}
            </div>
          </div>

          {/* Tickets Sold Pill */}
          <div style={{ textAlign: "right" }} className="hidden sm:block">
            <span style={{ fontSize: "11px", fontWeight: 600, color: colors.text.muted, textTransform: "uppercase" }}>
              Tickets Sold
            </span>
            <div style={{ fontSize: "16px", fontWeight: 700, color: colors.text.primary, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "4px" }}>
              <Ticket size={16} color="#0284C7" />
              {totalTicketsSold.toLocaleString("en-IN")}
            </div>
          </div>

          {/* Down Arrow / Accordion Indicator */}
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              backgroundColor: isExpanded ? "#011B2F" : "#F1F5F9",
              color: isExpanded ? "#FFFFFF" : "#64748B",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s ease",
            }}
            title={isExpanded ? "Click to collapse" : "Click to expand sales report"}
          >
            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        </div>
      </div>

      {/* Accordion Collapsible Content */}
      {isExpanded && (
        <div
          style={{
            borderTop: "1px solid #E2E8F0",
            backgroundColor: "#FFFFFF",
            padding: "24px",
            animation: "fadeIn 0.3s ease-in-out",
          }}
        >
          {/* Action Toolbar Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
              paddingBottom: "14px",
              borderBottom: "1px solid #F1F5F9",
            }}
          >
            <div style={{ fontSize: "15px", fontWeight: 700, color: "#0F172A", display: "flex", alignItems: "center", gap: "8px" }}>
              <Ticket size={18} color="#2372A5" />
              Sales & Ticket Category Breakdown
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              {onPrint ? (
                <button
                  type="button"
                  disabled={!hasData}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!hasData) return;
                    onPrint(report);
                  }}
                  title={!hasData ? "No sales data available to print" : undefined}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 14px",
                    borderRadius: "8px",
                    backgroundColor: !hasData ? "#94A3B8" : "#0C2A42",
                    color: !hasData ? "#E2E8F0" : "#F4BC43",
                    border: !hasData ? "1px solid #94A3B8" : "1px solid #0C2A42",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: !hasData ? "not-allowed" : "pointer",
                    boxShadow: !hasData ? "none" : "0 2px 6px rgba(12, 42, 66, 0.2)",
                    opacity: !hasData ? 0.6 : 1,
                    transition: "all 0.15s ease",
                  }}
                >
                  <Printer size={14} />
                  Print
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!hasData}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!hasData) return;
                    handleExportAttractionCSV(e);
                  }}
                  title={!hasData ? "No sales data available to export" : undefined}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 14px",
                    borderRadius: "8px",
                    backgroundColor: "#F8FAFC",
                    color: !hasData ? "#94A3B8" : "#334155",
                    border: "1px solid #CBD5E1",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: !hasData ? "not-allowed" : "pointer",
                    opacity: !hasData ? 0.6 : 1,
                  }}
                >
                  <Download size={14} />
                  Export CSV
                </button>
              )}
            </div>
          </div>

          {/* Grid Layout: Category Breakdown & Payment Breakdown */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "20px",
              marginBottom: "24px",
            }}
          >
            {/* Category Sales Breakdown Table */}
            <div
              style={{
                backgroundColor: "#F8FAFC",
                borderRadius: "10px",
                padding: "16px",
                border: "1px solid #E2E8F0",
              }}
            >
              <h4 style={{ margin: "0 0 12px 0", fontSize: "13px", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                Ticket Category Sales
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {categoryBreakdown.length > 0 ? (
                  categoryBreakdown.map((cat) => (
                    <div
                      key={cat.category}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 12px",
                        borderRadius: "6px",
                        backgroundColor: "#FFFFFF",
                        border: "1px solid #E2E8F0",
                        fontSize: "13px",
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: 600, color: colors.text.primary }}>{cat.category}</span>
                        <span style={{ fontSize: "11px", color: colors.text.muted, marginLeft: "8px" }}>
                          (₹{cat.unitPrice}/tkt)
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                        <span style={{ fontWeight: 600, color: "#0284C7" }}>
                          {cat.count} tickets
                        </span>
                        <span style={{ fontWeight: 700, color: "#16A34A", width: "80px", textAlign: "right" }}>
                          ₹{cat.revenue.toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: "12px", color: colors.text.muted, fontSize: "13px" }}>
                    No ticket sales recorded in selected date range.
                  </div>
                )}
              </div>
            </div>

            {/* Payment Modes & Quick KPI Cards */}
            <div
              style={{
                backgroundColor: "#F8FAFC",
                borderRadius: "10px",
                padding: "16px",
                border: "1px solid #E2E8F0",
              }}
            >
              <h4 style={{ margin: "0 0 12px 0", fontSize: "13px", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                Payment Distribution
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {paymentBreakdown.length > 0 ? (
                  paymentBreakdown.map((pm) => (
                    <div
                      key={pm.mode}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 12px",
                        borderRadius: "6px",
                        backgroundColor: "#FFFFFF",
                        border: "1px solid #E2E8F0",
                        fontSize: "13px",
                      }}
                    >
                      <span style={{ fontWeight: 600, color: colors.text.primary, display: "flex", alignItems: "center", gap: "6px" }}>
                        <CreditCard size={15} color="#2372A5" />
                        {pm.mode}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                        <span style={{ fontSize: "12px", color: colors.text.muted, whiteSpace: "nowrap" }}>
                          {pm.count} txn
                        </span>
                        <span style={{ fontWeight: 700, color: "#0F172A", minWidth: "85px", textAlign: "right" }}>
                          ₹{pm.revenue.toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: "12px", color: colors.text.muted, fontSize: "13px" }}>
                    No payment data recorded in selected date range.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Transactions Log for this Attraction (recent 6 only) */}
          {(() => {
            const recentTransactions = transactions.slice(0, 6);
            return (
              <div>
                <h4 style={{ margin: "0 0 12px 0", fontSize: "14px", fontWeight: 700, color: colors.text.primary }}>
                  Recent Sales & Transactions ({recentTransactions.length})
                </h4>

                {recentTransactions.length > 0 ? (
                  <div style={{ overflowX: "auto", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                      <thead>
                        <tr style={{ backgroundColor: "#F1F5F9", textTransform: "uppercase", fontSize: "11px", letterSpacing: "0.05em", color: "#475569" }}>
                          <th style={{ padding: "10px 14px", textAlign: "left" }}>INV Number</th>
                          <th style={{ padding: "10px 14px", textAlign: "left" }}>Customer</th>
                          <th style={{ padding: "10px 14px", textAlign: "left" }}>Date & Time</th>
                          <th style={{ padding: "10px 14px", textAlign: "left" }}>Payment Mode</th>
                          <th style={{ padding: "10px 14px", textAlign: "right" }}>Amount</th>
                          <th style={{ padding: "10px 14px", textAlign: "center" }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentTransactions.map((t, idx) => {
                          const rawInv = t.invoiceId || (t as any).invoiceNumber || t.id;
                          const invNumber = rawInv && String(rawInv).trim() !== "" && String(rawInv).trim() !== "-" ? String(rawInv).trim() : "-";

                          const rawCustomer = t.customerName;
                          const customer = rawCustomer && String(rawCustomer).trim() !== "" && String(rawCustomer).trim() !== "-" ? String(rawCustomer).trim() : "-";

                          const rawDateTime = t.dateTime || t.transactionDate || (t as any).date;
                          const dateTime = rawDateTime && String(rawDateTime).trim() !== "" && String(rawDateTime).trim() !== "-" ? String(rawDateTime).trim() : "-";

                          const rawPayment = t.paymentMode;
                          const paymentMode = rawPayment && String(rawPayment).trim() !== "" && String(rawPayment).trim() !== "-" ? String(rawPayment).trim() : "-";

                          const hasAmount = t.amount !== undefined && t.amount !== null && !isNaN(Number(t.amount)) && String(t.amount).trim() !== "";
                          const displayAmount = hasAmount ? `₹${Number(t.amount).toLocaleString("en-IN")}` : "-";

                          const rawStatus = t.status;
                          const hasStatus = Boolean(rawStatus && String(rawStatus).trim() !== "" && String(rawStatus).trim() !== "-");

                          return (
                            <tr
                              key={`${t.id || idx}-${idx}`}
                              style={{
                                borderBottom: idx === recentTransactions.length - 1 ? "none" : "1px solid #F1F5F9",
                                backgroundColor: idx % 2 === 0 ? "#FFFFFF" : "#FAFAFA",
                              }}
                            >
                              <td style={{ padding: "10px 14px", fontWeight: 600, color: invNumber !== "-" ? "#0284C7" : colors.text.muted }}>
                                {invNumber}
                              </td>
                              <td style={{ padding: "10px 14px", fontWeight: 500, color: customer !== "-" ? colors.text.primary : colors.text.muted }}>
                                {customer}
                              </td>
                              <td style={{ padding: "10px 14px", color: colors.text.muted }}>
                                {dateTime}
                              </td>
                              <td style={{ padding: "10px 14px", color: paymentMode !== "-" ? colors.text.primary : colors.text.muted }}>
                                {paymentMode}
                              </td>
                              <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700, color: hasAmount ? "#16A34A" : colors.text.muted }}>
                                {displayAmount}
                              </td>
                              <td style={{ padding: "10px 14px", textAlign: "center" }}>
                                {hasStatus ? <StatusBadge status={String(rawStatus).trim()} /> : <span style={{ color: colors.text.muted }}>-</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ padding: "16px", textAlign: "center", color: colors.text.muted, fontSize: "13px", backgroundColor: "#F8FAFC", borderRadius: "8px" }}>
                    No recent transactions found for {attraction.name} in this date range.
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
