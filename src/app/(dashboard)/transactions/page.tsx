"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  Search,
  RotateCcw,
  MoreVertical,
  Eye,
  Trash2,
  SearchX,
  Receipt,
} from "lucide-react";
import DateRangePicker from "@/components/ui/DateRangePicker";
import ExportButtons from "@/components/ui/ExportButtons";
import { GlobalDataTable } from "@/components/ui/GlobalDataTable";
import { META_CONSTANTS } from "@/lib/metaConstant";
import { colors, typography } from "@/lib/theme";
import { useToast } from "@/components/ui/Toast";
import { confirmDelete } from "@/lib/notify";
import TransactionDetailsModal from "@/components/modals/TransactionDetailsModal";
import {
  useTransactionList,
  fetchTransactionList,
  useDeleteTransaction,
  TransactionListItem,
  TransactionListParams,
} from "@/hooks/useTransactionQueries";
import {
  ExportScope,
  exportTableToPDF,
  exportToCSV,
  renderStatusBadgeHTML,
  fetchAllPages,
} from "@/lib/exportUtils";
import { useAttractions } from "@/hooks/useManagerQueries";

const ITEMS_PER_PAGE = 10;

// ── Status badge renderer ─────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const upper = status?.toUpperCase();
  const isSuccess = upper === "SUCCESSFUL" || upper === "SUCCESS" || upper === "CONFIRMED";
  const isCancelled = upper === "CANCELLED" || upper === "FAILED";

  const bg = isSuccess ? "#B5FFE7" : isCancelled ? "#FEE2E2" : "rgba(255,248,217,0.93)";
  const dot = isSuccess ? "#119167" : isCancelled ? "rgba(220,38,38,0.88)" : "#D97706";
  const text = isSuccess ? "#119167" : isCancelled ? "rgba(220,38,38,0.86)" : "#D97706";
  const label = isSuccess ? "Successful" : isCancelled ? "Cancelled" : status || "Pending";

  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "6px",
      padding: "3px 10px", borderRadius: "7px", background: bg,
      fontFamily: typography.fontFamily.sans, fontWeight: 500,
      fontSize: "10px", color: text,
    }}>
      <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: dot }} />
      {label}
    </span>
  );
}


// ── Page ─────────────────────────────────────────────────────────────────────

