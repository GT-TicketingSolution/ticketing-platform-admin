"use client";

import React from "react";
import { createPortal } from "react-dom";
import { Printer, Receipt } from "lucide-react";
import { AttractionReportData, OverallReportSummary } from "@/lib/reportsData";
import { useProfileQuery } from "@/hooks/useAuthQueries";

interface DailySalesReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  attractionReport?: AttractionReportData | null;
  overallSummary?: OverallReportSummary | null;
  fromDate: string;
  toDate: string;
  fromTime?: string;
  toTime?: string;
}

const emptySubscribe = () => () => { };

/**
 * Print isolated receipt via iframe (matching Ticket Booking module)
 * Guarantees 1 single page on 80mm thermal receipt with 70mm content width and correct margins
 */
async function printReceiptViaIframe(elementId: string, onDone?: () => void) {
  if (typeof window === "undefined") return;
  const element = document.getElementById(elementId);
  if (!element) {
    onDone?.();
    return;
  }

  const innerHtml = element.innerHTML;

  // ── Try QZ Tray first (silent, no dialog) with a fast timeout ──
  try {
    const qzResult = await Promise.race([
      import("@/lib/qzPrint").then(({ printViaQZ }) => printViaQZ(innerHtml)),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 500)),
    ]);
    if (qzResult) {
      onDone?.();
      return;
    }
  } catch (_) {
    // QZ Tray not available, fall through to iframe
  }

  // ── Fallback: iframe print (browser dialog will appear) ──
  const oldIframe = document.getElementById("print-receipt-iframe");
  if (oldIframe) oldIframe.remove();

  const iframe = document.createElement("iframe");
  iframe.id = "print-receipt-iframe";
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";
  iframe.style.visibility = "hidden";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!doc) {
    onDone?.();
    return;
  }

  doc.open();
  doc.write(`<!DOCTYPE html>
    <html>
      <head>
        <title>Daily Sales Report</title>
        <meta charset="utf-8" />
        <style>
          @page { size: 80mm auto; margin: 0; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Courier New', Courier, monospace;
            color: #000000;
            background: #FFFFFF;
            width: 70mm;
            max-width: 70mm;
            margin: 0 auto;
            padding: 3mm 4.5mm;
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            font-weight: 600;
            font-size: 11.5px;
            line-height: 1.35;
          }
          table { width: 100%; border-collapse: collapse; table-layout: fixed; }
          img { max-width: 100%; height: auto; display: block; margin: 0 auto; }
        </style>
      </head>
      <body>${innerHtml}</body>
    </html>`);
  doc.close();

  let hasDone = false;
  const finish = () => {
    if (!hasDone) {
      hasDone = true;
      onDone?.();
    }
  };

  const triggerPrint = () => {
    try {
      if (iframe.contentWindow) {
        iframe.contentWindow.onafterprint = () => finish();
      }
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(finish, 600);
    } catch (err) {
      console.error("Iframe print error:", err);
      finish();
    }
  };

  const imgs = Array.from(iframe.contentDocument?.querySelectorAll("img") || []);
  if (imgs.length === 0 || imgs.every((img) => img.complete)) {
    setTimeout(triggerPrint, 50);
  } else {
    let loaded = 0;
    const onLoad = () => {
      loaded++;
      if (loaded >= imgs.length) triggerPrint();
    };
    imgs.forEach((img) => {
      img.onload = onLoad;
      img.onerror = onLoad;
    });
    setTimeout(triggerPrint, 1000);
  }
}

const getLiveFormattedTimestamp = () => {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = now.getFullYear();
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
};

