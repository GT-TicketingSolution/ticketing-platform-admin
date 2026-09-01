"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
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
  Calendar,
  Clock,
  Users,
} from "lucide-react";
import AddNewCustomerModal, { NewCustomer } from "./AddNewCustomerModal";
import {
  useTicketingCustomers,
  useCreateTicketingCustomer,
  useCreateTicketingBooking,
  useTicketingPayment,
  useConfirmTicketingBooking,
  useCancelTicketingBooking,
  useAttractionTripNo,
  useAttractionSeatAvailability,
  useCreateAttractionSeatBooking,
  TicketingCustomer,
  AttractionSeatItem,
  AttractionSeatLayout,
  AttractionSeatAvailabilityData,
} from "@/hooks/useTicketingBookingQueries";

export interface BookingSummaryItem {
  attractionId?: string;
  attractionName: string;
  hasSeating?: boolean;
  seatLayoutId?: string | null;
  passengers: { label: string; key?: string; qty: number; unitPrice?: number }[];
  subtotal?: number;
  gstAmount?: number;
  gstAdjustment?: number;
  roundOff?: number;
  totalAmount: number;
}

interface CustomerInfoViewProps {
  onBack: () => void;
  onContinue: (customer: { name: string; mobile: string; gstn?: string }) => void;
  bookingSummary: BookingSummaryItem[];
}

export type CustomerRecord = TicketingCustomer;

const SEAT_STORAGE_KEY = "seat_layouts_data";

type SeatStatus = "available" | "selected" | "occupied";

interface SectionState {
  name: string;
  totalSeats: number;
  occupiedSeats: number[];
}