export default function TransactionsPage() {
  const { showToast } = useToast();

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAttractionId, setSelectedAttractionId] = useState("All");
  const [selectedPaymentMode, setSelectedPaymentMode] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);


  // Debounced search for API
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset to page 1 on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, selectedAttractionId, selectedPaymentMode, selectedStatus, fromDate, toDate]);

  // Modal state
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionListItem | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Dropdown state with fixed position
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; right: number; openUp: boolean } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = META_CONSTANTS.transactions.fullTitle;
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setActiveDropdownId(null);
        setDropdownPos(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── API ──────────────────────────────────────────────────────────────────
  const queryParams: TransactionListParams = {
    page: currentPage,
    limit: ITEMS_PER_PAGE,
    search: debouncedSearch || undefined,
    attractionId: selectedAttractionId !== "All" ? selectedAttractionId : undefined,
    paymentMode: selectedPaymentMode !== "All" ? selectedPaymentMode : undefined,
    status: selectedStatus !== "All" ? selectedStatus : undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
  };

  const { data, isLoading, isError } = useTransactionList(queryParams);
  const { data: attractionsData = [] } = useAttractions();
  const deleteTransaction = useDeleteTransaction();

  const transactions = data?.items ?? [];
  const pagination = data?.pagination ?? { page: 1, limit: ITEMS_PER_PAGE, total: 0, totalPages: 0 };

  const attractionOptions = useMemo(() => {
    const unique = Array.from(
      new Map((attractionsData as any[]).map((a: any) => [a.attractionId || a.id, a.name])).entries()
    ).map(([id, name]) => ({ id, name }));
    return [{ id: "All", name: "All Attractions" }, ...unique];
  }, [attractionsData]);

  const isFiltered = !!debouncedSearch || selectedAttractionId !== "All" || selectedPaymentMode !== "All" || selectedStatus !== "All" || !!fromDate || !!toDate;

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedAttractionId("All");
    setSelectedPaymentMode("All");
    setSelectedStatus("All");
    setFromDate("");
    setToDate("");
    setCurrentPage(1);
  };

  const handleOpenDetails = (txn: TransactionListItem) => {
    setSelectedTransaction(txn);
    setIsDetailsOpen(true);
    setActiveDropdownId(null);
    setDropdownPos(null);
  };

  const handleDeleteTransaction = async (txn: TransactionListItem) => {
    setActiveDropdownId(null);
    setDropdownPos(null);
    const confirmed = await confirmDelete(`transaction "${txn.transactionId} (${txn.customerName})"`);
    if (!confirmed) return;
    deleteTransaction.mutate(txn.id);
  };

  const toggleDropdown = useCallback((e: React.MouseEvent<HTMLButtonElement>, id: string) => {
    e.stopPropagation();
    if (activeDropdownId === id) {
      setActiveDropdownId(null);
      setDropdownPos(null);
      return;
    }
    const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < 100;
    setDropdownPos({
      top: openUp ? rect.top - 4 : rect.bottom + 4,
      right: window.innerWidth - rect.right,
      openUp,
    });
    setActiveDropdownId(id);
  }, [activeDropdownId]);

  // ── Export handlers ───────────────────────────────────────────────────────
  const getFilterInfo = () => {
    const parts: string[] = [];
    if (selectedAttractionId !== "All") {
      const found = attractionOptions.find((a) => a.id === selectedAttractionId);
      if (found) parts.push(`Attraction: ${found.name}`);
    }
    if (fromDate || toDate) parts.push(`Date: ${fromDate || "Start"} → ${toDate || "End"}`);
    if (selectedPaymentMode !== "All") parts.push(`Mode: ${selectedPaymentMode}`);
    if (selectedStatus !== "All") parts.push(`Status: ${selectedStatus}`);
    if (debouncedSearch) parts.push(`Search: "${debouncedSearch}"`);
    return parts.length > 0 ? parts.join(" | ") : undefined;
  };

  const getExportData = async (scope: ExportScope): Promise<TransactionListItem[]> => {
    const base: TransactionListParams = {
      search: debouncedSearch || undefined,
      attractionId: selectedAttractionId !== "All" ? selectedAttractionId : undefined,
      paymentMode: selectedPaymentMode !== "All" ? selectedPaymentMode : undefined,
      status: selectedStatus !== "All" ? selectedStatus : undefined,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
    };

    if (scope === "current") {
      const res = await fetchTransactionList({ ...base, page: currentPage, limit: ITEMS_PER_PAGE });
      return res.items;
    } else {
      return await fetchAllPages<TransactionListItem>((page, limit) =>
        fetchTransactionList({ ...base, page, limit })
      );
    }
  };

  const handleExportPDF = async (scope: ExportScope) => {
    setIsExportingPDF(true);
    try {
      const items = await getExportData(scope);
      if (!items.length) { showToast("No transaction data to export.", "info"); return; }
      const dateKey = new Date().toISOString().slice(0, 10);
      const scopeLabel = scope === "all" ? "All" : `Page_${currentPage}`;
      await exportTableToPDF<TransactionListItem>({
        title: "TRANSACTIONS REPORT",
        filterInfo: getFilterInfo(),
        scope,
        currentPage,
        filename: `Transactions_${scopeLabel}_${dateKey}.pdf`,
        orientation: "landscape",
        columns: [
          { header: "#", accessor: (_, i) => (scope === "all" ? i + 1 : (currentPage - 1) * ITEMS_PER_PAGE + i + 1), width: "30px" },
          { header: "Transaction ID", accessor: "transactionId" },
          { header: "Customer", accessor: "customerName" },
          { header: "Date", accessor: (t) => t.transactionDate ? new Date(t.transactionDate).toLocaleDateString("en-IN") : "-" },
          { header: "Booking ID", accessor: "bookingId" },
          { header: "Attraction", accessor: (t) => t.attraction?.name ?? "-" },
          { header: "Amount (₹)", accessor: (t) => `₹${Number(t.amount).toFixed(2)}`, align: "right" },
          { header: "Mode", accessor: "paymentMode" },
          { header: "Status", renderCell: (t) => renderStatusBadgeHTML(t.status), align: "center" },
        ],
        data: items,
        summaryCards: [
          { label: "Total Transactions", value: items.length },
          { label: "Total Revenue", value: `₹${items.reduce((s, t) => s + Number(t.amount), 0).toFixed(2)}` },
        ],
      });
      showToast(`PDF downloaded (${items.length} record${items.length === 1 ? "" : "s"}).`, "success");
    } catch (err) {
      console.error("Transactions PDF export error:", err);
      showToast("PDF export failed. Please try again.", "error");
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleExportExcel = async (scope: ExportScope) => {
    setIsExportingExcel(true);
    try {
      const items = await getExportData(scope);
      if (!items.length) { showToast("No transaction data to export.", "info"); return; }
      const dateKey = new Date().toISOString().slice(0, 10);
      const scopeLabel = scope === "all" ? "All" : `Page_${currentPage}`;
      const headers = ["#", "Transaction ID", "Customer", "Date", "Booking ID", "Attraction", "Amount (₹)", "Mode", "Status"];
      const rows = items.map((t, i) => [
        scope === "all" ? i + 1 : (currentPage - 1) * ITEMS_PER_PAGE + i + 1, t.transactionId, t.customerName,
        t.transactionDate ? new Date(t.transactionDate).toLocaleDateString("en-IN") : "-",
        t.bookingId, t.attraction?.name ?? "-",
        Number(t.amount).toFixed(2), t.paymentMode, t.status,
      ]);
      exportToCSV(`Transactions_${scopeLabel}_${dateKey}`, headers, rows);
      showToast(`Excel downloaded (${items.length} record${items.length === 1 ? "" : "s"}).`, "success");
    } catch (err) {
      console.error("Transactions Excel export error:", err);
      showToast("Excel export failed. Please try again.", "error");
    } finally {
      setIsExportingExcel(false);
    }
  };



  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", width: "100%" }}>

      {/* ── Export Buttons ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
        <ExportButtons
          onExportPDFScope={handleExportPDF}
          onExportExcelScope={handleExportExcel}
          isExportingPDF={isExportingPDF}
          isExportingExcel={isExportingExcel}
          disabled={isLoading || (transactions.length === 0 && (data?.pagination?.total ?? 0) === 0)}
        />
      </div>

      {/* ── Filters Bar ── */}
      <div style={{
        display: "flex", alignItems: "flex-end", justifyContent: "space-between",
        flexWrap: "wrap", gap: "16px", background: "#FFFFFF", padding: "20px",
        borderRadius: "8px", border: "1px solid rgba(179,175,175,0.4)",
      }}>
        {/* Search */}
        <div style={{
          boxSizing: "border-box", width: "100%", maxWidth: "340px", height: "40px",
          background: "#FFFFFF", border: "1.5px solid rgba(179,175,175,0.51)",
          borderRadius: "4px", display: "flex", alignItems: "center", padding: "0 14px", gap: "10px",
        }}>
          <Search size={18} color="#A0A0A0" strokeWidth={2} />
          <input
            type="text"
            placeholder="Search by ID, customer, booking..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%", border: "none", outline: "none", background: "transparent",
              fontFamily: typography.fontFamily.sans, fontWeight: 700,
              fontSize: "12px", color: "#011B2F",
            }}
          />
        </div>

        {/* Right Filters */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: "14px", flexWrap: "wrap" }}>
          {/* Attraction Selector */}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontFamily: typography.fontFamily.sans, fontWeight: 600, fontSize: "10px", color: "rgba(81,82,82,0.65)" }}>
              Attraction
            </label>
            <select
              value={selectedAttractionId}
              onChange={(e) => setSelectedAttractionId(e.target.value)}
              style={{
                height: "40px", padding: "0 12px", background: "#FFFFFF",
                border: "0.5px solid rgba(179,175,175,0.66)", borderRadius: "4px",
                fontFamily: typography.fontFamily.sans, fontWeight: 700,
                fontSize: "12px", color: "#173F63", outline: "none",
                cursor: "pointer", minWidth: "130px",
              }}
            >
              {attractionOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.name}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Mode */}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontFamily: typography.fontFamily.sans, fontWeight: 600, fontSize: "10px", color: "rgba(81,82,82,0.65)" }}>
              Payment Mode
            </label>
            <select
              value={selectedPaymentMode}
              onChange={(e) => setSelectedPaymentMode(e.target.value)}
              style={{
                height: "40px", padding: "0 12px", background: "#FFFFFF",
                border: "0.5px solid rgba(179,175,175,0.66)", borderRadius: "4px",
                fontFamily: typography.fontFamily.sans, fontWeight: 700,
                fontSize: "12px", color: "#173F63", outline: "none",
                cursor: "pointer", minWidth: "120px",
              }}
            >
              <option value="All">All Modes</option>
              <option value="ONLINE">Online</option>
              <option value="CASH">Cash</option>
              <option value="UPI">UPI</option>
              <option value="CARD">Card</option>
            </select>
          </div>

          {/* Status */}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontFamily: typography.fontFamily.sans, fontWeight: 600, fontSize: "10px", color: "rgba(81,82,82,0.65)" }}>
              Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{
                height: "40px", padding: "0 12px", background: "#FFFFFF",
                border: "0.5px solid rgba(179,175,175,0.66)", borderRadius: "4px",
                fontFamily: typography.fontFamily.sans, fontWeight: 700,
                fontSize: "12px", color: "#173F63", outline: "none",
                cursor: "pointer", minWidth: "120px",
              }}
            >
              <option value="All">All Status</option>
              <option value="SUCCESSFUL">Successful</option>
              <option value="PENDING">Pending</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* Date Range */}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontFamily: typography.fontFamily.sans, fontWeight: 600, fontSize: "10px", color: "rgba(81,82,82,0.65)" }}>
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
              height: "40px", padding: "0 16px", background: "#FFFFFF",
              border: "0.5px solid rgba(179,175,175,0.66)", borderRadius: "4px",
              fontFamily: typography.fontFamily.sans, fontWeight: 500,
              fontSize: "12px", color: "#173F63", cursor: "pointer",
              display: "flex", alignItems: "center", gap: "6px",
            }}
          >
            <RotateCcw size={14} />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      <GlobalDataTable
        columns={[
          {
            header: "Transaction ID",
            cell: (item) => (
              <span style={{ fontFamily: typography.fontFamily.sans, fontWeight: 600, fontSize: "13px", color: colors.brand.accent }}>
                {item.transactionId}
              </span>
            ),
          },
          { header: "Customer Name", accessorKey: "customerName" },
          {
            header: "Date & Time",
            cell: (item) => (
              <span style={{ fontSize: "13px", color: colors.text.primary }}>
                {new Date(item.transactionDate).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
              </span>
            ),
          },
          { header: "Booking ID", accessorKey: "bookingId" },
          {
            header: "Attraction",
            cell: (item) => (
              <span style={{ fontSize: "13px", color: colors.text.primary }}>
                {item.attraction?.name ?? "-"}
              </span>
            ),
          },
          {
            header: "Amount",
            cell: (item) => (
              <span style={{ fontFamily: typography.fontFamily.sans, fontWeight: 700, fontSize: "13px", color: "#011B2F" }}>
                ₹{Number(item.amount).toFixed(2)}
              </span>
            ),
          },
          { header: "Payment Mode", accessorKey: "paymentMode" },
          {
            header: "Status",
            cell: (item) => <StatusBadge status={item.status} />,
          },
          {
            header: "Actions",
            align: "center",
            cell: (item) => (
              <div style={{ position: "relative", display: "inline-block" }}>
                <button
                  onClick={(e) => toggleDropdown(e, item.id)}
                  aria-label="Actions menu"
                  style={{
                    background: "transparent", border: "none", cursor: "pointer",
                    padding: "6px", borderRadius: "4px",
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    color: "#374151",
                  }}
                >
                  <MoreVertical size={18} />
                </button>
              </div>
            ),
          },
        ]}
        data={transactions}
        keyExtractor={(item) => item.id}
        pageSize={ITEMS_PER_PAGE}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        totalItems={pagination.total}
        totalPages={pagination.totalPages}
        showSNo={true}
        sNoHeader="S.No"
        itemLabel="transactions"
        isLoading={isLoading}
        emptyIcon={isFiltered ? <SearchX size={26} color={colors.brand.accent} /> : <Receipt size={26} color={colors.brand.accent} />}
        emptyTitle={isFiltered ? "No Matching Transactions Found" : "No Transactions Found"}
        emptyDescription={
          isFiltered
            ? debouncedSearch.trim()
              ? `No transactions found matching "${debouncedSearch}". Try adjusting your search or filters.`
              : "No transactions match the selected filter criteria. Try adjusting or clearing your filters."
            : "There are currently no transactions recorded in the system."
        }
        emptyAction={
          isFiltered ? (
            <button
              type="button"
              onClick={handleResetFilters}
              style={{
                padding: "8px 16px", borderRadius: "8px",
                border: `1px solid ${colors.header.border}`,
                background: "#FFFFFF", fontSize: "13px", fontWeight: 600,
                color: colors.brand.accent, cursor: "pointer",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              }}
            >
              Clear Filters &amp; Search
            </button>
          ) : undefined
        }
      />

      {/* ── Fixed Dropdown Portal ── */}
      {activeDropdownId && dropdownPos && (
        <div
          ref={dropdownRef}
          style={{
            position: "fixed",
            top: dropdownPos.openUp ? undefined : dropdownPos.top,
            bottom: dropdownPos.openUp ? window.innerHeight - dropdownPos.top : undefined,
            right: dropdownPos.right,
            zIndex: 9999,
            background: "#FFFFFF",
            border: "1px solid #E5E7EB",
            borderRadius: "8px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
            width: "160px",
            padding: "4px 0",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <button
            onClick={() => {
              const txn = transactions.find((t) => t.id === activeDropdownId);
              if (txn) handleOpenDetails(txn);
            }}
            style={{
              display: "flex", alignItems: "center", gap: "8px",
              width: "100%", padding: "9px 14px", background: "none",
              border: "none", cursor: "pointer", fontSize: "13px",
              fontFamily: typography.fontFamily.sans, color: "#374151",
              textAlign: "left",
            }}
          >
            <Eye size={14} color="#6B7280" />
            <span>View Details</span>
          </button>
          <button
            onClick={() => {
              const txn = transactions.find((t) => t.id === activeDropdownId);
              if (txn) handleDeleteTransaction(txn);
            }}
            style={{
              display: "flex", alignItems: "center", gap: "8px",
              width: "100%", padding: "9px 14px", background: "none",
              border: "none", cursor: "pointer", fontSize: "13px",
              fontFamily: typography.fontFamily.sans, color: "#DC2626",
              textAlign: "left",
            }}
          >
            <Trash2 size={14} color="#DC2626" />
            <span>Delete</span>
          </button>
        </div>
      )}

      {/* ── Transaction Details Modal ── */}
      <TransactionDetailsModal
        transaction={selectedTransaction}
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedTransaction(null);
        }}
      />

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
