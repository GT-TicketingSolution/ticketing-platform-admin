"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, Armchair, MoveHorizontal } from "lucide-react";

import { SeatConfigData } from "@/app/(dashboard)/seat-management/types";
export type { SeatConfigData };

interface CreateSeatModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: SeatConfigData | null;
  onSave: (data: SeatConfigData) => void;
  isLoading?: boolean;
}

export default function CreateSeatModal({
  isOpen,
  onClose,
  initialData,
  onSave,
  isLoading = false,
}: CreateSeatModalProps) {
  // Form State - No default selection for Aisle and Status
  const [name, setName] = useState<string>("");
  const [rows, setRows] = useState<number | "">("");
  const [cols, setCols] = useState<number | "">("");
  const [hasAisle, setHasAisle] = useState<boolean | null>(null);
  const [aisleAfterCol, setAisleAfterCol] = useState<number>(1);
  const [status, setStatus] = useState<"Active" | "Inactive" | "">("");

  // Dragging state for aisle (mouse-based)
  const [isDraggingAisle, setIsDraggingAisle] = useState<boolean>(false);
  const [dragOverCol, setDragOverCol] = useState<number | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  // Errors
  const [errors, setErrors] = useState<{ [k: string]: string }>({});

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || "");
      setRows(initialData.rows || "");
      setCols(initialData.cols || "");
      setHasAisle(initialData.hasAisle);
      setAisleAfterCol(initialData.aisleAfterCol ?? 1);
      const s = String(initialData.status || "").toUpperCase();
      setStatus(s === "ACTIVE" ? "Active" : s === "INACTIVE" ? "Inactive" : "");
    } else {
      setName("");
      setRows("");
      setCols("");
      setHasAisle(null);
      setAisleAfterCol(1);
      setStatus("");
    }
    setErrors({});
  }, [initialData, isOpen]);

  // Keep aisle position in bounds when columns change
  useEffect(() => {
    const numCols = typeof cols === "number" ? cols : 0;
    if (numCols > 1 && aisleAfterCol >= numCols) {
      setAisleAfterCol(Math.max(1, Math.floor(numCols / 2)));
    }
  }, [cols, aisleAfterCol]);

  const parsedRows = typeof rows === "number" ? Math.max(0, rows) : 0;
  const parsedCols = typeof cols === "number" ? Math.max(0, cols) : 0;
  const totalSeats = parsedRows * parsedCols;

  const handleRowChange = (val: string) => {
    const clean = val.replace(/\D/g, "");
    setRows(clean === "" ? "" : parseInt(clean, 10));
    if (errors.rows) {
      setErrors((prev) => ({ ...prev, rows: "" }));
    }
  };

  const handleColChange = (val: string) => {
    const clean = val.replace(/\D/g, "");
    setCols(clean === "" ? "" : parseInt(clean, 10));
    if (errors.cols) {
      setErrors((prev) => ({ ...prev, cols: "" }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [k: string]: string } = {};

    // 1. Name validation
    if (!name.trim()) {
      newErrors.name = "Seat name is required";
    }

    // 2. Row validation
    if (rows === "" || parsedRows <= 0) {
      newErrors.rows = "Row count is required (min 1)";
    }

    // 3. Column validation
    if (cols === "" || parsedCols <= 0) {
      newErrors.cols = "Column count is required (min 1)";
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
    onSave({
      id: initialData?.id,
      name: name.trim(),
      rows: parsedRows,
      cols: parsedCols,
      hasAisle: !!hasAisle,
      aisleAfterCol: hasAisle ? Math.min(Math.max(1, parsedCols - 1), Math.max(1, aisleAfterCol)) : 0,
      status: status as "Active" | "Inactive",
    });
    onClose();
  };

  const isAisleActive = hasAisle === true;
  const leftColumnsCount = isAisleActive ? Math.min(parsedCols - 1, Math.max(1, aisleAfterCol)) : parsedCols;
  const rightColumnsCount = isAisleActive ? parsedCols - leftColumnsCount : 0;

  // Mouse-based aisle drag handlers
  const handleAisleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isAisleActive || parsedCols <= 1) return;
    e.preventDefault();
    isDraggingRef.current = true;
    setIsDraggingAisle(true);
  }, [isAisleActive, parsedCols]);

  // handlePreviewMouseMove removed — individual gap zones use onMouseEnter instead

  const handlePreviewMouseUp = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDraggingAisle(false);
    if (dragOverCol !== null) {
      setAisleAfterCol(dragOverCol);
      setDragOverCol(null);
    }
  }, [dragOverCol]);

  const handlePreviewMouseLeave = useCallback(() => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      setIsDraggingAisle(false);
      if (dragOverCol !== null) {
        setAisleAfterCol(dragOverCol);
        setDragOverCol(null);
      }
    }
  }, [dragOverCol]);

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
          maxWidth: "900px",
          maxHeight: "92vh",
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
        <form onSubmit={handleSubmit} style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden" }}>
          {/* ── LEFT COLUMN: Inputs ── */}
          <div
            style={{
              width: "320px",
              minWidth: "320px",
              borderRight: "1px solid #E5E7EB",
              padding: "22px 24px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "18px",
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
                placeholder="e.g. Toy Train Coach A"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
                }}
                style={{
                  width: "100%",
                  height: "40px",
                  background: "#FFFFFF",
                  border: errors.name ? "1.5px solid #DC2626" : "1.5px solid #D1D5DB",
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
                <span style={{ fontSize: "11px", color: "#DC2626", marginTop: "4px", display: "block", fontWeight: 500 }}>
                  {errors.name}
                </span>
              )}
            </div>

            {/* 2. Row and Column Fields (Required, numeric) */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              {/* Row */}
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
                  Row <span style={{ color: "#DC2626" }}>*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={rows === "" ? "" : rows}
                  onChange={(e) => handleRowChange(e.target.value)}
                  style={{
                    width: "100%",
                    height: "40px",
                    background: "#FFFFFF",
                    border: errors.rows ? "1.5px solid #DC2626" : "1.5px solid #D1D5DB",
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
                {errors.rows && (
                  <span style={{ fontSize: "10px", color: "#DC2626", marginTop: "3px", display: "block", fontWeight: 500 }}>
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
                    marginBottom: "6px",
                  }}
                >
                  Column <span style={{ color: "#DC2626" }}>*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={cols === "" ? "" : cols}
                  onChange={(e) => handleColChange(e.target.value)}
                  style={{
                    width: "100%",
                    height: "40px",
                    background: "#FFFFFF",
                    border: errors.cols ? "1.5px solid #DC2626" : "1.5px solid #D1D5DB",
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
                {errors.cols && (
                  <span style={{ fontSize: "10px", color: "#DC2626", marginTop: "3px", display: "block", fontWeight: 500 }}>
                    {errors.cols}
                  </span>
                )}
              </div>
            </div>

            {/* 3. Aisle Position (Yes / No) - Required, no default selection */}
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
                    setAisleAfterCol(1); // always default to leftmost position
                    if (errors.hasAisle) setErrors((prev) => ({ ...prev, hasAisle: "" }));
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
                    if (errors.hasAisle) setErrors((prev) => ({ ...prev, hasAisle: "" }));
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
                <span style={{ fontSize: "11px", color: "#DC2626", marginTop: "5px", display: "block", fontWeight: 500 }}>
                  {errors.hasAisle}
                </span>
              )}

              {hasAisle === true && (
                <span
                  style={{
                    fontSize: "11px",
                    color: "#059669",
                    fontWeight: 600,
                    marginTop: "6px",
                    display: "block",
                  }}
                >
                  ✓ Grab and drag the Aisle column on the preview to reposition.
                </span>
              )}
            </div>

            {/* 4. Status (Active / Inactive) - Required, no default selection */}
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
                    if (errors.status) setErrors((prev) => ({ ...prev, status: "" }));
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
                    if (errors.status) setErrors((prev) => ({ ...prev, status: "" }));
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
                <span style={{ fontSize: "11px", color: "#DC2626", marginTop: "5px", display: "block", fontWeight: 500 }}>
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
                  boxShadow: isLoading ? "none" : "0 4px 12px rgba(244,188,67,0.35)",
                  transition: "all 0.18s ease",
                }}
              >
                {isLoading ? "Saving..." : initialData ? "Update Seat Layout" : "Save Seat"}
              </button>
            </div>
          </div>

          {/* ── RIGHT COLUMN: Seat Layout Preview ── */}
          <div
            style={{
              flex: 1,
              padding: "22px 24px",
              background: "#F9FAFB",
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

              {totalSeats > 0 && (
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#0C2A42",
                    background: "#E0F2FE",
                    padding: "4px 10px",
                    borderRadius: "6px",
                  }}
                >
                  {parsedRows} Rows × {parsedCols} Cols ({totalSeats} Seats)
                </span>
              )}
            </div>

            {/* Preview Box */}
            <div
              ref={previewRef}
              onMouseUp={handlePreviewMouseUp}
              onMouseLeave={handlePreviewMouseLeave}
              style={{
                flex: 1,
                minHeight: "260px",
                background: "#FFFFFF",
                border: "1.5px solid #E5E7EB",
                borderRadius: "10px",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                overflow: "auto",
                position: "relative",
                cursor: isDraggingAisle ? "grabbing" : "default",
                userSelect: "none",
              }}
            >
              {parsedRows === 0 || parsedCols === 0 ? (
                /* Perfectly Centered Empty Preview */
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "auto",
                    padding: "24px 20px",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      width: "60px",
                      height: "60px",
                      borderRadius: "14px",
                      background: "#F3F4F6",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: "14px",
                    }}
                  >
                    <Armchair size={34} color="#9CA3AF" />
                  </div>
                  <p
                    style={{
                      margin: "0 0 6px 0",
                      fontWeight: 700,
                      fontSize: "15px",
                      color: "#374151",
                    }}
                  >
                    No seats to preview
                  </p>
                  <p style={{ margin: 0, fontSize: "12px", color: "#9CA3AF", maxWidth: "260px" }}>
                    Enter rows and columns to generate the interactive seat layout.
                  </p>
                </div>
              ) : (
                /* Generated Grid with Continuous Vertical Draggable Aisle (Matching Image 2) */
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "stretch",
                    gap: "0px",
                    margin: "auto",
                    padding: "10px",
                    userSelect: "none",
                  }}
                >
                  {/* Left Column Group */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {Array.from({ length: parsedRows }, (_, rIdx) => {
                      const rowNum = rIdx + 1;
                      return (
                        <div key={`left-row-${rowNum}`} style={{ display: "flex", alignItems: "center", gap: "0px" }}>
                          {/* Row label */}
                          <span
                            style={{
                              width: "24px",
                              marginRight: "4px",
                              fontSize: "11px",
                              fontWeight: 700,
                              color: "#9CA3AF",
                              textAlign: "right",
                              flexShrink: 0,
                            }}
                          >
                            R{rowNum}
                          </span>

                          {/* Left Seats with interactive gap zones between them */}
                          {Array.from({ length: leftColumnsCount }, (_, cIdx) => {
                            const colNum = cIdx + 1;
                            const seatNumber = rIdx * parsedCols + colNum;
                            const isLastLeft = cIdx === leftColumnsCount - 1;
                            // Gap is "after colNum" — only shown between left seats (not after the last)
                            const isGapHovered = dragOverCol === colNum;

                            return (
                              <React.Fragment key={`seat-l-${rowNum}-${colNum}`}>
                                <div
                                  data-seat-col={colNum}
                                  style={{
                                    width: "42px",
                                    height: "36px",
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
                                  }}
                                >
                                  {seatNumber < 10 ? `0${seatNumber}` : seatNumber}
                                </div>

                                {/* Interactive gap zone between consecutive left seats.
                                    Expands during drag so it is easy to hover into.
                                    onMouseEnter highlights it; onMouseUp / onClick commits. */}
                                {isAisleActive && !isLastLeft && (
                                  <div
                                    onMouseEnter={() => {
                                      if (isDraggingRef.current) setDragOverCol(colNum);
                                    }}
                                    onMouseUp={() => {
                                      if (isDraggingRef.current) {
                                        isDraggingRef.current = false;
                                        setIsDraggingAisle(false);
                                        setAisleAfterCol(colNum);
                                        setDragOverCol(null);
                                      }
                                    }}
                                    onClick={() => setAisleAfterCol(colNum)}
                                    title={`Move aisle after column ${colNum}`}
                                    style={{
                                      width: isDraggingAisle ? "28px" : "6px",
                                      height: "36px",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      cursor: isDraggingAisle ? "copy" : "pointer",
                                      flexShrink: 0,
                                      transition: "width 0.12s ease",
                                    }}
                                  >
                                    <div
                                      style={{
                                        width: isGapHovered ? "4px" : "2px",
                                        height: isGapHovered ? "100%" : "55%",
                                        background: isGapHovered ? "#3B82F6" : isDraggingAisle ? "#CBD5E1" : "#E5E7EB",
                                        borderRadius: "2px",
                                        transition: "all 0.1s ease",
                                        pointerEvents: "none",
                                      }}
                                    />
                                  </div>
                                )}

                                {/* Tiny spacer after last left seat before the AISLE bar */}
                                {isLastLeft && <div style={{ width: "6px", flexShrink: 0 }} />}
                              </React.Fragment>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>

                  {/* ── Continuous Full-Height Draggable Aisle ── */}
                  {isAisleActive && parsedCols > 1 && (
                    <div
                      onMouseDown={handleAisleMouseDown}
                      style={{
                        width: "56px",
                        margin: "0 10px",
                        background: isDraggingAisle ? "#FEF3C7" : "rgba(229, 231, 235, 0.55)",
                        border: isDraggingAisle ? "1.5px dashed #F59E0B" : "1.5px dashed #9CA3AF",
                        borderRadius: "6px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: isDraggingAisle ? "grabbing" : "grab",
                        transition: "background 0.15s ease, border-color 0.15s ease",
                        minHeight: `${parsedRows * 36 + (parsedRows - 1) * 8}px`,
                        flexShrink: 0,
                      }}
                      title="Grab and drag to reposition aisle between columns"
                    >
                      <span
                        style={{
                          writingMode: "vertical-rl",
                          textOrientation: "mixed",
                          fontFamily: "'Plus Jakarta Sans', sans-serif",
                          fontWeight: 800,
                          fontSize: "11px",
                          color: isDraggingAisle ? "#92400E" : "#4B5563",
                          letterSpacing: "3px",
                          userSelect: "none",
                          pointerEvents: "none",
                        }}
                      >
                        AISLE
                      </span>
                    </div>
                  )}

                  {/* Right Column Group (if aisle is active) */}
                  {isAisleActive && rightColumnsCount > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {Array.from({ length: parsedRows }, (_, rIdx) => {
                        const rowNum = rIdx + 1;
                        return (
                          <div key={`right-row-${rowNum}`} style={{ display: "flex", alignItems: "center", gap: "0px" }}>
                            {/* Small spacer after the AISLE bar before first right seat */}
                            <div style={{ width: "6px", flexShrink: 0 }} />

                            {Array.from({ length: rightColumnsCount }, (_, cIdx) => {
                              const colNum = leftColumnsCount + cIdx + 1;
                              const seatNumber = rIdx * parsedCols + colNum;
                              const isLastRight = cIdx === rightColumnsCount - 1;
                              // Gap is "after colNum" — only between right seats (not after the last)
                              const isGapHovered = dragOverCol === colNum;

                              return (
                                <React.Fragment key={`seat-r-${rowNum}-${colNum}`}>
                                  <div
                                    data-seat-col={colNum}
                                    style={{
                                      width: "42px",
                                      height: "36px",
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
                                    }}
                                  >
                                    {seatNumber < 10 ? `0${seatNumber}` : seatNumber}
                                  </div>

                                  {/* Interactive gap zone between consecutive right seats.
                                      Expands during drag; onMouseEnter highlights; onMouseUp / onClick commits. */}
                                  {isAisleActive && !isLastRight && (
                                    <div
                                      onMouseEnter={() => {
                                        if (isDraggingRef.current) setDragOverCol(colNum);
                                      }}
                                      onMouseUp={() => {
                                        if (isDraggingRef.current) {
                                          isDraggingRef.current = false;
                                          setIsDraggingAisle(false);
                                          setAisleAfterCol(colNum);
                                          setDragOverCol(null);
                                        }
                                      }}
                                      onClick={() => setAisleAfterCol(colNum)}
                                      title={`Move aisle after column ${colNum}`}
                                      style={{
                                        width: isDraggingAisle ? "28px" : "6px",
                                        height: "36px",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        cursor: isDraggingAisle ? "copy" : "pointer",
                                        flexShrink: 0,
                                        transition: "width 0.12s ease",
                                      }}
                                    >
                                      <div
                                        style={{
                                          width: isGapHovered ? "4px" : "2px",
                                          height: isGapHovered ? "100%" : "55%",
                                          background: isGapHovered ? "#3B82F6" : isDraggingAisle ? "#CBD5E1" : "#E5E7EB",
                                          borderRadius: "2px",
                                          transition: "all 0.1s ease",
                                          pointerEvents: "none",
                                        }}
                                      />
                                    </div>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Instruction Banner Below Preview */}
            <div
              style={{
                marginTop: "12px",
                padding: "10px 14px",
                background: "#EFF6FF",
                border: "1px solid #BFDBFE",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <MoveHorizontal size={16} color="#1D4ED8" />
              <span style={{ fontSize: "12px", color: "#1E40AF", fontWeight: 500 }}>
                💡 <strong>Grab &amp; place aisle:</strong> Click and drag the vertical <strong>AISLE</strong> bar across columns to place it wherever you want.
              </span>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