// ── Process Payment Modal 
// ── Process Payment Modal (Compact & Proportionate) 
function ProcessPaymentModal({
  isOpen,
  onClose,
  onConfirm,
  grandTotal,
  attractionName,
  isSubmitting = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (payMethod: "CASH" | "UPI" | "CARD" | "ONLINE", amtRcv: number) => void;
  grandTotal: number;
  attractionName: string;
  isSubmitting?: boolean;
}) {
  const [payMethod, setPayMethod] = useState<"cash" | "card" | "upi">("cash");
  const [amtRcv, setAmtRcv] = useState("");
  const [selectedNotes, setSelectedNotes] = useState<number[]>([]);
  const isOnline = payMethod === "upi" || payMethod === "card";
  const numAmtRcv = parseFloat(amtRcv || "0");
  const change = isOnline ? 0 : (amtRcv ? Math.max(0, numAmtRcv - grandTotal) : 0);
  const isCashAmountValid = isOnline || (amtRcv.trim() !== "" && numAmtRcv >= grandTotal);

  useEffect(() => {
    if (isOpen) {
      setPayMethod("cash");
      setAmtRcv("");
      setSelectedNotes([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (payMethod === "upi" || payMethod === "card") {
      setAmtRcv(grandTotal.toFixed(2));
      setSelectedNotes([]);
    } else if (payMethod === "cash") {
      setAmtRcv("");
      setSelectedNotes([]);
    }
  }, [payMethod, grandTotal]);

  const handleQuickNoteClick = (noteVal: number) => {
    const next = [...selectedNotes, noteVal];
    setSelectedNotes(next);
    const total = next.reduce((a, b) => a + b, 0);
    setAmtRcv(total.toString());
  };

  const handleClearNotes = () => {
    setSelectedNotes([]);
    setAmtRcv("");
  };

  if (!isOpen) return null;

  const methods: { key: "cash" | "card" | "upi"; label: string; icon: React.ReactNode; disabled?: boolean }[] = [
    {
      key: "cash",
      label: "Cash",
      icon: <Banknote size={22} color={payMethod === "cash" ? "#173F63" : "#808081"} />,
    },
    {
      key: "card",
      label: "Card",
      disabled: true,
      icon: (
        <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
          <rect x="3" y="7" width="22" height="14" rx="2" stroke="#9CA3AF" strokeWidth="1.5" fill="none" />
          <rect x="3" y="11" width="22" height="3" fill="#9CA3AF" opacity="0.4" />
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
          width: "490px",
          maxWidth: "94vw",
          boxShadow: "0 20px 60px rgba(0,0,0,0.22)",
          fontFamily: "'Plus Jakarta Sans',sans-serif",
          overflow: "hidden",
          boxSizing: "border-box",
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Close Icon */}
        <div style={{ padding: "18px 24px 0 24px", position: "relative" }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              position: "absolute",
              top: "16px",
              right: "20px",
              background: "rgba(0,0,0,0.05)",
              border: "none",
              borderRadius: "50%",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#64748B",
              transition: "background 0.15s",
            }}
            title="Close"
          >
            <X size={18} />
          </button>
          <h2 style={{ margin: 0, fontWeight: 700, fontSize: "18px", lineHeight: "22px", color: "#011B2F", paddingRight: "40px" }}>
            Process Payment
          </h2>
          <p style={{ margin: "3px 0 0 0", fontWeight: 600, fontSize: "12px", color: "#0E4E7A", paddingRight: "40px" }}>
            {attractionName}
          </p>
        </div>

        <div style={{ height: "0.5px", background: "rgba(179,175,175,0.6)", margin: "14px 0 0 0" }} />

        <div style={{ padding: "18px 24px 22px 24px", display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* Amount Due Card */}
          <div style={{ background: "#002A45", borderRadius: "16px", padding: "14px 18px", textAlign: "center" }}>
            <p style={{ margin: 0, fontWeight: 800, fontSize: "13px", color: "#7599B0", letterSpacing: "0.05em" }}>
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
                  onClick={() => {
                    if (!m.disabled) setPayMethod(m.key);
                  }}
                  title={m.disabled ? "Card payment is disabled" : undefined}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    padding: "12px 8px",
                    borderRadius: "14px",
                    border: m.disabled
                      ? "1.5px solid rgba(179,175,175,0.3)"
                      : payMethod === m.key
                        ? "1.5px solid #173F63"
                        : "1.5px solid rgba(179,175,175,0.45)",
                    background: m.disabled
                      ? "#F3F4F6"
                      : payMethod === m.key
                        ? "rgba(122,178,214,0.18)"
                        : "#F3F4F6",
                    cursor: m.disabled ? "not-allowed" : "pointer",
                    opacity: m.disabled ? 0.45 : 1,
                    transition: "all 0.15s ease",
                    userSelect: "none",
                  }}
                >
                  {m.icon}
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: "15px",
                      color: m.disabled ? "#9CA3AF" : payMethod === m.key ? "#173F63" : "#808081",
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
                {selectedNotes.length > 0 && (
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
                    ✕ Clear
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
                  height: "38px",
                  background: isOnline ? "#F8FAFC" : "#FFFFFF",
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
                  height: "38px",
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
              const mode = payMethod.toUpperCase() as "CASH" | "UPI" | "CARD" | "ONLINE";
              // For cash: amountPaid = Amount Received − Change Return (net amount paid)
              // For online: amountPaid = grandTotal
              const netAmountPaid = isOnline ? grandTotal : (numAmtRcv - change);
              onConfirm(mode, netAmountPaid);
            }}
            disabled={isSubmitting || !isCashAmountValid}
            className="pay-confirm-btn"
            style={{
              width: "100%",
              height: "46px",
              background: isSubmitting || !isCashAmountValid ? "#E2E8F0" : "#F4BC43",
              border: "none",
              borderRadius: "14px",
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontWeight: 800,
              fontSize: "16px",
              color: isSubmitting || !isCashAmountValid ? "#94A3B8" : "#173F63",
              cursor: isSubmitting || !isCashAmountValid ? "not-allowed" : "pointer",
              transition: "background 0.15s, transform 0.1s",
              marginTop: "4px",
              opacity: isSubmitting || !isCashAmountValid ? 0.7 : 1,
            }}
          >
            {isSubmitting ? "Processing Payment..." : `Confirm Payment – Rs.${grandTotal.toFixed(2)}`}
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

// ── Ticket Generated Modal (Thermal Receipt Layout matching real POS receipt) ──
function TicketGeneratedModal({
  isOpen,
  onClose,
  attractionName,
  grandTotal,
  totalPax,
  confirmedData,
  bookingSummary = [],
  customerInfo = { name: "", mobile: "" },
  selectedSeats = [],
  subtotal = 0,
  gstAmount = 0,
  roundOff = 0,
  businessName = "",
  timeSlot = "",
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
  timeSlot?: string;
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

  // Build items strictly from bookingSummary
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
            {/* Business / Organization Name */}
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

              {/* Slot & Seat Information if applicable */}
              {(timeSlot || (selectedSeats && selectedSeats.length > 0)) && (
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
                  {timeSlot && <div>Slot Time: {timeSlot}</div>}
                  {selectedSeats && selectedSeats.length > 0 && (
                    <div style={{ marginTop: timeSlot ? "2px" : 0 }}>
                      Seats: {seatText}
                    </div>
                  )}
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

// ── Selected Seat Object Type ────────────────────────────────────────────────
export interface SelectedSeatObj {
  attractionId: string;
  attractionSeatId: string;
  seatOrder: number;
  name: string;
}

// ── Section Seat Allocation Panel (Real API Integration) ─────────────────────
interface SeatAllocationPanelProps {
  bookingSummary: BookingSummaryItem[];
  selectedSeats: string[];
  selectedSeatObjs: SelectedSeatObj[];
  paxAssignment: Record<string, string>;
  onSelectedSeatsChange: (
    seats: string[],
    paxAssignment: Record<string, string>,
    seatObjs: SelectedSeatObj[]
  ) => void;
  currentTrip: number;
  onTripChange: (trip: number) => void;
  timeSlot: string;
  onTimeSlotChange: (slot: string) => void;
  slotDate: string;
}

function SeatAllocationPanel({
  bookingSummary,
  selectedSeats,
  selectedSeatObjs,
  paxAssignment,
  onSelectedSeatsChange,
  currentTrip,
  onTripChange,
  timeSlot,
  onTimeSlotChange,
  slotDate,
}: SeatAllocationPanelProps) {
  // Exact count of visitors across all categories
  const totalPax = useMemo(() => {
    return bookingSummary.reduce(
      (sum, b) => sum + b.passengers.reduce((s, p) => s + (p.qty || 0), 0),
      0
    );
  }, [bookingSummary]);

  // Dynamic list of individual passenger labels (e.g. Adult 1, Adult 2, Child 1)
  const paxList = useMemo(() => {
    const list: { label: string; idx: number }[] = [];
    bookingSummary.forEach((b) => {
      const cnt: Record<string, number> = {};
      b.passengers.forEach((p) => {
        if (p.qty > 0) {
          for (let i = 1; i <= p.qty; i++) {
            cnt[p.label] = (cnt[p.label] || 0) + 1;
            list.push({ label: p.label, idx: cnt[p.label] });
          }
        }
      });
    });
    return list;
  }, [bookingSummary]);

  const targetAttractionId = useMemo(
    () =>
      bookingSummary.find((b) => b.hasSeating || b.seatLayoutId)?.attractionId ||
      bookingSummary[0]?.attractionId ||
      "",
    [bookingSummary]
  );
  const targetAttractionName = useMemo(
    () =>
      bookingSummary.find((b) => b.hasSeating || b.seatLayoutId)?.attractionName ||
      bookingSummary[0]?.attractionName ||
      "",
    [bookingSummary]
  );

  const todayDateStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Real API Call: Fetch seat availability and layout
  const seatAvailabilityPayload = useMemo(
    () =>
      targetAttractionId
        ? [{ attractionId: targetAttractionId, currentTripNo: currentTrip }]
        : [],
    [targetAttractionId, currentTrip]
  );

  const {
    data: seatAvailData = [],
    isLoading: isLoadingSeats,
    isFetching: isFetchingSeats,
    isError: isSeatsError,
    error: seatsError,
    refetch: refetchSeats,
  } = useAttractionSeatAvailability(seatAvailabilityPayload, !!targetAttractionId);

  const currentSeatData = seatAvailData?.[0] || null;
  const seatsList: AttractionSeatItem[] = useMemo(
    () => currentSeatData?.seats || [],
    [currentSeatData]
  );
  const seatLayout: AttractionSeatLayout | null = useMemo(
    () => currentSeatData?.seatLayout || null,
    [currentSeatData]
  );
  const bookedSeats: number[] = useMemo(
    () => currentSeatData?.bookedSeats || [],
    [currentSeatData]
  );

  const rowsCount = seatLayout?.rows || 0;
  const colsCount = seatLayout?.cols || 0;
  const hasAisle = seatLayout?.hasAisle ?? false;
  const aisleAfterCol = seatLayout?.aisleAfterCol ?? null;

  const totalLayoutSeats = (rowsCount > 0 && colsCount > 0) ? (rowsCount * colsCount) : (seatsList.length || 0);

  // Full list of seats spanning rowsCount * colsCount
  const fullSeatsList: AttractionSeatItem[] = useMemo(() => {
    if (rowsCount <= 0 || colsCount <= 0) return seatsList;
    const total = rowsCount * colsCount;
    const map = new Map<number, AttractionSeatItem>();
    seatsList.forEach((s) => map.set(s.seatOrder, s));
    const full: AttractionSeatItem[] = [];
    for (let order = 1; order <= total; order++) {
      if (map.has(order)) {
        full.push(map.get(order)!);
      } else {
        full.push({
          attractionSeatId: `pos-seat-${order}`,
          name: `Seat ${order}`,
          seatOrder: order,
        });
      }
    }
    return full;
  }, [seatsList, rowsCount, colsCount]);

  // List of all non-occupied seats sorted sequentially by seatOrder
  const availableSeatsList = useMemo(() => {
    return fullSeatsList
      .filter((s) => !bookedSeats.includes(s.seatOrder))
      .sort((a, b) => a.seatOrder - b.seatOrder);
  }, [fullSeatsList, bookedSeats]);

  // ── Auto Sequential Booking
  useEffect(() => {
    if (totalPax <= 0) {
      if (selectedSeats.length > 0) {
        onSelectedSeatsChange([], {}, []);
      }
      return;
    }

    if (availableSeatsList.length === 0) return;

    // Filter valid currently selected seats that are still available
    const validCurrent = selectedSeatObjs.filter((so) =>
      availableSeatsList.some(
        (s) => s.seatOrder === so.seatOrder && s.attractionSeatId === so.attractionSeatId
      )
    );

    // If already exactly matching totalPax and all valid, synchronize assignments
    if (validCurrent.length === totalPax) {
      const nextSeatNames = validCurrent.map((s) => s.name);
      const newAsgn: Record<string, string> = {};
      validCurrent.forEach((s, idx) => {
        if (paxList[idx]) {
          newAsgn[s.name] = `${paxList[idx].label} ${paxList[idx].idx}`;
        }
      });
      if (
        validCurrent.length !== selectedSeats.length ||
        validCurrent.some((s, i) => s.name !== selectedSeats[i])
      ) {
        onSelectedSeatsChange(nextSeatNames, newAsgn, validCurrent);
      }
      return;
    }

    // Sequentially fill missing seats with first available non-booked seats
    const nextObjs: SelectedSeatObj[] = [...validCurrent];
    for (const s of availableSeatsList) {
      if (nextObjs.length >= totalPax) break;
      if (!nextObjs.some((o) => o.seatOrder === s.seatOrder)) {
        nextObjs.push({
          attractionId: targetAttractionId,
          attractionSeatId: s.attractionSeatId,
          seatOrder: s.seatOrder,
          name: s.name,
        });
      }
    }

    const nextSeatNames = nextObjs.map((o) => o.name);
    const newAsgn: Record<string, string> = {};
    nextObjs.forEach((o, idx) => {
      if (paxList[idx]) {
        newAsgn[o.name] = `${paxList[idx].label} ${paxList[idx].idx}`;
      }
    });

    onSelectedSeatsChange(nextSeatNames, newAsgn, nextObjs);
  }, [availableSeatsList, totalPax, targetAttractionId, currentTrip]);

  // Map seats into row buckets
  const rowSeatsMap = useMemo(() => {
    const map: Record<
      number,
      (AttractionSeatItem & { status: "available" | "occupied"; row: number; column: number })[]
    > = {};
    for (let r = 1; r <= rowsCount; r++) {
      map[r] = [];
    }

    seatsList.forEach((seat) => {
      const r = colsCount > 0 ? Math.floor((seat.seatOrder - 1) / colsCount) + 1 : 1;
      const c = colsCount > 0 ? ((seat.seatOrder - 1) % colsCount) + 1 : seat.seatOrder;
      const isOcc = bookedSeats.includes(seat.seatOrder);

      if (!map[r]) map[r] = [];
      map[r].push({
        ...seat,
        status: isOcc ? "occupied" : "available",
        row: r,
        column: c,
      });
    });

    Object.keys(map).forEach((rk) => {
      map[Number(rk)].sort((a, b) => a.column - b.column);
    });

    return map;
  }, [seatsList, bookedSeats, rowsCount, colsCount]);

  // Handle clicking a seat (custom selection / reallocation)
  const handleSeatToggle = (seat: AttractionSeatItem) => {
    const isOccupied = bookedSeats.includes(seat.seatOrder);
    if (isOccupied) return;

    const isAlreadySelected = selectedSeatObjs.some((s) => s.seatOrder === seat.seatOrder);

    if (isAlreadySelected) {
      // Deselect clicked seat
      const nextObjs = selectedSeatObjs.filter((s) => s.seatOrder !== seat.seatOrder);
      const nextNames = nextObjs.map((s) => s.name);
      const nextAsgn: Record<string, string> = {};
      nextObjs.forEach((s, i) => {
        if (paxList[i]) {
          nextAsgn[s.name] = `${paxList[i].label} ${paxList[i].idx}`;
        }
      });
      onSelectedSeatsChange(nextNames, nextAsgn, nextObjs);
    } else {
      let nextObjs = [...selectedSeatObjs];
      const newSeatObj: SelectedSeatObj = {
        attractionId: targetAttractionId,
        attractionSeatId: seat.attractionSeatId,
        seatOrder: seat.seatOrder,
        name: seat.name,
      };
      if (nextObjs.length < totalPax) {
        nextObjs.push(newSeatObj);
      } else if (totalPax > 0) {
        nextObjs[nextObjs.length - 1] = newSeatObj;
      }
      const nextNames = nextObjs.map((s) => s.name);
      const nextAsgn: Record<string, string> = {};
      nextObjs.forEach((s, i) => {
        if (paxList[i]) {
          nextAsgn[s.name] = `${paxList[i].label} ${paxList[i].idx}`;
        }
      });
      onSelectedSeatsChange(nextNames, nextAsgn, nextObjs);
    }
  };

  const newTrip = () => {
    const nextTrip = currentTrip + 1;
    onTripChange(nextTrip);
    onSelectedSeatsChange([], {}, []);
  };

  const formatSeatLabel = (seat: AttractionSeatItem) => {
    if (!seat.name) return String(seat.seatOrder).padStart(2, "0");
    const match = seat.name.match(/^Seat\s*(\d+)$/i);
    if (match) {
      const num = parseInt(match[1], 10);
      return num < 100 ? String(num).padStart(2, "0") : String(num);
    }
    const numericOnly = seat.name.trim().match(/^\d+$/);
    if (numericOnly) {
      const num = parseInt(seat.name.trim(), 10);
      return num < 100 ? String(num).padStart(2, "0") : String(num);
    }
    return seat.name;
  };

  // Render individual seat button
  const renderSeatButton = (
    seat: AttractionSeatItem & { status: "available" | "occupied" }
  ) => {
    const isOccupied = seat.status === "occupied";
    const isSelected = selectedSeatObjs.some((s) => s.seatOrder === seat.seatOrder);

    return (
      <button
        key={seat.attractionSeatId || seat.seatOrder}
        type="button"
        disabled={isOccupied}
        onClick={(e) => {
          e.stopPropagation();
          handleSeatToggle(seat);
        }}
        title={`Seat ${seat.name || seat.seatOrder}${isOccupied ? " (Occupied)" : isSelected ? " (Selected)" : " (Available)"}`}
        style={{
          width: "56px",
          minWidth: "56px",
          height: "34px",
          padding: "0 4px",
          borderRadius: "4px",
          border: isSelected
            ? "1.5px solid #D99B1E"
            : isOccupied
              ? "1.5px solid #CBD5E1"
              : "1.5px solid #CBD5E1",
          background: isSelected
            ? "#EAA838"
            : isOccupied
              ? "#D9DCE1"
              : "#FFFFFF",
          cursor: isOccupied ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "13px",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontWeight: 600,
          color: isOccupied ? "#64748B" : "#011B2F",
          transition: "all 0.12s ease",
          userSelect: "none",
          boxSizing: "border-box",
          flexShrink: 0,
        }}
      >
        {formatSeatLabel(seat)}
      </button>
    );
  };

  return (
    <div
      style={{
        background: "#FFFFFF",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        padding: "20px 24px",
        borderRadius: "13px",
        boxSizing: "border-box",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        style={{
          display: "flex",
          gap: "20px",
          alignItems: "flex-start",
        }}
      >
        {/* ── Left Container: Layout Overview & Status ── */}
        <div
          style={{
            width: "220px",
            minWidth: "220px",
            flexShrink: 0,
            background: "#FFFFFF",
            border: "1.5px solid rgba(179, 175, 175, 0.51)",
            borderRadius: "13px",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            boxSizing: "border-box",
          }}
        >
          <h3
            style={{
              margin: "0 0 2px 0",
              fontWeight: 700,
              fontSize: "14px",
              lineHeight: "18px",
              color: "#011B2F",
            }}
          >
            Layout Overview
          </h3>

          <div
            style={{
              width: "100%",
              background: "rgba(244, 188, 67, 0.08)",
              border: "1.5px solid #173F63",
              borderRadius: "10px",
              padding: "12px 14px",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "6px",
              }}
            >
              <span
                style={{
                  fontWeight: 800,
                  fontSize: "13.5px",
                  lineHeight: "18px",
                  color: "#011B2F",
                }}
              >
                {seatLayout?.name || targetAttractionName || "Seat Layout"}
              </span>
              <span
                style={{
                  background: "rgba(244, 188, 67, 0.61)",
                  color: "#173F63",
                  fontSize: "9px",
                  fontWeight: 800,
                  padding: "2px 8px",
                  borderRadius: "5px",
                }}
              >
                Trip #{currentTrip}
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "3px", marginTop: "8px" }}>
              <p
                style={{
                  margin: 0,
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#475569",
                }}
              >
                Total Seats: <span style={{ fontWeight: 800, color: "#011B2F" }}>{totalLayoutSeats}</span>
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#16A34A",
                }}
              >
                Available: <span style={{ fontWeight: 800 }}>{availableSeatsList.length}</span>
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#DC2626",
                }}
              >
                Booked: <span style={{ fontWeight: 800 }}>{bookedSeats.length}</span>
              </p>
            </div>
          </div>
        </div>

        {/* ── Right Container: Dynamic Layout Grid & Summary ── */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            background: "#FFFFFF",
            border: "1.5px solid rgba(179, 175, 175, 0.51)",
            borderRadius: "13px",
            padding: "20px 22px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            boxSizing: "border-box",
          }}
        >
          {/* Top Slot, Date, Availability & Trip Metadata Bar */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
              gap: "10px",
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              borderRadius: "10px",
              padding: "10px 14px",
              boxSizing: "border-box",
            }}
          >
            {/* Date */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  background: "rgba(23, 63, 99, 0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Calendar size={15} color="#173F63" />
              </div>
              <div>
                <div
                  style={{
                    fontSize: "9px",
                    fontWeight: 600,
                    color: "#64748B",
                    textTransform: "uppercase",
                    letterSpacing: "0.4px",
                  }}
                >
                  Date
                </div>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#011B2F" }}>
                  {slotDate}
                </div>
              </div>
            </div>

            {/* Available Seats */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  background: "rgba(34, 197, 94, 0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Users size={15} color="#16A34A" />
              </div>
              <div>
                <div
                  style={{
                    fontSize: "9px",
                    fontWeight: 600,
                    color: "#64748B",
                    textTransform: "uppercase",
                    letterSpacing: "0.4px",
                  }}
                >
                  Available Seats
                </div>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#15803D" }}>
                  {availableSeatsList.length} / {seatsList.length} Seats
                </div>
              </div>
            </div>

            {/* Trip Progress */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  background: "rgba(244, 188, 67, 0.18)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <RotateCcw size={15} color="#B45309" />
              </div>
              <div>
                <div
                  style={{
                    fontSize: "9px",
                    fontWeight: 600,
                    color: "#64748B",
                    textTransform: "uppercase",
                    letterSpacing: "0.4px",
                  }}
                >
                  Current Trip
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#011B2F" }}>
                    Trip #{currentTrip}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Header Row: Title & Action Buttons */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <h4
              style={{
                margin: 0,
                fontWeight: 700,
                fontSize: "14px",
                lineHeight: "18px",
                color: "#011B2F",
              }}
            >
              Select Seats – {seatLayout?.name || targetAttractionName || "Layout"}
            </h4>

            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  newTrip();
                }}
                style={{
                  width: "158px",
                  height: "35px",
                  background: "#FFFFFF",
                  border: "1.5px solid #2576AB",
                  borderRadius: "6px",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 600,
                  fontSize: "12px",
                  color: "#173F63",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
              >
                <Plus size={16} strokeWidth={2.5} /> Make New Trip
              </button>

              <button
                type="button"
                disabled={isFetchingSeats}
                onClick={(e) => {
                  e.stopPropagation();
                  refetchSeats();
                }}
                style={{
                  width: "158px",
                  height: "35px",
                  background: isFetchingSeats ? "#F3F4F6" : "#FFFFFF",
                  border: "1.5px solid #2576AB",
                  borderRadius: "6px",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 600,
                  fontSize: "12px",
                  color: "#173F63",
                  cursor: isFetchingSeats ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
              >
                <RotateCcw
                  size={15}
                  strokeWidth={2}
                  style={{ animation: isFetchingSeats ? "spin 1s linear infinite" : "none" }}
                />{" "}
                {isFetchingSeats ? "Refreshing..." : "Refresh Seats"}
              </button>
            </div>
          </div>

          {/* Info Banner */}
          <div
            style={{
              background: "#DEF2FF",
              border: "1px solid rgba(23, 63, 99, 0.4)",
              borderRadius: "7px",
              padding: "8px 14px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxSizing: "border-box",
            }}
          >
            <AlertCircle size={16} color="rgba(6, 78, 124, 0.9)" style={{ flexShrink: 0 }} />
            <p
              style={{
                margin: 0,
                fontSize: "11px",
                fontWeight: 600,
                lineHeight: "14px",
                color: "#2D6B92",
              }}
            >
              Seats are automatically booked in sequence. You can click any available seat to customize selection.
            </p>
          </div>

          {/* ── SEAT MAP AREA ── */}
          {isSeatsError ? (
            <div
              style={{
                padding: "36px 20px",
                textAlign: "center",
                background: "#FEF2F2",
                border: "1.5px solid #FECACA",
                borderRadius: "12px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <AlertTriangle size={32} color="#DC2626" />
              <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#991B1B" }}>
                Failed to Load Seat Availability
              </h4>
              <p style={{ margin: 0, fontSize: "12px", color: "#B91C1C", maxWidth: "420px" }}>
                {((seatsError as any)?.error?.message || (seatsError as any)?.message) ||
                  "Unable to fetch seat layout from the server. Please check connection or retry."}
              </p>
              <button
                type="button"
                onClick={() => refetchSeats()}
                style={{
                  marginTop: "6px",
                  background: "#DC2626",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: "6px",
                  padding: "8px 20px",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Retry
              </button>
            </div>
          ) : isLoadingSeats || (isFetchingSeats && !seatAvailData.length) ? (
            <div
              style={{
                padding: "48px 20px",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <RotateCcw
                size={26}
                color="#173F63"
                style={{ animation: "spin 1s linear infinite" }}
              />
              <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "#64748B" }}>
                Loading seat layout from server...
              </p>
            </div>
          ) : seatsList.length === 0 ? (
            <div
              style={{
                padding: "36px 20px",
                textAlign: "center",
                background: "#F8FAFC",
                border: "1px dashed #CBD5E1",
                borderRadius: "12px",
                color: "#64748B",
                fontSize: "13px",
                fontWeight: 600,
              }}
            >
              No active attraction seats found for this attraction.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) 260px",
                gap: "24px",
                alignItems: "start",
                width: "100%",
                boxSizing: "border-box",
              }}
            >
              {/* Left Side: Interactive Seat Map */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                  overflowX: "auto",
                  paddingBottom: "8px",
                  minWidth: 0,
                }}
              >
                {/* Side Headers & Seat Grid */}
                <div style={{ display: "inline-flex", gap: "16px", alignItems: "flex-start" }}>
                  {/* Left Side Group */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {hasAisle && aisleAfterCol && (
                      <div
                        style={{
                          textAlign: "center",
                          fontSize: "13px",
                          fontWeight: 700,
                          color: "#173F63",
                          paddingBottom: "2px",
                        }}
                      >
                        Left Side
                      </div>
                    )}
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {Array.from({ length: rowsCount }, (_, i) => i + 1).map((r) => {
                        const leftColsCount = hasAisle && aisleAfterCol ? aisleAfterCol : colsCount;
                        const leftCells = Array.from({ length: leftColsCount }, (_, ci) => {
                          const order = (r - 1) * colsCount + (ci + 1);
                          const seat = fullSeatsList.find((s) => s.seatOrder === order) || {
                            attractionSeatId: `pos-${order}`,
                            name: `Seat ${order}`,
                            seatOrder: order,
                          };
                          return { order, col: ci + 1, seat };
                        });

                        return (
                          <div key={r} style={{ display: "flex", gap: "8px" }}>
                            {leftCells.map(({ order, seat }) =>
                              renderSeatButton({
                                ...seat,
                                status: bookedSeats.includes(seat.seatOrder) ? "occupied" : "available",
                              })
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Center AISLE (Vertical container spanning full height of rows) */}
                  {hasAisle && aisleAfterCol && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignSelf: "stretch",
                        paddingTop: "24px",
                      }}
                    >
                      <div
                        style={{
                          width: "56px",
                          flex: 1,
                          minHeight: `${rowsCount * 42}px`,
                          border: "1.5px dashed #CBD5E1",
                          borderRadius: "4px",
                          background: "transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "12px",
                          fontWeight: 700,
                          color: "#475569",
                          letterSpacing: "1px",
                          boxSizing: "border-box",
                        }}
                      >
                        AISLE
                      </div>
                    </div>
                  )}

                  {/* Right Side Group */}
                  {hasAisle && aisleAfterCol && colsCount > aisleAfterCol && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <div
                        style={{
                          textAlign: "center",
                          fontSize: "13px",
                          fontWeight: 700,
                          color: "#173F63",
                          paddingBottom: "2px",
                        }}
                      >
                        Right Side
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {Array.from({ length: rowsCount }, (_, i) => i + 1).map((r) => {
                          const rightColsCount = colsCount - aisleAfterCol;
                          const rightCells = Array.from({ length: rightColsCount }, (_, ci) => {
                            const order = (r - 1) * colsCount + (aisleAfterCol + ci + 1);
                            const seat = fullSeatsList.find((s) => s.seatOrder === order) || {
                              attractionSeatId: `pos-${order}`,
                              name: `Seat ${order}`,
                              seatOrder: order,
                            };
                            return { order, col: aisleAfterCol + ci + 1, seat };
                          });

                          return (
                            <div key={r} style={{ display: "flex", gap: "8px" }}>
                              {rightCells.map(({ order, seat }) =>
                                renderSeatButton({
                                  ...seat,
                                  status: bookedSeats.includes(seat.seatOrder) ? "occupied" : "available",
                                })
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Legend */}
                <div
                  style={{
                    display: "flex",
                    gap: "28px",
                    alignItems: "center",
                    marginTop: "16px",
                    paddingLeft: "4px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div
                      style={{
                        width: "24px",
                        height: "22px",
                        border: "1.5px solid #CBD5E1",
                        borderRadius: "4px",
                        background: "#FFFFFF",
                      }}
                    />
                    <span style={{ fontSize: "12px", fontWeight: 500, color: "#475569" }}>
                      Available
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div
                      style={{
                        width: "24px",
                        height: "22px",
                        background: "#EAA838",
                        border: "1.5px solid #D99B1E",
                        borderRadius: "4px",
                      }}
                    />
                    <span style={{ fontSize: "12px", fontWeight: 500, color: "#475569" }}>
                      Selected
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div
                      style={{
                        width: "24px",
                        height: "22px",
                        background: "#D9DCE1",
                        border: "1.5px solid #CBD5E1",
                        borderRadius: "4px",
                      }}
                    />
                    <span style={{ fontSize: "12px", fontWeight: 500, color: "#475569" }}>
                      Occupied
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Side: Selected Seats Cards */}
              <div
                style={{
                  width: "260px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                  flexShrink: 0,
                }}
              >
                {/* Selected Seats List */}
                <div
                  style={{
                    width: "100%",
                    minHeight: "160px",
                    background: "#FFFFFF",
                    border: "1.5px solid rgba(179, 175, 175, 0.51)",
                    borderRadius: "8px",
                    padding: "14px 16px",
                    boxSizing: "border-box",
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
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: "11px",
                        lineHeight: "14px",
                        color: "#011B2F",
                      }}
                    >
                      Selected Seats
                    </span>
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: "11px",
                        lineHeight: "14px",
                        color:
                          selectedSeats.length === totalPax ? "#15803D" : "#D99B1E",
                      }}
                    >
                      {selectedSeats.length}/{totalPax} Selected
                    </span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {paxList.length === 0 ? (
                      <p style={{ margin: 0, fontSize: "11px", color: "#94A3B8" }}>
                        No visitors selected
                      </p>
                    ) : (
                      paxList.map((p, i) => {
                        const sk = selectedSeats[i];
                        const sObj = selectedSeatObjs[i];
                        return (
                          <React.Fragment key={i}>
                            {i > 0 && (
                              <div
                                style={{
                                  width: "100%",
                                  height: "0.5px",
                                  background: "rgba(179, 175, 175, 0.31)",
                                }}
                              />
                            )}
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "11px",
                                  fontWeight: 600,
                                  lineHeight: "14px",
                                  color: "#011B2F",
                                }}
                              >
                                {p.label} {p.idx}
                              </span>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "6px",
                                }}
                              >
                                {sk ? (
                                  <span
                                    style={{
                                      background: "rgba(255, 220, 145, 0.61)",
                                      borderRadius: "5px",
                                      padding: "2px 8px",
                                      fontSize: "9px",
                                      fontWeight: 700,
                                      lineHeight: "12px",
                                      color: "#CE8305",
                                    }}
                                  >
                                    {sk}
                                  </span>
                                ) : (
                                  <span style={{ fontSize: "9px", color: "#A0A0A0" }}>
                                    —
                                  </span>
                                )}
                                {sObj && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSeatToggle({
                                        attractionSeatId: sObj.attractionSeatId,
                                        seatOrder: sObj.seatOrder,
                                        name: sObj.name,
                                      });
                                    }}
                                    title="Unassign seat"
                                    style={{
                                      background: "transparent",
                                      border: "none",
                                      cursor: "pointer",
                                      padding: 0,
                                      display: "flex",
                                      alignItems: "center",
                                    }}
                                  >
                                    <X size={13} color="#A0A0A0" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </React.Fragment>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Summary Stats Box */}
                <div
                  style={{
                    width: "100%",
                    minHeight: "111px",
                    background: "rgba(242, 237, 237, 0.44)",
                    border: "1.5px solid rgba(179, 175, 175, 0.72)",
                    borderRadius: "8px",
                    padding: "14px 16px",
                    boxSizing: "border-box",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  {[
                    { l: "Visitors to Assign", v: String(totalPax), c: "#011B2F" },
                    {
                      l: "Seats Assigned",
                      v: `${selectedSeats.length}/${totalPax}`,
                      c: selectedSeats.length === totalPax ? "#15803D" : "#D99B1E",
                    },
                    {
                      l: "Layout",
                      v: seatLayout?.name || targetAttractionName || "—",
                      c: "#011B2F",
                    },
                    {
                      l: "Seat Numbers",
                      v: selectedSeats.join(", ") || "—",
                      c: "#011B2F",
                    },
                  ].map((row, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && (
                        <div
                          style={{
                            width: "100%",
                            height: "0.5px",
                            background: "rgba(179, 175, 175, 0.31)",
                          }}
                        />
                      )}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "9px",
                            fontWeight: 600,
                            lineHeight: "12px",
                            color: "#6B7280",
                          }}
                        >
                          {row.l}
                        </span>
                        <span
                          style={{
                            fontSize: "10.5px",
                            fontWeight: 700,
                            lineHeight: "13px",
                            color: row.c,
                            textAlign: "right",
                          }}
                        >
                          {row.v}
                        </span>
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CustomerInfoView({
  onBack,
  onContinue,
  bookingSummary,
}: CustomerInfoViewProps) {
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [isAddNewOpen, setIsAddNewOpen] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [createdBookingId, setCreatedBookingId] = useState<string | null>(null);
  const [confirmedTicketData, setConfirmedTicketData] = useState<any>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounce search query to prevent spamming API requests on every character typed
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // API Hooks
  const { data: searchedCustomers = [], isLoading: isCustomersLoading } = useTicketingCustomers(debouncedSearchQuery, showDropdown);
  const createCustomerMutation = useCreateTicketingCustomer();
  const createBookingMutation = useCreateTicketingBooking();
  const paymentMutation = useTicketingPayment();
  const confirmBookingMutation = useConfirmTicketingBooking();

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

  // Seat allocation state
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [selectedSeatObjs, setSelectedSeatObjs] = useState<SelectedSeatObj[]>([]);
  const [paxAssignment, setPaxAssignment] = useState<Record<string, string>>({});
  const [currentTrip, setCurrentTrip] = useState(1);
  const [timeSlot, setTimeSlot] = useState("10:00 AM – 10:20 AM");
  const [seatValidationError, setSeatValidationError] = useState<string | null>(null);

  // Today's formatted date for the slot
  const slotDate = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  const firstAttractionId = bookingSummary[0]?.attractionId || "";
  const todayDateStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Fetch real trip number from API
  const tripNoQuery = useMemo(
    () => (firstAttractionId ? [{ attractionId: firstAttractionId, currentTripNo: 1 }] : []),
    [firstAttractionId]
  );
  const { data: tripNoData } = useAttractionTripNo(tripNoQuery, !!firstAttractionId);

  useEffect(() => {
    if (tripNoData?.[0]?.newTripNo) {
      setCurrentTrip(tripNoData[0].newTripNo);
    }
  }, [tripNoData]);

  // Mutations
  const createSeatBookingMutation = useCreateAttractionSeatBooking();

  function handleSelectedSeatsChange(
    seats: string[],
    assignment: Record<string, string>,
    seatObjs: SelectedSeatObj[]
  ) {
    setSelectedSeats(seats);
    setPaxAssignment(assignment);
    setSelectedSeatObjs(seatObjs);
    if (seats.length >= uniquePaxCount) {
      setSeatValidationError(null);
    }
  }

  const grandTotal = Number(bookingSummary.reduce((s, b) => s + b.totalAmount, 0).toFixed(2));

  const uniquePaxCount = useMemo(() => {
    if (!bookingSummary.length) return 0;
    return bookingSummary.reduce(
      (sum, b) => sum + b.passengers.reduce((s, p) => s + (p.qty || 0), 0),
      0
    );
  }, [bookingSummary]);

  const hasSeatingRequired = useMemo(() => {
    return bookingSummary.some((b) => b.hasSeating !== false && (b.hasSeating || !!b.seatLayoutId));
  }, [bookingSummary]);

  const isSeatAllocationValid = !hasSeatingRequired || (selectedSeats.length > 0 && selectedSeats.length === uniquePaxCount);

  const allAttractionsText = useMemo(() => {
    const names = Array.from(new Set(bookingSummary.map((b) => b.attractionName).filter(Boolean)));
    return names.join(", ") || "Attractions";
  }, [bookingSummary]);

  const subtotal = useMemo(() => Number(bookingSummary.reduce((s, b) => s + (b.subtotal ?? b.totalAmount), 0).toFixed(2)), [bookingSummary]);
  const gstAmount = useMemo(() => Number(bookingSummary.reduce((s, b) => s + (b.gstAmount ?? 0), 0).toFixed(2)), [bookingSummary]);
  const roundOff = useMemo(() => Number(bookingSummary.reduce((s, b) => s + (b.roundOff ?? 0), 0).toFixed(2)), [bookingSummary]);

  function handleSelectCustomer(c: CustomerRecord) {
    setSelectedCustomer(c);
    setSearchQuery(c.name);
    setShowDropdown(false);
  }

  function handleClearCustomer() {
    setSelectedCustomer(null);
    setSearchQuery("");
  }

  async function handleSaveNewCustomer(nc: NewCustomer) {
    try {
      const res = await createCustomerMutation.mutateAsync({
        name: nc.name,
        mobile: nc.mobile,
        address: nc.address,
        gstn: nc.gstn,
      });
      const newC: CustomerRecord = {
        id: (res as any)?.data?.id || (res as any)?.id || `C${Date.now()}`,
        name: nc.name,
        mobile: nc.mobile,
        address: nc.address || null,
        gstn: nc.gstn || null,
      };
      setSelectedCustomer(newC);
      setSearchQuery(newC.name);
      setIsAddNewOpen(false);
    } catch {
      // Toast notification handled by mutation onError
    }
  }

  async function handleContinue() {
    if (bookingSummary.length === 0) return;

    if (hasSeatingRequired && (!selectedSeats || selectedSeats.length === 0 || selectedSeats.length < uniquePaxCount)) {
      const diff = uniquePaxCount - (selectedSeats?.length || 0);
      const errMsg = selectedSeats.length === 0
        ? `Seat allocation is required. Please select ${uniquePaxCount} seat${uniquePaxCount > 1 ? "s" : ""} before continuing.`
        : `Please select ${diff} more seat${diff > 1 ? "s" : ""} (${selectedSeats.length}/${uniquePaxCount} selected) before continuing.`;
      setSeatValidationError(errMsg);
      setIsSeatAllocExpanded(true);
      document.getElementById("seat-allocation-section")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setSeatValidationError(null);

    const firstAttraction = bookingSummary[0];
    const items = bookingSummary.flatMap((b) =>
      b.passengers
        .filter((p) => p.qty > 0)
        .map((p) => ({
          attractionId: b.attractionId || "",
          category: p.key || p.label,
          quantity: p.qty,
          unitPrice: p.unitPrice ?? (p.qty > 0 ? b.totalAmount / p.qty : 0),
          totalPrice: (p.unitPrice ?? (p.qty > 0 ? b.totalAmount / p.qty : 0)) * p.qty,
        }))
    );

    const localSubtotal = subtotal;
    const localGstAmount = gstAmount;
    const gstAdjustment = bookingSummary.reduce((s, b) => s + (b.gstAdjustment ?? 0), 0);
    const localRoundOff = roundOff;

    const hasCustomerInput = !!(
      selectedCustomer ||
      searchQuery.trim() ||
      guestDetails.guestName.trim() ||
      guestDetails.mobile.trim()
    );

    const customerPayload = hasCustomerInput
      ? {
        id: selectedCustomer?.id || null,
        name: (selectedCustomer?.name || searchQuery || guestDetails.guestName || "").trim() || null,
        mobile: (selectedCustomer?.mobile || guestDetails.mobile || "").trim() || null,
        gstn: (selectedCustomer?.gstn || "").trim() || null,
      }
      : {
        id: null,
        name: null,
        mobile: null,
        gstn: null,
      };

    const payload = {
      customer: customerPayload,
      attractionId: firstAttraction.attractionId || "attraction-id",
      visitAt: new Date().toISOString(),
      items: items.length > 0 ? items : [{
        attractionId: firstAttraction.attractionId || "attraction-id",
        category: "Adult",
        quantity: 1,
        unitPrice: grandTotal,
        totalPrice: grandTotal,
      }],
      seats: selectedSeats.map((seatNo) => ({
        slotId: null,
        visitDate: passDetails.date || todayDateStr,
        bogie: "Bogie A",
        seatNumber: seatNo,
      })),
      subtotal: localSubtotal,
      gstAmount: localGstAmount,
      gstAdjustment,
      roundOff: localRoundOff,
      discountAmount: 0,
      totalAmount: grandTotal,
    };

    try {
      const res = await createBookingMutation.mutateAsync(payload as any);
      const bookingData = (res as any)?.data?.booking || (res as any)?.booking;
      if (bookingData?.id) {
        setCreatedBookingId(bookingData.id);
      }
      setShowPaymentModal(true);
    } catch {
      // Toast notification handled by mutation onError
    }
  }

  async function handleConfirmPayment(payMethod: "CASH" | "UPI" | "CARD" | "ONLINE", amtRcv: number) {
    if (createdBookingId) {
      try {
        // If seating is required and seats were selected, call attraction-seat-booking API
        if (hasSeatingRequired && selectedSeatObjs.length > 0) {
          const grouped: Record<string, number[]> = {};
          selectedSeatObjs.forEach((s) => {
            if (!grouped[s.attractionSeatId]) {
              grouped[s.attractionSeatId] = [];
            }
            grouped[s.attractionSeatId].push(s.seatOrder);
          });

          const seatBookingsPayload = {
            bookings: Object.entries(grouped).map(([attractionSeatId, seatNo]) => ({
              attractionId: firstAttractionId,
              tripNo: currentTrip,
              attractionSeatId,
              seatNo,
            })),
          };

          await createSeatBookingMutation.mutateAsync(seatBookingsPayload);
        }

        await paymentMutation.mutateAsync({
          bookingId: createdBookingId,
          payload: {
            amountPaid: amtRcv,
            payment: { mode: payMethod },
          },
        });
        const confirmRes = await confirmBookingMutation.mutateAsync(createdBookingId);
        const data = (confirmRes as any)?.data || confirmRes;
        setConfirmedTicketData(data);
        setShowPaymentModal(false);
        setShowTicketModal(true);
      } catch {
        // Handled by toast - remain on Process Payment popup if API call fails
      }
    }
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
    <div
      style={{
        width: "100%",
        maxWidth: "1020px",
        margin: "0 auto",
        background: "#FFFFFF",
        borderRadius: "20px",
        padding: "32px 36px 40px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.03)",
        border: "1px solid rgba(179,175,175,0.3)",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
      }}
    >
      {/* Title & Top Back Button */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <button
            type="button"
            onClick={onBack}
            className="ci-top-back-btn"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 14px",
              background: "#FFFFFF",
              border: "1px solid #002A45",
              borderRadius: "6px",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 700,
              fontSize: "13px",
              color: "#011B2F",
              cursor: "pointer",
              transition: "background 0.15s",
            }}
          >
            <ArrowLeft size={16} color="#011B2F" /> Back
          </button>
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
      </div>

      {/* ── Booking Summary Box (Rectangle 94) ── */}
      <div
        style={{
          background: "rgba(222, 242, 255, 0.51)",
          border: "1px solid rgba(23, 63, 99, 0.4)",
          borderRadius: "18px",
          padding: "18px 24px",
          display: "flex",
          alignItems: "flex-start",
          gap: "16px",
          boxSizing: "border-box",
        }}
      >
        <AlertCircle size={26} color="#064E7C" style={{ flexShrink: 0, marginTop: "2px" }} />
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
          Customer <span style={{ fontSize: "14px", fontWeight: 500, color: "#6B7280" }}>(Optional)</span>
        </p>

        {/* Dropdown search bar + Add New Customer button */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: selectedCustomer ? "20px" : "0", flexWrap: "wrap" }}>
          <div ref={dropdownRef} style={{ position: "relative", flex: 1, minWidth: "260px" }}>
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
                  if (selectedCustomer && e.target.value !== selectedCustomer.name) {
                    setSelectedCustomer(null);
                  }
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Search by name, mobile, or GSTN (optional)..."
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
              {(searchQuery || selectedCustomer) && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClearCustomer();
                  }}
                  title="Clear customer selection"
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: "2px",
                    display: "flex",
                    alignItems: "center",
                    color: "#94A3B8",
                  }}
                >
                  <X size={16} />
                </button>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDropdown((p) => !p);
                }}
                style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}
              >
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
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelectCustomer(c);
                      }}
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

        {/* ── Selected Customer Details Box (Rectangle 73) — Only displayed when customer is selected ── */}
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
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
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
                Selected Customer Details
              </h3>
              <button
                type="button"
                onClick={handleClearCustomer}
                style={{
                  background: "#FEE2E2",
                  color: "#DC2626",
                  border: "1px solid #FECACA",
                  borderRadius: "6px",
                  padding: "4px 10px",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
              >
                <X size={14} /> Clear Selection
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {/* Row 1: Name */}
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <User size={18} color="#011B2F" style={{ flexShrink: 0 }} />
                <span style={{ fontWeight: 600, fontSize: "14px", color: "#011B2F", width: "140px" }}>
                  Customer Name:
                </span>
                <span style={{ fontWeight: 700, fontSize: "14px", color: "#173F63" }}>
                  {selectedCustomer.name}
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
                  {selectedCustomer.mobile}
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

        {/* Expanded Complimentary Form Fields */}
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

      {/* ── Card 3: Seat Allocation Accordion (Rectangle 98) ── */}
      <div
        id="seat-allocation-section"
        style={{
          background: "#FFFFFF",
          border: seatValidationError ? "1.5px solid #EF4444" : "1px solid #A0A0A0",
          boxShadow: seatValidationError ? "0 0 0 3px rgba(239, 68, 68, 0.15)" : "-2px 4px 5.6px rgba(0, 0, 0, 0.08)",
          borderRadius: "13px",
          boxSizing: "border-box",
          overflow: "hidden",
          transition: "all 0.2s ease",
        }}
      >
        <div
          style={{
            padding: "16px 24px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
          onClick={() => setIsSeatAllocExpanded((p) => !p)}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <h4 style={{ margin: 0, fontWeight: 700, fontSize: "16px", lineHeight: "20px", color: "#011B2F" }}>
                Seat Allocation
              </h4>
              {selectedSeats.length > 0 && (
                <span
                  style={{
                    background: "#FEF3C7",
                    color: "#92400E",
                    fontSize: "11px",
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: "4px",
                  }}
                >
                  {selectedSeats.length} Seat{selectedSeats.length !== 1 ? "s" : ""} Assigned
                </span>
              )}
              {hasSeatingRequired && selectedSeats.length < uniquePaxCount && (
                <span
                  style={{
                    background: "#FEE2E2",
                    color: "#B91C1C",
                    fontSize: "11px",
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: "4px",
                  }}
                >
                  {uniquePaxCount - selectedSeats.length} more seat{uniquePaxCount - selectedSeats.length > 1 ? "s" : ""} required
                </span>
              )}
            </div>
            <p style={{ margin: "2px 0 0", fontWeight: 500, fontSize: "12px", color: "#6B7280" }}>
              Choose seats for this booking
            </p>
            {/* Show error message if seat allocation was skipped */}
            {seatValidationError && (
              <div
                style={{
                  marginTop: "8px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  color: "#DC2626",
                  fontSize: "12px",
                  fontWeight: 700,
                }}
              >
                <AlertCircle size={14} color="#DC2626" />
                <span>{seatValidationError}</span>
              </div>
            )}
            {/* Show assigned seat numbers prominently */}
            {selectedSeats.length > 0 ? (
              <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "6px", marginTop: "8px" }}>
                <span style={{ fontSize: "11.5px", fontWeight: 700, color: "#173F63" }}>
                  Selected:
                </span>
                {selectedSeats.map((sk) => (
                  <span
                    key={sk}
                    style={{
                      background: "rgba(255, 220, 145, 0.61)",
                      border: "1.5px solid rgba(244, 188, 67, 0.7)",
                      borderRadius: "5px",
                      padding: "2px 9px",
                      fontSize: "11.5px",
                      fontWeight: 700,
                      color: "#9A5C00",
                      letterSpacing: "0.3px",
                    }}
                  >
                    {sk}
                  </span>
                ))}
                <span style={{ fontSize: "11px", fontWeight: 500, color: "#6B7280", marginLeft: "4px" }}>
                  — Trip #{currentTrip} · {slotDate}
                </span>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "6px" }}>
                <span style={{ fontSize: "11px", fontWeight: 500, color: "#94A3B8" }}>
                  No seats assigned yet (click to allocate)
                </span>
              </div>
            )}
          </div>
          {isSeatAllocExpanded ? <ChevronUp size={22} color="#173F63" /> : <ChevronDown size={22} color="#173F63" />}
        </div>

        {isSeatAllocExpanded && (
          <div style={{ borderTop: "1px solid #E2E8F0" }} onClick={(e) => e.stopPropagation()}>
            <SeatAllocationPanel
              bookingSummary={bookingSummary}
              selectedSeats={selectedSeats}
              selectedSeatObjs={selectedSeatObjs}
              paxAssignment={paxAssignment}
              onSelectedSeatsChange={handleSelectedSeatsChange}
              currentTrip={currentTrip}
              onTripChange={setCurrentTrip}
              timeSlot={timeSlot}
              onTimeSlotChange={setTimeSlot}
              slotDate={slotDate}
            />
          </div>
        )}
      </div>

      {/* ── Footer Actions ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: "12px",
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
          disabled={createBookingMutation.isPending || !isSeatAllocationValid}
          className="ci-continue-btn"
          title={!isSeatAllocationValid ? "Please complete seat allocation before continuing" : undefined}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            width: "197px",
            height: "48px",
            justifyContent: "center",
            background: createBookingMutation.isPending || !isSeatAllocationValid ? "#E2E8F0" : "#F4BC43",
            border: "none",
            borderRadius: "8px",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 700,
            fontSize: "14px",
            color: createBookingMutation.isPending || !isSeatAllocationValid ? "#94A3B8" : "#011B2F",
            cursor: createBookingMutation.isPending || !isSeatAllocationValid ? "not-allowed" : "pointer",
            transition: "background 0.18s, transform 0.15s",
            opacity: createBookingMutation.isPending || !isSeatAllocationValid ? 0.7 : 1,
          }}
        >
          {createBookingMutation.isPending ? "Creating Booking..." : <>Continue <ArrowRight size={18} color="#011B2F" /></>}
        </button>
      </div>

      <AddNewCustomerModal
        isOpen={isAddNewOpen}
        onClose={() => setIsAddNewOpen(false)}
        onSave={handleSaveNewCustomer}
        isSaving={createCustomerMutation.isPending}
      />

      {/* Process Payment Modal */}
      <ProcessPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        grandTotal={grandTotal}
        attractionName={allAttractionsText}
        isSubmitting={paymentMutation.isPending || confirmBookingMutation.isPending}
        onConfirm={handleConfirmPayment}
      />

      {/* Ticket Generated Modal */}
      <TicketGeneratedModalWithProfile
        isOpen={showTicketModal}
        onClose={() => {
          setShowTicketModal(false);
          onContinue({
            name: selectedCustomer?.name || searchQuery.trim() || guestDetails.guestName.trim() || "",
            mobile: selectedCustomer?.mobile || guestDetails.mobile.trim() || "",
            gstn: selectedCustomer?.gstn || "",
          });
        }}
        attractionName={allAttractionsText}
        grandTotal={grandTotal}
        totalPax={uniquePaxCount}
        confirmedData={confirmedTicketData}
        bookingSummary={bookingSummary}
        customerInfo={{
          name: selectedCustomer?.name || searchQuery.trim() || guestDetails.guestName.trim() || "Guest",
          mobile: selectedCustomer?.mobile || guestDetails.mobile.trim() || "",
          gstn: selectedCustomer?.gstn || "",
        }}
        selectedSeats={selectedSeats}
        subtotal={subtotal}
        gstAmount={gstAmount}
        roundOff={roundOff}
        timeSlot={timeSlot}
      />

      <style jsx global>{`
        .ci-cust-option:hover { background: #F0F4F8; }
        .ci-back-btn:hover { background: #F0F4F8 !important; }
        .ci-continue-btn:hover { background: #e5af36 !important; transform: translateY(-1px); }
        .ci-add-new-btn:hover { background: #EFF6FF !important; }
        .pay-confirm-btn:hover { background: #e5af36 !important; transform: translateY(-1px); }
      `}</style>
    </div>
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
