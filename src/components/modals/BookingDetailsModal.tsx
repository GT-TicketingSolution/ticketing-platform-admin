"use client";

import React from "react";
import { X, User, Ticket, Armchair, Printer, Download } from "lucide-react";
import { Booking, TicketSummaryItem } from "@/types/booking";
import { colors, typography } from "@/lib/theme";

interface BookingDetailsModalProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
  onPrint?: (booking: Booking) => void;
  onDownloadPDF?: (booking: Booking) => void;
}

/** Helper to ensure ticket summary array is NEVER empty or undefined */
export function getTicketSummary(booking: Booking): TicketSummaryItem[] {
  if (booking.ticketSummary && booking.ticketSummary.length > 0) {
    return booking.ticketSummary;
  }

  const visitorsStr = booking.visitors || "1 Adult";
  const parts = visitorsStr.split("+").map((s) => s.trim());
  const items: TicketSummaryItem[] = [];

  parts.forEach((part) => {
    const match = part.match(
      /(\d+)\s*(Adult|Adults|Child|Children|Student|Students|Senior|Seniors|Foreigner|Foreigners)/i
    );
    if (match) {
      const qty = parseInt(match[1], 10);
      const rawCat = match[2].toLowerCase();
      let category: TicketSummaryItem["category"] = "Adult";

      if (rawCat.includes("child")) category = "Child";
      else if (rawCat.includes("student")) category = "Student";
      else if (rawCat.includes("senior")) category = "Senior";
      else if (rawCat.includes("foreigner")) category = "Foreigner";
      else category = "Adult";

      let unitPrice = 100;
      if (category === "Child") unitPrice = 50;
      else if (category === "Student") unitPrice = 60;
      else if (category === "Senior") unitPrice = 75;
      else if (category === "Foreigner") unitPrice = 500;

      const total = qty * unitPrice;
      items.push({ category, quantity: qty, unitPrice, total });
    }
  });

  if (items.length === 0) {
    items.push({
      category: "Adult",
      quantity: booking.totalVisitors || 1,
      unitPrice: booking.amount / (booking.totalVisitors || 1),
      total: booking.amount,
    });
  }

  return items;
}

