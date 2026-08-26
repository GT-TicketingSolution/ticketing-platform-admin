"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
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
  useTicketingSlots,
  useTicketingSeats,
  TicketingCustomer,
  TicketingSeat,
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
  const [amtRcv, setAmtRcv] = useState(grandTotal.toFixed(2));
  const [hasAddedQuickNote, setHasAddedQuickNote] = useState(false);
  const isOnline = payMethod === "upi" || payMethod === "card";
  const change = isOnline ? 0 : Math.max(0, parseFloat(amtRcv || "0") - grandTotal);

  useEffect(() => {
    if (isOpen) {
      setAmtRcv(grandTotal.toFixed(2));
      setHasAddedQuickNote(false);
    }
  }, [isOpen, grandTotal]);

  useEffect(() => {
    if (payMethod === "upi" || payMethod === "card") {
      setAmtRcv(grandTotal.toFixed(2));
    }
  }, [payMethod, grandTotal]);

  const handleQuickNoteClick = (noteVal: number) => {
    let nextAmt: number;
    if (!hasAddedQuickNote && parseFloat(amtRcv || "0") === grandTotal) {
      // First quick note tap sets initial note amount
      nextAmt = noteVal;
    } else {
      // Cumulative addition: e.g. 50 + 100 = 150
      const current = parseFloat(amtRcv || "0");
      nextAmt = current + noteVal;
    }
    setHasAddedQuickNote(true);
    setAmtRcv(nextAmt.toFixed(2));
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
              <p style={{ margin: "0 0 6px 0", fontWeight: 700, fontSize: "12px", color: "rgba(81,82,82,0.85)" }}>
                QUICK CASH / NOTES
              </p>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {[
                  { label: "₹50", val: 50 },
                  { label: "₹100", val: 100 },
                  { label: "₹200", val: 200 },
                  { label: "₹500", val: 500 },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => handleQuickNoteClick(item.val)}
                    style={{
                      flex: 1,
                      minWidth: "55px",
                      height: "32px",
                      background: "#F1F5F9",
                      border: "1px solid rgba(179,175,175,0.6)",
                      borderRadius: "8px",
                      fontFamily: "'Plus Jakarta Sans',sans-serif",
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#173F63",
                      cursor: "pointer",
                      transition: "background 0.15s",
                    }}
                  >
                    {item.label}
                  </button>
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
              onConfirm(mode, parseFloat(amtRcv || "0"));
            }}
            disabled={isSubmitting}
            className="pay-confirm-btn"
            style={{
              width: "100%",
              height: "46px",
              background: isSubmitting ? "#E2E8F0" : "#F4BC43",
              border: "none",
              borderRadius: "14px",
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontWeight: 800,
              fontSize: "16px",
              color: isSubmitting ? "#94A3B8" : "#173F63",
              cursor: isSubmitting ? "not-allowed" : "pointer",
              transition: "background 0.15s, transform 0.1s",
              marginTop: "4px",
              opacity: isSubmitting ? 0.7 : 1,
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

// ── Ticket Generated Modal (Figma Spec) ─────────────────────────────────────────
function TicketGeneratedModal({
  isOpen,
  onClose,
  attractionName,
  grandTotal,
  totalPax,
}: {
  isOpen: boolean;
  onClose: () => void;
  attractionName: string;
  grandTotal: number;
  totalPax: number;
}) {
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        if (typeof window !== "undefined") {
          window.print();
        }
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const formattedDate = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const yearSuffix = new Date().getFullYear().toString().slice(2);
  const monthStr = String(new Date().getMonth() + 1).padStart(2, "0");
  const dayStr = String(new Date().getDate()).padStart(2, "0");
  const ticketNo = `NF- ${yearSuffix}${monthStr}${dayStr}-0158`;

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "26px",
          width: "633px",
          maxWidth: "95vw",
          boxShadow: "0 24px 80px rgba(0,0,0,0.28)",
          fontFamily: "'Plus Jakarta Sans',sans-serif",
          padding: "36px 38px 40px",
          boxSizing: "border-box",
          position: "relative",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Circle Tick Icon */}
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            border: "3.5px solid #1FA35A",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 10px auto",
          }}
        >
          <Check size={22} color="#1FA35A" strokeWidth={4} />
        </div>

        {/* Title & Subtitle */}
        <h2
          style={{
            margin: 0,
            fontWeight: 700,
            fontSize: "25px",
            lineHeight: "32px",
            color: "#011B2F",
            textAlign: "center",
          }}
        >
          Ticket Generated!
        </h2>
        <p
          style={{
            margin: "6px 0 0 0",
            fontWeight: 700,
            fontSize: "12px",
            lineHeight: "15px",
            color: "#A0A0A0",
            textAlign: "center",
          }}
        >
          Your ticket is ready. You can print it or close this window
        </p>

        {/* Ticket Card (Rectangle 73) */}
        <div
          style={{
            boxSizing: "border-box",
            width: "100%",
            border: "1px solid #515252",
            boxShadow: "-4px 4px 6.7px 1px rgba(0, 0, 0, 0.25)",
            borderRadius: "26px",
            padding: "24px 30px",
            margin: "24px 0 28px 0",
            background: "#FFFFFF",
          }}
        >
          <h3
            style={{
              margin: 0,
              fontWeight: 700,
              fontSize: "20px",
              lineHeight: "26px",
              color: "#173F63",
              wordBreak: "break-word",
            }}
          >
            {attractionName || "Nahargarh Fort"}
          </h3>
          <p
            style={{
              margin: "2px 0 0 0",
              fontWeight: 700,
              fontSize: "12px",
              lineHeight: "15px",
              color: "#6B7280",
            }}
          >
            Jaipur, Rajasthan
          </p>

          {/* Dashed Line */}
          <div style={{ width: "100%", borderTop: "1px dashed #B3AFAF", margin: "16px 0" }} />

          {/* 3 Columns: Visitors | Date | Amount Paid */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: "12px", lineHeight: "15px", color: "#6B7280" }}>
                Visitors
              </p>
              <p style={{ margin: "4px 0 0 0", fontWeight: 700, fontSize: "14px", lineHeight: "18px", color: "#173F63" }}>
                {totalPax} {totalPax === 1 ? "Person" : "Persons"}
              </p>
            </div>

            <div style={{ textAlign: "center" }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: "12px", lineHeight: "15px", color: "#6B7280" }}>
                Date
              </p>
              <p style={{ margin: "4px 0 0 0", fontWeight: 700, fontSize: "14px", lineHeight: "18px", color: "#173F63" }}>
                {formattedDate}
              </p>
            </div>

            <div style={{ textAlign: "right" }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: "12px", lineHeight: "15px", color: "#6B7280" }}>
                Amount Paid
              </p>
              <p style={{ margin: "4px 0 0 0", fontWeight: 700, fontSize: "14px", lineHeight: "18px", color: "#173F63" }}>
                ₹{grandTotal.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Ticket Number */}
          <div style={{ textAlign: "center", marginTop: "20px" }}>
            <p
              style={{
                margin: 0,
                fontWeight: 500,
                fontSize: "14px",
                lineHeight: "18px",
                color: "#6B7280",
                letterSpacing: "0.05em",
              }}
            >
              TICKET NO.
            </p>
            <p
              style={{
                margin: "4px 0 0 0",
                fontWeight: 700,
                fontSize: "18px",
                lineHeight: "23px",
                color: "#173F63",
                letterSpacing: "0.5px",
              }}
            >
              {ticketNo}
            </p>
          </div>

          {/* Dashed Line */}
          <div style={{ width: "100%", borderTop: "1px dashed #B3AFAF", margin: "16px 0 12px 0" }} />

          <p
            style={{
              margin: 0,
              fontWeight: 600,
              fontSize: "13px",
              lineHeight: "16px",
              color: "#6B7280",
              textAlign: "center",
            }}
          >
            Thank you for visiting!
          </p>
        </div>

        {/* Action Buttons (Rectangle 66 & 67) */}
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <button
            type="button"
            onClick={handlePrint}
            style={{
              flex: 1,
              height: "48px",
              background: "#FFFFFF",
              border: "0.5px solid #002A45",
              borderRadius: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 700,
              fontSize: "14px",
              lineHeight: "18px",
              color: "#011B2F",
              cursor: "pointer",
              transition: "background 0.15s",
            }}
          >
            <Printer size={18} color="#000000" /> Print Ticket
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              height: "48px",
              background: "#F4BC43",
              borderRadius: "8px",
              border: "none",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 700,
              fontSize: "14px",
              lineHeight: "18px",
              color: "#011B2F",
              cursor: "pointer",
              transition: "background 0.15s, transform 0.1s",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Section Seat Allocation Panel
