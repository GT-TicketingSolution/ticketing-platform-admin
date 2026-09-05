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
import { showToast } from "@/components/ui/Toast";
import { postData } from "@/lib/api/apiService";
import AppUrl from "@/lib/api/endpoints";
import AddNewCustomerModal, { NewCustomer } from "./AddNewCustomerModal";
import {
  useTicketingCustomers,
  useCreateTicketingCustomer,
  useCreateTicketingBooking,
  useAttractionTripNo,
  useAttractionSeatAvailability,
  useCreateAttractionSeatBooking,
  TicketingCustomer,
  AttractionSeatItem,
  AttractionSeatLayout,
  AttractionSeatAvailabilityData,
  CreateTicketingBookingPayload,
  BookingAttractionPayload,
  BookingCategoryPayload,
} from "@/hooks/useTicketingBookingQueries";

export interface BookingSummaryItem {
  attractionId?: string;
  attractionManagementId?: string;
  attractionName: string;
  hasSeating?: boolean;
  seatLayoutId?: string | null;
  passengers: { label: string; key?: string; categoryId?: string; qty: number; unitPrice?: number; noOfSeats?: number | null }[];
  subtotal?: number;
  gstAmount?: number;
  gstAdjustment?: number;
  attractionRoundOffGstAdj?: number;
  roundOff?: number;
  totalAmount: number;
}

export function getPassengerSeatCount(p: { qty: number; noOfSeats?: number | null }): number {
  const seats = p.noOfSeats && p.noOfSeats > 0 ? p.noOfSeats : 1;
  return (p.qty || 0) * seats;
}

export function getAttractionRequiredSeats(att: { passengers: { qty: number; noOfSeats?: number | null }[] }): number {
  return att.passengers.reduce((s, p) => s + getPassengerSeatCount(p), 0);
}

