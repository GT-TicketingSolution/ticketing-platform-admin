"use client";

import React, { useState, useEffect, useRef } from "react";
import { useProfileQuery } from "@/hooks/useAuthQueries";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Search,
  User,
  Phone,
  CreditCard,
  Check,
  Plus,
  RotateCcw,
  AlertTriangle,
  Banknote,
  X,
  Printer,
} from "lucide-react";
import AddNewCustomerModal, { NewCustomer } from "./AddNewCustomerModal";

export interface BookingSummaryItem {
  attractionId?: string;
  attractionName: string;
  passengers: { label: string; qty: number }[];
  totalAmount: number;
}

interface CustomerInfoModalProps {
  isOpen: boolean;
  onBack: () => void;
  onContinue: (customer: { name: string; mobile: string; gstn?: string }) => void;
  bookingSummary: BookingSummaryItem[];
}

import { useTicketingCustomers, TicketingCustomer } from "@/hooks/useTicketingBookingQueries";

export type CustomerRecord = TicketingCustomer;

const SEAT_STORAGE_KEY = "seat_layouts_data";

type SeatStatus = "available" | "selected" | "occupied";

interface BogieState {
  name: string;
  totalSeats: number;
  occupiedSeats: number[];
}

// ── Process Payment Modal ──────────────────────────────────────────────────────
// ── Process Payment Modal (Compact & Proportionate) ───────────────────────────
function ProcessPaymentModal({
  isOpen,
  onClose,
  onConfirm,
  grandTotal,
  attractionName,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  grandTotal: number;
  attractionName: string;
}) {
  const [payMethod, setPayMethod] = useState<"cash" | "card" | "upi">("cash");
  const [amtRcv, setAmtRcv] = useState("");
  const [selectedNotes, setSelectedNotes] = useState<number[]>([]);
  const defaultCash = grandTotal > 0 ? (Math.ceil(grandTotal / 10) * 10).toString() : "";
  const isOnline = payMethod === "upi" || payMethod === "card";
  const numAmtRcv = parseFloat(amtRcv || "0");
  const change = isOnline ? 0 : (amtRcv ? Math.max(0, numAmtRcv - grandTotal) : 0);
  const isCashAmountValid = isOnline || (amtRcv.trim() !== "" && numAmtRcv >= grandTotal);

  useEffect(() => {
    if (isOpen) {
      setPayMethod("cash");
      const initialCash = grandTotal > 0 ? (Math.ceil(grandTotal / 10) * 10).toString() : "";
      setAmtRcv(initialCash);
      setSelectedNotes([]);
    }
  }, [isOpen, grandTotal]);

  useEffect(() => {
    if (payMethod === "upi" || payMethod === "card") {
      setAmtRcv(grandTotal.toFixed(2));
      setSelectedNotes([]);
    } else if (payMethod === "cash") {
      const initialCash = grandTotal > 0 ? (Math.ceil(grandTotal / 10) * 10).toString() : "";
      setAmtRcv(initialCash);
      setSelectedNotes([]);
    }
  }, [payMethod, grandTotal]);

  const handleQuickNoteClick = (noteVal: number) => {
    const defaultBase = grandTotal > 0 ? Math.ceil(grandTotal / 10) * 10 : 0;
    const currentAmt = amtRcv.trim() !== "" ? parseFloat(amtRcv) : defaultBase;
    const base = isNaN(currentAmt) ? defaultBase : currentAmt;
    const nextAmt = base + noteVal;
    setAmtRcv(nextAmt.toString());
    setSelectedNotes((prev) => [...prev, noteVal]);
  };

  const handleClearNotes = () => {
    setSelectedNotes([]);
    const initialCash = grandTotal > 0 ? (Math.ceil(grandTotal / 10) * 10).toString() : "";
    setAmtRcv(initialCash);
  };

  if (!isOpen) return null;

  const methods: { key: "cash" | "card" | "upi"; label: string; icon: React.ReactNode }[] = [
    {
      key: "cash",
      label: "Cash",
      icon: <Banknote size={22} color={payMethod === "cash" ? "#173F63" : "#808081"} />,
    },
    {
      key: "card",
      label: "Card",
      icon: (
        <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
          <rect x="3" y="7" width="22" height="14" rx="2" stroke={payMethod === "card" ? "#173F63" : "#808081"} strokeWidth="1.5" fill="none" />
          <rect x="3" y="11" width="22" height="3" fill={payMethod === "card" ? "#173F63" : "#808081"} opacity="0.5" />
        </svg>
      ),
    },
    {
      key: "upi",
      label: "UPI",
      icon: (
        <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
          <rect x="8" y="2" width="12" height="24" rx="2" stroke={payMethod === "upi" ? "#173F63" : "#808081"} strokeWidth="1.5" fill="none" />
          <circle cx="14" cy="21" r="1.5" fill={payMethod === "upi" ? "#173F63" : "#808081"} />
        </svg>
      ),
    },
  ];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        backdropFilter: "blur(3px)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "20px",
          width: "480px",
          maxWidth: "94vw",
          boxShadow: "0 20px 60px rgba(0,0,0,0.22)",
          fontFamily: "'Plus Jakarta Sans',sans-serif",
          overflow: "hidden",
          boxSizing: "border-box",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: "18px 24px 0 24px" }}>
          <h2 style={{ margin: 0, fontWeight: 700, fontSize: "18px", lineHeight: "22px", color: "#011B2F" }}>
            Process Payment
          </h2>
          <p style={{ margin: "2px 0 0 0", fontWeight: 500, fontSize: "11px", color: "#A0A0A0" }}>
            {attractionName}
          </p>
        </div>

        <div style={{ height: "0.5px", background: "rgba(179,175,175,0.6)", margin: "14px 0 0 0" }} />

        <div style={{ padding: "18px 24px 22px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Amount Due Card */}
          <div style={{ background: "#002A45", borderRadius: "16px", padding: "14px 18px", textAlign: "center" }}>
            <p style={{ margin: 0, fontWeight: 800, fontSize: "14px", color: "#7599B0", letterSpacing: "0.05em" }}>
              AMOUNT DUE
            </p>
            <p style={{ margin: "4px 0 0 0", fontWeight: 800, fontSize: "30px", color: "#FFFFFF", lineHeight: "38px" }}>
              Rs.{grandTotal.toFixed(2)}
            </p>
          </div>

          {/* Payment Method Selector */}
          <div>
            <p style={{ margin: "0 0 8px 0", fontWeight: 700, fontSize: "13px", color: "rgba(81,82,82,0.85)" }}>
              PAYMENT METHOD
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              {methods.map((m) => (
                <div
                  key={m.key}
                  onClick={() => setPayMethod(m.key)}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    padding: "12px 8px",
                    borderRadius: "14px",
                    border: payMethod === m.key ? "1.5px solid #173F63" : "1.5px solid rgba(179,175,175,0.45)",
                    background: payMethod === m.key ? "rgba(122,178,214,0.18)" : "#F3F4F6",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {m.icon}
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: "15px",
                      color: payMethod === m.key ? "#173F63" : "#808081",
                    }}
                  >
                    {m.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Cash Options when Cash is selected */}
          {payMethod === "cash" && (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: "12px", color: "rgba(81,82,82,0.85)" }}>
                  QUICK CASH / NOTES
                </p>
                {(selectedNotes.length > 0 || amtRcv !== defaultCash) && (
                  <button
                    type="button"
                    onClick={handleClearNotes}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "11px",
                      fontWeight: 700,
                      fontFamily: "'Plus Jakarta Sans',sans-serif",
                      color: "#E53E3E",
                      padding: "2px 6px",
                      borderRadius: "6px",
                      transition: "background 0.15s",
                    }}
                  >
                    ✕ Reset
                  </button>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {[
                  [
                    { label: "₹10", val: 10 },
                    { label: "₹20", val: 20 },
                    { label: "₹50", val: 50 },
                  ],
                  [
                    { label: "₹100", val: 100 },
                    { label: "₹200", val: 200 },
                    { label: "₹500", val: 500 },
                  ],
                ].map((row, rowIdx) => (
                  <div key={rowIdx} style={{ display: "flex", gap: "6px" }}>
                    {row.map((item) => {
                      const count = selectedNotes.filter((n) => n === item.val).length;
                      const isActive = count > 0;
                      return (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => handleQuickNoteClick(item.val)}
                          style={{
                            flex: 1,
                            minWidth: "55px",
                            height: "32px",
                            background: isActive ? "#173F63" : "#F1F5F9",
                            border: isActive ? "1.5px solid #173F63" : "1px solid rgba(179,175,175,0.6)",
                            borderRadius: "8px",
                            fontFamily: "'Plus Jakarta Sans',sans-serif",
                            fontSize: "12px",
                            fontWeight: 700,
                            color: isActive ? "#FFFFFF" : "#173F63",
                            cursor: "pointer",
                            boxShadow: isActive ? "0 2px 6px rgba(23,63,99,0.25)" : "none",
                            transition: "all 0.15s ease",
                            position: "relative",
                          }}
                        >
                          {item.label}
                          {count > 1 && (
                            <span style={{
                              position: "absolute",
                              top: "-6px",
                              right: "-6px",
                              background: "#F4BC43",
                              color: "#173F63",
                              borderRadius: "50%",
                              width: "16px",
                              height: "16px",
                              fontSize: "9px",
                              fontWeight: 800,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              lineHeight: 1,
                            }}>
                              {count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Amount Received and Change Return */}
          <div>
            <div style={{ display: "flex", gap: "12px", marginBottom: "6px" }}>
              <p style={{ flex: 1, margin: 0, fontWeight: 700, fontSize: "12px", color: "rgba(81,82,82,0.85)" }}>
                AMOUNT RECEIVED (Rs.)
              </p>
              <p style={{ flex: 1, margin: 0, fontWeight: 700, fontSize: "12px", color: "rgba(81,82,82,0.85)", textDecoration: "underline" }}>
                CHANGE RETURN
              </p>
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
              <div
                style={{
                  flex: 1,
                  height: "36px",
                  background: "#FFFFFF",
                  border: "1.5px solid rgba(179,175,175,0.51)",
                  borderRadius: "10px",
                  display: "flex",
                  alignItems: "center",
                  padding: "0 10px",
                }}
              >
                <span style={{ fontWeight: 800, fontSize: "14px", color: "#173F63" }}>Rs.</span>
                <input
                  type="number"
                  disabled={isOnline}
                  value={amtRcv}
                  onChange={(e) => setAmtRcv(e.target.value)}
                  placeholder="0.00"
                  step="any"
                  min="0"
                  style={{
                    flex: 1,
                    border: "none",
                    outline: "none",
                    fontFamily: "'Plus Jakarta Sans',sans-serif",
                    fontWeight: 800,
                    fontSize: "14px",
                    color: "#173F63",
                    background: "transparent",
                    marginLeft: "4px",
                    cursor: isOnline ? "not-allowed" : "text",
                  }}
                />
              </div>
              <div
                style={{
                  flex: 1,
                  height: "36px",
                  background: "#FFFFFF",
                  border: "1.5px solid rgba(179,175,175,0.51)",
                  borderRadius: "10px",
                  display: "flex",
                  alignItems: "center",
                  padding: "0 10px",
                }}
              >
                <span style={{ fontWeight: 800, fontSize: "14px", color: "#173F63" }}>Rs.{change.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              // For cash: net amount paid = Amount Received − Change Return
              onConfirm();
            }}
            disabled={!isCashAmountValid}
            className="pay-confirm-btn"
            style={{
              width: "100%",
              height: "46px",
              background: !isCashAmountValid ? "#E2E8F0" : "#F4BC43",
              border: "none",
              borderRadius: "14px",
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontWeight: 800,
              fontSize: "16px",
              color: !isCashAmountValid ? "#94A3B8" : "#173F63",
              cursor: !isCashAmountValid ? "not-allowed" : "pointer",
              transition: "background 0.15s, transform 0.1s",
              opacity: !isCashAmountValid ? 0.7 : 1,
            }}
          >
            Confirm Payment – Rs.{grandTotal.toFixed(2)}
          </button>
        </div>
      </div>
      <style jsx global>{`
        .pay-confirm-btn:hover { background: #e5af36 !important; transform: translateY(-1px); }
      `}</style>
    </div>
  );
}

// ── Isolated Iframe Receipt Printer (Clean 1-page thermal/ticket output) ──
function printReceiptViaIframe(elementId: string) {
  if (typeof window === "undefined") return;
  const element = document.getElementById(elementId);
  if (!element) {
    window.print();
    return;
  }

  // Remove existing print iframe if any
  const oldIframe = document.getElementById("print-receipt-iframe");
  if (oldIframe) {
    oldIframe.remove();
  }

  const iframe = document.createElement("iframe");
  iframe.id = "print-receipt-iframe";
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";
  iframe.style.visibility = "hidden";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!doc) {
    window.print();
    return;
  }

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Ticket Receipt</title>
        <meta charset="utf-8" />
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;700;800;900&display=swap" rel="stylesheet">
        <style>
          @page {
            size: auto;
            margin: 2mm 0mm;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: 'Courier New', Courier, monospace;
            color: #0F172A;
            background: #FFFFFF;
            width: 80mm;
            max-width: 100%;
            margin: 0 auto;
            padding: 4mm 3mm;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          img {
            max-width: 100%;
            height: auto;
          }
        </style>
      </head>
      <body>
        ${element.innerHTML}
      </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (err) {
      console.error("Iframe print error:", err);
      window.print();
    }
  }, 250);
}

// ── Ticket Generated Modal (Thermal Receipt Layout) ──
function TicketGeneratedModal({
  isOpen,
  onClose,
  attractionName,
  grandTotal,
  totalPax,
  confirmedData,
  bookingSummary = [],
  customerInfo = { name: "Guest", mobile: "" },
  selectedSeats = [],
  subtotal = 0,
  gstAmount = 0,
  roundOff = 0,
  businessName = "",
}: {
  isOpen: boolean;
  onClose: () => void;
  attractionName: string;
  grandTotal: number;
  totalPax: number;
  businessName?: string;
  confirmedData?: {
    booking?: {
      id?: string;
      bookingNumber?: string;
      attractionId?: string;
      status?: string;
      customerName?: string | null;
      mobileNumber?: string | null;
      visitAt?: string;
      totalAmount?: string | number;
      amountPaid?: string | number;
      paymentMode?: string;
      createdAt?: string;
      updatedAt?: string;
      [key: string]: unknown;
    };
    qrCodes?: Array<{
      attractionId?: string;
      qrCode: string;
      [key: string]: unknown;
    }>;
  } | null;
  bookingSummary?: BookingSummaryItem[];
  customerInfo?: {
    name: string;
    mobile: string;
    gstn?: string;
  };
  selectedSeats?: string[];
  subtotal?: number;
  gstAmount?: number;
  roundOff?: number;
}) {
  const booking = confirmedData?.booking;
  const qrCodes = confirmedData?.qrCodes || [];

  const ticketNo = booking?.bookingNumber || "-";
  const finalTotal = booking?.totalAmount ? parseFloat(String(booking.totalAmount)) : grandTotal;
  const payMode = booking?.paymentMode || "CASH";
  const rawDate = booking?.visitAt || booking?.createdAt;
  const dateObj = rawDate ? new Date(rawDate) : null;

  const formattedDate = dateObj && !isNaN(dateObj.getTime())
    ? dateObj.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "-";

  const formattedTime = dateObj && !isNaN(dateObj.getTime())
    ? dateObj.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : "-";

  const custName = (booking?.customerName || customerInfo.name || "").trim() || "-";
  const custMobile = (booking?.mobileNumber || customerInfo.mobile || "").trim() || "-";

  const calculatedSubtotal = subtotal > 0 ? subtotal : Number((finalTotal / 1.18).toFixed(2));
  const calculatedGst = gstAmount > 0 ? gstAmount : Number((finalTotal - calculatedSubtotal).toFixed(2));
  const halfGst = Number((calculatedGst / 2).toFixed(2));

  const itemsList = bookingSummary.flatMap((b) =>
    b.passengers
      .filter((p) => p.qty > 0)
      .map((p, idx) => ({
        sNo: idx + 1,
        name: p.label || "-",
        qty: p.qty,
        amount: Number(((((p as any).unitPrice || (p as any).price || (calculatedSubtotal / (totalPax || 1)))) * p.qty).toFixed(2)),
      }))
  );

  const seatText = selectedSeats && selectedSeats.length > 0 ? selectedSeats.join(", ") : "-";

  const handlePrint = () => {
    printReceiptViaIframe("printable-ticket-receipt");
  };

  // Auto-print when modal opens using isolated clean receipt iframe
  useEffect(() => {
    if (isOpen && typeof window !== "undefined") {
      const t = setTimeout(() => {
        printReceiptViaIframe("printable-ticket-receipt");
      }, 400);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="ticket-modal-overlay"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.65)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        backdropFilter: "blur(4px)",
        overflowY: "auto",
      }}
      onClick={onClose}
    >
      <div
        className="ticket-modal-content"
        style={{
          background: "#FFFFFF",
          borderRadius: "24px",
          width: "520px",
          maxWidth: "96vw",
          boxShadow: "0 24px 80px rgba(0,0,0,0.28)",
          fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          padding: "28px 24px 28px",
          boxSizing: "border-box",
          position: "relative",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{ textAlign: "center", marginBottom: "16px", flexShrink: 0 }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              border: "3px solid #1FA35A",
              background: "#E8F8EE",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 8px auto",
            }}
          >
            <Check size={24} color="#1FA35A" strokeWidth={3.5} />
          </div>
          <h2
            style={{
              margin: 0,
              fontWeight: 800,
              fontSize: "22px",
              lineHeight: "28px",
              color: "#011B2F",
            }}
          >
            Ticket Generated!
          </h2>
          <p
            style={{
              margin: "3px 0 0 0",
              fontWeight: 600,
              fontSize: "12px",
              color: "#64748B",
            }}
          >
            Your ticket is ready. You can print it or close this window.
          </p>
        </div>

        {/* Scrollable Receipt Area */}
        <div
          style={{
            overflowY: "auto",
            paddingRight: "4px",
            marginBottom: "18px",
            flexGrow: 1,
          }}
        >
          {/* Printable Receipt Paper */}
          <div
            id="printable-ticket-receipt"
            style={{
              background: "#FFFFFF",
              border: "1.5px solid #CBD5E1",
              borderRadius: "14px",
              padding: "20px 18px",
              fontFamily: "'Courier New', Courier, monospace",
              color: "#0F172A",
              fontSize: "12px",
              lineHeight: "1.35",
              boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
            }}
          >
            {/* Business / Organization Name + Attraction */}
            <div style={{ textAlign: "center", borderBottom: "1px dashed #94A3B8", paddingBottom: "12px" }}>
              {businessName && (
                <p style={{ margin: "0 0 2px 0", fontSize: "11px", fontWeight: 700, color: "#475569", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                  {businessName}
                </p>
              )}
              <h3
                style={{
                  margin: "0 0 3px 0",
                  fontWeight: 900,
                  fontSize: "16px",
                  color: "#0F172A",
                  letterSpacing: "0.02em",
                  textTransform: "uppercase",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
              >
                {attractionName || "-"}
              </h3>
              <p style={{ margin: "2px 0", fontSize: "11px", fontWeight: 700, color: "#64748B" }}>
                Booking Confirmation Receipt
              </p>

              {/* Seat Information if applicable */}
              {selectedSeats && selectedSeats.length > 0 && (
                <div
                  style={{
                    margin: "8px auto 0 auto",
                    padding: "4px 10px",
                    background: "#F1F5F9",
                    borderRadius: "6px",
                    display: "inline-block",
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "#0F172A",
                    border: "1px solid #CBD5E1",
                  }}
                >
                  <div>Seats: {seatText}</div>
                </div>
              )}
            </div>

            {/* Prominent Total Header */}
            <div style={{ textAlign: "center", padding: "12px 0", borderBottom: "1px dashed #94A3B8" }}>
              <div style={{ fontSize: "24px", fontWeight: 900, color: "#0F172A", letterSpacing: "0.02em" }}>
                ₹{finalTotal.toFixed(2)}
              </div>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>
                Total Amount Paid ({payMode || "-"})
              </div>
            </div>

            {/* Invoice & Customer Meta */}
            <div style={{ padding: "10px 0", borderBottom: "1px dashed #94A3B8", fontSize: "11px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                <span><strong>Invoice:</strong> {ticketNo}</span>
                <span><strong>Bill To:</strong> {custName}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                <span><strong>Date:</strong> {formattedDate}</span>
                <span><strong>Time:</strong> {formattedTime}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span><strong>Mobile:</strong> {custMobile}</span>
                <span><strong>Status:</strong> {booking?.status || "CONFIRMED"}</span>
              </div>
            </div>

            {/* Items Table */}
            <div style={{ padding: "10px 0", borderBottom: "1px dashed #94A3B8" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #CBD5E1", textAlign: "left" }}>
                    <th style={{ paddingBottom: "4px", width: "12%" }}>S.No.</th>
                    <th style={{ paddingBottom: "4px", width: "50%" }}>Category / Item</th>
                    <th style={{ paddingBottom: "4px", width: "15%", textAlign: "center" }}>Qty</th>
                    <th style={{ paddingBottom: "4px", width: "23%", textAlign: "right" }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {itemsList.length > 0 ? (
                    itemsList.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ paddingTop: "5px", verticalAlign: "top" }}>{item.sNo}</td>
                        <td style={{ paddingTop: "5px" }}>{item.name}</td>
                        <td style={{ paddingTop: "5px", textAlign: "center", verticalAlign: "top" }}>{item.qty}</td>
                        <td style={{ paddingTop: "5px", textAlign: "right", verticalAlign: "top" }}>
                          ₹{item.amount.toFixed(2)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td style={{ paddingTop: "5px" }}>1</td>
                      <td style={{ paddingTop: "5px" }}>{attractionName || "-"}</td>
                      <td style={{ paddingTop: "5px", textAlign: "center" }}>{totalPax || 1}</td>
                      <td style={{ paddingTop: "5px", textAlign: "right" }}>₹{calculatedSubtotal.toFixed(2)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Tax and Adjustment Breakdown */}
            <div style={{ padding: "10px 0", borderBottom: "1px dashed #94A3B8", fontSize: "11px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                <span>Sub-Total</span>
                <span>₹{calculatedSubtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px", color: "#64748B" }}>
                <span>SGST (9%)</span>
                <span>₹{halfGst.toFixed(2)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px", color: "#64748B" }}>
                <span>CGST (9%)</span>
                <span>₹{halfGst.toFixed(2)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                <span>Effective GST (18%)</span>
                <span>₹{calculatedGst.toFixed(2)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", color: "#64748B" }}>
                <span>Round Off</span>
                <span>{roundOff >= 0 ? `+₹${roundOff.toFixed(2)}` : `-₹${Math.abs(roundOff).toFixed(2)}`}</span>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "13px",
                  fontWeight: 900,
                  borderTop: "1px solid #0F172A",
                  paddingTop: "6px",
                  marginTop: "4px",
                }}
              >
                <span>Amount Payable (₹)</span>
                <span>₹{finalTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* QR Codes Section (Supports Single or Multiple Attractions/QR Codes) */}
            <div style={{ padding: "14px 0 12px 0", borderBottom: "1px dashed #94A3B8" }}>
              {qrCodes && qrCodes.length > 0 ? (
                <div>
                  {qrCodes.length > 1 && (
                    <p style={{ margin: "0 0 10px 0", fontSize: "11px", fontWeight: 700, color: "#475569", textAlign: "center" }}>
                      ENTRY QR CODES ({qrCodes.length} ATTRACTIONS)
                    </p>
                  )}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: qrCodes.length > 2 ? "column" : "row",
                      justifyContent: "center",
                      alignItems: "center",
                      gap: "14px",
                      flexWrap: "wrap",
                    }}
                  >
                    {qrCodes.map((qrItem, idx) => {
                      const matchedAttraction = bookingSummary.find((b) => b.attractionId === qrItem.attractionId);
                      const attractionLabel = matchedAttraction?.attractionName || (qrCodes.length > 1 ? `Attraction ${idx + 1}` : attractionName || "Entry Gate");

                      return (
                        <div
                          key={idx}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            padding: "10px 12px",
                            background: "#F8FAFC",
                            border: "1px solid #CBD5E1",
                            borderRadius: "10px",
                            minWidth: qrCodes.length > 1 ? "170px" : "190px",
                            flex: qrCodes.length === 2 ? "1 1 170px" : undefined,
                            maxWidth: "230px",
                            boxSizing: "border-box",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "11px",
                              fontWeight: 800,
                              color: "#0F172A",
                              marginBottom: "6px",
                              textAlign: "center",
                              textTransform: "uppercase",
                              letterSpacing: "0.02em",
                              lineHeight: 1.25,
                            }}
                          >
                            {attractionLabel}
                          </div>
                          <img
                            src={qrItem.qrCode}
                            alt={`${attractionLabel} QR Code`}
                            style={{
                              width: "125px",
                              height: "125px",
                              objectFit: "contain",
                              background: "#FFFFFF",
                              border: "1px solid #CBD5E1",
                              borderRadius: "6px",
                              padding: "4px",
                            }}
                          />
                          <span
                            style={{
                              fontSize: "10px",
                              fontWeight: 700,
                              color: "#64748B",
                              marginTop: "6px",
                              textAlign: "center",
                            }}
                          >
                            Scan for Entry
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "10px", color: "#64748B", fontSize: "11px" }}>
                  QR Code will be scanned at the turnstile.
                </div>
              )}
            </div>

            {/* Clean Terms / Notice */}
            <div style={{ padding: "10px 0 4px 0", fontSize: "11px", color: "#475569", lineHeight: "1.45", textAlign: "center" }}>
              <div style={{ fontWeight: 700, marginBottom: "2px" }}>Thank you for visiting!</div>
              <div style={{ fontSize: "10px", color: "#64748B" }}>
                Please present this QR code at the entrance gate. Keep this ticket safe during your visit.
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "12px", alignItems: "center", flexShrink: 0 }}>
          <button
            type="button"
            onClick={handlePrint}
            style={{
              flex: 1,
              height: "46px",
              background: "#FFFFFF",
              border: "1.5px solid #002A45",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 700,
              fontSize: "14px",
              color: "#011B2F",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <Printer size={18} color="#002A45" /> Print Receipt
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              height: "46px",
              background: "#F4BC43",
              borderRadius: "10px",
              border: "none",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 800,
              fontSize: "14px",
              color: "#011B2F",
              cursor: "pointer",
              transition: "background 0.15s, transform 0.1s",
            }}
          >
            Close
          </button>
        </div>
      </div>

      {/* Print stylesheet for clean thermal / receipt printout */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-ticket-receipt,
          #printable-ticket-receipt * {
            visibility: visible !important;
          }
          #printable-ticket-receipt {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 80mm !important;
            max-width: 100% !important;
            margin: 0 auto !important;
            padding: 8px !important;
            box-shadow: none !important;
            border: none !important;
            font-size: 11px !important;
          }
          .ticket-modal-overlay {
            background: transparent !important;
            position: static !important;
          }
          .ticket-modal-content {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            background: transparent !important;
          }
        }
      `}</style>
    </div>
  );
}

// ── Profile-aware wrapper — reads businessName from the auth cache and injects it
function TicketGeneratedModalWithProfile(props: Parameters<typeof TicketGeneratedModal>[0]) {
  const { data: profileData } = useProfileQuery();
  const businessName = profileData?.profile?.businessName || "";
  return <TicketGeneratedModal {...props} businessName={businessName} />;
}

// ── Bogie Seat Allocation Panel ────────────────────────────────────────────────
function SeatAllocationPanel({ bookingSummary }: { bookingSummary: import("./CustomerInfoModal").BookingSummaryItem[] }) {
  const totalPax = bookingSummary.reduce((s, b) => s + b.passengers.reduce((x, p) => x + p.qty, 0), 0);
  const paxList: { label: string; idx: number }[] = [];
  bookingSummary.forEach(b => {
    const cnt: Record<string, number> = {};
    b.passengers.forEach(p => { if (p.qty > 0) { for (let i = 1; i <= p.qty; i++) { cnt[p.label] = (cnt[p.label] || 0) + 1; paxList.push({ label: p.label, idx: cnt[p.label] }); } } });
  });
  const [layouts, setLayouts] = useState<{ id: string; name: string; rows: number; cols: number; hasAisle: boolean; aisleAfterCol: number }[]>([]);
  useEffect(() => { try { const r = localStorage.getItem(SEAT_STORAGE_KEY); if (r) setLayouts(JSON.parse(r)); } catch { } }, []);
  const aN = bookingSummary.map(b => b.attractionName);
  const ml = layouts.filter(l => aN.some(a => l.name.toLowerCase().includes(a.toLowerCase()) || a.toLowerCase().includes(l.name.toLowerCase())));
  const COLS = ml[0]?.cols ?? 4, ROWS = ml[0]?.rows ?? 6, SPBOGIE = ROWS * COLS;
  const HAS_AISLE = ml[0]?.hasAisle ?? true, AISLE_AT = ml[0]?.aisleAfterCol ?? 2;
  const SNAME = ml[0]?.name ?? (aN[0] || "Seat");
  const BL = ["A", "B", "C"];
  const mkBogies = (occ0 = [1, 3, 8, 12, 16, 21, 22]): BogieState[] => BL.map((l, i) => ({ name: `Bogie ${l}`, totalSeats: SPBOGIE, occupiedSeats: i === 0 ? occ0 : [] }));
  const [bogies, setBogies] = useState<BogieState[]>(mkBogies);
  const [ai, setAi] = useState(0);
  const [sel, setSel] = useState<number[]>([]);
  const [asgn, setAsgn] = useState<Record<string, string>>({});
  const lc = HAS_AISLE ? AISLE_AT : COLS, rc = HAS_AISLE ? COLS - AISLE_AT : 0;
  const sNum = (r: number, c: number) => r * COLS + c + 1;
  const pad = (n: number) => String(n).padStart(2, "0");
  const activeBogie = bogies[ai], activeLabel = BL[ai];
  const stOf = (n: number): SeatStatus => activeBogie.occupiedSeats.includes(n) ? "occupied" : sel.includes(n) ? "selected" : "available";
  const selKeys = sel.map(s => `${activeLabel}-${pad(s)}`);
  const onSeat = (n: number) => {
    const st = stOf(n), key = `${activeLabel}-${pad(n)}`;
    if (st === "occupied") return;
    if (st === "selected") { setSel(p => p.filter(x => x !== n)); setAsgn(p => { const x = { ...p }; delete x[key]; return x; }); return; }
    if (sel.length < totalPax) { const ns = [...sel, n]; setSel(ns); const pi = ns.length - 1; if (paxList[pi]) setAsgn(p => ({ ...p, [key]: `${paxList[pi].label} ${paxList[pi].idx}` })); }
  };
  const newTrip = () => { setBogies(BL.map((l, i) => ({ name: `Bogie ${l}`, totalSeats: SPBOGIE, occupiedSeats: [] }))); setSel([]); setAsgn({}); setAi(0); };
  const refresh = () => { setBogies(mkBogies()); setSel([]); setAsgn({}); setAi(0); };
  const Seat = ({ n }: { n: number }) => {
    const st = stOf(n);
    return <div onClick={e => { e.stopPropagation(); onSeat(n); }} title={`Seat ${activeLabel}-${pad(n)}`} style={{ width: "44px", height: "28px", borderRadius: "7px", border: st === "selected" ? "1.5px solid rgba(179,175,175,0.21)" : "1.5px solid rgba(179,175,175,0.72)", background: st === "selected" ? "#F4BC43" : st === "occupied" ? "rgba(179,175,175,0.44)" : "#FFFFFF", cursor: st === "occupied" ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 600, color: "#011B2F", transition: "all 0.1s ease", userSelect: "none", boxSizing: "border-box" }}>{pad(n)}</div>;
  };
  return (
    <div style={{ background: "#FFFFFF", fontFamily: "'Plus Jakarta Sans',sans-serif" }} onClick={e => e.stopPropagation()}>
      <div style={{ display: "flex" }}>
        {/* Bogie Progress */}
        <div style={{ width: "224px", flexShrink: 0, borderRight: "1px solid rgba(179,175,175,0.35)", padding: "18px 12px", display: "flex", flexDirection: "column", gap: "10px" }}>
          <p style={{ margin: "0 0 8px", fontWeight: 700, fontSize: "14px", color: "#011B2F" }}>Bogie Progress</p>
          {bogies.map((b, idx) => {
            const lbl = BL[idx], isCur = idx === ai, isLocked = idx > ai, isComp = !isLocked && idx < ai;
            const occ = b.occupiedSeats.length + (isCur ? sel.length : 0), avail = b.totalSeats - occ;
            return (
              <div key={lbl} onClick={() => !isLocked && setAi(idx)} style={{ background: "#FFFFFF", border: isCur ? "1.5px solid #173F63" : "1.5px solid rgba(179,175,175,0.51)", borderRadius: "13px", padding: "10px 14px", cursor: isLocked ? "default" : "pointer", opacity: isLocked ? 0.6 : 1, transition: "all 0.15s ease" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ fontWeight: 600, fontSize: "14px", color: "#011B2F" }}>Bogie {lbl}</span>
                  <span style={{ background: isCur ? "rgba(244,188,67,0.61)" : isComp ? "rgba(34,197,94,0.15)" : "rgba(179,175,175,0.33)", color: isCur ? "#173F63" : isComp ? "#15803D" : "rgba(23,63,99,0.87)", fontSize: "8px", fontWeight: 700, padding: "2px 6px", borderRadius: "5px" }}>{isCur ? "Active" : isLocked ? "Locked" : "Complete"}</span>
                </div>
                <p style={{ margin: "1px 0", fontSize: "10px", fontWeight: 600, color: "#6B7280" }}>Seats: {b.totalSeats} &nbsp;Available: {avail}</p>
                <p style={{ margin: 0, fontSize: "10px", fontWeight: 600, color: "#6B7280" }}>{isCur ? "Currently allocating seats" : isLocked ? `Opens after Bogie ${BL[idx - 1]} is full` : "Completed"}</p>
                <p style={{ margin: "2px 0 0", fontSize: "9px", fontWeight: 600, color: "#A0A0A0", fontStyle: "italic" }}>{SNAME}</p>
              </div>
            );
          })}
          <div style={{ background: "#FFFBEB", border: "1px solid #FEF3C7", borderRadius: "8px", padding: "8px 10px", display: "flex", gap: "6px", alignItems: "flex-start", marginTop: "4px" }}>
            <AlertTriangle size={14} color="rgba(244,188,67,0.61)" style={{ flexShrink: 0, marginTop: "1px" }} />
            <p style={{ margin: 0, fontSize: "6px", fontWeight: 500, color: "#835505", lineHeight: "8px" }}>Seats are allocated sequentially by bogie. New bogie opens only after the current bogie is full.</p>
          </div>
        </div>
        {/* Seat Grid */}
        <div style={{ flex: 1, padding: "18px 16px", display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
            <h4 style={{ margin: 0, fontWeight: 700, fontSize: "14px", color: "#011B2F" }}>Select Seats - Bogie {activeLabel} <span style={{ fontWeight: 500, fontSize: "11px", color: "#6B7280", fontStyle: "italic" }}>({SNAME})</span></h4>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={e => { e.stopPropagation(); newTrip(); }} style={{ height: "35px", padding: "0 14px", background: "#FFFFFF", border: "1.5px solid #2576AB", borderRadius: "6px", fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 600, fontSize: "12px", color: "#173F63", cursor: "pointer", display: "flex", alignItems: "center", gap: "5px" }}><Plus size={14} color="#173F63" /> Make New Trip</button>
              <button onClick={e => { e.stopPropagation(); refresh(); }} style={{ height: "35px", padding: "0 14px", background: "#FFFFFF", border: "1.5px solid #2576AB", borderRadius: "6px", fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 600, fontSize: "12px", color: "#173F63", cursor: "pointer", display: "flex", alignItems: "center", gap: "5px" }}><RotateCcw size={13} color="#173F63" /> Refresh Seats</button>
            </div>
          </div>
          <div style={{ background: "rgba(222,242,255,0.51)", border: "1px solid rgba(23,63,99,0.4)", borderRadius: "7px", padding: "7px 12px", display: "flex", alignItems: "center", gap: "8px" }}>
            <AlertTriangle size={16} color="rgba(6,78,124,0.83)" />
            <p style={{ margin: 0, fontSize: "8px", fontWeight: 600, color: "#6B7280" }}>Please select {totalPax} seat{totalPax !== 1 ? "s" : ""}. You can only select seats from the active bogie.</p>
          </div>
          <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
            {/* Left */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <p style={{ margin: "0 0 4px", fontSize: "8px", fontWeight: 500, color: "#173F63", textAlign: "center" }}>Left Side</p>
              {Array.from({ length: ROWS }, (_, r) => (<div key={r} style={{ display: "flex", gap: "4px" }}>{Array.from({ length: lc }, (_, c) => <Seat key={c} n={sNum(r, c)} />)}</div>))}
            </div>
            {HAS_AISLE && (<div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "36px", alignSelf: "stretch", marginTop: "22px" }}><div style={{ writingMode: "vertical-rl", textOrientation: "mixed", fontSize: "9px", fontWeight: 600, color: "#173F63", background: "rgba(222,242,255,0.4)", border: "1px dashed rgba(23,63,99,0.3)", borderRadius: "6px", padding: "10px 6px", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>AISLE</div></div>)}
            {HAS_AISLE && rc > 0 && (<div style={{ display: "flex", flexDirection: "column", gap: "4px" }}><p style={{ margin: "0 0 4px", fontSize: "8px", fontWeight: 500, color: "#173F63", textAlign: "center" }}>Right Side</p>{Array.from({ length: ROWS }, (_, r) => (<div key={r} style={{ display: "flex", gap: "4px" }}>{Array.from({ length: rc }, (_, c) => <Seat key={c} n={sNum(r, lc + c)} />)}</div>))}</div>)}
            {/* Summary Panel */}
            <div style={{ marginLeft: "auto", width: "190px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ background: "#FFFFFF", border: "1.5px solid rgba(179,175,175,0.51)", borderRadius: "13px", padding: "10px 12px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ fontWeight: 700, fontSize: "10px", color: "#011B2F" }}>Selected Seats</span>
                  <span style={{ fontWeight: 500, fontSize: "10px", color: "#F4BC43" }}>{sel.length}/{totalPax} Selected</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {paxList.map((p, i) => {
                    const sk = selKeys[i];
                    return (
                      <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: "10px", fontWeight: 600, color: "#011B2F" }}>{p.label} {p.idx}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          {sk ? <span style={{ background: "rgba(255,220,145,0.61)", borderRadius: "5px", padding: "1px 6px", fontSize: "8px", fontWeight: 500, color: "#CE8305" }}>{sk}</span> : <span style={{ fontSize: "8px", color: "#A0A0A0" }}>-</span>}
                          {sk && <button onClick={e => { e.stopPropagation(); onSeat(parseInt(sk.split("-")[1])); }} style={{ background: "transparent", border: "none", cursor: "pointer", padding: "0 1px", display: "flex", alignItems: "center" }}><X size={12} color="#A0A0A0" /></button>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div style={{ background: "rgba(237, 227, 227, 0.44)", border: "1.5px solid rgba(179,175,175,0.72)", borderRadius: "7px", padding: "10px 12px", display: "flex", flexDirection: "column", gap: "4px" }}>
                {([{ l: "Passengers to Assign", v: String(totalPax), c: "#011B2F" }, { l: "Seats Assigned", v: `${sel.length}/${totalPax}`, c: "#F4BC43" }, { l: "Current Bogie", v: activeLabel, c: "#011B2F" }, { l: "Seat Numbers", v: selKeys.join(",") || "—", c: "#011B2F" }]).map((row, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <div style={{ width: "100%", height: "0.5px", background: "rgba(179,175,175,0.31)" }} />}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <span style={{ fontSize: "8px", fontWeight: 600, color: "#6B7280" }}>{row.l}</span>
                      <span style={{ fontSize: "10px", fontWeight: 600, color: row.c, textAlign: "right", maxWidth: "100px" }}>{row.v}</span>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "20px", alignItems: "center", marginTop: "4px" }}>
            {([{ bg: "#FFFFFF", brd: "1px solid #A0A0A0", lbl: "Available" }, { bg: "#F4BC43", brd: "1px solid #F4BC43", lbl: "Selected" }, { bg: "#E2E0E0", brd: "1px solid rgba(107,114,128,0.32)", lbl: "Occupied" }]).map(it => (
              <div key={it.lbl} style={{ display: "flex", alignItems: "center", gap: "5px" }}><div style={{ width: "20px", height: "19px", border: it.brd, borderRadius: "2px", background: it.bg }} /><span style={{ fontSize: "8px", fontWeight: 600, color: "#6B7280" }}>{it.lbl}</span></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CustomerInfoModal({
  isOpen,
  onBack,
  onContinue,
  bookingSummary,
}: CustomerInfoModalProps) {
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [isAddNewOpen, setIsAddNewOpen] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounce search query to prevent unnecessary API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: searchedCustomers = [], isLoading: isCustomersLoading } = useTicketingCustomers(debouncedSearchQuery, showDropdown);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showDropdown) return;
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowDropdown(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showDropdown]);

  // Complimentary Ticket checkbox & form state
  const [isComplimentary, setIsComplimentary] = useState(false);
  const [passDetails, setPassDetails] = useState({
    passNo: "",
    date: new Date().toISOString().split("T")[0],
    discount: "Select Discount %",
  });
  const [guestDetails, setGuestDetails] = useState({
    guestName: "",
    mobile: "",
    department: "",
    post: "",
  });
  const [visitorCount, setVisitorCount] = useState({
    adults: "",
    children: "",
  });
  const [referenceDetails, setReferenceDetails] = useState({
    refName: "",
    refMobile: "",
    refDepartment: "",
    refPost: "",
  });

  // Seat allocation accordion
  const [isSeatAllocExpanded, setIsSeatAllocExpanded] = useState(false);

  if (!isOpen) return null;

  const grandTotal = Math.ceil(bookingSummary.reduce((s, b) => s + b.totalAmount, 0) / 10) * 10;

  function handleSelectCustomer(c: CustomerRecord) {
    setSelectedCustomer(c);
    setSearchQuery(c.name);
    setShowDropdown(false);
  }

  function handleSaveNewCustomer(nc: NewCustomer) {
    const newC: CustomerRecord = {
      id: `C${Date.now()}`,
      name: nc.name,
      mobile: nc.mobile,
      address: nc.address || null,
      gstn: nc.gstn ?? null,
    };
    setSelectedCustomer(newC);
    setSearchQuery(newC.name);
    setIsAddNewOpen(false);
  }

  function handleContinue() {
    setShowPaymentModal(true);
  }

  // Summary passengers text
  const summaryPassengersText = bookingSummary
    .flatMap((b) =>
      b.passengers.filter((p) => p.qty > 0).map((p) => `${p.label}: ${p.qty}`)
    )
    .join(", ");

  const totalVisitorCount =
    (parseInt(visitorCount.adults || "0", 10) || 0) +
    (parseInt(visitorCount.children || "0", 10) || 0);

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
          zIndex: 900,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px",
          backdropFilter: "blur(3px)",
        }}
        onClick={onBack}
      >
        {/* Modal Dialog Container - Frame 24 / Rectangle 170 */}
        <div
          style={{
            width: "min(1006px, 100%)",
            maxHeight: "92vh",
            background: "#FFFFFF",
            borderRadius: "26px",
            overflowY: "auto",
            boxShadow: "0 24px 80px rgba(0,0,0,0.22)",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            position: "relative",
            display: "flex",
            flexDirection: "column",
            boxSizing: "border-box",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Title */}
          <div style={{ padding: "37px 38px 0 38px" }}>
            <h1
              style={{
                margin: 0,
                fontWeight: 700,
                fontSize: "24px",
                lineHeight: "30px",
                color: "#011B2F",
              }}
            >
              Customer Information
            </h1>
          </div>

          {/* ── Booking Summary Box (Rectangle 94) ── */}
          <div
            style={{
              margin: "24px 38px 0 38px",
              background: "rgba(222, 242, 255, 0.51)",
              border: "1px solid rgba(23, 63, 99, 0.4)",
              borderRadius: "20px",
              padding: "18px 24px",
              display: "flex",
              alignItems: "flex-start",
              gap: "16px",
              boxSizing: "border-box",
            }}
          >
            <AlertCircle size={28} color="#064E7C" style={{ flexShrink: 0, marginTop: "2px" }} />
            <div style={{ width: "100%" }}>
              <p
                style={{
                  margin: "0 0 10px 0",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 700,
                  fontSize: "16px",
                  lineHeight: "20px",
                  color: "#173F63",
                }}
              >
                Booking Summary
              </p>

              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0" }}>
                {/* Attraction Column */}
                <div style={{ minWidth: "180px", paddingRight: "30px" }}>
                  <p style={{ margin: "0 0 4px 0", fontWeight: 600, fontSize: "12px", color: "#6B7280" }}>
                    Attraction
                  </p>
                  {bookingSummary.map((b, i) => (
                    <p key={i} style={{ margin: 0, fontWeight: 700, fontSize: "12px", color: "#173F63" }}>
                      {b.attractionName}
                    </p>
                  ))}
                </div>

                {/* Vertical Divider */}
                <div
                  style={{
                    width: "1px",
                    height: "36px",
                    background: "rgba(179, 175, 175, 0.55)",
                    margin: "0 28px 0 0",
                  }}
                />

                {/* Passengers Column */}
                <div style={{ minWidth: "180px", paddingRight: "30px" }}>
                  <p style={{ margin: "0 0 4px 0", fontWeight: 600, fontSize: "12px", color: "#6B7280" }}>
                    Passengers
                  </p>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: "12px", color: "#173F63" }}>
                    {summaryPassengersText || "—"}
                  </p>
                </div>

                {/* Vertical Divider */}
                <div
                  style={{
                    width: "1px",
                    height: "36px",
                    background: "rgba(179, 175, 175, 0.55)",
                    margin: "0 28px 0 0",
                  }}
                />

                {/* Total Amount Column */}
                <div>
                  <p style={{ margin: "0 0 4px 0", fontWeight: 600, fontSize: "12px", color: "#6B7280" }}>
                    Total Amount
                  </p>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: "12px", color: "#173F63" }}>
                    ₹{grandTotal.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Card 1: Select Existing Customer (Rectangle 73) ── */}
          <div
            style={{
              margin: "24px 38px 0 38px",
              background: "#FFFFFF",
              border: "1.5px solid rgba(179, 175, 175, 0.51)",
              borderRadius: "13px",
              padding: "24px 28px",
              boxSizing: "border-box",
            }}
          >
            {/* Section Heading */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
              <User size={24} color="#011B2F" strokeWidth={1.75} />
              <h2
                style={{
                  margin: 0,
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 700,
                  fontSize: "22px",
                  lineHeight: "28px",
                  color: "#011B2F",
                }}
              >
                Select Existing Customer
              </h2>
            </div>

            <p
              style={{
                margin: "0 0 8px 0",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 600,
                fontSize: "18px",
                color: "#011B2F",
              }}
            >
              Customer<span style={{ color: "#EF4444" }}>*</span>
            </p>

            {/* Dropdown search bar + Add New Customer button */}
            <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px", flexWrap: "wrap" }}>
              <div style={{ position: "relative", flex: 1, minWidth: "260px" }}>
                <div ref={dropdownRef} style={{ position: "relative", flex: 1, minWidth: "0" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      background: "#FFFFFF",
                      border: "1.5px solid rgba(179, 175, 175, 0.84)",
                      borderRadius: "6px",
                      height: "38px",
                      padding: "0 14px",
                      cursor: "text",
                      boxSizing: "border-box",
                    }}
                    onClick={() => setShowDropdown(true)}
                  >
                    <Search size={16} color="#6B7280" style={{ flexShrink: 0 }} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setShowDropdown(true);
                      }}
                      onFocus={() => setShowDropdown(true)}
                      placeholder="Search by name, mobile, or GSTN..."
                      style={{
                        flex: 1,
                        border: "none",
                        outline: "none",
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        fontWeight: 500,
                        fontSize: "12px",
                        color: "#173F63",
                        background: "transparent",
                      }}
                    />
                    {/* Arrow button toggles dropdown open/closed */}
                    <button type="button" onClick={e => { e.stopPropagation(); setShowDropdown(p => !p); }} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}>
                      {showDropdown ? <ChevronUp size={18} color="#173F63" /> : <ChevronDown size={18} color="#173F63" />}
                    </button>
                  </div>

                  {showDropdown && (
                    <div
                      style={{
                        position: "absolute",
                        top: "calc(100% + 4px)",
                        left: 0,
                        right: 0,
                        background: "#FFFFFF",
                        border: "1.5px solid rgba(179, 175, 175, 0.51)",
                        borderRadius: "6px",
                        boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
                        zIndex: 30,
                        maxHeight: "180px",
                        overflowY: "auto",
                      }}
                    >
                      {isCustomersLoading ? (
                        <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: "6px" }}>
                          <div style={{ height: "12px", width: "60%", background: "#E2E8F0", borderRadius: "4px" }} />
                          <div style={{ height: "10px", width: "40%", background: "#F1F5F9", borderRadius: "4px" }} />
                        </div>
                      ) : searchedCustomers.length === 0 ? (
                        <p style={{ padding: "12px 16px", margin: 0, fontSize: "12px", color: "#6B7280" }}>
                          No customers found.
                        </p>
                      ) : (
                        searchedCustomers.map((c) => (
                          <div
                            key={c.id}
                            onMouseDown={(e) => { e.preventDefault(); handleSelectCustomer(c); }}
                            style={{
                              padding: "10px 16px",
                              cursor: "pointer",
                              borderBottom: "1px solid rgba(179,175,175,0.2)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                            }}
                            className="ci-cust-option"
                          >
                            <div>
                              <p style={{ margin: 0, fontWeight: 700, fontSize: "12px", color: "#011B2F" }}>
                                {c.name} - {c.mobile}
                              </p>
                              <p style={{ margin: "2px 0 0", fontWeight: 500, fontSize: "10.5px", color: "#6B7280" }}>
                                GSTN: {c.gstn || "—"}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* + Add New Customer Button */}
              <button
                onClick={() => setIsAddNewOpen(true)}
                style={{
                  height: "38px",
                  padding: "0 18px",
                  background: "#FFFFFF",
                  border: "1.5px solid #2576AB",
                  borderRadius: "6px",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 700,
                  fontSize: "14px",
                  color: "#173F63",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  whiteSpace: "nowrap",
                  transition: "background 0.15s",
                }}
                className="ci-add-new-btn"
              >
                <span style={{ fontSize: "20px", fontWeight: 700, lineHeight: 1 }}>+</span>
                Add New Customer
              </button>
            </div>

            {/* ── Selected Customer Details Box (Rectangle 73 in user specs) ── */}
            {selectedCustomer && (
              <div
                style={{
                  width: "100%",
                  background: "rgba(217, 217, 217, 0.3)",
                  border: "1px solid rgba(179, 175, 175, 0.54)",
                  borderRadius: "6px",
                  padding: "16px 22px",
                  boxSizing: "border-box",
                }}
              >
                <h3
                  style={{
                    margin: "0 0 14px 0",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: 700,
                    fontSize: "18px",
                    lineHeight: "23px",
                    color: "#011B2F",
                  }}
                >
                  Selected Customer Details
                </h3>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {/* Row 1: Name */}
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <User size={18} color="#011B2F" style={{ flexShrink: 0 }} />
                    <span style={{ fontWeight: 600, fontSize: "14px", color: "#011B2F", width: "140px" }}>
                      Customer Name:
                    </span>
                    <span style={{ fontWeight: 700, fontSize: "14px", color: "#173F63" }}>
                      {selectedCustomer.name || "—"}
                    </span>
                  </div>

                  <div style={{ width: "100%", height: "0.5px", background: "rgba(179, 175, 175, 0.72)" }} />

                  {/* Row 2: Mobile */}
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <Phone size={18} color="#011B2F" style={{ flexShrink: 0 }} />
                    <span style={{ fontWeight: 600, fontSize: "14px", color: "#011B2F", width: "140px" }}>
                      Mobile Number:
                    </span>
                    <span style={{ fontWeight: 700, fontSize: "14px", color: "#173F63" }}>
                      {selectedCustomer.mobile || "—"}
                    </span>
                  </div>

                  <div style={{ width: "100%", height: "0.5px", background: "rgba(179, 175, 175, 0.72)" }} />

                  {/* Row 3: GSTN */}
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <CreditCard size={18} color="#011B2F" style={{ flexShrink: 0 }} />
                    <span style={{ fontWeight: 600, fontSize: "14px", color: "#011B2F", width: "140px" }}>
                      GSTN:
                    </span>
                    <span style={{ fontWeight: 700, fontSize: "14px", color: "#173F63" }}>
                      {selectedCustomer.gstn || "—"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Card 2: Issue Complimentary Ticket? (Rectangle 96) ── */}
          <div
            style={{
              margin: "24px 38px 0 38px",
              background: "#FFFFFF",
              border: "1.5px solid rgba(179, 175, 175, 0.51)",
              borderRadius: "13px",
              padding: "24px 28px",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
              }}
              onClick={() => setIsComplimentary((p) => !p)}
            >
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: 700,
                    fontSize: "18px",
                    lineHeight: "23px",
                    color: "#011B2F",
                  }}
                >
                  Issue Complimentary Ticket?
                </h3>
                <p
                  style={{
                    margin: "4px 0 0",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: 600,
                    fontSize: "12px",
                    lineHeight: "15px",
                    color: "#6B7280",
                  }}
                >
                  Enable this only if the booking is being issued under a complimentary pass/reference
                </p>
              </div>

              {/* Checkbox */}
              <div
                style={{
                  width: "18px",
                  height: "18px",
                  borderRadius: "2px",
                  background: isComplimentary ? "#011B2F" : "#FFFFFF",
                  border: isComplimentary ? "none" : "1.5px solid #6B7280",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "all 0.15s ease",
                }}
              >
                {isComplimentary && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
              </div>
            </div>

            {/* Expanded Complimentary Form Fields (Image 4 specifications) */}
            {isComplimentary && (
              <div
                style={{
                  marginTop: "24px",
                  paddingTop: "20px",
                  borderTop: "1px solid rgba(179, 175, 175, 0.3)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "24px",
                }}
              >
                {/* 1. PASS DETAILS */}
                <div>
                  <h4 style={{ margin: "0 0 12px", fontWeight: 700, fontSize: "14px", color: "#2D6B92" }}>
                    PASS DETAILS
                  </h4>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>
                        Pass No.
                      </label>
                      <input
                        type="text"
                        placeholder="Enter Pass no."
                        value={passDetails.passNo}
                        onChange={(e) => setPassDetails({ ...passDetails, passNo: e.target.value })}
                        style={ciInputStyle}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>
                        Date
                      </label>
                      <input
                        type="date"
                        value={passDetails.date}
                        onChange={(e) => setPassDetails({ ...passDetails, date: e.target.value })}
                        style={ciInputStyle}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>
                        Discount
                      </label>
                      <select
                        value={passDetails.discount}
                        onChange={(e) => setPassDetails({ ...passDetails, discount: e.target.value })}
                        style={ciInputStyle}
                      >
                        <option>Select Discount %</option>
                        <option value="100%">100% (Full Complimentary)</option>
                        <option value="50%">50% Discount</option>
                        <option value="25%">25% Discount</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 2. GUEST DETAILS */}
                <div>
                  <h4 style={{ margin: "0 0 12px", fontWeight: 700, fontSize: "14px", color: "#2D6B92" }}>
                    GUEST DETAILS
                  </h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>
                        Guest Name
                      </label>
                      <input
                        type="text"
                        placeholder="Enter Guest Name"
                        value={guestDetails.guestName}
                        onChange={(e) => setGuestDetails({ ...guestDetails, guestName: e.target.value })}
                        style={ciInputStyle}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>
                        Mobile Number
                      </label>
                      <input
                        type="tel"
                        placeholder="Enter Mobile Number"
                        value={guestDetails.mobile}
                        maxLength={10}
                        onChange={(e) => setGuestDetails({ ...guestDetails, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                        style={ciInputStyle}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>
                        Department (optional)
                      </label>
                      <input
                        type="text"
                        placeholder="Enter Department"
                        value={guestDetails.department}
                        onChange={(e) => setGuestDetails({ ...guestDetails, department: e.target.value })}
                        style={ciInputStyle}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>
                        Post/Designation (optional)
                      </label>
                      <input
                        type="text"
                        placeholder="Enter Post/Designation"
                        value={guestDetails.post}
                        onChange={(e) => setGuestDetails({ ...guestDetails, post: e.target.value })}
                        style={ciInputStyle}
                      />
                    </div>
                  </div>
                </div>

                {/* 3. VISITOR COUNT */}
                <div>
                  <h4 style={{ margin: "0 0 12px", fontWeight: 700, fontSize: "14px", color: "#2D6B92" }}>
                    VISITOR COUNT
                  </h4>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>
                        Adults/Senior Citizen
                      </label>
                      <input
                        type="number"
                        placeholder="Enter Adults"
                        value={visitorCount.adults}
                        onChange={(e) => setVisitorCount({ ...visitorCount, adults: e.target.value })}
                        style={ciInputStyle}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>
                        Children
                      </label>
                      <input
                        type="number"
                        placeholder="Enter Children"
                        value={visitorCount.children}
                        onChange={(e) => setVisitorCount({ ...visitorCount, children: e.target.value })}
                        style={ciInputStyle}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>
                        Total
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={totalVisitorCount}
                        style={{ ...ciInputStyle, background: "#F8FAFC", color: "#011B2F", fontWeight: 700 }}
                      />
                    </div>
                  </div>
                </div>

                {/* 4. REFERENCE BY */}
                <div>
                  <h4 style={{ margin: "0 0 12px", fontWeight: 700, fontSize: "14px", color: "#2D6B92" }}>
                    Reference By
                  </h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>
                        Reference Person Name
                      </label>
                      <input
                        type="text"
                        placeholder="Enter Name"
                        value={referenceDetails.refName}
                        onChange={(e) => setReferenceDetails({ ...referenceDetails, refName: e.target.value })}
                        style={ciInputStyle}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>
                        Mobile Number
                      </label>
                      <input
                        type="tel"
                        placeholder="Enter Mobile Number"
                        value={referenceDetails.refMobile}
                        maxLength={10}
                        onChange={(e) => setReferenceDetails({ ...referenceDetails, refMobile: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                        style={ciInputStyle}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>
                        Department
                      </label>
                      <input
                        type="text"
                        placeholder="Enter Department"
                        value={referenceDetails.refDepartment}
                        onChange={(e) => setReferenceDetails({ ...referenceDetails, refDepartment: e.target.value })}
                        style={ciInputStyle}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "6px" }}>
                        Post/Designation
                      </label>
                      <input
                        type="text"
                        placeholder="Enter Post/Designation"
                        value={referenceDetails.refPost}
                        onChange={(e) => setReferenceDetails({ ...referenceDetails, refPost: e.target.value })}
                        style={ciInputStyle}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Card 3: Seat Allocation Accordion ── */}
          <div
            style={{
              margin: "24px 38px 0 38px",
              background: "#FFFFFF",
              border: "1px solid #A0A0A0",
              boxShadow: "-2px 4px 5.6px rgba(0, 0, 0, 0.08)",
              borderRadius: "13px",
              boxSizing: "border-box",
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "16px 24px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }} onClick={() => setIsSeatAllocExpanded((p) => !p)}>
              <div>
                <h4 style={{ margin: 0, fontWeight: 600, fontSize: "16px", lineHeight: "20px", color: "#011B2F" }}>
                  Seat Allocation
                </h4>
                <p style={{ margin: "2px 0 0", fontWeight: 500, fontSize: "12px", color: "#6B7280" }}>
                  Choose seats for this booking
                </p>
              </div>
              {isSeatAllocExpanded ? <ChevronUp size={22} color="#173F63" /> : <ChevronDown size={22} color="#173F63" />}
            </div>

            {isSeatAllocExpanded && (
              <div style={{ borderTop: "1px solid #E2E8F0" }} onClick={e => e.stopPropagation()}>
                <SeatAllocationPanel bookingSummary={bookingSummary} />
              </div>
            )}
          </div>

          {/* ── Footer Actions ── */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "32px 38px 32px 38px",
              flexWrap: "wrap",
              gap: "16px",
            }}
          >
            <button
              onClick={onBack}
              className="ci-back-btn"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                width: "191px",
                height: "48px",
                justifyContent: "center",
                background: "#FFFFFF",
                border: "0.5px solid #002A45",
                borderRadius: "4px",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 700,
                fontSize: "14px",
                color: "#011B2F",
                cursor: "pointer",
                transition: "background 0.18s",
              }}
            >
              <ArrowLeft size={18} color="#011B2F" /> Back
            </button>

            <button
              onClick={handleContinue}
              className="ci-continue-btn"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                width: "197px",
                height: "48px",
                justifyContent: "center",
                background: "#F4BC43",
                border: "none",
                borderRadius: "8px",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 700,
                fontSize: "14px",
                color: "#011B2F",
                cursor: "pointer",
                transition: "background 0.18s, transform 0.15s",
              }}
            >
              Continue <ArrowRight size={18} color="#011B2F" />
            </button>
          </div>
        </div>
      </div>

      <AddNewCustomerModal
        isOpen={isAddNewOpen}
        onClose={() => setIsAddNewOpen(false)}
        onSave={handleSaveNewCustomer}
      />

      <ProcessPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        grandTotal={grandTotal}
        attractionName={bookingSummary[0]?.attractionName || "Attraction"}
        onConfirm={() => {
          setShowPaymentModal(false);
          setShowTicketModal(true);
        }}
      />

      {/* Ticket Generated Modal */}
      <TicketGeneratedModalWithProfile
        isOpen={showTicketModal}
        onClose={() => {
          setShowTicketModal(false);
          onContinue({ name: selectedCustomer?.name || "-", mobile: selectedCustomer?.mobile || "-", gstn: selectedCustomer?.gstn || undefined });
        }}
        attractionName={bookingSummary[0]?.attractionName || "-"}
        grandTotal={grandTotal}
        totalPax={bookingSummary.reduce((s, b) => s + b.passengers.reduce((x, p) => x + p.qty, 0), 0) || 2}
      />

      <style jsx global>{`
        .ci-cust-option:hover { background: #F0F4F8; }
        .ci-back-btn:hover { background: #F0F4F8 !important; }
        .ci-continue-btn:hover { background: #e5af36 !important; transform: translateY(-1px); }
        .ci-add-new-btn:hover { background: #EFF6FF !important; }
        .pay-confirm-btn:hover { background: #e5af36 !important; transform: translateY(-1px); }
      `}</style>
    </>
  );
}

const ciInputStyle: React.CSSProperties = {
  boxSizing: "border-box",
  width: "100%",
  height: "38px",
  background: "#FFFFFF",
  border: "1.5px solid rgba(179, 175, 175, 0.51)",
  borderRadius: "8px",
  padding: "0 12px",
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontWeight: 500,
  fontSize: "12px",
  color: "#011B2F",
  outline: "none",
};
