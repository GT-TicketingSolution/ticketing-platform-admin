"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import {
  Search,
  MoreVertical,
  Eye,
  Edit2,
  Trash2,
  RotateCcw,
} from "lucide-react";
import { Booking, BookingStatus } from "./types";
import { INITIAL_BOOKINGS } from "@/lib/mockBookings";
import { META_CONSTANTS } from "@/lib/metaConstant";
import { colors, typography } from "@/lib/theme";
import { useToast } from "@/components/ui/Toast";
import { confirmDelete } from "@/lib/notify";
import BookingDetailsModal from "@/components/modals/BookingDetailsModal";
import EditBookingModal from "@/components/modals/EditBookingModal";
import DateRangePicker from "@/components/ui/DateRangePicker";
import ExportButtons from "@/components/ui/ExportButtons";
import { GlobalDataTable } from "@/components/ui/GlobalDataTable";
import {
  handlePrintInvoice,
  handleDownloadPDF,
  handleDownloadBookingsListPDF,
  handleExportBookingsCSV,
} from "@/lib/printUtils";

const ITEMS_PER_PAGE = 10;

// ── Skeleton Loader ──────────────────────────────────────────────────────────
const shimmerCSS = `
  @keyframes bkgSkimmer {
    0%   { background-position: -800px 0; }
    100% { background-position: 800px 0; }
  }
  .bsk {
    background: linear-gradient(90deg, #e8edf2 25%, #f5f7fa 50%, #e8edf2 75%);
    background-size: 800px 100%;
    animation: bkgSkimmer 1.4s infinite linear;
    border-radius: 8px;
  }
`;

