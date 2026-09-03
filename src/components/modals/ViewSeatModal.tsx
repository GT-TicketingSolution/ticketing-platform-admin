"use client";

import React from "react";
import { X, Armchair, CheckCircle, XCircle } from "lucide-react";

import { SeatConfigData } from "@/app/(dashboard)/seat-management/types";

interface ViewSeatModalProps {
  isOpen: boolean;
  onClose: () => void;
  seat: SeatConfigData | null;
  onEdit?: (seat: SeatConfigData) => void;
}

export default function ViewSeatModal({
  isOpen,
  onClose,
  seat,
  onEdit,
}: ViewSeatModalProps) {
  if (!isOpen || !seat) return null;

  const rows = Math.max(1, seat.rows || 1);
  const cols = Math.max(1, seat.cols || 1);

  const totalSeats = seat.totalSeats ?? rows * cols;

  const hasAisle = Boolean(seat.hasAisle);

  const aisleType = seat.aisleDirection ?? null;

  const aislePosition =
    aisleType === "HORIZONTAL"
      ? (seat.aisleAfterRow ?? 0)
      : (seat.aisleAfterCol ?? 0);

  const isActive = String(seat.status || "").toUpperCase() === "ACTIVE";

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
          maxWidth: "800px",
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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <Armchair size={22} color="#F4BC43" />

            <h2
              style={{
                margin: 0,
                fontWeight: 700,
                fontSize: "18px",
                color: "#FFFFFF",
              }}
            >
              {seat.name}
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

        {/* Content */}
        <div
          style={{
            padding: "20px 24px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          {/* Metadata */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: "12px",
              background: "#F9FAFB",
              padding: "14px",
              borderRadius: "10px",
              border: "1px solid #E5E7EB",
            }}
          >
            {/* Capacity */}
            <div>
              <span
                style={{
                  fontSize: "11px",
                  color: "#6B7280",
                  fontWeight: 600,
                  display: "block",
                }}
              >
                Total Capacity
              </span>

              <strong
                style={{
                  fontSize: "15px",
                  color: "#011B2F",
                }}
              >
                {totalSeats} {totalSeats === 1 ? "Seat (Single)" : "Seats"}
              </strong>
            </div>

            {/* Grid */}
            <div>
              <span
                style={{
                  fontSize: "11px",
                  color: "#6B7280",
                  fontWeight: 600,
                  display: "block",
                }}
              >
                Grid Format
              </span>

              <strong
                style={{
                  fontSize: "15px",
                  color: "#011B2F",
                }}
              >
                {rows} Rows × {cols} Cols
              </strong>
            </div>

            {/* Aisle */}
            <div>
              <span
                style={{
                  fontSize: "11px",
                  color: "#6B7280",
                  fontWeight: 600,
                  display: "block",
                }}
              >
                Aisle Position
              </span>

              <strong
                style={{
                  fontSize: "13px",
                  color: "#011B2F",
                }}
              >
                {hasAisle
                  ? `${aisleType === "VERTICAL" ? "Vertical" : "Horizontal"} (${
                      aislePosition === 0
                        ? "Start"
                        : aisleType === "VERTICAL"
                          ? `Col C${aislePosition}`
                          : `Row R${aislePosition}`
                    })`
                  : "No Aisle"}
              </strong>
            </div>

            {/* Status */}
            <div>
              <span
                style={{
                  fontSize: "11px",
                  color: "#6B7280",
                  fontWeight: 600,
                  display: "block",
                }}
              >
                Status
              </span>

              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: isActive ? "#059669" : "#DC2626",
                }}
              >
                {isActive ? <CheckCircle size={14} /> : <XCircle size={14} />}

                {isActive ? "Active" : "Inactive"}
              </span>
            </div>
          </div>

          {/* Full Grid */}
          <div
            style={{
              background: "#FFFFFF",
              border: "1.5px solid #E5E7EB",
              borderRadius: "10px",
              overflow: "auto",
              maxHeight: "380px",
              position: "relative",
            }}
          >
            <div
              style={{
                minWidth: "max-content",
                minHeight: "max-content",
                margin: "auto",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
              }}
            >
              {/* Column Headers */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: "8px",
                }}
              >
                {/* Row label spacer */}
                <div
                  style={{
                    width: "36px",
                    marginRight: "6px",
                    flexShrink: 0,
                  }}
                />

                {/* Vertical aisle at start */}
                {hasAisle &&
                  aisleType === "VERTICAL" &&
                  aislePosition === 0 && (
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

                {Array.from({ length: cols }, (_, cIdx) => {
                  const colNum = cIdx + 1;

                  const isAisleAfterThis =
                    hasAisle &&
                    aisleType === "VERTICAL" &&
                    aislePosition === colNum;

                  return (
                    <React.Fragment key={`view-col-hdr-${colNum}`}>
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

              {/* Horizontal aisle at start */}
              {hasAisle &&
                aisleType === "HORIZONTAL" &&
                aislePosition === 0 && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      margin: "0 0 10px 42px",
                      width: "calc(100% - 42px)",
                      minWidth: `${cols * 52}px`,
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
                      ─── AISLE ───
                    </span>
                  </div>
                )}

              {/* Main Rows */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                {Array.from({ length: rows }, (_, rIdx) => {
                  const rowNum = rIdx + 1;

                  const isHorizontalAisleAfterThis =
                    hasAisle &&
                    aisleType === "HORIZONTAL" &&
                    aislePosition === rowNum;

                  return (
                    <React.Fragment key={`view-grid-row-${rowNum}`}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        {/* Row Label */}
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

                        {/* Vertical aisle at start */}
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

                        {/* Seat Cells */}
                        {Array.from({ length: cols }, (_, cIdx) => {
                          const colNum = cIdx + 1;

                          const seatNumber = rIdx * cols + colNum;

                          const isVerticalAisleAfterThis =
                            hasAisle &&
                            aisleType === "VERTICAL" &&
                            aislePosition === colNum;

                          return (
                            <React.Fragment
                              key={`view-seat-${rowNum}-${colNum}`}
                            >
                              <div
                                style={{
                                  width: "44px",
                                  height: "38px",
                                  background: "#011B2F",
                                  borderRadius: "6px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  color: "#FFFFFF",
                                  marginRight: isVerticalAisleAfterThis
                                    ? "0px"
                                    : "8px",
                                  flexShrink: 0,
                                }}
                              >
                                {seatNumber < 10
                                  ? `0${seatNumber}`
                                  : seatNumber}
                              </div>

                              {/* Vertical aisle */}
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

                      {/* Horizontal aisle */}
                      {isHorizontalAisleAfterThis && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            margin: "2px 0 2px 42px",
                            width: "calc(100% - 42px)",
                            minWidth: `${cols * 52}px`,
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
                            ─── AISLE ───
                          </span>
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "14px 24px",
            borderTop: "1px solid #E5E7EB",
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px",
            background: "#F9FAFB",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              height: "38px",
              padding: "0 20px",
              background: "#FFFFFF",
              border: "1px solid #D1D5DB",
              borderRadius: "6px",
              fontWeight: 600,
              fontSize: "13px",
              color: "#374151",
              cursor: "pointer",
            }}
          >
            Close
          </button>

          {onEdit && (
            <button
              type="button"
              onClick={() => {
                if (seat) {
                  onEdit(seat);
                }
              }}
              style={{
                height: "38px",
                padding: "0 24px",
                background: "#0C2A42",
                border: "none",
                borderRadius: "6px",
                fontWeight: 700,
                fontSize: "13px",
                color: "#FFFFFF",
                cursor: "pointer",
              }}
            >
              Edit Layout
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