interface CustomerInfoViewProps {
  onBack: () => void;
  onContinue: (customer: { name: string; mobile: string; gstn?: string }) => void;
  bookingSummary: BookingSummaryItem[];
  initialTripMap?: Record<string, number>;
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
  onConfirm: (payMethod: "CASH" | "UPI" | "CARD" | "ONLINE", amtRcv: number, amountReceived: number, returnAmount: number) => void;
  grandTotal: number;
  attractionName: string;
  isSubmitting?: boolean;
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
              const receivedAmt = isOnline ? grandTotal : numAmtRcv;
              const returnAmt = isOnline ? 0 : change;
              onConfirm(mode, netAmountPaid, receivedAmt, returnAmt);
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

// ── QZ Tray-first Receipt Printer ──
// Tries QZ Tray (silent, no dialog) first; falls back to iframe print if QZ Tray is not running.
async function printReceiptViaIframe(elementId: string, onDone?: () => void) {
  if (typeof window === "undefined") return;
  const element = document.getElementById(elementId);
  if (!element) { onDone?.(); return; }

  const innerHtml = element.innerHTML;

  // ── Try QZ Tray first (silent, no dialog) ──
  try {
    const { printViaQZ } = await import("@/lib/qzPrint");
    const success = await printViaQZ(innerHtml);
    if (success) {
      onDone?.();
      return;
    }
  } catch (_) {
    // QZ Tray not available, fall through to iframe
  }

  // ── Fallback: iframe print (browser dialog will appear) ──
  const oldIframe = document.getElementById("print-receipt-iframe");
  if (oldIframe) oldIframe.remove();

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
  if (!doc) { onDone?.(); return; }

  doc.open();
  doc.write(`<!DOCTYPE html>
    <html>
      <head>
        <title>Ticket Bill</title>
        <meta charset="utf-8" />
        <style>
          @page { size: 80mm auto; margin: 0; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Courier New', Courier, monospace;
            color: #000000;
            background: #FFFFFF;
            width: 76mm;
            max-width: 78mm;
            margin: 0 auto;
            padding: 2mm 1mm;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            font-weight: 600;
            font-size: 12px;
            line-height: 1.35;
          }
          table { width: 100%; border-collapse: collapse; }
          img { max-width: 100%; height: auto; display: block; margin: 0 auto; }
        </style>
      </head>
      <body>${innerHtml}</body>
    </html>`);
  doc.close();

  let hasDone = false;
  const finish = () => { if (!hasDone) { hasDone = true; onDone?.(); } };

  setTimeout(() => {
    try {
      if (iframe.contentWindow) {
        iframe.contentWindow.onafterprint = () => finish();
      }
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(finish, 600);
    } catch (err) {
      console.error("Iframe print error:", err);
      finish();
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
  attractionRoundOffGstAdj = 0,
  businessName = "",
  timeSlot = "",
  seatDetails = [],
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
      attractionRoundOffGstAdj?: string | number;
      gstAdjustment?: string | number;
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
  attractionRoundOffGstAdj?: number;
  timeSlot?: string;
  seatDetails?: {
    attractionId: string;
    attractionName: string;
    sections: { name: string; seats: number[] }[];
  }[];
}) {
  const booking =
    (confirmedData as any)?.data?.booking ||
    (confirmedData as any)?.booking ||
    (confirmedData as any)?.data ||
    confirmedData;
  const rawQr =
    (confirmedData as any)?.data?.qrCodes ||
    (confirmedData as any)?.data?.qrCode ||
    (confirmedData as any)?.qrCodes ||
    (confirmedData as any)?.qrCode ||
    booking?.qrCodes ||
    booking?.qrCode;

  const qrCodes: Array<{ attractionId?: string; qrCode: string }> = Array.isArray(rawQr)
    ? rawQr
    : rawQr && typeof rawQr === "object" && rawQr.qrCode
      ? [rawQr]
      : typeof rawQr === "string"
        ? [{ qrCode: rawQr }]
        : [];

  const invoiceNum =
    booking?.invoiceNumber ||
    (confirmedData as any)?.data?.invoiceNumber ||
    (confirmedData as any)?.invoiceNumber ||
    booking?.transaction?.invoiceNumber ||
    (confirmedData as any)?.data?.transaction?.invoiceNumber;

  const ticketNo =
    invoiceNum ||
    booking?.bookingNumber ||
    (confirmedData as any)?.data?.bookingNumber ||
    (confirmedData as any)?.bookingNumber ||
    booking?.bookingId ||
    (confirmedData as any)?.data?.bookingId ||
    "-";
  const finalTotal = booking?.totalAmount ? parseFloat(String(booking.totalAmount)) : grandTotal;
  const payMode = booking?.paymentMode || (confirmedData as any)?.paymentMode || "CASH";
  const rawDate = booking?.visitAt || booking?.createdAt || new Date().toISOString();
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

  const custName = (booking?.customerName || (customerInfo?.name !== "Guest" ? customerInfo?.name : "") || "").trim() || "Guest";
  const custMobile = (booking?.mobileNumber || customerInfo?.mobile || "").trim() || "-";

  const calculatedSubtotal = booking?.subtotal
    ? parseFloat(String(booking.subtotal))
    : subtotal > 0
      ? subtotal
      : Number((finalTotal / 1.18).toFixed(2));

  const calculatedGst = booking?.gstAmount
    ? parseFloat(String(booking.gstAmount))
    : gstAmount > 0
      ? gstAmount
      : Number((finalTotal - calculatedSubtotal).toFixed(2));

  const bookingGstAdj =
    booking?.attractionRoundOffGstAdj !== undefined && booking?.attractionRoundOffGstAdj !== null
      ? parseFloat(String(booking.attractionRoundOffGstAdj))
      : booking?.gstAdjustment !== undefined && booking?.gstAdjustment !== null
        ? parseFloat(String(booking.gstAdjustment))
        : Array.isArray(booking?.attractions) && booking.attractions.length > 0
          ? booking.attractions.reduce((sum: number, a: any) => sum + (parseFloat(String(a.attractionRoundOffGstAdj ?? a.gstAdjustment ?? 0)) || 0), 0)
          : undefined;

  const calculatedattractionRoundOffGstAdj =
    bookingGstAdj !== undefined
      ? bookingGstAdj
      : attractionRoundOffGstAdj !== undefined && attractionRoundOffGstAdj !== null
        ? attractionRoundOffGstAdj
        : Number(bookingSummary.reduce((s, b) => s + (b.attractionRoundOffGstAdj ?? b.gstAdjustment ?? 0), 0).toFixed(2));

  const calculatedRoundOff = booking?.roundOff !== undefined && booking?.roundOff !== null
    ? parseFloat(String(booking.roundOff))
    : roundOff;

  const calculatedAmountReceived = booking?.amountReceived !== undefined && booking?.amountReceived !== null
    ? parseFloat(String(booking.amountReceived))
    : undefined;

  const calculatedReturnAmount = booking?.returnAmount !== undefined && booking?.returnAmount !== null
    ? parseFloat(String(booking.returnAmount))
    : undefined;

  const halfGst = Number((calculatedGst / 2).toFixed(2));

  // Build items strictly from bookingSummary with continuous sequential S.No (1, 2, 3, 4...)
  const itemsList = bookingSummary
    .flatMap((b) =>
      b.passengers
        .filter((p) => p.qty > 0)
        .map((p) => ({
          name: bookingSummary.length > 1 ? `${b.attractionName ? `${b.attractionName} - ` : ""}${p.label}` : (p.label || "-"),
          qty: p.qty,
          amount: Number(((((p as any).unitPrice || (p as any).price || (calculatedSubtotal / (totalPax || 1)))) * p.qty).toFixed(2)),
        }))
    )
    .map((item, idx) => ({
      ...item,
      sNo: idx + 1,
    }));

  const seatText = selectedSeats && selectedSeats.length > 0 ? selectedSeats.join(", ") : "-";

  const hasAutoPrintedRef = useRef(false);

  const handlePrint = () => {
    printReceiptViaIframe("printable-ticket-receipt", () => {
      showToast("Ticket sent to printing machine", "success");
    });
  };

  // Automatically trigger printing as soon as ticket popup opens
  useEffect(() => {
    if (isOpen && typeof window !== "undefined" && !hasAutoPrintedRef.current) {
      hasAutoPrintedRef.current = true;
      const t = setTimeout(() => {
        handlePrint();
      }, 350);
      return () => clearTimeout(t);
    }
    if (!isOpen) {
      hasAutoPrintedRef.current = false;
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
          borderRadius: "20px",
          width: "440px",
          maxWidth: "94vw",
          boxShadow: "0 24px 80px rgba(0,0,0,0.28)",
          fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          padding: "20px 16px",
          boxSizing: "border-box",
          position: "relative",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{ textAlign: "center", marginBottom: "12px", flexShrink: 0 }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              border: "2.5px solid #1FA35A",
              background: "#E8F8EE",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 6px auto",
            }}
          >
            <Check size={20} color="#1FA35A" strokeWidth={3.5} />
          </div>
          <h2
            style={{
              margin: 0,
              fontWeight: 800,
              fontSize: "20px",
              lineHeight: "24px",
              color: "#011B2F",
            }}
          >
            Ticket Generated
          </h2>
        </div>

        {/* Scrollable Receipt Area */}
        <div
          style={{
            overflowY: "auto",
            paddingRight: "2px",
            marginBottom: "14px",
            flexGrow: 1,
          }}
        >
          {/* Printable Receipt Paper */}
          <div
            id="printable-ticket-receipt"
            style={{
              background: "#FFFFFF",
              border: "1.5px solid #000000",
              borderRadius: "10px",
              padding: "14px 10px",
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Courier New', Courier, monospace",
              color: "#000000",
              fontSize: "12px",
              lineHeight: "1.35",
              boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
              fontWeight: 700,
            }}
          >
            {/* Header: Attraction Name + Business Name + CIN & GST */}
            <div style={{ textAlign: "center", borderBottom: "1px dashed #000000", paddingBottom: "10px" }}>
              <h3
                style={{
                  margin: "0 0 2px 0",
                  fontWeight: 700,
                  fontSize: "14px",
                  color: "#000000",
                  letterSpacing: "0.03em",
                  textTransform: "uppercase",
                  fontFamily: "'Plus Jakarta Sans', Arial, sans-serif",
                  lineHeight: "1.2",
                }}
              >
                {attractionName || "-"}
              </h3>

              {/* Business Name (from /api/auth/profile response) if available */}
              {Boolean(businessName && businessName.trim()) && (
                <div
                  style={{
                    fontSize: "12.5px",
                    fontWeight: 800,
                    color: "#000000",
                    margin: "2px 0 4px 0",
                    letterSpacing: "0.02em",
                    textTransform: "uppercase",
                    fontFamily: "'Plus Jakarta Sans', Arial, sans-serif",
                  }}
                >
                  {businessName.trim()}
                </div>
              )}

              {/* CIN & GST info */}
              <div
                style={{
                  margin: "3px 0 2px 0",
                  fontSize: "11.5px",
                  fontWeight: 800,
                  lineHeight: "1.4",
                  color: "#000000",
                  fontFamily: "'Courier New', Courier, monospace",
                  letterSpacing: "0.02em",
                }}
              >
                <div>CIN: U15532RJ1998PLC015036</div>
                <div>GST: 08AAKCS3004M1Z7</div>
              </div>

              {/* Seat Allocation Info – shown below GST number */}
              {seatDetails && seatDetails.length > 0 && (
                <div
                  style={{
                    marginTop: "8px",
                    paddingTop: "7px",
                    borderTop: "1px dashed #000000",
                    textAlign: "left",
                    fontSize: "11px",
                    fontWeight: 800,
                    color: "#000000",
                    fontFamily: "'Courier New', Courier, monospace",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 900,
                      fontSize: "11px",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      marginBottom: "4px",
                      textAlign: "center",
                    }}
                  >
                    SEAT ALLOCATION
                  </div>
                  {seatDetails.map((att, i) => (
                    <div key={att.attractionId} style={{ marginBottom: i < seatDetails.length - 1 ? "6px" : 0 }}>
                      {seatDetails.length > 1 && (
                        <div
                          style={{
                            fontWeight: 900,
                            fontSize: "10.5px",
                            textTransform: "uppercase",
                            letterSpacing: "0.03em",
                            marginBottom: "3px",
                            textDecoration: "underline",
                          }}
                        >
                          {att.attractionName}
                        </div>
                      )}
                      {att.sections.map((sec) => (
                        <div
                          key={sec.name}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: "2px",
                          }}
                        >
                          <span style={{ fontWeight: 800 }}>{sec.name}:</span>
                          <span style={{ fontWeight: 700 }}>
                            Seat {sec.seats.join(", ")}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Prominent Total Header */}
            <div style={{ textAlign: "center", padding: "10px 0", borderBottom: "1px dashed #000000" }}>
              <div style={{ fontSize: "24px", fontWeight: 500, color: "#000000", letterSpacing: "0.01em", lineHeight: "1.1" }}>
                ₹{finalTotal.toFixed(2)}
              </div>
              <div style={{ fontSize: "11px", fontWeight: 500, color: "#000000", textTransform: "uppercase", marginTop: "2px" }}>
                Total Amount Paid ({payMode || "-"})
              </div>
            </div>

            {/* Invoice & Customer Meta */}
            <div style={{ padding: "8px 0", borderBottom: "1px dashed #000000", fontSize: "11.5px", fontWeight: 400, color: "#000000" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                <span><strong>Invoice:</strong> {ticketNo}</span>
                <span><strong>Bill To:</strong> {custName}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span><strong>Date:</strong> {formattedDate}</span>
                <span><strong>Time:</strong> {formattedTime}</span>
              </div>
            </div>

            {/* Items Table */}
            <div style={{ padding: "8px 0", borderBottom: "1px dashed #000000" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11.5px", color: "#000000" }}>
                <thead>
                  <tr style={{ borderBottom: "1.5px solid #000000", textAlign: "left", fontWeight: 400 }}>
                    <th style={{ paddingBottom: "4px", width: "12%", fontWeight: 400 }}>S.No.</th>
                    <th style={{ paddingBottom: "4px", width: "50%", fontWeight: 400 }}>Category / Item</th>
                    <th style={{ paddingBottom: "4px", width: "15%", textAlign: "center", fontWeight: 400 }}>Qty</th>
                    <th style={{ paddingBottom: "4px", width: "23%", textAlign: "right", fontWeight: 400 }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {itemsList.length > 0 ? (
                    itemsList.map((item, idx) => (
                      <tr key={idx} style={{ fontWeight: 400 }}>
                        <td style={{ paddingTop: "5px", verticalAlign: "top" }}>{item.sNo}</td>
                        <td style={{ paddingTop: "5px" }}>{item.name}</td>
                        <td style={{ paddingTop: "5px", textAlign: "center", verticalAlign: "top" }}>{item.qty}</td>
                        <td style={{ paddingTop: "5px", textAlign: "right", verticalAlign: "top" }}>
                          ₹{item.amount.toFixed(2)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr style={{ fontWeight: 400 }}>
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
            <div style={{ padding: "8px 0", borderBottom: "1px dashed #000000", fontSize: "11.5px", fontWeight: 400, color: "#000000" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                <span>Sub-Total</span>
                <span>₹{calculatedSubtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                <span>SGST (9%)</span>
                <span>₹{halfGst.toFixed(2)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                <span>CGST (9%)</span>
                <span>₹{halfGst.toFixed(2)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                <span>Effective GST (18%)</span>
                <span>₹{calculatedGst.toFixed(2)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                <span>GST Round Off</span>
                <span>
                  {calculatedattractionRoundOffGstAdj > 0
                    ? `+₹${calculatedattractionRoundOffGstAdj.toFixed(2)}`
                    : calculatedattractionRoundOffGstAdj < 0
                      ? `-₹${Math.abs(calculatedattractionRoundOffGstAdj).toFixed(2)}`
                      : `₹0.00`}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span>Round Off</span>
                <span>{calculatedRoundOff >= 0 ? `+₹${calculatedRoundOff.toFixed(2)}` : `-₹${Math.abs(calculatedRoundOff).toFixed(2)}`}</span>
              </div>


              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "12px",
                  fontWeight: 400,
                  borderTop: "1.5px solid #000000",
                  paddingTop: "6px",
                  marginTop: "4px",
                }}
              >
                <span>Amount Payable (₹)</span>
                <span>₹{finalTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* QR Codes Section */}
            {qrCodes && qrCodes.length > 0 && (
              <div style={{ padding: "12px 0 10px 0", borderBottom: "1px dashed #000000" }}>
                {qrCodes.length > 1 && (
                  <p style={{ margin: "0 0 8px 0", fontSize: "11px", fontWeight: 800, color: "#000000", textAlign: "center", textTransform: "uppercase" }}>
                    ENTRY QR CODES ({qrCodes.length} ATTRACTIONS)
                  </p>
                )}
                <div
                  style={{
                    display: "flex",
                    flexDirection: qrCodes.length > 2 ? "column" : "row",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  {qrCodes.map((qrItem, idx) => {
                    const matchedAttraction = bookingSummary.find((b) => b.attractionId === qrItem.attractionId);
                    const attractionLabel = matchedAttraction?.attractionName || (qrCodes.length > 1 ? `Station ${idx + 1}` : "Scan for Entry");

                    return (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          padding: "8px 10px",
                          background: "#FFFFFF",
                          border: "1.5px solid #000000",
                          borderRadius: "8px",
                          minWidth: qrCodes.length > 1 ? "140px" : "160px",
                          maxWidth: "190px",
                          boxSizing: "border-box",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "11px",
                            fontWeight: 900,
                            color: "#000000",
                            marginBottom: "5px",
                            textAlign: "center",
                            textTransform: "uppercase",
                            letterSpacing: "0.02em",
                            lineHeight: 1.2,
                          }}
                        >
                          {attractionLabel}
                        </div>
                        <img
                          src={qrItem.qrCode}
                          alt={`${attractionLabel} QR Code`}
                          style={{
                            width: "115px",
                            height: "115px",
                            objectFit: "contain",
                            background: "#FFFFFF",
                            display: "block",
                          }}
                        />
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 800,
                            color: "#000000",
                            marginTop: "5px",
                            textAlign: "center",
                            textTransform: "uppercase",
                          }}
                        >
                          Scan for Entry
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Clean Terms / Notice */}
            <div style={{ padding: "8px 0 2px 0", fontSize: "11px", color: "#000000", lineHeight: "1.4", textAlign: "center", fontWeight: 700 }}>
              <div style={{ fontWeight: 900, marginBottom: "2px", letterSpacing: "0.04em" }}>THANKS FOR VISIT</div>
              <div style={{ fontSize: "10px", fontWeight: 600 }}>
                Please present this QR code at the entrance gate. Keep this ticket safe.
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexShrink: 0 }}>
          <button
            type="button"
            onClick={handlePrint}
            style={{
              flex: 1,
              height: "44px",
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
            <Printer size={18} color="#002A45" /> Print Ticket
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              height: "44px",
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
            right: 0 !important;
            top: 0 !important;
            width: 80mm !important;
            max-width: 80mm !important;
            margin: 0 auto !important;
            padding: 4px !important;
            box-shadow: none !important;
            border: none !important;
            font-size: 11px !important;
            font-weight: 700 !important;
            color: #000000 !important;
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
  const businessName =
    profileData?.profile?.businessName ||
    (profileData as any)?.businessName ||
    (profileData as any)?.data?.profile?.businessName ||
    (profileData as any)?.data?.businessName ||
    "";
  return <TicketGeneratedModal {...props} businessName={businessName} />;
}

// ── Selected Seat Object Type 
export interface SelectedSeatObj {
  attractionId: string;
  attractionSeatId: string | null;
  sectionName?: string;
  seatOrder: number;
  name: string;
}

// ── Section Seat Allocation Panel (Real Multi-Attraction API Integration) ────
interface SeatAllocationPanelProps {
  bookingSummary: BookingSummaryItem[];
  seatingAttractions: BookingSummaryItem[];
  activeAttractionId: string;
  onActiveAttractionChange: (id: string) => void;
  tripMap: Record<string, number>;
  onTripChange: (attractionId: string, trip?: number) => Promise<void> | void;
  selectedSeatObjs: SelectedSeatObj[];
  onSelectedSeatsChange: (
    newSeatObjs: SelectedSeatObj[],
    newPaxAssignment?: Record<string, string>
  ) => void;
  onManualEdit?: (attId: string) => void;
  paxAssignment: Record<string, string>;
  seatAvailData: AttractionSeatAvailabilityData[];
  isLoadingSeats: boolean;
  isFetchingSeats: boolean;
  refetchSeats: () => void;
  timeSlot: string;
  onTimeSlotChange: (slot: string) => void;
  slotDate: string;
}

function SeatAllocationPanel({
  bookingSummary,
  seatingAttractions,
  activeAttractionId,
  onActiveAttractionChange,
  tripMap,
  onTripChange,
  selectedSeatObjs,
  onSelectedSeatsChange,
  onManualEdit,
  paxAssignment,
  seatAvailData,
  isLoadingSeats,
  isFetchingSeats,
  refetchSeats,
  slotDate,
}: SeatAllocationPanelProps) {
  // Find currently active attraction
  const activeAttraction = useMemo(() => {
    return (
      seatingAttractions.find((b) => b.attractionId === activeAttractionId) ||
      seatingAttractions[0] ||
      bookingSummary[0] ||
      null
    );
  }, [seatingAttractions, activeAttractionId, bookingSummary]);

  const activeAttId = activeAttraction?.attractionId || "";
  const activeAttName = activeAttraction?.attractionName || "Attraction";
  const currentTrip = tripMap[activeAttId] || 1;

  // Exact count of required seats for the currently active attraction
  const totalPaxForActiveAttraction = useMemo(() => {
    if (!activeAttraction) return 0;
    return getAttractionRequiredSeats(activeAttraction);
  }, [activeAttraction]);

  // Dynamic list of individual passenger labels for active attraction
  const paxListForActiveAttraction = useMemo(() => {
    if (!activeAttraction) return [];
    const list: { label: string; idx: number }[] = [];
    const cnt: Record<string, number> = {};
    activeAttraction.passengers.forEach((p) => {
      if (p.qty > 0) {
        const seatsPerTicket = p.noOfSeats && p.noOfSeats > 0 ? p.noOfSeats : 1;
        const totalSeats = p.qty * seatsPerTicket;
        for (let i = 1; i <= totalSeats; i++) {
          cnt[p.label] = (cnt[p.label] || 0) + 1;
          list.push({ label: p.label, idx: cnt[p.label] });
        }
      }
    });
    return list;
  }, [activeAttraction]);

  // Current attraction's seat availability data from API response
  const currentSeatData = useMemo(() => {
    return seatAvailData.find((d) => d.attractionId === activeAttId) || seatAvailData[0] || null;
  }, [seatAvailData, activeAttId]);

  // Track selected layout per attraction: Map<attractionId, layoutId>
  const [selectedLayoutMap, setSelectedLayoutMap] = useState<Map<string, string>>(new Map());

  const seatLayout: AttractionSeatLayout | null = useMemo(() => {
    const layouts = currentSeatData?.seatLayout || [];
    if (layouts.length === 0) return null;

    const selectedLayoutId = selectedLayoutMap.get(activeAttId) || layouts[0]?.seatLayoutId;
    const selected = layouts.find(l => l.seatLayoutId === selectedLayoutId) || layouts[0];

    return selected || null;
  }, [currentSeatData, activeAttId, selectedLayoutMap]);

  // Sections (e.g. "Seat 1", "Seat 2" coaches/compartments)
  const sectionsList: AttractionSeatItem[] = useMemo(() => {
    const layouts = currentSeatData?.seatLayout || [];
    if (layouts.length === 0) return [];

    const selectedLayoutId = selectedLayoutMap.get(activeAttId) || layouts[0]?.seatLayoutId;
    const selected = layouts.find(l => l.seatLayoutId === selectedLayoutId) || layouts[0];

    const raw = selected?.seats || currentSeatData?.seats || [];
    return raw.slice().sort((a, b) => a.seatOrder - b.seatOrder);
  }, [currentSeatData, activeAttId, selectedLayoutMap]);

  // Active section selected on the left Layout Overview
  const [activeSectionId, setActiveSectionId] = useState<string>("");

  const rowsCount = seatLayout?.rows || 0;
  const colsCount = seatLayout?.cols || 0;
  const hasAisle = Boolean(seatLayout?.hasAisle);
  const aisleAfterCol = typeof seatLayout?.aisleAfterCol === "number" ? seatLayout.aisleAfterCol : null;
  // aisleAfterCol === 0 means aisle is at the very START (no left seats, all seats on right)
  // aisleAfterCol > 0  means aisle splits left/right at that column position
  const isAisleActive = Boolean(hasAisle && aisleAfterCol !== null && aisleAfterCol >= 0 && colsCount > aisleAfterCol);

  // Grid capacity per section
  const totalSectionSeats = (rowsCount > 0 && colsCount > 0) ? (rowsCount * colsCount) : (sectionsList.length > 0 ? 4 : 0);

  // Automatically select the first available section (or section with allocated seats), skipping fully booked ones
  useEffect(() => {
    if (sectionsList.length > 0) {
      const isCurrentValid = sectionsList.some(
        (s) => (s.attractionSeatId || String(s.seatOrder)) === activeSectionId
      );

      // Section that has allocated seats for this booking
      const sectionWithAllocated = sectionsList.find((sec) =>
        selectedSeatObjs.some(
          (s) =>
            s.attractionId === activeAttId &&
            ((sec.attractionSeatId && s.attractionSeatId === sec.attractionSeatId) ||
              s.sectionName === (sec.name || `Seat ${sec.seatOrder}`))
        )
      );

      // First section that is not fully booked
      const firstAvailableSec = sectionsList.find((sec) => {
        const booked = Array.isArray(sec.bookedSeats) ? sec.bookedSeats.length : 0;
        return (totalSectionSeats - booked) > 0;
      });

      const bestSec = sectionWithAllocated || firstAvailableSec || sectionsList[0];
      const bestSecId = bestSec.attractionSeatId || String(bestSec.seatOrder);

      if (!activeSectionId || !isCurrentValid) {
        setActiveSectionId(bestSecId);
      } else {
        // If currently active section is completely full without any allocated seats, switch to first available
        const currentSec = sectionsList.find(
          (s) => (s.attractionSeatId || String(s.seatOrder)) === activeSectionId
        );
        if (currentSec) {
          const currentBooked = Array.isArray(currentSec.bookedSeats) ? currentSec.bookedSeats.length : 0;
          const currentAvail = Math.max(0, totalSectionSeats - currentBooked);
          const hasCurrentAllocated = selectedSeatObjs.some(
            (s) =>
              s.attractionId === activeAttId &&
              ((currentSec.attractionSeatId && s.attractionSeatId === currentSec.attractionSeatId) ||
                s.sectionName === (currentSec.name || `Seat ${currentSec.seatOrder}`))
          );
          if (currentAvail === 0 && !hasCurrentAllocated && (sectionWithAllocated || firstAvailableSec)) {
            setActiveSectionId(bestSecId);
          }
        }
      }
    }
  }, [sectionsList, activeSectionId, activeAttId, totalSectionSeats, selectedSeatObjs]);

  const activeSection: AttractionSeatItem | null = useMemo(() => {
    if (sectionsList.length === 0) return null;
    return (
      sectionsList.find((s) => (s.attractionSeatId || String(s.seatOrder)) === activeSectionId) ||
      sectionsList[0] ||
      null
    );
  }, [sectionsList, activeSectionId]);

  // Booked seat numbers for the currently active section
  const activeSectionBookedSeats: number[] = useMemo(() => {
    if (!activeSection) return [];
    return Array.isArray(activeSection.bookedSeats) ? activeSection.bookedSeats : [];
  }, [activeSection]);

  // Selected seats for the active attraction overall
  const activeAttractionSelectedSeatObjs = useMemo(() => {
    return selectedSeatObjs.filter((s) => s.attractionId === activeAttId);
  }, [selectedSeatObjs, activeAttId]);

  // Selected seats for the active section specifically
  const activeSectionSelectedSeats = useMemo(() => {
    if (!activeSection) return [];
    return activeAttractionSelectedSeatObjs.filter((s) => {
      if (activeSection.attractionSeatId && s.attractionSeatId) {
        return s.attractionSeatId === activeSection.attractionSeatId;
      }
      return s.sectionName === (activeSection.name || `Seat ${activeSection.seatOrder}`);
    });
  }, [activeAttractionSelectedSeatObjs, activeSection]);

  // Total capacity and available across ALL sections in this attraction
  const { totalCapacityAllSections, totalAvailSeatsAllSections } = useMemo(() => {
    if (sectionsList.length === 0) {
      return { totalCapacityAllSections: totalSectionSeats, totalAvailSeatsAllSections: totalSectionSeats };
    }
    let totalCap = 0;
    let totalAvail = 0;
    sectionsList.forEach((sec) => {
      const booked = Array.isArray(sec.bookedSeats) ? sec.bookedSeats.length : 0;
      const cap = totalSectionSeats || 1;
      totalCap += cap;
      totalAvail += Math.max(0, cap - booked);
    });
    return { totalCapacityAllSections: totalCap, totalAvailSeatsAllSections: totalAvail };
  }, [sectionsList, totalSectionSeats]);

  // Handle clicking a seat button in the active section grid
  const handleSeatToggle = (seatOrder: number) => {
    if (!activeSection) return;
    const isOccupied = activeSectionBookedSeats.includes(seatOrder);
    if (isOccupied) return;

    const isAlreadySelected = activeSectionSelectedSeats.some((s) => s.seatOrder === seatOrder);
    const secName = activeSection.name || `Seat ${activeSection.seatOrder}`;
    const secId = activeSection.attractionSeatId || null;

    let updatedAttObjs: SelectedSeatObj[] = [];
    if (isAlreadySelected) {
      // Deselect clicked seat
      updatedAttObjs = activeAttractionSelectedSeatObjs.filter((s) => {
        const matchesSection = (secId && s.attractionSeatId === secId) || s.sectionName === secName;
        return !(matchesSection && s.seatOrder === seatOrder);
      });
    } else {
      const newSeatObj: SelectedSeatObj = {
        attractionId: activeAttId,
        attractionSeatId: secId,
        sectionName: secName,
        seatOrder,
        name: `${secName} - ${String(seatOrder).padStart(2, "0")}`,
      };
      if (activeAttractionSelectedSeatObjs.length < totalPaxForActiveAttraction) {
        updatedAttObjs = [...activeAttractionSelectedSeatObjs, newSeatObj];
      } else if (totalPaxForActiveAttraction > 0) {
        // Replace last seat
        updatedAttObjs = [...activeAttractionSelectedSeatObjs.slice(0, -1), newSeatObj];
      }
    }

    const otherAttObjs = selectedSeatObjs.filter((s) => s.attractionId !== activeAttId);
    const nextAllObjs = [...otherAttObjs, ...updatedAttObjs];

    const nextAsgn: Record<string, string> = { ...paxAssignment };
    updatedAttObjs.forEach((s, i) => {
      if (paxListForActiveAttraction[i]) {
        nextAsgn[`${activeAttId}_${s.name}`] = `${paxListForActiveAttraction[i].label} ${paxListForActiveAttraction[i].idx}`;
      }
    });

    onManualEdit?.(activeAttId);
    onSelectedSeatsChange(nextAllObjs, nextAsgn);
  };

  const [isMakingNewTrip, setIsMakingNewTrip] = React.useState(false);

  const newTrip = async () => {
    if (isMakingNewTrip) return;
    setIsMakingNewTrip(true);
    try {
      await onTripChange(activeAttId, currentTrip);
      // Clear selections for this specific attraction
      const otherAttObjs = selectedSeatObjs.filter((s) => s.attractionId !== activeAttId);
      onSelectedSeatsChange(otherAttObjs);
    } finally {
      setIsMakingNewTrip(false);
    }
  };

  const formatSeatLabel = (num: number) => {
    return num < 100 ? String(num).padStart(2, "0") : String(num);
  };

  // Render individual seat button
  const renderSeatButton = (seatOrder: number) => {
    const isOccupied = activeSectionBookedSeats.includes(seatOrder);
    const isSelected = activeSectionSelectedSeats.some((s) => s.seatOrder === seatOrder);
    const seatBtnWidth = colsCount >= 10 ? "44px" : colsCount >= 8 ? "48px" : "52px";

    return (
      <button
        key={seatOrder}
        type="button"
        disabled={isOccupied}
        onClick={(e) => {
          e.stopPropagation();
          handleSeatToggle(seatOrder);
        }}
        title={`Seat ${formatSeatLabel(seatOrder)}${isOccupied ? " (Occupied)" : isSelected ? " (Selected)" : " (Available)"}`}
        style={{
          width: seatBtnWidth,
          minWidth: seatBtnWidth,
          height: "34px",
          padding: "0 2px",
          borderRadius: "5px",
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
          fontSize: colsCount >= 10 ? "11.5px" : "12.5px",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontWeight: 700,
          color: isOccupied ? "#64748B" : isSelected ? "#011B2F" : "#011B2F",
          transition: "all 0.12s ease",
          userSelect: "none",
          boxSizing: "border-box",
          flexShrink: 0,
        }}
      >
        {formatSeatLabel(seatOrder)}
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
      {/* ── Multiple Attractions Switcher / Tab Bar ── */}
      {seatingAttractions.length > 1 && (
        <div style={{ marginBottom: "20px" }}>
          <div
            style={{
              fontSize: "11px",
              fontWeight: 800,
              color: "#64748B",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: "10px",
            }}
          >
            Select Attraction to Allocate Seats ({seatingAttractions.length} Attractions with Seating)
          </div>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {seatingAttractions.map((att) => {
              const isActive = att.attractionId === activeAttId;
              const attPax = getAttractionRequiredSeats(att);
              const attAllocated = selectedSeatObjs.filter((s) => s.attractionId === att.attractionId).length;
              const isComplete = attAllocated >= attPax && attPax > 0;

              // Calculate available seats for this attraction on current trip
              const attData = seatAvailData.find((d) => d.attractionId === att.attractionId);
              const attSecs: AttractionSeatItem[] = (attData?.seatLayout?.[0]?.seats || attData?.seats || []).slice();
              const r = attData?.seatLayout?.[0]?.rows || 0;
              const c = attData?.seatLayout?.[0]?.cols || 0;
              const tSecSeats = (r > 0 && c > 0) ? (r * c) : (attSecs.length > 0 ? 4 : 0);
              let attAvail = 0;
              attSecs.forEach((sec) => {
                const b = Array.isArray(sec.bookedSeats) ? sec.bookedSeats : [];
                for (let o = 1; o <= tSecSeats; o++) {
                  if (!b.includes(o)) attAvail++;
                }
              });
              const isAttInsufficient = attAvail < attPax;

              return (
                <button
                  key={att.attractionId}
                  type="button"
                  onClick={() => onActiveAttractionChange(att.attractionId || "")}
                  style={{
                    padding: "10px 18px",
                    borderRadius: "10px",
                    border: isActive
                      ? isAttInsufficient
                        ? "2px solid #D97706"
                        : "2px solid #002A45"
                      : isAttInsufficient
                        ? "1.5px solid #F59E0B"
                        : "1.5px solid #CBD5E1",
                    background: isActive
                      ? isAttInsufficient
                        ? "#78350F"
                        : "#002A45"
                      : isAttInsufficient
                        ? "#FFFBEB"
                        : "#FFFFFF",
                    color: isActive ? "#FFFFFF" : isAttInsufficient ? "#92400E" : "#011B2F",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: 700,
                    fontSize: "13px",
                    boxShadow: isActive ? "0 4px 14px rgba(0, 42, 69, 0.2)" : "none",
                    transition: "all 0.15s ease",
                  }}
                >
                  <span>{att.attractionName}</span>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 800,
                      padding: "2px 8px",
                      borderRadius: "12px",
                      background: isComplete
                        ? isActive
                          ? "#16A34A"
                          : "#DCFCE7"
                        : isAttInsufficient
                          ? isActive
                            ? "#DC2626"
                            : "#FEE2E2"
                          : isActive
                            ? "#D97706"
                            : "#FEF3C7",
                      color: isComplete
                        ? isActive
                          ? "#FFFFFF"
                          : "#166534"
                        : isAttInsufficient
                          ? isActive
                            ? "#FFFFFF"
                            : "#991B1B"
                          : isActive
                            ? "#FFFFFF"
                            : "#92400E",
                    }}
                  >
                    {isComplete
                      ? `✓ ${attAllocated}/${attPax} Seats`
                      : isAttInsufficient
                        ? `⚠️ ${attAllocated}/${attPax} Seats (Only ${attAvail} left)`
                        : `${attAllocated}/${attPax} Seats`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: "20px",
          alignItems: "flex-start",
        }}
      >
        {/* ── Left Container: Layout Overview — Section / Coach Cards ── */}
        <div
          style={{
            width: "224px",
            minWidth: "224px",
            flexShrink: 0,
            borderRight: "1px solid rgba(179,175,175,0.35)",
            padding: "18px 12px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            boxSizing: "border-box",
          }}
        >
          <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: "14px", color: "#011B2F" }}>
            Layout Overview
          </p>

          {/* Section/Layout cards — each section in seatLayout.seats + layout selector if multiple */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              overflowY: "auto",
              flex: 1,
              maxHeight: "360px",
              paddingRight: "2px",
            }}
          >
            {sectionsList.length === 0 && ((currentSeatData?.seatLayout?.length ?? 0) <= 1) ? (
              <p style={{ margin: "12px 0", fontSize: "12px", color: "#94A3B8", textAlign: "center" }}>
                No sections found
              </p>
            ) : (
              <>
                {((currentSeatData?.seatLayout?.length ?? 0) > 1) && (
                  <>
                    {currentSeatData?.seatLayout?.map((layout) => {
                      const isLayoutSelected = (selectedLayoutMap.get(activeAttId) || currentSeatData?.seatLayout?.[0]?.seatLayoutId) === layout.seatLayoutId;
                      const totalLayoutSeats = (layout.rows ?? 0) * (layout.cols ?? 0);
                      const layoutSeatsBooked = layout.seats?.reduce((sum, seat) => sum + (Array.isArray(seat.bookedSeats) ? seat.bookedSeats.length : 0), 0) ?? 0;
                      const layoutSeatsAvailable = totalLayoutSeats - layoutSeatsBooked;

                      return (
                        <div
                          key={layout.seatLayoutId}
                          onClick={() => {
                            setSelectedLayoutMap((prev: Map<string, string>) => new Map(prev).set(activeAttId, layout.seatLayoutId));
                            setActiveSectionId("");
                          }}
                          style={{
                            background: "#FFFFFF",
                            border: isLayoutSelected ? "1.5px solid #173F63" : "1.5px solid rgba(179,175,175,0.51)",
                            borderRadius: "13px",
                            padding: "10px 14px",
                            cursor: "pointer",
                            opacity: 1,
                            transition: "all 0.15s ease",
                            boxSizing: "border-box",
                            boxShadow: isLayoutSelected ? "0 2px 8px rgba(0, 42, 69, 0.1)" : "none",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                            <span style={{ fontWeight: 600, fontSize: "13px", color: "#011B2F" }}>
                              {layout.name}
                            </span>
                            <span style={{ background: "transparent", color: "transparent", fontSize: "8px", fontWeight: 700, padding: "2px 6px", borderRadius: "5px" }}>

                            </span>
                          </div>
                          <p style={{ margin: "1px 0", fontSize: "10px", fontWeight: 600, color: "#6B7280" }}>
                            Available: {layoutSeatsAvailable} / {totalLayoutSeats} Seats
                            &nbsp;&nbsp;
                            Booked: {layoutSeatsBooked}
                          </p>
                          <p style={{ margin: "1px 0 0", fontSize: "10px", fontWeight: 600, color: "#6B7280" }}>
                            Click to view and allocate
                          </p>
                          <p style={{ margin: 0, fontSize: "9.5px", fontWeight: 500, color: "#94A3B8" }}>
                            {isLayoutSelected ? "Currently viewing layout" : "Layout available"}
                          </p>
                        </div>
                      );
                    })}
                  </>
                )}
                {sectionsList.map((section) => {
                  const isSecActive = (section.attractionSeatId || String(section.seatOrder)) === activeSectionId;
                const bookedList = Array.isArray(section.bookedSeats) ? section.bookedSeats : [];
                const bookedCount = bookedList.length;
                const totalSecSeats = totalSectionSeats || 1;
                const availCount = Math.max(0, totalSecSeats - bookedCount);
                const isFull = availCount === 0;

                const secAllocatedSeats = activeAttractionSelectedSeatObjs.filter((s) => {
                  if (section.attractionSeatId && s.attractionSeatId) {
                    return s.attractionSeatId === section.attractionSeatId;
                  }
                  return s.sectionName === (section.name || `Seat ${section.seatOrder}`);
                });
                const allocatedCount = secAllocatedSeats.length;
                const hasAllocated = allocatedCount > 0;
                const isCardDisabled = isFull && !hasAllocated;

                const statusLabel = isFull && !hasAllocated
                  ? "Booked"
                  : isSecActive
                    ? "Selected"
                    : isFull
                      ? "Booked"
                      : hasAllocated
                        ? `Selected`
                        : "Available";

                const statusBg = isFull && !hasAllocated
                  ? "rgba(179,175,175,0.4)"
                  : isSecActive || hasAllocated
                    ? "rgba(244,188,67,0.61)"
                    : "rgba(34,197,94,0.15)";

                const statusColor = isFull && !hasAllocated
                  ? "#475569"
                  : isSecActive || hasAllocated
                    ? "#173F63"
                    : "#15803D";

                return (
                  <div
                    key={section.attractionSeatId || section.seatOrder}
                    onClick={() => {
                      if (!isCardDisabled) {
                        setActiveSectionId(section.attractionSeatId || String(section.seatOrder));
                      }
                    }}
                    style={{
                      background: isCardDisabled ? "#F8FAFC" : "#FFFFFF",
                      border: isSecActive
                        ? "1.5px solid #173F63"
                        : hasAllocated
                          ? "1.5px solid #D99B1E"
                          : isCardDisabled
                            ? "1.5px solid #E2E8F0"
                            : "1.5px solid rgba(179,175,175,0.51)",
                      borderRadius: "13px",
                      padding: "10px 14px",
                      cursor: isCardDisabled ? "not-allowed" : "pointer",
                      opacity: isCardDisabled ? 0.6 : 1,
                      transition: "all 0.15s ease",
                      boxSizing: "border-box",
                      boxShadow: isSecActive ? "0 2px 8px rgba(0, 42, 69, 0.1)" : "none",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontWeight: 600, fontSize: "13px", color: isCardDisabled ? "#64748B" : "#011B2F" }}>
                        {section.name || `Seat ${section.seatOrder}`}
                      </span>
                      <span style={{ background: statusBg, color: statusColor, fontSize: "8px", fontWeight: 700, padding: "2px 6px", borderRadius: "5px" }}>
                        {statusLabel}
                      </span>
                    </div>
                    <p style={{ margin: "1px 0", fontSize: "10px", fontWeight: 600, color: isCardDisabled ? "#94A3B8" : "#6B7280" }}>
                      Available: {availCount} / {totalSecSeats} Seats
                      &nbsp;&nbsp;
                      Booked: {bookedCount}
                    </p>
                    <p style={{ margin: "1px 0 0", fontSize: "10px", fontWeight: 600, color: hasAllocated ? "#92400E" : isCardDisabled ? "#94A3B8" : "#6B7280" }}>
                      {hasAllocated
                        ? `Seat No: ${secAllocatedSeats.map((s) => String(s.seatOrder).padStart(2, "0")).join(", ")} Allocated`
                        : isFull
                          ? "All seats booked"
                          : "Click to view and allocate"}
                    </p>
                    <p style={{ margin: 0, fontSize: "9.5px", fontWeight: 500, color: "#94A3B8" }}>
                      {hasAllocated ? "Assigned to passenger" : isFull ? "Section is full" : isSecActive ? "Currently viewing section" : "Section available"}
                    </p>
                  </div>
                );
              })}
              </>
            )}
          </div>

          {/* Yellow info box */}
          <div
            style={{
              background: "#FFFBEB",
              border: "1px solid #FEF3C7",
              borderRadius: "8px",
              padding: "8px 10px",
              display: "flex",
              gap: "6px",
              alignItems: "flex-start",
              marginTop: "4px",
            }}
          >
            <AlertTriangle size={14} color="rgba(244,188,67,0.8)" style={{ flexShrink: 0, marginTop: "1px" }} />
            <p style={{ margin: 0, fontSize: "9px", fontWeight: 500, color: "#835505", lineHeight: "13px" }}>
              Seats highlighted in gold are auto-assigned. Click any seat in the grid to manually reassign.
            </p>
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
            {(() => {
              const isInsufficientSeats = totalPaxForActiveAttraction > totalAvailSeatsAllSections;
              return (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "8px",
                        background: isInsufficientSeats ? "rgba(239, 68, 68, 0.12)" : "rgba(34, 197, 94, 0.12)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Users size={15} color={isInsufficientSeats ? "#DC2626" : "#16A34A"} />
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: "9px",
                          fontWeight: 600,
                          color: isInsufficientSeats ? "#DC2626" : "#64748B",
                          textTransform: "uppercase",
                          letterSpacing: "0.4px",
                        }}
                      >
                        Available Seats {isInsufficientSeats ? "(Low)" : ""}
                      </div>
                      <div style={{ fontSize: "12px", fontWeight: 700, color: isInsufficientSeats ? "#DC2626" : "#15803D" }}>
                        {totalAvailSeatsAllSections} / {totalCapacityAllSections} Seats
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

                  {/* Required Pax for this attraction */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "8px",
                        background: isInsufficientSeats ? "rgba(245, 158, 11, 0.15)" : "rgba(23, 63, 99, 0.08)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Users size={15} color={isInsufficientSeats ? "#D97706" : "#173F63"} />
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
                        Visitors ({activeAttName})
                      </div>
                      <div style={{ fontSize: "12px", fontWeight: 700, color: isInsufficientSeats ? "#D97706" : "#011B2F" }}>
                        {activeAttractionSelectedSeatObjs.length} / {totalPaxForActiveAttraction} Allocated
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
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
              Select Seats – {activeAttName} {seatLayout?.name ? `(${seatLayout.name})` : ""}
              {activeSection?.name ? ` – ${activeSection.name}` : ""}
            </h4>

            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <button
                type="button"
                disabled={isMakingNewTrip}
                onClick={(e) => {
                  e.stopPropagation();
                  newTrip();
                }}
                style={{
                  width: "158px",
                  height: "35px",
                  background: totalPaxForActiveAttraction > totalAvailSeatsAllSections ? "#D97706" : "#FFFFFF",
                  border: totalPaxForActiveAttraction > totalAvailSeatsAllSections ? "1.5px solid #D97706" : "1.5px solid #2576AB",
                  borderRadius: "6px",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 700,
                  fontSize: "12px",
                  color: totalPaxForActiveAttraction > totalAvailSeatsAllSections ? "#FFFFFF" : "#173F63",
                  cursor: isMakingNewTrip ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  opacity: isMakingNewTrip ? 0.7 : 1,
                  boxShadow: totalPaxForActiveAttraction > totalAvailSeatsAllSections ? "0 2px 6px rgba(217, 119, 6, 0.3)" : "none",
                }}
              >
                {isMakingNewTrip ? (
                  <>
                    <span style={{ width: "14px", height: "14px", border: "2px solid currentColor", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
                    Creating…
                  </>
                ) : (
                  <><Plus size={16} strokeWidth={2.5} /> Make New Trip</>
                )}
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

          {/* Insufficient Seats Warning Banner / Standard Info Banner */}
          {totalPaxForActiveAttraction > totalAvailSeatsAllSections ? (
            <div
              style={{
                background: "#FFFBEB",
                border: "1.5px solid #F59E0B",
                borderRadius: "8px",
                padding: "10px 14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", flex: 1, minWidth: "260px" }}>
                <AlertTriangle size={18} color="#D97706" style={{ flexShrink: 0, marginTop: "2px" }} />
                <div>
                  <div style={{ fontSize: "12.5px", fontWeight: 700, color: "#92400E", marginBottom: "2px" }}>
                    Insufficient Seats in Trip #{currentTrip} ({totalPaxForActiveAttraction} Visitors vs {totalAvailSeatsAllSections} Available Seats)
                  </div>
                  <div style={{ fontSize: "11.5px", color: "#78350F", lineHeight: "16px" }}>
                    {totalAvailSeatsAllSections === 0
                      ? `Trip #${currentTrip} has no seats available. Please click "Make New Trip" to book for this group in the next trip.`
                      : `Only ${totalAvailSeatsAllSections} seat(s) available in Trip #${currentTrip}, but this booking is for ${totalPaxForActiveAttraction} visitors. You can click "Make New Trip" to allocate this group to the next trip, or book the remaining ${totalAvailSeatsAllSections} seat(s) for another visitor.`}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                background: "#DEF2FF",
                border: "1px solid rgba(23, 63, 99, 0.4)",
                borderRadius: "7px",
                padding: "8px 14px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span style={{ fontSize: "13px" }}>ℹ️</span>
              <span style={{ fontSize: "11.5px", color: "#173F63", fontWeight: 600 }}>
                {activeAttractionSelectedSeatObjs.length < totalPaxForActiveAttraction
                  ? `Allocating seats for ${activeAttName}. Please select ${totalPaxForActiveAttraction - activeAttractionSelectedSeatObjs.length} more seat(s).`
                  : `All ${totalPaxForActiveAttraction} seat(s) allocated for ${activeAttName}. Click any seat to reallocate.`}
              </span>
            </div>
          )}

          {/* Visual Interactive Seat Grid Container */}
          {isLoadingSeats ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "48px 0",
                gap: "10px",
              }}
            >
              <RotateCcw size={24} color="#173F63" style={{ animation: "spin 1s linear infinite" }} />
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#64748B" }}>
                Loading seat layout for {activeAttName}...
              </span>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "14px",
                width: "100%",
                boxSizing: "border-box",
              }}
            >
              {/* Scrollable canvas for seat grid */}
              <div
                style={{
                  width: "100%",
                  maxHeight: "360px",
                  overflowY: "auto",
                  overflowX: "auto",
                  padding: "16px 14px",
                  background: "#F8FAFC",
                  borderRadius: "10px",
                  border: "1px solid #E2E8F0",
                  boxSizing: "border-box",
                }}
              >
                <div
                  style={{
                    display: "inline-flex",
                    flexDirection: "column",
                    minWidth: "100%",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <div style={{ display: "inline-flex", gap: isAisleActive ? "16px" : "10px", alignItems: "flex-start" }}>
                    {/* Left Side Section — hidden when aisleAfterCol === 0 (aisle at start) */}
                    {(() => {
                      const leftColsCount = isAisleActive && aisleAfterCol !== null ? aisleAfterCol : (!isAisleActive ? colsCount || 1 : 0);
                      if (leftColsCount === 0) return null;
                      return (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "center" }}>
                          {isAisleActive && (
                            <div
                              style={{
                                width: "100%",
                                textAlign: "center",
                                fontSize: "11.5px",
                                fontWeight: 700,
                                color: "#173F63",
                                background: "rgba(23, 63, 99, 0.08)",
                                padding: "4px 8px",
                                borderRadius: "6px",
                                letterSpacing: "0.3px",
                              }}
                            >
                              Left Side
                            </div>
                          )}
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            {Array.from({ length: rowsCount || 1 }, (_, i) => i + 1).map((r) => {
                              const leftCells = Array.from({ length: leftColsCount }, (_, ci) => {
                                const order = (r - 1) * (colsCount || leftColsCount) + (ci + 1);
                                return { order, col: ci + 1 };
                              });
                              return (
                                <div key={r} style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                                  {leftCells.map(({ order }) => renderSeatButton(order))}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Center AISLE — height matches seat grid exactly */}
                    {isAisleActive && (() => {
                      // Seat button height = 34px, row gap = 6px
                      const seatRowH = 34;
                      const rowGap = 6;
                      const aisleHeight = (rowsCount || 1) * seatRowH + Math.max(0, (rowsCount || 1) - 1) * rowGap;
                      // paddingTop accounts for the "Left Side" / "Right Side" label (only when aisleAfterCol > 0)
                      const labelPaddingTop = aisleAfterCol !== null && aisleAfterCol > 0 ? 27 : 0;
                      return (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            paddingTop: `${labelPaddingTop}px`,
                          }}
                        >
                          <div
                            style={{
                              width: "44px",
                              height: `${aisleHeight}px`,
                              border: "1.5px dashed #CBD5E1",
                              borderRadius: "6px",
                              background: "rgba(241, 245, 249, 0.8)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "11px",
                              fontWeight: 800,
                              color: "#64748B",
                              letterSpacing: "4px",
                              writingMode: "vertical-rl",
                              textTransform: "uppercase",
                              boxSizing: "border-box",
                              userSelect: "none",
                              flexShrink: 0,
                            }}
                          >
                            AISLE
                          </div>
                        </div>
                      );
                    })()}

                    {/* Right Side Section if aisle exists */}
                    {isAisleActive && aisleAfterCol !== null && (colsCount - aisleAfterCol) > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "center" }}>
                        {/* Only show "Right Side" label when there's also a left side (i.e., aisleAfterCol > 0) */}
                        {aisleAfterCol > 0 && (
                          <div
                            style={{
                              width: "100%",
                              textAlign: "center",
                              fontSize: "11.5px",
                              fontWeight: 700,
                              color: "#173F63",
                              background: "rgba(23, 63, 99, 0.08)",
                              padding: "4px 8px",
                              borderRadius: "6px",
                              letterSpacing: "0.3px",
                            }}
                          >
                            Right Side
                          </div>
                        )}
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          {Array.from({ length: rowsCount }, (_, i) => i + 1).map((r) => {
                            const rightColsCount = colsCount - aisleAfterCol;
                            const rightCells = Array.from({ length: rightColsCount }, (_, ci) => {
                              const order = (r - 1) * colsCount + (aisleAfterCol + ci + 1);
                              return { order, col: aisleAfterCol + ci + 1 };
                            });

                            return (
                              <div key={r} style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                                {rightCells.map(({ order }) => renderSeatButton(order))}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div
                style={{
                  display: "flex",
                  gap: "28px",
                  alignItems: "center",
                  marginTop: "8px",
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
  initialTripMap,
}: CustomerInfoViewProps) {
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [isAddNewOpen, setIsAddNewOpen] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [createdBookingId, setCreatedBookingId] = useState<string | null>(null);
  const [pendingBookingPayload, setPendingBookingPayload] = useState<any>(null);
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
  const createSeatBookingMutation = useCreateAttractionSeatBooking();

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

  // Seat allocation accordion — start collapsed by default
  const [isSeatAllocExpanded, setIsSeatAllocExpanded] = useState(false);

  // Filter all attractions in bookingSummary that require seat allocation
  const seatingAttractions = useMemo(() => {
    return bookingSummary.filter(
      (b) => !!b.attractionId && b.hasSeating !== false && (b.hasSeating || !!b.seatLayoutId)
    );
  }, [bookingSummary]);

  // Active attraction tab inside seat allocation panel
  const [activeAttractionId, setActiveAttractionId] = useState<string>("");

  useEffect(() => {
    if (seatingAttractions.length > 0) {
      if (!activeAttractionId || !seatingAttractions.some((a) => a.attractionId === activeAttractionId)) {
        setActiveAttractionId(seatingAttractions[0].attractionId || "");
      }
    }
  }, [seatingAttractions, activeAttractionId]);

  // Per-attraction Trip numbers map: { [attractionId]: tripNumber }
  const [tripMap, setTripMap] = useState<Record<string, number>>(() => ({ ...(initialTripMap || {}) }));

  // Seat allocation state across all attractions
  const [selectedSeatObjs, setSelectedSeatObjs] = useState<SelectedSeatObj[]>([]);
  const [paxAssignment, setPaxAssignment] = useState<Record<string, string>>({});
  const [timeSlot, setTimeSlot] = useState("10:00 AM – 10:20 AM");
  const [seatValidationError, setSeatValidationError] = useState<string | null>(null);

  // Track if user manually modified seats for an attraction
  const manuallyEditedAttractionsRef = useRef<Record<string, boolean>>({});
  const lastAllocatedTripRef = useRef<Record<string, number>>({});

  // Today's formatted date for the slot
  const slotDate = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const todayDateStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Fetch real trip numbers from API for all seating attractions
  const tripNoQuery = useMemo(
    () =>
      seatingAttractions.map((a) => ({
        attractionId: a.attractionId!,
        currentTripNo: tripMap[a.attractionId!] || (initialTripMap && initialTripMap[a.attractionId!]) || 1,
      })),
    [seatingAttractions, tripMap, initialTripMap]
  );
  const { data: tripNoData } = useAttractionTripNo(tripNoQuery, seatingAttractions.length > 0 && !showPaymentModal && !showTicketModal);

  useEffect(() => {
    if (tripNoData && tripNoData.length > 0) {
      setTripMap((prev) => {
        let changed = false;
        const next = { ...prev };
        tripNoData.forEach((item) => {
          if (item.attractionId) {
            const newVal = item.newTripNo || 1;
            if (next[item.attractionId] === undefined) {
              next[item.attractionId] = newVal;
              changed = true;
            }
          }
        });
        return changed ? next : prev;
      });
    }
  }, [tripNoData]);

  // Real API Call: Fetch seat availability and layout for ALL seating attractions
  const seatAvailabilityPayload = useMemo(
    () =>
      seatingAttractions.map((att) => ({
        attractionId: att.attractionId!,
        currentTripNo: tripMap[att.attractionId!] || (initialTripMap && initialTripMap[att.attractionId!]) || 1,
      })),
    [seatingAttractions, tripMap, initialTripMap]
  );
  const {
    data: seatAvailData = [],
    isLoading: isLoadingSeats,
    isFetching: isFetchingSeats,
    refetch: refetchSeatsQuery,
  } = useAttractionSeatAvailability(seatAvailabilityPayload, seatingAttractions.length > 0 && !showPaymentModal && !showTicketModal);

  const refetchSeats = () => {
    seatingAttractions.forEach((att) => {
      if (att.attractionId) {
        manuallyEditedAttractionsRef.current[att.attractionId] = false;
        delete lastAllocatedTripRef.current[att.attractionId];
      }
    });
    refetchSeatsQuery();
  };

  // Ref to track attractions that already had auto-new-trip triggered so we don't loop
  const autoNewTripDoneRef = useRef<Record<string, number>>({});

  // ── Auto-make new trip when ALL seats in current trip are fully booked ──
  useEffect(() => {
    if (!seatAvailData || seatAvailData.length === 0) return;
    if (seatingAttractions.length === 0) return;

    seatingAttractions.forEach((att) => {
      const attId = att.attractionId!;
      const attData = seatAvailData.find((d) => d.attractionId === attId);
      if (!attData) return;

      const currentTripNo = attData.currentTripNo || tripMap[attId] || 1;
      // Only trigger once per trip
      if (autoNewTripDoneRef.current[attId] === currentTripNo) return;

      const sections: AttractionSeatItem[] = (attData.seatLayout?.[0]?.seats || attData.seats || []).slice();
      const rows = attData.seatLayout?.[0]?.rows || 0;
      const cols = attData.seatLayout?.[0]?.cols || 0;
      const totalSecSeats = (rows > 0 && cols > 0) ? (rows * cols) : (sections.length > 0 ? 4 : 0);

      if (sections.length === 0 || totalSecSeats === 0) return;

      let totalCapacity = 0;
      let totalBooked = 0;
      for (const sec of sections) {
        totalCapacity += totalSecSeats;
        const booked = Array.isArray(sec.bookedSeats) ? sec.bookedSeats : [];
        totalBooked += booked.length;
      }

      // All seats fully booked on this trip and trip has actual bookings
      if (totalCapacity > 0 && totalBooked >= totalCapacity) {
        autoNewTripDoneRef.current[attId] = currentTripNo;
        handleTripChange(attId, currentTripNo);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seatAvailData]);


  useEffect(() => {
    if (!seatAvailData || seatAvailData.length === 0) return;
    if (seatingAttractions.length === 0) return;

    let combinedObjs = [...selectedSeatObjs];
    const nextAsgn: Record<string, string> = { ...paxAssignment };
    let changed = false;

    seatingAttractions.forEach((att) => {
      const attId = att.attractionId!;
      const totalPax = getAttractionRequiredSeats(att);
      if (totalPax <= 0) return;

      const paxList: { label: string; idx: number }[] = [];
      const cnt: Record<string, number> = {};
      att.passengers.forEach((p) => {
        if (p.qty > 0) {
          const seatsPerTicket = p.noOfSeats && p.noOfSeats > 0 ? p.noOfSeats : 1;
          const totalSeats = p.qty * seatsPerTicket;
          for (let i = 1; i <= totalSeats; i++) {
            cnt[p.label] = (cnt[p.label] || 0) + 1;
            paxList.push({ label: p.label, idx: cnt[p.label] });
          }
        }
      });

      const attData = seatAvailData.find((d) => d.attractionId === attId);
      if (!attData) return;

      const currentTripNo = attData.currentTripNo || tripMap[attId] || 1;
      const sections: AttractionSeatItem[] = (attData.seatLayout?.[0]?.seats || attData.seats || []).slice().sort((a, b) => a.seatOrder - b.seatOrder);
      const rows = attData.seatLayout?.[0]?.rows || 0;
      const cols = attData.seatLayout?.[0]?.cols || 0;
      const totalSecSeats = (rows > 0 && cols > 0) ? (rows * cols) : (sections.length > 0 ? 4 : 0);

      // Calculate available unbooked seats across all sections in this attraction
      let availableSeats = 0;
      for (const sec of sections) {
        const booked = Array.isArray(sec.bookedSeats) ? sec.bookedSeats : [];
        for (let order = 1; order <= totalSecSeats; order++) {
          if (!booked.includes(order)) {
            availableSeats++;
          }
        }
      }

      const isManuallyEdited = Boolean(manuallyEditedAttractionsRef.current[attId]);
      const tripHasChanged = lastAllocatedTripRef.current[attId] !== currentTripNo;

      // When more visitors than available seats in current trip: DO NOT auto-select seats
      if (availableSeats < totalPax) {
        const existingForAtt = combinedObjs.filter((s) => s.attractionId === attId);
        // Clear any previous auto-allocation for this attraction
        if (existingForAtt.length > 0 && !isManuallyEdited) {
          combinedObjs = combinedObjs.filter((s) => s.attractionId !== attId);
          Object.keys(nextAsgn).forEach((k) => {
            if (k.startsWith(`${attId}_`)) delete nextAsgn[k];
          });
          changed = true;
        }
        lastAllocatedTripRef.current[attId] = currentTripNo;
        return;
      }

      const existingForAtt = combinedObjs.filter((s) => s.attractionId === attId);
      const validCurrent = existingForAtt.filter((so) => {
        const sec = sections.find((sc) => (sc.attractionSeatId && sc.attractionSeatId === so.attractionSeatId) || (sc.name || `Seat ${sc.seatOrder}`) === so.sectionName);
        if (!sec) return false;
        const booked = Array.isArray(sec.bookedSeats) ? sec.bookedSeats : [];
        return !booked.includes(so.seatOrder) && so.seatOrder >= 1 && so.seatOrder <= totalSecSeats;
      });

      // If user has NOT manually edited seats, or if the trip has changed, perform fresh sequential allocation
      if (!isManuallyEdited || tripHasChanged) {
        const newObjs: SelectedSeatObj[] = [];

        for (const sec of sections) {
          if (newObjs.length >= totalPax) break;
          const booked = Array.isArray(sec.bookedSeats) ? sec.bookedSeats : [];
          const secName = sec.name || `Seat ${sec.seatOrder}`;

          for (let order = 1; order <= totalSecSeats; order++) {
            if (newObjs.length >= totalPax) break;
            if (booked.includes(order)) continue;

            newObjs.push({
              attractionId: attId,
              attractionSeatId: sec.attractionSeatId || null,
              sectionName: secName,
              seatOrder: order,
              name: `${secName} - ${String(order).padStart(2, "0")}`,
            });
          }
        }

        const isIdentical =
          newObjs.length === existingForAtt.length &&
          newObjs.every((no, idx) => {
            const eo = existingForAtt[idx];
            return (
              eo &&
              ((eo.attractionSeatId && no.attractionSeatId && eo.attractionSeatId === no.attractionSeatId) ||
                eo.sectionName === no.sectionName) &&
              eo.seatOrder === no.seatOrder
            );
          });

        if (!isIdentical) {
          Object.keys(nextAsgn).forEach((k) => {
            if (k.startsWith(`${attId}_`)) delete nextAsgn[k];
          });
          newObjs.forEach((o, idx) => {
            if (paxList[idx]) {
              nextAsgn[`${attId}_${o.name}`] = `${paxList[idx].label} ${paxList[idx].idx}`;
            }
          });
          combinedObjs = combinedObjs.filter((so) => so.attractionId !== attId);
          combinedObjs.push(...newObjs);
          changed = true;
        }

        lastAllocatedTripRef.current[attId] = currentTripNo;
      } else {
        // If user manually edited, keep validCurrent and fill remaining if needed
        if (validCurrent.length < totalPax) {
          const newObjs: SelectedSeatObj[] = [...validCurrent];

          for (const sec of sections) {
            if (newObjs.length >= totalPax) break;
            const booked = Array.isArray(sec.bookedSeats) ? sec.bookedSeats : [];
            const secName = sec.name || `Seat ${sec.seatOrder}`;

            for (let order = 1; order <= totalSecSeats; order++) {
              if (newObjs.length >= totalPax) break;
              if (booked.includes(order)) continue;

              const alreadyInSec = newObjs.some(
                (o) =>
                  ((sec.attractionSeatId && o.attractionSeatId === sec.attractionSeatId) || o.sectionName === secName) &&
                  o.seatOrder === order
              );
              if (alreadyInSec) continue;

              newObjs.push({
                attractionId: attId,
                attractionSeatId: sec.attractionSeatId || null,
                sectionName: secName,
                seatOrder: order,
                name: `${secName} - ${String(order).padStart(2, "0")}`,
              });
            }
          }

          Object.keys(nextAsgn).forEach((k) => {
            if (k.startsWith(`${attId}_`)) delete nextAsgn[k];
          });
          newObjs.forEach((o, idx) => {
            if (paxList[idx]) {
              nextAsgn[`${attId}_${o.name}`] = `${paxList[idx].label} ${paxList[idx].idx}`;
            }
          });
          combinedObjs = combinedObjs.filter((so) => so.attractionId !== attId);
          combinedObjs.push(...newObjs);
          changed = true;
        }
      }
    });

    if (changed) {
      setSelectedSeatObjs(combinedObjs);
      setPaxAssignment(nextAsgn);
      setSeatValidationError(null);
    }
  }, [seatAvailData, seatingAttractions, tripMap]);

  function handleSelectedSeatsChange(
    newSeatObjs: SelectedSeatObj[],
    newPaxAssignment?: Record<string, string>
  ) {
    if (activeAttractionId) {
      manuallyEditedAttractionsRef.current[activeAttractionId] = true;
    }
    setSelectedSeatObjs(newSeatObjs);
    if (newPaxAssignment) {
      setPaxAssignment(newPaxAssignment);
    }
    setSeatValidationError(null);
  }

  function handleManualEdit(attId: string) {
    if (attId) {
      manuallyEditedAttractionsRef.current[attId] = true;
    }
  }

  async function handleTripChange(attId: string, currentTripNo?: number) {
    // Call get-attraction-trip-no API with currentTripNo + 1 to request the next trip
    const ongoingTrip = currentTripNo ?? (tripMap[attId] ?? 1);
    const nextTripPayload = ongoingTrip + 1;
    let resolvedNextTrip = nextTripPayload;
    try {
      const res = await postData<any, { attractions: { attractionId: string; currentTripNo: number }[] }>(
        AppUrl.ticketingBooking.getAttractionTripNo,
        { attractions: [{ attractionId: attId, currentTripNo: nextTripPayload }] }
      );
      const payload = res?.data ?? res;
      const items = Array.isArray(payload) ? payload : [];
      const item = items.find((i: any) => i.attractionId === attId);
      if (item && item.newTripNo) {
        resolvedNextTrip = Math.max(nextTripPayload, item.newTripNo > ongoingTrip ? item.newTripNo + 1 : nextTripPayload);
      }
    } catch {
      // fallback to local increment
    }
    manuallyEditedAttractionsRef.current[attId] = false;
    delete lastAllocatedTripRef.current[attId];
    setTripMap((prev) => ({ ...prev, [attId]: resolvedNextTrip }));
    setSelectedSeatObjs((prev) => prev.filter((s) => s.attractionId !== attId));
    setPaxAssignment((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        if (k.startsWith(`${attId}_`)) delete next[k];
      });
      return next;
    });
  }

  const grandTotal = Number(bookingSummary.reduce((s, b) => s + b.totalAmount, 0).toFixed(2));

  const uniquePaxCount = useMemo(() => {
    if (!bookingSummary.length) return 0;
    return bookingSummary.reduce(
      (sum, b) => sum + getAttractionRequiredSeats(b),
      0
    );
  }, [bookingSummary]);

  const totalRequiredSeatsCount = useMemo(() => {
    return seatingAttractions.reduce(
      (sum, att) => sum + getAttractionRequiredSeats(att),
      0
    );
  }, [seatingAttractions]);

  const hasSeatingRequired = seatingAttractions.length > 0;

  const areAllAttractionsAllocated = useMemo(() => {
    if (seatingAttractions.length === 0) return true;
    return seatingAttractions.every((att) => {
      const req = getAttractionRequiredSeats(att);
      const allocated = selectedSeatObjs.filter((s) => s.attractionId === att.attractionId).length;
      return allocated >= req && req > 0;
    });
  }, [seatingAttractions, selectedSeatObjs]);

  const allAttractionsText = useMemo(() => {
    const names = Array.from(new Set(bookingSummary.map((b) => b.attractionName).filter(Boolean)));
    return names.join(", ") || "Attractions";
  }, [bookingSummary]);

  const subtotal = useMemo(() => Number(bookingSummary.reduce((s, b) => s + (b.subtotal ?? b.totalAmount), 0).toFixed(2)), [bookingSummary]);
  const gstAmount = useMemo(() => Number(bookingSummary.reduce((s, b) => s + (b.gstAmount ?? 0), 0).toFixed(2)), [bookingSummary]);
  const roundOff = useMemo(() => Number(bookingSummary.reduce((s, b) => s + (b.roundOff ?? 0), 0).toFixed(2)), [bookingSummary]);
  const attractionRoundOffGstAdj = useMemo(
    () => Number(bookingSummary.reduce((s, b) => s + (b.attractionRoundOffGstAdj ?? b.gstAdjustment ?? 0), 0).toFixed(2)),
    [bookingSummary]
  );

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

    if (hasSeatingRequired && !areAllAttractionsAllocated) {
      const missingAttraction = seatingAttractions.find((att) => {
        const req = getAttractionRequiredSeats(att);
        const allocated = selectedSeatObjs.filter((s) => s.attractionId === att.attractionId).length;
        return allocated < req;
      });
      if (missingAttraction) {
        const req = getAttractionRequiredSeats(missingAttraction);
        const allocated = selectedSeatObjs.filter((s) => s.attractionId === missingAttraction.attractionId).length;
        const diff = req - allocated;
        const attId = missingAttraction.attractionId!;
        const attCurTrip = tripMap[attId] || 1;
        const attData = seatAvailData.find((d) => d.attractionId === attId);
        const secList = attData?.seatLayout?.[0]?.seats || attData?.seats || [];
        const rows = attData?.seatLayout?.[0]?.rows || 0;
        const cols = attData?.seatLayout?.[0]?.cols || 0;
        const totalSecSeats = (rows > 0 && cols > 0) ? (rows * cols) : (secList.length > 0 ? 4 : 0);
        let availSeats = 0;
        secList.forEach((sec) => {
          const booked = Array.isArray(sec.bookedSeats) ? sec.bookedSeats : [];
          for (let order = 1; order <= totalSecSeats; order++) {
            if (!booked.includes(order)) availSeats++;
          }
        });

        let errMsg = "";
        if (availSeats < req) {
          errMsg = `${missingAttraction.attractionName} has only ${availSeats} seat(s) available in Trip #${attCurTrip}, but ${req} visitor(s) are in this booking. Please click "Make New Trip" to allocate for this group, or adjust the visitor count.`;
        } else if (allocated === 0) {
          errMsg = `Seat allocation is required for ${missingAttraction.attractionName}. Please select ${req} seat${req > 1 ? "s" : ""} before continuing.`;
        } else {
          errMsg = `Please select ${diff} more seat${diff > 1 ? "s" : ""} for ${missingAttraction.attractionName} (${allocated}/${req} selected) before continuing.`;
        }

        setSeatValidationError(errMsg);
        setActiveAttractionId(missingAttraction.attractionId || "");
        setIsSeatAllocExpanded(true);
        document.getElementById("seat-allocation-section")?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
    }
    setSeatValidationError(null);

    const firstAttraction = bookingSummary[0];

    const localSubtotal = subtotal;
    const localGstAmount = gstAmount;
    const gstAdjustment = bookingSummary.reduce((s, b) => s + (b.gstAdjustment ?? 0), 0);
    const localRoundOff = roundOff;

    const customerName = (selectedCustomer?.name || searchQuery || guestDetails.guestName || "").trim() || null;
    const mobileNumber = (selectedCustomer?.mobile || guestDetails.mobile || "").trim() || null;
    const gstNumber = (selectedCustomer?.gstn || "").trim() || null;

    // Build attractions array with per-attraction financials & categories
    const attractionsPayload: BookingAttractionPayload[] = bookingSummary
      .map((b) => {
        const categories: BookingCategoryPayload[] = (b.passengers || [])
          .filter((p) => (p.qty || 0) > 0)
          .map((p) => ({
            categoryId: p.categoryId || p.key || "",
            noOfVisitors: Number(p.qty || 0),
          }));

        return {
          attractionManagementId: b.attractionManagementId || b.attractionId || "",
          attractionSubtotal: Number(b.subtotal ?? 0),
          attractionGst: Number(b.gstAmount ?? 0),
          attractionRoundoff: Number(b.roundOff ?? 0),
          attractionRoundOffGstAdj: Number(b.gstAdjustment ?? 0),
          attractionTotalAmount: Number(b.totalAmount ?? 0),
          categories,
        };
      })
      .filter((att) => att.categories.length > 0);

    const basePayload = {
      customerName,
      mobileNumber,
      gstNumber,
      totalAmount: grandTotal,
      attractions: attractionsPayload,
    };

    setPendingBookingPayload(basePayload);
    setShowPaymentModal(true);
  }

  async function handleConfirmPayment(payMethod: "CASH" | "UPI" | "CARD" | "ONLINE", amtRcv: number, amountReceived: number, returnAmount: number) {
    try {
      // 1. Create Booking via POST /api/admin/ticketing-booking
      if (pendingBookingPayload) {
        const finalPayload: CreateTicketingBookingPayload = {
          customerName: pendingBookingPayload.customerName,
          mobileNumber: pendingBookingPayload.mobileNumber,
          gstNumber: pendingBookingPayload.gstNumber,
          totalAmount: Number(pendingBookingPayload.totalAmount),
          amountReceived: Number(amountReceived !== undefined && amountReceived !== null ? amountReceived : (amtRcv || 0)),
          returnAmount: Number(returnAmount !== undefined && returnAmount !== null ? returnAmount : 0),
          paymentMode: payMethod,
          attractions: pendingBookingPayload.attractions,
        };
        const createRes = await createBookingMutation.mutateAsync(finalPayload);
        const data = (createRes as any)?.data || createRes;
        setConfirmedTicketData(data);
      }

      // 2. If seating is required and seats were selected, call attraction-seat-booking API for all attractions
      if (hasSeatingRequired && selectedSeatObjs.length > 0) {
        const bookings: { attractionId: string; tripNo: number; attractionSeatId: string; seatNo: number[] }[] = [];

        seatingAttractions.forEach((att) => {
          const attId = att.attractionId!;
          const tripNo = tripMap[attId] || 1;
          const attAvail = seatAvailData?.find((d) => d.attractionId === attId);
          const sections: AttractionSeatItem[] = attAvail?.seatLayout?.[0]?.seats || attAvail?.seats || [];

          sections.forEach((sec) => {
            const secSeatObjs = selectedSeatObjs.filter(
              (s) =>
                s.attractionId === attId &&
                ((sec.attractionSeatId && s.attractionSeatId === sec.attractionSeatId) ||
                  (!s.attractionSeatId && s.sectionName === (sec.name || `Seat ${sec.seatOrder}`)))
            );

            const seatNumbers = secSeatObjs
              .map((s) => s.seatOrder)
              .sort((a, b) => a - b);

            if (seatNumbers.length > 0 && sec.attractionSeatId) {
              bookings.push({
                attractionId: attId,
                tripNo,
                attractionSeatId: sec.attractionSeatId,
                seatNo: seatNumbers,
              });
            }
          });
        });

        if (bookings.length > 0) {
          await createSeatBookingMutation.mutateAsync({ bookings });
        }
      }

      setShowPaymentModal(false);
      setShowTicketModal(true);
    } catch {
      // Handled by toast - remain on Process Payment popup if API call fails
    }
  }

  // Summary passengers text
  const summaryPassengersText = bookingSummary
    .flatMap((b) =>
      b.passengers.filter((p) => p.qty > 0).map((p) => {
        const seats = p.noOfSeats && p.noOfSeats > 1 ? ` (${p.qty * p.noOfSeats} seats)` : "";
        return `${p.label}: ${p.qty}${seats}`;
      })
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
              {selectedSeatObjs.length > 0 && (
                <span
                  style={{
                    background: areAllAttractionsAllocated ? "#DCFCE7" : "#FEF3C7",
                    color: areAllAttractionsAllocated ? "#166534" : "#92400E",
                    fontSize: "11px",
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: "4px",
                  }}
                >
                  {areAllAttractionsAllocated
                    ? `✓ ${selectedSeatObjs.length} Seats Assigned`
                    : `${selectedSeatObjs.length}/${totalRequiredSeatsCount} Seats Assigned`}
                </span>
              )}
              {hasSeatingRequired && !areAllAttractionsAllocated && isLoadingSeats && (
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
                  Loading seats...
                </span>
              )}
            </div>
            <p style={{ margin: "2px 0 0", fontWeight: 500, fontSize: "12px", color: "#6B7280" }}>
              {seatingAttractions.length > 1
                ? `Allocate seats for ${seatingAttractions.length} attractions`
                : "Choose seats for this booking"}
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
            {/* Show assigned seat numbers grouped per attraction */}
            {selectedSeatObjs.length > 0 ? (
              <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "10px", marginTop: "8px" }}>
                <span style={{ fontSize: "11.5px", fontWeight: 700, color: "#173F63" }}>
                  Selected:
                </span>
                {seatingAttractions.map((att) => {
                  const attSeats = selectedSeatObjs.filter((s) => s.attractionId === att.attractionId);
                  if (attSeats.length === 0) return null;
                  return (
                    <div key={att.attractionId} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      {seatingAttractions.length > 1 && (
                        <span style={{ fontSize: "11px", fontWeight: 700, color: "#475569" }}>
                          {att.attractionName}:
                        </span>
                      )}
                      {attSeats.map((sk) => (
                        <span
                          key={`${sk.attractionId}-${sk.attractionSeatId || sk.sectionName || ""}-${sk.seatOrder}`}
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
                          {sk.name}
                        </span>
                      ))}
                    </div>
                  );
                })}
                <span style={{ fontSize: "11px", fontWeight: 500, color: "#6B7280", marginLeft: "4px" }}>
                  — {slotDate}
                </span>
              </div>
            ) : hasSeatingRequired ? (
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "6px" }}>
                <span style={{ fontSize: "11px", fontWeight: 500, color: "#94A3B8" }}>
                  {isLoadingSeats ? "Loading seat data..." : "Click to allocate seats"}
                </span>
              </div>
            ) : null}
          </div>
          {isSeatAllocExpanded ? <ChevronUp size={22} color="#173F63" /> : <ChevronDown size={22} color="#173F63" />}
        </div>

        {isSeatAllocExpanded && (
          <div style={{ borderTop: "1px solid #E2E8F0" }} onClick={(e) => e.stopPropagation()}>
            <SeatAllocationPanel
              bookingSummary={bookingSummary}
              seatingAttractions={seatingAttractions}
              activeAttractionId={activeAttractionId}
              onActiveAttractionChange={setActiveAttractionId}
              tripMap={tripMap}
              onTripChange={handleTripChange}
              selectedSeatObjs={selectedSeatObjs}
              onSelectedSeatsChange={handleSelectedSeatsChange}
              onManualEdit={handleManualEdit}
              paxAssignment={paxAssignment}
              seatAvailData={seatAvailData}
              isLoadingSeats={isLoadingSeats}
              isFetchingSeats={isFetchingSeats}
              refetchSeats={refetchSeats}
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
          disabled={hasSeatingRequired && !areAllAttractionsAllocated}
          className="ci-continue-btn"
          title={hasSeatingRequired && !areAllAttractionsAllocated ? "Please complete seat allocation before continuing" : undefined}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            width: "197px",
            height: "48px",
            justifyContent: "center",
            background: hasSeatingRequired && !areAllAttractionsAllocated ? "#E2E8F0" : "#F4BC43",
            border: "none",
            borderRadius: "8px",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 700,
            fontSize: "14px",
            color: hasSeatingRequired && !areAllAttractionsAllocated ? "#94A3B8" : "#011B2F",
            cursor: hasSeatingRequired && !areAllAttractionsAllocated ? "not-allowed" : "pointer",
            transition: "background 0.18s, transform 0.15s",
            opacity: hasSeatingRequired && !areAllAttractionsAllocated ? 0.7 : 1,
          }}
        >
          Continue <ArrowRight size={18} color="#011B2F" />
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
        isSubmitting={createBookingMutation.isPending || createSeatBookingMutation.isPending}
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
        selectedSeats={selectedSeatObjs.map((s) => s.name)}
        seatDetails={
          bookingSummary
            .filter((b) => b.hasSeating && b.attractionId)
            .map((b) => {
              const attSeats = selectedSeatObjs.filter(
                (s) => s.attractionId === b.attractionId
              );
              const sectionMap = new Map<string, number[]>();
              attSeats.forEach((s) => {
                const secName = s.sectionName || "Coach";
                if (!sectionMap.has(secName)) sectionMap.set(secName, []);
                sectionMap.get(secName)!.push(s.seatOrder);
              });
              return {
                attractionId: b.attractionId!,
                attractionName: b.attractionName,
                sections: Array.from(sectionMap.entries()).map(
                  ([name, seats]) => ({
                    name,
                    seats: seats.slice().sort((a, b) => a - b),
                  })
                ),
              };
            })
            .filter((d) => d.sections.length > 0)
        }
        subtotal={subtotal}
        gstAmount={gstAmount}
        roundOff={roundOff}
        attractionRoundOffGstAdj={attractionRoundOffGstAdj}
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
