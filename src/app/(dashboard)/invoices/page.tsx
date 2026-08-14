"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Search,
  MoreVertical,
  Eye,
  Trash2,
} from "lucide-react";
import { colors, typography } from "@/lib/theme";
import { INITIAL_TRANSACTIONS } from "@/lib/mockTransactions";
import { Transaction } from "@/types/transaction";
import { META_CONSTANTS } from "@/lib/metaConstant";
import { handleDownloadInvoicesListPDF } from "@/lib/printUtils";

import { exportToCSV } from "@/lib/exportUtils";
import ExportButtons from "@/components/ui/ExportButtons";
import DateRangePicker from "@/components/ui/DateRangePicker";
import InvoiceDetailsModal from "@/components/modals/InvoiceDetailsModal";
import { GlobalDataTable, GlobalColumn } from "@/components/ui/GlobalDataTable";
import { useToast } from "@/components/ui/Toast";
import { confirmDelete } from "@/lib/notify";

function getInvoiceId(txn: Transaction) {
  return txn.invoiceId || txn.id.replace("TXN-", "INV-");
}

const PAYMENT_MODES = ["All", "Cash", "UPI", "Card"] as const;
type PaymentModeFilter = "All" | "Cash" | "UPI" | "Card";
const PAGE_SIZE = 10;

