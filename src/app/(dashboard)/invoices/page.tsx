"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  RotateCcw,
  MoreVertical,
  Eye,
  Trash2,
  SearchX,
  FileText,
} from "lucide-react";
import { colors, typography } from "@/lib/theme";
import { META_CONSTANTS } from "@/lib/metaConstant";
import ExportButtons from "@/components/ui/ExportButtons";
import DateRangePicker from "@/components/ui/DateRangePicker";
import InvoiceDetailsModal from "@/components/modals/InvoiceDetailsModal";
import { GlobalDataTable } from "@/components/ui/GlobalDataTable";
import { useToast } from "@/components/ui/Toast";
import { confirmDelete } from "@/lib/notify";
import {
  useInvoiceList,
  fetchInvoiceList,
  useDeleteInvoice,
  InvoiceListItem,
  InvoiceListParams,
} from "@/hooks/useInvoiceQueries";
import {
  ExportScope,
  exportTableToPDF,
  exportToCSV,
  renderStatusBadgeHTML,
  fetchAllPages,
} from "@/lib/exportUtils";

const PAGE_SIZE = 10;

// ── Date format helpers
function formatDateVal(val?: string | null): string {
  if (!val) return "-";
  const d = new Date(val);
  return isNaN(d.getTime()) ? val : d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function formatDateOnly(val?: string | null): string {
  if (!val) return "-";
  const d = new Date(val);
  return isNaN(d.getTime()) ? val : d.toLocaleDateString("en-IN", { dateStyle: "medium" });
}

function StatusBadge({ status }: { status: string }) {
  const upper = status?.toUpperCase() || "";
  const isSuccess = upper === "SUCCESS" || upper === "SUCCESSFUL" || upper === "CONFIRMED" || upper === "PAID" || upper === "SCANNED";
  const isFailed = upper === "FAILED" || upper === "CANCELLED";
  const isUnscanned = upper === "UNSCANNED";

  const bg = isSuccess ? "#B5FFE7" : isFailed ? "#FEE2E2" : isUnscanned ? "rgba(255,248,217,0.93)" : "#E2E8F0";
  const dot = isSuccess ? "#119167" : isFailed ? "rgba(220,38,38,0.88)" : isUnscanned ? "#D97706" : "#64748B";
  const text = isSuccess ? "#119167" : isFailed ? "rgba(220,38,38,0.86)" : isUnscanned ? "#D97706" : "#475569";
  const label = upper === "SCANNED" ? "Scanned" : upper === "UNSCANNED" ? "Unscanned" : isSuccess ? "Success" : isFailed ? "Failed" : status || "Pending";

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
      <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: dot }} />
      {label}
    </span>
  );
}