interface SeatAllocationPanelProps {
  bookingSummary: BookingSummaryItem[];
  selectedSeats: string[];
  paxAssignment: Record<string, string>;
  onSelectedSeatsChange: (seats: string[], paxAssignment: Record<string, string>) => void;
  currentTrip: number;
  onTripChange: (trip: number) => void;
  totalTrips: number;
  timeSlot: string;
  onTimeSlotChange: (slot: string) => void;
  slotDate: string;
}

function SeatAllocationPanel({
  bookingSummary,
  selectedSeats,
  paxAssignment,
  onSelectedSeatsChange,
  currentTrip,
  onTripChange,
  totalTrips,
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

  const targetAttractionId = bookingSummary[0]?.attractionId || "";
  const todayDateStr = new Date().toISOString().split("T")[0];

  // Fetch live slots
  const { data: slotsData = [], isLoading: isLoadingSlots } = useTicketingSlots(
    targetAttractionId,
    todayDateStr,
    !!targetAttractionId
  );
  const activeSlot = slotsData.find((s) => s.slotTime === timeSlot) || slotsData[0];
  const activeSlotId = activeSlot?.id || "";

  // Sync active time slot
  useEffect(() => {
    if (slotsData.length > 0) {
      const slotIndex = Math.min(Math.max(0, currentTrip - 1), slotsData.length - 1);
      const slotForTrip = slotsData[slotIndex] || slotsData[0];
      if (slotForTrip?.slotTime && slotForTrip.slotTime !== timeSlot) {
        onTimeSlotChange(slotForTrip.slotTime);
      }
    }
  }, [slotsData, currentTrip]);

  // Fetch live seat availability & layout from real API
  const {
    data: seatsApiData,
    isLoading: isLoadingSeats,
    isFetching: isFetchingSeats,
    isError: isSeatsError,
    error: seatsError,
    refetch: refetchSeats,
  } = useTicketingSeats(
    targetAttractionId,
    activeSlotId,
    todayDateStr,
    !!targetAttractionId && !!activeSlotId
  );

  // Active section index
  const [ai, setAi] = useState(0);

  // Normalize sections from API response
  const sections = useMemo(() => {
    if (seatsApiData?.sections && seatsApiData.sections.length > 0) {
      return seatsApiData.sections;
    }
    if (seatsApiData?.seats && seatsApiData.seats.length > 0) {
      return [
        {
          name: "Section A",
          bogie: null,
          totalSeats: seatsApiData.totalSeats || seatsApiData.seats.length,
          occupiedSeats: seatsApiData.occupiedSeats || [],
          availableSeats: seatsApiData.availableSeats ?? seatsApiData.seats.filter((s) => s.status !== "occupied").length,
          seats: seatsApiData.seats,
        },
      ];
    }
    return [];
  }, [seatsApiData]);

  // Keep section index in bounds
  const safeAi = Math.min(ai, Math.max(0, sections.length - 1));
  const activeSection = sections[safeAi] || sections[0] || null;

  // Active layout from API
  const layout = seatsApiData?.layout || null;
  const rowsCount = layout?.rows || 10;
  const colsCount = layout?.cols || 10;
  const hasAisle = layout?.hasAisle ?? false;
  const aisleAfterCol = layout?.aisleAfterCol ?? 2;

  const isLastTrip = currentTrip >= totalTrips;

  // Section seats
  const currentSectionSeats = useMemo(() => {
    if (activeSection?.seats && activeSection.seats.length > 0) {
      return activeSection.seats;
    }
    return seatsApiData?.seats || [];
  }, [activeSection, seatsApiData]);

  // List of all non-occupied seats sorted sequentially by row & column (e.g. A1, A2, A3...)
  const availableSeatsList = useMemo(() => {
    return [...currentSectionSeats]
      .filter((s) => s.status !== "occupied")
      .sort((a, b) => {
        const rowA = a.row ?? 0;
        const rowB = b.row ?? 0;
        if (rowA !== rowB) return rowA - rowB;
        const colA = a.column ?? 0;
        const colB = b.column ?? 0;
        if (colA !== colB) return colA - colB;
        return (a.seatNumber || "").localeCompare(b.seatNumber || "", undefined, { numeric: true });
      });
  }, [currentSectionSeats]);

  // ── Auto Sequential Booking ──────────────────────────────────────────
  // Whenever visitor count changes or seat data is loaded, automatically assign
  // the next available non-occupied seats sequentially in order.
  useEffect(() => {
    if (totalPax <= 0) {
      if (selectedSeats.length > 0) {
        onSelectedSeatsChange([], {});
      }
      return;
    }

    if (availableSeatsList.length === 0) return;

    // Filter valid currently selected seats that exist and are available in this section
    const validCurrent = selectedSeats.filter((sk) =>
      availableSeatsList.some((s) => s.seatNumber === sk)
    );

    // If already exactly matching totalPax and all valid, just synchronize assignments
    if (validCurrent.length === totalPax) {
      const newAsgn: Record<string, string> = {};
      validCurrent.forEach((sk, idx) => {
        if (paxList[idx]) {
          newAsgn[sk] = `${paxList[idx].label} ${paxList[idx].idx}`;
        }
      });
      if (
        validCurrent.length !== selectedSeats.length ||
        validCurrent.some((s, i) => s !== selectedSeats[i])
      ) {
        onSelectedSeatsChange(validCurrent, newAsgn);
      }
      return;
    }

    // Sequentially fill missing seats with the first available non-occupied seats
    const nextSeats = [...validCurrent];
    for (const s of availableSeatsList) {
      if (nextSeats.length >= totalPax) break;
      if (!nextSeats.includes(s.seatNumber)) {
        nextSeats.push(s.seatNumber);
      }
    }

    const newAsgn: Record<string, string> = {};
    nextSeats.forEach((sk, idx) => {
      if (paxList[idx]) {
        newAsgn[sk] = `${paxList[idx].label} ${paxList[idx].idx}`;
      }
    });

    onSelectedSeatsChange(nextSeats, newAsgn);
  }, [availableSeatsList, totalPax, activeSection?.name]);

  // Map seats into row buckets
  const rowSeatsMap = useMemo(() => {
    const map: Record<number, TicketingSeat[]> = {};
    for (let r = 1; r <= rowsCount; r++) {
      map[r] = [];
    }

    if (currentSectionSeats.length > 0) {
      currentSectionSeats.forEach((seat, idx) => {
        const r = seat.row ?? Math.floor(idx / colsCount) + 1;
        if (!map[r]) map[r] = [];
        map[r].push(seat);
      });
      // Sort each row by column
      Object.keys(map).forEach((rk) => {
        map[Number(rk)].sort((a, b) => (a.column ?? 0) - (b.column ?? 0));
      });
    }

    return map;
  }, [currentSectionSeats, rowsCount, colsCount]);

  // Handle clicking a seat (custom selection / reallocation)
  const handleSeatToggle = (seat: TicketingSeat) => {
    const seatKey = seat.seatNumber;
    const isOccupied = seat.status === "occupied";
    if (isOccupied) return;

    if (selectedSeats.includes(seatKey)) {
      // Deselect clicked seat
      const nextSeats = selectedSeats.filter((s) => s !== seatKey);
      const nextAsgn: Record<string, string> = {};
      nextSeats.forEach((sk, i) => {
        if (paxList[i]) {
          nextAsgn[sk] = `${paxList[i].label} ${paxList[i].idx}`;
        }
      });
      onSelectedSeatsChange(nextSeats, nextAsgn);
    } else {
      // Custom selection: if full, replace the last seat or append if slots are open
      let nextSeats = [...selectedSeats];
      if (nextSeats.length < totalPax) {
        nextSeats.push(seatKey);
      } else if (totalPax > 0) {
        // Replace last seat with the requested specific seat
        nextSeats[nextSeats.length - 1] = seatKey;
      }
      const nextAsgn: Record<string, string> = {};
      nextSeats.forEach((sk, i) => {
        if (paxList[i]) {
          nextAsgn[sk] = `${paxList[i].label} ${paxList[i].idx}`;
        }
      });
      onSelectedSeatsChange(nextSeats, nextAsgn);
    }
  };

  const newTrip = () => {
    if (isLastTrip) return;
    const nextTrip = Math.min(totalTrips, currentTrip + 1);
    onTripChange(nextTrip);
    onSelectedSeatsChange([], {});
    setAi(0);
  };

  // Render individual seat button
  const renderSeatButton = (seat: TicketingSeat) => {
    const seatKey = seat.seatNumber;
    const isOccupied = seat.status === "occupied";
    const isSelected = selectedSeats.includes(seatKey);

    return (
      <button
        key={seat.id || seat.seatNumber}
        type="button"
        disabled={isOccupied}
        onClick={(e) => {
          e.stopPropagation();
          handleSeatToggle(seat);
        }}
        title={`Seat ${seatKey}${isOccupied ? " (Occupied)" : isSelected ? " (Selected)" : " (Available)"}`}
        style={{
          width: "34px",
          minWidth: "34px",
          height: "28px",
          padding: "0 2px",
          borderRadius: "6px",
          border: isSelected
            ? "1.5px solid #D99B1E"
            : isOccupied
              ? "1px solid #CBD5E1"
              : "1.5px solid rgba(179, 175, 175, 0.72)",
          background: isSelected ? "#F4BC43" : isOccupied ? "#E2E0E0" : "#FFFFFF",
          cursor: isOccupied ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "10.5px",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontWeight: 700,
          color: isOccupied ? "#94A3B8" : "#011B2F",
          transition: "all 0.12s ease",
          userSelect: "none",
          boxSizing: "border-box",
          flexShrink: 0,
        }}
      >
        {seat.seatNumber}
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
        {/* ── Left Container: Section Progress ── */}
        <div
          style={{
            width: "210px",
            minWidth: "210px",
            flexShrink: 0,
            background: "#FFFFFF",
            border: "1.5px solid rgba(179, 175, 175, 0.51)",
            borderRadius: "13px",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            boxSizing: "border-box",
          }}
        >
          <h3 style={{ margin: "0 0 4px 0", fontWeight: 700, fontSize: "14px", lineHeight: "18px", color: "#011B2F" }}>
            Section Progress
          </h3>

          {sections.length === 0 ? (
            <p style={{ margin: 0, fontSize: "11px", color: "#94A3B8" }}>No sections available</p>
          ) : (
            sections.map((sec, idx) => {
              const isCur = idx === safeAi;
              const occ = (sec.occupiedSeats?.length || 0) + (isCur ? selectedSeats.length : 0);
              const avail = Math.max(0, (sec.totalSeats || 0) - occ);

              return (
                <div
                  key={sec.name + idx}
                  onClick={() => setAi(idx)}
                  style={{
                    width: "100%",
                    minHeight: "78px",
                    background: "#FFFFFF",
                    border: isCur ? "1.5px solid #173F63" : "1.5px solid rgba(179, 175, 175, 0.51)",
                    borderRadius: "13px",
                    padding: "12px 14px",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    boxSizing: "border-box",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span style={{ fontWeight: 700, fontSize: "13.5px", lineHeight: "18px", color: "#011B2F" }}>
                      {sec.name}
                    </span>
                    <span
                      style={{
                        background: isCur ? "rgba(244, 188, 67, 0.61)" : "rgba(34, 197, 94, 0.15)",
                        color: isCur ? "#173F63" : "#15803D",
                        fontSize: "8.5px",
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: "5px",
                      }}
                    >
                      {isCur ? "Active" : "Select"}
                    </span>
                  </div>

                  <p style={{ margin: "2px 0", fontSize: "10px", lineHeight: "13px", fontWeight: 600, color: "#6B7280" }}>
                    Seats: {sec.totalSeats} · Available: {sec.availableSeats ?? avail}
                  </p>
                  <p style={{ margin: "3px 0 0 0", fontSize: "9.5px", lineHeight: "13px", fontWeight: 600, color: isCur ? "#173F63" : "#94A3B8" }}>
                    {isCur ? "Currently allocating seats" : "Click to view section"}
                  </p>
                </div>
              );
            })
          )}
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
                <div style={{ fontSize: "9px", fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                  Date
                </div>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#011B2F" }}>{slotDate}</div>
              </div>
            </div>

            {/* Timing Slot */}
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
                <Clock size={15} color="#173F63" />
              </div>
              <div>
                <div style={{ fontSize: "9px", fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                  Timing Slot
                </div>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#011B2F" }}>{timeSlot}</div>
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
                <div style={{ fontSize: "9px", fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                  Available Seats
                </div>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#15803D" }}>
                  {activeSection ? activeSection.availableSeats : 0} / {activeSection ? activeSection.totalSeats : 0} Seats
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
                  background: isLastTrip ? "rgba(239, 68, 68, 0.12)" : "rgba(244, 188, 67, 0.18)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <RotateCcw size={15} color={isLastTrip ? "#DC2626" : "#B45309"} />
              </div>
              <div>
                <div style={{ fontSize: "9px", fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                  Trip Status
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#011B2F" }}>
                    Trip {currentTrip} of {totalTrips}
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
            <h4 style={{ margin: 0, fontWeight: 700, fontSize: "14px", lineHeight: "18px", color: "#011B2F" }}>
              Select Seats – {activeSection?.name || "Section"}
            </h4>

            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <button
                type="button"
                disabled={isLastTrip}
                onClick={(e) => {
                  e.stopPropagation();
                  newTrip();
                }}
                style={{
                  width: "158px",
                  height: "35px",
                  background: isLastTrip ? "#F3F4F6" : "#FFFFFF",
                  border: isLastTrip ? "1.5px solid #D1D5DB" : "1.5px solid #2576AB",
                  borderRadius: "6px",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 600,
                  fontSize: "12px",
                  color: isLastTrip ? "#9CA3AF" : "#173F63",
                  cursor: isLastTrip ? "not-allowed" : "pointer",
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
            <p style={{ margin: 0, fontSize: "11px", fontWeight: 600, lineHeight: "14px", color: "#2D6B92" }}>
              Seats are automatically booked in sequence. You can click any available seat to change / customize selection.
            </p>
          </div>

          {/* ── SEAT MAP AREA: SIDE-BY-SIDE 2-COLUMN GRID ── */}
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
                {((seatsError as any)?.error?.message || (seatsError as any)?.message) || "Unable to fetch seat layout from the server. Please check connection or retry."}
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
          ) : (isLoadingSeats || (isFetchingSeats && !seatsApiData)) ? (
            <div style={{ padding: "48px 20px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
              <RotateCcw size={26} color="#173F63" style={{ animation: "spin 1s linear infinite" }} />
              <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "#64748B" }}>
                Loading seat layout from server...
              </p>
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
                  gap: "10px",
                  overflowX: "auto",
                  paddingBottom: "8px",
                  minWidth: 0,
                }}
              >
                {/* Header: Left Side / Right Side (if aisle) */}
                {hasAisle && (
                  <div style={{ display: "flex", gap: "4px", alignItems: "center", paddingLeft: "22px" }}>
                    <div style={{ textAlign: "center", fontSize: "9.5px", fontWeight: 700, color: "#173F63", width: `${aisleAfterCol * 38}px` }}>
                      Left Side
                    </div>
                    <div style={{ width: "24px" }} />
                    <div style={{ textAlign: "center", fontSize: "9.5px", fontWeight: 700, color: "#173F63", width: `${(colsCount - aisleAfterCol) * 38}px` }}>
                      Right Side
                    </div>
                  </div>
                )}

                {/* Grid Rows */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {Array.from({ length: rowsCount }, (_, i) => i + 1).map((r) => {
                    const seatsInRow = rowSeatsMap[r] || [];
                    const leftSeats = hasAisle && aisleAfterCol
                      ? seatsInRow.filter((s) => (s.column ?? 0) <= aisleAfterCol)
                      : seatsInRow;
                    const rightSeats = hasAisle && aisleAfterCol
                      ? seatsInRow.filter((s) => (s.column ?? 0) > aisleAfterCol)
                      : [];

                    return (
                      <div key={r} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        {/* Row letter */}
                        <span
                          style={{
                            width: "18px",
                            fontSize: "11px",
                            fontWeight: 800,
                            color: "#64748B",
                            textAlign: "center",
                            flexShrink: 0,
                          }}
                        >
                          {String.fromCharCode(64 + r)}
                        </span>

                        {/* Left seats */}
                        <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                          {leftSeats.map(renderSeatButton)}
                        </div>

                        {/* Center AISLE */}
                        {hasAisle && (
                          <div
                            style={{
                              width: "24px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "7.5px",
                              fontWeight: 800,
                              color: "#94A3B8",
                              letterSpacing: "0.5px",
                              flexShrink: 0,
                            }}
                          >
                            {r === 1 ? "AISLE" : ""}
                          </div>
                        )}

                        {/* Right seats */}
                        {hasAisle && rightSeats.length > 0 && (
                          <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                            {rightSeats.map(renderSeatButton)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Legend */}
                <div style={{ display: "flex", gap: "18px", alignItems: "center", marginTop: "8px", paddingLeft: "18px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{ width: "18px", height: "17px", border: "1px solid #CBD5E1", borderRadius: "3px", background: "#FFFFFF" }} />
                    <span style={{ fontSize: "9px", fontWeight: 600, color: "#6B7280" }}>Available</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{ width: "18px", height: "17px", background: "#F4BC43", border: "1px solid #D99B1E", borderRadius: "3px" }} />
                    <span style={{ fontSize: "9px", fontWeight: 600, color: "#6B7280" }}>Selected</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{ width: "18px", height: "17px", background: "#E2E0E0", border: "1px solid #CBD5E1", borderRadius: "3px" }} />
                    <span style={{ fontSize: "9px", fontWeight: 600, color: "#6B7280" }}>Occupied</span>
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
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontWeight: 700, fontSize: "11px", lineHeight: "14px", color: "#011B2F" }}>
                      Selected Seats
                    </span>
                    <span style={{ fontWeight: 700, fontSize: "11px", lineHeight: "14px", color: selectedSeats.length === totalPax ? "#15803D" : "#D99B1E" }}>
                      {selectedSeats.length}/{totalPax} Selected
                    </span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {paxList.length === 0 ? (
                      <p style={{ margin: 0, fontSize: "11px", color: "#94A3B8" }}>No visitors selected</p>
                    ) : (
                      paxList.map((p, i) => {
                        const sk = selectedSeats[i];
                        return (
                          <React.Fragment key={i}>
                            {i > 0 && <div style={{ width: "100%", height: "0.5px", background: "rgba(179, 175, 175, 0.31)" }} />}
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                              <span style={{ fontSize: "11px", fontWeight: 600, lineHeight: "14px", color: "#011B2F" }}>
                                {p.label} {p.idx}
                              </span>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
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
                                  <span style={{ fontSize: "9px", color: "#A0A0A0" }}>—</span>
                                )}
                                {sk && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSeatToggle({ seatNumber: sk, status: "available", id: sk });
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
                    { l: "Seats Assigned", v: `${selectedSeats.length}/${totalPax}`, c: selectedSeats.length === totalPax ? "#15803D" : "#D99B1E" },
                    { l: "Active Section", v: activeSection?.name || "—", c: "#011B2F" },
                    { l: "Seat Numbers", v: selectedSeats.join(", ") || "—", c: "#011B2F" },
                  ].map((row, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && <div style={{ width: "100%", height: "0.5px", background: "rgba(179, 175, 175, 0.31)" }} />}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <span style={{ fontSize: "9px", fontWeight: 600, lineHeight: "12px", color: "#6B7280" }}>{row.l}</span>
                        <span style={{ fontSize: "10.5px", fontWeight: 700, lineHeight: "13px", color: row.c, textAlign: "right" }}>
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

  // Seat allocation state (lifted so accordion header can show seat names)
  const TOTAL_TRIPS_PER_DAY = 5;
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [paxAssignment, setPaxAssignment] = useState<Record<string, string>>({});
  const [currentTrip, setCurrentTrip] = useState(1);
  const [timeSlot, setTimeSlot] = useState("10:00 AM – 10:20 AM");

  // Today's formatted date for the slot
  const slotDate = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  function handleSelectedSeatsChange(seats: string[], assignment: Record<string, string>) {
    setSelectedSeats(seats);
    setPaxAssignment(assignment);
  }

  const grandTotal = bookingSummary.reduce((s, b) => s + b.totalAmount, 0);

  const uniquePaxCount = useMemo(() => {
    if (!bookingSummary.length) return 0;
    return bookingSummary.reduce(
      (sum, b) => sum + b.passengers.reduce((s, p) => s + (p.qty || 0), 0),
      0
    );
  }, [bookingSummary]);

  const allAttractionsText = useMemo(() => {
    const names = Array.from(new Set(bookingSummary.map((b) => b.attractionName).filter(Boolean)));
    return names.join(", ") || "Attractions";
  }, [bookingSummary]);

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
        gstn: nc.gstn,
      });
      const newC: CustomerRecord = {
        id: (res as any)?.data?.id || (res as any)?.id || `C${Date.now()}`,
        name: nc.name,
        mobile: nc.mobile,
        gstn: nc.gstn || null,
      };
      setSelectedCustomer(newC);
      setSearchQuery(newC.name);
      setIsAddNewOpen(false);
    } catch {
      // Toast notification handled by mutation onError
    }
  }

  const topPaxList = useMemo(() => {
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

  const firstAttractionId = bookingSummary[0]?.attractionId || "";
  const todayDateStr = new Date().toISOString().split("T")[0];

  const { data: topLevelSlots = [] } = useTicketingSlots(
    firstAttractionId,
    todayDateStr,
    !!firstAttractionId
  );

  const activeSlotObj = topLevelSlots.find((s) => s.slotTime === timeSlot) || topLevelSlots[0];
  const activeSlotId = activeSlotObj?.id || "";

  const { data: topLevelSeatsData } = useTicketingSeats(
    firstAttractionId,
    activeSlotId,
    todayDateStr,
    !!firstAttractionId && !!activeSlotId
  );

  // Auto-allocate seats on initial load so selectedSeats is populated immediately
  useEffect(() => {
    if (uniquePaxCount <= 0) {
      if (selectedSeats.length > 0) {
        setSelectedSeats([]);
        setPaxAssignment({});
      }
      return;
    }

    const allSeats = topLevelSeatsData?.sections?.[0]?.seats || topLevelSeatsData?.seats || [];
    if (allSeats.length === 0) return;

    const available = allSeats
      .filter((s) => s.status !== "occupied")
      .sort((a, b) => {
        const rowA = a.row ?? 0;
        const rowB = b.row ?? 0;
        if (rowA !== rowB) return rowA - rowB;
        const colA = a.column ?? 0;
        const colB = b.column ?? 0;
        if (colA !== colB) return colA - colB;
        return (a.seatNumber || "").localeCompare(b.seatNumber || "", undefined, { numeric: true });
      });

    const validCurrent = selectedSeats.filter((sk) => available.some((s) => s.seatNumber === sk));
    if (validCurrent.length === uniquePaxCount && validCurrent.length === selectedSeats.length) {
      return;
    }

    const nextSeats = [...validCurrent];
    for (const s of available) {
      if (nextSeats.length >= uniquePaxCount) break;
      if (!nextSeats.includes(s.seatNumber)) {
        nextSeats.push(s.seatNumber);
      }
    }

    const newAsgn: Record<string, string> = {};
    nextSeats.forEach((sk, idx) => {
      if (topPaxList[idx]) {
        newAsgn[sk] = `${topPaxList[idx].label} ${topPaxList[idx].idx}`;
      }
    });

    setSelectedSeats(nextSeats);
    setPaxAssignment(newAsgn);
  }, [topLevelSeatsData, uniquePaxCount]);

  async function handleContinue() {
    if (bookingSummary.length === 0) return;

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

    const subtotal = bookingSummary.reduce((s, b) => s + (b.subtotal ?? b.totalAmount), 0);
    const gstAmount = bookingSummary.reduce((s, b) => s + (b.gstAmount ?? 0), 0);
    const gstAdjustment = bookingSummary.reduce((s, b) => s + (b.gstAdjustment ?? 0), 0);
    const roundOff = bookingSummary.reduce((s, b) => s + (b.roundOff ?? 0), 0);

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

    const activeSlotObj = topLevelSlots.find((s) => s.slotTime === timeSlot) || topLevelSlots[0];
    const resolvedSlotId = activeSlotObj?.id || null;

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
        slotId: resolvedSlotId,
        visitDate: passDetails.date || todayDateStr,
        bogie: "Bogie A",
        seatNumber: seatNo,
      })),
      subtotal,
      gstAmount,
      gstAdjustment,
      roundOff,
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
        await paymentMutation.mutateAsync({
          bookingId: createdBookingId,
          payload: {
            amountPaid: amtRcv,
            payment: { mode: payMethod },
          },
        });
        await confirmBookingMutation.mutateAsync(createdBookingId);
      } catch {
        // Handled by toast
      }
    }
    setShowPaymentModal(false);
    setShowTicketModal(true);
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
        style={{
          background: "#FFFFFF",
          border: "1px solid #A0A0A0",
          boxShadow: "-2px 4px 5.6px rgba(0, 0, 0, 0.08)",
          borderRadius: "13px",
          boxSizing: "border-box",
          overflow: "hidden",
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
            </div>
            <p style={{ margin: "2px 0 0", fontWeight: 500, fontSize: "12px", color: "#6B7280" }}>
              Choose seats for this booking
            </p>
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
                  — Trip {currentTrip} of {TOTAL_TRIPS_PER_DAY} · {timeSlot} · {slotDate}
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
          <div style={{ borderTop: "1px solid #E2E8F0" }} onClick={e => e.stopPropagation()}>
            <SeatAllocationPanel
              bookingSummary={bookingSummary}
              selectedSeats={selectedSeats}
              paxAssignment={paxAssignment}
              onSelectedSeatsChange={handleSelectedSeatsChange}
              currentTrip={currentTrip}
              onTripChange={setCurrentTrip}
              totalTrips={TOTAL_TRIPS_PER_DAY}
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
          disabled={createBookingMutation.isPending}
          className="ci-continue-btn"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            width: "197px",
            height: "48px",
            justifyContent: "center",
            background: createBookingMutation.isPending ? "#E2E8F0" : "#F4BC43",
            border: "none",
            borderRadius: "8px",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 700,
            fontSize: "14px",
            color: createBookingMutation.isPending ? "#94A3B8" : "#011B2F",
            cursor: createBookingMutation.isPending ? "not-allowed" : "pointer",
            transition: "background 0.18s, transform 0.15s",
            opacity: createBookingMutation.isPending ? 0.7 : 1,
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
      <TicketGeneratedModal
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
