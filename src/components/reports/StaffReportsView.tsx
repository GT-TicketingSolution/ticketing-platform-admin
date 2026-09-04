"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Download,
  Ticket,
  IndianRupee,
  ChevronDown,
  ChevronUp,
  Layers,
  Clock,
  ShieldAlert,
  Printer,
  X,
} from "lucide-react";
import DateRangePicker from "@/components/ui/DateRangePicker";
import { META_CONSTANTS } from "@/lib/metaConstant";
import { colors } from "@/lib/theme";
import AttractionReportCard from "@/components/reports/AttractionReportCard";
import SingleAttractionReportView from "@/components/reports/SingleAttractionReportView";
import DailySalesReportModal from "@/components/modals/DailySalesReportModal";
import { exportMultiSectionXLS, XLSSection } from "@/lib/exportUtils";
import { useStaffReportAccess } from "@/hooks/useStaffReportAccess";
import { getMockStaffReports, MOCK_STAFF_ATTRACTIONS } from "@/lib/mockStaffReportsData";
import { AttractionReportData } from "@/lib/reportsData";

const getTodayStr = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const getCurrentTimeStr = () => {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
};

const formatDateDisplay = (dateStr: string) => {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const mName = months[parseInt(m) - 1] || m;
  return `${d} ${mName} ${y}`;
};

const parse24to12 = (time24: string) => {
  if (!time24) return { h12: 12, mm: "00", ampm: "AM" as const, hourStr: "12" };
  const [hStr, mStr] = time24.split(":");
  let h = parseInt(hStr, 10);
  if (isNaN(h)) h = 0;
  const ampm: "AM" | "PM" = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  const hourStr = String(h).padStart(2, "0");
  const mm = mStr || "00";
  return { h12: h, mm, ampm, hourStr };
};

const formatTime12Display = (time24: string) => {
  if (!time24) return "";
  const { hourStr, mm, ampm } = parse24to12(time24);
  return `${hourStr}:${mm} ${ampm}`;
};

const compose12to24 = (h12: number, mmStr: string, ampm: "AM" | "PM"): string => {
  let h24 = h12;
  if (ampm === "PM" && h24 < 12) h24 += 12;
  if (ampm === "AM" && h24 === 12) h24 = 0;
  return `${String(h24).padStart(2, "0")}:${mmStr}`;
};