export default function DailySalesReportModal({
  isOpen,
  onClose,
  attractionReport,
  overallSummary,
  fromDate,
  toDate,
  fromTime = "00:00",
  toTime = "23:59",
}: DailySalesReportModalProps) {
  const isMounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const { data: profileData } = useProfileQuery();
  const businessName = profileData?.profile?.businessName || "";
  const invoicePrefix = profileData?.profile?.invoiceNumberForUsersInitialPart || "2026-2027";

  // Format date helper: "YYYY-MM-DD" -> "DD/MM/YYYY"
  const formatDateSlash = (dStr: string) => {
    if (!dStr) {
      const now = new Date();
      return `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
    }
    const [y, m, d] = dStr.split("-");
    if (!y || !m || !d) return dStr;
    return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
  };

  // Live print timestamp generated on render and refreshed on click
  const [printTimestamp, setPrintTimestamp] = React.useState(getLiveFormattedTimestamp);

  // Keep timestamp live while modal is open
  React.useEffect(() => {
    if (!isOpen) return;
    setPrintTimestamp(getLiveFormattedTimestamp());
    // Update every minute since seconds are not shown
    const timer = setInterval(() => {
      setPrintTimestamp(getLiveFormattedTimestamp());
    }, 60000);
    return () => clearInterval(timer);
  }, [isOpen]);

  // Format 24h time to 12h with AM/PM
  const formatTime12 = (time24?: string) => {
    if (!time24) return "";
    const [hStr, mStr] = time24.split(":");
    let h = parseInt(hStr, 10);
    if (isNaN(h)) return time24;
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12;
    if (h === 0) h = 12;
    return `${String(h).padStart(2, "0")}:${mStr || "00"} ${ampm}`;
  };

  if (!isOpen || !isMounted) return null;

  // Attraction Title
  const attractionDisplayName = attractionReport
    ? attractionReport.attraction.name
    : "ALL ATTRACTIONS (OVERALL REPORT)";

  // Overall or Attraction totals
  const totalRevenue = attractionReport
    ? attractionReport.totalRevenue
    : overallSummary
      ? overallSummary.totalRevenue
      : 0;

  const totalBookings = attractionReport
    ? (attractionReport.totalBookings ?? attractionReport.transactions.length)
    : overallSummary
      ? overallSummary.totalBookings
      : 0;

  // Real Invoice Range from API response - NO MOCK DATA OR FALLBACK DATA
  const activeInvoiceRange = attractionReport
    ? (attractionReport.invoiceRange || overallSummary?.overallInvoiceRange)
    : overallSummary?.overallInvoiceRange;

  let invoiceRangeDisplay = "-";
  if (activeInvoiceRange?.from && activeInvoiceRange?.to) {
    if (activeInvoiceRange.from === activeInvoiceRange.to) {
      invoiceRangeDisplay = activeInvoiceRange.from;
    } else {
      invoiceRangeDisplay = `${activeInvoiceRange.from} - ${activeInvoiceRange.to}`;
    }
  } else if (activeInvoiceRange?.from) {
    invoiceRangeDisplay = activeInvoiceRange.from;
  } else if (activeInvoiceRange?.to) {
    invoiceRangeDisplay = activeInvoiceRange.to;
  }

  const invoiceCountDisplay = totalBookings > 0 ? String(totalBookings) : "-";

  // Determine items list formatted strictly as Attraction/Category (e.g. Train/Adult, Train/Child, Boat/Adult, Boat/Child)
  let items: Array<{ name: string; qty: number; amount: number }> = [];

  if (attractionReport) {
    if (attractionReport.categoryBreakdown && attractionReport.categoryBreakdown.length > 0) {
      items = attractionReport.categoryBreakdown
        .filter((c) => c.count > 0 || c.revenue > 0)
        .map((cat) => ({
          name: `${attractionReport.attraction.name}/${cat.category}`,
          qty: cat.count || 1,
          amount: cat.revenue || 0,
        }));
    }
    if (items.length === 0 && attractionReport.totalTicketsSold > 0) {
      items = [
        {
          name: `${attractionReport.attraction.name}/Standard`,
          qty: attractionReport.totalTicketsSold,
          amount: attractionReport.totalRevenue,
        },
      ];
    }
  } else if (overallSummary && overallSummary.attractionReports.length > 0) {
    items = overallSummary.attractionReports.flatMap((ar) => {
      const activeCats = (ar.categoryBreakdown || []).filter((c) => c.count > 0 || c.revenue > 0);
      if (activeCats.length > 0) {
        return activeCats.map((cat) => ({
          name: `${ar.attraction.name}/${cat.category}`,
          qty: cat.count || 1,
          amount: cat.revenue || 0,
        }));
      }
      return [
        {
          name: `${ar.attraction.name}/Standard`,
          qty: ar.totalTicketsSold,
          amount: ar.totalRevenue,
        },
      ];
    });
  }

  // Hide rows with no sales (qty 0 and amount 0) — they add noise to the thermal receipt
  items = items.filter((it) => it.qty > 0 || it.amount > 0);

  // No fallback: only show real data from the API response.
  // If items is empty it means no sales occurred during the selected date range.

  // Calculations — only meaningful when there is actual revenue
  const hasData = items.length > 0;
  const calculatedItemsTotal = items.reduce((sum, it) => sum + it.amount, 0);
  const netSales = totalRevenue > 0 ? totalRevenue : calculatedItemsTotal;
  // Actual sub-total, GST, roundoff derived from real data only
  const baseSubTotal = hasData ? Math.round((netSales / 1.18) * 100) / 100 : 0;
  const roundOffSubTotalAdj = hasData ? Math.round(((netSales - baseSubTotal * 1.18)) * 100) / 100 : 0;
  const adjustedSubTotal = Math.round((baseSubTotal + roundOffSubTotalAdj) * 100) / 100;
  const totalGst = Math.round((baseSubTotal * 0.18) * 100) / 100;
  const roundOffGstAdj = hasData ? Math.round((netSales - adjustedSubTotal - totalGst) * 100) / 100 : 0;
  const effectiveGst = Math.round((totalGst + roundOffGstAdj) * 100) / 100;
  const totalRoundoff = Math.round((roundOffSubTotalAdj + roundOffGstAdj) * 100) / 100;

  // Date range display string — always formatted as DD/MM/YYYY - DD/MM/YYYY (even if same date)
  const startFormatted = formatDateSlash(fromDate);
  const endFormatted = formatDateSlash(toDate);
  const dateRangeDisplay = `${startFormatted} - ${endFormatted}`;

  const handlePrint = () => {
    const currentNow = getLiveFormattedTimestamp();
    setPrintTimestamp(currentNow);
    setTimeout(() => {
      printReceiptViaIframe("thermal-sales-receipt");
    }, 40);
  };

  return createPortal(
    <>
      {/* Print isolation stylesheet */}
      <style>{`
        @media screen {
          .ticket-modal-overlay {
            animation: ticketFadeIn 0.2s ease-out;
          }
          .ticket-modal-content {
            animation: ticketScaleIn 0.22s cubic-bezier(0.16, 1, 0.3, 1);
          }
        }
        @keyframes ticketFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes ticketScaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @media print {
          body * {
            visibility: hidden !important;
          }
          #thermal-sales-receipt,
          #thermal-sales-receipt * {
            visibility: visible !important;
          }
          #thermal-sales-receipt {
            position: fixed !important;
            left: 0 !important;
            right: 0 !important;
            top: 0 !important;
            width: 70mm !important;
            max-width: 70mm !important;
            margin: 0 auto !important;
            padding: 3mm 4.5mm !important;
            box-sizing: border-box !important;
            box-shadow: none !important;
            border: none !important;
            font-size: 11px !important;
            font-weight: 700 !important;
            color: #000000 !important;
          }
          .ticket-modal-overlay {
            background: transparent !important;
            position: static !important;
          }
          .ticket-modal-content {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            background: transparent !important;
          }
        }
      `}</style>

      {/* Backdrop */}
      <div
        className="ticket-modal-overlay"
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.65)",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px",
          backdropFilter: "blur(4px)",
          overflowY: "auto",
        }}
        onClick={onClose}
      >
        {/* Modal Content Card */}
        <div
          className="ticket-modal-content"
          style={{
            background: "#FFFFFF",
            borderRadius: "20px",
            width: "440px",
            maxWidth: "94vw",
            boxShadow: "0 24px 80px rgba(0,0,0,0.28)",
            fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            padding: "20px 16px",
            boxSizing: "border-box",
            position: "relative",
            maxHeight: "92vh",
            display: "flex",
            flexDirection: "column",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Scrollable Receipt Area */}
          <div
            style={{
              overflowY: "auto",
              paddingRight: "2px",
              marginBottom: "14px",
              flexGrow: 1,
            }}
          >
            {/* Printable Receipt Paper Box */}
            <div
              id="thermal-sales-receipt"
              style={{
                background: "#FFFFFF",
                border: "1.5px solid #000000",
                borderRadius: "10px",
                padding: "14px 18px",
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Courier New', Courier, monospace",
                color: "#000000",
                fontSize: "12px",
                lineHeight: "1.35",
                boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
                fontWeight: 700,
              }}
            >
              {/* Receipt Header: Icon, Daily Sales Report, and Business Name */}
              <div style={{ textAlign: "center", borderBottom: "1px dashed #000000", paddingBottom: "10px" }}>
                <div
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "50%",
                    border: "2px solid #002A45",
                    background: "#E0F2FE",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 6px auto",
                  }}
                >
                  <Receipt size={20} color="#002A45" strokeWidth={2.5} />
                </div>
                <h2
                  style={{
                    margin: 0,
                    fontWeight: 800,
                    fontSize: "19px",
                    lineHeight: "23px",
                    color: "#011B2F",
                  }}
                >
                  Daily Sales Report
                </h2>
                <div
                  style={{
                    marginTop: "4px",
                    fontSize: "13px",
                    fontWeight: 800,
                    color: "#0C2A42",
                    textTransform: "uppercase",
                    letterSpacing: "0.03em",
                  }}
                >
                  {businessName}
                </div>
              </div>

              {/* Attraction Subheader */}
              <div style={{ textAlign: "center", borderBottom: "1px dashed #000000", padding: "8px 0" }}>
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    color: "#000000",
                    letterSpacing: "0.02em",
                  }}
                >
                  {attractionDisplayName.toUpperCase()}
                </div>
              </div>

              {/* Date Range, Printed On, Invoice, Invoice Range */}
              <div
                style={{
                  padding: "8px 0",
                  borderBottom: "1px dashed #000000",
                  fontSize: "11px",
                  color: "#000000",
                  lineHeight: "1.45",
                  display: "grid",
                  gridTemplateColumns: "auto 1fr",
                  gap: "4px 10px",
                  alignItems: "baseline",
                }}
              >
                <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>Date Range:</span>
                <span style={{ fontWeight: 600, textAlign: "right", wordBreak: "break-word" }}>{dateRangeDisplay}</span>

                <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>Printed On:</span>
                <span style={{ fontWeight: 600, textAlign: "right", wordBreak: "break-word" }}>{printTimestamp}</span>

                {/* Specific Attraction: Hide Invoice and Invoice Range (code kept commented). Shown only for All Attractions (overall report). */}
                {/*
                <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>Invoice:</span>
                <span style={{ fontWeight: 600, textAlign: "right", wordBreak: "break-word" }}>{invoiceCountDisplay}</span>

                <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>Invoice Range:</span>
                <span style={{ fontWeight: 600, textAlign: "right", wordBreak: "break-word" }}>
                  {invoiceRangeDisplay}
                </span>
                */}
                {!attractionReport && (
                  <>
                    <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>Invoice:</span>
                    <span style={{ fontWeight: 600, textAlign: "right", wordBreak: "break-word" }}>{invoiceCountDisplay}</span>

                    <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>Invoice Range:</span>
                    <span style={{ fontWeight: 600, textAlign: "right", wordBreak: "break-word" }}>
                      {invoiceRangeDisplay}
                    </span>
                  </>
                )}
              </div>

              {/* Items Breakdown Table */}
              <div style={{ padding: "8px 0 6px 0", borderBottom: "1px dashed #000000" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", color: "#000000" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px dashed #000000", textAlign: "left" }}>
                      <th style={{ paddingBottom: "4px", fontWeight: 800 }}>Items</th>
                      <th style={{ paddingBottom: "4px", fontWeight: 800, textAlign: "center", width: "38px" }}>Qty</th>
                      <th style={{ paddingBottom: "4px", fontWeight: 800, textAlign: "right", width: "80px" }}>Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length > 0 ? (
                      items.map((item, idx) => (
                        <tr key={idx} style={{ fontWeight: 600 }}>
                          <td style={{ paddingTop: "5px", verticalAlign: "top", overflowWrap: "break-word", wordBreak: "normal" }}>
                            {item.name}
                          </td>
                          <td style={{ paddingTop: "5px", textAlign: "center", verticalAlign: "top" }}>
                            {item.qty}
                          </td>
                          <td style={{ paddingTop: "5px", textAlign: "right", verticalAlign: "top" }}>
                            {item.amount.toFixed(2)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={3}
                          style={{
                            paddingTop: "10px",
                            paddingBottom: "6px",
                            textAlign: "center",
                            color: "#666666",
                            fontWeight: 600,
                            fontSize: "11px",
                          }}
                        >
                          -
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Tax and Adjustment Breakdown — only when there is real revenue */}
              {hasData && (
                <div
                  style={{
                    padding: "8px 0",
                    borderBottom: "1px dashed #000000",
                    fontSize: "11.5px",
                    fontWeight: 600,
                    color: "#000000",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                    <span>Sub-Total</span>
                    <span>₹{baseSubTotal.toFixed(2)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                    <span>Round-off Sub-Total Adj</span>
                    <span>+₹{roundOffSubTotalAdj.toFixed(2)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px", fontWeight: 700 }}>
                    <span>Adjusted Sub-Total</span>
                    <span>₹{adjustedSubTotal.toFixed(2)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                    <span>Total GST</span>
                    <span>₹{totalGst.toFixed(2)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                    <span>Round-off GST Adj</span>
                    <span>+₹{roundOffGstAdj.toFixed(2)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px", fontWeight: 700 }}>
                    <span>Effective GST</span>
                    <span>₹{effectiveGst.toFixed(2)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                    <span>Total Roundoff</span>
                    <span>+₹{totalRoundoff.toFixed(2)}</span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "13px",
                      fontWeight: 900,
                      borderTop: "1.5px solid #000000",
                      paddingTop: "6px",
                      marginTop: "4px",
                    }}
                  >
                    <span>Net Sales</span>
                    <span>
                      ₹{netSales.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}

              {/* Net Sales = ₹0 when no data */}
              {!hasData && (
                <div
                  style={{
                    padding: "8px 0",
                    borderBottom: "1px dashed #000000",
                    fontSize: "13px",
                    fontWeight: 900,
                    color: "#000000",
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span>Net Sales</span>
                  <span>₹0.00</span>
                </div>
              )}

              {/* End of Report */}
              <div
                style={{
                  padding: "10px 0 2px 0",
                  fontSize: "11px",
                  color: "#000000",
                  textAlign: "center",
                  fontWeight: 800,
                  letterSpacing: "0.05em",
                }}
              >
                *** End of Report ***
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="no-print" style={{ display: "flex", gap: "10px", alignItems: "center", flexShrink: 0 }}>
            <button
              type="button"
              onClick={handlePrint}
              style={{
                flex: 1,
                height: "44px",
                background: "#FFFFFF",
                border: "1.5px solid #002A45",
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 700,
                fontSize: "14px",
                color: "#011B2F",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <Printer size={18} color="#002A45" /> Print Report
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                height: "44px",
                background: "#F4BC43",
                borderRadius: "10px",
                border: "none",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 800,
                fontSize: "14px",
                color: "#011B2F",
                cursor: "pointer",
                transition: "background 0.15s, transform 0.1s",
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

