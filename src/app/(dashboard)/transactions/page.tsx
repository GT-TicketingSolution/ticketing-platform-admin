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
  useDeleteTransaction,
  TransactionListItem,
  TransactionListParams,
} from "@/hooks/useTransactionQueries";
import { useAttractions } from "@/hooks/useManagerQueries";

const ITEMS_PER_PAGE = 10;

// ── Status badge renderer ─────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const upper = status?.toUpperCase();
  const isSuccess = upper === "SUCCESS" || upper === "CONFIRMED";
  const isFailed = upper === "FAILED" || upper === "CANCELLED";

  const bg = isSuccess ? "#B5FFE7" : isFailed ? "#FEE2E2" : "rgba(255,248,217,0.93)";
  const dot = isSuccess ? "#119167" : isFailed ? "rgba(220,38,38,0.88)" : "#D97706";
  const text = isSuccess ? "#119167" : isFailed ? "rgba(220,38,38,0.86)" : "#D97706";
  const label = isSuccess ? "Success" : isFailed ? "Failed" : status || "Pending";

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

// ── Build CSV export ──────────────────────────────────────────────────────────
function exportToCSV(items: TransactionListItem[], filename: string) {
  const headers = ["Transaction ID", "Customer Name", "Date & Time", "Booking ID", "Attraction", "Amount", "Payment Mode", "Status"];
  const rows = items.map((t) => [
    t.transactionId,
    `"${t.customerName}"`,
    `"${new Date(t.transactionDate).toLocaleString("en-IN")}"`,
    t.bookingId,
    `"${t.attraction?.name ?? "-"}"`,
    t.amount,
    t.paymentMode,
    t.status,
  ]);
  const csv = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const link = document.createElement("a");
  link.setAttribute("href", encodeURI(csv));
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ── Build PDF export using html2pdf.js ───────────────────────────────────────
async function exportToPDF(
  items: TransactionListItem[],
  filterInfo: string,
  filename: string
) {
  if (!(window as any).html2pdf) {
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
      s.onload = () => resolve();
      s.onerror = () => reject();
      document.head.appendChild(s);
    });
  }

  const rows = items.map((t, i) => `
    <tr style="background:${i % 2 === 0 ? "#FFFFFF" : "#F8FAFC"};">
      <td style="padding:8px 10px;border-bottom:1px solid #E5E7EB;font-size:11px;">${i + 1}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #E5E7EB;font-size:11px;">${t.transactionId}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #E5E7EB;font-size:11px;">${t.customerName}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #E5E7EB;font-size:11px;">${new Date(t.transactionDate).toLocaleDateString("en-IN")}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #E5E7EB;font-size:11px;">${t.bookingId}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #E5E7EB;font-size:11px;">${t.attraction?.name ?? "-"}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #E5E7EB;font-size:11px;text-align:right;">&#8377;${Number(t.amount).toFixed(2)}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #E5E7EB;font-size:11px;">${t.paymentMode}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #E5E7EB;font-size:11px;">${t.status}</td>
    </tr>`).join("");

  const html = `
    <div style="font-family:Arial,sans-serif;padding:24px;color:#011B2F;">
      <div style="border-bottom:3px solid #F4BC43;padding-bottom:12px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:flex-end;">
        <div>
          <div style="font-size:20px;font-weight:bold;color:#0C2A42;">TICKETING PLATFORM</div>
          <div style="font-size:12px;color:#6B7280;">Transactions Report</div>
        </div>
        <div style="font-size:11px;color:#6B7280;text-align:right;">
          <div>${filterInfo}</div>
          <div>Generated: ${new Date().toLocaleString("en-IN")}</div>
        </div>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#0C2A42;color:#FFFFFF;">
            <th style="padding:9px 10px;font-size:11px;text-align:left;">#</th>
            <th style="padding:9px 10px;font-size:11px;text-align:left;">Txn ID</th>
            <th style="padding:9px 10px;font-size:11px;text-align:left;">Customer</th>
            <th style="padding:9px 10px;font-size:11px;text-align:left;">Date</th>
            <th style="padding:9px 10px;font-size:11px;text-align:left;">Booking ID</th>
            <th style="padding:9px 10px;font-size:11px;text-align:left;">Attraction</th>
            <th style="padding:9px 10px;font-size:11px;text-align:right;">Amount</th>
            <th style="padding:9px 10px;font-size:11px;text-align:left;">Mode</th>
            <th style="padding:9px 10px;font-size:11px;text-align:left;">Status</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr style="background:#FFFBEB;font-weight:bold;">
            <td colspan="6" style="padding:10px;font-size:12px;">Total: ${items.length} transactions</td>
            <td style="padding:10px;font-size:12px;text-align:right;">&#8377;${items.reduce((s, t) => s + Number(t.amount), 0).toFixed(2)}</td>
            <td colspan="2"></td>
          </tr>
        </tfoot>
      </table>
    </div>`;

  const el = document.createElement("div");
  el.style.width = "900px";
  el.innerHTML = html;
  document.body.appendChild(el);

  await (window as any).html2pdf().set({
    margin: [8, 8, 8, 8],
    filename,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
  }).from(el).save();

  document.body.removeChild(el);
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
      new Map((attractionsData as any[]).map((a: any) => [a.id, a.name])).entries()
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
  const handleExportPDF = async () => {
    if (transactions.length === 0) {
      showToast("No transaction data to export", "info");
      return;
    }
    const parts: string[] = [];
    if (selectedAttractionId !== "All") {
      const found = attractionOptions.find((a) => a.id === selectedAttractionId);
      if (found) parts.push(`Attraction: ${found.name}`);
    }
    if (fromDate || toDate) parts.push(`Date: ${fromDate || "Start"} → ${toDate || "End"}`);
    if (selectedPaymentMode !== "All") parts.push(`Mode: ${selectedPaymentMode}`);
    if (selectedStatus !== "All") parts.push(`Status: ${selectedStatus}`);
    if (debouncedSearch) parts.push(`Search: "${debouncedSearch}"`);
    const filterInfo = parts.length > 0 ? parts.join(" | ") : "All Transactions";
    const rangeLabel = fromDate && toDate ? `${fromDate}_to_${toDate}` : "All";

    try {
      await exportToPDF(transactions, filterInfo, `Transactions_${rangeLabel}.pdf`);
      showToast(`PDF report generated for ${transactions.length} transactions`, "success");
    } catch {
      showToast("Failed to generate PDF", "error");
    }
  };

  const handleExportExcel = () => {
    if (transactions.length === 0) {
      showToast("No transaction data to export", "info");
      return;
    }
    const rangeLabel = fromDate && toDate ? `${fromDate}_to_${toDate}` : "All";
    exportToCSV(transactions, `Transactions_${rangeLabel}.csv`);
    showToast(`Exported ${transactions.length} transactions to CSV`, "success");
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", width: "100%" }}>

      {/* ── Export Buttons ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
        <ExportButtons
          onExportPDF={handleExportPDF}
          onExportExcel={handleExportExcel}
          disabled={transactions.length === 0 || isLoading}
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
              <option value="SUCCESS">Success</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
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
