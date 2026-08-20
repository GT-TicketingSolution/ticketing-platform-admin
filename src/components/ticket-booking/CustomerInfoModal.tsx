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
} from "lucide-react";
import AddNewCustomerModal, { NewCustomer } from "./AddNewCustomerModal";

export interface BookingSummaryItem {
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

  if (!isOpen) return null;

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
                      {filteredCustomers.length === 0 ? (
                        <p style={{ padding: "12px 16px", margin: 0, fontSize: "12px", color: "#6B7280" }}>
                          No customers found.
                        </p>
                      ) : (
                        filteredCustomers.map((c) => (
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
                                GSTN: {c.gstn}
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
                        type="text"
                        placeholder="Enter Mobile Number"
                        value={guestDetails.mobile}
                        onChange={(e) => setGuestDetails({ ...guestDetails, mobile: e.target.value })}
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
                        type="text"
                        placeholder="Enter Mobile Number"
                        value={referenceDetails.refMobile}
                        onChange={(e) => setReferenceDetails({ ...referenceDetails, refMobile: e.target.value })}
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
