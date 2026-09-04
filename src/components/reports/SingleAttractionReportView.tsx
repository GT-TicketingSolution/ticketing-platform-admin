"use client";

import React, { useState, useMemo } from "react";
import {
  Building2,
  Clock,
  CreditCard,
  Download,
  Printer,
  Search,
  Tag,
  ArrowLeft,
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

  const [searchQuery, setSearchQuery] = useState("");

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        t.id.toLowerCase().includes(q) ||
        t.customerName.toLowerCase().includes(q) ||
        t.paymentMode.toLowerCase().includes(q) ||
        t.amount.toString().includes(q)
      );
    });
  }, [transactions, searchQuery]);

  const handleExportCSV = () => {
    const headers = ["Transaction ID", "Customer Name", "Date & Time", "Payment Mode", "Amount (₹)", "Status"];
    const rows: (string | number | boolean)[][] = filteredTransactions.map((t) => [
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
      cell: (t) => (
        <span style={{ fontWeight: 600, color: "#0284C7" }}>
          {t.id}
        </span>
      ),
    },
    {
      header: "Customer Name",
      accessorKey: "customerName",
      cell: (t) => <span style={{ fontWeight: 500 }}>{t.customerName}</span>,
    },
    {
      header: "Date & Time",
      cell: (t) => <span style={{ color: colors.text.muted }}>{t.dateTime || t.transactionDate || "-"}</span>,
    },
    {
      header: "Payment Mode",
      accessorKey: "paymentMode",
      cell: (t) => <span>{t.paymentMode}</span>,
    },
    {
      header: "Amount",
      accessorKey: "amount",
      cell: (t) => (
        <span style={{ fontWeight: 700, color: "#16A34A" }}>
          ₹{t.amount.toLocaleString("en-IN")}
        </span>
      ),
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: (t) => <StatusBadge status={t.status} />,
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header Navigation & Banner */}
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

              <div style={{ display: "flex", alignItems: "center", gap: "16px", marginTop: "6px", fontSize: "13px", color: colors.text.muted }}>
                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <Clock size={14} />
                  {attraction.timing}
                </span>
                <span>•</span>
                <span>Seating: {attraction.hasSeating ? "Available" : "General Entry"}</span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            {onPrint && (
              <button
                type="button"
                onClick={onPrint}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 18px",
                  borderRadius: "10px",
                  backgroundColor: "#0C2A42",
                  color: "#F4BC43",
                  border: "none",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 2px 6px rgba(12, 42, 66, 0.25)",
                  transition: "all 0.15s ease",
                }}
              >
                <Printer size={16} />
                Print Sales Report
              </button>
            )}
            <button
              type="button"
              onClick={handleExportCSV}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 18px",
                borderRadius: "10px",
                backgroundColor: "#2372A5",
                color: "#FFFFFF",
                border: "none",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 2px 6px rgba(35, 114, 165, 0.25)",
              }}
            >
              <Download size={16} />
              Export Attraction Sales CSV
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
        {/* Total Revenue Card */}
        <div
          style={{
            backgroundColor: colors.bg.card,
            borderRadius: "14px",
            padding: "20px",
            border: "1px solid #E2E8F0",
            borderLeft: "4px solid #16A34A",
          }}
        >
          <div style={{ fontSize: "12px", fontWeight: 700, color: colors.text.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Total Attraction Revenue
          </div>
          <div style={{ fontSize: "24px", fontWeight: 800, color: "#16A34A", marginTop: "6px" }}>
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
          }}
        >
          <div style={{ fontSize: "12px", fontWeight: 700, color: colors.text.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Total Tickets Issued
          </div>
          <div style={{ fontSize: "24px", fontWeight: 800, color: colors.text.primary, marginTop: "6px" }}>
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
            borderLeft: "4px solid #F4BC43",
          }}
        >
          <div style={{ fontSize: "12px", fontWeight: 700, color: colors.text.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Total Bookings
          </div>
          <div style={{ fontSize: "24px", fontWeight: 800, color: colors.text.primary, marginTop: "6px" }}>
            {totalBookings}
          </div>
          <div style={{ fontSize: "12px", color: colors.text.muted, marginTop: "4px" }}>
            Confirmed booking records
          </div>
        </div>

        {/* Avg Order Value Card */}
        <div
          style={{
            backgroundColor: colors.bg.card,
            borderRadius: "14px",
            padding: "20px",
            border: "1px solid #E2E8F0",
            borderLeft: "4px solid #8B5CF6",
          }}
        >
          <div style={{ fontSize: "12px", fontWeight: 700, color: colors.text.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Avg Order Value
          </div>
          <div style={{ fontSize: "24px", fontWeight: 800, color: colors.text.primary, marginTop: "6px" }}>
            ₹{avgOrderValue.toLocaleString("en-IN")}
          </div>
          <div style={{ fontSize: "12px", color: colors.text.muted, marginTop: "4px" }}>
            Revenue / Booking
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: colors.text.primary }}>
            {attraction.name} Sales Transactions ({filteredTransactions.length})
          </h3>

          <div style={{ position: "relative", width: 280 }}>
            <Search size={16} color="#94A3B8" style={{ position: "absolute", left: 12, top: 12 }} />
            <input
              type="text"
              placeholder="Search by ID, name, amount..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px 8px 36px",
                borderRadius: "8px",
                border: "1px solid #CBD5E1",
                fontSize: "13px",
                outline: "none",
              }}
            />
          </div>
        </div>

        <GlobalDataTable
          columns={columns}
          data={filteredTransactions}
          keyExtractor={(t) => t.id}
          emptyMessage={`No transactions found for ${attraction.name}.`}
        />
      </div>
    </div>
  );
}
