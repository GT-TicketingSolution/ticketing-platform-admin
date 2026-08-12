"use client";

import React from "react";
import { X, CreditCard, Download, Printer, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Transaction } from "@/types/transaction";
import { colors, typography } from "@/lib/theme";

interface TransactionDetailsModalProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
  onPrint?: (transaction: Transaction) => void;
  onDownloadPDF?: (transaction: Transaction) => void;
}

export default function TransactionDetailsModal({
  transaction,
  isOpen,
  onClose,
  onPrint,
  onDownloadPDF,
}: TransactionDetailsModalProps) {
  if (!isOpen || !transaction) return null;

  const isConfirmed = transaction.status === "Confirmed";
  const isCancelled = transaction.status === "Cancelled";

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
          maxWidth: "520px",
          background: "#FFFFFF",
          borderRadius: "20px",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.2)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: "modalFadeIn 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
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
              color: colors.text.muted,
              transition: "all 0.15s ease",
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
            gap: "18px",
            maxHeight: "75vh",
            overflowY: "auto",
          }}
        >
          {/* Top Ref Banner */}
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
              <CreditCard size={22} color="#0C2A42" />
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
                Transaction Ref
              </div>
              <h3
                style={{
                  fontFamily: typography.fontFamily.sans,
                  fontWeight: 700,
                  fontSize: "18px",
                  color: "#0C2A42",
                  margin: 0,
                }}
              >
                {transaction.id}
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
                background: isConfirmed ? "#D1FAE5" : isCancelled ? "#FEE2E2" : "#FEF3C7",
                color: isConfirmed ? "#065F46" : isCancelled ? "#991B1B" : "#92400E",
              }}
            >
              {isConfirmed ? <CheckCircle2 size={13} /> : isCancelled ? <XCircle size={13} /> : <Clock size={13} />}
              {isConfirmed ? "Successful" : transaction.status}
            </span>
          </div>

          {/* Customer Information Card Grid */}
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
                <span style={{ color: "#64748B", fontSize: "11px", fontWeight: 600, display: "block", fontFamily: typography.fontFamily.sans }}>
                  Transaction ID
                </span>
                <strong style={{ color: "#0F172A", fontWeight: 700, fontFamily: typography.fontFamily.sans }}>
                  {transaction.id}
                </strong>
              </div>

              <div>
                <span style={{ color: "#64748B", fontSize: "11px", fontWeight: 600, display: "block", fontFamily: typography.fontFamily.sans }}>
                  Date &amp; Time
                </span>
                <strong style={{ color: "#0F172A", fontWeight: 700, fontFamily: typography.fontFamily.sans }}>
                  {transaction.dateTime}
                </strong>
              </div>

              <div>
                <span style={{ color: "#64748B", fontSize: "11px", fontWeight: 600, display: "block", fontFamily: typography.fontFamily.sans }}>
                  Invoice ID
                </span>
                <strong style={{ color: "#0F172A", fontWeight: 700, fontFamily: typography.fontFamily.sans }}>
                  {transaction.invoiceId}
                </strong>
              </div>

              <div>
                <span style={{ color: "#64748B", fontSize: "11px", fontWeight: 600, display: "block", fontFamily: typography.fontFamily.sans }}>
                  Booking ID
                </span>
                <strong style={{ color: "#0F172A", fontWeight: 700, fontFamily: typography.fontFamily.sans }}>
                  {transaction.bookingId}
                </strong>
              </div>
            </div>
          </div>

          {/* Payment Information Card Grid */}
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
                <span style={{ color: "#64748B", fontSize: "11px", fontWeight: 600, display: "block", fontFamily: typography.fontFamily.sans }}>
                  Payment Mode
                </span>
                <strong style={{ color: "#0F172A", fontWeight: 700, fontFamily: typography.fontFamily.sans }}>
                  {transaction.paymentMode}
                </strong>
              </div>

              <div>
                <span style={{ color: "#64748B", fontSize: "11px", fontWeight: 600, display: "block", fontFamily: typography.fontFamily.sans }}>
                  Amount Paid
                </span>
                <strong style={{ color: "#0F172A", fontWeight: 700, fontSize: "15px", fontFamily: typography.fontFamily.sans }}>
                  ₹{transaction.amount.toFixed(2)}
                </strong>
              </div>

              <div>
                <span style={{ color: "#64748B", fontSize: "11px", fontWeight: 600, display: "block", fontFamily: typography.fontFamily.sans }}>
                  Status
                </span>
                <strong
                  style={{
                    color: isConfirmed ? "#119167" : isCancelled ? "#DC2626" : "#D97706",
                    fontWeight: 700,
                    fontFamily: typography.fontFamily.sans,
                  }}
                >
                  {isConfirmed ? "Successful" : transaction.status}
                </strong>
              </div>
            </div>
          </div>
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
              transition: "all 0.15s ease",
            }}
          >
            Close
          </button>

          <button
            onClick={() => onDownloadPDF && onDownloadPDF(transaction)}
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
            onClick={() => onPrint && onPrint(transaction)}
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