// ── Main Page Component ───────────────────────────────────────────────────────
export default function InvoicesPage() {
  const { showToast } = useToast();

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  // Debounced search for API
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset pagination on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, fromDate, toDate, selectedStatusFilter]);

  // Modals & Dropdown State
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceListItem | null>(null);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; right: number; openUp: boolean } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = META_CONSTANTS.invoices.fullTitle;
  }, []);

  // Close dropdown on click outside
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

  // ── API Query ──────────────────────────────────────────────────────────────
  const queryParams: InvoiceListParams = {
    page: currentPage,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
    dateFrom: fromDate || undefined,
    dateTo: toDate || undefined,
    status: selectedStatusFilter !== "All" ? selectedStatusFilter : undefined,
  };

  const { data, isLoading, isError } = useInvoiceList(queryParams);
  const deleteInvoiceMutation = useDeleteInvoice();

  const invoices = data?.items ?? [];
  const pagination = data?.pagination ?? { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 0 };

  const isFiltered = !!debouncedSearch || !!fromDate || !!toDate || selectedStatusFilter !== "All";

  // Stats from backend summary, fallback to live data calculation
  const totalRevenue = data?.summary?.totalRevenue ?? invoices.reduce((s, inv) => s + (Number(inv.grandTotalAmount ?? inv.amount) || 0), 0);
  const totalInvoicesCount = data?.summary?.totalInvoices ?? pagination.total ?? invoices.length;
  const paidInvoicesCount = data?.summary?.paidInvoices ?? invoices.filter((inv) => {
    const u = (inv.scannerInvoice?.scannerInvoiceStatus || inv.status || "").toUpperCase();
    return u === "SUCCESS" || u === "SUCCESSFUL" || u === "CONFIRMED" || u === "PAID" || u === "SCANNED";
  }).length;

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleResetFilters = () => {
    setSearchQuery("");
    setFromDate("");
    setToDate("");
    setSelectedStatusFilter("All");
    setCurrentPage(1);
  };

  const handleOpenDetails = (inv: InvoiceListItem) => {
    setSelectedInvoice(inv);
    setActiveDropdownId(null);
    setDropdownPos(null);
  };

  const handleDeleteInvoice = async (inv: InvoiceListItem) => {
    setActiveDropdownId(null);
    setDropdownPos(null);
    const label = inv.invoiceId || inv.invoiceNumber || inv.customerName || "invoice";
    const confirmed = await confirmDelete(`invoice "${label}"`);
    if (!confirmed) return;
    deleteInvoiceMutation.mutate(inv.id);
  };

  // ── Export Handlers ────────────────────────────────────────────────────────
  const getFilterInfo = () => {
    const parts: string[] = [];
    if (fromDate || toDate) parts.push(`Date: ${fromDate || "Start"} → ${toDate || "End"}`);
    if (debouncedSearch) parts.push(`Search: "${debouncedSearch}"`);
    return parts.length > 0 ? parts.join(" | ") : undefined;
  };

  const getExportData = async (scope: ExportScope): Promise<InvoiceListItem[]> => {
    const base: InvoiceListParams = {
      search: debouncedSearch || undefined,
      dateFrom: fromDate || undefined,
      dateTo: toDate || undefined,
    };

    if (scope === "current") {
      const res = await fetchInvoiceList({ ...base, page: currentPage, limit: PAGE_SIZE });
      return res.items;
    } else {
      return await fetchAllPages<InvoiceListItem>((page, limit) =>
        fetchInvoiceList({ ...base, page, limit })
      );
    }
  };

  const handleExportPDF = async (scope: ExportScope) => {
    setIsExportingPDF(true);
    try {
      const items = await getExportData(scope);
      if (!items.length) {
        showToast("No invoice data to export.", "info");
        return;
      }
      const dateKey = new Date().toISOString().slice(0, 10);
      const scopeLabel = scope === "all" ? "All" : `Page_${currentPage}`;
      await exportTableToPDF<InvoiceListItem>({
        title: "INVOICES REPORT",
        filterInfo: getFilterInfo(),
        scope,
        currentPage,
        filename: `Invoices_${scopeLabel}_${dateKey}.pdf`,
        orientation: "landscape",
        columns: [
          { header: "#", accessor: (_, i) => (scope === "all" ? i + 1 : (currentPage - 1) * PAGE_SIZE + i + 1), width: "30px" },
          { header: "Invoice ID", accessor: (inv) => inv.invoiceNumber || inv.invoiceId || "-" },
          { header: "Customer", accessor: (inv) => inv.customer?.name || inv.customerName || "-" },
          { header: "Date", accessor: (inv) => formatDateOnly(inv.dateTime || inv.invoiceDate) },
          { header: "Attraction", accessor: (inv) => inv.attractions && inv.attractions.length > 0 ? inv.attractions.map(a => a.name).join(", ") : (inv.attraction?.name || "-") },
          { header: "Visitors", accessor: (inv) => inv.visitors ?? 0, align: "center" },
          { header: "Amount (₹)", accessor: (inv) => `₹${Number(inv.grandTotalAmount ?? inv.amount ?? 0).toFixed(2)}`, align: "right" },
          { header: "Scanner Status", renderCell: (inv) => renderStatusBadgeHTML(inv.scannerInvoice?.scannerInvoiceStatus || inv.status || "-"), align: "center" },
        ],
        data: items,
        summaryCards: [
          { label: "Total Invoices", value: items.length },
          { label: "Total Revenue", value: `₹${items.reduce((s, inv) => s + Number(inv.grandTotalAmount ?? inv.amount ?? 0), 0).toFixed(2)}` },
        ],
      });
      showToast(`PDF downloaded (${items.length} record${items.length === 1 ? "" : "s"}).`, "success");
    } catch (err) {
      console.error("Invoices PDF export error:", err);
      showToast("PDF export failed. Please try again.", "error");
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleExportExcel = async (scope: ExportScope) => {
    setIsExportingExcel(true);
    try {
      const items = await getExportData(scope);
      if (!items.length) {
        showToast("No invoice data to export.", "info");
        return;
      }
      const dateKey = new Date().toISOString().slice(0, 10);
      const scopeLabel = scope === "all" ? "All" : `Page_${currentPage}`;
      const headers = ["#", "Invoice ID", "Customer", "Date", "Attraction", "Visitors", "Amount (₹)", "Scanner Status"];
      const rows = items.map((inv, i) => [
        scope === "all" ? i + 1 : (currentPage - 1) * PAGE_SIZE + i + 1,
        inv.invoiceNumber || inv.invoiceId || "-",
        inv.customer?.name || inv.customerName || "-",
        formatDateOnly(inv.dateTime || inv.invoiceDate),
        inv.attractions && inv.attractions.length > 0 ? inv.attractions.map(a => a.name).join(", ") : (inv.attraction?.name || "-"),
        inv.visitors ?? 0,
        Number(inv.grandTotalAmount ?? inv.amount ?? 0).toFixed(2),
        inv.scannerInvoice?.scannerInvoiceStatus || inv.status || "-",
      ]);
      exportToCSV(`Invoices_${scopeLabel}_${dateKey}`, headers, rows);
      showToast(`Excel downloaded (${items.length} record${items.length === 1 ? "" : "s"}).`, "success");
    } catch (err) {
      console.error("Invoices Excel export error:", err);
      showToast("Excel export failed. Please try again.", "error");
    } finally {
      setIsExportingExcel(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", width: "100%" }}>
      {/* ── Top Export Buttons Row ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
        <ExportButtons
          onExportPDFScope={handleExportPDF}
          onExportExcelScope={handleExportExcel}
          isExportingPDF={isExportingPDF}
          isExportingExcel={isExportingExcel}
          disabled={isLoading || (invoices.length === 0 && (data?.pagination?.total ?? 0) === 0)}
        />
      </div>

      {/* ── Stats Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" }}>
        {[
          { label: "Total Revenue", value: `₹${totalRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: "#F59E0B" },
          { label: "Total Invoices", value: totalInvoicesCount.toLocaleString(), color: "#1E3A5F" },
          { label: "Paid Invoices", value: paidInvoicesCount.toLocaleString(), color: "#10B981" },
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

      {/* ── Filters Bar ── */}
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
            display: "flex",
            alignItems: "center",
            gap: "10px",
            background: "#FFFFFF",
            border: "1px solid #C4C4C4",
            borderRadius: "4px",
            padding: "0 14px",
            height: "40px",
            flex: "1 1 280px",
            maxWidth: "420px",
          }}
        >
          <Search size={18} color="#A0A0A0" strokeWidth={2} />
          <input
            type="text"
            placeholder="Search by Invoice Number, Customer Name, Mobile..."
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

        {/* Right Filter Controls */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: "14px", flexWrap: "wrap" }}>
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
              onClear={() => {
                setFromDate("");
                setToDate("");
              }}
            />
          </div>

          {/* Status Filter */}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label
              style={{
                fontFamily: typography.fontFamily.sans,
                fontWeight: 600,
                fontSize: "10px",
                color: "rgba(81, 82, 82, 0.65)",
              }}
            >
              Status Filter
            </label>
            <select
              value={selectedStatusFilter}
              onChange={(e) => {
                setSelectedStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                height: "40px",
                padding: "0 12px",
                background: "#FFFFFF",
                border: "0.5px solid rgba(179, 175, 175, 0.66)",
                borderRadius: "4px",
                fontFamily: typography.fontFamily.sans,
                fontWeight: 600,
                fontSize: "12px",
                color: "#011B2F",
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="All">All Status</option>
              <option value="SCANNED">Scanned</option>
              <option value="UNSCANNED">Unscanned</option>
            </select>
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
            }}
          >
            <RotateCcw size={14} />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* ── Global Data Table Component ── */}
      <GlobalDataTable
        columns={[
          {
            header: "Invoice ID",
            cell: (item) => (
              <span
                style={{
                  fontFamily: typography.fontFamily.sans,
                  fontWeight: 600,
                  fontSize: "13px",
                  color: colors.brand.accent,
                }}
              >
                {item.invoiceNumber || item.invoiceId || "-"}
              </span>
            ),
          },
          {
            header: "Customer Name",
            cell: (item) => item.customer?.name || item.customerName || "-",
          },
          {
            header: "Date & Time",
            cell: (item) => formatDateVal(item.dateTime || item.invoiceDate),
          },
          {
            header: "Attraction",
            cell: (item) =>
              item.attractions && item.attractions.length > 0
                ? item.attractions.map((a) => a.name).join(", ")
                : item.attraction?.name || "-",
          },
          {
            header: "Visitors",
            align: "center",
            cell: (item) => (
              <span
                style={{
                  fontFamily: typography.fontFamily.sans,
                  fontWeight: 600,
                  fontSize: "13px",
                  color: "#374151",
                }}
              >
                {item.visitors !== undefined && item.visitors !== null ? item.visitors : "-"}
              </span>
            ),
          },
          {
            header: "Amount",
            cell: (item) => (
              <span
                style={{
                  fontFamily: typography.fontFamily.sans,
                  fontWeight: 700,
                  fontSize: "13px",
                  color: "#011B2F",
                }}
              >
                ₹{Number(item.grandTotalAmount ?? item.amount ?? 0).toFixed(2)}
              </span>
            ),
          },
          {
            header: "Status",
            cell: (item) => (
              <StatusBadge status={item.scannerInvoice?.scannerInvoiceStatus || item.status || "UNSCANNED"} />
            ),
          },
          {
            header: "Actions",
            align: "center",
            cell: (item, idx) => {
              const itemId = item.id || item.invoiceId || item.invoiceNumber || `inv-${idx}`;
              const isDropdownOpen = activeDropdownId === itemId;

              return (
                <div style={{ position: "relative", display: "inline-block" }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isDropdownOpen) {
                        setActiveDropdownId(null);
                        setDropdownPos(null);
                      } else {
                        const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                        const MENU_HEIGHT = 80;
                        const spaceBelow = window.innerHeight - rect.bottom;
                        const openUp = spaceBelow < MENU_HEIGHT + 16;
                        setDropdownPos({
                          top: openUp ? rect.top - MENU_HEIGHT - 4 : rect.bottom + 4,
                          right: window.innerWidth - rect.right,
                          openUp,
                        });
                        setActiveDropdownId(itemId);
                      }
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

                  {isDropdownOpen && dropdownPos && (
                    <div
                      ref={dropdownRef}
                      style={{
                        position: "fixed",
                        top: dropdownPos.top,
                        right: dropdownPos.right,
                        zIndex: 9999,
                        background: "#FFFFFF",
                        border: "1px solid #E5E7EB",
                        borderRadius: "8px",
                        boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
                        width: "150px",
                        padding: "4px 0",
                        display: "flex",
                        flexDirection: "column",
                        animation: "fadeIn 0.12s ease-out",
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => handleOpenDetails(item)}
                        className="dropdown-item"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          width: "100%",
                          padding: "8px 14px",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontSize: "13px",
                          fontFamily: typography.fontFamily.sans,
                          color: "#374151",
                          textAlign: "left",
                        }}
                      >
                        <Eye size={14} color="#6B7280" />
                        <span>View Details</span>
                      </button>

                      <button
                        onClick={() => handleDeleteInvoice(item)}
                        className="dropdown-item"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          width: "100%",
                          padding: "8px 14px",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontSize: "13px",
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
        data={invoices}
        keyExtractor={(item, index) => item.id || item.invoiceId || item.invoiceNumber || `invoice-${index}`}
        pageSize={PAGE_SIZE}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        totalItems={pagination.total}
        totalPages={pagination.totalPages}
        showSNo={true}
        sNoHeader="S.No"
        itemLabel="invoices"
        isLoading={isLoading}
        emptyIcon={
          isFiltered ? (
            <SearchX size={26} color={colors.brand.accent} />
          ) : (
            <FileText size={26} color={colors.brand.accent} />
          )
        }
        emptyTitle={isFiltered ? "No Matching Invoices Found" : "No Invoices Found"}
        emptyDescription={
          isFiltered
            ? debouncedSearch.trim()
              ? `No invoices found matching "${debouncedSearch}". Try adjusting your search or filters.`
              : "No invoices match the selected filter criteria. Try adjusting or clearing your filters."
            : "There are currently no invoices recorded in the system."
        }
        emptyAction={
          isFiltered ? (
            <button
              type="button"
              onClick={handleResetFilters}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: `1px solid ${colors.header.border}`,
                background: "#FFFFFF",
                fontSize: "13px",
                fontWeight: 600,
                color: colors.brand.accent,
                cursor: "pointer",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              }}
            >
              Clear Filters &amp; Search
            </button>
          ) : undefined
        }
      />

      {/* ── Invoice Details Modal ── */}
      <InvoiceDetailsModal
        invoice={selectedInvoice}
        isOpen={Boolean(selectedInvoice)}
        onClose={() => setSelectedInvoice(null)}
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
