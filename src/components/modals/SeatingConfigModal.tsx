"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { Attraction } from "@/types/admin";

// ── Types
export interface SeatingConfig {
  rows: number;
  leftCols: number;
  rightCols: number;
  aislePosition: string;
  aisleWidth: string;
}

interface SeatingConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  attraction?: Attraction | null;
  initialConfig?: Partial<SeatingConfig>;
  onSave?: (config: SeatingConfig) => void;
}

// ── Constants
const AISLE_POSITIONS = ["Left", "Centre", "Right", "Dual Aisles", "No Aisle"];
const AISLE_WIDTHS = ["Narrow", "Medium", "Wide"];

/** +/− numeric stepper  */
function StepperControl({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const canDec = value > min;
  const canInc = value < max;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        height: "46px",
        border: "1.5px solid #D1D5DB",
        borderRadius: "8px",
        overflow: "hidden",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* Plus on Left (matching Image 1) */}
      <button
        type="button"
        onClick={() => canInc && onChange(value + 1)}
        style={{
          width: "46px",
          height: "100%",
          border: "none",
          borderRight: "1.5px solid #D1D5DB",
          background: "#FFFFFF",
          cursor: canInc ? "pointer" : "not-allowed",
          fontSize: "20px",
          fontWeight: 700,
          color: canInc ? "#011B2F" : "#D1D5DB",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) => canInc && (e.currentTarget.style.background = "#F9FAFB")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "#FFFFFF")}
      >
        +
      </button>

      {/* Value */}
      <span
        style={{
          flex: 1,
          textAlign: "center",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontWeight: 700,
          fontSize: "16px",
          color: "#011B2F",
          userSelect: "none",
        }}
      >
        {value}
      </span>

      {/* Minus on Right (matching Image 1) */}
      <button
        type="button"
        onClick={() => canDec && onChange(value - 1)}
        style={{
          width: "46px",
          height: "100%",
          border: "none",
          borderLeft: "1.5px solid #D1D5DB",
          background: "#FFFFFF",
          cursor: canDec ? "pointer" : "not-allowed",
          fontSize: "20px",
          fontWeight: 700,
          color: canDec ? "#011B2F" : "#D1D5DB",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) => canDec && (e.currentTarget.style.background = "#F9FAFB")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "#FFFFFF")}
      >
        −
      </button>
    </div>
  );
}

