"use client";

import React, { useRef } from "react";
import { Check, Printer, Loader2 } from "lucide-react";
import { useModalBodyLock } from "@/hooks/useModalBodyLock";
import axiosInstance from "@/lib/api/axiosConfig";
import { showToast } from "@/components/ui/Toast";

export interface StaffTicketData {
  booking: {
    id: string;
    invoiceNumber: string;
    customerName: string;
    mobileNumber: string;
    paymentMode: string;
    totalAmount: number;
    amountReceived?: number;
    returnAmount?: number;
    subtotal: number;
    gstAmount: number;
    roundOff: number;
    attractionRoundOffGstAdj: number;
    createdAt: string;
  };
  business: {
    businessName: string;
    gst: string;
    cin: string;
  };
  bookingSummary: Array<{
    attractionId?: string;
    attractionName?: string;
    subtotal?: number;
    gst?: number;
    roundoff?: number;
    attractionRoundOffGstAdj?: number;
    passengers: Array<{
      categoryId?: string;
      label: string;
      qty: number;
      unitPrice?: number;
      price?: number;
    }>;
  }>;
  qrCodes?: Array<{
    attractionId?: string;
    attractionName?: string;
    qrCode: string;
  }>;
  seatDetails?: Array<{
    attractionId?: string;
    attractionName?: string;
    tripNo?: number;
    sections: Array<{
      name: string;
      seats: number[];
    }>;
  }>;
}

interface StaffTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLoading?: boolean;
  ticketData?: StaffTicketData | null;
}

// ── QZ Tray-first Receipt Printer ──
async function printReceiptViaIframe(elementId: string, onDone?: () => void) {
  if (typeof window === "undefined") return;
  const element = document.getElementById(elementId);
  if (!element) {
    onDone?.();
    return;
  }

  const innerHtml = element.innerHTML;

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
    // QZ Tray not available, fallback to iframe
  }

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
        <title>Ticket Bill</title>
        <meta charset="utf-8" />
        <style>
          @page { size: 80mm auto; margin: 0 !important; }
          html {
            margin: 0 !important;
            padding: 0 !important;
            height: fit-content;
            min-height: unset;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Nirmala UI', Arial, 'Courier New', Courier, monospace;
            color: #000000;
            background: #FFFFFF;
            width: 70mm;
            max-width: 70mm;
            margin: 0 auto !important;
            padding: 0 4.5mm !important;
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            font-weight: 600;
            font-size: 11.5px;
            line-height: 1.35;
            height: fit-content;
            min-height: unset;
            display: block;
            overflow: hidden;
          }
          table { width: 100%; border-collapse: collapse; table-layout: fixed; }
          img { max-width: 100%; height: auto; display: block; margin: 0 auto; }
          .ticket-tax-meta, .ticket-tax-meta div, .ticket-tax-meta span { font-size: 8px !important; white-space: nowrap !important; letter-spacing: 0 !important; }
          .ticket-phone-line { font-size: 7.5px !important; white-space: nowrap !important; letter-spacing: -0.01em !important; display: block !important; }
          .print-seat-allocation, .print-seat-allocation div, .print-seat-allocation span, .print-seat-allocation table, .print-seat-allocation td { font-size: 8px !important; }
          .print-seat-table { table-layout: auto !important; width: 100% !important; border-collapse: collapse !important; }
          .print-station-route, .print-station-route div, .print-station-route span { font-size: 8.5px !important; line-height: 1.25 !important; }
          .print-invoice-meta, .print-invoice-meta div, .print-invoice-meta span { font-size: 9.5px !important; }
          .print-items-table, .print-items-table table, .print-items-table th, .print-items-table td, .print-items-table td div:first-child { font-size: 8.5px !important; }
          .print-items-table th { padding-bottom: 2px !important; }
          .print-items-table td { padding-top: 2px !important; padding-bottom: 1px !important; }
          .print-items-table td div:last-child { font-size: 7.5px !important; margin-top: 0px !important; }
          .print-tax-breakdown { font-size: 8.5px !important; padding: 4px 0 !important; }
          .print-tax-breakdown div, .print-tax-breakdown span { font-size: 8.5px !important; margin-bottom: 1px !important; }
          .print-tax-breakdown div:last-child, .print-tax-breakdown div:last-child span { font-size: 9.5px !important; font-weight: 800 !important; padding-top: 3px !important; margin-top: 2px !important; }
          .print-notes-section { font-size: 8.5px !important; padding: 4px 0 !important; }
          .print-notes-section > div:first-child { font-size: 9px !important; margin-bottom: 2px !important; }
          .print-notes-section > div:last-child { gap: 1.5px !important; }
          .print-notes-section > div:last-child div { font-size: 8px !important; line-height: 1.25 !important; }
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

  let hasTriggered = false;
  let fallbackTimer: ReturnType<typeof setTimeout> | null = null;

  const triggerPrint = () => {
    if (hasTriggered) return;
    hasTriggered = true;
    if (fallbackTimer) clearTimeout(fallbackTimer);
    try {
      if (iframe.contentWindow) {
        iframe.contentWindow.onafterprint = () => finish();
      }
      window.addEventListener("afterprint", () => finish(), { once: true });
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (err) {
      console.error("Iframe print error:", err);
      finish();
    }
  };

  iframe.onload = () => triggerPrint();
  fallbackTimer = setTimeout(triggerPrint, 400);
}

