"use client";

import React, { useEffect } from "react";
import { X, FileText, Download, Printer, Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { colors, typography } from "@/lib/theme";
import { InvoiceListItem, useInvoiceDetail, InvoiceDetail } from "@/hooks/useInvoiceQueries";

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
function buildInvoiceHTML(detail: InvoiceDetail, listItem: InvoiceListItem): string {
  const status = detail.status ?? detail.payment?.status ?? listItem.status ?? "-";
  const upper = status.toUpperCase();
  const isSuccess = upper === "SUCCESS" || upper === "SUCCESSFUL" || upper === "CONFIRMED" || upper === "PAID";
  const isFailed = upper === "FAILED" || upper === "CANCELLED";
  const statusBg = isSuccess ? "#B5FFE7" : isFailed ? "#FEE2E2" : "#FFF8D9";
  const statusColor = isSuccess ? "#119167" : isFailed ? "#DC2626" : "#D97706";

  const customerName = detail.customer?.name ?? listItem.customerName ?? "-";
  const mobile = detail.customer?.mobile ?? "-";
  const gstn = detail.customer?.gstNumber ?? "N/A";
  const attractionName = detail.attraction?.name ?? listItem.attraction?.name ?? "-";
  const bookingId = detail.booking?.bookingId ?? listItem.bookingId ?? "-";
  const transactionId = detail.transactionId ?? listItem.transactionId ?? "-";
  const invoiceNumber = detail.invoiceId ?? detail.invoiceNumber ?? listItem.invoiceId ?? listItem.invoiceNumber ?? "-";
  const invoiceDate = formatDate(detail.dateTime ?? detail.invoiceDate ?? listItem.dateTime ?? listItem.invoiceDate);
  const paymentMode = detail.paymentMode ?? detail.payment?.mode ?? listItem.paymentMode ?? "-";
  const amount = Number(detail.amount ?? detail.payment?.amount ?? listItem.amount ?? 0).toFixed(2);

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
            <div style="font-size:11px;color:#6B7280;">Txn: ${transactionId}</div>
          </td>
        </tr>
      </table>

      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <tr>
          <td style="width:50%;vertical-align:top;padding-right:8px;">
            <div style="background:#F8FAFC;padding:14px;border-radius:8px;border:1px solid #E2E8F0;">
              <div style="font-size:14px;font-weight:bold;color:#0C2A42;margin-bottom:10px;">Customer Information</div>
              <div style="font-size:13px;margin-bottom:4px;"><strong>Name:</strong> ${customerName}</div>
              <div style="font-size:13px;margin-bottom:4px;"><strong>Mobile:</strong> ${mobile}</div>
              <div style="font-size:13px;"><strong>GSTN:</strong> ${gstn}</div>
            </div>
          </td>
          <td style="width:50%;vertical-align:top;padding-left:8px;">
            <div style="background:#F8FAFC;padding:14px;border-radius:8px;border:1px solid #E2E8F0;">
              <div style="font-size:14px;font-weight:bold;color:#0C2A42;margin-bottom:10px;">Invoice & Booking Info</div>
              <div style="font-size:13px;margin-bottom:4px;"><strong>Attraction:</strong> ${attractionName}</div>
              <div style="font-size:13px;margin-bottom:4px;"><strong>Booking ID:</strong> ${bookingId}</div>
              <div style="font-size:13px;"><strong>Date:</strong> ${invoiceDate}</div>
            </div>
          </td>
        </tr>
      </table>

      <div style="border:1.5px solid #0084FF;border-radius:8px;padding:16px 14px;background:#F0F9FF;margin-bottom:20px;">
        <div style="font-size:14px;font-weight:bold;color:#0C2A42;margin-bottom:12px;">Payment Summary</div>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <tr>
            <td style="padding:4px 0;width:50%;"><strong style="color:#0C2A42;">Payment Mode:</strong> ${paymentMode}</td>
            <td style="padding:4px 0;text-align:right;"><strong style="color:#0C2A42;">Status:</strong> ${status}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;"><strong style="color:#0C2A42;">Invoice Amount:</strong> &#8377;${amount}</td>
            <td style="padding:4px 0;text-align:right;"><strong style="color:#0C2A42;">Total Paid:</strong> &#8377;${amount}</td>
          </tr>
        </table>
      </div>

      <div style="text-align:center;margin-top:30px;font-size:12px;color:#9CA3AF;">
        Thank you for your visit. This is a computer generated invoice and requires no physical signature.
      </div>
    </div>`;
}

// ── Download PDF via html2pdf.js (CDN) ───────────────────────────────────────
async function handleDownloadPDF(detail: InvoiceDetail, listItem: InvoiceListItem) {
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
  element.innerHTML = buildInvoiceHTML(detail, listItem);
  document.body.appendChild(element);

  const invNum = detail.invoiceNumber || listItem.invoiceNumber || "Invoice";
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
function handlePrintInvoice(detail: InvoiceDetail, listItem: InvoiceListItem) {
  const win = window.open("", "_blank");
  if (!win) {
    alert("Please allow pop-ups to print invoices.");
    return;
  }
  const invNum = detail.invoiceNumber || listItem.invoiceNumber || "Invoice";
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/>
    <title>${invNum}</title>
    <style>@media print { body { margin: 0; padding: 0; } }</style>
    </head><body>${buildInvoiceHTML(detail, listItem)}
    <script>window.onload = function() { window.print(); };<\/script>
    </body></html>`);
  win.document.close();
}

