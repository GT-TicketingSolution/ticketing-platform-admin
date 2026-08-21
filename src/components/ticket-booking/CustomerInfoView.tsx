"use client";

import React, { useState, useEffect, useRef } from "react";
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

export interface BookingSummaryItem {
  attractionName: string;
  passengers: { label: string; qty: number }[];
  totalAmount: number;
}

interface CustomerInfoViewProps {
  onBack: () => void;
  onContinue: (customer: { name: string; mobile: string; gstn?: string }) => void;
  bookingSummary: BookingSummaryItem[];
}

export interface CustomerRecord {
  id: string;
  name: string;
  mobile: string;
  gstn: string;
}

const MOCK_CUSTOMERS: CustomerRecord[] = [
  { id: "C001", name: "Amit Sharma", mobile: "9876543210", gstn: "08ABCDE1234F1Z5" },
  { id: "C002", name: "Priya Singh", mobile: "9876543211", gstn: "27AAPFU0939F1ZV" },
  { id: "C003", name: "Rahul Gupta", mobile: "9123456780", gstn: "07AAACG0563G1ZT" },
  { id: "C004", name: "Sunita Devi", mobile: "9988776655", gstn: "29AABCU9603R1ZM" },
];

const SEAT_STORAGE_KEY = "seat_layouts_data";

type SeatStatus = "available" | "selected" | "occupied";

interface SectionState {
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
  const [amtRcv, setAmtRcv] = useState(grandTotal.toFixed(2));
  const change = Math.max(0, parseFloat(amtRcv || "0") - grandTotal);

