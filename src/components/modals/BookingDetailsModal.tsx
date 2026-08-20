"use client";

import React, { useEffect } from "react";
import { X, User, Ticket, Armchair, Loader2, Download, Printer } from "lucide-react";
import { colors, typography } from "@/lib/theme";
import { BookingListItem, useBookingDetail } from "@/hooks/useBookingQueries";

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
                  Booked on {formatDate(booking.bookingDate)}
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
                    ["Customer Name:", detail?.customer?.name ?? booking.customerName],
                    ["Mobile Number:", detail?.customer?.mobile ?? booking.mobileNumber],
                    ["GSTN:", detail?.customer?.gstNumber ?? "N/A"],
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
                    ["Visit Date:", formatDate(detail?.visitAt ?? booking.bookingDate)],
                    ["Payment Mode:", detail?.payment?.mode ?? booking.paymentMode ?? "-"],
                  ].map(([label, value]) => (
                    <div key={label} style={{ display: "flex", gap: "8px", marginBottom: "8px", fontSize: "13px" }}>
                      <span style={{ color: colors.text.muted, minWidth: "110px" }}>{label}</span>
                      <span style={{ fontWeight: 600, color: colors.text.primary }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ticket Summary */}
              {detail?.items && detail.items.length > 0 && (
                <div style={{ border: "2px solid #e6eaef", borderRadius: "8px" }}>
                  <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
                    <span style={{ fontFamily: typography.fontFamily.sans, fontWeight: 700, fontSize: "14px", color: "#011B2F" }}>
                      Ticket Summary
                    </span>
                  </div>
                  {/* Header */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 120px 120px", padding: "10px 20px", background: "#F1F5F9", borderBottom: "1px solid #E5E7EB" }}>
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "#6B7280" }}>Category</span>
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "#6B7280", textAlign: "center" }}>Quantity</span>
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "#6B7280", textAlign: "right" }}>Unit Price</span>
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "#6B7280", textAlign: "right" }}>Total</span>
                  </div>
                  {detail.items.map((item, idx) => (
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
                      {detail.items.reduce((s, i) => s + i.quantity, 0)}
                    </span>
                    <span />
                    <span style={{ fontSize: "18px", fontWeight: 800, color: "#011B2F", textAlign: "right" }}>
                      ₹{Number(detail.payment?.totalAmount ?? booking.amount).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

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
                <div style={{ display: "flex", fontSize: "13px" }}>
                  <div style={{ flex: 1, borderRight: "1px solid #E5E7EB", paddingRight: "20px" }}>
                    <span style={{ color: colors.text.muted }}>Total Amount: </span>
                    <strong style={{ color: colors.text.primary }}>₹{Number(detail?.payment?.totalAmount ?? booking.amount).toFixed(2)}</strong>
                  </div>
                  <div style={{ paddingLeft: "20px" }}>
                    <span style={{ color: colors.text.muted }}>Amount Paid: </span>
                    <strong style={{ color: colors.text.primary }}>₹{Number(detail?.payment?.amountPaid ?? booking.amountPaid).toFixed(2)}</strong>
                  </div>
                </div>
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
          <button style={{
            height: "46px", width: "167px", borderRadius: "5px", border: "none",
            background: "#0C2A42", color: "#FFFFFF", fontFamily: typography.fontFamily.sans,
            fontWeight: 500, fontSize: "14px", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
          }}>
            <Download size={18} />
            <span>Download PDF</span>
          </button>
          <button style={{
            height: "46px", width: "167px", borderRadius: "5px", border: "none",
            background: "#F4BC43", color: "#0C2A42", fontFamily: typography.fontFamily.sans,
            fontWeight: 500, fontSize: "14px", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
          }}>
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
