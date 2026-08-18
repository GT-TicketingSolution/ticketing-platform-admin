"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  FileSpreadsheet,
  FileText,
  MoreVertical,
  Eye,
  Trash2,
} from "lucide-react";
import DateRangePicker from "@/components/ui/DateRangePicker";
import ExportButtons from "@/components/ui/ExportButtons";
import { GlobalDataTable } from "@/components/ui/GlobalDataTable";
import { Transaction, TransactionStatus } from "./types";
import { INITIAL_TRANSACTIONS } from "@/lib/mockTransactions";
import { META_CONSTANTS } from "@/lib/metaConstant";
import { colors, typography } from "@/lib/theme";
import { useToast } from "@/components/ui/Toast";
import { confirmDelete } from "@/lib/notify";
import TransactionDetailsModal from "@/components/modals/TransactionDetailsModal";

import { Booking } from "@/types/booking";
import {
  handlePrintInvoice,
  handleDownloadPDF,
  handleDownloadTransactionsListPDF,
} from "@/lib/printUtils";
import { useUserRole } from "@/hooks/useUserRole";
import { HasRole } from "@/components/auth/RoleGuard";

const ITEMS_PER_PAGE = 10;

export default function TransactionsPage() {
  const { showToast } = useToast();

  // State
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<string>("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [currentPage, setCurrentPage] = useState(1);

  // Modals State
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Dropdown open state for table row action menus
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = META_CONSTANTS.transactions.fullTitle;
  }, []);

  // Close dropdown on outside click
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
  }, [searchQuery, selectedPaymentMode, fromDate, toDate, selectedStatus]);

  // Payment Mode Options
  const paymentModeOptions = useMemo(() => {
    const modes = Array.from(new Set(transactions.map((t) => t.paymentMode)));
    return ["All", ...modes];
  }, [transactions]);

  // Filtered Transactions Logic (Supports From Date & To Date Range Filtering)
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Search by Transaction ID, Customer Name, Booking ID, Amount, Payment Mode
      const matchesSearch =
        searchQuery === "" ||
        t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.bookingId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.paymentMode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.amount.toString().includes(searchQuery);

      // Payment Mode Filter
      const matchesPaymentMode =
        selectedPaymentMode === "All" || t.paymentMode === selectedPaymentMode;

      // Status Filter
      const matchesStatus =
        selectedStatus === "All" || t.status === selectedStatus;

      // Date Range Filter (From Date & To Date)
      const txnDate = t.date || "";
      const matchesFromDate = !fromDate || txnDate >= fromDate;
      const matchesToDate = !toDate || txnDate <= toDate;

      return (
        matchesSearch &&
        matchesPaymentMode &&
        matchesStatus &&
        matchesFromDate &&
        matchesToDate
      );
    });
  }, [transactions, searchQuery, selectedPaymentMode, selectedStatus, fromDate, toDate]);

  // Pagination Calculations
  const totalItems = filteredTransactions.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalItems);
  const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);

  // Handlers
  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedPaymentMode("All");
    setFromDate("");
    setToDate("");
    setSelectedStatus("All");
    setCurrentPage(1);
    showToast("Filters reset successfully", "info");
  };

  const handleOpenDetails = (txn: Transaction) => {
    setSelectedTransaction(txn);
    setIsDetailsOpen(true);
    setActiveDropdownId(null);
  };

  const handleDeleteTransaction = async (txn: Transaction) => {
    setActiveDropdownId(null);
    const confirmed = await confirmDelete(`transaction "${txn.id} (${txn.customerName})"`);
    if (!confirmed) return;

    setTransactions((prev) => prev.filter((t) => t.id !== txn.id));
    showToast(`Transaction "${txn.id}" has been deleted.`, "info");
  };



  // Convert transaction to Booking object for single PDF/Print invoice utilities
  const getBookingFromTransaction = (txn: Transaction): Booking => {
    return {
      id: txn.bookingId,
      customerName: txn.customerName,
      mobileNumber: txn.mobileNumber || "9876543210",
      gstn: txn.gstn || "08ABCDE1234F1Z5",
      dateTime: txn.dateTime,
      visitDate: txn.date || "",
      attraction: txn.attraction || "Toy Train",
      visitors: "2 Adults",
      totalVisitors: 2,
      amount: txn.amount,
      amountPaid: txn.amount,
      status: txn.status === "Confirmed" ? "Confirmed" : txn.status === "Cancelled" ? "Cancelled" : "Pending",
      paymentMode: txn.paymentMode === "Card" ? "Credit Card" : txn.paymentMode,
      ticketSummary: [
        { category: "Adult", quantity: 2, unitPrice: txn.amount / 2, total: txn.amount }
      ],
      createdAt: new Date().toISOString(),
    };
  };

  // Export Filtered Transactions to Excel / CSV
  const handleExportExcel = () => {
    if (filteredTransactions.length === 0) {
      showToast("No transaction data matches the selected filters", "info");
      return;
    }
    const headers = [
      "Transaction ID",
      "Customer Name",
      "Date & Time",
      "Booking ID",
      "Amount",
      "Payment Mode",
      "Status",
    ];
    const rows = filteredTransactions.map((t) => [
      t.id,
      `"${t.customerName}"`,
      `"${t.dateTime}"`,
      t.bookingId,
      t.amount,
      t.paymentMode,
      t.status,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const rangeLabel = fromDate && toDate ? `${fromDate}_to_${toDate}` : "All";
    link.setAttribute("download", `Transactions_${rangeLabel}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${filteredTransactions.length} filtered transactions to CSV`, "success");
  };

  // Export Filtered Transactions List to PDF Report
  const handleExportPDF = () => {
    if (filteredTransactions.length === 0) {
      showToast("No transaction data matches the selected filters", "info");
      return;
    }
    const filterParts = [];
    if (fromDate || toDate) {
      filterParts.push(`Date Range: ${fromDate || "Start"} to ${toDate || "End"}`);
    }
    if (selectedPaymentMode !== "All") {
      filterParts.push(`Payment Mode: ${selectedPaymentMode}`);
    }
    if (searchQuery) {
      filterParts.push(`Search: "${searchQuery}"`);
    }

    const filterInfoStr = filterParts.length > 0 ? filterParts.join(" | ") : "All Transactions";

    handleDownloadTransactionsListPDF(filteredTransactions, filterInfoStr);
    showToast(`Generated PDF report for ${filteredTransactions.length} transactions`, "success");
  };

  // Render Status Badge matching Image 1
  const renderStatusBadge = (status: TransactionStatus) => {
    const isConfirmed = status === "Confirmed";
    const isCancelled = status === "Cancelled";

    const bg = isConfirmed
      ? "#B5FFE7"
      : isCancelled
        ? "#FEE2E2"
        : "rgba(255, 248, 217, 0.93)";

    const dot = isConfirmed
      ? "#119167"
      : isCancelled
        ? "rgba(220, 38, 38, 0.88)"
        : "#D97706";

    const text = isConfirmed
      ? "#119167"
      : isCancelled
        ? "rgba(220, 38, 38, 0.86)"
        : "#D97706";

    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          padding: "3px 10px",
          borderRadius: "7px",
          background: bg,
          fontFamily: typography.fontFamily.sans,
          fontWeight: 500,
          fontSize: "10px",
          color: text,
        }}
      >
        <span
          style={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: dot,
          }}
        />
        {status}
      </span>
    );
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        width: "100%",
      }}
    >
      {/* ── Top Export Buttons Row ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
        }}
      >
        <ExportButtons
          onExportPDF={handleExportPDF}
          onExportExcel={handleExportExcel}
        />
      </div>

      {/* ── Filters Bar (With From Date & To Date Range Selection) ── */}
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
        {/* Search Input Box */}
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
            placeholder="Search by ID, Customer Name..."
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

        {/* Filters Group: Payment Mode, From Date, To Date, Reset */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: "14px",
            flexWrap: "wrap",
          }}
        >
          {/* Payment Mode Dropdown */}
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
              onChange={(e) => setSelectedPaymentMode(e.target.value)}
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
              {paymentModeOptions.map((mode) => (
                <option key={mode} value={mode}>
                  {mode === "All" ? "Modes" : mode}
                </option>
              ))}
            </select>
          </div>

          {/* Status Dropdown */}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label
              style={{
                fontFamily: typography.fontFamily.sans,
                fontWeight: 600,
                fontSize: "10px",
                color: "rgba(81, 82, 82, 0.65)",
              }}
            >
              Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
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
                minWidth: "120px",
              }}
            >
              <option value="All">All Status</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Pending">Pending</option>
              <option value="Cancelled">Cancelled</option>
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
              padding: "0 16px",
              background: "#FFFFFF",
              border: "0.5px solid rgba(179, 175, 175, 0.66)",
              borderRadius: "4px",
              fontFamily: typography.fontFamily.sans,
              fontWeight: 500,
              fontSize: "12px",
              color: "#173F63",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.15s ease",
            }}
          >
            <RotateCcw size={14} />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* ── Global Data Table (Unified S.No, Headers, Row Styles & Pagination) ── */}
      <GlobalDataTable
        columns={[
          { header: "Transaction ID", accessorKey: "id" },
          { header: "Customer Name", accessorKey: "customerName" },
          { header: "Date & Time", accessorKey: "dateTime" },
          { header: "Booking ID", accessorKey: "bookingId" },
          { header: "Amount", cell: (item) => `₹${item.amount}` },
          { header: "Payment Mode", accessorKey: "paymentMode" },
          { header: "Status", cell: (item) => renderStatusBadge(item.status) },
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
                    aria-label="Actions menu"
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
                          handleDeleteTransaction(item);
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
        ]}
        data={filteredTransactions}
        keyExtractor={(item) => item.id}
        pageSize={ITEMS_PER_PAGE}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        showSNo={true}
        sNoHeader="S.No"
        itemLabel="transactions"
        emptyMessage="No transactions match your filter criteria."
      />

      {/* ── Transaction Details Modal ── */}
      <TransactionDetailsModal
        transaction={selectedTransaction}
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedTransaction(null);
        }}
        onPrint={(txn) => handlePrintInvoice(getBookingFromTransaction(txn))}
        onDownloadPDF={(txn) => handleDownloadPDF(getBookingFromTransaction(txn))}
      />



      <style>{`
        .table-row-hover:hover {
          background: #F8FAFC !important;
        }
        .dropdown-item:hover {
          background: #F1F5F9 !important;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
