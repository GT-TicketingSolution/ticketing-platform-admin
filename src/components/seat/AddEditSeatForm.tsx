"use client";

import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft, Loader2, Info } from "lucide-react";
import {
  SeatConfigData,
  AisleOrientation,
} from "@/app/(dashboard)/seat-management/types";

export type { SeatConfigData };

interface AddEditSeatFormProps {
  initialData?: SeatConfigData | null;
  onSave: (data: SeatConfigData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const MAX_SEAT_ROWS = Number(process.env.NEXT_PUBLIC_MAX_SEAT_ROWS || 100);
const MAX_SEAT_COLS = Number(process.env.NEXT_PUBLIC_MAX_SEAT_COLS || 100);

export default function AddEditSeatForm({
  initialData,
  onSave,
  onCancel,
  isLoading = false,
}: AddEditSeatFormProps) {
  // Form State
  const [name, setName] = useState<string>("");
  const [rows, setRows] = useState<number | "">(1);
  const [cols, setCols] = useState<number | "">(1);
  const [hasAisle, setHasAisle] = useState<boolean | null>(null);
  const [aisleType, setAisleType] = useState<AisleOrientation>("VERTICAL");
  const [isVerticalAisle, setIsVerticalAisle] = useState<boolean>(true);
  const [isHorizontalAisle, setIsHorizontalAisle] = useState<boolean>(false);
  const [hasMultipleAisles, setHasMultipleAisles] = useState<boolean>(false);
  const [numVerticalAisles, setNumVerticalAisles] = useState<number>(1);
  const [numHorizontalAisles, setNumHorizontalAisles] = useState<number>(1);
  const [aislePosition, setAislePosition] = useState<number>(0);
  const [verticalAislePositions, setVerticalAislePositions] = useState<number[]>([0]);
  const [horizontalAislePositions, setHorizontalAislePositions] = useState<number[]>([0]);
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE" | "">("ACTIVE");
  const [isDraggingAisle, setIsDraggingAisle] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const gridInnerRef = useRef<HTMLDivElement>(null);

  // Errors
  const [errors, setErrors] = useState<{ [k: string]: string }>({});

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || "");
      setRows(initialData.rows || "");
      setCols(initialData.cols || "");
      setHasAisle(initialData.hasAisle);

      const type: AisleOrientation =
        initialData.aisleDirection ||
        (initialData as { aisleType?: AisleOrientation }).aisleType ||
        "VERTICAL";
      const position =
        type === "HORIZONTAL"
          ? (initialData.aisleAfterRow ?? 0)
          : (initialData.aisleAfterCol ?? 0);

      setAisleType(type);
      setIsVerticalAisle(type === "VERTICAL");
      setIsHorizontalAisle(type === "HORIZONTAL");
      setAislePosition(position);

      const s = String(initialData.status || "").toUpperCase();
      setStatus(s === "ACTIVE" ? "ACTIVE" : s === "INACTIVE" ? "INACTIVE" : "ACTIVE");
    } else {
      setName("");
      setRows(1);
      setCols(1);
      setHasAisle(null);
      setAisleType("VERTICAL");
      setIsVerticalAisle(true);
      setIsHorizontalAisle(false);
      setHasMultipleAisles(false);
      setNumVerticalAisles(1);
      setNumHorizontalAisles(1);
      setAislePosition(0);
      setVerticalAislePositions([0]);
      setHorizontalAislePositions([0]);
      setStatus("ACTIVE");
    }
    setErrors({});
  }, [initialData]);

  // Keep aisle position within bounds when row/col count changes
  const effectiveRows = rows === "" ? 1 : Math.max(1, rows);
  const effectiveCols = cols === "" ? 1 : Math.max(1, cols);

  useEffect(() => {
    const vCount = Math.max(1, numVerticalAisles);
    setVerticalAislePositions((prev) => {
      if (prev.length === vCount) {
        return prev.map((p) => Math.min(effectiveCols, p));
      }
      return Array.from({ length: vCount }, (_, idx) => {
        if (prev[idx] !== undefined) return Math.min(effectiveCols, prev[idx]);
        return Math.min(
          effectiveCols,
          idx === 0
            ? aislePosition
            : Math.max(1, Math.floor((effectiveCols * idx) / vCount))
        );
      });
    });
  }, [numVerticalAisles, effectiveCols]);

  useEffect(() => {
    const hCount = Math.max(1, numHorizontalAisles);
    setHorizontalAislePositions((prev) => {
      if (prev.length === hCount) {
        return prev.map((p) => Math.min(effectiveRows, p));
      }
      return Array.from({ length: hCount }, (_, idx) => {
        if (prev[idx] !== undefined) return Math.min(effectiveRows, prev[idx]);
        return Math.min(
          effectiveRows,
          idx === 0
            ? aisleType === "HORIZONTAL"
              ? aislePosition
              : 0
            : Math.max(1, Math.floor((effectiveRows * idx) / hCount))
        );
      });
    });
  }, [numHorizontalAisles, effectiveRows]);

  useEffect(() => {
    if (aisleType === "VERTICAL") {
      if (aislePosition > effectiveCols) {
        setAislePosition(Math.max(0, Math.floor(effectiveCols / 2)));
      }
    } else {
      if (aislePosition > effectiveRows) {
        setAislePosition(Math.max(0, Math.floor(effectiveRows / 2)));
      }
    }
  }, [effectiveRows, effectiveCols, aisleType, aislePosition]);

  const parsedRows = rows === "" ? (cols !== "" ? 1 : 0) : Math.max(0, rows);
  const parsedCols = cols === "" ? (rows !== "" ? 1 : 0) : Math.max(0, cols);
  const displayRows = rows === "" && cols === "" ? 1 : Math.max(1, parsedRows);
  const displayCols = rows === "" && cols === "" ? 1 : Math.max(1, parsedCols);
  const totalSeats = displayRows * displayCols;
  const totalRowWidth = displayCols * 44 + (displayCols - 1) * 8;
  const isSingleSeat =
    (rows === "" || rows === 1) && (cols === "" || cols === 1);

  // ── Bulletproof Pointer-based Drag & Drop for Aisle ──
  const startAislePointerDrag = (
    e: React.PointerEvent,
    dragDirection: "VERTICAL" | "HORIZONTAL" = "VERTICAL",
    aisleIdx: number = 0,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingAisle(true);

    const isVertical = dragDirection === "VERTICAL";

    const handlePointerMove = (moveEv: PointerEvent) => {
      if (!gridInnerRef.current) return;
      const rect = gridInnerRef.current.getBoundingClientRect();

      if (isVertical) {
        const relativeX = moveEv.clientX - rect.left - 42; // skip R label column width (36px + 6px)
        const colWidth = 52; // 44px + 8px
        const calculatedSlot = Math.max(
          0,
          Math.min(displayCols, Math.round(relativeX / colWidth)),
        );
        setVerticalAislePositions((prev) => {
          const next = [...prev];
          next[aisleIdx] = calculatedSlot;
          return next;
        });
        if (aisleIdx === 0) {
          setAislePosition(calculatedSlot);
        }
      } else {
        const relativeY = moveEv.clientY - rect.top - 28; // skip col header height (20px + 8px)
        const rowHeight = 46; // 38px + 8px
        const calculatedSlot = Math.max(
          0,
          Math.min(displayRows, Math.round(relativeY / rowHeight)),
        );
        setHorizontalAislePositions((prev) => {
          const next = [...prev];
          next[aisleIdx] = calculatedSlot;
          return next;
        });
        if (aisleIdx === 0) {
          setAislePosition(calculatedSlot);
        }
      }
    };

    const handlePointerUp = () => {
      setIsDraggingAisle(false);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
  };

  const handleRowChange = (val: string) => {
    const clean = val.replace(/\D/g, "");
    if (clean === "") {
      setRows("");
      setErrors((prev) => ({ ...prev, rows: "Row count must be at least 1" }));
      return;
    }
    const num = parseInt(clean, 10);
    if (num < 1) {
      setRows(0);
      setErrors((prev) => ({
        ...prev,
        rows: "Row count must be at least 1",
      }));
    } else if (num > MAX_SEAT_ROWS) {
      setRows(MAX_SEAT_ROWS);
      setErrors((prev) => ({
        ...prev,
        rows: `Maximum ${MAX_SEAT_ROWS} rows allowed`,
      }));
    } else {
      setRows(num);
      if (errors.rows) setErrors((prev) => ({ ...prev, rows: "" }));
    }
  };

  const handleRowBlur = () => {
    if (rows === "" || rows < 1) {
      setErrors((prev) => ({ ...prev, rows: "Row count must be at least 1" }));
    }
  };

  const handleColChange = (val: string) => {
    const clean = val.replace(/\D/g, "");
    if (clean === "") {
      setCols("");
      setErrors((prev) => ({
        ...prev,
        cols: "Column count must be at least 1",
      }));
      return;
    }
    const num = parseInt(clean, 10);
    if (num < 1) {
      setCols(0);
      setErrors((prev) => ({
        ...prev,
        cols: "Column count must be at least 1",
      }));
    } else if (num > MAX_SEAT_COLS) {
      setCols(MAX_SEAT_COLS);
      setErrors((prev) => ({
        ...prev,
        cols: `Maximum ${MAX_SEAT_COLS} columns allowed`,
      }));
    } else {
      setCols(num);
      if (errors.cols) setErrors((prev) => ({ ...prev, cols: "" }));
    }
  };

  const handleColBlur = () => {
    if (cols === "" || cols < 1) {
      setErrors((prev) => ({
        ...prev,
        cols: "Column count must be at least 1",
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [k: string]: string } = {};

    if (!name.trim()) {
      newErrors.name = "Seat name is required";
    }

    if (rows === "" || rows < 1) {
      newErrors.rows = "Row count must be at least 1";
    } else if (rows > MAX_SEAT_ROWS) {
      newErrors.rows = `Maximum ${MAX_SEAT_ROWS} rows allowed`;
    }

    if (cols === "" || cols < 1) {
      newErrors.cols = "Column count must be at least 1";
    } else if (cols > MAX_SEAT_COLS) {
      newErrors.cols = `Maximum ${MAX_SEAT_COLS} columns allowed`;
    }

    if (hasAisle === null) {
      newErrors.hasAisle = "Please select aisle option (Yes / No)";
    }

    if (!status) {
      newErrors.status = "Please select status (Active / Inactive)";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});

    const finalRows = Number(rows);
    const finalCols = Number(cols);
    const pos = Math.max(0, aislePosition);
    const effectiveAisleDirection: AisleOrientation = isVerticalAisle ? "VERTICAL" : "HORIZONTAL";

    onSave({
      id: initialData?.id,
      name: name.trim(),
      rows: finalRows,
      cols: finalCols,
      hasAisle: !!hasAisle,
      aisleDirection: effectiveAisleDirection,
      aisleAfterCol: effectiveAisleDirection === "VERTICAL" ? pos : 0,
      aisleAfterRow: effectiveAisleDirection === "HORIZONTAL" ? pos : 0,
      status: status as "ACTIVE" | "INACTIVE",
    });
  };

  // Determine which preview layout to render
  const isMultiDirection =
    hasAisle && (hasMultipleAisles || (isVerticalAisle && isHorizontalAisle));
  const isVerticalOnly =
    hasAisle && isVerticalAisle && !isHorizontalAisle && !hasMultipleAisles;
  const isHorizontalOnly =
    hasAisle && isHorizontalAisle && !isVerticalAisle && !hasMultipleAisles;

  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        boxSizing: "border-box",
      }}
    >
      {/* ── Top Header / Breadcrumb ── */}
      <button
        type="button"
        onClick={onCancel}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontWeight: 700,
          fontSize: "14px",
          color: "#011B2F",
          padding: "6px 0",
          width: "fit-content",
        }}
      >
        <ArrowLeft size={18} color="#011B2F" strokeWidth={2.5} />
        <span>Back to Seat Management</span>
      </button>

      {/* ── Main Form: Left Settings Cards & Right Preview ── */}
      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          gap: "24px",
          width: "100%",
          alignItems: "flex-start",
        }}
        className="seat-form-container"
      >
        {/* ── LEFT COLUMN ── */}
        <div
          style={{
            width: "350px",
            minWidth: "350px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          {/* Card 1: Seat Details */}
          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid #E5E7EB",
              borderRadius: "12px",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            <h3
              style={{
                margin: 0,
                fontWeight: 700,
                fontSize: "16px",
                color: "#011B2F",
              }}
            >
              Seat Details
            </h3>

            {/* 1. Name of Seat */}
            <div>
              <label
                style={{
                  display: "block",
                  fontWeight: 700,
                  fontSize: "13px",
                  color: "#011B2F",
                  marginBottom: "6px",
                }}
              >
                Name of Seat <span style={{ color: "#DC2626" }}>*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Toy Train Coach A, VIP Standalone Seat"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
                }}
                style={{
                  width: "100%",
                  height: "40px",
                  background: "#FFFFFF",
                  border: errors.name
                    ? "1.5px solid #DC2626"
                    : "1.5px solid #D1D5DB",
                  borderRadius: "8px",
                  padding: "0 12px",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 600,
                  fontSize: "13px",
                  color: "#011B2F",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              {errors.name && (
                <span
                  style={{
                    fontSize: "11px",
                    color: "#DC2626",
                    marginTop: "4px",
                    display: "block",
                    fontWeight: 500,
                  }}
                >
                  {errors.name}
                </span>
              )}
            </div>

            {/* 2. Row and Column Fields */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
              }}
            >
              {/* Row */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontWeight: 700,
                    fontSize: "13px",
                    color: "#011B2F",
                    marginBottom: "4px",
                  }}
                >
                  Row <span style={{ color: "#DC2626" }}>*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Min: 1"
                  value={rows === "" ? "" : rows}
                  onChange={(e) => handleRowChange(e.target.value)}
                  onBlur={handleRowBlur}
                  style={{
                    width: "100%",
                    height: "40px",
                    background: "#FFFFFF",
                    border: errors.rows
                      ? "1.5px solid #DC2626"
                      : "1.5px solid #D1D5DB",
                    borderRadius: "8px",
                    padding: "0 12px",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: 700,
                    fontSize: "14px",
                    color: "#011B2F",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                <span
                  style={{
                    fontSize: "10px",
                    color: "#6B7280",
                    marginTop: "2px",
                    display: "block",
                  }}
                >
                  Min: 1 | Max: {MAX_SEAT_ROWS}
                </span>
                {errors.rows && (
                  <span
                    style={{
                      fontSize: "10px",
                      color: "#DC2626",
                      marginTop: "2px",
                      display: "block",
                      fontWeight: 500,
                    }}
                  >
                    {errors.rows}
                  </span>
                )}
              </div>

              {/* Column */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontWeight: 700,
                    fontSize: "13px",
                    color: "#011B2F",
                    marginBottom: "4px",
                  }}
                >
                  Column <span style={{ color: "#DC2626" }}>*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Min: 1"
                  value={cols === "" ? "" : cols}
                  onChange={(e) => handleColChange(e.target.value)}
                  onBlur={handleColBlur}
                  style={{
                    width: "100%",
                    height: "40px",
                    background: "#FFFFFF",
                    border: errors.cols
                      ? "1.5px solid #DC2626"
                      : "1.5px solid #D1D5DB",
                    borderRadius: "8px",
                    padding: "0 12px",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: 700,
                    fontSize: "14px",
                    color: "#011B2F",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                <span
                  style={{
                    fontSize: "10px",
                    color: "#6B7280",
                    marginTop: "2px",
                    display: "block",
                  }}
                >
                  Min: 1 | Max: {MAX_SEAT_COLS}
                </span>
                {errors.cols && (
                  <span
                    style={{
                      fontSize: "10px",
                      color: "#DC2626",
                      marginTop: "2px",
                      display: "block",
                      fontWeight: 500,
                    }}
                  >
                    {errors.cols}
                  </span>
                )}
              </div>
            </div>

            {/* Aisle Configuration Section */}
            <div
              style={{
                borderTop: "1px solid #F1F5F9",
                paddingTop: "12px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <h4
                style={{
                  margin: 0,
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "#011B2F",
                }}
              >
                Aisle Configuration
              </h4>

              {/* Aisle Position (Yes / No) */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontWeight: 700,
                    fontSize: "13px",
                    color: "#011B2F",
                    marginBottom: "8px",
                  }}
                >
                  Aisle Position <span style={{ color: "#DC2626" }}>*</span>
                </label>

                <div style={{ display: "flex", gap: "10px" }}>
                  {/* YES Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setHasAisle(true);
                      setAislePosition(0);
                      if (errors.hasAisle)
                        setErrors((prev) => ({ ...prev, hasAisle: "" }));
                    }}
                    style={{
                      flex: 1,
                      height: "38px",
                      borderRadius: "8px",
                      border:
                        hasAisle === true
                          ? "2px solid #2372A5"
                          : errors.hasAisle
                            ? "1.5px solid #DC2626"
                            : "1.5px solid #D1D5DB",
                      background: hasAisle === true ? "#F0F7FF" : "#FFFFFF",
                      color: hasAisle === true ? "#2372A5" : "#4B5563",
                      fontWeight: 700,
                      fontSize: "13px",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    Yes
                  </button>

                  {/* NO Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setHasAisle(false);
                      if (errors.hasAisle)
                        setErrors((prev) => ({ ...prev, hasAisle: "" }));
                    }}
                    style={{
                      flex: 1,
                      height: "38px",
                      borderRadius: "8px",
                      border:
                        hasAisle === false
                          ? "2px solid #2372A5"
                          : errors.hasAisle
                            ? "1.5px solid #DC2626"
                            : "1.5px solid #D1D5DB",
                      background: hasAisle === false ? "#F0F7FF" : "#FFFFFF",
                      color: hasAisle === false ? "#2372A5" : "#4B5563",
                      fontWeight: 700,
                      fontSize: "13px",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    No
                  </button>
                </div>

                {errors.hasAisle && (
                  <span
                    style={{
                      fontSize: "11px",
                      color: "#DC2626",
                      marginTop: "5px",
                      display: "block",
                      fontWeight: 500,
                    }}
                  >
                    {errors.hasAisle}
                  </span>
                )}
              </div>

              {/* Aisle Direction Controls (if Aisle is YES) */}
              {hasAisle === true && (
                <div
                  style={{
                    marginTop: "4px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  {/* Aisle Direction Header */}
                  <div>
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: 700,
                        color: "#0F172A",
                        display: "block",
                      }}
                    >
                      Aisle Direction <span style={{ color: "#DC2626" }}>*</span>
                    </span>
                    <span
                      style={{
                        fontSize: "12px",
                        color: "#64748B",
                        display: "block",
                        marginTop: "2px",
                      }}
                    >
                      Select one or both directions for aisles.
                    </span>
                  </div>

                  {/* Two Direction Cards: Vertical & Horizontal */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "10px",
                    }}
                  >
                    {/* Vertical Option */}
                    <div
                      onClick={() => {
                        if (hasMultipleAisles) return;
                        const nextVal = !isVerticalAisle;
                        if (!nextVal && !isHorizontalAisle) {
                          setIsHorizontalAisle(true);
                        }
                        setIsVerticalAisle(nextVal);
                        setAisleType(nextVal ? "VERTICAL" : "HORIZONTAL");
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "10px 12px",
                        borderRadius: "8px",
                        border: hasMultipleAisles
                          ? "1.5px solid #CBD5E1"
                          : isVerticalAisle
                            ? "1.5px solid #0284C7"
                            : "1.5px solid #E2E8F0",
                        background: hasMultipleAisles
                          ? "#F8FAFC"
                          : isVerticalAisle
                            ? "#F0F7FF"
                            : "#FFFFFF",
                        cursor: hasMultipleAisles ? "not-allowed" : "pointer",
                        opacity: hasMultipleAisles ? 0.85 : 1,
                        transition: "all 0.15s ease",
                        userSelect: "none",
                      }}
                    >
                      <div
                        style={{
                          width: "18px",
                          height: "18px",
                          borderRadius: "4px",
                          border: hasMultipleAisles || isVerticalAisle
                            ? "1.5px solid #0284C7"
                            : "1.5px solid #CBD5E1",
                          background: hasMultipleAisles || isVerticalAisle ? "#0284C7" : "#FFFFFF",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {(hasMultipleAisles || isVerticalAisle) && (
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 12 12"
                            fill="none"
                          >
                            <path
                              d="M2.5 6L5 8.5L9.5 3.5"
                              stroke="#FFFFFF"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </div>
                      <span
                        style={{
                          fontSize: "14px",
                          fontWeight: 700,
                          color: hasMultipleAisles ? "#94A3B8" : isVerticalAisle ? "#0284C7" : "#64748B",
                          letterSpacing: "1px",
                        }}
                      >
                        ||
                      </span>
                      <span
                        style={{
                          fontSize: "13px",
                          fontWeight: 700,
                          color: hasMultipleAisles ? "#94A3B8" : isVerticalAisle ? "#0C2A42" : "#64748B",
                        }}
                      >
                        Vertical
                      </span>
                    </div>

                    {/* Horizontal Option */}
                    <div
                      onClick={() => {
                        if (hasMultipleAisles) return;
                        const nextVal = !isHorizontalAisle;
                        if (!nextVal && !isVerticalAisle) {
                          setIsVerticalAisle(true);
                        }
                        setIsHorizontalAisle(nextVal);
                        setAisleType(nextVal ? "HORIZONTAL" : "VERTICAL");
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "10px 12px",
                        borderRadius: "8px",
                        border: hasMultipleAisles
                          ? "1.5px solid #CBD5E1"
                          : isHorizontalAisle
                            ? "1.5px solid #0284C7"
                            : "1.5px solid #E2E8F0",
                        background: hasMultipleAisles
                          ? "#F8FAFC"
                          : isHorizontalAisle
                            ? "#F0F7FF"
                            : "#FFFFFF",
                        cursor: hasMultipleAisles ? "not-allowed" : "pointer",
                        opacity: hasMultipleAisles ? 0.85 : 1,
                        transition: "all 0.15s ease",
                        userSelect: "none",
                      }}
                    >
                      <div
                        style={{
                          width: "18px",
                          height: "18px",
                          borderRadius: "4px",
                          border: hasMultipleAisles || isHorizontalAisle
                            ? "1.5px solid #0284C7"
                            : "1.5px solid #CBD5E1",
                          background: hasMultipleAisles || isHorizontalAisle ? "#0284C7" : "#FFFFFF",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {(hasMultipleAisles || isHorizontalAisle) && (
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 12 12"
                            fill="none"
                          >
                            <path
                              d="M2.5 6L5 8.5L9.5 3.5"
                              stroke="#FFFFFF"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </div>
                      <span
                        style={{
                          fontSize: "14px",
                          fontWeight: 700,
                          color: hasMultipleAisles ? "#94A3B8" : isHorizontalAisle ? "#0284C7" : "#64748B",
                          letterSpacing: "0.5px",
                        }}
                      >
                        =
                      </span>
                      <span
                        style={{
                          fontSize: "13px",
                          fontWeight: 700,
                          color: hasMultipleAisles ? "#94A3B8" : isHorizontalAisle ? "#0C2A42" : "#64748B",
                        }}
                      >
                        Horizontal
                      </span>
                    </div>
                  </div>

                  {/* Multiple Aisles Card */}
                  <div
                    style={{
                      marginTop: "4px",
                      padding: "12px 14px",
                      background: "#FFFFFF",
                      border: "1.5px solid #E2E8F0",
                      borderRadius: "10px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                    }}
                  >
                    <div
                      onClick={() => {
                        const nextVal = !hasMultipleAisles;
                        setHasMultipleAisles(nextVal);
                        if (nextVal) {
                          setIsVerticalAisle(true);
                          setIsHorizontalAisle(true);
                          setNumVerticalAisles(1);
                          setNumHorizontalAisles(1);
                        }
                      }}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "10px",
                        cursor: "pointer",
                        userSelect: "none",
                      }}
                    >
                      <div
                        style={{
                          width: "18px",
                          height: "18px",
                          borderRadius: "4px",
                          border: hasMultipleAisles
                            ? "1.5px solid #0284C7"
                            : "1.5px solid #CBD5E1",
                          background: hasMultipleAisles ? "#0284C7" : "#FFFFFF",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          marginTop: "2px",
                        }}
                      >
                        {hasMultipleAisles && (
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 12 12"
                            fill="none"
                          >
                            <path
                              d="M2.5 6L5 8.5L9.5 3.5"
                              stroke="#FFFFFF"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </div>
                      <div>
                        <span
                          style={{
                            fontSize: "13px",
                            fontWeight: 700,
                            color: "#0F172A",
                            display: "block",
                          }}
                        >
                          Multiple Aisles
                        </span>
                        <span
                          style={{
                            fontSize: "11px",
                            color: "#64748B",
                            display: "block",
                            marginTop: "2px",
                          }}
                        >
                          Allow more than one aisle in the selected direction(s).
                        </span>
                      </div>
                    </div>

                    {/* Inputs when Multiple Aisles is checked */}
                    {hasMultipleAisles && (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "12px",
                          paddingTop: "6px",
                        }}
                      >
                        <div>
                          <label
                            style={{
                              display: "block",
                              fontWeight: 700,
                              fontSize: "12px",
                              color: "#0F172A",
                              marginBottom: "4px",
                            }}
                          >
                            Multiple Vertical
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={100}
                            value={numVerticalAisles}
                            onChange={(e) => {
                              const v = parseInt(e.target.value, 10);
                              setNumVerticalAisles(
                                isNaN(v) ? 1 : Math.max(1, v),
                              );
                            }}
                            style={{
                              width: "100%",
                              height: "38px",
                              background: "#FFFFFF",
                              border: "1.5px solid #CBD5E1",
                              borderRadius: "8px",
                              padding: "0 10px",
                              fontSize: "13px",
                              fontWeight: 600,
                              color: "#0F172A",
                              outline: "none",
                              boxSizing: "border-box",
                            }}
                          />
                        </div>

                        <div>
                          <label
                            style={{
                              display: "block",
                              fontWeight: 700,
                              fontSize: "12px",
                              color: "#0F172A",
                              marginBottom: "4px",
                            }}
                          >
                            Multiple Horizontal
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={100}
                            value={numHorizontalAisles}
                            onChange={(e) => {
                              const v = parseInt(e.target.value, 10);
                              setNumHorizontalAisles(
                                isNaN(v) ? 1 : Math.max(1, v),
                              );
                            }}
                            style={{
                              width: "100%",
                              height: "38px",
                              background: "#FFFFFF",
                              border: "1.5px solid #CBD5E1",
                              borderRadius: "8px",
                              padding: "0 10px",
                              fontSize: "13px",
                              fontWeight: 600,
                              color: "#0F172A",
                              outline: "none",
                              boxSizing: "border-box",
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Status */}
          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid #E5E7EB",
              borderRadius: "12px",
              padding: "16px 20px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            <label
              style={{
                display: "block",
                fontWeight: 700,
                fontSize: "13px",
                color: "#011B2F",
                marginBottom: "8px",
              }}
            >
              Status <span style={{ color: "#DC2626" }}>*</span>
            </label>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                onClick={() => {
                  setStatus("ACTIVE");
                  if (errors.status)
                    setErrors((prev) => ({ ...prev, status: "" }));
                }}
                style={{
                  flex: 1,
                  height: "38px",
                  borderRadius: "8px",
                  border:
                    status === "ACTIVE"
                      ? "2px solid #10B981"
                      : errors.status
                        ? "1.5px solid #DC2626"
                        : "1.5px solid #D1D5DB",
                  background: status === "ACTIVE" ? "#ECFDF5" : "#FFFFFF",
                  color: status === "ACTIVE" ? "#065F46" : "#4B5563",
                  fontWeight: 700,
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatus("INACTIVE");
                  if (errors.status)
                    setErrors((prev) => ({ ...prev, status: "" }));
                }}
                style={{
                  flex: 1,
                  height: "38px",
                  borderRadius: "8px",
                  border:
                    status === "INACTIVE"
                      ? "2px solid #EF4444"
                      : errors.status
                        ? "1.5px solid #DC2626"
                        : "1.5px solid #D1D5DB",
                  background: status === "INACTIVE" ? "#FEE2E2" : "#FFFFFF",
                  color: status === "INACTIVE" ? "#991B1B" : "#4B5563",
                  fontWeight: 700,
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                Inactive
              </button>
            </div>

            {errors.status && (
              <span
                style={{
                  fontSize: "11px",
                  color: "#DC2626",
                  marginTop: "5px",
                  display: "block",
                  fontWeight: 500,
                }}
              >
                {errors.status}
              </span>
            )}
          </div>

          {/* Full-Width Save Seat Layout Button */}
          <div>
            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: "100%",
                height: "44px",
                background: isLoading ? "#E5E7EB" : "#FBB03B",
                border: "none",
                borderRadius: "8px",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 700,
                fontSize: "14px",
                color: isLoading ? "#9CA3AF" : "#011B2F",
                cursor: isLoading ? "not-allowed" : "pointer",
                boxShadow: isLoading
                  ? "none"
                  : "0 4px 12px rgba(251,176,59,0.35)",
                transition: "all 0.18s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              {isLoading ? (
                <>
                  <Loader2
                    size={16}
                    style={{ animation: "spin 1s linear infinite" }}
                  />
                  <span>Saving...</span>
                </>
              ) : (
                <span>
                  {initialData ? "Update Seat Layout" : "Save Seat Layout"}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ── RIGHT COLUMN: Seat Layout Preview ── */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            minWidth: 0,
          }}
        >
          {/* Preview Card */}
          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid #E5E7EB",
              borderRadius: "12px",
              padding: "20px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "4px",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontWeight: 700,
                  fontSize: "15px",
                  color: "#011B2F",
                }}
              >
                Seat Layout Preview
              </h3>

              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  color: isSingleSeat ? "#047857" : "#0C2A42",
                  background: isSingleSeat ? "#D1FAE5" : "#E0F2FE",
                  padding: "4px 12px",
                  borderRadius: "6px",
                  border: isSingleSeat
                    ? "1px solid #A7F3D0"
                    : "1px solid #BAE6FD",
                }}
              >
                {isSingleSeat
                  ? "Single Standalone Seat (1 Seat)"
                  : `${displayRows} Rows × ${displayCols} Cols (${totalSeats} Seats)`}
              </span>
            </div>

            {/* Canvas Viewport */}
            <div
              ref={previewRef}
              style={{
                minHeight: "360px",
                background: "#FFFFFF",
                border: "1.5px solid #E2E8F0",
                borderRadius: "10px",
                overflow: "auto",
                position: "relative",
              }}
            >
              <div
                ref={gridInnerRef}
                style={{
                  minWidth: "max-content",
                  minHeight: "max-content",
                  margin: "auto",
                  padding: "24px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  userSelect: isDraggingAisle ? "none" : "auto",
                }}
              >
                {/* ── CASE 1: MULTIPLE AISLES / BOTH DIRECTIONS (Image 4) ── */}
                {isMultiDirection ? (
                  (() => {
                    const vCount = Math.max(1, numVerticalAisles);
                    const hCount = Math.max(1, numHorizontalAisles);

                    return (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                        {/* 1. Column Headers & Vertical Aisle Header Badges */}
                        <div style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
                          {/* Left Spacer for R Labels */}
                          <div style={{ width: "36px", marginRight: "6px", flexShrink: 0 }} />

                          {Array.from({ length: displayCols + 1 }, (_, slotIdx) => {
                            const vAislesHere = Array.from({ length: vCount }, (_, idx) => idx).filter(
                              (idx) => (verticalAislePositions[idx] ?? 0) === slotIdx
                            );
                            return (
                              <React.Fragment key={`m-col-slot-${slotIdx}`}>
                                {vAislesHere.length > 0 && (
                                  <div
                                    style={{
                                      display: "flex",
                                      gap: "8px",
                                      flexShrink: 0,
                                      margin:
                                        slotIdx === 0
                                          ? "0 8px 0 0"
                                          : slotIdx === displayCols
                                            ? "0 0 0 8px"
                                            : "0 8px",
                                    }}
                                  >
                                    {vAislesHere.map((vIdx) => (
                                      <div
                                        key={`v-aisle-pill-${vIdx}`}
                                        onPointerDown={(e) => startAislePointerDrag(e, "VERTICAL", vIdx)}
                                        style={{
                                          width: "52px",
                                          height: "20px",
                                          fontSize: "9px",
                                          fontWeight: 800,
                                          color: "#0369A1",
                                          background: "rgba(224, 242, 254, 0.85)",
                                          border: "1px solid #93C5FD",
                                          borderRadius: "4px",
                                          padding: "2px 4px",
                                          whiteSpace: "nowrap",
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "space-between",
                                          boxSizing: "border-box",
                                          flexShrink: 0,
                                          cursor: "grab",
                                          userSelect: "none",
                                        }}
                                        title={`Grab & drag or click arrows to move Vertical Aisle ${vCount > 1 ? vIdx + 1 : ""}`}
                                      >
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setVerticalAislePositions((prev) => {
                                              const next = [...prev];
                                              next[vIdx] = Math.max(0, (next[vIdx] ?? 0) - 1);
                                              if (vIdx === 0) setAislePosition(next[vIdx]);
                                              return next;
                                            });
                                          }}
                                          disabled={(verticalAislePositions[vIdx] ?? 0) === 0}
                                          style={{
                                            border: "none",
                                            background: "transparent",
                                            cursor:
                                              (verticalAislePositions[vIdx] ?? 0) === 0
                                                ? "default"
                                                : "pointer",
                                            padding: "0",
                                            fontSize: "10px",
                                            fontWeight: 900,
                                            color:
                                              (verticalAislePositions[vIdx] ?? 0) === 0
                                                ? "#CBD5E1"
                                                : "#0284C7",
                                            lineHeight: 1,
                                          }}
                                          title={`Move Vertical Aisle ${vCount > 1 ? vIdx + 1 : ""} Left`}
                                        >
                                          ◀
                                        </button>
                                        <span>{vCount > 1 ? `AISLE ${vIdx + 1}` : "AISLE"}</span>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setVerticalAislePositions((prev) => {
                                              const next = [...prev];
                                              next[vIdx] = Math.min(displayCols, (next[vIdx] ?? 0) + 1);
                                              if (vIdx === 0) setAislePosition(next[vIdx]);
                                              return next;
                                            });
                                          }}
                                          disabled={
                                            (verticalAislePositions[vIdx] ?? 0) === displayCols
                                          }
                                          style={{
                                            border: "none",
                                            background: "transparent",
                                            cursor:
                                              (verticalAislePositions[vIdx] ?? 0) === displayCols
                                                ? "default"
                                                : "pointer",
                                            padding: "0",
                                            fontSize: "10px",
                                            fontWeight: 900,
                                            color:
                                              (verticalAislePositions[vIdx] ?? 0) === displayCols
                                                ? "#CBD5E1"
                                                : "#0284C7",
                                            lineHeight: 1,
                                          }}
                                          title={`Move Vertical Aisle ${vCount > 1 ? vIdx + 1 : ""} Right`}
                                        >
                                          ▶
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {slotIdx > 0 && (
                                  <div
                                    key={`m-col-${slotIdx}`}
                                    style={{
                                      width: "44px",
                                      height: "20px",
                                      textAlign: "center",
                                      fontSize: "11px",
                                      fontWeight: 800,
                                      color: "#64748B",
                                      background: "#F1F5F9",
                                      borderRadius: "4px",
                                      padding: "2px 0",
                                      marginRight:
                                        slotIdx === displayCols && vAislesHere.length === 0
                                          ? "0px"
                                          : vAislesHere.length > 0
                                            ? "0px"
                                            : "8px",
                                      flexShrink: 0,
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      boxSizing: "border-box",
                                    }}
                                  >
                                    C{slotIdx}
                                  </div>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </div>

                        {/* 2. Grid Rows Interleaved with Horizontal Aisles */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          {Array.from({ length: displayRows + 1 }, (_, rSlotIdx) => {
                            const hAislesHere = Array.from({ length: hCount }, (_, idx) => idx).filter(
                              (idx) => (horizontalAislePositions[idx] ?? 0) === rSlotIdx
                            );

                            return (
                              <React.Fragment key={`m-rslot-${rSlotIdx}`}>
                                {/* Horizontal Aisle(s) at this row slot */}
                                {hAislesHere.map((hIdx) => (
                                  <div
                                    key={`m-h-aisle-${hIdx}`}
                                    style={{
                                      display: "flex",
                                      alignItems: "stretch",
                                      marginBottom: "0px",
                                      position: "relative",
                                      zIndex: 2,
                                    }}
                                  >
                                    {/* Left Badge: ▲ AISLE ▼ */}
                                    <div
                                      onPointerDown={(e) => startAislePointerDrag(e, "HORIZONTAL", hIdx)}
                                      style={{
                                        width: "36px",
                                        height: "38px",
                                        background: "rgba(224, 242, 254, 0.85)",
                                        border: "1px solid #93C5FD",
                                        borderRadius: "4px",
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        padding: "2px 0",
                                        marginRight: "6px",
                                        flexShrink: 0,
                                        boxSizing: "border-box",
                                        cursor: "grab",
                                        userSelect: "none",
                                      }}
                                      title={`Grab & drag or click arrows to move Horizontal Aisle ${hCount > 1 ? hIdx + 1 : ""}`}
                                    >
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setHorizontalAislePositions((prev) => {
                                            const next = [...prev];
                                            next[hIdx] = Math.max(0, (next[hIdx] ?? 0) - 1);
                                            if (hIdx === 0) setAislePosition(next[hIdx]);
                                            return next;
                                          });
                                        }}
                                        disabled={(horizontalAislePositions[hIdx] ?? 0) === 0}
                                        style={{
                                          border: "none",
                                          background: "transparent",
                                          cursor: (horizontalAislePositions[hIdx] ?? 0) === 0 ? "default" : "pointer",
                                          padding: "0",
                                          fontSize: "9px",
                                          fontWeight: 900,
                                          color: (horizontalAislePositions[hIdx] ?? 0) === 0 ? "#CBD5E1" : "#0284C7",
                                          lineHeight: 1,
                                        }}
                                        title={`Move Horizontal Aisle ${hCount > 1 ? hIdx + 1 : ""} Up`}
                                      >
                                        ▲
                                      </button>
                                      <span style={{ fontSize: "8px", fontWeight: 800, color: "#0369A1" }}>
                                        {hCount > 1 ? `AISLE ${hIdx + 1}` : "AISLE"}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setHorizontalAislePositions((prev) => {
                                            const next = [...prev];
                                            next[hIdx] = Math.min(displayRows, (next[hIdx] ?? 0) + 1);
                                            if (hIdx === 0) setAislePosition(next[hIdx]);
                                            return next;
                                          });
                                        }}
                                        disabled={(horizontalAislePositions[hIdx] ?? 0) === displayRows}
                                        style={{
                                          border: "none",
                                          background: "transparent",
                                          cursor: (horizontalAislePositions[hIdx] ?? 0) === displayRows ? "default" : "pointer",
                                          padding: "0",
                                          fontSize: "9px",
                                          fontWeight: 900,
                                          color: (horizontalAislePositions[hIdx] ?? 0) === displayRows ? "#CBD5E1" : "#0284C7",
                                          lineHeight: 1,
                                        }}
                                        title={`Move Horizontal Aisle ${hCount > 1 ? hIdx + 1 : ""} Down`}
                                      >
                                        ▼
                                      </button>
                                    </div>

                                    {/* Horizontal Corridor + Intersections across Columns */}
                                    <div
                                      onPointerDown={(e) => startAislePointerDrag(e, "HORIZONTAL", hIdx)}
                                      style={{
                                        display: "flex",
                                        alignItems: "stretch",
                                        cursor: "grab",
                                        userSelect: "none",
                                        touchAction: "none",
                                      }}
                                      title={`Grab & drag Horizontal Aisle ${hCount > 1 ? hIdx + 1 : ""} to reposition`}
                                    >
                                      {Array.from({ length: displayCols + 1 }, (_, slotIdx) => {
                                        const vAislesHere = Array.from({ length: vCount }, (_, idx) => idx).filter(
                                          (idx) => (verticalAislePositions[idx] ?? 0) === slotIdx
                                        );
                                        const isEnd = slotIdx === displayCols && vAislesHere.length === 0;

                                        return (
                                          <React.Fragment key={`h-seg-${hIdx}-${slotIdx}`}>
                                            {/* Intersections at slotIdx */}
                                            {vAislesHere.map((vIdx, i) => {
                                              const isLast = slotIdx === displayCols && i === vAislesHere.length - 1;
                                              const isTopLeft = rSlotIdx === 0 && slotIdx === 0;
                                              return (
                                                <div
                                                  key={`h-intersect-${hIdx}-${slotIdx}-${vIdx}`}
                                                  style={{
                                                    width: "52px",
                                                    height: "38px",
                                                    background: isDraggingAisle
                                                      ? "rgba(186, 230, 253, 0.95)"
                                                      : "rgba(224, 242, 254, 0.75)",
                                                    borderTop: "2px dashed #0284C7",
                                                    borderLeft: isTopLeft ? "none" : "2px dashed #0284C7",
                                                    borderBottom: isTopLeft ? "none" : "2px dashed #0284C7",
                                                    borderRight: isLast ? "2px dashed #0284C7" : "none",
                                                    borderRadius: isLast ? "0 8px 8px 0" : "0",
                                                    boxSizing: "border-box",
                                                    flexShrink: 0,
                                                    marginRight: "0px",
                                                  }}
                                                />
                                              );
                                            })}

                                            {/* Corridor across Column slotIdx */}
                                            {slotIdx > 0 && (
                                              <div
                                                style={{
                                                  width: "44px",
                                                  height: "38px",
                                                  background: isDraggingAisle
                                                    ? "rgba(186, 230, 253, 0.95)"
                                                    : "rgba(224, 242, 254, 0.75)",
                                                  borderTop: "2px dashed #0284C7",
                                                  borderBottom: "2px dashed #0284C7",
                                                  borderLeft: "none",
                                                  borderRight: isEnd ? "2px dashed #0284C7" : "none",
                                                  borderRadius: isEnd ? "0 8px 8px 0" : "0",
                                                  display: "flex",
                                                  alignItems: "center",
                                                  justifyContent: "center",
                                                  fontSize: "11px",
                                                  fontWeight: 800,
                                                  color: "#0369A1",
                                                  letterSpacing: "1px",
                                                  boxSizing: "border-box",
                                                  flexShrink: 0,
                                                  marginRight: "0px",
                                                }}
                                              >
                                                {slotIdx === Math.ceil(displayCols / 2) && <span>AISLE</span>}
                                              </div>
                                            )}
                                          </React.Fragment>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ))}

                                {/* Seat Row (for rowNum = rSlotIdx + 1, when rSlotIdx < displayRows) */}
                                {rSlotIdx < displayRows && (() => {
                                  const rowNum = rSlotIdx + 1;
                                  return (
                                    <div
                                      key={`m-seat-row-${rowNum}`}
                                      style={{ display: "flex", alignItems: "center" }}
                                    >
                                      {/* Left R-Label */}
                                      <span
                                        style={{
                                          width: "36px",
                                          height: "38px",
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          fontSize: "11px",
                                          fontWeight: 800,
                                          color: "#64748B",
                                          background: "#F1F5F9",
                                          borderRadius: "4px",
                                          marginRight: "6px",
                                          flexShrink: 0,
                                          boxSizing: "border-box",
                                        }}
                                      >
                                        R{rowNum}
                                      </span>

                                      {/* Row cells across column slots */}
                                      {Array.from({ length: displayCols + 1 }, (_, slotIdx) => {
                                        const vAislesHere = Array.from({ length: vCount }, (_, idx) => idx).filter(
                                          (idx) => (verticalAislePositions[idx] ?? 0) === slotIdx
                                        );

                                        return (
                                          <React.Fragment key={`m-sc-slot-${rowNum}-${slotIdx}`}>
                                            {/* Vertical Aisle Segment(s) at slotIdx */}
                                            {vAislesHere.length > 0 && (
                                              <div
                                                style={{
                                                  display: "flex",
                                                  gap: "8px",
                                                  flexShrink: 0,
                                                  margin:
                                                    slotIdx === 0
                                                      ? "0 8px 0 0"
                                                      : slotIdx === displayCols
                                                        ? "0 0 0 8px"
                                                        : "0 8px",
                                                }}
                                              >
                                                {vAislesHere.map((vIdx) => {
                                                  const isLastRow = rowNum === displayRows;
                                                  return (
                                                    <div
                                                      key={`m-v-aisle-seg-${vIdx}-${rowNum}`}
                                                      onPointerDown={(e) => startAislePointerDrag(e, "VERTICAL", vIdx)}
                                                      style={{
                                                        width: "52px",
                                                        height: "38px",
                                                        background: isDraggingAisle
                                                          ? "rgba(186, 230, 253, 0.95)"
                                                          : "rgba(224, 242, 254, 0.75)",
                                                        borderLeft: "2px dashed #0284C7",
                                                        borderRight: "2px dashed #0284C7",
                                                        borderTop: "none",
                                                        borderBottom: isLastRow ? "2px dashed #0284C7" : "none",
                                                        borderRadius: isLastRow ? "0 0 8px 8px" : "0",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        boxSizing: "border-box",
                                                        flexShrink: 0,
                                                        cursor: "grab",
                                                        userSelect: "none",
                                                        touchAction: "none",
                                                      }}
                                                      title={`Grab & drag Vertical Aisle ${vCount > 1 ? vIdx + 1 : ""} to reposition`}
                                                    >
                                                      {rowNum === Math.ceil(displayRows / 2) && (
                                                        <span
                                                          style={{
                                                            fontSize: "9px",
                                                            fontWeight: 800,
                                                            color: "#0369A1",
                                                            letterSpacing: "1px",
                                                          }}
                                                        >
                                                          {vCount > 1 ? `AISLE ${vIdx + 1}` : "AISLE"}
                                                        </span>
                                                      )}
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            )}

                                            {/* Seat Cell at Column slotIdx */}
                                            {slotIdx > 0 && (() => {
                                              const colNum = slotIdx;
                                              const seatNumber = (rowNum - 1) * displayCols + colNum;
                                              return (
                                                <div
                                                  key={`m-seat-${rowNum}-${colNum}`}
                                                  style={{
                                                    width: "44px",
                                                    height: "38px",
                                                    background: "#FFFFFF",
                                                    border: "1.5px solid #CBD5E1",
                                                    borderRadius: "10px",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    fontSize: "12px",
                                                    fontWeight: 600,
                                                    color: "#0F172A",
                                                    flexShrink: 0,
                                                    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)",
                                                    boxSizing: "border-box",
                                                    marginRight:
                                                      slotIdx === displayCols && vAislesHere.length === 0
                                                        ? "0px"
                                                        : vAislesHere.length > 0
                                                          ? "0px"
                                                          : "8px",
                                                  }}
                                                  title={`Row ${rowNum}, Column ${colNum} (Seat #${seatNumber})`}
                                                >
                                                  <span>{seatNumber < 10 ? `0${seatNumber}` : seatNumber}</span>
                                                </div>
                                              );
                                            })()}
                                          </React.Fragment>
                                        );
                                      })}
                                    </div>
                                  );
                                })()}
                              </React.Fragment>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()
                ) : isVerticalOnly ? (
                  /* ── CASE 2: SINGLE VERTICAL AISLE (Image 2) ── */
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "flex-start",
                    }}
                  >
                    {/* R labels column */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                        marginRight: "6px",
                        flexShrink: 0,
                      }}
                    >
                      <div style={{ height: "20px" }} />
                      {Array.from({ length: displayRows }, (_, rIdx) => (
                        <span
                          key={`rl-${rIdx}`}
                          style={{
                            width: "36px",
                            height: "38px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "11px",
                            fontWeight: 800,
                            color: "#64748B",
                            background: "#F1F5F9",
                            borderRadius: "4px",
                            flexShrink: 0,
                          }}
                        >
                          R{rIdx + 1}
                        </span>
                      ))}
                    </div>

                    {/* Columns + Aisle + Drop zones */}
                    {Array.from({ length: displayCols + 1 }, (_, slotIdx) => {
                      const isAisleHere = aislePosition === slotIdx;
                      const isDropTarget = isDraggingAisle && !isAisleHere;
                      const gridHeight =
                        displayRows * 38 + (displayRows - 1) * 8;

                      return (
                        <React.Fragment key={`v-slot-${slotIdx}`}>
                          {slotIdx > 0 && slotIdx <= displayCols && (
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "8px",
                                flexShrink: 0,
                                marginRight:
                                  slotIdx === displayCols ||
                                  isAisleHere ||
                                  isDropTarget
                                    ? "0px"
                                    : "8px",
                              }}
                            >
                              <div
                                style={{
                                  width: "44px",
                                  height: "20px",
                                  textAlign: "center",
                                  fontSize: "11px",
                                  fontWeight: 800,
                                  color: "#64748B",
                                  background: "#F1F5F9",
                                  borderRadius: "4px",
                                  padding: "2px 0",
                                  flexShrink: 0,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                C{slotIdx}
                              </div>
                              {Array.from({ length: displayRows }, (_, rIdx) => {
                                const seatNumber =
                                  rIdx * displayCols + slotIdx;
                                return (
                                  <div
                                    key={`v-sc-${rIdx}-${slotIdx}`}
                                    style={{
                                      width: "44px",
                                      height: "38px",
                                      background: "#FFFFFF",
                                      border: "1.5px solid #CBD5E1",
                                      borderRadius: "10px",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontSize: "12px",
                                      fontWeight: 600,
                                      color: "#0F172A",
                                      flexShrink: 0,
                                      boxShadow:
                                        "0 1px 2px rgba(0, 0, 0, 0.04)",
                                      boxSizing: "border-box",
                                    }}
                                    title={`Row ${rIdx + 1}, Column ${slotIdx} (Seat #${seatNumber})`}
                                  >
                                    <span>
                                      {seatNumber < 10
                                        ? `0${seatNumber}`
                                        : seatNumber}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Gap Zone (Click / Drop) */}
                          {!isAisleHere && (
                            <div
                              onClick={() => setAislePosition(slotIdx)}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => {
                                e.preventDefault();
                                setAislePosition(slotIdx);
                                setIsDraggingAisle(false);
                              }}
                              title={`Click or drag to place Aisle ${slotIdx === 0 ? "at Start (before C1)" : `after Col C${slotIdx}`}`}
                              style={{
                                width: isDropTarget ? "14px" : "6px",
                                height: `${gridHeight}px`,
                                marginTop: "28px",
                                border: isDropTarget
                                  ? "2px dashed #0284C7"
                                  : "1px dashed transparent",
                                borderRadius: "4px",
                                background: isDropTarget
                                  ? "rgba(224,242,254,0.6)"
                                  : "transparent",
                                cursor: "pointer",
                                flexShrink: 0,
                                margin: isDropTarget
                                  ? "28px 4px 0 4px"
                                  : "28px 1px 0 1px",
                                transition: "all 0.15s ease",
                              }}
                              onMouseEnter={(e) => {
                                if (!isDraggingAisle) {
                                  e.currentTarget.style.borderColor = "#93C5FD";
                                  e.currentTarget.style.background =
                                    "rgba(239,246,255,0.7)";
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isDraggingAisle) {
                                  e.currentTarget.style.borderColor =
                                    "transparent";
                                  e.currentTarget.style.background =
                                    "transparent";
                                }
                              }}
                            />
                          )}

                          {/* Vertical Aisle Bar */}
                          {isAisleHere && (
                            <div
                              style={{
                                display: "flex",
                                gap: "8px",
                                flexShrink: 0,
                                margin:
                                  slotIdx === 0
                                    ? "0 8px 0 0"
                                    : slotIdx === displayCols
                                      ? "0 0 0 8px"
                                      : "0 8px",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "center",
                                  gap: "8px",
                                  flexShrink: 0,
                                }}
                              >
                                {/* Badge with ◀ and ▶ buttons */}
                                <div
                                  style={{
                                    fontSize: "9px",
                                    fontWeight: 800,
                                    color: "#0369A1",
                                    background: "rgba(224,242,254,0.85)",
                                    border: "1px solid #93C5FD",
                                    borderRadius: "4px",
                                    padding: "2px 4px",
                                    whiteSpace: "nowrap",
                                    height: "20px",
                                    width: "52px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    boxSizing: "border-box",
                                  }}
                                >
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setAislePosition((p) =>
                                        Math.max(0, p - 1),
                                      );
                                    }}
                                    disabled={aislePosition === 0}
                                    style={{
                                      border: "none",
                                      background: "transparent",
                                      cursor:
                                        aislePosition === 0
                                          ? "default"
                                          : "pointer",
                                      padding: "0",
                                      fontSize: "10px",
                                      fontWeight: 900,
                                      color:
                                        aislePosition === 0
                                          ? "#CBD5E1"
                                          : "#0284C7",
                                      lineHeight: 1,
                                    }}
                                    title="Move Aisle Left"
                                  >
                                    ◀
                                  </button>
                                  <span>AISLE</span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setAislePosition((p) =>
                                        Math.min(displayCols, p + 1),
                                      );
                                    }}
                                    disabled={aislePosition === displayCols}
                                    style={{
                                      border: "none",
                                      background: "transparent",
                                      cursor:
                                        aislePosition === displayCols
                                          ? "default"
                                          : "pointer",
                                      padding: "0",
                                      fontSize: "10px",
                                      fontWeight: 900,
                                      color:
                                        aislePosition === displayCols
                                          ? "#CBD5E1"
                                          : "#0284C7",
                                      lineHeight: 1,
                                    }}
                                    title="Move Aisle Right"
                                  >
                                    ▶
                                  </button>
                                </div>

                                {/* Vertical Aisle Body */}
                                <div
                                  onPointerDown={startAislePointerDrag}
                                  draggable
                                  onDragStart={(e) => {
                                    e.dataTransfer.setData(
                                      "text/plain",
                                      "aisle",
                                    );
                                    e.dataTransfer.effectAllowed = "move";
                                    setIsDraggingAisle(true);
                                  }}
                                  onDragEnd={() => setIsDraggingAisle(false)}
                                  style={{
                                    width: "52px",
                                    height: `${gridHeight}px`,
                                    background: isDraggingAisle
                                      ? "rgba(186, 230, 253, 0.95)"
                                      : "rgba(224, 242, 254, 0.75)",
                                    border: "2px dashed #0284C7",
                                    borderRadius: "6px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    cursor: "grab",
                                    userSelect: "none",
                                    touchAction: "none",
                                    boxShadow: isDraggingAisle
                                      ? "0 4px 12px rgba(2,132,199,0.25)"
                                      : "none",
                                    transition: "background 0.15s ease",
                                    overflow: "hidden",
                                    padding: "4px 2px",
                                    boxSizing: "border-box",
                                  }}
                                  title="Grab & drag or click arrow buttons to reposition aisle"
                                >
                                  {displayRows === 1 ? (
                                    <span style={{ fontSize: "9px", fontWeight: 800, color: "#0369A1" }}>
                                      AISLE
                                    </span>
                                  ) : (
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: "6px",
                                        writingMode: "vertical-rl",
                                        transform: "rotate(180deg)",
                                        fontSize: "10px",
                                        fontWeight: 800,
                                        color: "#0369A1",
                                        letterSpacing: "2px",
                                        userSelect: "none",
                                      }}
                                    >
                                      <span>⠿</span>
                                      <span>AISLE</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                ) : (
                  /* ── CASE 3: HORIZONTAL AISLE OR NO AISLE (Image 1 & 3) ── */
                  <>
                    {/* Column Headers */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        marginBottom: "8px",
                      }}
                    >
                      <div
                        style={{
                          width: "36px",
                          marginRight: "6px",
                          flexShrink: 0,
                        }}
                      />
                      {Array.from({ length: displayCols }, (_, cIdx) => (
                        <div
                          key={`h-ch-${cIdx + 1}`}
                          style={{
                            width: "44px",
                            textAlign: "center",
                            fontSize: "11px",
                            fontWeight: 800,
                            color: "#64748B",
                            background: "#F1F5F9",
                            borderRadius: "4px",
                            padding: "2px 0",
                            marginRight: cIdx === displayCols - 1 ? "0px" : "8px",
                            flexShrink: 0,
                          }}
                        >
                          C{cIdx + 1}
                        </div>
                      ))}
                    </div>

                    {/* Rows */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {/* Slot 0 Horizontal Aisle (Before Row 1) */}
                      {hasAisle && isHorizontalOnly && aislePosition === 0 && (
                        <div style={{ display: "flex", alignItems: "center", margin: "2px 0" }}>
                          {/* Badge with ▲ and ▼ */}
                          <div
                            style={{
                              width: "36px",
                              height: "38px",
                              background: "rgba(224,242,254,0.85)",
                              borderRadius: "4px",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "2px 0",
                              marginRight: "6px",
                              flexShrink: 0,
                              boxSizing: "border-box",
                            }}
                          >
                            <button
                              type="button"
                              disabled
                              style={{
                                border: "none",
                                background: "transparent",
                                cursor: "default",
                                padding: "0",
                                fontSize: "9px",
                                fontWeight: 900,
                                color: "#CBD5E1",
                                lineHeight: 1,
                              }}
                            >
                              ▲
                            </button>
                            <span style={{ fontSize: "8px", fontWeight: 800, color: "#0369A1" }}>
                              AISLE
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setAislePosition((p) => Math.min(displayRows, p + 1));
                              }}
                              style={{
                                border: "none",
                                background: "transparent",
                                cursor: "pointer",
                                padding: "0",
                                fontSize: "9px",
                                fontWeight: 900,
                                color: "#0284C7",
                                lineHeight: 1,
                              }}
                            >
                              ▼
                            </button>
                          </div>

                          {/* Draggable Body */}
                          <div
                            onPointerDown={startAislePointerDrag}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData("text/plain", "aisle");
                              e.dataTransfer.effectAllowed = "move";
                              setIsDraggingAisle(true);
                            }}
                            onDragEnd={() => setIsDraggingAisle(false)}
                            style={{
                              width: `${totalRowWidth}px`,
                              height: "38px",
                              background: isDraggingAisle
                                ? "rgba(186, 230, 253, 0.95)"
                                : "rgba(224, 242, 254, 0.75)",
                              border: "2px dashed #0284C7",
                              borderRadius: "6px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "4px",
                              cursor: "grab",
                              userSelect: "none",
                              fontSize: "11px",
                              fontWeight: 800,
                              color: "#0369A1",
                              letterSpacing: "1.5px",
                              whiteSpace: "nowrap",
                            }}
                          >
                            <span>⠿</span>
                            <span>AISLE</span>
                          </div>
                        </div>
                      )}

                      {/* Rows 1 to N */}
                      {Array.from({ length: displayRows }, (_, rIdx) => {
                        const rowNum = rIdx + 1;
                        const isAisleAfterThis =
                          hasAisle && isHorizontalOnly && aislePosition === rowNum;

                        return (
                          <React.Fragment key={`h-rf-${rowNum}`}>
                            <div style={{ display: "flex", alignItems: "center" }}>
                              <span
                                style={{
                                  width: "36px",
                                  marginRight: "6px",
                                  fontSize: "11px",
                                  fontWeight: 800,
                                  color: "#64748B",
                                  background: "#F1F5F9",
                                  borderRadius: "4px",
                                  padding: "4px 0",
                                  height: "38px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0,
                                  boxSizing: "border-box",
                                }}
                              >
                                R{rowNum}
                              </span>
                              {Array.from({ length: displayCols }, (_, cIdx) => {
                                const colNum = cIdx + 1;
                                const seatNumber =
                                  (rowNum - 1) * displayCols + colNum;
                                return (
                                  <div
                                    key={`h-seat-${rowNum}-${colNum}`}
                                    style={{
                                      width: "44px",
                                      height: "38px",
                                      background: "#FFFFFF",
                                      border: "1.5px solid #CBD5E1",
                                      borderRadius: "10px",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontSize: "12px",
                                      fontWeight: 600,
                                      color: "#0F172A",
                                      marginRight: cIdx === displayCols - 1 ? "0px" : "8px",
                                      flexShrink: 0,
                                      boxShadow:
                                        "0 1px 2px rgba(0, 0, 0, 0.04)",
                                      boxSizing: "border-box",
                                    }}
                                    title={`Row ${rowNum}, Column ${colNum} (Seat #${seatNumber})`}
                                  >
                                    <span>
                                      {seatNumber < 10
                                        ? `0${seatNumber}`
                                        : seatNumber}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Horizontal Aisle Bar after this row */}
                            {isAisleAfterThis && (
                              <div style={{ display: "flex", alignItems: "center", margin: "2px 0" }}>
                                <div
                                  style={{
                                    width: "36px",
                                    height: "38px",
                                    background: "rgba(224,242,254,0.85)",
                                    borderRadius: "4px",
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    padding: "2px 0",
                                    marginRight: "6px",
                                    flexShrink: 0,
                                    boxSizing: "border-box",
                                  }}
                                >
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setAislePosition((p) => Math.max(0, p - 1));
                                    }}
                                    style={{
                                      border: "none",
                                      background: "transparent",
                                      cursor: "pointer",
                                      padding: "0",
                                      fontSize: "9px",
                                      fontWeight: 900,
                                      color: "#0284C7",
                                      lineHeight: 1,
                                    }}
                                  >
                                    ▲
                                  </button>
                                  <span style={{ fontSize: "8px", fontWeight: 800, color: "#0369A1" }}>
                                    AISLE
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setAislePosition((p) => Math.min(displayRows, p + 1));
                                    }}
                                    disabled={rowNum === displayRows}
                                    style={{
                                      border: "none",
                                      background: "transparent",
                                      cursor: rowNum === displayRows ? "default" : "pointer",
                                      padding: "0",
                                      fontSize: "9px",
                                      fontWeight: 900,
                                      color: rowNum === displayRows ? "#CBD5E1" : "#0284C7",
                                      lineHeight: 1,
                                    }}
                                  >
                                    ▼
                                  </button>
                                </div>

                                <div
                                  onPointerDown={startAislePointerDrag}
                                  draggable
                                  onDragStart={(e) => {
                                    e.dataTransfer.setData("text/plain", "aisle");
                                    e.dataTransfer.effectAllowed = "move";
                                    setIsDraggingAisle(true);
                                  }}
                                  onDragEnd={() => setIsDraggingAisle(false)}
                                  style={{
                                    width: `${totalRowWidth}px`,
                                    height: "38px",
                                    background: isDraggingAisle
                                      ? "rgba(186, 230, 253, 0.95)"
                                      : "rgba(224, 242, 254, 0.75)",
                                    border: "2px dashed #0284C7",
                                    borderRadius: "6px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "4px",
                                    cursor: "grab",
                                    userSelect: "none",
                                    fontSize: "11px",
                                    fontWeight: 800,
                                    color: "#0369A1",
                                    letterSpacing: "1.5px",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  <span>⠿</span>
                                  <span>AISLE</span>
                                </div>
                              </div>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ── Notice Banner Below Preview (Matching Image 1) ── */}
          <div
            style={{
              padding: "16px 20px",
              background: "#EFF6FF",
              border: "1px solid #BFDBFE",
              borderRadius: "12px",
              display: "flex",
              alignItems: "flex-start",
              gap: "12px",
            }}
          >
            <Info
              size={18}
              color="#2563EB"
              style={{ marginTop: "2px", flexShrink: 0 }}
            />
            <span
              style={{
                fontSize: "13px",
                color: "#1E40AF",
                lineHeight: "20px",
              }}
            >
              <strong style={{ fontWeight: 700 }}>How to use:</strong> Drag the{" "}
              <strong style={{ fontWeight: 700 }}>AISLE</strong> bar in the preview to
              reposition it anywhere in the grid. It starts at the beginning by
              default. You can configure vertical and horizontal aisles
              independently.
            </span>
          </div>
        </div>
      </form>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @media (max-width: 900px) {
          .seat-form-container {
            flex-direction: column !important;
          }
          .seat-form-container > div:first-child {
            width: 100% !important;
            min-width: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
