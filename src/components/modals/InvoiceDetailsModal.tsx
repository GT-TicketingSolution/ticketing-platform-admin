"use client";

import React from "react";
import { X, FileText, Download, Printer } from "lucide-react";
import { Transaction } from "@/types/transaction";
import { colors, typography } from "@/lib/theme";

interface InvoiceDetailsModalProps {
  txn: Transaction | null;
  isOpen?: boolean;
  onClose: () => void;
}

export default function InvoiceDetailsModal({
  txn,
  isOpen = true,
  onClose,
}: InvoiceDetailsModalProps) {
  if (!isOpen || !txn) return null;

  const invId = txn.invoiceId || txn.id.replace("TXN-", "INV-");
  const visitors = (txn as any).visitors || "2 Adults + 1 Child";
  const visitDate = txn.dateTime || txn.date || "";

  // Derive ticket summary breakdown
  const summaryRows: { category: string; qty: number; unitPrice: number; total: number }[] = [];
  const parts = visitors.split("+").map((s: string) => s.trim());
  parts.forEach((part: string) => {
    const m = part.match(/(\d+)\s*(Adult|Child|Student|Senior|Foreigner)/i);
    if (m) {
      const qty = parseInt(m[1], 10);
      const cat = m[2];
      let unitPrice = cat.toLowerCase().includes("adult")
        ? 100
        : cat.toLowerCase().includes("child")
        ? 50
        : cat.toLowerCase().includes("student")
        ? 60
        : cat.toLowerCase().includes("senior")
        ? 75
        : 500;
      summaryRows.push({ category: cat, qty, unitPrice, total: qty * unitPrice });
    }
  });

  if (summaryRows.length === 0) {
    summaryRows.push({
      category: "Adult",
      qty: 2,
      unitPrice: txn.amount > 0 ? txn.amount / 2 : 100,
      total: txn.amount || 200,
    });
  }

  const subtotal = summaryRows.reduce((s, r) => s + r.total, 0);
  const discount = 0;
  const grandTotal = subtotal - discount;
  const totalVisitors = summaryRows.reduce((s, r) => s + r.qty, 0);

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
          maxWidth: "540px",
          background: "#FFFFFF",
          borderRadius: "26px",
          boxShadow: "0 20px 50px rgba(0,0,0,0.2)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: "invModalIn 0.22s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 28px",
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
            Invoice Details
          </h2>
          <button
            onClick={onClose}
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
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            padding: "20px 28px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            maxHeight: "75vh",
            overflowY: "auto",
          }}
        >
          {/* Invoice ID Banner */}
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "#FFF8D9",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <FileText size={22} color="#F4BC43" />
            </div>
            <div>
              <h3
                style={{
                  fontFamily: typography.fontFamily.sans,
                  fontWeight: 700,
                  fontSize: "20px",
                  color: "#0C2A42",
                  margin: 0,
                }}
              >
                {invId}
              </h3>
              <p
                style={{
                  fontFamily: typography.fontFamily.sans,
                  fontSize: "12px",
                  color: "#6B7280",
                  margin: "2px 0 0",
                }}
              >
                Generated on {visitDate}
              </p>
            </div>
          </div>

          {/* Customer & Booking Info Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            {/* Customer Info */}
            <div
              style={{
                border: "1px solid rgba(0,0,0,0.22)",
                borderRadius: "5px",
                padding: "14px 16px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  marginBottom: "12px",
                  fontFamily: typography.fontFamily.sans,
                  fontWeight: 700,
                  fontSize: "13px",
                  color: "#374151",
                }}
              >
                Customer Information
              </div>
              {[
                ["Customer Name:", txn.customerName],
                ["Mobile Number:", txn.mobileNumber || "—"],
                ["GSTN:", txn.gstn || "—"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    gap: "8px",
                    marginBottom: "6px",
                    fontSize: "12px",
                    fontFamily: typography.fontFamily.sans,
                  }}
                >
                  <span style={{ color: "#6B7280", minWidth: "100px" }}>{label}</span>
                  <span style={{ color: "#374151", fontWeight: 600 }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Booking Info */}
            <div
              style={{
                border: "1px solid rgba(0,0,0,0.22)",
                borderRadius: "5px",
                padding: "14px 16px",
              }}
            >
              <div
                style={{
                  fontFamily: typography.fontFamily.sans,
                  fontWeight: 700,
                  fontSize: "13px",
                  color: "#374151",
                  marginBottom: "12px",
                }}
              >
                Booking Information
              </div>
              {[
                ["Attraction:", txn.attraction || "—"],
                ["Visit Date:", visitDate],
                ["Payment Mode:", txn.paymentMode],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    gap: "8px",
                    marginBottom: "6px",
                    fontSize: "12px",
                    fontFamily: typography.fontFamily.sans,
                  }}
                >
                  <span style={{ color: "#6B7280", minWidth: "90px" }}>{label}</span>
                  <span style={{ color: "#374151", fontWeight: 600 }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Ticket Summary Table */}
          <div style={{ border: "1px solid rgba(0,0,0,0.22)", borderRadius: "5px", overflow: "hidden" }}>
            <div
              style={{
                padding: "12px 16px",
                fontFamily: typography.fontFamily.sans,
                fontWeight: 700,
                fontSize: "13px",
                color: "#374151",
                borderBottom: "1px solid #F1F5F9",
              }}
            >
              Ticket Summary
            </div>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "12px",
                fontFamily: typography.fontFamily.sans,
              }}
            >
              <thead>
                <tr style={{ background: "#F8FAFC" }}>
                  {["Category", "Quantity", "Unit Price", "Total"].map((h, i) => (
                    <th
                      key={h}
                      style={{
                        padding: "10px 16px",
                        textAlign: i > 1 ? "right" : "left",
                        color: "#374151",
                        fontWeight: 600,
                        fontSize: "12px",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {summaryRows.map((row) => (
                  <tr key={row.category} style={{ borderTop: "1px solid #F1F5F9" }}>
                    <td style={{ padding: "10px 16px", color: "#374151" }}>{row.category}</td>
                    <td style={{ padding: "10px 16px", color: "#374151" }}>{row.qty}</td>
                    <td style={{ padding: "10px 16px", color: "#374151", textAlign: "right" }}>
                      ₹{row.unitPrice.toFixed(2)}
                    </td>
                    <td style={{ padding: "10px 16px", color: "#374151", textAlign: "right" }}>
                      ₹{row.total.toFixed(2)}
                    </td>
                  </tr>
                ))}
                <tr style={{ borderTop: "1px solid #F1F5F9", background: "#FFFBEB" }}>
                  <td style={{ padding: "10px 16px", fontWeight: 700, color: "#374151" }}>Total Visitors</td>
                  <td style={{ padding: "10px 16px", fontWeight: 700, color: "#374151" }}>{totalVisitors}</td>
                  <td></td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Subtotal / Grand Total Breakdown */}
          <div style={{ border: "1px solid rgba(0,0,0,0.22)", borderRadius: "5px", overflow: "hidden" }}>
            {[
              { label: "Subtotal", value: `₹${subtotal.toFixed(2)}`, bold: false },
              { label: "Discount", value: `₹${discount.toFixed(2)}`, bold: false },
            ].map((row) => (
              <div
                key={row.label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "10px 16px",
                  fontSize: "12px",
                  fontFamily: typography.fontFamily.sans,
                  color: "#374151",
                  borderBottom: "1px solid #F1F5F9",
                }}
              >
                <span>{row.label}</span>
                <span style={{ fontWeight: row.bold ? 700 : 500 }}>{row.value}</span>
              </div>
            ))}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "12px 16px",
                background: "#FFFBEB",
                fontFamily: typography.fontFamily.sans,
              }}
            >
              <span style={{ fontWeight: 700, fontSize: "13px", color: "#374151" }}>Grand Total</span>
              <span style={{ fontWeight: 700, fontSize: "15px", color: "#0C2A42" }}>
                ₹{grandTotal.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: "16px 28px",
            borderTop: "1px solid #E5E7EB",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={onClose}
            style={{
              height: "42px",
              padding: "0 20px",
              borderRadius: "5px",
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
            style={{
              height: "42px",
              padding: "0 20px",
              borderRadius: "5px",
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
            }}
          >
            <Download size={16} />
            <span>Download PDF</span>
          </button>
          <button
            style={{
              height: "42px",
              padding: "0 20px",
              borderRadius: "5px",
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
