"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Download,
  Ticket,
  IndianRupee,
  Award,
  ChevronDown,
  ChevronUp,
  Layers,
} from "lucide-react";
import DateRangePicker from "@/components/ui/DateRangePicker";
import { META_CONSTANTS } from "@/lib/metaConstant";
import { colors } from "@/lib/theme";
import { INITIAL_ATTRACTIONS } from "@/types/admin";
import {
  getOverallReportSummary
} from "@/lib/reportsData";
import AttractionReportCard from "@/components/reports/AttractionReportCard";
import SingleAttractionReportView from "@/components/reports/SingleAttractionReportView";
import { exportMultiSectionXLS, XLSSection } from "@/lib/exportUtils";

export default function ReportsPage() {
  // Filters State
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [selectedAttraction, setSelectedAttraction] = useState<string>("All");

  // Accordion State for "All Attractions" view (IDs of expanded cards)
  const [expandedAttractionIds, setExpandedAttractionIds] = useState<Set<string>>(
    new Set([INITIAL_ATTRACTIONS[0]?.id || "ATR-001"])
  );

  useEffect(() => {
    document.title = META_CONSTANTS.reports.fullTitle;
  }, []);

  // Quick Date Preset Handler
  const handleDatePreset = (preset: "today" | "yesterday" | "last7" | "last30" | "thisMonth" | "all") => {
    const today = new Date();
    const formatDate = (d: Date) => d.toISOString().split("T")[0];

    if (preset === "all") {
      setFromDate("");
      setToDate("");
      return;
    }

    if (preset === "today") {
      const dateStr = formatDate(today);
      setFromDate(dateStr);
      setToDate(dateStr);
      return;
    }

    if (preset === "yesterday") {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      const dateStr = formatDate(y);
      setFromDate(dateStr);
      setToDate(dateStr);
      return;
    }

    if (preset === "last7") {
      const start = new Date(today);
      start.setDate(start.getDate() - 6);
      setFromDate(formatDate(start));
      setToDate(formatDate(today));
      return;
    }

    if (preset === "last30") {
      const start = new Date(today);
      start.setDate(start.getDate() - 29);
      setFromDate(formatDate(start));
      setToDate(formatDate(today));
      return;
    }

    if (preset === "thisMonth") {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      setFromDate(formatDate(start));
      setToDate(formatDate(today));
      return;
    }
  };

  // Compute Overall Report Summary
  const overallSummary = useMemo(() => {
    return getOverallReportSummary(fromDate, toDate);
  }, [fromDate, toDate]);

  // Attraction options dropdown
  const attractionDropdownOptions = useMemo(() => {
    return ["All Attractions", ...INITIAL_ATTRACTIONS.map((a) => a.name)];
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
    setExpandedAttractionIds(new Set(INITIAL_ATTRACTIONS.map((a) => a.id)));
  };

  const handleCollapseAll = () => {
    setExpandedAttractionIds(new Set());
  };

  // Export Overall Excel Report
  const handleExportOverallReport = () => {
    const sections: XLSSection[] = [
      {
        title: "1. SALES SUMMARY OVERVIEW",
        headers: ["Metric Label", "Value"],
        rows: [
          ["Date Range From", fromDate || "All Time"],
          ["Date Range To", toDate || "All Time"],
          ["Selected Attraction", selectedAttraction],
          ["Total Revenue", `₹${overallSummary.totalRevenue.toLocaleString("en-IN")}`],
          ["Total Tickets Sold", overallSummary.totalTicketsSold],
          ["Total Bookings", overallSummary.totalBookings],
          ["Top Performing Attraction", overallSummary.topAttractionName],
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
      `Ticketing_Sales_Report_${fromDate || "all"}_to_${toDate || "all"}`,
      sections
    );
  };

  // Find single attraction report if single attraction selected
  const singleAttractionReport = useMemo(() => {
    if (selectedAttraction === "All" || selectedAttraction === "All Attractions") return null;
    return overallSummary.attractionReports.find(
      (r) => r.attraction.name.toLowerCase() === selectedAttraction.toLowerCase()
    );
  }, [selectedAttraction, overallSummary]);

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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px", marginBottom: "20px" }}>
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
            <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: colors.text.muted }}>
              Analyze ticket sales volume, attraction performance, and revenue reports by date range.
            </p>
          </div>

          <button
            type="button"
            onClick={handleExportOverallReport}
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
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(35, 114, 165, 0.25)",
            }}
          >
            <Download size={16} />
            Export Full Sales Report (XLS)
          </button>
        </div>

        {/* Filter Controls Row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "16px",
            padding: "16px",
            backgroundColor: "#F8FAFC",
            borderRadius: "12px",
            border: "1px solid #E2E8F0",
            alignItems: "center",
          }}
        >
          {/* Attraction Dropdown Selector */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "12px",
                fontWeight: 700,
                color: "#475569",
                marginBottom: "6px",
                textTransform: "uppercase",
                letterSpacing: "0.03em",
              }}
            >
              Select Attraction
            </label>
            <div style={{ position: "relative" }}>
              <select
                value={selectedAttraction}
                onChange={(e) => setSelectedAttraction(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 36px 10px 14px",
                  borderRadius: "8px",
                  border: "1px solid #CBD5E1",
                  backgroundColor: "#FFFFFF",
                  color: colors.text.primary,
                  fontSize: "14px",
                  fontWeight: 600,
                  outline: "none",
                  appearance: "none",
                  cursor: "pointer",
                }}
              >
                {attractionDropdownOptions.map((opt) => (
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

          {/* Start Date & End Date Picker */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "12px",
                fontWeight: 700,
                color: "#475569",
                marginBottom: "6px",
                textTransform: "uppercase",
                letterSpacing: "0.03em",
              }}
            >
              Date Range (Start - End Date)
            </label>
            <DateRangePicker
              fromDate={fromDate}
              toDate={toDate}
              onFromDateChange={(date) => setFromDate(date)}
              onToDateChange={(date) => setToDate(date)}
              onClear={() => {
                setFromDate("");
                setToDate("");
              }}
            />
          </div>

          {/* Quick Date Presets */}
          <div style={{ gridColumn: "span 1 / -1" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "12px", fontWeight: 600, color: colors.text.muted, marginRight: "4px" }}>
                Quick Ranges:
              </span>
              {[
                { label: "All Time", value: "all" },
                { label: "Today", value: "today" },
                { label: "Yesterday", value: "yesterday" },
                { label: "Last 7 Days", value: "last7" },
                { label: "Last 30 Days", value: "last30" },
                { label: "This Month", value: "thisMonth" },
              ].map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => handleDatePreset(p.value as any)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "6px",
                    border: "1px solid #CBD5E1",
                    backgroundColor: "#FFFFFF",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#334155",
                    cursor: "pointer",
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* RENDER VIEW: Single Attraction vs All Attractions Accordion */}
      {singleAttractionReport ? (
        <SingleAttractionReportView
          reportData={singleAttractionReport}
          onBackToAll={() => setSelectedAttraction("All")}
          fromDate={fromDate}
          toDate={toDate}
        />
      ) : (
        /* "ALL ATTRACTIONS" VIEW */
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Executive Aggregate Summary Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
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

            {/* Top Attraction */}
            <div
              style={{
                backgroundColor: colors.bg.card,
                borderRadius: "14px",
                padding: "20px",
                border: "1px solid #E2E8F0",
                borderLeft: "4px solid #F4BC43",
                boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "12px", fontWeight: 700, color: colors.text.muted, textTransform: "uppercase" }}>
                  Top Attraction
                </span>
                <div style={{ padding: "8px", borderRadius: "8px", backgroundColor: "#FEF3C7", color: "#D97706" }}>
                  <Award size={18} />
                </div>
              </div>
              <div style={{ fontSize: "20px", fontWeight: 800, color: colors.text.primary, marginTop: "10px" }}>
                {overallSummary.topAttractionName}
              </div>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "#16A34A", marginTop: "4px" }}>
                ₹{overallSummary.topAttractionRevenue.toLocaleString("en-IN")} revenue
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
                  cursor: "pointer",
                }}
              >
                <ChevronDown size={16} />
                Expand All
              </button>
              <button
                type="button"
                onClick={handleCollapseAll}
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
                  cursor: "pointer",
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
                onSelectSingle={(name) => setSelectedAttraction(name)}
                fromDate={fromDate}
                toDate={toDate}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