function BookingsSkeleton() {
  return (
    <>
      <style>{shimmerCSS}</style>
      <div style={{ display: "flex", flexDirection: "column", gap: "20px", width: "100%" }}>
        {/* Export buttons row */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
          <div className="bsk" style={{ height: 39, width: 120, borderRadius: 5 }} />
          <div className="bsk" style={{ height: 39, width: 130, borderRadius: 5 }} />
        </div>
        {/* Filter bar */}
        <div className="bsk" style={{ height: 84, width: "100%", borderRadius: 8 }} />
        {/* Table */}
        <div style={{ background: "#FFFFFF", borderRadius: 5, overflow: "hidden", border: "1px solid rgba(0,0,0,0.22)" }}>
          <div className="bsk" style={{ height: 40, width: "100%", borderRadius: 0, marginBottom: 1 }} />
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="bsk" style={{ height: 44, width: "100%", borderRadius: 0, marginBottom: 1 }} />
          ))}
        </div>
        {/* Pagination */}
        <div style={{ display: "flex", justifyContent: "space-between", padding: "4px" }}>
          <div className="bsk" style={{ height: 20, width: 160, borderRadius: 4 }} />
          <div style={{ display: "flex", gap: 6 }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bsk" style={{ height: 30, width: i === 1 || i === 4 ? 80 : 28, borderRadius: 4 }} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

export default function BookingsPage() {
  const { showToast } = useToast();

  // ── Loading skeleton (simulate brief SSR hydration delay) ──
  const [isLoading, setIsLoading] = useState(true);

  // State
  const [bookings, setBookings] = useState<Booking[]>(INITIAL_BOOKINGS);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAttraction, setSelectedAttraction] = useState("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [currentPage, setCurrentPage] = useState(1);

  // Modals state
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Dropdown open state for table row action menus
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = META_CONSTANTS.bookings.fullTitle;
    // Brief skeleton duration so the page feels intentional
    const t = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(t);
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

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedAttraction, fromDate, toDate, selectedStatus]);

  // Available attraction options
  const attractionOptions = useMemo(() => {
    const unique = Array.from(new Set(bookings.map((b) => b.attraction)));
    return ["All", ...unique];
  }, [bookings]);

  // Filtered Bookings — uses date range instead of single visitDate
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const matchesSearch =
        searchQuery === "" ||
        b.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.mobileNumber.includes(searchQuery) ||
        b.attraction.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.amount.toString().includes(searchQuery);

      const matchesAttraction =
        selectedAttraction === "All" || b.attraction === selectedAttraction;

      // Date range filter on visitDate
      const bDate = b.visitDate || "";
      const matchesFromDate = !fromDate || bDate >= fromDate;
      const matchesToDate = !toDate || bDate <= toDate;

      const matchesStatus =
        selectedStatus === "All" || b.status === selectedStatus;

      return matchesSearch && matchesAttraction && matchesFromDate && matchesToDate && matchesStatus;
    });
  }, [bookings, searchQuery, selectedAttraction, fromDate, toDate, selectedStatus]);

  // Pagination
  const totalItems = filteredBookings.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalItems);
  const paginatedBookings = filteredBookings.slice(startIndex, endIndex);

  // Handlers
  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedAttraction("All");
    setFromDate("");
    setToDate("");
    setSelectedStatus("All");
    setCurrentPage(1);
    showToast("Filters reset successfully", "info");
  };

  const handleOpenDetails = (booking: Booking) => {
    setSelectedBooking(booking);
    setIsDetailsOpen(true);
    setActiveDropdownId(null);
  };

  const handleOpenEdit = (booking: Booking) => {
    setSelectedBooking(booking);
    setIsEditOpen(true);
    setActiveDropdownId(null);
  };

  const handleDeleteBooking = async (booking: Booking) => {
    setActiveDropdownId(null);
    const confirmed = await confirmDelete(`booking "${booking.customerName} (${booking.id})"`);
    if (!confirmed) return;
    setBookings((prev) => prev.filter((b) => b.id !== booking.id));
    showToast(`Booking "${booking.id}" for ${booking.customerName} has been deleted.`, "info");
  };

  const handleSaveEditedBooking = (updated: Booking) => {
    setBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    setIsEditOpen(false);
    setSelectedBooking(null);
    showToast(`Booking ${updated.id} updated successfully!`, "success");
  };

  // ── Export PDF ──────────────────────────────────────────────────────────────
  const handleExportPDF = () => {
    if (filteredBookings.length === 0) {
      showToast("No booking data matches the selected filters", "info");
      return;
    }
    const filterParts: string[] = [];
    if (fromDate || toDate) filterParts.push(`Date Range: ${fromDate || "Start"} → ${toDate || "End"}`);
    if (selectedAttraction !== "All") filterParts.push(`Attraction: ${selectedAttraction}`);
    if (selectedStatus !== "All") filterParts.push(`Status: ${selectedStatus}`);
    if (searchQuery) filterParts.push(`Search: "${searchQuery}"`);

    const filterInfo = filterParts.length > 0 ? filterParts.join(" | ") : "All Bookings";
    handleDownloadBookingsListPDF(filteredBookings, filterInfo);
    showToast(`Generated PDF report for ${filteredBookings.length} bookings`, "success");
  };

  // ── Export Excel ────────────────────────────────────────────────────────────
  const handleExportExcel = () => {
    if (filteredBookings.length === 0) {
      showToast("No booking data matches the selected filters", "info");
      return;
    }
    const rangeLabel = fromDate && toDate ? `${fromDate}_to_${toDate}` : "All";
    handleExportBookingsCSV(filteredBookings, rangeLabel);
    showToast(`Exported ${filteredBookings.length} bookings to CSV`, "success");
  };

  // ── Status Badge ────────────────────────────────────────────────────────────
  const renderStatusBadge = (status: BookingStatus) => {
    const isConfirmed = status === "Confirmed";
    const isCancelled = status === "Cancelled";

    const bg = isConfirmed ? "#B5FFE7" : isCancelled ? "#FEE2E2" : "rgba(255, 248, 217, 0.93)";
    const dot = isConfirmed ? "#119167" : isCancelled ? "rgba(220, 38, 38, 0.88)" : "#D97706";
    const text = isConfirmed ? "#119167" : isCancelled ? "rgba(220, 38, 38, 0.86)" : "#D97706";

    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          padding: "3px 10px",
          borderRadius: "7px",
          background: bg,
          color: text,
          fontFamily: typography.fontFamily.sans,
          fontSize: "10px",
          fontWeight: 500,
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: dot }} />
        {status}
      </span>
    );
  };

  // ── Render skeleton while loading ───────────────────────────────────────────
  if (isLoading) return <BookingsSkeleton />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", width: "100%" }}>

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
          disabled={isLoading || filteredBookings.length === 0}
        />
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
        <div style={{ flex: 1, minWidth: "260px", maxWidth: "420px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "#FFFFFF",
              border: "1.5px solid rgba(179, 175, 175, 0.51)",
              borderRadius: "4px",
              padding: "0 12px",
              height: "40px",
              boxSizing: "border-box",
            }}
          >
            <Search size={18} color="#B3AFAF" />
            <input
              type="text"
              placeholder="Search by Booking ID, Customer Name........"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                border: "none",
                outline: "none",
                fontFamily: typography.fontFamily.sans,
                fontWeight: 700,
                fontSize: "12px",
                color: colors.text.primary,
                background: "transparent",
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "11px", color: colors.text.muted }}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Filters Group */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: "14px", flexWrap: "wrap" }}>

          {/* Attraction Dropdown */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label
              style={{
                fontFamily: typography.fontFamily.sans,
                fontWeight: 600,
                fontSize: "11px",
                color: "rgba(81, 82, 82, 0.75)",
                lineHeight: "14px",
                display: "block",
              }}
            >
              Attraction
            </label>
            <select
              value={selectedAttraction}
              onChange={(e) => setSelectedAttraction(e.target.value)}
              style={{
                height: "40px",
                width: "184px",
                borderRadius: "4px",
                border: "0.5px solid #B3AFAF",
                padding: "0 12px",
                fontFamily: typography.fontFamily.sans,
                fontWeight: 500,
                fontSize: "12px",
                color: "#173F63",
                outline: "none",
                background: "#FFFFFF",
                cursor: "pointer",
                boxSizing: "border-box",
              }}
            >
              {attractionOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt === "All" ? "All Attractions" : opt}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Picker (replaces Visit Date single picker) */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label
              style={{
                fontFamily: typography.fontFamily.sans,
                fontWeight: 600,
                fontSize: "11px",
                color: "rgba(81, 82, 82, 0.75)",
                lineHeight: "14px",
                display: "block",
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

          {/* Status Dropdown */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label
              style={{
                fontFamily: typography.fontFamily.sans,
                fontWeight: 600,
                fontSize: "11px",
                color: "rgba(81, 82, 82, 0.75)",
                lineHeight: "14px",
                display: "block",
              }}
            >
              Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{
                height: "40px",
                width: "140px",
                borderRadius: "4px",
                border: "0.5px solid #B3AFAF",
                padding: "0 10px",
                fontFamily: typography.fontFamily.sans,
                fontWeight: 500,
                fontSize: "12px",
                color: "#173F63",
                outline: "none",
                background: "#FFFFFF",
                cursor: "pointer",
                boxSizing: "border-box",
              }}
            >
              <option value="All">All Status</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Pending">Pending</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {/* Reset Button */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ height: "14px" }} />
            <button
              onClick={handleResetFilters}
              style={{
                height: "40px",
                width: "95px",
                borderRadius: "4px",
                border: "0.5px solid rgba(179, 175, 175, 0.66)",
                background: "#FFFFFF",
                fontFamily: typography.fontFamily.sans,
                fontWeight: 500,
                fontSize: "12px",
                color: "#173F63",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                boxSizing: "border-box",
                transition: "all 0.15s ease",
              }}
            >
              <RotateCcw size={14} />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Bookings Data Table ── */}
      {/* ── Global Data Table (Unified S.No, Headers, Row Styles & Pagination) ── */}
      <GlobalDataTable
        columns={[
          { header: "Booking ID", accessorKey: "id" },
          { header: "Customer Name", accessorKey: "customerName" },
          { header: "Date & Time", accessorKey: "dateTime" },
          { header: "Attraction", accessorKey: "attraction" },
          { header: "Visitors", accessorKey: "visitors" },
          { header: "Amount", cell: (item) => `₹${item.amount}` },
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
                          handleOpenEdit(item);
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
                        <Edit2 size={14} color="#F4BC43" />
                        <span>Edit Booking</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteBooking(item);
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
        data={filteredBookings}
        keyExtractor={(item) => item.id}
        pageSize={ITEMS_PER_PAGE}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        showSNo={true}
        sNoHeader="S.No"
        itemLabel="bookings"
        emptyMessage="No bookings found matching current filters."
      />

      {/* ── Modals ── */}
      <BookingDetailsModal
        booking={selectedBooking}
        isOpen={isDetailsOpen}
        onClose={() => { setIsDetailsOpen(false); setSelectedBooking(null); }}
        onPrint={(b) => handlePrintInvoice(b)}
        onDownloadPDF={(b) => handleDownloadPDF(b)}
      />

      <EditBookingModal
        booking={selectedBooking}
        isOpen={isEditOpen}
        onClose={() => { setIsEditOpen(false); setSelectedBooking(null); }}
        onSave={handleSaveEditedBooking}
      />

      {/* Hover & animation styles */}
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
