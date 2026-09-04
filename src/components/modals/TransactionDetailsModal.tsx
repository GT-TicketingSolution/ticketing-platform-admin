"use client";

import React, { useEffect } from "react";
import { X, CreditCard, Download, Printer, CheckCircle2, XCircle, Clock, Tag, Users } from "lucide-react";
import { colors, typography } from "@/lib/theme";
import { TransactionListItem } from "@/hooks/useTransactionQueries";

interface TransactionDetailsModalProps {
  transaction: TransactionListItem | null;
  isOpen: boolean;
  onClose: () => void;
}

function formatDate(iso: string | undefined | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const day = String(d.getDate()).padStart(2, "0");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  const strHours = String(hours).padStart(2, "0");
  return `${day} ${month} ${year}, ${strHours}:${minutes} ${ampm}`;
}

// ── Build branded invoice HTML for Print & PDF ──────────────────────────────
function buildInvoiceHTML(item: TransactionListItem): string {
  const status = item.status;
  const upper = status?.toUpperCase();
  const isSuccess = upper === "SUCCESSFUL" || upper === "SUCCESS" || upper === "CONFIRMED";
  const isCancelled = upper === "CANCELLED" || upper === "FAILED";
  const statusBg = isSuccess ? "#D1FAE5" : isCancelled ? "#FEE2E2" : "#FFF8D9";
  const statusColor = isSuccess ? "#15803D" : isCancelled ? "#DC2626" : "#D97706";
  const statusText = isSuccess ? "Successful" : isCancelled ? "Cancelled" : status || "Pending";

  const invoiceNumber = item.invoiceNumber || "-";
  const dateTime = formatDate(item.dateTime || item.transactionDate);
  const customerName = item.customer?.name || "-";
  const mobileNumber = item.customer?.mobileNumber || "-";
  const gstNumber = item.customer?.gstNumber || "-";
  const paymentMode = item.paymentMode || "-";
  const grandTotal = Number(item.grandTotalAmount ?? item.amount ?? 0).toFixed(2);

  const attractions = item.attractions && item.attractions.length > 0 ? item.attractions : [];
  const categories = item.categories && item.categories.length > 0 ? item.categories : [];

  const attractionsRows = attractions
    .map(
      (a) => `
      <tr style="border-bottom: 1px solid #E5E7EB;">
        <td style="padding: 10px 8px; font-weight: 600; color: #0C2A42;">${a.name}</td>
        <td style="padding: 10px 8px; text-align: right; color: #374151;">₹${Number(a.attractionSubtotal ?? 0).toFixed(2)}</td>
        <td style="padding: 10px 8px; text-align: right; color: #374151;">₹${Number(a.attractionGst ?? 0).toFixed(2)}</td>
        <td style="padding: 10px 8px; text-align: right; font-weight: 700; color: #0C2A42;">₹${Number(a.attractionTotalAmount ?? 0).toFixed(2)}</td>
      </tr>
    `
    )
    .join("");

  const categoriesHTML =
    categories.length > 0
      ? `
      <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:16px;margin-bottom:18px;">
        <div style="font-size:12px;font-weight:800;color:#0C2A42;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #E2E8F0;padding-bottom:8px;margin-bottom:12px;">
          Visitors Breakdown
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;">
          ${categories
        .map(
          (c) =>
            `<span style="background:#EEF2F6;color:#0C2A42;padding:4px 10px;border-radius:6px;font-size:12px;font-weight:600;">${c.name}: <strong>${c.noOfSeats} seat${c.noOfSeats > 1 ? "s" : ""}</strong></span>`
        )
        .join(" ")}
        </div>
      </div>
    `
      : "";

  return `
    <div style="font-family:'Plus Jakarta Sans',Arial,sans-serif;padding:32px;color:#011B2F;background:#FFFFFF;max-width:680px;margin:auto;border-radius:16px;">
      <table style="width:100%;border-collapse:collapse;border-bottom:2px solid #F4BC43;padding-bottom:14px;margin-bottom:24px;">
        <tr>
          <td style="vertical-align:middle;padding-bottom:12px;">
            <div style="font-size:22px;font-weight:800;color:#0C2A42;letter-spacing:-0.02em;">TICKETING PLATFORM</div>
            <div style="font-size:12px;color:#6B7280;margin-top:2px;">Official Transaction Receipt</div>
          </td>
          <td style="text-align:right;vertical-align:middle;padding-bottom:12px;">
            <div style="display:inline-block;padding:5px 14px;border-radius:20px;font-weight:700;font-size:12px;background:${statusBg};color:${statusColor};">${statusText}</div>
            <div style="font-size:14px;margin-top:6px;font-weight:800;color:#0C2A42;">${invoiceNumber}</div>
          </td>
        </tr>
      </table>

      <!-- Customer & Invoice Info -->
      <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:18px;margin-bottom:18px;">
        <div style="font-size:12px;font-weight:800;color:#0C2A42;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #E2E8F0;padding-bottom:8px;margin-bottom:14px;">Transaction Information</div>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <tr>
            <td style="padding:6px 0;width:50%;">
              <span style="color:#64748B;font-size:11px;font-weight:600;display:block;">Invoice Number</span>
              <strong style="color:#0C2A42;font-size:13px;">${invoiceNumber}</strong>
            </td>
            <td style="padding:6px 0;width:50%;">
              <span style="color:#64748B;font-size:11px;font-weight:600;display:block;">Date & Time</span>
              <strong style="color:#0C2A42;font-size:13px;">${dateTime}</strong>
            </td>
          </tr>
          <tr>
            <td style="padding:6px 0;">
              <span style="color:#64748B;font-size:11px;font-weight:600;display:block;">Customer Name</span>
              <strong style="color:#0C2A42;font-size:13px;">${customerName}</strong>
            </td>
            <td style="padding:6px 0;">
              <span style="color:#64748B;font-size:11px;font-weight:600;display:block;">Mobile Number</span>
              <strong style="color:#0C2A42;font-size:13px;">${mobileNumber}</strong>
            </td>
          </tr>
          ${gstNumber && gstNumber !== "-"
      ? `<tr>
            <td colspan="2" style="padding:6px 0;">
              <span style="color:#64748B;font-size:11px;font-weight:600;display:block;">GST Number</span>
              <strong style="color:#0C2A42;font-size:13px;">${gstNumber}</strong>
            </td>
          </tr>`
      : ""
    }
        </table>
      </div>

      <!-- Attractions Breakdown -->
      ${attractions.length > 0
      ? `
        <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:18px;margin-bottom:18px;">
          <div style="font-size:12px;font-weight:800;color:#0C2A42;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #E2E8F0;padding-bottom:8px;margin-bottom:14px;">Attractions Breakdown</div>
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead>
              <tr style="border-bottom: 2px solid #CBD5E1; text-align: left; font-size: 11px; color: #64748B; text-transform: uppercase;">
                <th style="padding: 6px 8px;">Attraction</th>
                <th style="padding: 6px 8px; text-align: right;">Subtotal</th>
                <th style="padding: 6px 8px; text-align: right;">GST</th>
                <th style="padding: 6px 8px; text-align: right;">Total Amount</th>
              </tr>
            </thead>
            <tbody>
              ${attractionsRows}
            </tbody>
          </table>
        </div>
      `
      : ""
    }

      ${categoriesHTML}

      <!-- Payment Information -->
      <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:18px;margin-bottom:24px;">
        <div style="font-size:12px;font-weight:800;color:#0C2A42;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #E2E8F0;padding-bottom:8px;margin-bottom:14px;">Payment Summary</div>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <tr>
            <td style="padding:6px 0;width:33.3%;">
              <span style="color:#64748B;font-size:11px;font-weight:600;display:block;">Payment Mode</span>
              <strong style="color:#0C2A42;font-size:13px;">${paymentMode}</strong>
            </td>
            <td style="padding:6px 0;width:33.3%;">
              <span style="color:#64748B;font-size:11px;font-weight:600;display:block;">Grand Total</span>
              <strong style="color:#0C2A42;font-size:16px;">₹${grandTotal}</strong>
            </td>
            <td style="padding:6px 0;width:33.3%;">
              <span style="color:#64748B;font-size:11px;font-weight:600;display:block;">Status</span>
              <strong style="color:${statusColor};font-size:13px;">${statusText}</strong>
            </td>
          </tr>
        </table>
      </div>

      <div style="text-align:center;margin-top:24px;font-size:11px;color:#9CA3AF;">
        Thank you for your transaction. Please retain this receipt for your records.
      </div>
    </div>`;
}

