"use client";

import React, { useEffect } from "react";
import { X, User, Ticket, CreditCard, Download, Printer } from "lucide-react";
import { colors, typography } from "@/lib/theme";
import { BookingListItem } from "@/hooks/useBookingQueries";

interface BookingDetailsModalProps {
  booking: BookingListItem | null;
  isOpen: boolean;
  onClose: () => void;
}

function formatDate(iso: string | undefined | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

// ── Generate branded invoice HTML from booking data ──────────────────────────
function buildInvoiceHTML(booking: BookingListItem): string {
  const status = booking.status ?? "CONFIRMED";
  const upper = status.toUpperCase();
  const statusBg = upper === "CONFIRMED" ? "#B5FFE7" : upper === "CANCELLED" ? "#FEE2E2" : "#FFF8D9";
  const statusColor = upper === "CONFIRMED" ? "#119167" : upper === "CANCELLED" ? "#DC2626" : "#D97706";

  const invoiceNumber = booking.invoiceNumber || booking.bookingId || booking.id;
  const customerName = booking.customer?.name ?? booking.customerName ?? "-";
  const customerMobile = booking.customer?.mobileNumber ?? booking.mobileNumber ?? "-";
  const customerGst = booking.customer?.gstNumber ?? booking.gstNumber ?? "N/A";
  const visitDate = formatDate(booking.dateTime || booking.bookingDate || booking.createdAt);
  const totalAmount = Number(booking.grandTotalAmount ?? booking.amount ?? 0);
  const totalVisitors = typeof booking.visitors === "number" ? booking.visitors : (booking.visitors as any)?.total ?? "-";
  const paymentMode = booking.paymentMode ?? "Cash";

  const attractionsList = booking.attractions && booking.attractions.length > 0
    ? booking.attractions
    : [{ id: booking.attraction?.id ?? "", name: booking.attraction?.name ?? "-", totalAmount }];

  const itemsHtml = attractionsList.map((attr, idx) => `
    <tr>
      <td style="padding:10px 14px;border-bottom:1px solid #E5E7EB;text-align:center;">${idx + 1}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #E5E7EB;">${attr.name}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #E5E7EB;text-align:right;font-weight:600;">&#8377;${Number(attr.totalAmount ?? 0).toFixed(2)}</td>
    </tr>`).join("");

  return `
    <div style="font-family:Arial,sans-serif;padding:30px;color:#011B2F;background:#FFFFFF;max-width:700px;margin:auto;">
      <table style="width:100%;border-collapse:collapse;border-bottom:2px solid #F4BC43;padding-bottom:12px;margin-bottom:20px;">
        <tr>
          <td style="vertical-align:middle;padding-bottom:12px;">
            <div style="font-size:22px;font-weight:bold;color:#0C2A42;">TICKETING PLATFORM</div>
            <div style="font-size:12px;color:#6B7280;">Official Booking Receipt &amp; Invoice</div>
          </td>
          <td style="text-align:right;vertical-align:middle;padding-bottom:12px;">
            <div style="display:inline-block;padding:4px 12px;border-radius:12px;font-weight:bold;font-size:12px;background:${statusBg};color:${statusColor};">${status}</div>
            <div style="font-size:13px;margin-top:4px;font-weight:bold;color:#0C2A42;">Invoice: ${invoiceNumber}</div>
          </td>
        </tr>
      </table>

      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <tr>
          <td style="width:50%;vertical-align:top;padding-right:8px;">
            <div style="background:#F8FAFC;padding:14px;border-radius:8px;border:1px solid #E2E8F0;">
              <div style="font-size:14px;font-weight:bold;color:#0C2A42;margin-bottom:10px;">Customer Information</div>
              <div style="font-size:13px;margin-bottom:4px;"><strong>Name:</strong> ${customerName}</div>
              <div style="font-size:13px;margin-bottom:4px;"><strong>Mobile:</strong> ${customerMobile}</div>
              <div style="font-size:13px;"><strong>GSTN:</strong> ${customerGst}</div>
            </div>
          </td>
          <td style="width:50%;vertical-align:top;padding-left:8px;">
            <div style="background:#F8FAFC;padding:14px;border-radius:8px;border:1px solid #E2E8F0;">
              <div style="font-size:14px;font-weight:bold;color:#0C2A42;margin-bottom:10px;">Booking Information</div>
              <div style="font-size:13px;margin-bottom:4px;"><strong>Invoice No:</strong> ${invoiceNumber}</div>
              <div style="font-size:13px;margin-bottom:4px;"><strong>Date &amp; Time:</strong> ${visitDate}</div>
              <div style="font-size:13px;margin-bottom:4px;"><strong>Total Visitors:</strong> ${totalVisitors}</div>
              <div style="font-size:13px;"><strong>Payment Mode:</strong> ${paymentMode}</div>
            </div>
          </td>
        </tr>
      </table>

      <div style="border:2px solid #0084FF;border-radius:8px;overflow:hidden;margin-bottom:20px;">
        <div style="padding:10px 14px;background:#FFFFFF;border-bottom:1px solid #E5E7EB;font-weight:bold;font-size:14px;color:#0C2A42;">Attractions Breakdown</div>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:rgba(179,175,175,0.17);color:#374151;font-weight:600;">
              <th style="padding:10px 14px;text-align:center;width:40px;">#</th>
              <th style="padding:10px 14px;text-align:left;">Attraction</th>
              <th style="padding:10px 14px;text-align:right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
            <tr style="background:#FFFBEB;font-weight:bold;">
              <td style="padding:12px 14px;color:#0C2A42;" colspan="2">Total Amount (${totalVisitors} visitor${totalVisitors === 1 ? "" : "s"})</td>
              <td style="padding:12px 14px;text-align:right;font-size:16px;color:#0C2A42;">&#8377;${totalAmount.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style="border:1.5px solid #0084FF;border-radius:8px;padding:16px 14px;background:#F0F9FF;margin-bottom:20px;">
        <div style="font-size:14px;font-weight:bold;color:#0C2A42;margin-bottom:12px;">Payment Summary</div>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <tr>
            <td style="padding:4px 0;color:#6B7280;width:50%;"><strong style="color:#0C2A42;">Payment Mode:</strong> ${paymentMode}</td>
            <td style="padding:4px 0;text-align:right;"><strong style="color:#0C2A42;">Status:</strong> ${status}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;"><strong style="color:#0C2A42;">Grand Total:</strong> &#8377;${totalAmount.toFixed(2)}</td>
            <td style="padding:4px 0;text-align:right;"><strong style="color:#0C2A42;">Amount Paid:</strong> &#8377;${totalAmount.toFixed(2)}</td>
          </tr>
        </table>
      </div>

      <div style="text-align:center;margin-top:30px;font-size:12px;color:#9CA3AF;">
        Thank you for booking with us! Please present this receipt at the entry counter.
      </div>
    </div>`;
}

// ── Download PDF using html2pdf.js ───────────────────────────────────────────
async function handleDownloadPDF(booking: BookingListItem) {
  if (!(window as any).html2pdf) {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load PDF library"));
      document.head.appendChild(script);
    });
  }

  const invoiceNumber = booking.invoiceNumber || booking.bookingId || booking.id;
  const safeFilename = invoiceNumber.replace(/[/\\?%*:|"<>]/g, "_");

  const element = document.createElement("div");
  element.style.width = "750px";
  element.innerHTML = buildInvoiceHTML(booking);
  document.body.appendChild(element);

  await (window as any).html2pdf().set({
    margin: [10, 10, 10, 10],
    filename: `${safeFilename}_Invoice.pdf`,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
  }).from(element).save();

  document.body.removeChild(element);
}

// ── Print Invoice via browser print window ────────────────────────────────────
function handlePrintInvoice(booking: BookingListItem) {
  const invoiceNumber = booking.invoiceNumber || booking.bookingId || booking.id;
  const win = window.open("", "_blank");
  if (!win) { alert("Please allow pop-ups to print invoices."); return; }
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/>
    <title>Invoice - ${invoiceNumber}</title>
    <style>@media print { body { margin: 0; padding: 0; } }</style>
    </head><body>${buildInvoiceHTML(booking)}
    <script>window.onload = function() { window.print(); };<\/script>
    </body></html>`);
  win.document.close();
}

export default function BookingDetailsModal({ booking, isOpen, onClose }: BookingDetailsModalProps) {
  // Prevent body scroll while open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen || !booking) return null;

  const status = booking.status ?? "CONFIRMED";
  const upper = status.toUpperCase();
  const isConfirmed = upper === "CONFIRMED";
  const isCancelled = upper === "CANCELLED";
  const statusBg = isConfirmed ? "#B5FFE7" : isCancelled ? "#FEE2E2" : "rgba(255,248,217,0.93)";
  const statusDot = isConfirmed ? "#119167" : isCancelled ? "rgba(220,38,38,0.88)" : "#D97706";
  const statusText = isConfirmed ? "#119167" : isCancelled ? "rgba(220,38,38,0.86)" : "#D97706";
  const statusLabel = isConfirmed ? "Confirmed" : isCancelled ? "Cancelled" : "Pending";

  const invoiceNumber = booking.invoiceNumber || booking.bookingId || booking.id;
  const customerName = booking.customer?.name ?? booking.customerName ?? "-";
  const customerMobile = booking.customer?.mobileNumber ?? booking.mobileNumber ?? "-";
  const customerGst = booking.customer?.gstNumber ?? booking.gstNumber ?? "N/A";
  const attractionsList = booking.attractions && booking.attractions.length > 0
    ? booking.attractions
    : [{ id: booking.attraction?.id ?? "", name: booking.attraction?.name ?? "-", totalAmount: booking.grandTotalAmount ?? booking.amount ?? 0 }];
  const attractionsNames = attractionsList.map((a) => a.name).join(", ") || "-";
  const totalVisitors = typeof booking.visitors === "number" ? booking.visitors : (booking.visitors as any)?.total ?? "-";
  const grandTotal = Number(booking.grandTotalAmount ?? booking.amount ?? 0);

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
        padding: "20px 16px",
        overflowY: "auto",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "832px",
          background: "#FFFFFF",
          borderRadius: "26px",
          boxShadow: "0 20px 50px rgba(0,0,0,0.2)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: "modalFadeIn 0.22s cubic-bezier(0.16,1,0.3,1)",
          maxHeight: "92vh",
          margin: "auto",
        }}
      >
        {/* ── Header ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 32px",
            borderBottom: "1px solid #E5E7EB",
            flexShrink: 0,
            background: "#FFFFFF",
          }}
        >
          <h2
            style={{
              fontFamily: typography.fontFamily.sans,
              fontWeight: 700,
              fontSize: "20px",
              color: colors.sidebar.bg,
              margin: 0,
            }}
          >
            Booking Details
          </h2>
          <button
            onClick={onClose}
            aria-label="Close modal"
            style={{
              background: "#F3F4F6",
              border: "none",
              borderRadius: "50%",
              width: "36px",
              height: "36px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: colors.text.muted,
              transition: "background 0.15s ease",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Body ── */}
        <div
          className="modal-body"
          style={{
            padding: "24px 32px",
            overflowY: "auto",
            flex: "1 1 auto",
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          {/* Top Identity Row */}
          <div
            style={{
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div
                style={{
                  width: "52px",
                  height: "52px",
                  borderRadius: "50%",
                  background: "#FFF8D9",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Ticket size={22} color="#F4BC43" />
              </div>
              <div>
                <div
                  style={{
                    fontFamily: typography.fontFamily.sans,
                    fontWeight: 700,
                    fontSize: "18px",
                    color: colors.sidebar.bg,
                  }}
                >
                  {invoiceNumber}
                </div>
                <div
                  style={{
                    fontFamily: typography.fontFamily.sans,
                    fontSize: "13px",
                    color: colors.text.muted,
                    marginTop: "2px",
                  }}
                >
                  Date: {formatDate(booking.dateTime || booking.bookingDate || booking.createdAt)}
                </div>
              </div>
            </div>
            <div
              style={{
                background: statusBg,
                borderRadius: "20px",
                padding: "6px 14px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: statusDot }} />
              <span
                style={{
                  fontFamily: typography.fontFamily.sans,
                  fontWeight: 600,
                  fontSize: "13px",
                  color: statusText,
                }}
              >
                {statusLabel}
              </span>
            </div>
          </div>

          {/* Info Cards Row */}
          <div
            style={{
              flexShrink: 0,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
            }}
          >
            {/* Customer Info */}
            <div
              style={{
                border: "1px solid rgba(0,0,0,0.18)",
                borderRadius: "8px",
                padding: "16px 20px",
                background: "#FFFFFF",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
                <User size={16} color={colors.sidebar.bg} />
                <span
                  style={{
                    fontFamily: typography.fontFamily.sans,
                    fontWeight: 700,
                    fontSize: "14px",
                    color: colors.sidebar.bg,
                  }}
                >
                  Customer Information
                </span>
              </div>
              {[
                ["Customer Name:", customerName],
                ["Mobile Number:", customerMobile],
                ["GSTN:", customerGst],
              ].map(([label, value]) => (
                <div key={label} style={{ display: "flex", gap: "8px", marginBottom: "8px", fontSize: "13px" }}>
                  <span style={{ color: colors.text.muted, minWidth: "110px" }}>{label}</span>
                  <span style={{ fontWeight: 600, color: colors.text.primary }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Booking Info */}
            <div
              style={{
                border: "1px solid rgba(0,0,0,0.18)",
                borderRadius: "8px",
                padding: "16px 20px",
                background: "#FFFFFF",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
                <Ticket size={16} color={colors.sidebar.bg} />
                <span
                  style={{
                    fontFamily: typography.fontFamily.sans,
                    fontWeight: 700,
                    fontSize: "14px",
                    color: colors.sidebar.bg,
                  }}
                >
                  Booking Information
                </span>
              </div>
              {[
                ["Invoice No:", invoiceNumber],
                ["Attraction:", attractionsNames],
                ["Date & Time:", formatDate(booking.dateTime || booking.bookingDate || booking.createdAt)],
                ["Visitors:", String(totalVisitors)],
                ["Status:", statusLabel],
              ].map(([label, value]) => (
                <div key={label} style={{ display: "flex", gap: "8px", marginBottom: "8px", fontSize: "13px" }}>
                  <span style={{ color: colors.text.muted, minWidth: "110px" }}>{label}</span>
                  <span style={{ fontWeight: 600, color: colors.text.primary }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Attractions Breakdown Table (Center Section) */}
          <div
            style={{
              flexShrink: 0,
              border: "1px solid rgba(0,0,0,0.18)",
              borderRadius: "8px",
              overflow: "hidden",
              background: "#FFFFFF",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "14px 20px",
                borderBottom: "1px solid #E5E7EB",
                background: "#F8FAFC",
              }}
            >
              <Ticket size={16} color={colors.sidebar.bg} />
              <span
                style={{
                  fontFamily: typography.fontFamily.sans,
                  fontWeight: 700,
                  fontSize: "14px",
                  color: colors.sidebar.bg,
                }}
              >
                Attractions Breakdown
              </span>
            </div>

            {/* Table Header */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "50px 1fr 140px",
                padding: "10px 20px",
                background: "#F1F5F9",
                borderBottom: "1px solid #E5E7EB",
                fontFamily: typography.fontFamily.sans,
                fontSize: "12px",
                fontWeight: 600,
                color: "#6B7280",
              }}
            >
              <span style={{ textAlign: "center" }}>#</span>
              <span>Attraction Name</span>
              <span style={{ textAlign: "right" }}>Total Amount</span>
            </div>

            {/* Table Rows */}
            {attractionsList.map((attr, idx) => (
              <div
                key={attr.id || idx}
                style={{
                  display: "grid",
                  gridTemplateColumns: "50px 1fr 140px",
                  padding: "12px 20px",
                  borderBottom: "1px solid #F3F4F6",
                  alignItems: "center",
                  fontFamily: typography.fontFamily.sans,
                }}
              >
                <span style={{ fontSize: "13px", color: "#6B7280", textAlign: "center" }}>{idx + 1}</span>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#374151" }}>{attr.name}</span>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#374151", textAlign: "right" }}>
                  ₹{Number(attr.totalAmount ?? 0).toFixed(2)}
                </span>
              </div>
            ))}

            {/* Totals row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 140px",
                padding: "14px 20px",
                background: "#FFFBEB",
                alignItems: "center",
                fontFamily: typography.fontFamily.sans,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "14px", fontWeight: 700, color: "#011B2F" }}>Total Amount</span>
                <span style={{ fontSize: "12px", color: "#6B7280" }}>
                  ({totalVisitors} visitor{totalVisitors === 1 ? "" : "s"})
                </span>
              </div>
              <span style={{ fontSize: "18px", fontWeight: 800, color: "#011B2F", textAlign: "right" }}>
                ₹{grandTotal.toFixed(2)}
              </span>
            </div>
          </div>

        </div>

        {/* ── Footer ── */}
        <div
          style={{
            padding: "16px 32px 24px 32px",
            borderTop: "1px solid #E5E7EB",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: "14px",
            background: "#FFFFFF",
            flexShrink: 0,
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={onClose}
            style={{
              height: "46px",
              padding: "0 24px",
              borderRadius: "5px",
              border: "1px solid #D1D5DB",
              background: "#FFFFFF",
              color: colors.sidebar.bg,
              fontFamily: typography.fontFamily.sans,
              fontWeight: 500,
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            Close
          </button>
          <button
            onClick={() => handleDownloadPDF(booking)}
            style={{
              height: "46px",
              width: "167px",
              borderRadius: "5px",
              border: "none",
              background: "#0C2A42",
              color: "#FFFFFF",
              fontFamily: typography.fontFamily.sans,
              fontWeight: 500,
              fontSize: "14px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            <Download size={18} />
            <span>Download PDF</span>
          </button>
          <button
            onClick={() => handlePrintInvoice(booking)}
            style={{
              height: "46px",
              width: "167px",
              borderRadius: "5px",
              border: "none",
              background: "#F4BC43",
              color: "#0C2A42",
              fontFamily: typography.fontFamily.sans,
              fontWeight: 500,
              fontSize: "14px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            <Printer size={18} />
            <span>Print Invoice</span>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes modalFadeIn {
          from { transform: scale(0.95); opacity: 0; }
          to   { transform: scale(1);    opacity: 1; }
        }
        .modal-body::-webkit-scrollbar {
          width: 6px;
        }
        .modal-body::-webkit-scrollbar-track {
          background: #F1F5F9;
          border-radius: 4px;
        }
        .modal-body::-webkit-scrollbar-thumb {
          background: #CBD5E1;
          border-radius: 4px;
        }
        .modal-body::-webkit-scrollbar-thumb:hover {
          background: #94A3B8;
        }
      `}</style>
    </div>
  );
}
