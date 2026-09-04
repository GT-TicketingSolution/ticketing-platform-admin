"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Download,
  Ticket,
  IndianRupee,
  Award,
  ChevronDown,
  ChevronUp,
  Layers,
  Plus,
  ArrowRight,
  BarChart3,
  CreditCard,
  TrendingUp,
  FileSpreadsheet,
  AlertCircle,
  SearchX,
} from "lucide-react";
import DateRangePicker from "@/components/ui/DateRangePicker";
import { META_CONSTANTS } from "@/lib/metaConstant";
import { colors } from "@/lib/theme";
import AttractionReportCard from "@/components/reports/AttractionReportCard";
import SingleAttractionReportView from "@/components/reports/SingleAttractionReportView";
import { exportMultiSectionXLS, XLSSection } from "@/lib/exportUtils";
import { useAttractionManagementList } from "@/hooks/useAttractionManagementQueries";
import {
  useReportSummary,
  useReportAttraction,
  useReportPayment,
  useReportTickets,
  buildOverallSummary,
} from "@/hooks/useReportQueries";

export default function AdminReportsView() {
  const router = useRouter();

  // Filters State
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [selectedAttraction, setSelectedAttraction] = useState<string>("All");

  // Accordion State for "All Attractions" view (IDs of expanded cards)
  const [expandedAttractionIds, setExpandedAttractionIds] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    document.title = META_CONSTANTS.reports.fullTitle;
  }, []);

  // ── Real API Queries ────────────────────────────────────────────────────────
  const { data: attractionsData = [], isLoading: isAttractionsLoading } =
    useAttractionManagementList();

  const selectedAttractionObj = useMemo(() => {
    if (
      !selectedAttraction ||
      selectedAttraction === "All" ||
      selectedAttraction === "All Attractions" ||
      selectedAttraction === "No Attractions Available"
    ) {
      return null;
    }
    return attractionsData.find(
      (a: any) => a.name?.toLowerCase() === selectedAttraction.toLowerCase()
    );
  }, [selectedAttraction, attractionsData]);

  const selectedAttractionId = selectedAttractionObj?.attractionId || selectedAttractionObj?.id;

  // 1. GET /api/admin/reports/summary
  const { data: summaryData, isLoading: isSummaryLoading } = useReportSummary(
    fromDate || undefined,
    toDate || undefined,
    selectedAttractionId || undefined
  );

  // 2. GET /api/admin/reports/attraction
  const { data: attractionReportsData = [], isLoading: isAttractionReportsLoading } =
    useReportAttraction(fromDate || undefined, toDate || undefined);

  // 3. GET /api/admin/reports/payment
  const { data: paymentData = [], isLoading: isPaymentLoading } = useReportPayment();

  // 4. GET /api/admin/reports/tickets
  const { data: ticketData = [], isLoading: isTicketsLoading } = useReportTickets();

  // Quick Date Preset Handler
  const handleDatePreset = (
    preset: "today" | "yesterday" | "last7" | "last30" | "thisMonth" | "all"
  ) => {
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

  // Compose Overall Report Summary from live APIs
  const overallSummary = useMemo(() => {
    return buildOverallSummary(
      summaryData,
      attractionReportsData,
      ticketData,
      paymentData,
      attractionsData
    );
  }, [summaryData, attractionReportsData, ticketData, paymentData, attractionsData]);

  // Attraction options dropdown
  const attractionDropdownOptions = useMemo(() => {
    if (!attractionsData || attractionsData.length === 0) {
      return ["No Attractions Available"];
    }
    return ["All Attractions", ...attractionsData.map((a: any) => a.name)];
  }, [attractionsData]);

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
        title: "1. SALES SUMMARY OVERVIEW",
        headers: ["Metric Label", "Value"],
        rows: [
          ["Date Range From", fromDate || "All Time"],
          ["Date Range To", toDate || "All Time"],
          ["Selected Attraction", selectedAttraction],
          [
            "Total Revenue",
            `₹${overallSummary.totalRevenue.toLocaleString("en-IN")}`,
          ],
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
    if (
      selectedAttraction === "All" ||
      selectedAttraction === "All Attractions" ||
      selectedAttraction === "No Attractions Available"
    ) {
      return null;
    }
    const found = overallSummary.attractionReports.find(
      (r) => r.attraction.name.toLowerCase() === selectedAttraction.toLowerCase()
    );
    if (found) return found;
    if (selectedAttractionObj) {
      return {
        attraction: {
          id: selectedAttractionObj.attractionId || selectedAttractionObj.id || "",
          attractionId: selectedAttractionObj.attractionId || selectedAttractionObj.id || "",
          name: selectedAttractionObj.name || selectedAttraction,
          category: (selectedAttractionObj.category || "RIDE") as any,
          status: (selectedAttractionObj.status || "Active") as any,
          pricing: selectedAttractionObj.pricing || { adult: 0, child: 0, student: 0, senior: 0, foreigner: 0 },
          image: selectedAttractionObj.image || "",
          timing: selectedAttractionObj.timing || "",
          description: selectedAttractionObj.description || "",
          hasSeating: selectedAttractionObj.hasSeating || false,
          seatLayoutId: selectedAttractionObj.seatLayoutId || null,
          seatLayouts: selectedAttractionObj.seatLayouts || [],
          seating: selectedAttractionObj.seating ?? { adult: 1, child: 1, student: 1, senior: 1, foreigner: 1 },
        },
        totalRevenue: summaryData?.totalRevenue ?? 0,
        totalTicketsSold: summaryData?.totalTickets ?? 0,
        totalBookings: summaryData?.totalBookings ?? 0,
        avgOrderValue:
          (summaryData?.totalBookings ?? 0) > 0
            ? Math.round(
              (summaryData?.totalRevenue ?? 0) /
              (summaryData?.totalBookings ?? 1)
            )
            : 0,
        categoryBreakdown: [],
        paymentBreakdown: [],
        transactions: [],
        bookings: [],
      };
    }
    return null;
  }, [selectedAttraction, overallSummary, selectedAttractionObj, summaryData]);

  const hasNoAttractions =
    !isAttractionsLoading && attractionsData.length === 0;

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
            disabled={hasNoAttractions || overallSummary.attractionReports.length === 0}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 18px",
              borderRadius: "10px",
              backgroundColor: hasNoAttractions || overallSummary.attractionReports.length === 0 ? "#94A3B8" : "#2372A5",
              color: "#FFFFFF",
              border: "none",
              fontSize: "13px",
              fontWeight: 700,
              cursor: hasNoAttractions || overallSummary.attractionReports.length === 0 ? "not-allowed" : "pointer",
              opacity: hasNoAttractions || overallSummary.attractionReports.length === 0 ? 0.7 : 1,
              boxShadow: hasNoAttractions || overallSummary.attractionReports.length === 0 ? "none" : "0 2px 8px rgba(35, 114, 165, 0.25)",
              transition: "all 0.2s",
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
                disabled={hasNoAttractions}
                style={{
                  width: "100%",
                  padding: "10px 36px 10px 14px",
                  borderRadius: "8px",
                  border: "1px solid #CBD5E1",
                  backgroundColor: hasNoAttractions ? "#F1F5F9" : "#FFFFFF",
                  color: hasNoAttractions ? "#94A3B8" : colors.text.primary,
                  fontSize: "14px",
                  fontWeight: 600,
                  outline: "none",
                  appearance: "none",
                  cursor: hasNoAttractions ? "not-allowed" : "pointer",
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
                color={hasNoAttractions ? "#94A3B8" : "#64748B"}
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

      {/* ΓöÇΓöÇ MEANINGFUL EMPTY STATE WHEN NO ATTRACTION IS CREATED ΓöÇΓöÇ */}
      {hasNoAttractions ? (
        <div
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: "20px",
            border: "1px solid #E2E8F0",
            padding: "48px 24px",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.04)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: "28px",
          }}
        >
          {/* Visual Icon Badge */}
          <div
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              backgroundColor: "#EFF6FF",
              border: "2px solid #BFDBFE",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#2372A5",
              boxShadow: "0 8px 16px rgba(35, 114, 165, 0.12)",
            }}
          >
            <BarChart3 size={38} color="#2372A5" strokeWidth={2.2} />
          </div>

          {/* Heading & Meaningful Context Description */}
          <div style={{ maxWidth: "560px" }}>
            <h2
              style={{
                fontSize: "22px",
                fontWeight: 800,
                color: "#0C2A42",
                margin: "0 0 10px 0",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              No Attractions Found to Generate Reports
            </h2>
            <p
              style={{
                fontSize: "14px",
                lineHeight: "1.6",
                color: "#64748B",
                margin: 0,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              There are currently no attractions created in the platform. To view ticket sales
              breakdown, revenue metrics, category analytics, and payment distributions, please create
              an attraction first.
            </p>
          </div>

          {/* Direct CTA Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap", justifyContent: "center" }}>
            <Link
              href="/attraction-management?action=add"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "12px 24px",
                backgroundColor: "#0C2A42",
                color: "#FFFFFF",
                borderRadius: "10px",
                textDecoration: "none",
                fontWeight: 700,
                fontSize: "14px",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                boxShadow: "0 4px 12px rgba(12, 42, 66, 0.25)",
                transition: "all 0.2s ease",
              }}
            >
              <Plus size={18} strokeWidth={2.5} />
              <span>Create New Attraction</span>
            </Link>

            <Link
              href="/attraction-management"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "12px 22px",
                backgroundColor: "#FFFFFF",
                color: "#0C2A42",
                border: "1.5px solid #CBD5E1",
                borderRadius: "10px",
                textDecoration: "none",
                fontWeight: 600,
                fontSize: "14px",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                transition: "all 0.2s ease",
              }}
            >
              <span>Go to Attraction Management</span>
              <ArrowRight size={16} />
            </Link>
          </div>

          {/* Feature Highlight Cards - Showing what reports offer */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "16px",
              width: "100%",
              maxWidth: "960px",
              marginTop: "16px",
              textAlign: "left",
            }}
          >
            <div
              style={{
                backgroundColor: "#F8FAFC",
                border: "1px solid #E2E8F0",
                borderRadius: "12px",
                padding: "16px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <div style={{ padding: "6px", borderRadius: "6px", backgroundColor: "#DCFCE7", color: "#16A34A" }}>
                  <TrendingUp size={16} />
                </div>
                <h4 style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "#1E293B" }}>
                  Revenue & Sales Metrics
                </h4>
              </div>
              <p style={{ margin: 0, fontSize: "12px", color: "#64748B", lineHeight: "1.4" }}>
                Track gross revenue, confirmed bookings count, and average transaction values per attraction.
              </p>
            </div>

            <div
              style={{
                backgroundColor: "#F8FAFC",
                border: "1px solid #E2E8F0",
                borderRadius: "12px",
                padding: "16px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <div style={{ padding: "6px", borderRadius: "6px", backgroundColor: "#E0F2FE", color: "#0284C7" }}>
                  <Ticket size={16} />
                </div>
                <h4 style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "#1E293B" }}>
                  Ticket Tier Breakdown
                </h4>
              </div>
              <p style={{ margin: 0, fontSize: "12px", color: "#64748B", lineHeight: "1.4" }}>
                Analyze tickets volume for Adults, Children, Students, Senior Citizens, and Foreign visitors.
              </p>
            </div>

            <div
              style={{
                backgroundColor: "#F8FAFC",
                border: "1px solid #E2E8F0",
                borderRadius: "12px",
                padding: "16px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <div style={{ padding: "6px", borderRadius: "6px", backgroundColor: "#F3E8FF", color: "#8B5CF6" }}>
                  <CreditCard size={16} />
                </div>
                <h4 style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "#1E293B" }}>
                  Payment Mode Distribution
                </h4>
              </div>
              <p style={{ margin: 0, fontSize: "12px", color: "#64748B", lineHeight: "1.4" }}>
                Compare collection streams across UPI, Cash counter, Card, and Online payment methods.
              </p>
            </div>

            <div
              style={{
                backgroundColor: "#F8FAFC",
                border: "1px solid #E2E8F0",
                borderRadius: "12px",
                padding: "16px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <div style={{ padding: "6px", borderRadius: "6px", backgroundColor: "#FEF3C7", color: "#D97706" }}>
                  <FileSpreadsheet size={16} />
                </div>
                <h4 style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "#1E293B" }}>
                  Export-Ready Excel & PDF
                </h4>
              </div>
              <p style={{ margin: 0, fontSize: "12px", color: "#64748B", lineHeight: "1.4" }}>
                Download audit-ready multi-section XLS reports filtered by customized date ranges.
              </p>
            </div>
          </div>
        </div>
      ) : singleAttractionReport ? (
        /* RENDER VIEW: Single Attraction Report Drill-Down */
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
                  cursor: overallSummary.attractionReports.length === 0 ? "not-allowed" : "pointer",
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
                  cursor: overallSummary.attractionReports.length === 0 ? "not-allowed" : "pointer",
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
            {overallSummary.attractionReports.length === 0 ? (
              <div
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: "14px",
                  border: "1px solid #E2E8F0",
                  padding: "48px 24px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  gap: "12px",
                }}
              >
                <SearchX size={32} color="#94A3B8" />
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#1E293B" }}>
                  No Report Data Available
                </h3>
                <p style={{ margin: 0, fontSize: "13px", color: "#64748B" }}>
                  No sales or revenue records found for the selected date range.
                </p>
              </div>
            ) : (
              overallSummary.attractionReports.map((report) => (
                <AttractionReportCard
                  key={report.attraction.id}
                  report={report}
                  isExpanded={expandedAttractionIds.has(report.attraction.id)}
                  onToggleExpand={() => handleToggleCardExpand(report.attraction.id)}
                  onSelectSingle={(name) => setSelectedAttraction(name)}
                  fromDate={fromDate}
                  toDate={toDate}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
