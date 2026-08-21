"use client";

import React, { useEffect } from "react";
import { X, User, Ticket, Armchair, Loader2, Download, Printer } from "lucide-react";
import { colors, typography } from "@/lib/theme";
import { BookingListItem, useBookingDetail, BookingDetailItem } from "@/hooks/useBookingQueries";

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

// ── Generate branded invoice HTML from detail data ────────────────────────────
function buildInvoiceHTML(detail: BookingDetailItem, booking: BookingListItem): string {
  const status = detail.status ?? booking.status;
  const upper = status?.toUpperCase();
  const statusBg = upper === "CONFIRMED" ? "#B5FFE7" : upper === "CANCELLED" ? "#FEE2E2" : "#FFF8D9";
  const statusColor = upper === "CONFIRMED" ? "#119167" : upper === "CANCELLED" ? "#DC2626" : "#D97706";

  const ticketsList = (detail.tickets && detail.tickets.length > 0)
    ? detail.tickets
    : (detail.items && detail.items.length > 0)
    ? detail.items
    : (booking.tickets && booking.tickets.length > 0)
    ? booking.tickets
    : [];

  const itemsHtml = ticketsList.map((item) => `
    <tr>
      <td style="padding:10px 14px;border-bottom:1px solid #E5E7EB;">${item.category}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #E5E7EB;text-align:center;">${item.quantity}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #E5E7EB;text-align:right;">&#8377;${Number(item.unitPrice).toFixed(2)}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #E5E7EB;text-align:right;font-weight:600;">&#8377;${Number(item.totalPrice).toFixed(2)}</td>
    </tr>`).join("");

  const seatsHtml = (detail.seats || []).length > 0
    ? `<div style="background:#F8FAFC;padding:14px;border-radius:8px;border:1px solid #E2E8F0;margin-bottom:20px;font-size:13px;">
        <h4 style="margin:0 0 8px 0;font-size:14px;color:#0C2A42;">Seating Details</h4>
        <div>${(detail.seats || []).map((s) => `${s.bogie ? `Bogie ${s.bogie} – ` : ""}${s.seatNumber ?? "Seat"}`).join(", ")}</div>
      </div>`
    : "";

  const totalAmount = Number(typeof detail.amount === "object" ? (detail.amount.total ?? detail.amount.subtotal) : (detail.payment?.totalAmount ?? detail.amount ?? booking.amount ?? 0));
  const amountPaid = Number(typeof detail.amount === "object" ? (detail.amount.paid) : (detail.payment?.amountPaid ?? booking.amountPaid ?? totalAmount));
  const totalVisitors = detail.visitors?.total ?? booking.visitors?.total ?? ticketsList.reduce((s, i) => s + (i.quantity || 0), 0);

  const customerName = detail.customer?.name ?? booking.customer?.name ?? booking.customerName;
  const customerMobile = detail.customer?.mobileNumber ?? detail.customer?.mobile ?? booking.customer?.mobileNumber ?? booking.customer?.mobile ?? booking.mobileNumber ?? "-";
  const customerGst = detail.customer?.gstNumber ?? booking.customer?.gstNumber ?? "N/A";
  const visitDate = formatDate(detail.dateTime ?? detail.visitAt ?? booking.dateTime ?? booking.bookingDate);
  const paymentMode = detail.paymentMode ?? detail.payment?.mode ?? booking.paymentMode ?? "-";

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
            <div style="font-size:13px;margin-top:4px;font-weight:bold;color:#0C2A42;">${booking.bookingId}</div>
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
              <div style="font-size:13px;margin-bottom:4px;"><strong>Attraction:</strong> ${detail.attraction?.name ?? booking.attraction?.name ?? "-"}</div>
              <div style="font-size:13px;margin-bottom:4px;"><strong>Date & Time:</strong> ${visitDate}</div>
              <div style="font-size:13px;"><strong>Payment Mode:</strong> ${paymentMode}</div>
            </div>
          </td>
        </tr>
      </table>

      ${ticketsList.length > 0 ? `
      <div style="border:2px solid #0084FF;border-radius:8px;overflow:hidden;margin-bottom:20px;">
        <div style="padding:10px 14px;background:#FFFFFF;border-bottom:1px solid #E5E7EB;font-weight:bold;font-size:14px;color:#0C2A42;">Ticket Summary</div>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:rgba(179,175,175,0.17);color:#374151;font-weight:600;">
              <th style="padding:10px 14px;text-align:left;">Category</th>
              <th style="padding:10px 14px;text-align:center;">Quantity</th>
              <th style="padding:10px 14px;text-align:right;">Unit Price</th>
              <th style="padding:10px 14px;text-align:right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
            <tr style="background:#FFFBEB;font-weight:bold;">
              <td style="padding:12px 14px;color:#0C2A42;">Total Visitors</td>
              <td style="padding:12px 14px;text-align:center;color:#0C2A42;">${totalVisitors}</td>
              <td style="padding:12px 14px;"></td>
              <td style="padding:12px 14px;text-align:right;font-size:16px;color:#0C2A42;">&#8377;${totalAmount.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>` : ""}

      ${seatsHtml}

      <div style="border:1.5px solid #0084FF;border-radius:8px;padding:16px 14px;background:#F0F9FF;margin-bottom:20px;">
        <div style="font-size:14px;font-weight:bold;color:#0C2A42;margin-bottom:12px;">Payment Summary</div>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <tr>
            <td style="padding:4px 0;color:#6B7280;width:50%;"><strong style="color:#0C2A42;">Payment Mode:</strong> ${paymentMode}</td>
            <td style="padding:4px 0;text-align:right;"><strong style="color:#0C2A42;">Status:</strong> Paid in Full</td>
          </tr>
          <tr>
            <td style="padding:4px 0;"><strong style="color:#0C2A42;">Total Amount:</strong> &#8377;${totalAmount.toFixed(2)}</td>
            <td style="padding:4px 0;text-align:right;"><strong style="color:#0C2A42;">Amount Paid:</strong> &#8377;${amountPaid.toFixed(2)}</td>
          </tr>
        </table>
      </div>

      <div style="text-align:center;margin-top:30px;font-size:12px;color:#9CA3AF;">
        Thank you for booking with us! Please present this receipt at the entry counter.
      </div>
    </div>`;
}

// ── Download PDF using html2pdf.js (CDN-loaded on demand) ────────────────────
async function handleDownloadPDF(detail: BookingDetailItem, booking: BookingListItem) {
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
  element.style.width = "750px";
  element.innerHTML = buildInvoiceHTML(detail, booking);
  document.body.appendChild(element);

  await (window as any).html2pdf().set({
    margin: [10, 10, 10, 10],
    filename: `${booking.bookingId}_Invoice.pdf`,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
  }).from(element).save();

  document.body.removeChild(element);
}

// ── Print Invoice via browser print window ────────────────────────────────────
function handlePrintInvoice(detail: BookingDetailItem, booking: BookingListItem) {
  const win = window.open("", "_blank");
  if (!win) { alert("Please allow pop-ups to print invoices."); return; }
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/>
    <title>Invoice - ${booking.bookingId}</title>
    <style>@media print { body { margin: 0; padding: 0; } }</style>
    </head><body>${buildInvoiceHTML(detail, booking)}
    <script>window.onload = function() { window.print(); };<\/script>
    </body></html>`);
  win.document.close();
}