/** Custom Dropdown select */
function DropdownSelect({
  label,
  placeholder,
  value,
  options,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <label
        style={{
          display: "block",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontWeight: 700,
          fontSize: "13px",
          color: "#011B2F",
          marginBottom: "8px",
        }}
      >
        {label}
      </label>

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          height: "46px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 14px",
          background: "#FFFFFF",
          border: "1.5px solid #D1D5DB",
          borderRadius: "8px",
          cursor: "pointer",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontWeight: value ? 600 : 400,
          fontSize: "14px",
          color: value ? "#011B2F" : "#6B7280",
          boxSizing: "border-box",
          transition: "border-color 0.15s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#9CA3AF")}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#D1D5DB")}
      >
        {value || placeholder}
        <ChevronDown
          size={18}
          color="#6B7280"
          style={{
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
            flexShrink: 0,
          }}
        />
      </button>

      {/* Dropdown items (matching Image 2) */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            background: "#FFFFFF",
            border: "1px solid #E5E7EB",
            borderRadius: "10px",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.12)",
            zIndex: 50,
            overflow: "hidden",
          }}
        >
          {options.map((opt) => {
            const isSelected = value === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                style={{
                  width: "100%",
                  padding: "11px 16px",
                  textAlign: "left",
                  background: isSelected ? "#011B2F" : "#FFFFFF",
                  color: isSelected ? "#FFFFFF" : "#011B2F",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: isSelected ? 700 : 500,
                  fontSize: "14px",
                  display: "block",
                  transition: "background 0.12s",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.background = "#F3F4F6";
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.background = "#FFFFFF";
                }}
              >
                {opt}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Individual seat box element */
function SeatBox({ num }: { num: number }) {
  return (
    <div
      style={{
        width: "54px",
        height: "36px",
        background: "#FFFFFF",
        border: "1.5px solid #D1D5DB",
        borderRadius: "6px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontWeight: 600,
        fontSize: "13px",
        color: "#011B2F",
        flexShrink: 0,
        boxSizing: "border-box",
      }}
    >
      {num < 10 ? `0${num}` : `${num}`}
    </div>
  );
}

/** Dashed Aisle element */
function AisleBox({ widthPx }: { widthPx: number }) {
  return (
    <div
      style={{
        width: `${widthPx}px`,
        height: "36px",
        background: "rgba(229, 231, 235, 0.45)",
        border: "1.5px dashed #D1D5DB",
        borderRadius: "4px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontWeight: 600,
        fontSize: "10px",
        color: "#6B7280",
        letterSpacing: "0.5px",
        flexShrink: 0,
        transition: "width 0.2s ease",
      }}
    >
      AISLE
    </div>
  );
}

// ── Main Component 
export default function SeatingConfigModal({
  isOpen,
  onClose,
  attraction,
  initialConfig,
  onSave,
}: SeatingConfigModalProps) {
  const [rows, setRows] = useState(initialConfig?.rows ?? 8);
  const [leftCols, setLeftCols] = useState(initialConfig?.leftCols ?? 2);
  const [rightCols, setRightCols] = useState(initialConfig?.rightCols ?? 1);
  const [aislePosition, setAislePosition] = useState(initialConfig?.aislePosition ?? "");
  const [aisleWidth, setAisleWidth] = useState(initialConfig?.aisleWidth ?? "");

  useEffect(() => {
    if (initialConfig) {
      if (initialConfig.rows !== undefined) setRows(initialConfig.rows);
      if (initialConfig.leftCols !== undefined) setLeftCols(initialConfig.leftCols);
      if (initialConfig.rightCols !== undefined) setRightCols(initialConfig.rightCols);
      if (initialConfig.aislePosition !== undefined) setAislePosition(initialConfig.aislePosition);
      if (initialConfig.aisleWidth !== undefined) setAisleWidth(initialConfig.aisleWidth);
    }
  }, [initialConfig]);

  if (!isOpen) return null;

  // Aisle width in px based on selection
  const aisleWidthPx =
    aisleWidth === "Narrow" ? 44 : aisleWidth === "Wide" ? 88 : 64;

  // Build rows data
  const seatsPerRow = leftCols + rightCols;
  const seatRows = Array.from({ length: rows }, (_, rIdx) => {
    const startSeat = rIdx * seatsPerRow + 1;
    return {
      left: Array.from({ length: leftCols }, (_, i) => startSeat + i),
      right: Array.from({ length: rightCols }, (_, i) => startSeat + leftCols + i),
    };
  });

  const handleApply = () => {
    if (onSave) {
      onSave({
        rows,
        leftCols,
        rightCols,
        aislePosition: aislePosition || "Centre",
        aisleWidth: aisleWidth || "Medium",
      });
    }
    onClose();
  };

  return (
    <>
      {/* Overlay */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(12, 42, 66, 0.55)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "16px",
        }}
        onClick={onClose}
      >
        {/* Modal Card matching Image 1 */}
        <div
          style={{
            background: "#FFFFFF",
            borderRadius: "16px",
            width: "100%",
            maxWidth: "680px",
            maxHeight: "92vh",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 24px 60px rgba(0, 0, 0, 0.18)",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            overflow: "hidden",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Header ── */}
          <div style={{ padding: "22px 28px 18px 28px" }}>
            <h2
              style={{
                margin: 0,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 700,
                fontSize: "20px",
                lineHeight: "26px",
                color: "#011B2F",
              }}
            >
              Custom Layout
            </h2>
            <p
              style={{
                margin: "4px 0 0 0",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 400,
                fontSize: "13px",
                color: "#6B7280",
              }}
            >
              Design your own seat layout
            </p>
          </div>

          {/* Divider */}
          <div style={{ height: "1px", background: "#E5E7EB", flexShrink: 0 }} />

          {/* ── Body ── */}
          <div
            style={{
              display: "flex",
              gap: "32px",
              padding: "24px 28px 20px 28px",
              overflowY: "auto",
              flex: 1,
              minHeight: 0,
              alignItems: "flex-start",
            }}
          >
            {/* LEFT: Controls  */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "18px",
                minWidth: "215px",
                width: "215px",
                flexShrink: 0,
              }}
            >
              {/* Rows Stepper */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: 700,
                    fontSize: "13px",
                    color: "#011B2F",
                    marginBottom: "8px",
                  }}
                >
                  Rows
                </label>
                <StepperControl
                  value={rows}
                  min={1}
                  max={20}
                  onChange={setRows}
                />
                <span
                  style={{
                    display: "block",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: 400,
                    fontSize: "11px",
                    color: "#6B7280",
                    marginTop: "5px",
                  }}
                >
                  Minimum 1 row, Maximum 20 rows
                </span>
              </div>

              {/* Columns (Left Side) Stepper */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: 700,
                    fontSize: "13px",
                    color: "#011B2F",
                    marginBottom: "8px",
                  }}
                >
                  Columns (Left Side)
                </label>
                <StepperControl
                  value={leftCols}
                  min={1}
                  max={8}
                  onChange={setLeftCols}
                />
                <span
                  style={{
                    display: "block",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: 400,
                    fontSize: "11px",
                    color: "#6B7280",
                    marginTop: "5px",
                  }}
                >
                  Minimum 1 columns, Maximum 8 columns
                </span>
              </div>

              {/* Columns (Right Side) Stepper */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: 700,
                    fontSize: "13px",
                    color: "#011B2F",
                    marginBottom: "8px",
                  }}
                >
                  Columns (Right Side)
                </label>
                <StepperControl
                  value={rightCols}
                  min={1}
                  max={8}
                  onChange={setRightCols}
                />
                <span
                  style={{
                    display: "block",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: 400,
                    fontSize: "11px",
                    color: "#6B7280",
                    marginTop: "5px",
                  }}
                >
                  Minimum 1 columns, Maximum 8 columns
                </span>
              </div>

              {/* Aisle Position Dropdown  */}
              <DropdownSelect
                label="Aisle Position"
                placeholder="Positions"
                value={aislePosition}
                options={AISLE_POSITIONS}
                onChange={setAislePosition}
              />

              {/* Aisle Width Dropdown */}
              <DropdownSelect
                label="Aisle Width"
                placeholder="Width"
                value={aisleWidth}
                options={AISLE_WIDTHS}
                onChange={setAisleWidth}
              />
            </div>

            {/* RIGHT: Seat Layout Preview  */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3
                style={{
                  margin: "0 0 14px 0",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 700,
                  fontSize: "14px",
                  lineHeight: "18px",
                  color: "#011B2F",
                }}
              >
                Seat Layout Preview
              </h3>

              <div
                style={{
                  overflowY: "auto",
                  maxHeight: "380px",
                  paddingRight: "4px",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {seatRows.map((row, rIdx) => {
                    const pos = aislePosition || "Centre";
                    const isNoAisle = pos === "No Aisle";
                    const isLeftAisle = pos === "Left";
                    const isRightAisle = pos === "Right";
                    const isDualAisles = pos === "Dual Aisles";

                    return (
                      <div
                        key={rIdx}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          flexWrap: "nowrap",
                        }}
                      >
                        {/* Dual or Far Left Aisle */}
                        {(isLeftAisle || isDualAisles) && (
                          <AisleBox widthPx={aisleWidthPx} />
                        )}

                        {/* Left seats block */}
                        <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                          {row.left.map((seatNum) => (
                            <SeatBox key={seatNum} num={seatNum} />
                          ))}
                        </div>

                        {/* Center or Dual Aisle */}
                        {(!isNoAisle && !isLeftAisle && !isRightAisle) && (
                          <AisleBox widthPx={aisleWidthPx} />
                        )}

                        {/* Right seats block */}
                        <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                          {row.right.map((seatNum) => (
                            <SeatBox key={seatNum} num={seatNum} />
                          ))}
                        </div>

                        {/* Far Right Aisle */}
                        {isRightAisle && (
                          <AisleBox widthPx={aisleWidthPx} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: "1px", background: "#E5E7EB", flexShrink: 0 }} />

          {/* ── Footer Buttons ── */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: "12px",
              padding: "16px 28px",
              flexShrink: 0,
            }}
          >
            {/* Cancel Button */}
            <button
              type="button"
              onClick={onClose}
              style={{
                height: "44px",
                padding: "0 28px",
                background: "#FFFFFF",
                border: "1.5px solid #D1D5DB",
                borderRadius: "8px",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 600,
                fontSize: "14px",
                color: "#011B2F",
                cursor: "pointer",
                transition: "border-color 0.15s, background 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#9CA3AF";
                e.currentTarget.style.background = "#F9FAFB";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#D1D5DB";
                e.currentTarget.style.background = "#FFFFFF";
              }}
            >
              Cancel
            </button>

            {/* Apply Button */}
            <button
              type="button"
              onClick={handleApply}
              style={{
                height: "44px",
                padding: "0 32px",
                background: "#F4BC43",
                border: "none",
                borderRadius: "8px",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 700,
                fontSize: "14px",
                color: "#011B2F",
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(244, 188, 67, 0.38)",
                transition: "background 0.15s, transform 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#E5AF36";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#F4BC43";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              Apply
            </button>
          </div>
        </div>
      </div>

      {/* Scrollbar styles */}
      <style>{`
        .seating-preview-scroll::-webkit-scrollbar { width: 6px; }
        .seating-preview-scroll::-webkit-scrollbar-track { background: #F9FAFB; border-radius: 4px; }
        .seating-preview-scroll::-webkit-scrollbar-thumb { background: #D1D5DB; border-radius: 4px; }
      `}</style>
    </>
  );
}
