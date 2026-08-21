"use client";

import React, { useEffect } from "react";
import { X, CreditCard, Download, Printer, CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react";
import { colors, typography } from "@/lib/theme";
import { TransactionListItem, useTransactionDetail, TransactionDetail } from "@/hooks/useTransactionQueries";

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

// ── Build branded invoice HTML ────────────────────────────────────────────────
function buildInvoiceHTML(detail: TransactionDetail, listItem: TransactionListItem): string {
  const status = detail.payment?.status ?? listItem.status;
  const upper = status?.toUpperCase();
  const isSuccess = upper === "SUCCESSFUL" || upper === "SUCCESS" || upper === "CONFIRMED";
  const isCancelled = upper === "CANCELLED" || upper === "FAILED";
  const statusBg = isSuccess ? "#D1FAE5" : isCancelled ? "#FEE2E2" : "#FFF8D9";
  const statusColor = isSuccess ? "#15803D" : isCancelled ? "#DC2626" : "#D97706";
  const statusText = isSuccess ? "Successful" : isCancelled ? "Cancelled" : status || "Pending";

  const invoiceId = detail.invoiceNumber ?? (listItem.transactionId ? listItem.transactionId.replace("TXN", "INV") : "INV-" + listItem.id.slice(0, 8));
  const bookingId = detail.booking?.bookingId ?? listItem.bookingId ?? "-";
  const dateTime = formatDate(detail.transactionDate ?? listItem.transactionDate);
  const paymentMode = detail.payment?.mode ?? listItem.paymentMode ?? "-";
  const amount = Number(detail.payment?.amount ?? listItem.amount).toFixed(2);

  return `
    <div style="font-family:'Plus Jakarta Sans',Arial,sans-serif;padding:32px;color:#011B2F;background:#FFFFFF;max-width:640px;margin:auto;border-radius:16px;">
      <table style="width:100%;border-collapse:collapse;border-bottom:2px solid #F4BC43;padding-bottom:14px;margin-bottom:24px;">
        <tr>
          <td style="vertical-align:middle;padding-bottom:12px;">
            <div style="font-size:22px;font-weight:800;color:#0C2A42;letter-spacing:-0.02em;">TICKETING PLATFORM</div>
            <div style="font-size:12px;color:#6B7280;margin-top:2px;">Official Transaction Receipt</div>
          </td>
          <td style="text-align:right;vertical-align:middle;padding-bottom:12px;">
            <div style="display:inline-block;padding:5px 14px;border-radius:20px;font-weight:700;font-size:12px;background:${statusBg};color:${statusColor};">${statusText}</div>
            <div style="font-size:14px;margin-top:6px;font-weight:800;color:#0C2A42;">${listItem.transactionId}</div>
          </td>
        </tr>
      </table>

      <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:18px;margin-bottom:18px;">
        <div style="font-size:12px;font-weight:800;color:#0C2A42;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #E2E8F0;padding-bottom:8px;margin-bottom:14px;">Customer Information</div>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <tr>
            <td style="padding:6px 0;width:50%;">
              <span style="color:#64748B;font-size:11px;font-weight:600;display:block;">Transaction ID</span>
              <strong style="color:#0C2A42;font-size:13px;">${listItem.transactionId}</strong>
            </td>
            <td style="padding:6px 0;width:50%;">
              <span style="color:#64748B;font-size:11px;font-weight:600;display:block;">Date & Time</span>
              <strong style="color:#0C2A42;font-size:13px;">${dateTime}</strong>
            </td>
          </tr>
          <tr>
            <td style="padding:6px 0;">
              <span style="color:#64748B;font-size:11px;font-weight:600;display:block;">Invoice ID</span>
              <strong style="color:#0C2A42;font-size:13px;">${invoiceId}</strong>
            </td>
            <td style="padding:6px 0;">
              <span style="color:#64748B;font-size:11px;font-weight:600;display:block;">Booking ID</span>
              <strong style="color:#0C2A42;font-size:13px;">${bookingId}</strong>
            </td>
          </tr>
        </table>
      </div>

      <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:18px;margin-bottom:24px;">
        <div style="font-size:12px;font-weight:800;color:#0C2A42;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #E2E8F0;padding-bottom:8px;margin-bottom:14px;">Payment Information</div>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <tr>
            <td style="padding:6px 0;width:33.3%;">
              <span style="color:#64748B;font-size:11px;font-weight:600;display:block;">Payment Mode</span>
              <strong style="color:#0C2A42;font-size:13px;">${paymentMode}</strong>
            </td>
            <td style="padding:6px 0;width:33.3%;">
              <span style="color:#64748B;font-size:11px;font-weight:600;display:block;">Amount Paid</span>
              <strong style="color:#0C2A42;font-size:15px;">&#8377;${amount}</strong>
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
async function handleDownloadPDF(detail: TransactionDetail, listItem: TransactionListItem) {
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
  element.innerHTML = buildInvoiceHTML(detail, listItem);
  document.body.appendChild(element);

  await (window as any).html2pdf().set({
    margin: [10, 10, 10, 10],
    filename: `${listItem.transactionId}_Receipt.pdf`,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
  }).from(element).save();

  document.body.removeChild(element);
}

// ── Print via browser ─────────────────────────────────────────────────────────
function handlePrintInvoice(detail: TransactionDetail, listItem: TransactionListItem) {
  const win = window.open("", "_blank");
  if (!win) { alert("Please allow pop-ups to print receipts."); return; }
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/>
    <title>Transaction - ${listItem.transactionId}</title>
    <style>@media print { body { margin: 0; padding: 0; } }</style>
    </head><body>${buildInvoiceHTML(detail, listItem)}
    <script>window.onload = function() { window.print(); };<\/script>
    </body></html>`);
  win.document.close();
}