export default function StaffReportsView() {
  const staffReportAccess = useStaffReportAccess();

  const todayStr = useMemo(() => getTodayStr(), []);
  const [currentTimeStr, setCurrentTimeStr] = useState<string>(getCurrentTimeStr());

  // Periodically refresh current time string every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimeStr(getCurrentTimeStr());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Filters State: Defaults to Today window (today -> today, 12:00 AM up to current time)
  const [fromDate, setFromDate] = useState<string>(todayStr);
  const [toDate, setToDate] = useState<string>(todayStr);
  const [fromTime, setFromTime] = useState<string>("00:00");
  const [toTime, setToTime] = useState<string>(() => getCurrentTimeStr());
  const [selectedAttraction, setSelectedAttraction] = useState<string>("All");

  // Accordion State for "All Attractions" view (IDs of expanded cards)
  const [expandedAttractionIds, setExpandedAttractionIds] = useState<Set<string>>(
    new Set()
  );

  // Daily Sales Report Print Modal State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [selectedPrintReport, setSelectedPrintReport] = useState<AttractionReportData | null>(null);

  // Safe time change handlers: guard against future time and range inversion
  const handleFromTimeChange = (newTime: string) => {
    let safeTime = newTime;
    if (fromDate === todayStr && safeTime > currentTimeStr) {
      safeTime = currentTimeStr;
    }
    if (fromDate === toDate && safeTime > toTime) {
      safeTime = toTime;
    }
    setFromTime(safeTime);
  };

  const handleToTimeChange = (newTime: string) => {
    let safeTime = newTime;
    if (toDate === todayStr && safeTime > currentTimeStr) {
      safeTime = currentTimeStr;
    }
    if (fromDate === toDate && safeTime < fromTime) {
      safeTime = fromTime;
    }
    setToTime(safeTime);
  };

  // Validation helpers for disabling future times
  const isPmDisabled = (isFrom: boolean): boolean => {
    const targetDate = isFrom ? fromDate : toDate;
    if (targetDate === todayStr) {
      const [curH] = currentTimeStr.split(":").map((n) => parseInt(n, 10));
      if (curH < 12) return true;
    }
    return false;
  };

  const isHourDisabled = (h12: number, ampm: "AM" | "PM", isFrom: boolean): boolean => {
    const targetDate = isFrom ? fromDate : toDate;
    const isToday = targetDate === todayStr;
    const earliestInHour24 = compose12to24(h12, "00", ampm);

    // If target date is today, cannot be in future
    if (isToday && earliestInHour24 > currentTimeStr) {
      return true;
    }

    // If same date: fromTime cannot exceed toTime
    if (isFrom && fromDate === toDate && earliestInHour24 > toTime) {
      return true;
    }

    // If same date: toTime cannot be strictly before fromTime (checked by latest minute in hour)
    if (!isFrom && fromDate === toDate) {
      const latestInHour24 = compose12to24(h12, "59", ampm);
      if (latestInHour24 < fromTime) {
        return true;
      }
    }

    return false;
  };

  const isMinuteDisabled = (h12: number, mmStr: string, ampm: "AM" | "PM", isFrom: boolean): boolean => {
    const targetDate = isFrom ? fromDate : toDate;
    const isToday = targetDate === todayStr;
    const target24 = compose12to24(h12, mmStr, ampm);

    if (isToday && target24 > currentTimeStr) {
      return true;
    }

    if (isFrom && fromDate === toDate && target24 > toTime) {
      return true;
    }

    if (!isFrom && fromDate === toDate && target24 < fromTime) {
      return true;
    }

    return false;
  };

  // Interactive 12-Hour AM/PM Time Picker Popover State
  const [activeTimePicker, setActiveTimePicker] = useState<"from" | "to" | null>(null);
  const timePickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (timePickerRef.current && !timePickerRef.current.contains(e.target as Node)) {
        setActiveTimePicker(null);
      }
    };
    if (activeTimePicker) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [activeTimePicker]);

  useEffect(() => {
    document.title = META_CONSTANTS.reports.fullTitle;
  }, []);

  // Staff mock summary constrained to authorized timing window and selected time range
  const overallSummary = useMemo(() => {
    return getMockStaffReports(
      staffReportAccess.durationHours || 24,
      fromDate || undefined,
      toDate || undefined,
      selectedAttraction,
      fromTime,
      toTime
    );
  }, [staffReportAccess.durationHours, fromDate, toDate, selectedAttraction, fromTime, toTime]);

  // Attraction options dropdown
  const attractionDropdownOptions = useMemo(() => {
    return ["All Attractions", ...MOCK_STAFF_ATTRACTIONS.map((a) => a.name)];
  }, []);

  // Accordion Toggle Handlers
  const handleToggleCardExpand = (id: string) => {
    setExpandedAttractionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    setExpandedAttractionIds(
      new Set(overallSummary.attractionReports.map((a) => a.attraction.id))
    );
  };

  const handleCollapseAll = () => {
    setExpandedAttractionIds(new Set());
  };

  // Export Overall Excel Report
  const handleExportOverallReport = () => {
    if (overallSummary.attractionReports.length === 0) return;

    const sections: XLSSection[] = [
      {
        title: "1. SALES SUMMARY OVERVIEW (STAFF REPORT)",
        headers: ["Metric Label", "Value"],
        rows: [
          ["Report Authorization Window", staffReportAccess.accessLabel],
          ["Earliest Authorized Date", staffReportAccess.minDate || "N/A"],
          ["Date Range From", fromDate || "Authorized Window Start"],
          ["Date Range To", toDate || "Today"],
          ["Selected Attraction", selectedAttraction],
          [
            "Total Revenue",
            `₹${overallSummary.totalRevenue.toLocaleString("en-IN")}`,
          ],
          ["Total Tickets Sold", overallSummary.totalTicketsSold],
          ["Total Bookings", overallSummary.totalBookings],
          ["Export Generated At", new Date().toLocaleString()],
        ],
      },
      {
        title: "2. ATTRACTIONS REVENUE BREAKDOWN",
        headers: [
          "Attraction ID",
          "Attraction Name",
          "Category",
          "Total Revenue (₹)",
          "Tickets Sold",
          "Bookings Count",
          "Avg Order Value (₹)",
          "Status",
        ],
        rows: overallSummary.attractionReports.map((r) => [
          r.attraction.id,
          r.attraction.name,
          r.attraction.category,
          r.totalRevenue,
          r.totalTicketsSold,
          r.totalBookings,
          r.avgOrderValue,
          r.attraction.status,
        ]),
      },
    ];

    exportMultiSectionXLS(
      `Staff_Sales_Report_${fromDate || "window"}_to_${toDate || "today"}`,
      sections
    );
  };

  // Single attraction report view
  const singleAttractionReport = useMemo(() => {
    if (
      selectedAttraction === "All" ||
      selectedAttraction === "All Attractions"
    ) {
      return null;
    }
    return (
      overallSummary.attractionReports.find(
        (r) => r.attraction.name.toLowerCase() === selectedAttraction.toLowerCase()
      ) || null
    );
  }, [selectedAttraction, overallSummary]);

  // Gated view: if staff member has no reports access granted
  if (!staffReportAccess.hasAccess && !staffReportAccess.isLoading) {
    return (
      <div
        style={{
          padding: "48px 24px",
          backgroundColor: colors.bg.page,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            background: "#FFFFFF",
            borderRadius: "16px",
            padding: "48px 32px",
            textAlign: "center",
            boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
            border: "1px solid #E2E8F0",
            maxWidth: "520px",
            width: "100%",
          }}
        >
          <div
            style={{
              width: "68px",
              height: "68px",
              borderRadius: "50%",
              background: "#FEF2F2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px auto",
              border: "1px solid #FEE2E2",
            }}
          >
            <ShieldAlert size={36} color="#DC2626" />
          </div>
          <h2
            style={{
              fontSize: "22px",
              fontWeight: 800,
              color: colors.text.primary,
              margin: "0 0 10px 0",
              letterSpacing: "-0.01em",
            }}
          >
            Reports Access Restricted
          </h2>
          <p
            style={{
              fontSize: "14px",
              color: colors.text.muted,
              lineHeight: 1.6,
              margin: "0 0 24px 0",
            }}
          >
            Your staff account currently does not have the <strong>Reports Access</strong> privilege enabled.
            To view sales, ticket, and attraction analytics, an Administrator or Manager must assign you the
            &quot;Reports Access&quot; role in Staff Management with a designated past report viewing window (e.g. 24 hours).
          </p>
          <Link
            href="/dashboard"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              background: colors.brand.primary,
              color: colors.sidebar.activeText,
              fontWeight: 700,
              fontSize: "14px",
              padding: "12px 24px",
              borderRadius: "8px",
              textDecoration: "none",
              boxShadow: "0 2px 8px rgba(244,188,67,0.3)",
            }}
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "24px",
        backgroundColor: colors.bg.page,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
      }}
    >
      {/* Top Header Card */}
      <div
        style={{
          backgroundColor: colors.bg.card,
          borderRadius: "16px",
          padding: "24px",
          border: "1px solid #E2E8F0",
          boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "16px",
            marginBottom: "20px",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "24px",
                fontWeight: 800,
                color: colors.text.primary,
                letterSpacing: "-0.02em",
              }}
            >
              Sales & Revenue Reports
            </h1>
            <p
              style={{
                margin: "4px 0 0 0",
                fontSize: "14px",
                color: colors.text.muted,
              }}
            >
              Analyze ticket sales volume, attraction performance, and revenue reports by date range.
            </p>
          </div>

          <button
            type="button"
            onClick={handleExportOverallReport}
            disabled={overallSummary.attractionReports.length === 0}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 18px",
              borderRadius: "10px",
              backgroundColor:
                overallSummary.attractionReports.length === 0 ? "#94A3B8" : "#2372A5",
              color: "#FFFFFF",
              border: "none",
              fontSize: "13px",
              fontWeight: 700,
              cursor:
                overallSummary.attractionReports.length === 0 ? "not-allowed" : "pointer",
              opacity: overallSummary.attractionReports.length === 0 ? 0.7 : 1,
              boxShadow:
                overallSummary.attractionReports.length === 0
                  ? "none"
                  : "0 2px 8px rgba(35, 114, 165, 0.25)",
              transition: "all 0.2s",
            }}
          >
            <Download size={16} />
            Export Full Sales Report (XLS)
          </button>
        </div>

        {/* Staff Timing Access Banner */}
        {staffReportAccess.hasAccess && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "12px",
              padding: "14px 18px",
              borderRadius: "12px",
              background:
                "linear-gradient(90deg, rgba(244,188,67,0.15) 0%, rgba(12,42,66,0.06) 100%)",
              border: "1.5px solid rgba(244,188,67,0.55)",
              marginBottom: "18px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: "#0C2A42",
                  color: "#F4BC43",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  boxShadow: "0 2px 6px rgba(12, 42, 66, 0.25)",
                }}
              >
                <Clock size={18} />
              </div>
              <div>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: 800,
                    color: "#0C2A42",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span>Staff Reports Window: {staffReportAccess.accessLabel}</span>
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "#475569",
                    marginTop: "2px",
                  }}
                >
                  Authorized to view analytics from{" "}
                  <strong style={{ color: "#0C2A42" }}>
                    {staffReportAccess.minDate || "earlier today"}
                  </strong>{" "}
                  up to today. Older historical records are restricted by management.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filter Controls Row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1.25fr 1.25fr",
            gap: "16px",
            padding: "16px 20px",
            backgroundColor: "#F8FAFC",
            borderRadius: "12px",
            border: "1px solid #E2E8F0",
            alignItems: "flex-start",
          }}
        >
          {/* Custom style for perfectly matching DateRangePicker trigger button */}
          <style>{`
            .staff-date-picker-wrap > div {
              height: 42px !important;
              border-radius: 8px !important;
              width: 100% !important;
              border: 1px solid #CBD5E1 !important;
              box-sizing: border-box !important;
              background-color: #FFFFFF !important;
            }
          `}</style>

          {/* Attraction Dropdown Selector */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ height: "18px", marginBottom: "6px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#475569",
                  textTransform: "uppercase",
                  letterSpacing: "0.03em",
                }}
              >
                Select Attraction
              </label>
            </div>
            <div style={{ position: "relative", height: "42px" }}>
              <select
                value={selectedAttraction}
                onChange={(e) => setSelectedAttraction(e.target.value)}
                style={{
                  width: "100%",
                  height: "42px",
                  padding: "0 36px 0 14px",
                  borderRadius: "8px",
                  border: "1px solid #CBD5E1",
                  backgroundColor: "#FFFFFF",
                  color: colors.text.primary,
                  fontSize: "14px",
                  fontWeight: 600,
                  outline: "none",
                  appearance: "none",
                  cursor: "pointer",
                  boxSizing: "border-box",
                }}
              >
                {attractionDropdownOptions.map((opt: string) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={18}
                color="#64748B"
                style={{ position: "absolute", right: 12, top: 12, pointerEvents: "none" }}
              />
            </div>
          </div>

          {/* Start Date & End Date Picker (Authorized Window: Past 24 Hours / 1 Day) */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ height: "18px", marginBottom: "6px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#475569",
                  textTransform: "uppercase",
                  letterSpacing: "0.03em",
                }}
              >
                Date Range (Start - End Date)
              </label>
            </div>
            <div style={{ height: "42px" }} className="staff-date-picker-wrap">
              <DateRangePicker
                fromDate={fromDate}
                toDate={toDate}
                onFromDateChange={(date) => {
                  const minAllowed = staffReportAccess.minDate;
                  const nextFrom = minAllowed && date < minAllowed ? minAllowed : date;
                  setFromDate(nextFrom);
                  if (nextFrom === todayStr && fromTime > currentTimeStr) {
                    setFromTime(currentTimeStr);
                  }
                  if (nextFrom === toDate && fromTime > toTime) {
                    setFromTime(toTime);
                  }
                }}
                onToDateChange={(date) => {
                  const nextTo = date > todayStr ? todayStr : date;
                  setToDate(nextTo);
                  if (nextTo === todayStr && toTime > currentTimeStr) {
                    setToTime(currentTimeStr);
                  }
                  if (fromDate === nextTo && toTime < fromTime) {
                    setToTime(fromTime);
                  }
                }}
                onClear={() => {
                  setFromDate(todayStr);
                  setToDate(todayStr);
                  if (fromTime > currentTimeStr) {
                    setFromTime(currentTimeStr);
                  }
                  if (toTime > currentTimeStr) {
                    setToTime(currentTimeStr);
                  }
                }}
                minDate={staffReportAccess.minDate || undefined}
              />
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "#64748B",
                marginTop: "6px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                height: "16px",
              }}
            >
              <Clock size={12} color="#0284C7" />
              <span>
                Authorized: <strong>{formatDateDisplay(fromDate)}</strong> → <strong>{formatDateDisplay(toDate)}</strong>
              </span>
            </div>
          </div>

          {/* Time Range Selector (Start – End Time) */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                height: "18px",
                marginBottom: "6px",
              }}
            >
              <label
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#475569",
                  textTransform: "uppercase",
                  letterSpacing: "0.03em",
                }}
              >
                Time Range (Start – End Time)
              </label>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#0284C7",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <Clock size={12} />
                Now: {formatTime12Display(currentTimeStr)}
              </span>
            </div>

            <div
              ref={timePickerRef}
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "6px",
                height: "42px",
                backgroundColor: "#FFFFFF",
                border: "1px solid #CBD5E1",
                borderRadius: "8px",
                padding: "4px 6px",
                boxSizing: "border-box",
              }}
            >
              {/* Start Time Pill */}
              <div
                onClick={() => setActiveTimePicker(activeTimePicker === "from" ? null : "from")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "4px",
                  flex: 1,
                  height: "32px",
                  backgroundColor: activeTimePicker === "from" ? "#EFF6FF" : "#F8FAFC",
                  borderRadius: "6px",
                  border: activeTimePicker === "from" ? "1.5px solid #0284C7" : "1px solid #E2E8F0",
                  padding: "0 8px",
                  boxSizing: "border-box",
                  cursor: "pointer",
                  userSelect: "none",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748B" }}>From:</span>
                  <span style={{ fontSize: "13px", fontWeight: 800, color: "#0C2A42", fontFamily: "monospace" }}>
                    {parse24to12(fromTime).hourStr}:{parse24to12(fromTime).mm}
                  </span>
                </div>

                <button
                  type="button"
                  disabled={parse24to12(fromTime).ampm === "AM" && isPmDisabled(true)}
                  onClick={(e) => {
                    e.stopPropagation();
                    const parsed = parse24to12(fromTime);
                    const nextAmPm = parsed.ampm === "AM" ? "PM" : "AM";
                    if (nextAmPm === "PM" && isPmDisabled(true)) return;
                    const newTime = compose12to24(parsed.h12, parsed.mm, nextAmPm);
                    handleFromTimeChange(newTime);
                  }}
                  title={parse24to12(fromTime).ampm === "AM" && isPmDisabled(true) ? "PM has not arrived yet today" : "Click to toggle AM/PM"}
                  style={{
                    padding: "2px 7px",
                    borderRadius: "4px",
                    border: "none",
                    backgroundColor: parse24to12(fromTime).ampm === "PM" ? "#0C2A42" : "#FEF3C7",
                    color: parse24to12(fromTime).ampm === "PM" ? "#F4BC43" : "#92400E",
                    fontSize: "10px",
                    fontWeight: 800,
                    cursor: parse24to12(fromTime).ampm === "AM" && isPmDisabled(true) ? "not-allowed" : "pointer",
                    opacity: parse24to12(fromTime).ampm === "AM" && isPmDisabled(true) ? 0.4 : 1,
                    lineHeight: "1.2",
                    letterSpacing: "0.03em",
                  }}
                >
                  {parse24to12(fromTime).ampm}
                </button>
              </div>

              <span
                style={{
                  color: "#94A3B8",
                  fontWeight: 700,
                  fontSize: "13px",
                  flexShrink: 0,
                  padding: "0 2px",
                }}
              >
                →
              </span>

              {/* End Time Pill */}
              <div
                onClick={() => setActiveTimePicker(activeTimePicker === "to" ? null : "to")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "4px",
                  flex: 1,
                  height: "32px",
                  backgroundColor: activeTimePicker === "to" ? "#EFF6FF" : "#F8FAFC",
                  borderRadius: "6px",
                  border: activeTimePicker === "to" ? "1.5px solid #0284C7" : "1px solid #E2E8F0",
                  padding: "0 8px",
                  boxSizing: "border-box",
                  cursor: "pointer",
                  userSelect: "none",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748B" }}>To:</span>
                  <span style={{ fontSize: "13px", fontWeight: 800, color: "#0C2A42", fontFamily: "monospace" }}>
                    {parse24to12(toTime).hourStr}:{parse24to12(toTime).mm}
                  </span>
                </div>

                <button
                  type="button"
                  disabled={parse24to12(toTime).ampm === "AM" && isPmDisabled(false)}
                  onClick={(e) => {
                    e.stopPropagation();
                    const parsed = parse24to12(toTime);
                    const nextAmPm = parsed.ampm === "AM" ? "PM" : "AM";
                    if (nextAmPm === "PM" && isPmDisabled(false)) return;
                    const newTime = compose12to24(parsed.h12, parsed.mm, nextAmPm);
                    handleToTimeChange(newTime);
                  }}
                  title={parse24to12(toTime).ampm === "AM" && isPmDisabled(false) ? "PM has not arrived yet today" : "Click to toggle AM/PM"}
                  style={{
                    padding: "2px 7px",
                    borderRadius: "4px",
                    border: "none",
                    backgroundColor: parse24to12(toTime).ampm === "PM" ? "#0C2A42" : "#FEF3C7",
                    color: parse24to12(toTime).ampm === "PM" ? "#F4BC43" : "#92400E",
                    fontSize: "10px",
                    fontWeight: 800,
                    cursor: parse24to12(toTime).ampm === "AM" && isPmDisabled(false) ? "not-allowed" : "pointer",
                    opacity: parse24to12(toTime).ampm === "AM" && isPmDisabled(false) ? 0.4 : 1,
                    lineHeight: "1.2",
                    letterSpacing: "0.03em",
                  }}
                >
                  {parse24to12(toTime).ampm}
                </button>
              </div>

              {/* Time Picker Dropdown (with interactive AM/PM and 12-Hour controls) */}
              {activeTimePicker && (() => {
                const isFrom = activeTimePicker === "from";
                const targetTimeStr = isFrom ? fromTime : toTime;
                const targetDate = isFrom ? fromDate : toDate;
                const parsed = parse24to12(targetTimeStr);

                const setTargetTime = (h: number, m: string, ampm: "AM" | "PM") => {
                  const newTime = compose12to24(h, m, ampm);
                  if (isFrom) {
                    handleFromTimeChange(newTime);
                  } else {
                    handleToTimeChange(newTime);
                  }
                };

                return (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 8px)",
                      right: 0,
                      width: "310px",
                      backgroundColor: "#FFFFFF",
                      borderRadius: "14px",
                      boxShadow: "0 20px 45px rgba(0, 0, 0, 0.22)",
                      border: "1px solid #CBD5E1",
                      padding: "16px",
                      zIndex: 1050,
                      animation: "fadeIn 0.15s ease-out",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Header */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "12px",
                      }}
                    >
                      <div>
                        <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 800, color: "#0C2A42" }}>
                          {isFrom ? "Select Start Time" : "Select End Time"}
                        </h4>
                        <p style={{ margin: "2px 0 0 0", fontSize: "11px", color: "#64748B" }}>
                          Choose hour, minute &amp; AM/PM
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTimePicker(null)}
                        style={{
                          background: "#F1F5F9",
                          border: "none",
                          borderRadius: "50%",
                          width: "26px",
                          height: "26px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          color: "#64748B",
                        }}
                      >
                        <X size={14} />
                      </button>
                    </div>

                    {/* Time Preview & AM/PM Switcher */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        backgroundColor: "#F8FAFC",
                        border: "1.5px solid #E2E8F0",
                        borderRadius: "10px",
                        padding: "8px 12px",
                        marginBottom: "14px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                        <span
                          style={{
                            fontSize: "22px",
                            fontWeight: 900,
                            color: "#0C2A42",
                            fontFamily: "monospace",
                            letterSpacing: "0.05em",
                          }}
                        >
                          {parsed.hourStr}:{parsed.mm}
                        </span>
                        <span style={{ fontSize: "13px", fontWeight: 800, color: "#0284C7" }}>
                          {parsed.ampm}
                        </span>
                      </div>

                      {/* AM / PM Segmented Buttons */}
                      <div
                        style={{
                          display: "flex",
                          backgroundColor: "#E2E8F0",
                          borderRadius: "8px",
                          padding: "3px",
                          gap: "3px",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => setTargetTime(parsed.h12, parsed.mm, "AM")}
                          style={{
                            padding: "4px 14px",
                            borderRadius: "6px",
                            border: "none",
                            fontSize: "12px",
                            fontWeight: 800,
                            cursor: "pointer",
                            backgroundColor: parsed.ampm === "AM" ? "#0C2A42" : "transparent",
                            color: parsed.ampm === "AM" ? "#F4BC43" : "#64748B",
                            boxShadow: parsed.ampm === "AM" ? "0 2px 4px rgba(0,0,0,0.15)" : "none",
                            transition: "all 0.15s ease",
                          }}
                        >
                          AM
                        </button>
                        <button
                          type="button"
                          disabled={isPmDisabled(isFrom)}
                          onClick={() => !isPmDisabled(isFrom) && setTargetTime(parsed.h12, parsed.mm, "PM")}
                          title={isPmDisabled(isFrom) ? "PM has not occurred yet today" : undefined}
                          style={{
                            padding: "4px 14px",
                            borderRadius: "6px",
                            border: "none",
                            fontSize: "12px",
                            fontWeight: 800,
                            cursor: isPmDisabled(isFrom) ? "not-allowed" : "pointer",
                            opacity: isPmDisabled(isFrom) ? 0.35 : 1,
                            backgroundColor: parsed.ampm === "PM" ? "#0C2A42" : "transparent",
                            color: parsed.ampm === "PM" ? "#F4BC43" : "#64748B",
                            boxShadow: parsed.ampm === "PM" ? "0 2px 4px rgba(0,0,0,0.15)" : "none",
                            transition: "all 0.15s ease",
                          }}
                        >
                          PM
                        </button>
                      </div>
                    </div>

                    {/* Notice for Future Time Disabling */}
                    {targetDate === todayStr && (
                      <div
                        style={{
                          fontSize: "10.5px",
                          color: "#0284C7",
                          marginBottom: "12px",
                          display: "flex",
                          alignItems: "center",
                          gap: "5px",
                          fontWeight: 600,
                          backgroundColor: "#F0F9FF",
                          padding: "6px 9px",
                          borderRadius: "6px",
                          border: "1px solid #BAE6FD",
                        }}
                      >
                        <Clock size={12} color="#0284C7" />
                        <span>Future times after {formatTime12Display(currentTimeStr)} are disabled for today</span>
                      </div>
                    )}

                    {/* Hours (1 to 12) */}
                    <div style={{ marginBottom: "12px" }}>
                      <span
                        style={{
                          display: "block",
                          fontSize: "11px",
                          fontWeight: 700,
                          color: "#64748B",
                          textTransform: "uppercase",
                          marginBottom: "6px",
                        }}
                      >
                        Hour (1 – 12)
                      </span>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "5px" }}>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((h) => {
                          const isSelected = parsed.h12 === h;
                          const disabled = isHourDisabled(h, parsed.ampm, isFrom);
                          return (
                            <button
                              key={h}
                              type="button"
                              disabled={disabled}
                              onClick={() => !disabled && setTargetTime(h, parsed.mm, parsed.ampm)}
                              title={disabled ? "Future time or outside range is disabled" : undefined}
                              style={{
                                height: "30px",
                                borderRadius: "6px",
                                border: isSelected ? "1.5px solid #0C2A42" : "1px solid #CBD5E1",
                                backgroundColor: disabled
                                  ? "#F1F5F9"
                                  : isSelected
                                  ? "#0C2A42"
                                  : "#FFFFFF",
                                color: disabled
                                  ? "#94A3B8"
                                  : isSelected
                                  ? "#F4BC43"
                                  : "#1E293B",
                                fontWeight: isSelected ? 800 : 600,
                                fontSize: "12px",
                                cursor: disabled ? "not-allowed" : "pointer",
                                opacity: disabled ? 0.35 : 1,
                                transition: "all 0.1s",
                              }}
                            >
                              {String(h).padStart(2, "0")}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Minutes */}
                    <div style={{ marginBottom: "14px" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "6px",
                        }}
                      >
                        <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>
                          Minute (:00 – :55)
                        </span>
                        {/* Exact minute input */}
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <span style={{ fontSize: "10px", color: "#94A3B8" }}>Custom:</span>
                          <input
                            type="number"
                            min={0}
                            max={59}
                            value={parsed.mm}
                            onChange={(e) => {
                              const rawVal = parseInt(e.target.value, 10) || 0;
                              const clampedMinute = Math.min(59, Math.max(0, rawVal));
                              const mStr = String(clampedMinute).padStart(2, "0");
                              setTargetTime(parsed.h12, mStr, parsed.ampm);
                            }}
                            style={{
                              width: "44px",
                              height: "24px",
                              textAlign: "center",
                              borderRadius: "4px",
                              border: "1px solid #CBD5E1",
                              fontSize: "11px",
                              fontWeight: 700,
                              outline: "none",
                            }}
                          />
                        </div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "5px" }}>
                        {[0, 10, 15, 20, 30, 45].map((m) => {
                          const mStr = String(m).padStart(2, "0");
                          const isSelected = parsed.mm === mStr;
                          const disabled = isMinuteDisabled(parsed.h12, mStr, parsed.ampm, isFrom);
                          return (
                            <button
                              key={m}
                              type="button"
                              disabled={disabled}
                              onClick={() => !disabled && setTargetTime(parsed.h12, mStr, parsed.ampm)}
                              title={disabled ? "Future time or outside range is disabled" : undefined}
                              style={{
                                height: "28px",
                                borderRadius: "6px",
                                border: isSelected ? "1.5px solid #0C2A42" : "1px solid #E2E8F0",
                                backgroundColor: disabled
                                  ? "#F1F5F9"
                                  : isSelected
                                  ? "#0C2A42"
                                  : "#F8FAFC",
                                color: disabled
                                  ? "#94A3B8"
                                  : isSelected
                                  ? "#F4BC43"
                                  : "#334155",
                                fontWeight: isSelected ? 800 : 600,
                                fontSize: "11px",
                                cursor: disabled ? "not-allowed" : "pointer",
                                opacity: disabled ? 0.35 : 1,
                                transition: "all 0.1s",
                              }}
                            >
                              :{mStr}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Footer: Now shortcut + Done */}
                    <div style={{ display: "flex", gap: "8px", borderTop: "1px solid #F1F5F9", paddingTop: "12px" }}>
                      <button
                        type="button"
                        onClick={() => {
                          const cur12 = parse24to12(currentTimeStr);
                          setTargetTime(cur12.h12, cur12.mm, cur12.ampm);
                        }}
                        style={{
                          flex: 1,
                          height: "34px",
                          borderRadius: "8px",
                          border: "1px solid #CBD5E1",
                          backgroundColor: "#F8FAFC",
                          fontSize: "11px",
                          fontWeight: 700,
                          color: "#0C2A42",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "4px",
                        }}
                      >
                        <Clock size={12} color="#0284C7" />
                        Now ({formatTime12Display(currentTimeStr)})
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTimePicker(null)}
                        style={{
                          flex: 1,
                          height: "34px",
                          borderRadius: "8px",
                          border: "none",
                          backgroundColor: "#0C2A42",
                          fontSize: "12px",
                          fontWeight: 800,
                          color: "#F4BC43",
                          cursor: "pointer",
                        }}
                      >
                        Done
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Selected time range helper */}
            <div
              style={{
                marginTop: "6px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "11px",
                color: "#64748B",
                minHeight: "22px",
              }}
            >
              {/* Left: clock + selected range */}
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <Clock size={12} color="#16A34A" />
                <span>
                  Selected:{" "}
                  <strong style={{ color: "#0C2A42" }}>{formatTime12Display(fromTime)}</strong>
                  {" → "}
                  <strong style={{ color: "#0C2A42" }}>{formatTime12Display(toTime)}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Action Row Below Filters: Notice & Print Daily Sales Report Button */}
          <div
            style={{
              gridColumn: "1 / -1",
              marginTop: "4px",
              paddingTop: "14px",
              borderTop: "1px solid #E2E8F0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#475569" }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  backgroundColor: "#E0F2FE",
                  color: "#0284C7",
                  fontSize: "11px",
                  fontWeight: 800,
                }}
              >
                i
              </span>
              <span>
                Showing report for <strong>{formatDateDisplay(fromDate)} {formatTime12Display(fromTime)}</strong> to{" "}
                <strong>{formatDateDisplay(toDate)} {formatTime12Display(toTime)}</strong>
                <span
                  style={{
                    marginLeft: "8px",
                    padding: "2px 8px",
                    borderRadius: "100px",
                    backgroundColor: "#FEF3C7",
                    color: "#92400E",
                    fontSize: "11px",
                    fontWeight: 700,
                    border: "1px solid #FDE68A",
                  }}
                >
                  {fromDate !== todayStr ? "Past 24 Hours Window" : "Today's Report"}
                </span>
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedPrintReport(singleAttractionReport || null);
                setIsPrintModalOpen(true);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "9px 20px",
                borderRadius: "8px",
                backgroundColor: "#0C2A42",
                color: "#F4BC43",
                border: "none",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(12, 42, 66, 0.25)",
                transition: "all 0.15s ease",
              }}
            >
              <Printer size={16} />
              <span>Print Sales Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div>
        {singleAttractionReport ? (
          <SingleAttractionReportView
            reportData={singleAttractionReport}
            onBackToAll={() => setSelectedAttraction("All")}
            fromDate={fromDate}
            toDate={toDate}
            onPrint={() => {
              setSelectedPrintReport(singleAttractionReport);
              setIsPrintModalOpen(true);
            }}
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* Executive Aggregate Summary Cards (3 Cards for Staff - Top Attraction Removed) */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: "16px",
              }}
            >
              {/* Aggregate Revenue */}
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
                  <span style={{ fontSize: "12px", fontWeight: 700, color: colors.text.muted, textTransform: "uppercase" }}>
                    Total Aggregate Revenue
                  </span>
                  <div style={{ padding: "8px", borderRadius: "8px", backgroundColor: "#DCFCE7", color: "#16A34A" }}>
                    <IndianRupee size={18} />
                  </div>
                </div>
                <div style={{ fontSize: "24px", fontWeight: 800, color: "#16A34A", marginTop: "10px" }}>
                  ₹{overallSummary.totalRevenue.toLocaleString("en-IN")}
                </div>
                <div style={{ fontSize: "12px", color: colors.text.muted, marginTop: "4px" }}>
                  Across all attractions
                </div>
              </div>

              {/* Total Tickets */}
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
                  <span style={{ fontSize: "12px", fontWeight: 700, color: colors.text.muted, textTransform: "uppercase" }}>
                    Total Tickets Sold
                  </span>
                  <div style={{ padding: "8px", borderRadius: "8px", backgroundColor: "#E0F2FE", color: "#0284C7" }}>
                    <Ticket size={18} />
                  </div>
                </div>
                <div style={{ fontSize: "24px", fontWeight: 800, color: colors.text.primary, marginTop: "10px" }}>
                  {overallSummary.totalTicketsSold.toLocaleString("en-IN")}
                </div>
                <div style={{ fontSize: "12px", color: colors.text.muted, marginTop: "4px" }}>
                  Issued tickets count
                </div>
              </div>

              {/* Total Bookings */}
              <div
                style={{
                  backgroundColor: colors.bg.card,
                  borderRadius: "14px",
                  padding: "20px",
                  border: "1px solid #E2E8F0",
                  borderLeft: "4px solid #8B5CF6",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: colors.text.muted, textTransform: "uppercase" }}>
                    Total Bookings
                  </span>
                  <div style={{ padding: "8px", borderRadius: "8px", backgroundColor: "#F3E8FF", color: "#8B5CF6" }}>
                    <Layers size={18} />
                  </div>
                </div>
                <div style={{ fontSize: "24px", fontWeight: 800, color: colors.text.primary, marginTop: "10px" }}>
                  {overallSummary.totalBookings}
                </div>
                <div style={{ fontSize: "12px", color: colors.text.muted, marginTop: "4px" }}>
                  Processed transactions
                </div>
              </div>
            </div>

            {/* Accordion Controls Bar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "12px",
                padding: "4px 0",
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: colors.text.primary }}>
                  Attraction Sales Breakdown List
                </h2>
                <p style={{ margin: "2px 0 0 0", fontSize: "13px", color: colors.text.muted }}>
                  Click the down arrow on any attraction row below to expand its detailed sales breakdown.
                </p>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  onClick={handleExpandAll}
                  disabled={overallSummary.attractionReports.length === 0}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "6px 12px",
                    borderRadius: "6px",
                    backgroundColor: "#FFFFFF",
                    border: "1px solid #CBD5E1",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#334155",
                    cursor:
                      overallSummary.attractionReports.length === 0 ? "not-allowed" : "pointer",
                    opacity: overallSummary.attractionReports.length === 0 ? 0.6 : 1,
                  }}
                >
                  <ChevronDown size={16} />
                  Expand All
                </button>
                <button
                  type="button"
                  onClick={handleCollapseAll}
                  disabled={overallSummary.attractionReports.length === 0}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "6px 12px",
                    borderRadius: "6px",
                    backgroundColor: "#FFFFFF",
                    border: "1px solid #CBD5E1",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#334155",
                    cursor:
                      overallSummary.attractionReports.length === 0 ? "not-allowed" : "pointer",
                    opacity: overallSummary.attractionReports.length === 0 ? 0.6 : 1,
                  }}
                >
                  <ChevronUp size={16} />
                  Collapse All
                </button>
              </div>
            </div>

            {/* List of Collapsible Attraction Cards */}
            <div>
              {overallSummary.attractionReports.map((report) => (
                <AttractionReportCard
                  key={report.attraction.id}
                  report={report}
                  isExpanded={expandedAttractionIds.has(report.attraction.id)}
                  onToggleExpand={() => handleToggleCardExpand(report.attraction.id)}
                  onSelectSingle={(attractionName) => setSelectedAttraction(attractionName)}
                  fromDate={fromDate}
                  toDate={toDate}
                  onPrint={(rep) => {
                    setSelectedPrintReport(rep);
                    setIsPrintModalOpen(true);
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Thermal Daily Sales Report Print Modal */}
      <DailySalesReportModal
        isOpen={isPrintModalOpen}
        onClose={() => {
          setIsPrintModalOpen(false);
          setSelectedPrintReport(null);
        }}
        attractionReport={selectedPrintReport}
        overallSummary={overallSummary}
        fromDate={fromDate}
        toDate={toDate}
        fromTime={fromTime}
        toTime={toTime}
      />
    </div>
  );
}