export default function InvoiceDetailsModal({
  invoice,
  isOpen = true,
  onClose,
}: InvoiceDetailsModalProps) {
  const { data: detail, isLoading } = useInvoiceDetail(
    invoice?.id ?? "",
    Boolean(isOpen && invoice?.id)
  );

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

  const status = detail?.status ?? detail?.payment?.status ?? invoice.status ?? "-";
  const upper = status.toUpperCase();
  const isSuccess = upper === "SUCCESS" || upper === "SUCCESSFUL" || upper === "CONFIRMED" || upper === "PAID";
  const isFailed = upper === "FAILED" || upper === "CANCELLED";

  const invNumber = detail?.invoiceId ?? detail?.invoiceNumber ?? invoice.invoiceId ?? invoice.invoiceNumber ?? "-";
  const invDate = formatDate(detail?.dateTime ?? detail?.invoiceDate ?? invoice.dateTime ?? invoice.invoiceDate);

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
          maxWidth: "560px",
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
            gap: "18px",
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

          {isLoading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 0" }}>
              <Loader2 size={30} color={colors.brand.accent} style={{ animation: "spin 1s linear infinite" }} />
            </div>
          ) : (
            <>
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
                  Customer Information
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", fontSize: "13px" }}>
                  <div>
                    <span style={{ color: "#64748B", fontSize: "11px", fontWeight: 600, display: "block", fontFamily: typography.fontFamily.sans }}>Name</span>
                    <strong style={{ color: "#0F172A", fontWeight: 700, fontFamily: typography.fontFamily.sans }}>
                      {detail?.customer?.name ?? invoice.customerName ?? "-"}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: "#64748B", fontSize: "11px", fontWeight: 600, display: "block", fontFamily: typography.fontFamily.sans }}>Mobile</span>
                    <strong style={{ color: "#0F172A", fontWeight: 700, fontFamily: typography.fontFamily.sans }}>
                      {detail?.customer?.mobile ?? "-"}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: "#64748B", fontSize: "11px", fontWeight: 600, display: "block", fontFamily: typography.fontFamily.sans }}>GSTN</span>
                    <strong style={{ color: "#0F172A", fontWeight: 700, fontFamily: typography.fontFamily.sans }}>
                      {detail?.customer?.gstNumber ?? "N/A"}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: "#64748B", fontSize: "11px", fontWeight: 600, display: "block", fontFamily: typography.fontFamily.sans }}>Attraction</span>
                    <strong style={{ color: "#0F172A", fontWeight: 700, fontFamily: typography.fontFamily.sans }}>
                      {detail?.attraction?.name ?? invoice.attraction?.name ?? "-"}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Invoice & Booking Information Card */}
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
                  Invoice & Booking Information
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", fontSize: "13px" }}>
                  <div>
                    <span style={{ color: "#64748B", fontSize: "11px", fontWeight: 600, display: "block", fontFamily: typography.fontFamily.sans }}>Invoice ID</span>
                    <strong style={{ color: "#0F172A", fontWeight: 700, fontFamily: typography.fontFamily.sans }}>
                      {invNumber}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: "#64748B", fontSize: "11px", fontWeight: 600, display: "block", fontFamily: typography.fontFamily.sans }}>Invoice Date</span>
                    <strong style={{ color: "#0F172A", fontWeight: 700, fontFamily: typography.fontFamily.sans }}>
                      {invDate}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: "#64748B", fontSize: "11px", fontWeight: 600, display: "block", fontFamily: typography.fontFamily.sans }}>Visit Date</span>
                    <strong style={{ color: "#0F172A", fontWeight: 700, fontFamily: typography.fontFamily.sans }}>
                      {formatDate(detail?.visitAt ?? invoice.visitAt)}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: "#64748B", fontSize: "11px", fontWeight: 600, display: "block", fontFamily: typography.fontFamily.sans }}>Visitors</span>
                    <strong style={{ color: "#0F172A", fontWeight: 700, fontFamily: typography.fontFamily.sans }}>
                      {detail?.visitors ?? invoice.visitors ?? "-"}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: "#64748B", fontSize: "11px", fontWeight: 600, display: "block", fontFamily: typography.fontFamily.sans }}>Transaction ID</span>
                    <strong style={{ color: "#0F172A", fontWeight: 700, fontFamily: typography.fontFamily.sans }}>
                      {detail?.transactionId ?? invoice.transactionId ?? "-"}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: "#64748B", fontSize: "11px", fontWeight: 600, display: "block", fontFamily: typography.fontFamily.sans }}>Booking ID</span>
                    <strong style={{ color: "#0F172A", fontWeight: 700, fontFamily: typography.fontFamily.sans }}>
                      {detail?.booking?.bookingId ?? invoice.bookingId ?? "-"}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Payment Information Card */}
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
                  Payment Information
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", fontSize: "13px" }}>
                  <div>
                    <span style={{ color: "#64748B", fontSize: "11px", fontWeight: 600, display: "block", fontFamily: typography.fontFamily.sans }}>Payment Mode</span>
                    <strong style={{ color: "#0F172A", fontWeight: 700, fontFamily: typography.fontFamily.sans }}>
                      {detail?.payment?.mode ?? invoice.paymentMode ?? "-"}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: "#64748B", fontSize: "11px", fontWeight: 600, display: "block", fontFamily: typography.fontFamily.sans }}>Total Amount</span>
                    <strong style={{ color: "#0F172A", fontWeight: 700, fontSize: "15px", fontFamily: typography.fontFamily.sans }}>
                      ₹{Number(detail?.payment?.amount ?? invoice.amount ?? 0).toFixed(2)}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: "#64748B", fontSize: "11px", fontWeight: 600, display: "block", fontFamily: typography.fontFamily.sans }}>Status</span>
                    <strong
                      style={{
                        color: isSuccess ? "#119167" : isFailed ? "#DC2626" : "#D97706",
                        fontWeight: 700,
                        fontFamily: typography.fontFamily.sans,
                      }}
                    >
                      {status}
                    </strong>
                  </div>
                </div>
              </div>
            </>
          )}
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
            disabled={isLoading || !detail}
            onClick={() => detail && handleDownloadPDF(detail, invoice)}
            style={{
              height: "40px",
              padding: "0 18px",
              borderRadius: "8px",
              border: "none",
              background: isLoading || !detail ? "#9CA3AF" : "#0C2A42",
              color: "#FFFFFF",
              fontFamily: typography.fontFamily.sans,
              fontWeight: 600,
              fontSize: "13px",
              cursor: isLoading || !detail ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              opacity: isLoading || !detail ? 0.65 : 1,
            }}
          >
            <Download size={16} />
            <span>Download PDF</span>
          </button>
          <button
            disabled={isLoading || !detail}
            onClick={() => detail && handlePrintInvoice(detail, invoice)}
            style={{
              height: "40px",
              padding: "0 18px",
              borderRadius: "8px",
              border: "none",
              background: isLoading || !detail ? "#e0c97a" : "#F4BC43",
              color: "#0C2A42",
              fontFamily: typography.fontFamily.sans,
              fontWeight: 700,
              fontSize: "13px",
              cursor: isLoading || !detail ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              opacity: isLoading || !detail ? 0.65 : 1,
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
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