// ── Download PDF via html2pdf.js (CDN) ───────────────────────────────────────
async function handleDownloadPDF(item: TransactionListItem) {
  if (!(window as any).html2pdf) {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load PDF library"));
      document.head.appendChild(script);
    });
  }

  const element = document.createElement("div");
  element.style.width = "680px";
  element.innerHTML = buildInvoiceHTML(item);
  document.body.appendChild(element);

  const cleanName = (item.invoiceNumber || item.transactionId || item.id).replace(/[/\\?%*:|"<>]/g, "_");
  await (window as any).html2pdf().set({
    margin: [10, 10, 10, 10],
    filename: `${cleanName}_Receipt.pdf`,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
  }).from(element).save();

  document.body.removeChild(element);
}

// ── Print via browser 
function handlePrintInvoice(item: TransactionListItem) {
  const win = window.open("", "_blank");
  if (!win) return;
  const invoiceNumber = item.invoiceNumber || "-";
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/>
    <title>Transaction - ${invoiceNumber}</title>
    <style>@media print { body { margin: 0; padding: 0; } }</style>
    </head><body>${buildInvoiceHTML(item)}
    <script>window.onload = function() { window.print(); };<\/script>
    </body></html>`);
  win.document.close();
}

export default function TransactionDetailsModal({ transaction, isOpen, onClose }: TransactionDetailsModalProps) {
  // Prevent body scroll while open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen || !transaction) return null;

  const status = transaction.status;
  const upper = status?.toUpperCase();
  const isSuccess = upper === "SUCCESSFUL" || upper === "SUCCESS" || upper === "CONFIRMED";
  const isCancelled = upper === "CANCELLED" || upper === "FAILED";
  const statusText = isSuccess ? "Successful" : isCancelled ? "Cancelled" : status || "Pending";

  const invoiceNumber = transaction.invoiceNumber || transaction.transactionId || "INV-" + transaction.id.slice(0, 8);
  const dateTime = formatDate(transaction.dateTime || transaction.transactionDate);
  const customerName = transaction.customer?.name || transaction.customerName || "-";
  const mobileNumber = transaction.customer?.mobileNumber || transaction.mobileNumber || "-";
  const gstNumber = transaction.customer?.gstNumber || "-";
  const paymentMode = transaction.paymentMode || "-";
  const amount = Number(transaction.grandTotalAmount ?? transaction.amount ?? 0).toFixed(2);

  const attractions = transaction.attractions && transaction.attractions.length > 0 ? transaction.attractions : [];
  const categories = transaction.categories && transaction.categories.length > 0 ? transaction.categories : [];
  const totalSeats = categories.reduce((sum, c) => sum + (c.noOfSeats || 0), 0);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(4px)",
        padding: "16px",
        overflowY: "auto",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "580px",
          background: "#FFFFFF",
          borderRadius: "16px",
          boxShadow: "0 20px 50px rgba(0,0,0,0.2)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: "modalFadeIn 0.22s cubic-bezier(0.16,1,0.3,1)",
          maxHeight: "90vh",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        {/* ── Header ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 24px",
            borderBottom: "1px solid #E5E7EB",
            flexShrink: 0,
          }}
        >
          <h2
            style={{
              fontFamily: typography.fontFamily.sans,
              fontWeight: 700,
              fontSize: "18px",
              color: "#0C2A42",
              margin: 0,
            }}
          >
            Transaction Details
          </h2>
          <button
            onClick={onClose}
            aria-label="Close modal"
            style={{
              background: "#F3F4F6",
              border: "none",
              borderRadius: "50%",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#6B7280",
              transition: "background 0.15s ease",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Body ── */}
        <div
          style={{
            padding: "20px 24px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            overflowY: "auto",
          }}
        >
          {/* ── Top Reference Banner ── */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "#FFFDF0",
              border: "1.5px solid #FDE68A",
              borderRadius: "12px",
              padding: "14px 18px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "50%",
                  background: "#F4BC43",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <CreditCard size={20} color="#0C2A42" strokeWidth={2.2} />
              </div>
              <div>
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "#92400E",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    fontFamily: typography.fontFamily.sans,
                  }}
                >
                  INVOICE NUMBER
                </div>
                <h3
                  style={{
                    fontFamily: typography.fontFamily.sans,
                    fontWeight: 700,
                    fontSize: "18px",
                    color: "#0C2A42",
                    margin: "2px 0 0 0",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {invoiceNumber}
                </h3>
              </div>
            </div>

            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "5px 14px",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: 700,
                fontFamily: typography.fontFamily.sans,
                background: isSuccess ? "#D1FAE5" : isCancelled ? "#FEE2E2" : "#FEF3C7",
                color: isSuccess ? "#15803D" : isCancelled ? "#991B1B" : "#92400E",
              }}
            >
              {isSuccess ? <CheckCircle2 size={14} /> : isCancelled ? <XCircle size={14} /> : <Clock size={14} />}
              {statusText}
            </span>
          </div>

          {/* ── Customer Information Card ── */}
          <div
            style={{
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              borderRadius: "12px",
              padding: "16px 18px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                fontFamily: typography.fontFamily.sans,
                fontWeight: 700,
                fontSize: "12px",
                color: "#0C2A42",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                borderBottom: "1px solid #E2E8F0",
                paddingBottom: "10px",
                marginBottom: "14px",
              }}
            >
              CUSTOMER INFORMATION
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", rowGap: "14px" }}>
              <div>
                <span
                  style={{
                    color: "#64748B",
                    fontSize: "11px",
                    fontWeight: 600,
                    display: "block",
                    marginBottom: "3px",
                    fontFamily: typography.fontFamily.sans,
                  }}
                >
                  Customer Name
                </span>
                <strong
                  style={{
                    color: "#0C2A42",
                    fontWeight: 700,
                    fontSize: "13px",
                    fontFamily: typography.fontFamily.sans,
                  }}
                >
                  {customerName}
                </strong>
              </div>
              <div>
                <span
                  style={{
                    color: "#64748B",
                    fontSize: "11px",
                    fontWeight: 600,
                    display: "block",
                    marginBottom: "3px",
                    fontFamily: typography.fontFamily.sans,
                  }}
                >
                  Mobile Number
                </span>
                <strong
                  style={{
                    color: "#0C2A42",
                    fontWeight: 700,
                    fontSize: "13px",
                    fontFamily: typography.fontFamily.sans,
                  }}
                >
                  {mobileNumber}
                </strong>
              </div>
              <div>
                <span
                  style={{
                    color: "#64748B",
                    fontSize: "11px",
                    fontWeight: 600,
                    display: "block",
                    marginBottom: "3px",
                    fontFamily: typography.fontFamily.sans,
                  }}
                >
                  Date &amp; Time
                </span>
                <strong
                  style={{
                    color: "#0C2A42",
                    fontWeight: 700,
                    fontSize: "13px",
                    fontFamily: typography.fontFamily.sans,
                  }}
                >
                  {dateTime}
                </strong>
              </div>
              <div>
                <span
                  style={{
                    color: "#64748B",
                    fontSize: "11px",
                    fontWeight: 600,
                    display: "block",
                    marginBottom: "3px",
                    fontFamily: typography.fontFamily.sans,
                  }}
                >
                  GST Number
                </span>
                <strong
                  style={{
                    color: "#0C2A42",
                    fontWeight: 700,
                    fontSize: "13px",
                    fontFamily: typography.fontFamily.sans,
                  }}
                >
                  {gstNumber}
                </strong>
              </div>
            </div>
          </div>

          {/* ── Attractions Breakdown Card ── */}
          {attractions.length > 0 && (
            <div
              style={{
                background: "#F8FAFC",
                border: "1px solid #E2E8F0",
                borderRadius: "12px",
                padding: "16px 18px",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderBottom: "1px solid #E2E8F0",
                  paddingBottom: "10px",
                  marginBottom: "12px",
                }}
              >
                <span
                  style={{
                    fontFamily: typography.fontFamily.sans,
                    fontWeight: 700,
                    fontSize: "12px",
                    color: "#0C2A42",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  ATTRACTIONS ({attractions.length})
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {attractions.map((a, idx) => {
                  const subtotal = Number(a.attractionSubtotal ?? 0);
                  const gst = Number(a.attractionGst ?? 0);
                  const gstAdj = Number(a.attractionRoundOffGstAdj ?? 0);
                  const roundOff = Number(a.attractionRoundoff ?? 0);
                  const total = Number(a.attractionTotalAmount ?? 0);

                  return (
                    <div
                      key={a.id || idx}
                      style={{
                        background: "#FFFFFF",
                        border: "1px solid #E2E8F0",
                        borderRadius: "10px",
                        padding: "14px 16px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                      }}
                    >
                      {/* Attraction Name */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          borderBottom: "1px solid #F1F5F9",
                          paddingBottom: "8px",
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: "14px",
                            color: "#0C2A42",
                            fontFamily: typography.fontFamily.sans,
                          }}
                        >
                          {a.name}
                        </span>
                      </div>

                      {/* Orderly Line-by-Line Breakdown (Matching Image 1) */}
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                          fontSize: "13px",
                          fontFamily: typography.fontFamily.sans,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ color: "#475569" }}>Subtotal</span>
                          <span style={{ fontWeight: 600, color: "#0F172A" }}>₹{subtotal.toFixed(2)}</span>
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ color: "#475569" }}>GST (18%)</span>
                          <span style={{ fontWeight: 600, color: "#0F172A" }}>₹{gst.toFixed(2)}</span>
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ color: "#64748B" }}>Round-off GST Adj.</span>
                          <span
                            style={{
                              fontWeight: 600,
                              color: gstAdj < 0 ? "#DC2626" : "#0F172A",
                            }}
                          >
                            {gstAdj < 0
                              ? `-₹${Math.abs(gstAdj).toFixed(2)}`
                              : gstAdj > 0
                              ? `+₹${gstAdj.toFixed(2)}`
                              : `₹${gstAdj.toFixed(2)}`}
                          </span>
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ color: "#64748B" }}>Round-Off</span>
                          <span style={{ fontWeight: 600, color: "#0F172A" }}>
                            ₹{roundOff.toFixed(2)}
                          </span>
                        </div>

                        <div
                          style={{
                            borderTop: "1px solid #E2E8F0",
                            paddingTop: "10px",
                            marginTop: "2px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <strong style={{ fontWeight: 700, color: "#0C2A42", fontSize: "13.5px" }}>
                            Total Amount
                          </strong>
                          <strong style={{ fontWeight: 800, color: "#0C2A42", fontSize: "15px" }}>
                            ₹{total.toFixed(2)}
                          </strong>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Visitors / Tickets Generated Card ── */}
          {categories.length > 0 && (
            <div
              style={{
                background: "#F8FAFC",
                border: "1px solid #E2E8F0",
                borderRadius: "12px",
                padding: "16px 18px",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderBottom: "1px solid #E2E8F0",
                  paddingBottom: "10px",
                  marginBottom: "12px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Users size={14} color="#0C2A42" />
                  <span
                    style={{
                      fontFamily: typography.fontFamily.sans,
                      fontWeight: 700,
                      fontSize: "12px",
                      color: "#0C2A42",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    VISITORS / TICKETS GENERATED
                  </span>
                </div>
                {totalSeats > 0 && (
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "#0C2A42",
                      background: "#F4BC43",
                      padding: "2px 8px",
                      borderRadius: "12px",
                    }}
                  >
                    {totalSeats} Total Seat{totalSeats > 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {categories.map((c, idx) => (
                  <span
                    key={c.id || idx}
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid #E2E8F0",
                      padding: "6px 12px",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "#0C2A42",
                      fontWeight: 600,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <Tag size={12} color="#F4BC43" />
                    <span>{c.name}</span>
                    <strong style={{ color: "#1E3A8A" }}>
                      ({c.noOfSeats} seat{c.noOfSeats > 1 ? "s" : ""})
                    </strong>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid #E5E7EB",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: "10px",
            background: "#FFFFFF",
            flexWrap: "wrap",
            flexShrink: 0,
          }}
        >
          <button
            onClick={onClose}
            style={{
              height: "40px",
              padding: "0 22px",
              borderRadius: "8px",
              border: "1.5px solid #D1D5DB",
              background: "#FFFFFF",
              color: "#0C2A42",
              fontFamily: typography.fontFamily.sans,
              fontWeight: 600,
              fontSize: "13px",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            Close
          </button>
          <button
            onClick={() => handleDownloadPDF(transaction)}
            style={{
              height: "40px",
              padding: "0 18px",
              borderRadius: "8px",
              border: "none",
              background: "#0C2A42",
              color: "#FFFFFF",
              fontFamily: typography.fontFamily.sans,
              fontWeight: 600,
              fontSize: "13px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              transition: "all 0.15s ease",
            }}
          >
            <Download size={16} />
            <span>Download PDF</span>
          </button>
          <button
            onClick={() => handlePrintInvoice(transaction)}
            style={{
              height: "40px",
              padding: "0 18px",
              borderRadius: "8px",
              border: "none",
              background: "#F4BC43",
              color: "#0C2A42",
              fontFamily: typography.fontFamily.sans,
              fontWeight: 700,
              fontSize: "13px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              transition: "all 0.15s ease",
            }}
          >
            <Printer size={16} />
            <span>Print Invoice</span>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes modalFadeIn {
          from { transform: scale(0.95); opacity: 0; }
          to   { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