  useEffect(() => {
    if (isOpen) setAmtRcv(grandTotal.toFixed(2));
  }, [isOpen, grandTotal]);

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
            onClick={onConfirm}
            className="pay-confirm-btn"
            style={{
              width: "100%",
              height: "46px",
              background: "#F4BC43",
              border: "none",
              borderRadius: "14px",
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontWeight: 800,
              fontSize: "16px",
              color: "#173F63",
              cursor: "pointer",
              transition: "background 0.15s, transform 0.1s",
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
              fontSize: "22px",
              lineHeight: "28px",
              color: "#173F63",
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
                {totalPax} Person
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

// ── Section Seat Allocation Panel ──────────────────────────────────────────────
interface SeatAllocationPanelProps {
  bookingSummary: BookingSummaryItem[];
  selectedSeats: string[];
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
  onSelectedSeatsChange,
  currentTrip,
  onTripChange,
  totalTrips,
  timeSlot,
  slotDate,
}: SeatAllocationPanelProps) {
  const totalPax = bookingSummary.reduce((s, b) => s + b.passengers.reduce((x, p) => x + p.qty, 0), 0);
  const paxList: { label: string; idx: number }[] = [];
  bookingSummary.forEach(b => {
    const cnt: Record<string, number> = {};
    b.passengers.forEach(p => {
      if (p.qty > 0) {
        for (let i = 1; i <= p.qty; i++) {
          cnt[p.label] = (cnt[p.label] || 0) + 1;
          paxList.push({ label: p.label, idx: cnt[p.label] });
        }
      }
    });
  });

  const BL = ["A", "B", "C"];
  const TOTAL_SEATS_SECTION = 24;
  // Default occupied seats in Section A matching demo image (e.g. 01, 04, 13, 17, 19)
  const mkSections = (occ0 = [1, 4, 13, 17, 19]): SectionState[] =>
    BL.map((l, i) => ({
      name: `Section ${l}`,
      totalSeats: TOTAL_SEATS_SECTION,
      occupiedSeats: i === 0 ? occ0 : [],
    }));

  const [sections, setSections] = useState<SectionState[]>(mkSections);
  const [ai, setAi] = useState(0);

  // Initialize selected seats numbers based on passed selectedSeats or default 2 pax (5, 6)
  const [sel, setSel] = useState<number[]>(() => {
    const activePrefix = "A-";
    const initialNums: number[] = [];
    selectedSeats.forEach(sk => {
      if (sk.startsWith(activePrefix)) {
        const num = parseInt(sk.replace(activePrefix, ""), 10);
        if (!isNaN(num)) initialNums.push(num);
      }
    });
    return initialNums.length > 0 ? initialNums : [5, 6];
  });

  const [asgn, setAsgn] = useState<Record<string, string>>(() => {
    const initialAsgn: Record<string, string> = {
      "A-05": "Adult 1",
      "A-06": "Child 1",
    };
    return initialAsgn;
  });

  const activeSection = sections[ai] || sections[0];
  const activeLabel = BL[ai];
  const pad = (n: number) => String(n).padStart(2, "0");
  const isLastTrip = currentTrip >= totalTrips;

  const stOf = (n: number): SeatStatus =>
    activeSection.occupiedSeats.includes(n)
      ? "occupied"
      : sel.includes(n)
        ? "selected"
        : "available";

  const selKeys = sel.map(s => `${activeLabel}-${pad(s)}`);
  const effectiveTotalPax = totalPax > 0 ? totalPax : 2;

  // Calculate live available seats in active section
  const occupiedCount = activeSection.occupiedSeats.length;
  const availSeatsCount = Math.max(0, activeSection.totalSeats - occupiedCount - sel.length);

  const onSeat = (n: number) => {
    const st = stOf(n);
    const key = `${activeLabel}-${pad(n)}`;
    if (st === "occupied") return;

    if (st === "selected") {
      const nextSel = sel.filter(x => x !== n);
      const nextAsgn = { ...asgn };
      delete nextAsgn[key];
      setSel(nextSel);
      setAsgn(nextAsgn);
      const nextKeys = nextSel.map(s => `${activeLabel}-${pad(s)}`);
      onSelectedSeatsChange(nextKeys, nextAsgn);
      return;
    }

    const maxAllowed = totalPax > 0 ? totalPax : 2;
    if (sel.length < maxAllowed) {
      const nextSel = [...sel, n];
      const nextAsgn = { ...asgn };
      const pi = nextSel.length - 1;
      const effectivePax = paxList.length > 0 ? paxList : [
        { label: "Adult", idx: 1 },
        { label: "Child", idx: 1 },
      ];
      if (effectivePax[pi]) {
        nextAsgn[key] = `${effectivePax[pi].label} ${effectivePax[pi].idx}`;
      }
      setSel(nextSel);
      setAsgn(nextAsgn);
      const nextKeys = nextSel.map(s => `${activeLabel}-${pad(s)}`);
      onSelectedSeatsChange(nextKeys, nextAsgn);
    }
  };

  const newTrip = () => {
    if (isLastTrip) return;
    const nextTrip = Math.min(totalTrips, currentTrip + 1);
    onTripChange(nextTrip);
    setSections(BL.map(l => ({ name: `Section ${l}`, totalSeats: TOTAL_SEATS_SECTION, occupiedSeats: [] })));
    setSel([]);
    setAsgn({});
    onSelectedSeatsChange([], {});
    setAi(0);
  };

  const refresh = () => {
    if (isLastTrip) return;
    setSections(mkSections());
    setSel([]);
    setAsgn({});
    onSelectedSeatsChange([], {});
    setAi(0);
  };

  // Seat Component (58px × 29px)
  const SeatBox = ({ n }: { n: number }) => {
    const st = stOf(n);
    const isSelected = st === "selected";
    const isOccupied = st === "occupied";
    return (
      <button
        type="button"
        onClick={e => {
          e.stopPropagation();
          onSeat(n);
        }}
        title={`Seat ${activeLabel}-${pad(n)}`}
        style={{
          width: "58px",
          height: "29px",
          borderRadius: "7px",
          border: isSelected
            ? "1.5px solid rgba(179, 175, 175, 0.21)"
            : "1.5px solid rgba(179, 175, 175, 0.72)",
          background: isSelected ? "#F4BC43" : isOccupied ? "rgba(179, 175, 175, 0.44)" : "#FFFFFF",
          opacity: isOccupied ? 0.89 : 1,
          cursor: isOccupied ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "12px",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontWeight: 600,
          color: "#011B2F",
          transition: "all 0.12s ease",
          userSelect: "none",
          boxSizing: "border-box",
          padding: 0,
        }}
      >
        {pad(n)}
      </button>
    );
  };

  // Row pairs for section layout (01-24 in 4 pairs of 2 rows)
  const rowPairs = [
    [
      { left: [1, 2], right: [3] },
      { left: [4, 5], right: [6] },
    ],
    [
      { left: [7, 8], right: [9] },
      { left: [10, 11], right: [12] },
    ],
    [
      { left: [13, 14], right: [15] },
      { left: [16, 17], right: [18] },
    ],
    [
      { left: [19, 20], right: [21] },
      { left: [22, 23], right: [24] },
    ],
  ];

  return (
    <div
      style={{
        background: "#FFFFFF",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        padding: "20px 24px",
        borderRadius: "13px",
        boxSizing: "border-box",
      }}
      onClick={e => e.stopPropagation()}
    >
      <div
        style={{
          display: "flex",
          gap: "20px",
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        {/* ── Left Container: Section Progress (width: 224px) ── */}
        <div
          style={{
            width: "224px",
            minWidth: "220px",
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

          {/* Section Cards */}
          {sections.map((b, idx) => {
            const lbl = BL[idx];
            const isCur = idx === ai;
            const isLocked = idx > ai;
            const isComp = !isLocked && idx < ai;
            const occ = b.occupiedSeats.length + (isCur ? sel.length : 0);
            const avail = b.totalSeats - occ;

            return (
              <div
                key={lbl}
                onClick={() => !isLocked && setAi(idx)}
                style={{
                  width: "100%",
                  minHeight: "88px",
                  background: "#FFFFFF",
                  border: isCur ? "1.5px solid #173F63" : "1.5px solid rgba(179, 175, 175, 0.51)",
                  opacity: isLocked ? 0.45 : 1,
                  borderRadius: "13px",
                  padding: "12px 14px",
                  cursor: isLocked ? "default" : "pointer",
                  transition: "all 0.15s ease",
                  boxSizing: "border-box",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span style={{ fontWeight: 600, fontSize: "14px", lineHeight: "18px", color: "#011B2F" }}>
                    Section {lbl}
                  </span>
                  <span
                    style={{
                      background: isCur ? "rgba(244, 188, 67, 0.61)" : isComp ? "rgba(34, 197, 94, 0.15)" : "rgba(179, 175, 175, 0.33)",
                      color: isCur ? "#173F63" : isComp ? "#15803D" : "rgba(23, 63, 99, 0.87)",
                      fontSize: "8px",
                      fontWeight: 700,
                      lineHeight: "10px",
                      padding: "2px 8px",
                      borderRadius: "5px",
                    }}
                  >
                    {isCur ? "Active" : isLocked ? "Locked" : "Complete"}
                  </span>
                </div>

                <p style={{ margin: "2px 0", fontSize: "10px", lineHeight: "13px", fontWeight: 600, color: "#6B7280" }}>
                  Seats: {b.totalSeats} {isCur ? `Available: ${avail}` : ""}
                </p>
                <p style={{ margin: "3px 0 0 0", fontSize: "10px", lineHeight: "13px", fontWeight: 600, color: "#6B7280" }}>
                  {isCur ? "Currently allocating seats" : isLocked ? `Opens after Section ${BL[idx - 1]} is full` : "Completed"}
                </p>
              </div>
            );
          })}

          {/* Alert Yellow Box (Rectangle 94) */}
          <div
            style={{
              background: "#FFFBEB",
              border: "1px solid #FEF3C7",
              borderRadius: "8px",
              padding: "8px 10px",
              display: "flex",
              alignItems: "flex-start",
              gap: "6px",
              boxSizing: "border-box",
              marginTop: "4px",
            }}
          >
            <AlertTriangle size={14} color="rgba(244, 188, 67, 0.9)" style={{ flexShrink: 0, marginTop: "1px" }} />
            <p style={{ margin: 0, fontSize: "8px", fontWeight: 500, lineHeight: "11px", color: "#835505" }}>
              Seats are allocated sequentially by section. New section opens only after the current section is full.
            </p>
          </div>
        </div>

        {/* ── Right Container (Rectangle 145 / 95) ── */}
        <div
          style={{
            flex: 1,
            minWidth: "320px",
            background: "#FFFFFF",
            border: "1.5px solid rgba(179, 175, 175, 0.51)",
            borderRadius: "13px",
            padding: "20px 24px",
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
            {/* Date Item */}
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

            {/* Time Slot Item */}
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

            {/* Available Seats Item */}
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
                  {availSeatsCount} / {activeSection.totalSeats} Seats
                </div>
              </div>
            </div>

            {/* Trip Progress Item */}
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
                  {isLastTrip && (
                    <span
                      style={{
                        background: "#FEE2E2",
                        color: "#DC2626",
                        fontSize: "8px",
                        fontWeight: 700,
                        padding: "1px 5px",
                        borderRadius: "4px",
                      }}
                    >
                      Last Trip
                    </span>
                  )}
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
              Select Seats – Section {activeLabel}
            </h4>

            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <button
                type="button"
                disabled={isLastTrip}
                onClick={e => {
                  e.stopPropagation();
                  newTrip();
                }}
                title={isLastTrip ? "Last trip for today reached (5/5). No next trip available." : "Make New Trip"}
                style={{
                  width: "158px",
                  height: "35px",
                  background: isLastTrip ? "#F3F4F6" : "#FFFFFF",
                  border: isLastTrip ? "1.5px solid #D1D5DB" : "1.5px solid #2576AB",
                  borderRadius: "6px",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 600,
                  fontSize: "12px",
                  lineHeight: "15px",
                  color: isLastTrip ? "#9CA3AF" : "#173F63",
                  cursor: isLastTrip ? "not-allowed" : "pointer",
                  opacity: isLastTrip ? 0.65 : 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  transition: "all 0.15s",
                }}
              >
                <Plus size={16} color={isLastTrip ? "#9CA3AF" : "#173F63"} strokeWidth={2.5} /> Make New Trip
              </button>

              <button
                type="button"
                disabled={isLastTrip}
                onClick={e => {
                  e.stopPropagation();
                  refresh();
                }}
                title={isLastTrip ? "Last trip reached for today." : "Refresh Seats"}
                style={{
                  width: "158px",
                  height: "35px",
                  background: isLastTrip ? "#F3F4F6" : "#FFFFFF",
                  border: isLastTrip ? "1.5px solid #D1D5DB" : "1.5px solid #2576AB",
                  borderRadius: "6px",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 600,
                  fontSize: "12px",
                  lineHeight: "15px",
                  color: isLastTrip ? "#9CA3AF" : "#173F63",
                  cursor: isLastTrip ? "not-allowed" : "pointer",
                  opacity: isLastTrip ? 0.65 : 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  transition: "all 0.15s",
                }}
              >
                <RotateCcw size={15} color={isLastTrip ? "#9CA3AF" : "#173F63"} strokeWidth={2} /> Refresh Seats
              </button>
            </div>
          </div>

          {/* Blue Info Banner (Rectangle 103) */}
          <div
            style={{
              background: "#DEF2FF",
              opacity: 0.95,
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
            <p style={{ margin: 0, fontSize: "10px", fontWeight: 600, lineHeight: "13px", color: "#2D6B92" }}>
              Please select {effectiveTotalPax} seat{effectiveTotalPax !== 1 ? "s" : ""}. You can only select seats from the active section.
            </p>
          </div>

          {/* Main Grid: Seats Column + Summary Column */}
          <div
            style={{
              display: "flex",
              gap: "24px",
              alignItems: "flex-start",
              justifyContent: "space-between",
              flexWrap: "wrap",
            }}
          >
            {/* ── Left Side: Interactive Seat Map ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", flexShrink: 0 }}>
              {/* Header row: Left Side / Right Side */}
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <div style={{ width: "122px", textAlign: "center", fontSize: "8px", fontWeight: 600, color: "#173F63" }}>
                  Left Side
                </div>
                <div style={{ width: "38px" }} />
                <div style={{ width: "58px", textAlign: "center", fontSize: "8px", fontWeight: 600, color: "#173F63" }}>
                  Right Side
                </div>
              </div>

              {/* Rows grouped in pairs */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {rowPairs.map((pair, pIdx) => (
                  <div key={pIdx} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    {pair.map((row, rIdx) => (
                      <div key={rIdx} style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                        {/* Left Side: 2 Seats */}
                        <div style={{ display: "flex", gap: "6px" }}>
                          {row.left.map(s => (
                            <SeatBox key={s} n={s} />
                          ))}
                        </div>

                        {/* Center AISLE */}
                        <div
                          style={{
                            width: "38px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "9px",
                            fontWeight: 600,
                            color: "#173F63",
                          }}
                        >
                          {pIdx === 1 && rIdx === 0 ? "AISLE" : ""}
                        </div>

                        {/* Right Side: 1 Seat */}
                        <div>
                          {row.right.map(s => (
                            <SeatBox key={s} n={s} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {/* Legend row */}
              <div style={{ display: "flex", gap: "18px", alignItems: "center", marginTop: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div style={{ width: "20px", height: "19px", border: "1px solid #A0A0A0", borderRadius: "2px", background: "#FFFFFF" }} />
                  <span style={{ fontSize: "8px", fontWeight: 600, color: "#6B7280" }}>Available</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div style={{ width: "20px", height: "19px", background: "#F4BC43", border: "1px solid #F4BC43", borderRadius: "2px" }} />
                  <span style={{ fontSize: "8px", fontWeight: 600, color: "#6B7280" }}>Selected</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div style={{ width: "20px", height: "19px", background: "#E2E0E0", border: "1px solid rgba(107, 114, 128, 0.32)", borderRadius: "2px" }} />
                  <span style={{ fontSize: "8px", fontWeight: 600, color: "#6B7280" }}>Occupied</span>
                </div>
              </div>
            </div>

            {/* ── Right Side: Selected Seats Cards (width: 273px) ── */}
            <div
              style={{
                width: "273px",
                minWidth: "260px",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
                flexShrink: 0,
              }}
            >
              {/* Card 1: Selected Seats list (Rectangle 104) */}
              <div
                style={{
                  width: "100%",
                  minHeight: "171px",
                  background: "#FFFFFF",
                  border: "1.5px solid rgba(179, 175, 175, 0.51)",
                  borderRadius: "7px",
                  padding: "14px 18px",
                  boxSizing: "border-box",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 700, fontSize: "10px", lineHeight: "13px", color: "#011B2F" }}>
                    Selected Seats
                  </span>
                  <span style={{ fontWeight: 500, fontSize: "10px", lineHeight: "13px", color: "#F4BC43" }}>
                    {sel.length}/{effectiveTotalPax} Selected
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {(paxList.length > 0
                    ? paxList
                    : [
                      { label: "Adult", idx: 1 },
                      { label: "Child", idx: 1 },
                    ]
                  ).map((p, i) => {
                    const sk = selKeys[i];
                    return (
                      <React.Fragment key={i}>
                        {i > 0 && <div style={{ width: "100%", height: "0.5px", background: "rgba(179, 175, 175, 0.31)" }} />}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <span style={{ fontSize: "10px", fontWeight: 600, lineHeight: "13px", color: "#011B2F" }}>
                            {p.label} {p.idx}
                          </span>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            {sk ? (
                              <span
                                style={{
                                  background: "rgba(255, 220, 145, 0.61)",
                                  borderRadius: "5px",
                                  padding: "2px 8px",
                                  fontSize: "8px",
                                  fontWeight: 500,
                                  lineHeight: "10px",
                                  color: "#CE8305",
                                }}
                              >
                                {sk}
                              </span>
                            ) : (
                              <span style={{ fontSize: "8px", color: "#A0A0A0" }}>-</span>
                            )}
                            {sk && (
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  onSeat(parseInt(sk.split("-")[1], 10));
                                }}
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
                  })}
                </div>
              </div>

              {/* Card 2: Summary Stats Box (Rectangle 105) */}
              <div
                style={{
                  width: "100%",
                  minHeight: "111px",
                  background: "rgba(242, 237, 237, 0.44)",
                  border: "1.5px solid rgba(179, 175, 175, 0.72)",
                  borderRadius: "7px",
                  padding: "14px 18px",
                  boxSizing: "border-box",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                {[
                  { l: "Passengers to Assign", v: String(effectiveTotalPax), c: "#011B2F" },
                  { l: "Seats Assigned", v: `${sel.length}/${effectiveTotalPax}`, c: "#F4BC43" },
                  { l: "Current Section", v: activeLabel, c: "#011B2F" },
                  { l: "Seat Numbers", v: selKeys.join(",") || "—", c: "#011B2F" },
                ].map((row, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <div style={{ width: "100%", height: "0.5px", background: "rgba(179, 175, 175, 0.31)" }} />}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <span style={{ fontSize: "8px", fontWeight: 600, lineHeight: "10px", color: "#6B7280" }}>{row.l}</span>
                      <span style={{ fontSize: "10px", fontWeight: 600, lineHeight: "13px", color: row.c, textAlign: "right" }}>
                        {row.v}
                      </span>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
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
  const [customers, setCustomers] = useState<CustomerRecord[]>(MOCK_CUSTOMERS);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord>(MOCK_CUSTOMERS[0]);
  const [searchQuery, setSearchQuery] = useState(MOCK_CUSTOMERS[0].name);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isAddNewOpen, setIsAddNewOpen] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
  const [selectedSeats, setSelectedSeats] = useState<string[]>(["A-05", "A-06"]);
  const [paxAssignment, setPaxAssignment] = useState<Record<string, string>>({ "A-05": "Adult 1", "A-06": "Child 1" });
  const [currentTrip, setCurrentTrip] = useState(1);
  const [timeSlot, setTimeSlot] = useState("10:00 AM – 10:20 AM");

  // Today's formatted date for the slot
  const slotDate = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  function handleSelectedSeatsChange(seats: string[], assignment: Record<string, string>) {
    setSelectedSeats(seats);
    setPaxAssignment(assignment);
  }

  const grandTotal = bookingSummary.reduce((s, b) => s + b.totalAmount, 0);

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.mobile.includes(searchQuery) ||
      c.gstn.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      gstn: nc.gstn,
    };
    setCustomers((prev) => [newC, ...prev]);
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
      {/* Title */}
      <div>
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
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px", flexWrap: "wrap" }}>
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
                {filteredCustomers.length === 0 ? (
                  <p style={{ padding: "12px 16px", margin: 0, fontSize: "12px", color: "#6B7280" }}>
                    No customers found.
                  </p>
                ) : (
                  filteredCustomers.map((c) => (
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
                          GSTN: {c.gstn}
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

        {/* ── Selected Customer Details Box (Rectangle 73) ── */}
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
                {selectedCustomer.gstn}
              </span>
            </div>
          </div>
        </div>
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
            <h4 style={{ margin: 0, fontWeight: 600, fontSize: "16px", lineHeight: "20px", color: "#011B2F" }}>
              Seat Allocation
            </h4>
            <p style={{ margin: "2px 0 0", fontWeight: 500, fontSize: "12px", color: "#6B7280" }}>
              Choose seats for this booking
            </p>
            {/* Show assigned seat codes when collapsed */}
            {!isSeatAllocExpanded && selectedSeats.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "8px" }}>
                {selectedSeats.map((sk) => (
                  <span
                    key={sk}
                    style={{
                      background: "rgba(255, 220, 145, 0.61)",
                      border: "1px solid rgba(244, 188, 67, 0.5)",
                      borderRadius: "5px",
                      padding: "2px 9px",
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "#9A5C00",
                      letterSpacing: "0.3px",
                    }}
                  >
                    {sk}
                  </span>
                ))}
                <span style={{ fontSize: "11px", fontWeight: 500, color: "#6B7280", alignSelf: "center" }}>
                  — Trip {currentTrip} of {TOTAL_TRIPS_PER_DAY} · {timeSlot} · {slotDate}
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

      <AddNewCustomerModal
        isOpen={isAddNewOpen}
        onClose={() => setIsAddNewOpen(false)}
        onSave={handleSaveNewCustomer}
      />

      {/* Process Payment Modal */}
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
      <TicketGeneratedModal
        isOpen={showTicketModal}
        onClose={() => {
          setShowTicketModal(false);
          onContinue({ name: selectedCustomer.name, mobile: selectedCustomer.mobile, gstn: selectedCustomer.gstn });
        }}
        attractionName={bookingSummary[0]?.attractionName || "Nahargarh Fort"}
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
