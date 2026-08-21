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
import { META_CONSTANTS } from "@/lib/metaConstant";
import { colors, typography } from "@/lib/theme";
import { useToast } from "@/components/ui/Toast";
import { confirmDelete } from "@/lib/notify";
import DateRangePicker from "@/components/ui/DateRangePicker";
import ExportButtons from "@/components/ui/ExportButtons";
import { GlobalDataTable } from "@/components/ui/GlobalDataTable";
import {
  useBookingList,
  useUpdateBooking,
  useDeleteBooking,
  BookingListItem,
} from "@/hooks/useBookingQueries";
import BookingDetailsModal from "@/components/modals/BookingDetailsModal";
import EditBookingModal from "@/components/modals/EditBookingModal";
import { useAttractions } from "@/hooks/useManagerQueries";
import { exportToCSV } from "@/lib/exportUtils";

const ITEMS_PER_PAGE = 10;

// ── Skeleton shimmer ─────────────────────────────────────────────────────────
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

// ── Status badge ─────────────────────────────────────────────────────────────
function renderStatusBadge(status: string) {
  const upper = status?.toUpperCase();
  const isConfirmed = upper === "CONFIRMED";
  const isCancelled = upper === "CANCELLED";

  const bg = isConfirmed ? "#B5FFE7" : isCancelled ? "#FEE2E2" : "rgba(255, 248, 217, 0.93)";
  const dot = isConfirmed ? "#119167" : isCancelled ? "rgba(220, 38, 38, 0.88)" : "#D97706";
  const text = isConfirmed ? "#119167" : isCancelled ? "rgba(220, 38, 38, 0.86)" : "#D97706";

  const label = isConfirmed ? "Confirmed" : isCancelled ? "Cancelled" : "Pending";

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
      {label}
    </span>
  );
}