export default function InvoicesPage() {
  const { showToast } = useToast();

  const [invoices, setInvoices] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<PaymentModeFilter>("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Modals & Action Menu State
  const [selectedInvoice, setSelectedInvoice] = useState<Transaction | null>(null);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = META_CONSTANTS.invoices.fullTitle;
  }, []);

  // Close active action dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setActiveDropdownId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedPaymentMode, fromDate, toDate]);

  // Filtered Invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((t) => {
      const invId = getInvoiceId(t);
      const matchSearch =
        searchQuery === "" ||
        invId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.attraction && t.attraction.toLowerCase().includes(searchQuery.toLowerCase())) ||
        t.paymentMode.toLowerCase().includes(searchQuery.toLowerCase());

      const matchPayment =
        selectedPaymentMode === "All" ||
        t.paymentMode === (selectedPaymentMode as string);

      let matchDate = true;
      if (fromDate && t.date) matchDate = matchDate && t.date >= fromDate;
      if (toDate && t.date) matchDate = matchDate && t.date <= toDate;

      return matchSearch && matchPayment && matchDate;
    });
  }, [invoices, searchQuery, selectedPaymentMode, fromDate, toDate]);

  // Stats calculation
  const totalRevenue = invoices.reduce((s, t) => s + t.amount, 0);
  const totalInvoices = invoices.length;
  const paidInvoices = invoices.filter((t) => t.status === "Confirmed").length;

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedPaymentMode("All");
    setFromDate("");
    setToDate("");
    setCurrentPage(1);
    showToast("Filters reset successfully", "info");
  };

  const handleOpenDetails = (inv: Transaction) => {
    setSelectedInvoice(inv);
    setActiveDropdownId(null);
  };

  const handleDeleteInvoice = async (inv: Transaction) => {
    setActiveDropdownId(null);
    const invId = getInvoiceId(inv);
    const confirmed = await confirmDelete(`invoice "${invId} (${inv.customerName})"`);
    if (!confirmed) return;

    setInvoices((prev) => prev.filter((t) => t.id !== inv.id));
    showToast(`Invoice "${invId}" has been deleted.`, "info");
  };

  const handleExportPDF = () => {
    if (filteredInvoices.length === 0) {
      showToast("No invoice data matches current filters", "info");
      return;
    }
    const parts: string[] = [];
    if (selectedPaymentMode !== "All") parts.push(`Mode: ${selectedPaymentMode}`);
    if (fromDate) parts.push(`From: ${fromDate}`);
    if (toDate) parts.push(`To: ${toDate}`);
    if (searchQuery) parts.push(`Search: "${searchQuery}"`);
    const filterInfo = parts.length > 0 ? parts.join(" | ") : "All Invoices";
    handleDownloadInvoicesListPDF(filteredInvoices, filterInfo);
    showToast(`Exported PDF for ${filteredInvoices.length} invoices`, "success");
  };

  const handleExportExcel = () => {
    if (filteredInvoices.length === 0) {
      showToast("No invoice data matches current filters", "info");
      return;
    }
    const parts: string[] = [];
    if (selectedPaymentMode !== "All") parts.push(selectedPaymentMode);
    if (fromDate || toDate) parts.push(`${fromDate || ""}_${toDate || ""}`);
    const label = parts.length > 0 ? parts.join("_") : "All";
    exportToCSV(
      `Invoices_Export_${label}`,
      ["Invoice ID", "Customer Name", "Date & Time", "Attraction", "Visitors", "Amount (₹)", "Payment Mode", "Status"],
      filteredInvoices.map((t) => [
        getInvoiceId(t),
        t.customerName,
        t.dateTime,
        t.attraction || "—",
        (t as any).visitors || "2 Adults + 1 Child",
        t.amount,
        t.paymentMode,
        t.status,
      ])
    );
    showToast(`Exported ${filteredInvoices.length} invoices to Excel (CSV)`, "success");
  };


  // Table Column Definitions
  const columns: GlobalColumn<Transaction>[] = [
    {
      header: "Invoice ID",
      cell: (item) => getInvoiceId(item),
    },
    {
      header: "Customer Name",
      accessorKey: "customerName",
    },
    {
      header: "Date & Time",
      accessorKey: "dateTime",
    },
    {
      header: "Attraction",
      cell: (item) => item.attraction || "—",
    },
    {
      header: "Visitors",
      cell: (item) => (item as any).visitors || "2 Adults + 1 Child",
    },
    {
      header: "Amount",
      cell: (item) => `₹${item.amount}`,
    },
    {
      header: "Payment Mode",
      accessorKey: "paymentMode",
    },
    {
      header: "Actions",
      align: "center",
      cell: (item) => {
        const isDropdownOpen = activeDropdownId === item.id;
        return (
          <div style={{ position: "relative", display: "inline-block" }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveDropdownId(isDropdownOpen ? null : item.id);
              }}
              title="Actions Menu"
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "6px",
                borderRadius: "4px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#374151",
              }}
            >
              <MoreVertical size={18} />
            </button>

            {isDropdownOpen && (
              <div
                ref={dropdownRef}
                style={{
                  position: "absolute",
                  right: 0,
                  top: "32px",
                  zIndex: 100,
                  background: "#FFFFFF",
                  border: "1px solid #E5E7EB",
                  borderRadius: "8px",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
                  width: "150px",
                  padding: "4px 0",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenDetails(item);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    width: "100%",
                    padding: "8px 14px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontFamily: typography.fontFamily.sans,
                    color: "#374151",
                    textAlign: "left",
                  }}
                >
                  <Eye size={14} color="#6B7280" />
                  <span>View Details</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteInvoice(item);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    width: "100%",
                    padding: "8px 14px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontFamily: typography.fontFamily.sans,
                    color: "#DC2626",
                    textAlign: "left",
                  }}
                >
                  <Trash2 size={14} color="#DC2626" />
                  <span>Delete</span>
                </button>
              </div>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", width: "100%" }}>
      {/* ── Top Export Buttons Row ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
        <ExportButtons onExportPDF={handleExportPDF} onExportExcel={handleExportExcel} />
      </div>

      {/* ── Stats Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" }}>
        {[
          { label: "Total Revenue", value: `₹${totalRevenue.toLocaleString("en-IN")}.00`, color: "#F59E0B" },
          { label: "Total Invoices", value: totalInvoices.toLocaleString(), color: "#1E3A5F" },
          { label: "Paid Invoices", value: paidInvoices.toLocaleString(), color: "#10B981" },
        ].map((card) => (
          <div
            key={card.label}
            style={{
              background: "#FFFFFF",
              border: "1px solid #A0A0A0",
              borderRadius: "20px",
              boxShadow: "-2px 4px 5.6px rgba(0,0,0,0.25)",
              padding: "24px 28px",
            }}
          >
            <div
              style={{
                fontFamily: "DM Mono, monospace",
                fontWeight: 500,
                fontSize: "26px",
                color: card.color,
                lineHeight: 1,
                marginBottom: "8px",
              }}
            >
              {card.value}
            </div>
            <div
              style={{
                fontFamily: "Inter, sans-serif",
                fontWeight: 700,
                fontSize: "14px",
                color: "#374151",
              }}
            >
              {card.label}
            </div>
          </div>
        ))}
      </div>

      {/* ── Filters Container (Replicating Transactions Filter UI & Container) ── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px",
          background: "#FFFFFF",
          padding: "20px",
          borderRadius: "8px",
          border: "1px solid rgba(179, 175, 175, 0.4)",
        }}
      >
        {/* Search Bar */}
        <div
          style={{
            boxSizing: "border-box",
            width: "100%",
            maxWidth: "340px",
            height: "40px",
            background: "#FFFFFF",
            border: "1.5px solid rgba(179, 175, 175, 0.51)",
            borderRadius: "4px",
            display: "flex",
            alignItems: "center",
            padding: "0 14px",
            gap: "10px",
          }}
        >
          <Search size={18} color="#A0A0A0" strokeWidth={2} />
          <input
            type="text"
            placeholder="Search by Invoice ID, Customer Name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              border: "none",
              outline: "none",
              background: "transparent",
              fontFamily: typography.fontFamily.sans,
              fontWeight: 700,
              fontSize: "12px",
              color: "#011B2F",
            }}
          />
        </div>

        {/* Filter Controls */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: "14px", flexWrap: "wrap" }}>
          {/* Payment Mode Select */}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label
              style={{
                fontFamily: typography.fontFamily.sans,
                fontWeight: 600,
                fontSize: "10px",
                color: "rgba(81, 82, 82, 0.65)",
              }}
            >
              Payment Mode
            </label>
            <select
              value={selectedPaymentMode}
              onChange={(e) => setSelectedPaymentMode(e.target.value as PaymentModeFilter)}
              style={{
                height: "40px",
                padding: "0 12px",
                background: "#FFFFFF",
                border: "0.5px solid rgba(179, 175, 175, 0.66)",
                borderRadius: "4px",
                fontFamily: typography.fontFamily.sans,
                fontWeight: 700,
                fontSize: "12px",
                color: "#173F63",
                outline: "none",
                cursor: "pointer",
                minWidth: "110px",
              }}
            >
              <option value="All">Modes</option>
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="Card">Card</option>
            </select>
          </div>

          {/* Date Range Picker */}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label
              style={{
                fontFamily: typography.fontFamily.sans,
                fontWeight: 600,
                fontSize: "10px",
                color: "rgba(81, 82, 82, 0.65)",
              }}
            >
              Date Range
            </label>
            <DateRangePicker
              fromDate={fromDate}
              toDate={toDate}
              onFromDateChange={setFromDate}
              onToDateChange={setToDate}
              onClear={() => { setFromDate(""); setToDate(""); }}
            />
          </div>

          {/* Reset Button */}
          <button
            onClick={handleResetFilters}
            style={{
              height: "40px",
              padding: "0 18px",
              background: "#FFFFFF",
              border: "0.5px solid rgba(179, 175, 175, 0.66)",
              borderRadius: "4px",
              fontFamily: typography.fontFamily.sans,
              fontWeight: 500,
              fontSize: "12px",
              color: "#173F63",
              cursor: "pointer",
            }}
          >
            Reset
          </button>
        </div>
      </div>

      {/* ── Global Data Table Component (Unified S.No, Headers, Row Styles & Pagination) ── */}
      <GlobalDataTable
        columns={columns}
        data={filteredInvoices}
        keyExtractor={(item) => item.id}
        pageSize={PAGE_SIZE}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        showSNo={true}
        sNoHeader="S.No"
        itemLabel="invoices"
        emptyMessage="No invoices found matching current search or filters."
      />

      {/* ── Invoice Details Modal ── */}
      <InvoiceDetailsModal
        txn={selectedInvoice}
        isOpen={Boolean(selectedInvoice)}
        onClose={() => setSelectedInvoice(null)}
      />
    </div>
  );
}