export default function StaffTicketModal({
  isOpen,
  onClose,
  isLoading = false,
  ticketData,
}: StaffTicketModalProps) {
  useModalBodyLock(isOpen);
  const isPrintingRef = useRef(false);

  if (!isOpen) return null;

  const booking = ticketData?.booking;
  const business = ticketData?.business;
  const bookingSummary = ticketData?.bookingSummary || [];
  const qrCodes = ticketData?.qrCodes || [];
  const seatDetails = ticketData?.seatDetails || [];

  const displayCin = typeof business?.cin === "string" ? business.cin.trim() : "";
  const displayGst = typeof business?.gst === "string" ? business.gst.trim() : "";
  const businessName = typeof business?.businessName === "string" ? business.businessName.trim() : "";

  // Title: combination of attraction names from booking summary, or business name
  const attractionNames = bookingSummary
    .map((b) => b.attractionName?.trim())
    .filter(Boolean);
  const attractionTitle = attractionNames.length > 0 ? attractionNames.join(", ") : businessName || "-";

  // Phone number fallback logic:
  // If mobileNumber is "-", null, undefined, or empty, use fallback. Otherwise use booking's mobileNumber.
  const rawMobile = booking?.mobileNumber;
  const hasCustomMobile = rawMobile && String(rawMobile).trim() !== "" && String(rawMobile).trim() !== "-";
  const displayPhone = hasCustomMobile
    ? `Mobile No.: ${String(rawMobile).trim()}`
    : "Mobile No.: 73000-95-806,73000-95-807,73000-95-808";

  const rawDate = booking?.createdAt;
  const dateObj = rawDate ? new Date(rawDate) : null;
  const formattedDate = dateObj && !isNaN(dateObj.getTime())
    ? dateObj.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
    : "-";

  const formattedTime = dateObj && !isNaN(dateObj.getTime())
    ? dateObj.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
    : "-";

  const finalTotal = Number(booking?.totalAmount || 0);
  const calculatedSubtotal = Number(booking?.subtotal || 0);
  const calculatedGst = Number(booking?.gstAmount || 0);
  const halfGst = Number((calculatedGst / 2).toFixed(2));
  const calculatedattractionRoundOffGstAdj = Number(booking?.attractionRoundOffGstAdj || 0);
  const calculatedRoundOff = Number(booking?.roundOff || 0);

  // Total pax count across passengers
  const totalPax = bookingSummary.reduce(
    (sum, b) => sum + b.passengers.reduce((pSum, p) => pSum + (p.qty || 0), 0),
    0
  );

  // Build items list
  const itemsList = bookingSummary
    .flatMap((b) =>
      b.passengers
        .filter((p) => p.qty > 0)
        .map((p) => ({
          name: bookingSummary.length > 1 ? `${b.attractionName ? `${b.attractionName} - ` : ""}${p.label}` : (p.label || "-"),
          qty: p.qty,
          amount: Number((((p.unitPrice || p.price || (calculatedSubtotal / (totalPax || 1)))) * p.qty).toFixed(2)),
        }))
    )
    .map((item, idx) => ({
      ...item,
      sNo: idx + 1,
    }));

  const handlePrint = () => {
    if (booking?.id) {
      axiosInstance
        .post("/admin/ticketing-booking/print-log", {
          bookingId: booking.id,
        })
        .catch((err: any) => {
          console.error("Failed to record print log", err);
        });
    }

    if (isPrintingRef.current) return;
    isPrintingRef.current = true;
    printReceiptViaIframe("printable-staff-ticket-receipt", () => {
      isPrintingRef.current = false;
    });
  };

  return (
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
        {/* Modal Header */}
        <div style={{ textAlign: "center", marginBottom: "12px", flexShrink: 0 }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              border: "2.5px solid #1FA35A",
              background: "#E8F8EE",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 6px auto",
            }}
          >
            <Check size={20} color="#1FA35A" strokeWidth={3.5} />
          </div>
          <h2
            style={{
              margin: 0,
              fontWeight: 800,
              fontSize: "20px",
              lineHeight: "24px",
              color: "#011B2F",
            }}
          >
            Ticket Generated
          </h2>
        </div>

        {/* Scrollable Receipt Area */}
        <div
          style={{
            overflowY: "auto",
            paddingRight: "2px",
            marginBottom: "14px",
            flexGrow: 1,
          }}
        >
          {isLoading ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "280px",
                gap: "12px",
              }}
            >
              <Loader2 size={36} color="#2372A5" className="animate-spin" />
              <span style={{ fontSize: "14px", fontWeight: 600, color: "#475569" }}>
                Loading ticket details...
              </span>
            </div>
          ) : !booking ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "#64748B", fontSize: "14px" }}>
              Ticket details not found.
            </div>
          ) : (
            <div
              id="printable-staff-ticket-receipt"
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
              {/* Header: Attraction Name + Business Name + CIN & GST */}
              <div style={{ textAlign: "center", borderBottom: (!seatDetails || seatDetails.length === 0) ? "1px dashed #000000" : "none", paddingBottom: (!seatDetails || seatDetails.length === 0) ? "10px" : "4px" }}>
                <h3
                  style={{
                    margin: "0 0 2px 0",
                    fontWeight: 700,
                    fontSize: "14px",
                    color: "#000000",
                    letterSpacing: "0.03em",
                    textTransform: "uppercase",
                    fontFamily: "'Plus Jakarta Sans', Arial, sans-serif",
                    lineHeight: "1.2",
                  }}
                >
                  {attractionTitle}
                </h3>

                {Boolean(businessName) && (
                  <div
                    style={{
                      fontSize: "12.5px",
                      fontWeight: 800,
                      color: "#000000",
                      margin: "2px 0 4px 0",
                      letterSpacing: "0.02em",
                      textTransform: "uppercase",
                      fontFamily: "'Plus Jakarta Sans', Arial, sans-serif",
                    }}
                  >
                    {businessName}
                  </div>
                )}

                {(displayCin || displayGst || displayPhone) && (
                  <div
                    className="ticket-tax-meta"
                    style={{
                      margin: "3px 0 2px 0",
                      fontSize: "11.5px",
                      fontWeight: 800,
                      lineHeight: "1.4",
                      color: "#000000",
                      fontFamily: "'Courier New', Courier, monospace",
                      letterSpacing: "0.02em",
                    }}
                  >
                    <div>
                      {[displayCin ? `CIN: ${displayCin}` : "", displayGst ? `GST: ${displayGst}` : ""].filter(Boolean).join(" , ")}
                    </div>
                    <div
                      className="ticket-phone-line"
                      style={{ whiteSpace: "nowrap" }}
                    >
                      {displayPhone}
                    </div>
                  </div>
                )}

                <div
                  className="print-station-route"
                  style={{
                    marginTop: "6px",
                    paddingTop: "5px",
                    paddingBottom: "5px",
                    borderTop: "1px dashed #000000",
                    // borderBottom: "1px dashed #000000",
                    fontSize: "11px",
                    lineHeight: "1.4",
                    fontWeight: 800,
                    color: "#000000",
                    textAlign: "center",
                  }}
                >
                  <div>
                    स्टेशन: 1-2{" "}
                    <span
                      style={{
                        display: "inline-block",
                        width: "9px",
                        height: "9px",
                        border: "1.5px solid #000000",
                        margin: "0 3px 1px 3px",
                        verticalAlign: "middle",
                      }}
                    />{" "}
                    समोर बाग से कमल तलाई तक
                  </div>
                  <div>विराम</div>
                  <div>
                    स्टेशन: 2-1{" "}
                    <span
                      style={{
                        display: "inline-block",
                        width: "9px",
                        height: "9px",
                        border: "1.5px solid #000000",
                        margin: "0 3px 1px 3px",
                        verticalAlign: "middle",
                      }}
                    />{" "}
                    कमल तलाई से समोर बाग तक
                  </div>
                </div>

                {/* Seat Allocation Info */}
                {seatDetails && seatDetails.length > 0 && (
                  <div
                    className="print-seat-allocation"
                    style={{
                      marginTop: "8px",
                      paddingTop: "7px",
                      borderTop: "1px dashed #000000",
                      textAlign: "left",
                      fontSize: "11px",
                      fontWeight: 800,
                      color: "#000000",
                      fontFamily: "'Plus Jakarta Sans', Arial, sans-serif",
                    }}
                  >
                    <table
                      className="print-seat-table"
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        tableLayout: "auto",
                        marginTop: "2px",
                        marginBottom: "2px",
                      }}
                    >
                      <tbody>
                        {seatDetails.map((att, i) => {
                          const roundNo = att.tripNo || 1;
                          const hasMultipleAttractions = seatDetails.length > 1;
                          const attractionName = att.attractionName || attractionTitle || "";

                          return (
                            <tr key={att.attractionId || i}>
                              <td
                                style={{
                                  whiteSpace: "nowrap",
                                  paddingRight: "6px",
                                  paddingTop: i > 0 ? "5px" : "1px",
                                  paddingBottom: i < seatDetails.length - 1 ? "5px" : "1px",
                                  borderRight: "1px solid #000000",
                                  borderBottom: i < seatDetails.length - 1 ? "1px solid #000000" : "none",
                                  verticalAlign: "middle",
                                  fontWeight: 800,
                                  fontSize: "11px",
                                  textAlign: "left",
                                  lineHeight: "1.3",
                                }}
                              >
                                {hasMultipleAttractions && attractionName && (
                                  <div
                                    style={{
                                      textTransform: "uppercase",
                                      letterSpacing: "0.03em",
                                      marginBottom: "2px",
                                      fontWeight: 800,
                                      fontSize: "11px",
                                    }}
                                  >
                                    {attractionName}
                                  </div>
                                )}
                                <div>Round No.(राउंड नं.) : {roundNo}</div>
                              </td>
                              <td
                                style={{
                                  paddingLeft: "6px",
                                  paddingTop: i > 0 ? "5px" : "1px",
                                  paddingBottom: i < seatDetails.length - 1 ? "5px" : "1px",
                                  borderBottom: i < seatDetails.length - 1 ? "1px solid #000000" : "none",
                                  verticalAlign: "middle",
                                  textAlign: "left",
                                  fontWeight: 800,
                                  fontSize: "11px",
                                  wordBreak: "break-word",
                                  overflowWrap: "break-word",
                                  lineHeight: "1.3",
                                }}
                              >
                                {att.sections?.map((sec, secIdx) => (
                                  <div
                                    key={sec.name}
                                    style={{
                                      marginBottom: secIdx < (att.sections?.length || 0) - 1 ? "2px" : 0,
                                    }}
                                  >
                                    {sec.name} : Seat  : - {sec.seats.join(", ")}
                                  </div>
                                ))}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {/* Station Route Info */}

                  </div>
                )}
              </div>

              {/* Invoice & Customer Meta */}
              <div
                className="print-invoice-meta"
                style={{
                  padding: "8px 0",
                  borderBottom: "1px dashed #000000",
                  borderTop: "1px dashed #000000",
                  fontSize: "11.5px",
                  fontWeight: 400,
                  color: "#000000",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                  <span>
                    <strong>Invoice:</strong> {booking.invoiceNumber || "-"}
                  </span>
                  <span>
                    <strong>Bill To:</strong> {booking.customerName || "Guest"}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>
                    <strong>Date:</strong> {formattedDate}
                  </span>
                  <span>
                    <strong>Time:</strong> {formattedTime}
                  </span>
                </div>
              </div>

              {/* Items Table */}
              <div
                className="print-items-table"
                style={{ padding: "8px 0", borderBottom: "1px dashed #000000" }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "11.5px",
                    color: "#000000",
                  }}
                >
                  <thead>
                    <tr style={{ borderBottom: "1.5px solid #000000", textAlign: "left", fontWeight: 400 }}>
                      <th style={{ paddingBottom: "4px", width: "12%", fontWeight: 400 }}>S.No.</th>
                      <th style={{ paddingBottom: "4px", width: "50%", fontWeight: 400 }}>Items/SAC</th>
                      <th style={{ paddingBottom: "4px", width: "15%", textAlign: "center", fontWeight: 400 }}>Qty</th>
                      <th style={{ paddingBottom: "4px", width: "23%", textAlign: "right", fontWeight: 400 }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemsList.length > 0 ? (
                      itemsList.map((item, idx) => (
                        <tr key={idx} style={{ fontWeight: 400 }}>
                          <td style={{ paddingTop: "5px", verticalAlign: "top" }}>{item.sNo}</td>
                          <td style={{ paddingTop: "5px", verticalAlign: "top" }}>
                            <div>{item.name}</div>
                            <div style={{ fontSize: "10px", color: "#000000", fontWeight: 400, marginTop: "1px" }}>
                              SAC: 996411
                            </div>
                          </td>
                          <td style={{ paddingTop: "5px", textAlign: "center", verticalAlign: "top" }}>{item.qty}</td>
                          <td style={{ paddingTop: "5px", textAlign: "right", verticalAlign: "top" }}>
                            ₹{item.amount.toFixed(2)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr style={{ fontWeight: 400 }}>
                        <td style={{ paddingTop: "5px", verticalAlign: "top" }}>1</td>
                        <td style={{ paddingTop: "5px", verticalAlign: "top" }}>
                          <div>{attractionTitle}</div>
                          <div style={{ fontSize: "10px", color: "#000000", fontWeight: 400, marginTop: "1px" }}>
                            SAC: 996411
                          </div>
                        </td>
                        <td style={{ paddingTop: "5px", textAlign: "center", verticalAlign: "top" }}>1</td>
                        <td style={{ paddingTop: "5px", textAlign: "right", verticalAlign: "top" }}>
                          ₹{calculatedSubtotal.toFixed(2)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Tax and Adjustment Breakdown */}
              <div
                className="print-tax-breakdown"
                style={{
                  padding: "8px 0",
                  borderBottom: "1px dashed #000000",
                  fontSize: "11.5px",
                  fontWeight: 400,
                  color: "#000000",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                  <span>Sub-Total</span>
                  <span>₹{calculatedSubtotal.toFixed(2)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                  <span>SGST (9%)</span>
                  <span>₹{halfGst.toFixed(2)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                  <span>CGST (9%)</span>
                  <span>₹{halfGst.toFixed(2)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                  <span>GST Round Off</span>
                  <span>
                    {calculatedattractionRoundOffGstAdj > 0
                      ? `+₹${calculatedattractionRoundOffGstAdj.toFixed(2)}`
                      : calculatedattractionRoundOffGstAdj < 0
                        ? `-₹${Math.abs(calculatedattractionRoundOffGstAdj).toFixed(2)}`
                        : `₹0.00`}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span>Round Off</span>
                  <span>
                    {calculatedRoundOff >= 0
                      ? `+₹${calculatedRoundOff.toFixed(2)}`
                      : `-₹${Math.abs(calculatedRoundOff).toFixed(2)}`}
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "12px",
                    fontWeight: 800,
                    borderTop: "1.5px solid #000000",
                    paddingTop: "6px",
                    marginTop: "4px",
                  }}
                >
                  <span style={{ fontWeight: 800 }}>Amount Payable (₹)</span>
                  <span style={{ fontWeight: 800 }}>₹{finalTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Notes / Instructions Section */}
              <div
                className="print-notes-section"
                style={{
                  width: "100%",
                  textAlign: "left",
                  fontSize: "11.5px",
                  lineHeight: "1.4",
                  color: "#000000",
                  padding: "8px 0",
                  borderBottom: "1px dashed #000000",
                  boxSizing: "border-box",
                  wordBreak: "break-word",
                  fontFamily: "'Plus Jakarta Sans', Arial, sans-serif",
                }}
              >
                <div style={{ fontWeight: 900, fontSize: "11.5px", marginBottom: "4px" }}>NOTE:</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "3px", width: "100%", fontWeight: 400 }}>
                  <div style={{ width: "100%" }}>1. कम से कम 50 सवारी होने पर ही ट्रेन रवाना होगी</div>
                  <div style={{ width: "100%" }}>2. कृपया किसी भी स्थिति में ट्रेन से शरीर का कोई भी अंग बाहर ना निकालें।</div>
                  <div style={{ width: "100%" }}>3. यात्री अपने सामान की सुरक्षा स्वयं करें।</div>
                  <div style={{ width: "100%" }}>4. टिकट लेने के पश्चात् कोई रिफंड नहीं किया जायेगा।</div>
                  <div style={{ width: "100%" }}>5. नाव में खड़ा होना और पानी में हाथ डालना प्रतिबंधित है।</div>
                  <div style={{ width: "100%" }}>6. पानी में कोई भी वस्तु फेंकना मना है।</div>
                  <div style={{ width: "100%" }}>7. यात्री द्वार प्रोजेक्ट का किसी भी प्रकर का नुकसान करने पर यात्री से नुकसान की भरपाई करवाई जाएगी।</div>
                  <div style={{ width: "100%" }}>8. नौकायन के दौरान लाइफ जैकेट पहना अनिवार्य है।</div>
                  <div style={{ width: "100%" }}>9. नाव में खाना-पीना वर्जित है।</div>
                  <div style={{ width: "100%" }}>10. सभी मामले केवल उदयपुर न्याय क्षेत्र में मान्य होंगे।</div>
                  <div style={{ width: "100%" }}>11. प्रवेश का अधिकार प्रबंधन के पास सुरक्षित है (नगर निगम द्वारा स्वीकृत)</div>
                </div>
              </div>

              {/* QR Codes Section */}
              {qrCodes && qrCodes.length > 0 && (
                <div
                  style={{
                    width: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    padding: "10px 0 8px 0",
                    borderBottom: "1px dashed #000000",
                    boxSizing: "border-box",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      justifyContent: "center",
                      alignItems: "flex-start",
                      gap: "12px",
                      width: "100%",
                    }}
                  >
                    {qrCodes.map((qrItem, idx) => {
                      const qrSize = qrCodes.length === 1 ? "85px" : "75px";

                      return (
                        <div
                          key={idx}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            width: qrCodes.length === 1 ? "100%" : "calc(50% - 8px)",
                            maxWidth: qrCodes.length === 1 ? "140px" : "130px",
                            boxSizing: "border-box",
                          }}
                        >
                          <img
                            src={qrItem.qrCode}
                            alt="Ticket QR Code"
                            style={{
                              width: qrSize,
                              height: qrSize,
                              objectFit: "contain",
                              background: "#FFFFFF",
                              display: "block",
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Terms / Notice */}
              <div
                style={{
                  marginTop: "6px",
                  paddingTop: "4px",
                  fontSize: "11px",
                  color: "#000000",
                  lineHeight: "1.4",
                  textAlign: "center",
                  fontWeight: 700,
                }}
              >
                <div style={{ fontSize: "10px", fontWeight: 600, marginBottom: "2px" }}>
                  THANKS FOR VISIT
                </div>
                <div style={{ fontWeight: 900, letterSpacing: "0.04em" }}>
                  Instagram: @toy_train_udaipur
                </div>
                <div style={{ fontSize: "10px", fontWeight: 600 }}>
                  Please present this QR code at the entrance gate. Keep this ticket safe.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {!isLoading && Boolean(booking) && (
          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexShrink: 0 }}>
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
              <Printer size={18} color="#002A45" /> Print Ticket
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
        )}
      </div>

      {/* Print stylesheet for thermal / receipt printout */}
      <style jsx global>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 0 !important;
          }
          body * {
            visibility: hidden !important;
          }
          #printable-staff-ticket-receipt,
          #printable-staff-ticket-receipt * {
            visibility: visible !important;
          }
          #printable-staff-ticket-receipt {
            position: fixed !important;
            left: 0 !important;
            right: 0 !important;
            top: 0 !important;
            width: 70mm !important;
            max-width: 70mm !important;
            margin: 0 auto !important;
            padding: 0 4.5mm !important;
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
    </div>
  );
}