export default function BookingDetailsModal({
  booking,
  isOpen,
  onClose,
  onPrint,
  onDownloadPDF,
}: BookingDetailsModalProps) {
  if (!isOpen || !booking) return null;

  const isConfirmed = booking.status === "Confirmed";
  const isCancelled = booking.status === "Cancelled";

  const statusBg = isConfirmed
    ? "#B5FFE7"
    : isCancelled
      ? "#FEE2E2"
      : "rgba(255, 248, 217, 0.93)";

  const statusDot = isConfirmed
    ? "#119167"
    : isCancelled
      ? "rgba(220, 38, 38, 0.88)"
      : "#D97706";

  const statusText = isConfirmed
    ? "#119167"
    : isCancelled
      ? "rgba(220, 38, 38, 0.86)"
      : "#D97706";

  const summaryItems = getTicketSummary(booking);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0, 0, 0, 0.55)",
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
          maxWidth: "832px",
          background: "#FFFFFF",
          borderRadius: "26px",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.2)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: "modalFadeIn 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
          maxHeight: "92vh",
        }}
      >
        {/* ── Modal Header ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 32px",
            borderBottom: "1px solid #E5E7EB",
            flexShrink: 0,
          }}
        >
          <h2
            style={{
              fontFamily: typography.fontFamily.sans,
              fontWeight: typography.fontWeight.bold,
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
              transition: "all 0.15s ease",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Modal Body Content ── */}
        <div
          style={{
            padding: "24px 32px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          {/* Top Booking Identity Card */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              {/* Avatar circle */}
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
                  {booking.id}
                </div>
                <div
                  style={{
                    fontFamily: typography.fontFamily.sans,
                    fontSize: "13px",
                    color: colors.text.muted,
                    marginTop: "2px",
                  }}
                >
                  Booked on {booking.dateTime}
                </div>
              </div>
            </div>

            {/* Status Pill */}
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
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: statusDot,
                }}
              />
              <span
                style={{
                  fontFamily: typography.fontFamily.sans,
                  fontWeight: 600,
                  fontSize: "13px",
                  color: statusText,
                }}
              >
                {booking.status}
              </span>
            </div>
          </div>

          {/* Info Cards Row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
            }}
          >
            {/* Customer Information */}
            <div
              style={{
                border: "1px solid rgba(0, 0, 0, 0.22)",
                borderRadius: "8px",
                padding: "16px 20px",
                background: "#FFFFFF",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "14px",
                }}
              >
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
                ["Customer Name:", booking.customerName],
                ["Mobile Number:", booking.mobileNumber],
                ["GSTN:", booking.gstn || "N/A"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    gap: "8px",
                    marginBottom: "8px",
                    fontSize: "13px",
                  }}
                >
                  <span style={{ color: colors.text.muted, minWidth: "110px" }}>
                    {label}
                  </span>
                  <span style={{ fontWeight: 600, color: colors.text.primary }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>

            {/* Booking Information */}
            <div
              style={{
                border: "1px solid rgba(0, 0, 0, 0.22)",
                borderRadius: "8px",
                padding: "16px 20px",
                background: "#FFFFFF",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "14px",
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
                  Booking Information
                </span>
              </div>

              {[
                ["Attraction:", booking.attraction],
                ["Visit Date:", booking.dateTime],
                ["Payment Mode:", booking.paymentMode],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    gap: "8px",
                    marginBottom: "8px",
                    fontSize: "13px",
                  }}
                >
                  <span style={{ color: colors.text.muted, minWidth: "110px" }}>
                    {label}
                  </span>
                  <span style={{ fontWeight: 600, color: colors.text.primary }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Ticket Summary Box (Matching Image 2 exactly) ── */}
          <div
            style={{
              boxSizing: "border-box",
              width: "100%",
              background: "#FFFFFF",
              border: "2px solid #e6eaefff",
              borderRadius: "8px",
            }}
          >
            {/* Section Heading */}
            <div
              style={{
                padding: "14px 20px",
                borderBottom: "1px solid rgba(0,0,0,0.08)",
              }}
            >
              <span
                style={{
                  fontFamily: typography.fontFamily.sans,
                  fontWeight: 700,
                  fontSize: "14px",
                  color: "#011B2F",
                }}
              >
                Ticket Summary
              </span>
            </div>

            {/* Header Row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 120px 120px 120px",
                padding: "10px 20px",
                background: "#F1F5F9",
                borderBottom: "1px solid #E5E7EB",
              }}
            >
              <span style={{ fontSize: "12px", fontWeight: 600, color: "#6B7280" }}>Category</span>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "#6B7280", textAlign: "center" }}>Quantity</span>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "#6B7280", textAlign: "right" }}>Unit Price</span>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "#6B7280", textAlign: "right" }}>Total</span>
            </div>

            {/* Data Rows */}
            {summaryItems.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 120px 120px 120px",
                  padding: "12px 20px",
                  borderBottom: "1px solid #F3F4F6",
                  background: "#FFFFFF",
                }}
              >
                <span style={{ fontSize: "13px", fontWeight: 500, color: "#374151" }}>
                  {item.category}
                </span>
                <span style={{ fontSize: "13px", color: "#374151", textAlign: "center" }}>
                  {item.quantity}
                </span>
                <span style={{ fontSize: "13px", color: "#374151", textAlign: "right" }}>
                  ₹{item.unitPrice.toFixed(2)}
                </span>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#374151", textAlign: "right" }}>
                  ₹{item.total.toFixed(2)}
                </span>
              </div>
            ))}

            {/* Total Visitors Row — Yellow highlight */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 120px 120px 120px",
                padding: "14px 20px",
                background: "#FFFBEB",
                borderTop: summaryItems.length === 0 ? "1px solid #E5E7EB" : undefined,
              }}
            >
              <span style={{ fontSize: "14px", fontWeight: 700, color: "#011B2F" }}>
                Total Visitors
              </span>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "#011B2F", textAlign: "center" }}>
                {booking.totalVisitors}
              </span>
              <span />
              <span style={{ fontSize: "18px", fontWeight: 800, color: "#011B2F", textAlign: "right" }}>
                ₹{booking.amount.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Seat Details Card (if attraction has seating) */}
          {(booking.bogie || booking.seats) && (
            <div
              style={{
                border: "1px solid rgba(0, 0, 0, 0.22)",
                borderRadius: "8px",
                padding: "14px 20px",
                background: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Armchair size={18} color={colors.sidebar.bg} />
                <span
                  style={{
                    fontFamily: typography.fontFamily.sans,
                    fontWeight: 700,
                    fontSize: "13px",
                    color: colors.sidebar.bg,
                  }}
                >
                  Seat Details ({booking.attraction})
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "24px",
                  fontSize: "13px",
                }}
              >
                {booking.bogie && (
                  <div>
                    <span style={{ color: colors.text.muted }}>Bogie: </span>
                    <strong style={{ color: colors.text.primary }}>{booking.bogie}</strong>
                  </div>
                )}
                {booking.seats && (
                  <div>
                    <span style={{ color: colors.text.muted }}>Seats: </span>
                    <strong style={{ color: colors.text.primary }}>{booking.seats}</strong>
                  </div>
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: colors.sidebar.bg,
                }}
              >
                <Armchair size={16} />
                <span>{booking.totalVisitors} Seats</span>
              </div>
            </div>
          )}

          {/* Payment Summary Box */}
          <div
            style={{
              border: "1px solid rgba(0, 0, 0, 0.22)",
              borderRadius: "8px",
              padding: "16px 20px",
              background: "#FFFFFF",
            }}
          >
            <span
              style={{
                fontFamily: typography.fontFamily.sans,
                fontWeight: 700,
                fontSize: "14px",
                color: colors.sidebar.bg,
                display: "block",
                marginBottom: "10px",
              }}
            >
              Payment Summary
            </span>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0",
                fontSize: "13px",
              }}
            >
              <div style={{ flex: 1, borderRight: "1px solid #E5E7EB", paddingRight: "20px" }}>
                <span style={{ color: colors.text.muted }}>Total Amount: </span>
                <strong style={{ color: colors.text.primary }}>₹{booking.amount.toFixed(2)}</strong>
              </div>
              <div style={{ paddingLeft: "20px" }}>
                <span style={{ color: colors.text.muted }}>Amount Paid: </span>
                <strong style={{ color: colors.text.primary }}>₹{booking.amountPaid.toFixed(2)}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* ── Modal Footer Buttons ── */}
        <div
          style={{
            padding: "16px 32px 24px 32px",
            borderTop: "1px solid #E5E7EB",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: "14px",
            background: "#FFFFFF",
            flexWrap: "wrap",
            flexShrink: 0,
          }}
        >
          {/* Close Button */}
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
              transition: "all 0.15s ease",
            }}
          >
            Close
          </button>

          {/* Download PDF Button */}
          <button
            onClick={() => onDownloadPDF && onDownloadPDF(booking)}
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
              transition: "all 0.15s ease",
            }}
          >
            <Download size={18} />
            <span>Download PDF</span>
          </button>

          {/* Print Invoice Button */}
          <button
            onClick={() => onPrint && onPrint(booking)}
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
              transition: "all 0.15s ease",
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
      `}</style>
    </div>
  );
}