export default function BookingDetailsModal({ booking, isOpen, onClose }: BookingDetailsModalProps) {
  const { data: detail, isLoading } = useBookingDetail(
    booking?.id ?? "",
    isOpen && !!booking?.id
  );

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

  const status = detail?.status ?? booking.status;
  const upper = status?.toUpperCase();
  const isConfirmed = upper === "CONFIRMED";
  const isCancelled = upper === "CANCELLED";
  const statusBg = isConfirmed ? "#B5FFE7" : isCancelled ? "#FEE2E2" : "rgba(255,248,217,0.93)";
  const statusDot = isConfirmed ? "#119167" : isCancelled ? "rgba(220,38,38,0.88)" : "#D97706";
  const statusText = isConfirmed ? "#119167" : isCancelled ? "rgba(220,38,38,0.86)" : "#D97706";
  const statusLabel = isConfirmed ? "Confirmed" : isCancelled ? "Cancelled" : "Pending";

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
        padding: "16px", overflowY: "auto",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: "832px", background: "#FFFFFF",
          borderRadius: "26px", boxShadow: "0 20px 50px rgba(0,0,0,0.2)",
          display: "flex", flexDirection: "column", overflow: "hidden",
          animation: "modalFadeIn 0.22s cubic-bezier(0.16,1,0.3,1)",
          maxHeight: "92vh",
        }}
      >
        {/* ── Header ── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 32px", borderBottom: "1px solid #E5E7EB", flexShrink: 0,
        }}>
          <h2 style={{
            fontFamily: typography.fontFamily.sans, fontWeight: 700,
            fontSize: "20px", color: colors.sidebar.bg, margin: 0,
          }}>
            Booking Details
          </h2>
          <button onClick={onClose} aria-label="Close modal" style={{
            background: "#F3F4F6", border: "none", borderRadius: "50%",
            width: "36px", height: "36px", display: "flex", alignItems: "center",
            justifyContent: "center", cursor: "pointer", color: colors.text.muted,
          }}>
            <X size={20} />
          </button>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: "24px 32px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "20px" }}>

          {/* Top Identity Row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div style={{
                width: "52px", height: "52px", borderRadius: "50%", background: "#FFF8D9",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <Ticket size={22} color="#F4BC43" />
              </div>
              <div>
                <div style={{ fontFamily: typography.fontFamily.sans, fontWeight: 700, fontSize: "18px", color: colors.sidebar.bg }}>
                  {booking.bookingId}
                </div>
                <div style={{ fontFamily: typography.fontFamily.sans, fontSize: "13px", color: colors.text.muted, marginTop: "2px" }}>
                  Date: {formatDate(booking.dateTime || booking.bookingDate)}
                </div>
              </div>
            </div>
            <div style={{
              background: statusBg, borderRadius: "20px", padding: "6px 14px",
              display: "flex", alignItems: "center", gap: "6px",
            }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: statusDot }} />
              <span style={{ fontFamily: typography.fontFamily.sans, fontWeight: 600, fontSize: "13px", color: statusText }}>
                {statusLabel}
              </span>
            </div>
          </div>

          {isLoading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 0" }}>
              <Loader2 size={32} color={colors.brand.accent} style={{ animation: "spin 1s linear infinite" }} />
            </div>
          ) : (
            <>
              {/* Info Cards Row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                {/* Customer Info */}
                <div style={{ border: "1px solid rgba(0,0,0,0.22)", borderRadius: "8px", padding: "16px 20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
                    <User size={16} color={colors.sidebar.bg} />
                    <span style={{ fontFamily: typography.fontFamily.sans, fontWeight: 700, fontSize: "14px", color: colors.sidebar.bg }}>
                      Customer Information
                    </span>
                  </div>
                  {[
                    ["Customer Name:", detail?.customer?.name ?? booking.customer?.name ?? booking.customerName],
                    ["Mobile Number:", detail?.customer?.mobileNumber ?? detail?.customer?.mobile ?? booking.customer?.mobileNumber ?? booking.customer?.mobile ?? booking.mobileNumber],
                    ["GSTN:", detail?.customer?.gstNumber ?? booking.customer?.gstNumber ?? "N/A"],
                  ].map(([label, value]) => (
                    <div key={label} style={{ display: "flex", gap: "8px", marginBottom: "8px", fontSize: "13px" }}>
                      <span style={{ color: colors.text.muted, minWidth: "110px" }}>{label}</span>
                      <span style={{ fontWeight: 600, color: colors.text.primary }}>{value}</span>
                    </div>
                  ))}
                </div>

                {/* Booking Info */}
                <div style={{ border: "1px solid rgba(0,0,0,0.22)", borderRadius: "8px", padding: "16px 20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
                    <Ticket size={16} color={colors.sidebar.bg} />
                    <span style={{ fontFamily: typography.fontFamily.sans, fontWeight: 700, fontSize: "14px", color: colors.sidebar.bg }}>
                      Booking Information
                    </span>
                  </div>
                  {[
                    ["Attraction:", detail?.attraction?.name ?? booking.attraction?.name ?? "-"],
                    ["Date & Time:", formatDate(detail?.dateTime ?? detail?.visitAt ?? booking.dateTime ?? booking.bookingDate)],
                    ["Visitors:", String(detail?.visitors?.total ?? booking.visitors?.total ?? "-")],
                    ["Payment Mode:", detail?.paymentMode ?? detail?.payment?.mode ?? booking.paymentMode ?? "-"],
                  ].map(([label, value]) => (
                    <div key={label} style={{ display: "flex", gap: "8px", marginBottom: "8px", fontSize: "13px" }}>
                      <span style={{ color: colors.text.muted, minWidth: "110px" }}>{label}</span>
                      <span style={{ fontWeight: 600, color: colors.text.primary }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ticket Summary */}
              {(() => {
                const ticketsList = (detail?.tickets && detail.tickets.length > 0)
                  ? detail.tickets
                  : (detail?.items && detail.items.length > 0)
                  ? detail.items
                  : (booking.tickets && booking.tickets.length > 0)
                  ? booking.tickets
                  : [];
                if (ticketsList.length === 0) return null;
                const totalAmt = typeof detail?.amount === "object" && detail.amount !== null
                  ? Number(detail.amount.total ?? detail.amount.subtotal ?? 0)
                  : Number(detail?.payment?.totalAmount ?? booking.amount ?? 0);
                return (
                  <div style={{ border: "2px solid #e6eaef", borderRadius: "8px" }}>
                    <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
                      <span style={{ fontFamily: typography.fontFamily.sans, fontWeight: 700, fontSize: "14px", color: "#011B2F" }}>
                        Ticket Summary
                      </span>
                    </div>
                    {/* Header */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 120px 120px", padding: "10px 20px", background: "#F1F5F9", borderBottom: "1px solid #E5E7EB" }}>
                      <span style={{ fontSize: "12px", fontWeight: 600, color: "#6B7280" }}>Category</span>
                      <span style={{ fontSize: "12px", fontWeight: 600, color: "#6B7280", textAlign: "center" }}>Qty</span>
                      <span style={{ fontSize: "12px", fontWeight: 600, color: "#6B7280", textAlign: "right" }}>Unit Price</span>
                      <span style={{ fontSize: "12px", fontWeight: 600, color: "#6B7280", textAlign: "right" }}>Total</span>
                    </div>
                    {ticketsList.map((item, idx) => (
                      <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 120px 120px 120px", padding: "12px 20px", borderBottom: "1px solid #F3F4F6" }}>
                        <span style={{ fontSize: "13px", fontWeight: 500, color: "#374151" }}>{item.category}</span>
                        <span style={{ fontSize: "13px", color: "#374151", textAlign: "center" }}>{item.quantity}</span>
                        <span style={{ fontSize: "13px", color: "#374151", textAlign: "right" }}>₹{Number(item.unitPrice).toFixed(2)}</span>
                        <span style={{ fontSize: "13px", fontWeight: 600, color: "#374151", textAlign: "right" }}>₹{Number(item.totalPrice).toFixed(2)}</span>
                      </div>
                    ))}
                    {/* Totals row */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 120px 120px", padding: "14px 20px", background: "#FFFBEB" }}>
                      <span style={{ fontSize: "14px", fontWeight: 700, color: "#011B2F" }}>Total Visitors</span>
                      <span style={{ fontSize: "14px", fontWeight: 700, color: "#011B2F", textAlign: "center" }}>
                        {detail?.visitors?.total ?? booking.visitors?.total ?? ticketsList.reduce((s, i) => s + (i.quantity || 0), 0)}
                      </span>
                      <span />
                      <span style={{ fontSize: "18px", fontWeight: 800, color: "#011B2F", textAlign: "right" }}>
                        ₹{totalAmt.toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Seats */}
              {detail?.seats && detail.seats.length > 0 && (
                <div style={{ border: "1px solid rgba(0,0,0,0.22)", borderRadius: "8px", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <Armchair size={18} color={colors.sidebar.bg} />
                    <span style={{ fontFamily: typography.fontFamily.sans, fontWeight: 700, fontSize: "13px", color: colors.sidebar.bg }}>
                      Seat Details
                    </span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {detail.seats.map((seat, idx) => (
                      <span key={idx} style={{
                        background: "rgba(35,114,165,0.08)", color: colors.brand.accent,
                        padding: "4px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: 600,
                      }}>
                        {seat.bogie ? `Bogie ${seat.bogie} – ` : ""}{seat.seatNumber ?? `Seat ${idx + 1}`}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Payment Summary */}
              <div style={{ border: "1px solid rgba(0,0,0,0.22)", borderRadius: "8px", padding: "16px 20px" }}>
                <span style={{ fontFamily: typography.fontFamily.sans, fontWeight: 700, fontSize: "14px", color: colors.sidebar.bg, display: "block", marginBottom: "10px" }}>
                  Payment Summary
                </span>
                {(() => {
                  const amtObj = typeof detail?.amount === "object" && detail.amount !== null ? detail.amount : null;
                  const total = amtObj ? Number(amtObj.total ?? amtObj.subtotal ?? 0) : Number(detail?.payment?.totalAmount ?? booking.amount ?? 0);
                  const paid = amtObj ? Number(amtObj.paid ?? 0) : Number(detail?.payment?.amountPaid ?? booking.amountPaid ?? total);
                  const due = amtObj ? Number(amtObj.due ?? 0) : Number(detail?.payment?.amountDue ?? booking.amountDue ?? 0);
                  const gst = amtObj ? Number(amtObj.gstAmount ?? 0) : 0;
                  return (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "13px" }}>
                      <div>
                        <span style={{ color: colors.text.muted }}>Total Amount: </span>
                        <strong style={{ color: colors.text.primary }}>₹{total.toFixed(2)}</strong>
                      </div>
                      <div>
                        <span style={{ color: colors.text.muted }}>Amount Paid: </span>
                        <strong style={{ color: "#119167" }}>₹{paid.toFixed(2)}</strong>
                      </div>
                      {gst > 0 && (
                        <div>
                          <span style={{ color: colors.text.muted }}>GST: </span>
                          <strong style={{ color: colors.text.primary }}>₹{gst.toFixed(2)}</strong>
                        </div>
                      )}
                      {due > 0 && (
                        <div>
                          <span style={{ color: colors.text.muted }}>Amount Due: </span>
                          <strong style={{ color: "#DC2626" }}>₹{due.toFixed(2)}</strong>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{
          padding: "16px 32px 24px 32px", borderTop: "1px solid #E5E7EB",
          display: "flex", alignItems: "center", justifyContent: "flex-end",
          gap: "14px", background: "#FFFFFF", flexShrink: 0, flexWrap: "wrap",
        }}>
          <button onClick={onClose} style={{
            height: "46px", padding: "0 24px", borderRadius: "5px", border: "1px solid #D1D5DB",
            background: "#FFFFFF", color: colors.sidebar.bg, fontFamily: typography.fontFamily.sans,
            fontWeight: 500, fontSize: "14px", cursor: "pointer",
          }}>
            Close
          </button>
          <button
            disabled={isLoading || !detail}
            onClick={() => detail && handleDownloadPDF(detail, booking)}
            style={{
              height: "46px", width: "167px", borderRadius: "5px", border: "none",
              background: isLoading || !detail ? "#9CA3AF" : "#0C2A42",
              color: "#FFFFFF", fontFamily: typography.fontFamily.sans,
              fontWeight: 500, fontSize: "14px",
              cursor: isLoading || !detail ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              opacity: isLoading || !detail ? 0.65 : 1,
            }}
          >
            <Download size={18} />
            <span>Download PDF</span>
          </button>
          <button
            disabled={isLoading || !detail}
            onClick={() => detail && handlePrintInvoice(detail, booking)}
            style={{
              height: "46px", width: "167px", borderRadius: "5px", border: "none",
              background: isLoading || !detail ? "#e0c97a" : "#F4BC43",
              color: "#0C2A42", fontFamily: typography.fontFamily.sans,
              fontWeight: 500, fontSize: "14px",
              cursor: isLoading || !detail ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              opacity: isLoading || !detail ? 0.65 : 1,
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
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
