"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Armchair, Loader2, Columns, Rows } from "lucide-react";

import {
  SeatConfigData,
  AisleOrientation,
  encodeAisle,
  decodeAisle,
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
  const [rows, setRows] = useState<number | "">("");
  const [cols, setCols] = useState<number | "">("");
  const [hasAisle, setHasAisle] = useState<boolean | null>(null);
  const [aisleType, setAisleType] = useState<AisleOrientation>("VERTICAL");
  const [aislePosition, setAislePosition] = useState<number>(0);
  const [status, setStatus] = useState<"Active" | "Inactive" | "">("");

  const previewRef = useRef<HTMLDivElement>(null);

  // Errors
  const [errors, setErrors] = useState<{ [k: string]: string }>({});

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || "");
      setRows(initialData.rows || "");
      setCols(initialData.cols || "");
      setHasAisle(initialData.hasAisle);

      const decoded = decodeAisle(
        initialData.hasAisle,
        initialData.aisleAfterCol ?? 0
      );
      setAisleType(initialData.aisleType || decoded.aisleType);
      setAislePosition(
        initialData.aislePosition !== undefined
          ? initialData.aislePosition
          : decoded.aislePosition
      );

      const s = String(initialData.status || "").toUpperCase();
      setStatus(s === "ACTIVE" ? "Active" : s === "INACTIVE" ? "Inactive" : "");
    } else {
      setName("");
      setRows("");
      setCols("");
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
  const isSingleSeat = (rows === "" || rows === 1) && (cols === "" || cols === 1);

  const handleRowChange = (val: string) => {
    const clean = val.replace(/\D/g, "");
    if (clean === "") {
      setRows("");
      if (errors.rows) setErrors((prev) => ({ ...prev, rows: "" }));
      return;
    }
    const num = parseInt(clean, 10);
    if (num > MAX_SEAT_ROWS) {
      setRows(MAX_SEAT_ROWS);
      setErrors((prev) => ({
        ...prev,
        rows: `Maximum ${MAX_SEAT_ROWS} rows allowed (from .env)`,
      }));
    } else {
      setRows(num);
      if (errors.rows) setErrors((prev) => ({ ...prev, rows: "" }));
    }
  };

  const handleColChange = (val: string) => {
    const clean = val.replace(/\D/g, "");
    if (clean === "") {
      setCols("");
      if (errors.cols) setErrors((prev) => ({ ...prev, cols: "" }));
      return;
    }
    const num = parseInt(clean, 10);
    if (num > MAX_SEAT_COLS) {
      setCols(MAX_SEAT_COLS);
      setErrors((prev) => ({
        ...prev,
        cols: `Maximum ${MAX_SEAT_COLS} columns allowed (from .env)`,
      }));
    } else {
      setCols(num);
      if (errors.cols) setErrors((prev) => ({ ...prev, cols: "" }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [k: string]: string } = {};

    // 1. Name validation
    if (!name.trim()) {
      newErrors.name = "Seat name is required";
    }

    // 2. Row validation (Optional, defaults to 1)
    const finalRows = rows === "" ? 1 : rows;
    if (finalRows <= 0) {
      newErrors.rows = "Row count must be at least 1";
    } else if (finalRows > MAX_SEAT_ROWS) {
      newErrors.rows = `Maximum ${MAX_SEAT_ROWS} rows allowed`;
    }

    // 3. Column validation (Optional, defaults to 1)
    const finalCols = cols === "" ? 1 : cols;
    if (finalCols <= 0) {
      newErrors.cols = "Column count must be at least 1";
    } else if (finalCols > MAX_SEAT_COLS) {
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

    const encodedAisle = encodeAisle(!!hasAisle, aisleType, aislePosition);

    onSave({
      id: initialData?.id,
      name: name.trim(),
      rows: finalRows,
      cols: finalCols,
      hasAisle: !!hasAisle,
      aisleAfterCol: encodedAisle,
      aisleType,
      aislePosition,
      status: status as "Active" | "Inactive",
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

            {/* 2. Row and Column Fields (Optional — single seat alone supported, max from .env) */}
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
                  Row{" "}
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 500,
                      color: "#6B7280",
                    }}
                  >
                    (Optional)
                  </span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="1 (Default)"
                  value={rows === "" ? "" : rows}
                  onChange={(e) => handleRowChange(e.target.value)}
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
                  Max: {MAX_SEAT_ROWS} (env)
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
                  Column{" "}
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 500,
                      color: "#6B7280",
                    }}
                  >
                    (Optional)
                  </span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="1 (Default)"
                  value={cols === "" ? "" : cols}
                  onChange={(e) => handleColChange(e.target.value)}
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
                  Max: {MAX_SEAT_COLS} (env)
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
                {/* Yes */}
                <button
                  type="button"
                  onClick={() => {
                    setHasAisle(true);
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

              {/* Aisle Direction & Position Controls (if Aisle is YES) */}
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
                          if (aislePosition > displayCols) setAislePosition(0);
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
                        <span>Vertical (Standing)</span>
                      </button>

                      {/* Horizontal / Sleeping line */}
                      <button
                        type="button"
                        onClick={() => {
                          setAisleType("HORIZONTAL");
                          if (aislePosition > displayRows) setAislePosition(0);
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
                        <span>Horizontal (Sleeping)</span>
                      </button>
                    </div>
                  </div>

                  {/* Aisle Placement Location / Stepper */}
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "4px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: 700,
                          color: "#0F172A",
                        }}
                      >
                        Placement Position:
                      </span>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          color: "#0284C7",
                        }}
                      >
                        {aisleType === "VERTICAL"
                          ? aislePosition === 0
                            ? "Start (Before C1)"
                            : `After Col C${aislePosition}`
                          : aislePosition === 0
                            ? "Start (Before R1)"
                            : `After Row R${aislePosition}`}
                      </span>
                    </div>

                    <select
                      value={aislePosition}
                      onChange={(e) =>
                        setAislePosition(parseInt(e.target.value, 10))
                      }
                      style={{
                        width: "100%",
                        height: "36px",
                        background: "#FFFFFF",
                        border: "1px solid #CBD5E1",
                        borderRadius: "6px",
                        padding: "0 10px",
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        fontWeight: 600,
                        fontSize: "12px",
                        color: "#0F172A",
                        cursor: "pointer",
                        outline: "none",
                      }}
                    >
                      {aisleType === "VERTICAL" ? (
                        <>
                          <option value={0}>
                            📍 Starting Point (Before C1)
                          </option>
                          {Array.from({ length: displayCols }, (_, i) => (
                            <option key={`col-opt-${i + 1}`} value={i + 1}>
                              After Column C{i + 1}
                            </option>
                          ))}
                        </>
                      ) : (
                        <>
                          <option value={0}>
                            📍 Starting Point (Before R1)
                          </option>
                          {Array.from({ length: displayRows }, (_, i) => (
                            <option key={`row-opt-${i + 1}`} value={i + 1}>
                              After Row R{i + 1}
                            </option>
                          ))}
                        </>
                      )}
                    </select>
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
                    setStatus("Active");
                    if (errors.status)
                      setErrors((prev) => ({ ...prev, status: "" }));
                  }}
                  style={{
                    flex: 1,
                    height: "38px",
                    borderRadius: "8px",
                    border:
                      status === "Active"
                        ? "2px solid #10B981"
                        : errors.status
                          ? "1.5px solid #DC2626"
                          : "1.5px solid #D1D5DB",
                    background: status === "Active" ? "#ECFDF5" : "#FFFFFF",
                    color: status === "Active" ? "#065F46" : "#4B5563",
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
                    setStatus("Inactive");
                    if (errors.status)
                      setErrors((prev) => ({ ...prev, status: "" }));
                  }}
                  style={{
                    flex: 1,
                    height: "38px",
                    borderRadius: "8px",
                    border:
                      status === "Inactive"
                        ? "2px solid #EF4444"
                        : errors.status
                          ? "1.5px solid #DC2626"
                          : "1.5px solid #D1D5DB",
                    background: status === "Inactive" ? "#FEE2E2" : "#FFFFFF",
                    color: status === "Inactive" ? "#991B1B" : "#4B5563",
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
                  <span>{initialData ? "Update Seat Layout" : "Save Seat"}</span>
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
                <span style={{ fontSize: "11px", color: "#64748B" }}>
                  Column (C1, C2...) and Row (R1, R2...) labeled layout
                </span>
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
                style={{
                  minWidth: "max-content",
                  minHeight: "max-content",
                  margin: "auto",
                  padding: "24px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                }}
              >
                {/* ── Column Headers Row: Corner Spacer + [Start Aisle?] + C1, C2... ── */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: "8px",
                  }}
                >
                  {/* Left row header spacer (width matches R1/R2 width) */}
                  <div
                    style={{
                      width: "36px",
                      marginRight: "6px",
                      flexShrink: 0,
                    }}
                  />

                  {/* If vertical aisle is at position 0 (Starting point before C1) */}
                  {hasAisle && aisleType === "VERTICAL" && aislePosition === 0 && (
                    <div
                      style={{
                        width: "56px",
                        marginRight: "10px",
                        textAlign: "center",
                        fontSize: "10px",
                        fontWeight: 800,
                        color: "#0369A1",
                        flexShrink: 0,
                      }}
                    >
                      AISLE
                    </div>
                  )}

                  {/* Column header tags (C1, C2, C3...) */}
                  {Array.from({ length: displayCols }, (_, cIdx) => {
                    const colNum = cIdx + 1;
                    const isAisleAfterThis =
                      hasAisle &&
                      aisleType === "VERTICAL" &&
                      aislePosition === colNum;

                    return (
                      <React.Fragment key={`col-header-${colNum}`}>
                        <div
                          style={{
                            width: "44px",
                            textAlign: "center",
                            fontSize: "11px",
                            fontWeight: 800,
                            color: "#64748B",
                            background: "#F1F5F9",
                            borderRadius: "4px",
                            padding: "2px 0",
                            marginRight: isAisleAfterThis ? "0px" : "8px",
                            flexShrink: 0,
                          }}
                        >
                          C{colNum}
                        </div>

                        {/* Space / Header for Vertical Aisle after this column */}
                        {isAisleAfterThis && (
                          <div
                            style={{
                              width: "56px",
                              margin: "0 10px",
                              textAlign: "center",
                              fontSize: "10px",
                              fontWeight: 800,
                              color: "#0369A1",
                              flexShrink: 0,
                            }}
                          >
                            AISLE
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>

                {/* If horizontal aisle is at position 0 (Starting point before R1) */}
                {hasAisle && aisleType === "HORIZONTAL" && aislePosition === 0 && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      margin: "0 0 10px 42px",
                      width: "calc(100% - 42px)",
                      minWidth: `${displayCols * 52}px`,
                      background: "rgba(224, 242, 254, 0.75)",
                      border: "1.5px dashed #0284C7",
                      borderRadius: "6px",
                      padding: "6px 14px",
                      justifyContent: "center",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 800,
                        color: "#0369A1",
                        letterSpacing: "2px",
                      }}
                    >
                      ─── AISLE (STARTING POINT) ───
                    </span>
                  </div>
                )}

                {/* ── Main Grid of Rows ── */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  {Array.from({ length: displayRows }, (_, rIdx) => {
                    const rowNum = rIdx + 1;
                    const isHorizontalAisleAfterThis =
                      hasAisle &&
                      aisleType === "HORIZONTAL" &&
                      aislePosition === rowNum;

                    return (
                      <React.Fragment key={`grid-row-${rowNum}`}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          {/* Row Label (R1, R2, R3...) */}
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
                              textAlign: "center",
                              flexShrink: 0,
                            }}
                          >
                            R{rowNum}
                          </span>

                          {/* If vertical aisle is at position 0 (before C1) */}
                          {hasAisle &&
                            aisleType === "VERTICAL" &&
                            aislePosition === 0 && (
                              <div
                                style={{
                                  width: "56px",
                                  height: "38px",
                                  marginRight: "10px",
                                  background: "rgba(224, 242, 254, 0.65)",
                                  border: "1.5px dashed #0284C7",
                                  borderRadius: "6px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "9px",
                                  fontWeight: 800,
                                  color: "#0369A1",
                                  letterSpacing: "1px",
                                  flexShrink: 0,
                                }}
                              >
                                AISLE
                              </div>
                            )}

                          {/* Seat Cells in this row */}
                          {Array.from({ length: displayCols }, (_, cIdx) => {
                            const colNum = cIdx + 1;
                            const seatNumber = rIdx * displayCols + colNum;
                            const isVerticalAisleAfterThis =
                              hasAisle &&
                              aisleType === "VERTICAL" &&
                              aislePosition === colNum;

                            return (
                              <React.Fragment key={`seat-${rowNum}-${colNum}`}>
                                <div
                                  style={{
                                    width: "44px",
                                    height: "38px",
                                    background: "#FFFFFF",
                                    border: "1.5px solid #0C2A42",
                                    borderRadius: "6px",
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    color: "#0C2A42",
                                    marginRight: isVerticalAisleAfterThis
                                      ? "0px"
                                      : "8px",
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

                                {/* Vertical Aisle Bar after this column */}
                                {isVerticalAisleAfterThis && (
                                  <div
                                    style={{
                                      width: "56px",
                                      height: "38px",
                                      margin: "0 10px",
                                      background: "rgba(224, 242, 254, 0.65)",
                                      border: "1.5px dashed #0284C7",
                                      borderRadius: "6px",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontSize: "9px",
                                      fontWeight: 800,
                                      color: "#0369A1",
                                      letterSpacing: "1px",
                                      flexShrink: 0,
                                    }}
                                  >
                                    AISLE
                                  </div>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </div>

                        {/* Horizontal Aisle Bar (Sleeping line) after this row */}
                        {isHorizontalAisleAfterThis && (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              margin: "2px 0 2px 42px",
                              width: "calc(100% - 42px)",
                              minWidth: `${displayCols * 52}px`,
                              height: "34px",
                              background: "rgba(224, 242, 254, 0.75)",
                              border: "1.5px dashed #0284C7",
                              borderRadius: "6px",
                              padding: "0 14px",
                              justifyContent: "center",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "11px",
                                fontWeight: 800,
                                color: "#0369A1",
                                letterSpacing: "2px",
                              }}
                            >
                              ─── AISLE (AFTER ROW R{rowNum}) ───
                            </span>
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
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
                💡 <strong>Dynamic Layout:</strong> Rows (R1, R2...) and Columns
                (C1, C2...) are labeled. You can assign single standalone seats
                or grid layouts with vertical or horizontal aisles starting from
                position 0.
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
