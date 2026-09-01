"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Armchair, Loader2, Columns, Rows } from "lucide-react";

import {
  SeatConfigData,
  AisleOrientation,
} from "@/app/(dashboard)/seat-management/types";

export type { SeatConfigData };

interface CreateSeatModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: SeatConfigData | null;
  onSave: (data: SeatConfigData) => void;
  isLoading?: boolean;
}

const MAX_SEAT_ROWS = Number(process.env.NEXT_PUBLIC_MAX_SEAT_ROWS || 200);
const MAX_SEAT_COLS = Number(process.env.NEXT_PUBLIC_MAX_SEAT_COLS || 200);

export default function CreateSeatModal({
  isOpen,
  onClose,
  initialData,
  onSave,
  isLoading = false,
}: CreateSeatModalProps) {
  // Form State
  const [name, setName] = useState<string>("");
  const [rows, setRows] = useState<number | "">(1);
  const [cols, setCols] = useState<number | "">(1);
  const [hasAisle, setHasAisle] = useState<boolean | null>(null);
  const [aisleType, setAisleType] = useState<AisleOrientation>("VERTICAL");
  const [aislePosition, setAislePosition] = useState<number>(0);
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE" | "">("");
  const [isDraggingAisle, setIsDraggingAisle] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const gridInnerRef = useRef<HTMLDivElement>(null);

  // ── Bulletproof Pointer-based Drag & Drop for Aisle ──
  const startAislePointerDrag = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDraggingAisle(true);

    const handlePointerMove = (moveEv: PointerEvent) => {
      if (!gridInnerRef.current) return;
      const rect = gridInnerRef.current.getBoundingClientRect();

      if (aisleType === "VERTICAL") {
        const relativeX = moveEv.clientX - rect.left - 42; // skip R label column width (36px + 6px)
        const colWidth = 52; // 44px + 8px
        const calculatedSlot = Math.max(
          0,
          Math.min(displayCols, Math.round(relativeX / colWidth)),
        );
        setAislePosition(calculatedSlot);
      } else {
        const relativeY = moveEv.clientY - rect.top - 28; // skip col header height (20px + 8px)
        const rowHeight = 46; // 38px + 8px
        const calculatedSlot = Math.max(
          0,
          Math.min(displayRows, Math.round(relativeY / rowHeight)),
        );
        setAislePosition(calculatedSlot);
      }
    };

    const handlePointerUp = () => {
      setIsDraggingAisle(false);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  // Errors
  const [errors, setErrors] = useState<{ [k: string]: string }>({});

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || "");
      setRows(initialData.rows || "");
      setCols(initialData.cols || "");
      setHasAisle(initialData.hasAisle);

      const type: AisleOrientation = initialData.aisleDirection || "VERTICAL";
      const position =
        type === "HORIZONTAL"
          ? (initialData.aisleAfterRow ?? 0)
          : (initialData.aisleAfterCol ?? 0);

      setAisleType(type);
      setAislePosition(position);

      const s = String(initialData.status || "").toUpperCase();
      setStatus(s === "ACTIVE" ? "ACTIVE" : s === "INACTIVE" ? "INACTIVE" : "");
    } else {
      setName("");
      setRows(1);
      setCols(1);
      setHasAisle(null);
      setAisleType("VERTICAL");
      setAislePosition(0);
      setStatus("");
    }
    setErrors({});
  }, [initialData, isOpen]);

  // Keep aisle position within bounds when row/col count changes
  const effectiveRows = rows === "" ? 1 : Math.max(1, rows);
  const effectiveCols = cols === "" ? 1 : Math.max(1, cols);

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

    // 1. Name validation
    if (!name.trim()) {
      newErrors.name = "Seat name is required";
    }

    // 2. Row validation (Min 1, Max MAX_SEAT_ROWS)
    if (rows === "" || rows < 1) {
      newErrors.rows = "Row count must be at least 1";
    } else if (rows > MAX_SEAT_ROWS) {
      newErrors.rows = `Maximum ${MAX_SEAT_ROWS} rows allowed`;
    }

    // 3. Column validation (Min 1, Max MAX_SEAT_COLS)
    if (cols === "" || cols < 1) {
      newErrors.cols = "Column count must be at least 1";
    } else if (cols > MAX_SEAT_COLS) {
      newErrors.cols = `Maximum ${MAX_SEAT_COLS} columns allowed`;
    }

    // 4. Aisle Position validation
    if (hasAisle === null) {
      newErrors.hasAisle = "Please select aisle option (Yes / No)";
    }

    // 5. Status validation
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

    onSave({
      id: initialData?.id,
      name: name.trim(),
      rows: finalRows,
      cols: finalCols,
      hasAisle: !!hasAisle,

      aisleDirection: aisleType,
      aisleAfterCol: aisleType === "VERTICAL" ? pos : 0,
      aisleAfterRow: aisleType === "HORIZONTAL" ? pos : 0,

      status: status as "ACTIVE" | "INACTIVE",
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(1, 27, 47, 0.65)",
        backdropFilter: "blur(3px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9000,
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "14px",
          width: "100%",
          maxWidth: "1000px",
          maxHeight: "94vh",
          boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            background: "#011B2F",
            padding: "18px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Armchair size={22} color="#F4BC43" />
            <h2
              style={{
                margin: 0,
                fontWeight: 700,
                fontSize: "18px",
                color: "#FFFFFF",
              }}
            >
              {initialData ? "Edit Seat Layout" : "Create Seat Layout"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "#FFFFFF",
              display: "flex",
              padding: "4px",
            }}
          >
            <X size={22} />
          </button>
        </div>

        {/* Modal Body: Left Inputs & Right Preview */}
        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden" }}
        >
          {/* ── LEFT COLUMN: Inputs ── */}
          <div
            style={{
              width: "350px",
              minWidth: "350px",
              borderRight: "1px solid #E5E7EB",
              padding: "20px 22px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            {/* 1. Name of Seat (Required) */}
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

            {/* 2. Row and Column Fields (Min: 1, Max: env configured) */}
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

            {/* 3. Aisle Position (Yes / No) - Required */}
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
                        ? "2px solid #0C2A42"
                        : errors.hasAisle
                          ? "1.5px solid #DC2626"
                          : "1.5px solid #D1D5DB",
                    background: hasAisle === true ? "#F0F7FF" : "#FFFFFF",
                    color: hasAisle === true ? "#0C2A42" : "#4B5563",
                    fontWeight: 700,
                    fontSize: "13px",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  Yes
                </button>

                {/* No */}
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
                        ? "2px solid #0C2A42"
                        : errors.hasAisle
                          ? "1.5px solid #DC2626"
                          : "1.5px solid #D1D5DB",
                    background: hasAisle === false ? "#F0F7FF" : "#FFFFFF",
                    color: hasAisle === false ? "#0C2A42" : "#4B5563",
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

              {/* Aisle Direction Controls (if Aisle is YES) */}
              {hasAisle === true && (
                <div
                  style={{
                    marginTop: "12px",
                    padding: "12px",
                    background: "#F8FAFC",
                    border: "1px solid #E2E8F0",
                    borderRadius: "8px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  {/* Aisle Direction Selector: Vertical vs Horizontal */}
                  <div>
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: 700,
                        color: "#0F172A",
                        display: "block",
                        marginBottom: "6px",
                      }}
                    >
                      Aisle Direction:
                    </span>
                    <div style={{ display: "flex", gap: "8px" }}>
                      {/* Vertical / Standing line */}
                      <button
                        type="button"
                        onClick={() => {
                          setAisleType("VERTICAL");
                          setAislePosition(0);
                        }}
                        style={{
                          flex: 1,
                          padding: "8px",
                          borderRadius: "6px",
                          border:
                            aisleType === "VERTICAL"
                              ? "2px solid #0284C7"
                              : "1px solid #CBD5E1",
                          background:
                            aisleType === "VERTICAL" ? "#E0F2FE" : "#FFFFFF",
                          color:
                            aisleType === "VERTICAL" ? "#0369A1" : "#475569",
                          fontSize: "12px",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "5px",
                        }}
                      >
                        <Columns size={14} />
                        <span>Vertical</span>
                      </button>

                      {/* Horizontal / Sleeping line */}
                      <button
                        type="button"
                        onClick={() => {
                          setAisleType("HORIZONTAL");
                          setAislePosition(0);
                        }}
                        style={{
                          flex: 1,
                          padding: "8px",
                          borderRadius: "6px",
                          border:
                            aisleType === "HORIZONTAL"
                              ? "2px solid #0284C7"
                              : "1px solid #CBD5E1",
                          background:
                            aisleType === "HORIZONTAL" ? "#E0F2FE" : "#FFFFFF",
                          color:
                            aisleType === "HORIZONTAL" ? "#0369A1" : "#475569",
                          fontSize: "12px",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "5px",
                        }}
                      >
                        <Rows size={14} />
                        <span>Horizontal</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 4. Status (Active / Inactive) - Required */}
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

            {/* 5. Save Seat Button */}
            <div style={{ marginTop: "auto", paddingTop: "14px" }}>
              <button
                type="submit"
                disabled={isLoading}
                style={{
                  width: "100%",
                  height: "44px",
                  background: isLoading ? "#E5E7EB" : "#F4BC43",
                  border: "none",
                  borderRadius: "8px",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 700,
                  fontSize: "14px",
                  color: isLoading ? "#9CA3AF" : "#011B2F",
                  cursor: isLoading ? "not-allowed" : "pointer",
                  boxShadow: isLoading
                    ? "none"
                    : "0 4px 12px rgba(244,188,67,0.35)",
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
                    {initialData ? "Update Seat Layout" : "Save Seat"}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* ── RIGHT COLUMN: Seat Layout Preview ── */}
          <div
            style={{
              flex: 1,
              padding: "20px 22px",
              background: "#F8FAFC",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "12px",
              }}
            >
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontWeight: 700,
                    fontSize: "14px",
                    color: "#011B2F",
                  }}
                >
                  Seat Layout Preview
                </h3>
              </div>

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

            {/* Preview Viewport: Clean 2D scrolling without flex center clipping */}
            <div
              ref={previewRef}
              style={{
                flex: 1,
                minHeight: "320px",
                background: "#FFFFFF",
                border: "1.5px solid #E2E8F0",
                borderRadius: "10px",
                overflow: "auto",
                position: "relative",
              }}
            >
              {/* Inner container with max-content for smooth scrollability to top & left */}
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
                {/* ── VERTICAL AISLE LAYOUT ── */}
                {hasAisle && aisleType === "VERTICAL" ? (
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
                      {/* spacer for col header row */}
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

                    {/* Render columns + aisle bar + drop/click zones inline */}
                    {Array.from({ length: displayCols + 1 }, (_, slotIdx) => {
                      const isAisleHere = aislePosition === slotIdx;
                      const isDropTarget = isDraggingAisle && !isAisleHere;
                      const gridHeight =
                        displayRows * 38 + (displayRows - 1) * 8;

                      return (
                        <React.Fragment key={`slot-${slotIdx}`}>
                          {/* Seat column for slotIdx >= 1 */}
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
                              {/* Col header */}
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
                              {/* Seat cells for this column */}
                              {Array.from(
                                { length: displayRows },
                                (_, rIdx) => {
                                  const seatNumber =
                                    rIdx * displayCols + slotIdx;
                                  return (
                                    <div
                                      key={`sc-${rIdx}-${slotIdx}`}
                                      style={{
                                        width: "44px",
                                        height: "38px",
                                        background: "#FFFFFF",
                                        border: "1.5px solid #0C2A42",
                                        borderRadius: "6px",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: "11px",
                                        fontWeight: 700,
                                        color: "#0C2A42",
                                        flexShrink: 0,
                                        boxShadow:
                                          "0 1px 3px rgba(12, 42, 66, 0.08)",
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
                                },
                              )}
                            </div>
                          )}

                          {/* Interactive Gap Zone (Click to Place / Drop Target) */}
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

                          {/* Aisle bar when placed at this slot */}
                          {isAisleHere && (
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
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
                                  fontSize: "9px",
                                  fontWeight: 800,
                                  color: "#0369A1",
                                  background: "rgba(224,242,254,0.8)",
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
                                  onClick={() =>
                                    setAislePosition((p) => Math.max(0, p - 1))
                                  }
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
                                    display: "flex",
                                    alignItems: "center",
                                  }}
                                  title="Move Aisle Left"
                                >
                                  ◀
                                </button>
                                <span
                                  style={{ fontSize: "9px", fontWeight: 800 }}
                                >
                                  AISLE
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setAislePosition((p) =>
                                      Math.min(displayCols, p + 1),
                                    )
                                  }
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
                                    display: "flex",
                                    alignItems: "center",
                                  }}
                                  title="Move Aisle Right"
                                >
                                  ▶
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
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      gap: "3px",
                                      fontSize: "9px",
                                      fontWeight: 800,
                                      color: "#0369A1",
                                      textAlign: "center",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontSize: "11px",
                                        lineHeight: 1,
                                      }}
                                    >
                                      ⠿
                                    </span>
                                    <span>AISLE</span>
                                  </div>
                                ) : displayRows === 2 ? (
                                  <div
                                    style={{
                                      display: "flex",
                                      flexDirection: "column",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      gap: "2px",
                                      fontSize: "9px",
                                      fontWeight: 800,
                                      color: "#0369A1",
                                      textAlign: "center",
                                      lineHeight: 1.1,
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontSize: "12px",
                                        lineHeight: 1,
                                      }}
                                    >
                                      ⠿
                                    </span>
                                    <span style={{ letterSpacing: "1px" }}>
                                      AISLE
                                    </span>
                                  </div>
                                ) : (
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      gap: "6px",
                                      writingMode: "vertical-rl",
                                      transform: "rotate(180deg)",
                                      whiteSpace: "nowrap",
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
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                ) : (
                  <>
                    {/* ── HORIZONTAL AISLE or NO AISLE: row-based layout ── */}
                    {/* Column headers row */}
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
                      {Array.from({ length: displayCols }, (_, cIdx) => {
                        const colNum = cIdx + 1;
                        return (
                          <div
                            key={`ch-${colNum}`}
                            style={{
                              width: "44px",
                              textAlign: "center",
                              fontSize: "11px",
                              fontWeight: 800,
                              color: "#64748B",
                              background: "#F1F5F9",
                              borderRadius: "4px",
                              padding: "2px 0",
                              marginRight: "8px",
                              flexShrink: 0,
                            }}
                          >
                            C{colNum}
                          </div>
                        );
                      })}
                    </div>

                    {/* Main Grid of Rows with Horizontal Aisle & Gaps */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                      }}
                    >
                      {/* ── Slot 0: Horizontal Aisle Before Row 1 (Start / Top) ── */}
                      {hasAisle && aislePosition === 0 && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            flexShrink: 0,
                            margin: "2px 0",
                          }}
                        >
                          {/* Left R-column Control Badge */}
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
                                display: "flex",
                                alignItems: "center",
                              }}
                              title="Already at Top"
                            >
                              ▲
                            </button>
                            <span
                              style={{
                                fontSize: "8px",
                                fontWeight: 800,
                                color: "#0369A1",
                              }}
                            >
                              AISLE
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setAislePosition((p) =>
                                  Math.min(displayRows, p + 1),
                                );
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
                                display: "flex",
                                alignItems: "center",
                              }}
                              title="Move Aisle Down"
                            >
                              ▼
                            </button>
                          </div>

                          {/* Draggable Horizontal Aisle Body */}
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
                              touchAction: "none",
                              boxShadow: isDraggingAisle
                                ? "0 4px 12px rgba(2,132,199,0.25)"
                                : "none",
                              transition: "background 0.15s ease",
                              fontSize: displayCols === 1 ? "9px" : "11px",
                              fontWeight: 800,
                              color: "#0369A1",
                              letterSpacing:
                                displayCols === 1 ? "0.5px" : "1.5px",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              padding: "0 6px",
                              boxSizing: "border-box",
                            }}
                            title="Grab & drag or click arrows to move horizontal aisle"
                          >
                            <span>⠿</span>
                            <span>AISLE</span>
                          </div>
                        </div>
                      )}

                      {/* Slot 0 Gap Target (when aisle is not at slot 0) */}
                      {hasAisle && aislePosition !== 0 && (
                        <div
                          onClick={() => setAislePosition(0)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            setAislePosition(0);
                            setIsDraggingAisle(false);
                          }}
                          title="Click or drag to place Horizontal Aisle at Start (before R1)"
                          style={{
                            width: `${totalRowWidth}px`,
                            height: isDraggingAisle ? "12px" : "6px",
                            marginLeft: "42px",
                            border: isDraggingAisle
                              ? "2px dashed #0284C7"
                              : "1px dashed transparent",
                            borderRadius: "4px",
                            background: isDraggingAisle
                              ? "rgba(224,242,254,0.6)"
                              : "transparent",
                            cursor: "pointer",
                            margin: isDraggingAisle
                              ? "2px 0 2px 42px"
                              : "1px 0 1px 42px",
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
                              e.currentTarget.style.borderColor = "transparent";
                              e.currentTarget.style.background = "transparent";
                            }
                          }}
                        />
                      )}

                      {/* ── Rows 1 to N + Slot after each Row ── */}
                      {Array.from({ length: displayRows }, (_, rIdx) => {
                        const rowNum = rIdx + 1;
                        const slotAfterThis = rowNum;
                        const isAisleAfterThis =
                          hasAisle && aislePosition === slotAfterThis;
                        const isDropTargetAfterThis =
                          isDraggingAisle && !isAisleAfterThis;

                        return (
                          <React.Fragment key={`h-row-${rowNum}`}>
                            {/* Seat Row */}
                            <div
                              style={{ display: "flex", alignItems: "center" }}
                            >
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
                              {Array.from(
                                { length: displayCols },
                                (_, cIdx) => {
                                  const colNum = cIdx + 1;
                                  const seatNumber =
                                    (rowNum - 1) * displayCols + colNum;
                                  return (
                                    <div
                                      key={`seat-${rowNum}-${colNum}`}
                                      style={{
                                        width: "44px",
                                        height: "38px",
                                        background: "#FFFFFF",
                                        border: "1.5px solid #0C2A42",
                                        borderRadius: "6px",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: "11px",
                                        fontWeight: 700,
                                        color: "#0C2A42",
                                        marginRight: "8px",
                                        flexShrink: 0,
                                        boxShadow:
                                          "0 1px 3px rgba(12, 42, 66, 0.08)",
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
                                },
                              )}
                            </div>

                            {/* Horizontal Aisle Bar after Row R{rowNum} (including bottom) */}
                            {isAisleAfterThis && (
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  flexShrink: 0,
                                  margin: "2px 0",
                                }}
                              >
                                {/* Left R-column Control Badge */}
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
                                      setAislePosition((p) =>
                                        Math.max(0, p - 1),
                                      );
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
                                      display: "flex",
                                      alignItems: "center",
                                    }}
                                    title="Move Aisle Up"
                                  >
                                    ▲
                                  </button>
                                  <span
                                    style={{
                                      fontSize: "8px",
                                      fontWeight: 800,
                                      color: "#0369A1",
                                    }}
                                  >
                                    AISLE
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setAislePosition((p) =>
                                        Math.min(displayRows, p + 1),
                                      );
                                    }}
                                    disabled={slotAfterThis === displayRows}
                                    style={{
                                      border: "none",
                                      background: "transparent",
                                      cursor:
                                        slotAfterThis === displayRows
                                          ? "default"
                                          : "pointer",
                                      padding: "0",
                                      fontSize: "9px",
                                      fontWeight: 900,
                                      color:
                                        slotAfterThis === displayRows
                                          ? "#CBD5E1"
                                          : "#0284C7",
                                      lineHeight: 1,
                                      display: "flex",
                                      alignItems: "center",
                                    }}
                                    title={
                                      slotAfterThis === displayRows
                                        ? "Already at Bottom"
                                        : "Move Aisle Down"
                                    }
                                  >
                                    ▼
                                  </button>
                                </div>

                                {/* Draggable Horizontal Aisle Body */}
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
                                    touchAction: "none",
                                    boxShadow: isDraggingAisle
                                      ? "0 4px 12px rgba(2,132,199,0.25)"
                                      : "none",
                                    transition: "background 0.15s ease",
                                    fontSize:
                                      displayCols === 1 ? "9px" : "11px",
                                    fontWeight: 800,
                                    color: "#0369A1",
                                    letterSpacing:
                                      displayCols === 1 ? "0.5px" : "1.5px",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    padding: "0 6px",
                                    boxSizing: "border-box",
                                  }}
                                  title="Grab & drag or click arrows to move horizontal aisle"
                                >
                                  <span>⠿</span>
                                  <span>AISLE</span>
                                </div>
                              </div>
                            )}

                            {/* Gap Slot after Row R{rowNum} (when aisle is not here) */}
                            {hasAisle && !isAisleAfterThis && (
                              <div
                                onClick={() => setAislePosition(slotAfterThis)}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  setAislePosition(slotAfterThis);
                                  setIsDraggingAisle(false);
                                }}
                                title={`Click or drag to place Horizontal Aisle ${
                                  slotAfterThis === displayRows
                                    ? "at Bottom (after all rows)"
                                    : `after Row R${slotAfterThis}`
                                }`}
                                style={{
                                  width: `${totalRowWidth}px`,
                                  height: isDropTargetAfterThis
                                    ? "12px"
                                    : "6px",
                                  marginLeft: "42px",
                                  border: isDropTargetAfterThis
                                    ? "2px dashed #0284C7"
                                    : "1px dashed transparent",
                                  borderRadius: "4px",
                                  background: isDropTargetAfterThis
                                    ? "rgba(224,242,254,0.6)"
                                    : "transparent",
                                  cursor: "pointer",
                                  margin: isDropTargetAfterThis
                                    ? "2px 0 2px 42px"
                                    : "1px 0 1px 42px",
                                  transition: "all 0.15s ease",
                                }}
                                onMouseEnter={(e) => {
                                  if (!isDraggingAisle) {
                                    e.currentTarget.style.borderColor =
                                      "#93C5FD";
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
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Instruction Banner Below Preview */}
            <div
              style={{
                marginTop: "12px",
                padding: "8px 12px",
                background: "#EFF6FF",
                border: "1px solid #BFDBFE",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span
                style={{ fontSize: "12px", color: "#1E40AF", fontWeight: 500 }}
              >
                <strong>Drag the AISLE bar</strong> in the preview to reposition
                it anywhere in the grid. It starts at the beginning by default.
              </span>
            </div>
          </div>
        </form>
      </div>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
