"use client";

import React, { useEffect } from "react";
import { X, FileText, Download, Printer, CheckCircle2, XCircle, Clock, Tag, User, QrCode } from "lucide-react";
import { colors, typography } from "@/lib/theme";
import { InvoiceListItem } from "@/hooks/useInvoiceQueries";

interface InvoiceDetailsModalProps {
  invoice: InvoiceListItem | null;
  isOpen?: boolean;
  onClose: () => void;
}

function formatDate(iso: string | undefined | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

// ── Build branded invoice HTML for PDF & Print ────────────────────────────────
function buildInvoiceHTML(invoice: InvoiceListItem): string {
  const status = invoice.scannerInvoice?.scannerInvoiceStatus || invoice.status || "CONFIRMED";
  const upper = status.toUpperCase();
  const isSuccess = upper === "SUCCESS" || upper === "SUCCESSFUL" || upper === "CONFIRMED" || upper === "PAID" || upper === "SCANNED";
  const isFailed = upper === "FAILED" || upper === "CANCELLED";
  const statusBg = isSuccess ? "#B5FFE7" : isFailed ? "#FEE2E2" : "#FFF8D9";
  const statusColor = isSuccess ? "#119167" : isFailed ? "#DC2626" : "#D97706";

  const customerName = invoice.customer?.name || invoice.customerName || "-";
  const mobile = invoice.customer?.mobileNumber || invoice.mobileNumber || "-";
  const gstn = invoice.customer?.gstNumber || invoice.gstNumber || "-";
  const invoiceNumber = invoice.invoiceNumber || invoice.invoiceId || invoice.id || "-";
  const invoiceDate = formatDate(invoice.dateTime || invoice.invoiceDate);
  const visitors = invoice.visitors ?? 1;
  const grandTotal = Number(invoice.grandTotalAmount ?? invoice.amount ?? 0).toFixed(2);
  const paymentMode = invoice.paymentMode || "CASH";

  const attractionsList = invoice.attractions && invoice.attractions.length > 0
    ? invoice.attractions
    : invoice.attraction
    ? [invoice.attraction]
    : [];

  const attractionsHtml = attractionsList.length > 0
    ? attractionsList.map((a, i) => `<tr><td style="padding:6px 8px;border-bottom:1px solid #E2E8F0;">${i + 1}</td><td style="padding:6px 8px;border-bottom:1px solid #E2E8F0;font-weight:600;">${a.name}</td></tr>`).join("")
    : `<tr><td colspan="2" style="padding:6px 8px;color:#64748B;">-</td></tr>`;

  const scannerInfo = invoice.scannerInvoice
    ? `
      <div style="background:#F8FAFC;padding:14px;border-radius:8px;border:1px solid #E2E8F0;margin-bottom:16px;">
        <div style="font-size:12px;font-weight:bold;color:#0C2A42;text-transform:uppercase;margin-bottom:8px;">Scanner Details</div>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <tr>
            <td style="padding:4px 0;width:33.3%;"><strong>Status:</strong> ${invoice.scannerInvoice.scannerInvoiceStatus}</td>
            <td style="padding:4px 0;width:33.3%;"><strong>Staff:</strong> ${invoice.scannerInvoice.scannedByStaff || "-"}</td>
            <td style="padding:4px 0;width:33.3%;"><strong>Scanned At:</strong> ${formatDate(invoice.scannerInvoice.scannedAt)}</td>
          </tr>
        </table>
      </div>
    `
    : "";

  return `
    <div style="font-family:Arial,sans-serif;padding:30px;color:#011B2F;background:#FFFFFF;max-width:680px;margin:auto;">
      <table style="width:100%;border-collapse:collapse;border-bottom:2px solid #F4BC43;padding-bottom:12px;margin-bottom:20px;">
        <tr>
          <td style="vertical-align:middle;padding-bottom:12px;">
            <div style="font-size:22px;font-weight:bold;color:#0C2A42;">TICKETING PLATFORM</div>
            <div style="font-size:12px;color:#6B7280;">Official Tax Invoice</div>
          </td>
          <td style="text-align:right;vertical-align:middle;padding-bottom:12px;">
            <div style="display:inline-block;padding:4px 12px;border-radius:12px;font-weight:bold;font-size:12px;background:${statusBg};color:${statusColor};">${status}</div>
            <div style="font-size:14px;margin-top:4px;font-weight:bold;color:#0C2A42;">${invoiceNumber}</div>
          </td>
        </tr>
      </table>

      <!-- Customer & Invoice Info -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
        <tr>
          <td style="width:100%;vertical-align:top;">
            <div style="background:#F8FAFC;padding:14px;border-radius:8px;border:1px solid #E2E8F0;">
              <div style="font-size:12px;font-weight:bold;color:#0C2A42;text-transform:uppercase;margin-bottom:10px;">Invoice &amp; Customer Information</div>
              <table style="width:100%;border-collapse:collapse;font-size:13px;">
                <tr>
                  <td style="padding:4px 0;width:50%;"><strong>Invoice ID:</strong> ${invoiceNumber}</td>
                  <td style="padding:4px 0;"><strong>Invoice Date:</strong> ${invoiceDate}</td>
                </tr>
                <tr>
                  <td style="padding:4px 0;"><strong>Customer Name:</strong> ${customerName}</td>
                  <td style="padding:4px 0;"><strong>Mobile Number:</strong> ${mobile}</td>
                </tr>
                ${gstn && gstn !== "-" ? `<tr><td colspan="2" style="padding:4px 0;"><strong>GST Number:</strong> ${gstn}</td></tr>` : ""}
              </table>
            </div>
          </td>
        </tr>
      </table>

      <!-- Attractions Table -->
      <div style="background:#F8FAFC;padding:14px;border-radius:8px;border:1px solid #E2E8F0;margin-bottom:16px;">
        <div style="font-size:12px;font-weight:bold;color:#0C2A42;text-transform:uppercase;margin-bottom:8px;">Attractions (${attractionsList.length})</div>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:#F1F5F9;text-align:left;font-size:11px;color:#64748B;text-transform:uppercase;">
              <th style="padding:6px 8px;width:40px;">#</th>
              <th style="padding:6px 8px;">Attraction Name</th>
            </tr>
          </thead>
          <tbody>
            ${attractionsHtml}
          </tbody>
        </table>
      </div>

      ${scannerInfo}

      <!-- Payment Summary -->
      <div style="border:1.5px solid #0084FF;border-radius:8px;padding:16px 14px;background:#F0F9FF;margin-bottom:20px;">
        <div style="font-size:14px;font-weight:bold;color:#0C2A42;margin-bottom:12px;">Payment Summary</div>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <tr>
            <td style="padding:4px 0;width:33.3%;"><strong style="color:#0C2A42;">Visitors:</strong> ${visitors}</td>
            <td style="padding:4px 0;width:33.3%;"><strong style="color:#0C2A42;">Payment Mode:</strong> ${paymentMode}</td>
            <td style="padding:4px 0;width:33.3%;text-align:right;"><strong style="color:#0C2A42;">Grand Total:</strong> &#8377;${grandTotal}</td>
          </tr>
        </table>
      </div>

      <div style="text-align:center;margin-top:30px;font-size:12px;color:#9CA3AF;">
        Thank you for your visit. This is a computer generated invoice and requires no physical signature.
      </div>
    </div>`;
}

// ── Download PDF via html2pdf.js (CDN) ───────────────────────────────────────
async function handleDownloadPDF(invoice: InvoiceListItem) {
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
  element.style.width = "700px";
  element.innerHTML = buildInvoiceHTML(invoice);
  document.body.appendChild(element);

  const invNum = invoice.invoiceNumber || invoice.invoiceId || invoice.id || "Invoice";
  await (window as any).html2pdf().set({
    margin: [10, 10, 10, 10],
    filename: `${invNum}.pdf`,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
  }).from(element).save();

  document.body.removeChild(element);
}

// ── Print via browser ─────────────────────────────────────────────────────────
function handlePrintInvoice(invoice: InvoiceListItem) {
  const win = window.open("", "_blank");
  if (!win) {
    alert("Please allow pop-ups to print invoices.");
    return;
  }
  const invNum = invoice.invoiceNumber || invoice.invoiceId || invoice.id || "Invoice";
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/>
    <title>${invNum}</title>
    <style>@media print { body { margin: 0; padding: 0; } }</style>
    </head><body>${buildInvoiceHTML(invoice)}
    <script>window.onload = function() { window.print(); };<\/script>
    </body></html>`);
  win.document.close();
}

export default function InvoiceDetailsModal({
  invoice,
  isOpen = true,
  onClose,
}: InvoiceDetailsModalProps) {
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

  if (!isOpen || !invoice) return null;

  const status = invoice.scannerInvoice?.scannerInvoiceStatus || invoice.status || "CONFIRMED";
  const upper = status.toUpperCase();
  const isSuccess = upper === "SUCCESS" || upper === "SUCCESSFUL" || upper === "CONFIRMED" || upper === "PAID" || upper === "SCANNED";
  const isFailed = upper === "FAILED" || upper === "CANCELLED";

  const invNumber = invoice.invoiceNumber || invoice.invoiceId || invoice.id || "-";
  const invDate = formatDate(invoice.dateTime || invoice.invoiceDate);
  const custName = invoice.customer?.name || invoice.customerName || "-";
  const mobile = invoice.customer?.mobileNumber || invoice.mobileNumber || "-";
  const gstNumber = invoice.customer?.gstNumber || invoice.gstNumber || "-";
  const grandTotal = Number(invoice.grandTotalAmount ?? invoice.amount ?? 0).toFixed(2);
  const visitors = invoice.visitors ?? 1;

  const attractionsList = invoice.attractions && invoice.attractions.length > 0
    ? invoice.attractions
    : invoice.attraction
    ? [invoice.attraction]
    : [];

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
          borderRadius: "20px",
          boxShadow: "0 20px 50px rgba(0,0,0,0.2)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: "invModalIn 0.22s cubic-bezier(0.16,1,0.3,1)",
          maxHeight: "90vh",
        }}
      >
        {/* Header */}
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
            Invoice Details
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
              color: colors.text.muted,
              transition: "all 0.15s ease",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            padding: "20px 24px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            overflowY: "auto",
          }}
        >
          {/* Top Banner */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              background: "#FFFBEB",
              border: "1px solid #FDE68A",
              borderRadius: "12px",
              padding: "14px 18px",
            }}
          >
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "50%",
                background: "#F4BC43",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <FileText size={22} color="#0C2A42" />
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#92400E",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  fontFamily: typography.fontFamily.sans,
                }}
              >
                Invoice No
              </div>
              <h3
                style={{
                  fontFamily: typography.fontFamily.sans,
                  fontWeight: 700,
                  fontSize: "17px",
                  color: "#0C2A42",
                  margin: 0,
                }}
              >
                {invNumber}
              </h3>
            </div>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "5px 12px",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: 700,
                fontFamily: typography.fontFamily.sans,
                background: isSuccess ? "#D1FAE5" : isFailed ? "#FEE2E2" : "#FEF3C7",
                color: isSuccess ? "#065F46" : isFailed ? "#991B1B" : "#92400E",
              }}
            >
              {isSuccess ? <CheckCircle2 size={13} /> : isFailed ? <XCircle size={13} /> : <Clock size={13} />}
              {status}
            </span>
          </div>

          {/* Customer Information Card */}
          <div
            style={{
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              borderRadius: "12px",
              padding: "16px 18px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontFamily: typography.fontFamily.sans,
                fontWeight: 700,
                fontSize: "12px",
                color: "#0C2A42",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                borderBottom: "1px solid #E2E8F0",
                paddingBottom: "8px",
              }}
            >
              <User size={14} color="#0C2A42" />
              <span>Customer Information</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", fontSize: "13px" }}>
              <div>
                <span style={{ color: "#64748B", fontSize: "11px", fontWeight: 600, display: "block", fontFamily: typography.fontFamily.sans }}>Customer Name</span>
                <strong style={{ color: "#0F172A", fontWeight: 700, fontFamily: typography.fontFamily.sans }}>
                  {custName}
                </strong>
              </div>
              <div>
                <span style={{ color: "#64748B", fontSize: "11px", fontWeight: 600, display: "block", fontFamily: typography.fontFamily.sans }}>Mobile Number</span>
                <strong style={{ color: "#0F172A", fontWeight: 700, fontFamily: typography.fontFamily.sans }}>
                  {mobile}
                </strong>
              </div>
              <div>
                <span style={{ color: "#64748B", fontSize: "11px", fontWeight: 600, display: "block", fontFamily: typography.fontFamily.sans }}>Date &amp; Time</span>
                <strong style={{ color: "#0F172A", fontWeight: 700, fontFamily: typography.fontFamily.sans }}>
                  {invDate}
                </strong>
              </div>
              <div>
                <span style={{ color: "#64748B", fontSize: "11px", fontWeight: 600, display: "block", fontFamily: typography.fontFamily.sans }}>GST Number</span>
                <strong style={{ color: "#0F172A", fontWeight: 700, fontFamily: typography.fontFamily.sans }}>
                  {gstNumber}
                </strong>
              </div>
            </div>
          </div>

          {/* Attractions Card */}
          {attractionsList.length > 0 && (
            <div
              style={{
                background: "#F8FAFC",
                border: "1px solid #E2E8F0",
                borderRadius: "12px",
                padding: "16px 18px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontFamily: typography.fontFamily.sans,
                  fontWeight: 700,
                  fontSize: "12px",
                  color: "#0C2A42",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  borderBottom: "1px solid #E2E8F0",
                  paddingBottom: "8px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Tag size={14} color="#0C2A42" />
                  <span>Attractions ({attractionsList.length})</span>
                </div>
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
                  {visitors} Visitor{visitors > 1 ? "s" : ""}
                </span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {attractionsList.map((attr, idx) => (
                  <span
                    key={attr.id || idx}
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid #E2E8F0",
                      padding: "6px 14px",
                      borderRadius: "8px",
                      fontSize: "13px",
                      color: "#0C2A42",
                      fontWeight: 600,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <span>{attr.name}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Scanner Invoice Status Card */}
          {invoice.scannerInvoice && (
            <div
              style={{
                background: "#F8FAFC",
                border: "1px solid #E2E8F0",
                borderRadius: "12px",
                padding: "16px 18px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontFamily: typography.fontFamily.sans,
                  fontWeight: 700,
                  fontSize: "12px",
                  color: "#0C2A42",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  borderBottom: "1px solid #E2E8F0",
                  paddingBottom: "8px",
                }}
              >
                <QrCode size={14} color="#0C2A42" />
                <span>Scanner Status</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", fontSize: "13px" }}>
                <div>
                  <span style={{ color: "#64748B", fontSize: "11px", fontWeight: 600, display: "block", fontFamily: typography.fontFamily.sans }}>Status</span>
                  <strong style={{ color: invoice.scannerInvoice.scannerInvoiceStatus === "SCANNED" ? "#16A34A" : "#D97706", fontWeight: 700 }}>
                    {invoice.scannerInvoice.scannerInvoiceStatus}
                  </strong>
                </div>
                <div>
                  <span style={{ color: "#64748B", fontSize: "11px", fontWeight: 600, display: "block", fontFamily: typography.fontFamily.sans }}>Scanned By</span>
                  <strong style={{ color: "#0F172A", fontWeight: 700 }}>
                    {invoice.scannerInvoice.scannedByStaff || "-"}
                  </strong>
                </div>
                <div>
                  <span style={{ color: "#64748B", fontSize: "11px", fontWeight: 600, display: "block", fontFamily: typography.fontFamily.sans }}>Scanned At</span>
                  <strong style={{ color: "#0F172A", fontWeight: 700 }}>
                    {formatDate(invoice.scannerInvoice.scannedAt)}
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* Payment & Amount Summary Card */}
          <div
            style={{
              border: "1.5px solid #0084FF",
              borderRadius: "12px",
              padding: "16px 18px",
              background: "#F0F9FF",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <span style={{ color: "#64748B", fontSize: "11px", fontWeight: 600, display: "block", textTransform: "uppercase" }}>
                Grand Total Amount
              </span>
              <strong style={{ color: "#0C2A42", fontSize: "20px", fontWeight: 800 }}>
                ₹{grandTotal}
              </strong>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ color: "#64748B", fontSize: "11px", fontWeight: 600, display: "block", textTransform: "uppercase" }}>
                Total Visitors
              </span>
              <strong style={{ color: "#0C2A42", fontSize: "16px", fontWeight: 700 }}>
                {visitors}
              </strong>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
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
              padding: "0 18px",
              borderRadius: "8px",
              border: "1px solid #D1D5DB",
              background: "#FFFFFF",
              color: "#0C2A42",
              fontFamily: typography.fontFamily.sans,
              fontWeight: 600,
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            Close
          </button>
          <button
            onClick={() => handleDownloadPDF(invoice)}
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
              gap: "6px",
              transition: "all 0.15s ease",
            }}
          >
            <Download size={16} />
            <span>Download PDF</span>
          </button>
          <button
            onClick={() => handlePrintInvoice(invoice)}
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
        @keyframes invModalIn {
          from { transform: scale(0.95); opacity: 0; }
          to   { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