export default function BookingsPage() {
  const { showToast } = useToast();

  // ── Filter State ─────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedAttractionId, setSelectedAttractionId] = useState("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);

  // ── Modal State ──────────────────────────────────────────────────────────
  const [selectedBooking, setSelectedBooking] = useState<BookingListItem | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; right: number; openUp: boolean } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = META_CONSTANTS.bookings.fullTitle;
  }, []);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, selectedAttractionId, fromDate, toDate, selectedStatus]);

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

  // ── Queries 
  const { data: bookingsData, isLoading } = useBookingList({
    page: currentPage,
    limit: ITEMS_PER_PAGE,
    search: debouncedSearch || undefined,
    attractionId: selectedAttractionId !== "All" ? selectedAttractionId : undefined,
    status: selectedStatus !== "All" ? selectedStatus : undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
  });

  const { data: attractionsData = [] } = useAttractions();

  const updateBookingMutation = useUpdateBooking();
  const deleteBookingMutation = useDeleteBooking();

  const bookings = bookingsData?.items ?? [];
  const pagination = bookingsData?.pagination;
  const totalPages = pagination?.totalPages ?? 1;

  // Build attraction dropdown options from live data
  const attractionOptions = useMemo(() => {
    const unique = Array.from(
      new Map(attractionsData.map((a: any) => [a.id, a.name])).entries()
    ).map(([id, name]) => ({ id, name }));
    return [{ id: "All", name: "All Attractions" }, ...unique];
  }, [attractionsData]);

  // Contextual empty message based on active filters
  const emptyMessage = useMemo(() => {
    const parts: string[] = [];
    if (debouncedSearch) parts.push(`"${debouncedSearch}"`);
    if (selectedAttractionId !== "All") {
      const found = attractionOptions.find((o) => o.id === selectedAttractionId);
      if (found) parts.push(found.name);
    }
    if (selectedStatus !== "All") parts.push(selectedStatus.charAt(0) + selectedStatus.slice(1).toLowerCase());
    if (fromDate || toDate) parts.push("the selected date range");
    if (parts.length === 0) return "No bookings found.";
    return `No bookings found matching ${parts.join(" · ")}.`;
  }, [debouncedSearch, selectedAttractionId, selectedStatus, fromDate, toDate, attractionOptions]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleResetFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setSelectedAttractionId("All");
    setFromDate("");
    setToDate("");
    setSelectedStatus("All");
    setCurrentPage(1);
    showToast("Filters reset successfully", "info");
  };

  const handleOpenDetails = (booking: BookingListItem) => {
    setSelectedBooking(booking);
    setIsDetailsOpen(true);
    setActiveDropdownId(null);
    setDropdownPos(null);
  };

  const handleOpenEdit = (booking: BookingListItem) => {
    setSelectedBooking(booking);
    setIsEditOpen(true);
    setActiveDropdownId(null);
    setDropdownPos(null);
  };

  const handleDeleteBooking = async (booking: BookingListItem) => {
    setActiveDropdownId(null);
    setDropdownPos(null);
    const confirmed = await confirmDelete(`booking "${booking.customerName} (${booking.bookingId})"`);
    if (!confirmed) return;
    try {
      await deleteBookingMutation.mutateAsync(booking.id);
    } catch {
      // handled in mutation onError
    }
  };

  const handleSaveEditedBooking = async (bookingId: string, customerName: string, mobileNumber: string) => {
    try {
      await updateBookingMutation.mutateAsync({ bookingId, payload: { customerName, mobileNumber } });
      setIsEditOpen(false);
      setSelectedBooking(null);
    } catch {
      // handled in mutation onError
    }
  };

  // ── Export handlers
  const handleExportPDF = async () => {
    if (bookings.length === 0) { showToast("No booking data to export.", "info"); return; }

    try {
      if (!(window as any).html2pdf) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Failed to load PDF library"));
          document.head.appendChild(script);
        });
      }

      const totalAmount = bookings.reduce((sum, b) => sum + (b.amount || 0), 0);
      const dateLabel = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

      const rowsHtml = bookings.map((b, idx) => `
        <tr style="border-bottom: 1px solid #E5E7EB; font-size: 11px;">
          <td style="padding: 8px 10px;">${idx + 1}</td>
          <td style="padding: 8px 10px; font-weight: 600; color: #0C2A42;">${b.bookingId}</td>
          <td style="padding: 8px 10px;">${b.customerName}</td>
          <td style="padding: 8px 10px;">${b.mobileNumber ?? "-"}</td>
          <td style="padding: 8px 10px;">${b.bookingDate ? new Date(b.bookingDate).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "-"}</td>
          <td style="padding: 8px 10px;">${b.attraction?.name ?? "-"}</td>
          <td style="padding: 8px 10px;">${b.visitors?.total ?? "-"}</td>
          <td style="padding: 8px 10px; text-align: right; font-weight: 600;">&#8377;${(b.amount || 0).toFixed(2)}</td>
          <td style="padding: 8px 10px; text-align: right;">&#8377;${(b.amountPaid || 0).toFixed(2)}</td>
          <td style="padding: 8px 10px;">${b.paymentMode ?? "-"}</td>
          <td style="padding: 8px 10px; text-align: center;">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: bold;
              background: ${b.status === "CONFIRMED" ? "#B5FFE7" : b.status === "CANCELLED" ? "#FEE2E2" : "#FFF8D9"};
              color: ${b.status === "CONFIRMED" ? "#119167" : b.status === "CANCELLED" ? "#DC2626" : "#D97706"};">
              ${b.status}
            </span>
          </td>
        </tr>`).join("");

      const reportHtml = `
        <div style="font-family: Arial, sans-serif; padding: 24px; color: #011B2F; background: #FFFFFF;">
          <table style="width: 100%; border-collapse: collapse; border-bottom: 2px solid #F4BC43; padding-bottom: 10px; margin-bottom: 16px;">
            <tr>
              <td style="vertical-align: top;">
                <div style="font-size: 20px; font-weight: bold; color: #0C2A42;">TICKETING PLATFORM</div>
                <div style="font-size: 13px; color: #0C2A42; font-weight: 600; margin-top: 2px;">BOOKINGS LIST REPORT</div>
                <div style="font-size: 11px; color: #6B7280; margin-top: 2px;">Generated: ${dateLabel}</div>
              </td>
              <td style="text-align: right; vertical-align: top;">
                <div style="font-size: 11px; color: #6B7280;">Total Records: <strong>${bookings.length}</strong></div>
              </td>
            </tr>
          </table>
          <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 20px;">
            <thead>
              <tr style="background: #F1F5F9; color: #374151; font-weight: bold;">
                <th style="padding: 8px 10px; text-align: left; width: 30px;">#</th>
                <th style="padding: 8px 10px; text-align: left;">Booking ID</th>
                <th style="padding: 8px 10px; text-align: left;">Customer</th>
                <th style="padding: 8px 10px; text-align: left;">Mobile</th>
                <th style="padding: 8px 10px; text-align: left;">Date &amp; Time</th>
                <th style="padding: 8px 10px; text-align: left;">Attraction</th>
                <th style="padding: 8px 10px; text-align: left;">Visitors</th>
                <th style="padding: 8px 10px; text-align: right;">Amount</th>
                <th style="padding: 8px 10px; text-align: right;">Paid</th>
                <th style="padding: 8px 10px; text-align: left;">Mode</th>
                <th style="padding: 8px 10px; text-align: center;">Status</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          <table style="width: 100%; border-collapse: collapse; background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 6px;">
            <tr>
              <td style="padding: 10px 14px; font-weight: bold; font-size: 12px; color: #0C2A42;">
                Total Bookings: ${bookings.length}
              </td>
              <td style="padding: 10px 14px; text-align: right; font-weight: bold; font-size: 14px; color: #0C2A42;">
                Total Revenue: &#8377;${totalAmount.toFixed(2)}
              </td>
            </tr>
          </table>
        </div>`;

      const element = document.createElement("div");
      element.style.width = "820px";
      element.innerHTML = reportHtml;
      document.body.appendChild(element);

      const opt = {
        margin: [10, 10, 10, 10],
        filename: `Bookings_Report_${new Date().toISOString().slice(0, 10)}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
      };

      await (window as any).html2pdf().set(opt).from(element).save();
      document.body.removeChild(element);
      showToast("PDF downloaded successfully.", "success");
    } catch (err) {
      console.error("Bookings PDF export error:", err);
      showToast("PDF export failed. Please try again.", "error");
    }
  };

  const handleExportExcel = () => {
    if (bookings.length === 0) { showToast("No booking data to export.", "info"); return; }

    const headers = ["#", "Booking ID", "Customer Name", "Mobile", "Date & Time", "Attraction", "Visitors", "Amount (₹)", "Paid (₹)", "Payment Mode", "Status"];
    const rows = bookings.map((b, i) => [
      i + 1,
      b.bookingId,
      b.customerName,
      b.mobileNumber ?? "-",
      b.bookingDate ? new Date(b.bookingDate).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "-",
      b.attraction?.name ?? "-",
      b.visitors?.total ?? "-",
      b.amount ?? 0,
      b.amountPaid ?? 0,
      b.paymentMode ?? "-",
      b.status,
    ]);

    exportToCSV(`Bookings_${new Date().toISOString().slice(0, 10)}`, headers, rows);
    showToast("Excel (CSV) file downloaded successfully.", "success");
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (isLoading) return <BookingsSkeleton />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", width: "100%" }}>

      {/* ── Top Export Buttons Row ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
        <ExportButtons
          onExportPDF={handleExportPDF}
          onExportExcel={handleExportExcel}
          disabled={isLoading || bookings.length === 0}
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
              placeholder="Search by Booking ID, Customer Name, Mobile..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
            {search && (
              <button
                onClick={() => setSearch("")}
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
              value={selectedAttractionId}
              onChange={(e) => setSelectedAttractionId(e.target.value)}
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
                <option key={opt.id} value={opt.id}>
                  {opt.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Picker */}
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
              <option value="CONFIRMED">Confirmed</option>
              <option value="PENDING">Pending</option>
              <option value="CANCELLED">Cancelled</option>
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
      <GlobalDataTable
        columns={[
          { header: "Booking ID", cell: (item: BookingListItem) => item.bookingId },
          { header: "Customer Name", cell: (item: BookingListItem) => item.customerName },
          {
            header: "Date & Time",
            cell: (item: BookingListItem) => {
              if (!item.bookingDate) return "-";
              const d = new Date(item.bookingDate);
              return isNaN(d.getTime()) ? item.bookingDate : d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
            },
          },
          { header: "Attraction", cell: (item: BookingListItem) => item.attraction?.name ?? "-" },
          { header: "Visitors", cell: (item: BookingListItem) => item.visitors?.total ?? "-" },
          { header: "Amount", cell: (item: BookingListItem) => `₹${item.amount ?? 0}` },
          { header: "Status", cell: (item: BookingListItem) => renderStatusBadge(item.status) },
          {
            header: "Actions",
            align: "center",
            cell: (item: BookingListItem) => {
              const isDropdownOpen = activeDropdownId === item.id;
              const MENU_HEIGHT = 116; // 3 items × ~38px
              return (
                <div style={{ position: "relative", display: "inline-block" }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isDropdownOpen) {
                        setActiveDropdownId(null);
                        setDropdownPos(null);
                      } else {
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        const spaceBelow = window.innerHeight - rect.bottom;
                        const openUp = spaceBelow < MENU_HEIGHT + 16;
                        setDropdownPos({
                          top: openUp ? rect.top - MENU_HEIGHT - 4 : rect.bottom + 4,
                          right: window.innerWidth - rect.right,
                          openUp,
                        });
                        setActiveDropdownId(item.id);
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
                      }}
                    >
                      <button
                        onClick={(e) => { e.stopPropagation(); handleOpenDetails(item); }}
                        style={{
                          display: "flex", alignItems: "center", gap: "8px", width: "100%",
                          padding: "8px 14px", background: "none", border: "none", cursor: "pointer",
                          fontSize: "12px", fontFamily: typography.fontFamily.sans, color: "#374151", textAlign: "left",
                        }}
                      >
                        <Eye size={14} color="#6B7280" />
                        <span>View Details</span>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleOpenEdit(item); }}
                        style={{
                          display: "flex", alignItems: "center", gap: "8px", width: "100%",
                          padding: "8px 14px", background: "none", border: "none", cursor: "pointer",
                          fontSize: "12px", fontFamily: typography.fontFamily.sans, color: "#374151", textAlign: "left",
                        }}
                      >
                        <Edit2 size={14} color="#F4BC43" />
                        <span>Edit Booking</span>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteBooking(item); }}
                        style={{
                          display: "flex", alignItems: "center", gap: "8px", width: "100%",
                          padding: "8px 14px", background: "none", border: "none", cursor: "pointer",
                          fontSize: "12px", fontFamily: typography.fontFamily.sans, color: "#DC2626", textAlign: "left",
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
        data={bookings}
        keyExtractor={(item: BookingListItem) => item.id}
        pageSize={ITEMS_PER_PAGE}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        showSNo={true}
        sNoHeader="S.No"
        itemLabel="bookings"
        emptyMessage={emptyMessage}
        isLoading={isLoading}
      />

      {/* ── Modals ── */}
      <BookingDetailsModal
        booking={selectedBooking}
        isOpen={isDetailsOpen}
        onClose={() => { setIsDetailsOpen(false); setSelectedBooking(null); }}
      />

      <EditBookingModal
        booking={selectedBooking}
        isOpen={isEditOpen}
        isSaving={updateBookingMutation.isPending}
        onClose={() => { setIsEditOpen(false); setSelectedBooking(null); }}
        onSave={handleSaveEditedBooking}
      />

      {/* Styles */}
      <style>{`
        .dropdown-item:hover { background: #F1F5F9 !important; }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        ${shimmerCSS}
      `}</style>
    </div>
  );
}