export default function TransactionDetailsModal({ transaction, isOpen, onClose }: TransactionDetailsModalProps) {
  const { data: detail, isLoading } = useTransactionDetail(
    transaction?.id ?? "",
    isOpen && !!transaction?.id
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

  if (!isOpen || !transaction) return null;

  const status = detail?.payment?.status ?? transaction.status;
  const upper = status?.toUpperCase();
  const isSuccess = upper === "SUCCESSFUL" || upper === "SUCCESS" || upper === "CONFIRMED";
  const isCancelled = upper === "CANCELLED" || upper === "FAILED";
  const statusText = isSuccess ? "Successful" : isCancelled ? "Cancelled" : status || "Pending";

  const invoiceId = detail?.invoiceNumber ?? (transaction.transactionId ? transaction.transactionId.replace("TXN", "INV") : "INV-" + transaction.id.slice(0, 8));
  const bookingId = detail?.booking?.bookingId ?? transaction.bookingId ?? "-";
  const dateTime = formatDate(detail?.transactionDate ?? transaction.transactionDate);
  const paymentMode = detail?.payment?.mode ?? transaction.paymentMode ?? "-";
  const amount = Number(detail?.payment?.amount ?? transaction.amount).toFixed(2);

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
          width: "100%", maxWidth: "500px", background: "#FFFFFF",
          borderRadius: "16px", boxShadow: "0 20px 50px rgba(0,0,0,0.2)",
          display: "flex", flexDirection: "column", overflow: "hidden",
          animation: "modalFadeIn 0.22s cubic-bezier(0.16,1,0.3,1)",
          maxHeight: "90vh",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        {/* ── Header ── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 24px", borderBottom: "1px solid #E5E7EB", flexShrink: 0,
        }}>
          <h2 style={{
            fontFamily: typography.fontFamily.sans, fontWeight: 700,
            fontSize: "18px", color: "#0C2A42", margin: 0,
          }}>
            Transaction Details
          </h2>
          <button onClick={onClose} aria-label="Close modal" style={{
            background: "#F3F4F6", border: "none", borderRadius: "50%",
            width: "32px", height: "32px", display: "flex", alignItems: "center",
            justifyContent: "center", cursor: "pointer", color: "#6B7280",
            transition: "background 0.15s ease",
          }}>
            <X size={18} />
          </button>
        </div>

        {/* ── Body ── */}
        <div style={{
          padding: "20px 24px", display: "flex", flexDirection: "column",
          gap: "16px", overflowY: "auto",
        }}>
          {/* ── Top Reference Banner ── */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: "#FFFDF0", border: "1.5px solid #FDE68A",
            borderRadius: "12px", padding: "14px 18px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{
                width: "42px", height: "42px", borderRadius: "50%",
                background: "#F4BC43", display: "flex", alignItems: "center",
                justifyContent: "center", flexShrink: 0,
              }}>
                <CreditCard size={20} color="#0C2A42" strokeWidth={2.2} />
              </div>
              <div>
                <div style={{
                  fontSize: "11px", fontWeight: 700, color: "#92400E",
                  textTransform: "uppercase", letterSpacing: "0.5px",
                  fontFamily: typography.fontFamily.sans,
                }}>
                  TRANSACTION REF
                </div>
                <h3 style={{
                  fontFamily: typography.fontFamily.sans, fontWeight: 700,
                  fontSize: "18px", color: "#0C2A42", margin: "2px 0 0 0",
                  letterSpacing: "-0.01em",
                }}>
                  {transaction.transactionId}
                </h3>
              </div>
            </div>

            <span style={{
              display: "inline-flex", alignItems: "center", gap: "6px",
              padding: "5px 14px", borderRadius: "20px",
              fontSize: "12px", fontWeight: 700, fontFamily: typography.fontFamily.sans,
              background: isSuccess ? "#D1FAE5" : isCancelled ? "#FEE2E2" : "#FEF3C7",
              color: isSuccess ? "#15803D" : isCancelled ? "#991B1B" : "#92400E",
            }}>
              {isSuccess ? <CheckCircle2 size={14} /> : isCancelled ? <XCircle size={14} /> : <Clock size={14} />}
              {statusText}
            </span>
          </div>

          {isLoading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "30px 0" }}>
              <Loader2 size={28} color={colors.brand.accent} style={{ animation: "spin 1s linear infinite" }} />
            </div>
          ) : (
            <>
              {/* ── Customer Information Card ── */}
              <div style={{
                background: "#F8FAFC", border: "1px solid #E2E8F0",
                borderRadius: "12px", padding: "16px 18px",
                display: "flex", flexDirection: "column",
              }}>
                <div style={{
                  fontFamily: typography.fontFamily.sans, fontWeight: 700,
                  fontSize: "12px", color: "#0C2A42", textTransform: "uppercase",
                  letterSpacing: "0.5px", borderBottom: "1px solid #E2E8F0", paddingBottom: "10px",
                  marginBottom: "14px",
                }}>
                  CUSTOMER INFORMATION
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", rowGap: "14px" }}>
                  <div>
                    <span style={{ color: "#64748B", fontSize: "11px", fontWeight: 600, display: "block", marginBottom: "3px", fontFamily: typography.fontFamily.sans }}>
                      Transaction ID
                    </span>
                    <strong style={{ color: "#0C2A42", fontWeight: 700, fontSize: "13px", fontFamily: typography.fontFamily.sans }}>
                      {transaction.transactionId}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: "#64748B", fontSize: "11px", fontWeight: 600, display: "block", marginBottom: "3px", fontFamily: typography.fontFamily.sans }}>
                      Date &amp; Time
                    </span>
                    <strong style={{ color: "#0C2A42", fontWeight: 700, fontSize: "13px", fontFamily: typography.fontFamily.sans }}>
                      {dateTime}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: "#64748B", fontSize: "11px", fontWeight: 600, display: "block", marginBottom: "3px", fontFamily: typography.fontFamily.sans }}>
                      Invoice ID
                    </span>
                    <strong style={{ color: "#0C2A42", fontWeight: 700, fontSize: "13px", fontFamily: typography.fontFamily.sans }}>
                      {invoiceId}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: "#64748B", fontSize: "11px", fontWeight: 600, display: "block", marginBottom: "3px", fontFamily: typography.fontFamily.sans }}>
                      Booking ID
                    </span>
                    <strong style={{ color: "#0C2A42", fontWeight: 700, fontSize: "13px", fontFamily: typography.fontFamily.sans }}>
                      {bookingId}
                    </strong>
                  </div>
                </div>
              </div>

              {/* ── Payment Information Card ── */}
              <div style={{
                background: "#F8FAFC", border: "1px solid #E2E8F0",
                borderRadius: "12px", padding: "16px 18px",
                display: "flex", flexDirection: "column",
              }}>
                <div style={{
                  fontFamily: typography.fontFamily.sans, fontWeight: 700,
                  fontSize: "12px", color: "#0C2A42", textTransform: "uppercase",
                  letterSpacing: "0.5px", borderBottom: "1px solid #E2E8F0", paddingBottom: "10px",
                  marginBottom: "14px",
                }}>
                  PAYMENT INFORMATION
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                  <div>
                    <span style={{ color: "#64748B", fontSize: "11px", fontWeight: 600, display: "block", marginBottom: "3px", fontFamily: typography.fontFamily.sans }}>
                      Payment Mode
                    </span>
                    <strong style={{ color: "#0C2A42", fontWeight: 700, fontSize: "13px", fontFamily: typography.fontFamily.sans }}>
                      {paymentMode}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: "#64748B", fontSize: "11px", fontWeight: 600, display: "block", marginBottom: "3px", fontFamily: typography.fontFamily.sans }}>
                      Amount Paid
                    </span>
                    <strong style={{ color: "#0C2A42", fontWeight: 700, fontSize: "15px", fontFamily: typography.fontFamily.sans }}>
                      ₹{amount}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: "#64748B", fontSize: "11px", fontWeight: 600, display: "block", marginBottom: "3px", fontFamily: typography.fontFamily.sans }}>
                      Status
                    </span>
                    <strong style={{
                      color: isSuccess ? "#16A34A" : isCancelled ? "#DC2626" : "#D97706",
                      fontWeight: 700, fontSize: "13px", fontFamily: typography.fontFamily.sans,
                    }}>
                      {statusText}
                    </strong>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{
          padding: "16px 24px", borderTop: "1px solid #E5E7EB",
          display: "flex", alignItems: "center", justifyContent: "flex-end",
          gap: "10px", background: "#FFFFFF", flexWrap: "wrap", flexShrink: 0,
        }}>
          <button
            onClick={onClose}
            style={{
              height: "40px", padding: "0 22px", borderRadius: "8px",
              border: "1.5px solid #D1D5DB", background: "#FFFFFF", color: "#0C2A42",
              fontFamily: typography.fontFamily.sans, fontWeight: 600,
              fontSize: "13px", cursor: "pointer", transition: "all 0.15s ease",
            }}
          >
            Close
          </button>
          <button
            disabled={isLoading}
            onClick={() => handleDownloadPDF(detail || ({} as any), transaction)}
            style={{
              height: "40px", padding: "0 18px", borderRadius: "8px", border: "none",
              background: isLoading ? "#9CA3AF" : "#0C2A42",
              color: "#FFFFFF", fontFamily: typography.fontFamily.sans,
              fontWeight: 600, fontSize: "13px",
              cursor: isLoading ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
              opacity: isLoading ? 0.65 : 1, transition: "all 0.15s ease",
            }}
          >
            <Download size={16} />
            <span>Download PDF</span>
          </button>
          <button
            disabled={isLoading}
            onClick={() => handlePrintInvoice(detail || ({} as any), transaction)}
            style={{
              height: "40px", padding: "0 18px", borderRadius: "8px", border: "none",
              background: isLoading ? "#e0c97a" : "#F4BC43",
              color: "#0C2A42", fontFamily: typography.fontFamily.sans,
              fontWeight: 700, fontSize: "13px",
              cursor: isLoading ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
              opacity: isLoading ? 0.65 : 1, transition: "all 0.15s ease",
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
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
