"use client";

import React from "react";
import {
  Building2,
  CreditCard,
  Download,
  Printer,
  Tag,
  ArrowLeft,
  IndianRupee,
  Ticket,
  Layers,
} from "lucide-react";
import { AttractionReportData } from "@/lib/reportsData";
import { colors } from "@/lib/theme";
import { exportToCSV } from "@/lib/exportUtils";
import StatusBadge from "@/components/ui/StatusBadge";
import { GlobalDataTable, GlobalColumn } from "@/components/ui/GlobalDataTable";
import { Transaction } from "@/types/transaction";

interface SingleAttractionReportViewProps {
  reportData: AttractionReportData;
  onBackToAll: () => void;
  fromDate?: string;
  toDate?: string;
  onPrint?: () => void;
}

export default function SingleAttractionReportView({
  reportData,
  onBackToAll,
  fromDate,
  toDate,
  onPrint,
}: SingleAttractionReportViewProps) {
  const {
    attraction,
    totalRevenue,
    totalTicketsSold,
    totalBookings,
    avgOrderValue,
    categoryBreakdown,
    paymentBreakdown,
    transactions,
  } = reportData;
  const hasData = totalRevenue > 0 || totalTicketsSold > 0 || totalBookings > 0;

  const handleExportCSV = () => {
    const headers = ["Transaction ID", "Customer Name", "Date & Time", "Payment Mode", "Amount (₹)", "Status"];
    const rows: (string | number | boolean)[][] = transactions.map((t) => [
      t.id || "",
      t.customerName || "",
      t.dateTime || t.transactionDate || "",
      t.paymentMode || "",
      t.amount ?? 0,
      t.status || "",
    ]);

    exportToCSV(
      `Sales_Report_${attraction.name.replace(/\s+/g, "_")}_${fromDate || "all"}_to_${toDate || "all"}`,
      headers,
      rows
    );
  };

  const columns: GlobalColumn<Transaction>[] = [
    {
      header: "Transaction ID",
      accessorKey: "id",
      cell: (t) => {
        const rawInv = t.invoiceId || (t as any).invoiceNumber || t.id;
        const inv = rawInv && String(rawInv).trim() !== "" && String(rawInv).trim() !== "-" ? String(rawInv).trim() : "-";
        return (
          <span style={{ fontWeight: 600, color: inv !== "-" ? "#0284C7" : colors.text.muted }}>
            {inv}
          </span>
        );
      },
    },
    {
      header: "Customer Name",
      accessorKey: "customerName",
      cell: (t) => {
        const rawName = t.customerName;
        const name = rawName && String(rawName).trim() !== "" && String(rawName).trim() !== "-" ? String(rawName).trim() : "-";
        return (
          <span style={{ fontWeight: 500, color: name !== "-" ? colors.text.primary : colors.text.muted }}>
            {name}
          </span>
        );
      },
    },
    {
      header: "Date & Time",
      cell: (t) => {
        const rawDt = t.dateTime || t.transactionDate || (t as any).date;
        const dt = rawDt && String(rawDt).trim() !== "" && String(rawDt).trim() !== "-" ? String(rawDt).trim() : "-";
        return <span style={{ color: colors.text.muted }}>{dt}</span>;
      },
    },
    {
      header: "Payment Mode",
      accessorKey: "paymentMode",
      cell: (t) => {
        const rawMode = t.paymentMode;
        const mode = rawMode && String(rawMode).trim() !== "" && String(rawMode).trim() !== "-" ? String(rawMode).trim() : "-";
        return <span style={{ color: mode !== "-" ? colors.text.primary : colors.text.muted }}>{mode}</span>;
      },
    },
    {
      header: "Amount",
      accessorKey: "amount",
      cell: (t) => {
        const hasAmount = t.amount !== undefined && t.amount !== null && !isNaN(Number(t.amount)) && String(t.amount).trim() !== "";
        return (
          <span style={{ fontWeight: 700, color: hasAmount ? "#16A34A" : colors.text.muted }}>
            {hasAmount ? `₹${Number(t.amount).toLocaleString("en-IN")}` : "-"}
          </span>
        );
      },
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: (t) => {
        const rawStatus = t.status;
        const hasStatus = Boolean(rawStatus && String(rawStatus).trim() !== "" && String(rawStatus).trim() !== "-");
        return hasStatus ? <StatusBadge status={String(rawStatus).trim()} /> : <span style={{ color: colors.text.muted }}>-</span>;
      },
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* KPI Cards Grid - Placed first for layout alignment with All Attractions view */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
        {/* Total Revenue Card */}
        <div
          style={{
            backgroundColor: colors.bg.card,
            borderRadius: "14px",
            padding: "20px",
            border: "1px solid #E2E8F0",
            borderLeft: "4px solid #16A34A",
            boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: colors.text.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Total Attraction Revenue
            </span>
            <div style={{ padding: "8px", borderRadius: "8px", backgroundColor: "#DCFCE7", color: "#16A34A" }}>
              <IndianRupee size={18} />
            </div>
          </div>
          <div style={{ fontSize: "24px", fontWeight: 800, color: "#16A34A", marginTop: "10px" }}>
            ₹{totalRevenue.toLocaleString("en-IN")}
          </div>
          <div style={{ fontSize: "12px", color: colors.text.muted, marginTop: "4px" }}>
            In selected date range
          </div>
        </div>

        {/* Tickets Sold Card */}
        <div
          style={{
            backgroundColor: colors.bg.card,
            borderRadius: "14px",
            padding: "20px",
            border: "1px solid #E2E8F0",
            borderLeft: "4px solid #0284C7",
            boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: colors.text.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Total Tickets Issued
            </span>
            <div style={{ padding: "8px", borderRadius: "8px", backgroundColor: "#E0F2FE", color: "#0284C7" }}>
              <Ticket size={18} />
            </div>
          </div>
          <div style={{ fontSize: "24px", fontWeight: 800, color: colors.text.primary, marginTop: "10px" }}>
            {totalTicketsSold.toLocaleString("en-IN")}
          </div>
          <div style={{ fontSize: "12px", color: colors.text.muted, marginTop: "4px" }}>
            Across all categories
          </div>
        </div>

        {/* Total Bookings Card */}
        <div
          style={{
            backgroundColor: colors.bg.card,
            borderRadius: "14px",
            padding: "20px",
            border: "1px solid #E2E8F0",
            borderLeft: "4px solid #7C3AED",
            boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: colors.text.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Total Bookings
            </span>
            <div style={{ padding: "8px", borderRadius: "8px", backgroundColor: "#EDE9FE", color: "#7C3AED" }}>
              <Layers size={18} />
            </div>
          </div>
          <div style={{ fontSize: "24px", fontWeight: 800, color: colors.text.primary, marginTop: "10px" }}>
            {totalBookings}
          </div>
          <div style={{ fontSize: "12px", color: colors.text.muted, marginTop: "4px" }}>
            Confirmed booking records
          </div>
        </div>
      </div>

      {/* Header Navigation & Attraction Details Banner */}
      <div
        style={{
          backgroundColor: colors.bg.card,
          borderRadius: "16px",
          padding: "24px",
          border: "1px solid #E2E8F0",
          boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
        }}
      >
        <button
          type="button"
          onClick={onBackToAll}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "6px 12px",
            borderRadius: "8px",
            backgroundColor: "#F1F5F9",
            color: "#334155",
            border: "none",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
            marginBottom: "16px",
          }}
        >
          <ArrowLeft size={16} />
          Back to All Attractions
        </button>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {attraction.image ? (
              <img
                src={attraction.image}
                alt={attraction.name}
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 16,
                  objectFit: "cover",
                  border: "2px solid #CBD5E1",
                }}
              />
            ) : (
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 16,
                  backgroundColor: "#E0F2FE",
                  color: "#0284C7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Building2 size={32} />
              </div>
            )}

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 800, color: colors.text.primary }}>
                  {attraction.name} Sales Report
                </h1>
                <span
                  style={{
                    padding: "4px 12px",
                    borderRadius: "20px",
                    backgroundColor: "#E0F2FE",
                    color: "#0369A1",
                    fontSize: "12px",
                    fontWeight: 700,
                  }}
                >
                  {attraction.category}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            {onPrint && (
              <button
                type="button"
                disabled={!hasData}
                onClick={() => {
                  if (!hasData) return;
                  onPrint();
                }}
                title={!hasData ? "No sales data available to print" : undefined}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 18px",
                  borderRadius: "10px",
                  backgroundColor: !hasData ? "#94A3B8" : "#0C2A42",
                  color: !hasData ? "#E2E8F0" : "#F4BC43",
                  border: "none",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: !hasData ? "not-allowed" : "pointer",
                  boxShadow: !hasData ? "none" : "0 2px 6px rgba(12, 42, 66, 0.25)",
                  opacity: !hasData ? 0.6 : 1,
                  transition: "all 0.15s ease",
                }}
              >
                <Printer size={16} />
                Print Sales Report
              </button>
            )}
            <button
              type="button"
              disabled={!hasData}
              onClick={() => {
                if (!hasData) return;
                handleExportCSV();
              }}
              title={!hasData ? "No sales data available to export" : undefined}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 18px",
                borderRadius: "10px",
                backgroundColor: !hasData ? "#94A3B8" : "#2372A5",
                color: "#FFFFFF",
                border: "none",
                fontSize: "13px",
                fontWeight: 600,
                cursor: !hasData ? "not-allowed" : "pointer",
                boxShadow: !hasData ? "none" : "0 2px 6px rgba(35, 114, 165, 0.25)",
                opacity: !hasData ? 0.6 : 1,
              }}
            >
              <Download size={16} />
              Export Attraction Sales CSV
            </button>
          </div>
        </div>
      </div>

      {/* Breakdowns Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "20px" }}>
        {/* Ticket Category Breakdown */}
        <div
          style={{
            backgroundColor: colors.bg.card,
            borderRadius: "14px",
            padding: "20px",
            border: "1px solid #E2E8F0",
          }}
        >
          <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", fontWeight: 700, color: colors.text.primary, display: "flex", alignItems: "center", gap: "8px" }}>
            <Tag size={18} color="#2372A5" />
            Ticket Category Sales & Rates
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {categoryBreakdown.length > 0 ? (
              categoryBreakdown.map((cat) => (
                <div
                  key={cat.category}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    borderRadius: "10px",
                    backgroundColor: "#F8FAFC",
                    border: "1px solid #E2E8F0",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, color: colors.text.primary, fontSize: "14px" }}>
                      {cat.category} Ticket
                    </div>
                    <div style={{ fontSize: "12px", color: colors.text.muted }}>
                      Unit Price: ₹{cat.unitPrice}
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700, color: "#16A34A", fontSize: "15px" }}>
                      ₹{cat.revenue.toLocaleString("en-IN")}
                    </div>
                    <div style={{ fontSize: "12px", fontWeight: 600, color: "#0284C7" }}>
                      {cat.count} sold
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: "16px", textAlign: "center", color: colors.text.muted, fontSize: "13px" }}>
                No ticket category sales recorded in the selected date range.
              </div>
            )}
          </div>
        </div>

        {/* Payment Methods */}
        <div
          style={{
            backgroundColor: colors.bg.card,
            borderRadius: "14px",
            padding: "20px",
            border: "1px solid #E2E8F0",
          }}
        >
          <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", fontWeight: 700, color: colors.text.primary, display: "flex", alignItems: "center", gap: "8px" }}>
            <CreditCard size={18} color="#2372A5" />
            Payment Mode Distribution
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {paymentBreakdown.length > 0 ? (
              paymentBreakdown.map((pm) => (
                <div
                  key={pm.mode}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    borderRadius: "10px",
                    backgroundColor: "#F8FAFC",
                    border: "1px solid #E2E8F0",
                  }}
                >
                  <div style={{ fontWeight: 600, color: colors.text.primary, fontSize: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <CreditCard size={16} color="#64748B" />
                    {pm.mode}
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700, color: colors.text.primary, fontSize: "15px" }}>
                      ₹{pm.revenue.toLocaleString("en-IN")}
                    </div>
                    <div style={{ fontSize: "12px", color: colors.text.muted }}>
                      {pm.count} transactions
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: "16px", textAlign: "center", color: colors.text.muted, fontSize: "13px" }}>
                No payment data recorded in the selected date range.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Transactions Data Table */}
      <div
        style={{
          backgroundColor: colors.bg.card,
          borderRadius: "14px",
          padding: "20px",
          border: "1px solid #E2E8F0",
        }}
      >
        <div style={{ marginBottom: "16px" }}>
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: colors.text.primary }}>
            {attraction.name} Sales Transactions ({transactions.length})
          </h3>
        </div>

        <GlobalDataTable
          columns={columns}
          data={transactions}
          keyExtractor={(t, idx) => `${t.id}-${idx}`}
          emptyMessage={`No transactions found for ${attraction.name}.`}
          showPagination={false}
        />
      </div>
    </div>
  );
}
