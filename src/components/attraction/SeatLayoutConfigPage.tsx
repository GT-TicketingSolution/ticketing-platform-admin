"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeft, AlertCircle, Check, Settings } from "lucide-react";
import { Attraction } from "@/types/admin";
import { useToast } from "@/components/ui/Toast";
import { validateSeatingConfig } from "@/app/(dashboard)/attraction-management/schema";
import SeatingConfigModal, { SeatingConfig } from "@/components/modals/SeatingConfigModal";

interface SeatLayoutConfigPageProps {
  attraction: Attraction | null;
  onBack: () => void;
  onSaveSuccess: (updatedAttraction: Partial<Attraction>) => void;
}

export default function SeatLayoutConfigPage({
  attraction,
  onBack,
  onSaveSuccess,
}: SeatLayoutConfigPageProps) {
  const { showToast } = useToast();

  const [layoutName, setLayoutName] = useState(
    attraction ? `${attraction.name} Layout` : "Coach A"
  );
  const [totalSeats, setTotalSeats] = useState<number>(24);
  const [gridStyle, setGridStyle] = useState<string>("2 × 1 (Left)");
  const [status, setStatus] = useState<"Active" | "Inactive">("Active");

  // Custom layout & Aisle settings state 
  const [customRows, setCustomRows] = useState<number>(8);
  const [customLeftCols, setCustomLeftCols] = useState<number>(2);
  const [customRightCols, setCustomRightCols] = useState<number>(1);
  const [aislePosition, setAislePosition] = useState<string>("Centre");
  const [aisleWidth, setAisleWidth] = useState<string>("Medium");
  const [isCustomModalOpen, setIsCustomModalOpen] = useState<boolean>(false);

  // Track VIP seats by seat index (1-based)
  const [vipSeats, setVipSeats] = useState<Set<number>>(new Set());

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Recalculate or update layout when grid style changes
  useEffect(() => {
    if (!totalSeats || totalSeats <= 0) setTotalSeats(24);
  }, [totalSeats]);

  const toggleVipSeat = (seatNum: number) => {
    setVipSeats((prev) => {
      const next = new Set(prev);
      if (next.has(seatNum)) {
        next.delete(seatNum);
      } else {
        next.add(seatNum);
      }
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateSeatingConfig({
      layoutName,
      totalSeats: Number(totalSeats),
      gridStyle,
      status,
    });

    if (!validation.success) {
      setErrors(validation.errors);
      showToast("Please fix errors before saving layout", "error");
      return;
    }

    setErrors({});

    showToast(
      `Seat layout "${layoutName}" saved successfully with ${totalSeats} seats (${vipSeats.size} VIP)!`,
      "success"
    );

    onSaveSuccess({
      hasSeating: true,
      status,
    });
  };

  const handleSaveCustomLayout = (config: SeatingConfig) => {
    setCustomRows(config.rows);
    setCustomLeftCols(config.leftCols);
    setCustomRightCols(config.rightCols);
    setAislePosition(config.aislePosition);
    setAisleWidth(config.aisleWidth);
    setGridStyle("Custom Layout");
    setTotalSeats(config.rows * (config.leftCols + config.rightCols));
  };

  // Determine grid columns setup based on gridStyle option
  const getGridConfig = () => {
    switch (gridStyle) {
      case "1 × 1":
        return { leftCols: 1, rightCols: 1 };
      case "2 × 1 (Left)":
        return { leftCols: 2, rightCols: 1 };
      case "1 × 2 (Right)":
        return { leftCols: 1, rightCols: 2 };
      case "2 × 2":
        return { leftCols: 2, rightCols: 2 };
      case "2 × 3":
        return { leftCols: 2, rightCols: 3 };
      case "3 × 2":
        return { leftCols: 3, rightCols: 2 };
      case "3 × 3":
        return { leftCols: 3, rightCols: 3 };
      case "4 × 2":
        return { leftCols: 4, rightCols: 2 };
      case "4 × 3":
        return { leftCols: 4, rightCols: 3 };
      case "4 × 4":
        return { leftCols: 4, rightCols: 4 };
      case "Custom Layout":
        return { leftCols: customLeftCols, rightCols: customRightCols };
      default:
        return { leftCols: 2, rightCols: 1 };
    }
  };

  const { leftCols, rightCols } = getGridConfig();
  const seatsPerRow = leftCols + rightCols;
  const numRows = Math.ceil(totalSeats / seatsPerRow);

  // Generate seat numbers matrix for rendering left and right sides
  const rows: { leftSeats: number[]; rightSeats: number[] }[] = [];
  let seatCounter = 1;

  for (let r = 0; r < numRows; r++) {
    const leftSeats: number[] = [];
    for (let l = 0; l < leftCols; l++) {
      if (seatCounter <= totalSeats) {
        leftSeats.push(seatCounter++);
      }
    }
    const rightSeats: number[] = [];
    for (let rightIdx = 0; rightIdx < rightCols; rightIdx++) {
      if (seatCounter <= totalSeats) {
        rightSeats.push(seatCounter++);
      }
    }
    rows.push({ leftSeats, rightSeats });
  }

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "1124px",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        paddingBottom: "40px",
      }}
    >
      {/* ── Back Navigation Link ── */}
      <button
        type="button"
        onClick={onBack}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontWeight: 600,
          fontSize: "14px",
          color: "#0C2A42",
          width: "fit-content",
        }}
      >
        <ArrowLeft size={18} color="#0C2A42" />
        Back to Attraction Management
      </button>

      <form onSubmit={handleSubmit}>
        {/* ── Two Cards Grid Container matching exact Figma specs ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "28px",
            width: "100%",
            alignItems: "start",
          }}
        >
          {/* ─────────────────────────────────────────────────────────────
              LEFT CARD: Seat Layout Configuration (Figma Rectangle 171: 607px)
             ───────────────────────────────────────────────────────────── */}
          <div
            style={{
              boxSizing: "border-box",
              width: "100%",
              minHeight: "750px",
              background: "#FFFFFF",
              border: "0.5px solid rgba(0, 0, 0, 0.43)",
              boxShadow: "0px 4px 11.9px -6px rgba(0, 0, 0, 0.32)",
              borderRadius: "15px",
              padding: "32px 36px",
              display: "flex",
              flexDirection: "column",
              gap: "24px",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 700,
                fontSize: "18px",
                lineHeight: "23px",
                color: "#0C2A42",
              }}
            >
              Seat Layout Configuration
            </h2>

            {/* Layout Name & Total Seats Row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "20px",
              }}
            >
              {/* Layout Name* */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label
                  htmlFor="layout-name-input"
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 500,
                    fontSize: "12px",
                    lineHeight: "18px",
                    color: "#374151",
                  }}
                >
                  Layout Name<span style={{ color: "#DC2626" }}>*</span>
                </label>
                <input
                  id="layout-name-input"
                  type="text"
                  placeholder="Enter layout name (e.g., Coach A, Cabin 1, Zone A)"
                  value={layoutName}
                  onChange={(e) => setLayoutName(e.target.value)}
                  style={{
                    width: "100%",
                    height: "38px",
                    background: "#FFFFFF",
                    border: `1.5px solid ${errors.layoutName ? "#DC2626" : "rgba(179, 175, 175, 0.51)"}`,
                    borderRadius: "8px",
                    padding: "0 12px",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: 500,
                    fontSize: "11px",
                    color: "rgba(55, 65, 81, 0.89)",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                {errors.layoutName && (
                  <span style={{ fontSize: "11px", color: "#DC2626", display: "flex", alignItems: "center", gap: "4px" }}>
                    <AlertCircle size={12} />
                    {errors.layoutName}
                  </span>
                )}
              </div>

              {/* Total Seats* */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label
                  htmlFor="total-seats-input"
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 500,
                    fontSize: "12px",
                    lineHeight: "18px",
                    color: "#374151",
                  }}
                >
                  Total Seats<span style={{ color: "#DC2626" }}>*</span>
                </label>
                <input
                  id="total-seats-input"
                  type="number"
                  min="1"
                  max="500"
                  placeholder="24"
                  value={totalSeats || ""}
                  onChange={(e) => setTotalSeats(Number(e.target.value))}
                  style={{
                    width: "100%",
                    height: "38px",
                    background: "#FFFFFF",
                    border: `1.5px solid ${errors.totalSeats ? "#DC2626" : "rgba(179, 175, 175, 0.51)"}`,
                    borderRadius: "8px",
                    padding: "0 12px",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: 500,
                    fontSize: "11px",
                    color: "rgba(55, 65, 81, 0.89)",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                {errors.totalSeats && (
                  <span style={{ fontSize: "11px", color: "#DC2626", display: "flex", alignItems: "center", gap: "4px" }}>
                    <AlertCircle size={12} />
                    {errors.totalSeats}
                  </span>
                )}
              </div>
            </div>

            {/* Grid Style & Custom Layout Trigger */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", alignItems: "flex-end", gap: "12px", flexWrap: "wrap" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1, minWidth: "180px" }}>
                  <label
                    htmlFor="grid-style-select"
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontWeight: 500,
                      fontSize: "12px",
                      lineHeight: "18px",
                      color: "#374151",
                    }}
                  >
                    Grid Style<span style={{ color: "#DC2626" }}>*</span>
                  </label>
                  <select
                    id="grid-style-select"
                    value={gridStyle}
                    onChange={(e) => {
                      const val = e.target.value;
                      setGridStyle(val);
                      if (val === "Custom Layout") {
                        setIsCustomModalOpen(true);
                      }
                    }}
                    style={{
                      width: "100%",
                      height: "38px",
                      background: "#FFFFFF",
                      border: `1.5px solid ${errors.gridStyle ? "#DC2626" : "rgba(179, 175, 175, 0.51)"}`,
                      borderRadius: "8px",
                      padding: "0 12px",
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontWeight: 500,
                      fontSize: "11px",
                      color: "rgba(55, 65, 81, 0.89)",
                      outline: "none",
                      cursor: "pointer",
                      boxSizing: "border-box",
                    }}
                  >
                    <option value="Select Grid">Select Grid</option>
                    <option value="1 × 1">▼ 1 × 1</option>
                    <option value="2 × 1 (Left)">▼ 2 × 1 (Left)</option>
                    <option value="1 × 2 (Right)">▼ 1 × 2 (Right)</option>
                    <option value="2 × 2">▼ 2 × 2</option>
                    <option value="2 × 3">▼ 2 × 3</option>
                    <option value="3 × 2">▼ 3 × 2</option>
                    <option value="3 × 3">▼ 3 × 3</option>
                    <option value="4 × 2">▼ 4 × 2</option>
                    <option value="4 × 3">▼ 4 × 3</option>
                    <option value="4 × 4">▼ 4 × 4</option>
                    <option value="Custom Layout">▼ Custom Layout</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => setIsCustomModalOpen(true)}
                  style={{
                    height: "38px",
                    padding: "0 14px",
                    background: "#011B2F",
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: "8px",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: 600,
                    fontSize: "12px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    whiteSpace: "nowrap",
                  }}
                >
                  <Settings size={14} color="#F4BC43" />
                  Custom Layout Modal
                </button>
              </div>

              {/* Aisle Position & Aisle Width Fields (Matching Image 1 & Image 2) */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "16px",
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderRadius: "10px",
                  padding: "12px 14px",
                }}
              >
                {/* Aisle Position */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label
                    htmlFor="aisle-position-select"
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontWeight: 600,
                      fontSize: "11px",
                      color: "#374151",
                    }}
                  >
                    Aisle Position
                  </label>
                  <select
                    id="aisle-position-select"
                    value={aislePosition}
                    onChange={(e) => setAislePosition(e.target.value)}
                    style={{
                      width: "100%",
                      height: "34px",
                      background: "#FFFFFF",
                      border: "1.5px solid #D1D5DB",
                      borderRadius: "6px",
                      padding: "0 10px",
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontWeight: 600,
                      fontSize: "11px",
                      color: "#011B2F",
                      outline: "none",
                      cursor: "pointer",
                    }}
                  >
                    <option value="Centre">Centre</option>
                    <option value="Left">Left</option>
                    <option value="Right">Right</option>
                    <option value="Dual Aisles">Dual Aisles</option>
                    <option value="No Aisle">No Aisle</option>
                  </select>
                </div>

                {/* Aisle Width */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label
                    htmlFor="aisle-width-select"
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontWeight: 600,
                      fontSize: "11px",
                      color: "#374151",
                    }}
                  >
                    Aisle Width
                  </label>
                  <select
                    id="aisle-width-select"
                    value={aisleWidth}
                    onChange={(e) => setAisleWidth(e.target.value)}
                    style={{
                      width: "100%",
                      height: "34px",
                      background: "#FFFFFF",
                      border: "1.5px solid #D1D5DB",
                      borderRadius: "6px",
                      padding: "0 10px",
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontWeight: 600,
                      fontSize: "11px",
                      color: "#011B2F",
                      outline: "none",
                      cursor: "pointer",
                    }}
                  >
                    <option value="Narrow">Narrow</option>
                    <option value="Medium">Medium</option>
                    <option value="Wide">Wide</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Alert Information Box matching Figma Rectangle 94 */}
            <div
              style={{
                boxSizing: "border-box",
                width: "100%",
                minHeight: "60px",
                background: "#DEF2FF",
                opacity: 0.95,
                border: "1px solid rgba(23, 63, 99, 0.4)",
                borderRadius: "12px",
                padding: "14px 18px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <AlertCircle size={22} color="#064E7C" style={{ flexShrink: 0 }} />
              <span
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 500,
                  fontSize: "11px",
                  lineHeight: "16px",
                  color: "#2372A5",
                  letterSpacing: "0.02em",
                }}
              >
                Custom layout allows you to create a unique seat arrangement with aisles, rows and columns.
              </span>
            </div>

            {/* VIP Seats (Optional)* */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 500,
                  fontSize: "12px",
                  lineHeight: "18px",
                  color: "#374151",
                }}
              >
                VIP Seats (Optional)<span style={{ color: "#DC2626" }}>*</span>
              </label>

              <div
                style={{
                  width: "100%",
                  minHeight: "38px",
                  background: "#FFFFFF",
                  border: "1.5px solid rgba(179, 175, 175, 0.51)",
                  borderRadius: "8px",
                  padding: "8px 14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  boxSizing: "border-box",
                }}
              >
                <span
                  style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: 500,
                    fontSize: "11px",
                    color: "rgba(55, 65, 81, 0.89)",
                  }}
                >
                  {vipSeats.size > 0
                    ? Array.from(vipSeats)
                      .sort((a, b) => a - b)
                      .map((s) => (s < 10 ? `0${s}` : s))
                      .join(", ")
                    : "No VIP seats selected"}
                </span>

                <span style={{ fontSize: "11px", fontWeight: 700, color: "#D97706" }}>
                  {vipSeats.size} VIP Seats Selected
                </span>
              </div>

              <span
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 400,
                  fontSize: "10px",
                  lineHeight: "15px",
                  color: "#6B7280",
                  marginTop: "2px",
                }}
              >
                Select seats from preview to mark as VIP.
              </span>
            </div>

            {/* Status* Radio Pills */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "12px" }}>
              <label
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 700,
                  fontSize: "12px",
                  lineHeight: "18px",
                  color: "#374151",
                }}
              >
                Status<span style={{ color: "#DC2626" }}>*</span>
              </label>

              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                {/* Active Pill matching Figma Rectangle 238 */}
                <button
                  type="button"
                  onClick={() => setStatus("Active")}
                  style={{
                    height: "38px",
                    padding: "0 20px",
                    background: "#FFFFFF",
                    border: `1.5px solid ${status === "Active" ? "#011B2F" : "rgba(179, 175, 175, 0.51)"}`,
                    borderRadius: "8px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: 700,
                    fontSize: "14px",
                    color: status === "Active" ? "#011B2F" : "#A0A0A0",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div
                    style={{
                      width: "12px",
                      height: "12px",
                      borderRadius: "50%",
                      border: `1px solid ${status === "Active" ? "#173F63" : "#A0A0A0"}`,
                      background: status === "Active" ? "#173F63" : "transparent",
                    }}
                  />
                  Active
                </button>

                {/* Inactive Pill matching Figma Rectangle 239 */}
                <button
                  type="button"
                  onClick={() => setStatus("Inactive")}
                  style={{
                    height: "38px",
                    padding: "0 20px",
                    background: "#FFFFFF",
                    border: `1.5px solid ${status === "Inactive" ? "#011B2F" : "rgba(179, 175, 175, 0.51)"}`,
                    borderRadius: "8px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: 700,
                    fontSize: "14px",
                    color: status === "Inactive" ? "#011B2F" : "#A0A0A0",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div
                    style={{
                      width: "12px",
                      height: "12px",
                      borderRadius: "50%",
                      border: `1px solid ${status === "Inactive" ? "#173F63" : "#A0A0A0"}`,
                      background: status === "Inactive" ? "#173F63" : "transparent",
                    }}
                  />
                  Inactive
                </button>
              </div>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              RIGHT CARD: Seat Layout Preview (Figma Rectangle 240: 453px)
             ───────────────────────────────────────────────────────────── */}
          <div
            style={{
              boxSizing: "border-box",
              width: "100%",
              minHeight: "750px",
              background: "#FFFFFF",
              border: "0.5px solid rgba(0, 0, 0, 0.43)",
              boxShadow: "0px 4px 11.9px -6px rgba(0, 0, 0, 0.32)",
              borderRadius: "15px",
              padding: "32px 36px",
              display: "flex",
              flexDirection: "column",
              gap: "24px",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 700,
                fontSize: "18px",
                lineHeight: "23px",
                color: "#0C2A42",
              }}
            >
              Seat Layout Preview
            </h2>

            {/* Visual Seat Grid Container */}
            <div
              style={{
                width: "100%",
                background: "#FFFFFF",
                borderRadius: "12px",
                padding: "20px 10px",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
                maxHeight: "600px",
                overflowY: "auto",
              }}
            >
              {rows.map((row, rIdx) => {
                const isNoAisle = aislePosition === "No Aisle";
                const isLeftAisle = aislePosition === "Left";
                const isRightAisle = aislePosition === "Right";
                const isDualAisles = aislePosition === "Dual Aisles";
                const currentAisleWidthPx =
                  aisleWidth === "Narrow" ? 44 : aisleWidth === "Wide" ? 88 : 66;

                const renderAisleBox = (key: string) => (
                  <div
                    key={key}
                    style={{
                      width: `${currentAisleWidthPx}px`,
                      height: "36px",
                      background: "rgba(179, 175, 175, 0.13)",
                      border: "1.5px dashed rgba(179, 175, 175, 0.51)",
                      borderRadius: "4px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "'Inter', sans-serif",
                      fontWeight: 500,
                      fontSize: "11px",
                      color: "#374151",
                      flexShrink: 0,
                      transition: "width 0.2s ease",
                    }}
                  >
                    AISLE
                  </div>
                );

                return (
                  <div
                    key={rIdx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "12px",
                      width: "100%",
                    }}
                  >
                    {/* Left or Dual Aisle */}
                    {(isLeftAisle || isDualAisles) && renderAisleBox("aisle-left")}

                    {/* Left Block of seats */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        justifyContent: "center",
                      }}
                    >
                      {row.leftSeats.map((seatNum) => {
                        const isVip = vipSeats.has(seatNum);
                        const formattedNum = seatNum < 10 ? `0${seatNum}` : `${seatNum}`;
                        return (
                          <button
                            key={seatNum}
                            type="button"
                            onClick={() => toggleVipSeat(seatNum)}
                            title={`Seat ${formattedNum} - Click to toggle VIP`}
                            style={{
                              width: "88px",
                              height: "32px",
                              background: isVip ? "#F4BC43" : "#FFFFFF",
                              border: "1.5px solid rgba(179, 175, 175, 0.51)",
                              borderRadius: "4px",
                              fontFamily: "'Plus Jakarta Sans', sans-serif",
                              fontWeight: 600,
                              fontSize: "12px",
                              lineHeight: "15px",
                              color: "#011B2F",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              transition: "all 0.15s ease",
                              boxShadow: isVip ? "0 2px 6px rgba(244, 188, 67, 0.35)" : "none",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
                            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                          >
                            {formattedNum}
                          </button>
                        );
                      })}
                    </div>

                    {/* Center or Dual Aisle */}
                    {(!isNoAisle && !isLeftAisle && !isRightAisle) && renderAisleBox("aisle-center")}

                    {/* Right Block of seats */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        justifyContent: "center",
                      }}
                    >
                      {row.rightSeats.map((seatNum) => {
                        const isVip = vipSeats.has(seatNum);
                        const formattedNum = seatNum < 10 ? `0${seatNum}` : `${seatNum}`;
                        return (
                          <button
                            key={seatNum}
                            type="button"
                            onClick={() => toggleVipSeat(seatNum)}
                            title={`Seat ${formattedNum} - Click to toggle VIP`}
                            style={{
                              width: "88px",
                              height: "32px",
                              background: isVip ? "#F4BC43" : "#FFFFFF",
                              border: "1.5px solid rgba(179, 175, 175, 0.51)",
                              borderRadius: "4px",
                              fontFamily: "'Plus Jakarta Sans', sans-serif",
                              fontWeight: 600,
                              fontSize: "12px",
                              lineHeight: "15px",
                              color: "#011B2F",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              transition: "all 0.15s ease",
                              boxShadow: isVip ? "0 2px 6px rgba(244, 188, 67, 0.35)" : "none",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
                            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                          >
                            {formattedNum}
                          </button>
                        );
                      })}
                    </div>

                    {/* Right Aisle */}
                    {isRightAisle && renderAisleBox("aisle-right")}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Bottom Action Row matching Figma buttons ── */}
        <div
          style={{
            marginTop: "32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          {/* Cancel Button (Rectangle 178) */}
          <button
            type="button"
            onClick={onBack}
            style={{
              width: "124px",
              height: "48px",
              background: "#FFFFFF",
              border: "0.5px solid #002A45",
              borderRadius: "4px",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 700,
              fontSize: "14px",
              lineHeight: "18px",
              color: "#011B2F",
              cursor: "pointer",
              transition: "all 0.18s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F8FAFC")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#FFFFFF")}
          >
            Cancel
          </button>

          {/* Save Attraction Button (Rectangle 179) */}
          <button
            type="submit"
            style={{
              width: "153px",
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
              boxShadow: "0 4px 12px rgba(244, 188, 67, 0.3)",
              transition: "all 0.18s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#E5AF36";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#F4BC43";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            Save Attraction
          </button>
        </div>
      </form>

      {/* ── Custom Layout Modal */}
      <SeatingConfigModal
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
        attraction={attraction}
        initialConfig={{
          rows: customRows,
          leftCols: customLeftCols,
          rightCols: customRightCols,
          aislePosition,
          aisleWidth,
        }}
        onSave={handleSaveCustomLayout}
      />
    </div>
  );
}
