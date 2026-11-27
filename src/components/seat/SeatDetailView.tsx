"use client";

import React from "react";
import { ArrowLeft, Pencil, Trash2, Armchair } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import { SeatConfigData } from "@/app/(dashboard)/seat-management/types";

interface SeatDetailViewProps {
  seat: SeatConfigData;
  onBack: () => void;
  onEdit: (seat: SeatConfigData) => void;
  onDelete: (seat: SeatConfigData) => void;
  canManage: boolean;
}

export default function SeatDetailView({
  seat,
  onBack,
  onEdit,
  onDelete,
  canManage,
}: SeatDetailViewProps) {
  const rows = Math.max(1, seat.rows || 1);
  const cols = Math.max(1, seat.cols || 1);
  const totalSeats = seat.totalSeats ?? rows * cols;
  const hasAisle = Boolean(seat.hasAisle);
  const aisleType = seat.aisleDirection ?? "VERTICAL";
  const aislePosition =
    aisleType === "HORIZONTAL"
      ? (seat.aisleAfterRow ?? 0)
      : (seat.aisleAfterCol ?? 0);
  const isSingleSeat = rows === 1 && cols === 1;

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
      {/* ── Top Header Bar (Back button on left, Edit & Delete on right) ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
          width: "100%",
        }}
      >
        <button
          type="button"
          onClick={onBack}
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
          }}
        >
          <ArrowLeft size={18} color="#011B2F" strokeWidth={2.5} />
          <span>Back to Seat Management</span>
        </button>

        {canManage && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              type="button"
              onClick={() => onEdit(seat)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 18px",
                borderRadius: "8px",
                border: "1.5px solid #2372A5",
                background: "#FFFFFF",
                color: "#2372A5",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.18s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#F0F7FF";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#FFFFFF";
              }}
            >
              <Pencil size={15} color="#2372A5" strokeWidth={2.2} />
              <span>Edit</span>
            </button>

            <button
              type="button"
              onClick={() => onDelete(seat)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 18px",
                borderRadius: "8px",
                border: "1.5px solid #DC2626",
                background: "#FFFFFF",
                color: "#DC2626",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.18s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#FEF2F2";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#FFFFFF";
              }}
            >
              <Trash2 size={15} color="#DC2626" strokeWidth={2.2} />
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Main Layout: Left Details Card & Right Preview Card ── */}
      <div
        style={{
          display: "flex",
          gap: "24px",
          width: "100%",
          alignItems: "flex-start",
        }}
        className="seat-detail-container"
      >
        {/* Left Column: Details */}
        <div
          style={{
            width: "350px",
            minWidth: "350px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
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
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Armchair size={20} color="#0C2A42" />
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
            </div>

            <div>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#6B7280",
                  display: "block",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Seat Name
              </span>
              <span
                style={{
                  fontSize: "15px",
                  fontWeight: 700,
                  color: "#011B2F",
                  marginTop: "2px",
                  display: "block",
                }}
              >
                {seat.name}
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#6B7280",
                    display: "block",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Rows
                </span>
                <span
                  style={{
                    fontSize: "14px",
                    fontWeight: 700,
                    color: "#011B2F",
                    marginTop: "2px",
                    display: "block",
                  }}
                >
                  {rows}
                </span>
              </div>

              <div>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#6B7280",
                    display: "block",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Columns
                </span>
                <span
                  style={{
                    fontSize: "14px",
                    fontWeight: 700,
                    color: "#011B2F",
                    marginTop: "2px",
                    display: "block",
                  }}
                >
                  {cols}
                </span>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#6B7280",
                    display: "block",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Total Capacity
                </span>
                <span
                  style={{
                    fontSize: "14px",
                    fontWeight: 700,
                    color: "#011B2F",
                    marginTop: "2px",
                    display: "block",
                  }}
                >
                  {totalSeats} Seats
                </span>
              </div>

              <div>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#6B7280",
                    display: "block",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    marginBottom: "4px",
                  }}
                >
                  Status
                </span>
                <StatusBadge status={seat.status || "Active"} size="sm" />
              </div>
            </div>

            <div
              style={{
                borderTop: "1px solid #F1F5F9",
                paddingTop: "14px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <h4
                style={{
                  margin: 0,
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#011B2F",
                }}
              >
                Aisle Configuration
              </h4>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "12px", color: "#64748B", fontWeight: 600 }}>
                  Aisle Position:
                </span>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    color: hasAisle ? "#0284C7" : "#64748B",
                  }}
                >
                  {hasAisle ? "Configured (Yes)" : "None (No)"}
                </span>
              </div>

              {hasAisle && (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "12px", color: "#64748B", fontWeight: 600 }}>
                      Direction:
                    </span>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#011B2F" }}>
                      {aisleType === "HORIZONTAL" ? "Horizontal" : "Vertical"}
                    </span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "12px", color: "#64748B", fontWeight: 600 }}>
                      Placement:
                    </span>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#011B2F" }}>
                      {aislePosition === 0
                        ? "At Start"
                        : aisleType === "HORIZONTAL"
                          ? `After Row R${aislePosition}`
                          : `After Col C${aislePosition}`}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Seat Layout Preview */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            minWidth: 0,
          }}
        >
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
                  border: isSingleSeat ? "1px solid #A7F3D0" : "1px solid #BAE6FD",
                }}
              >
                {isSingleSeat
                  ? "Single Standalone Seat (1 Seat)"
                  : `${rows} Rows × ${cols} Cols (${totalSeats} Seats)`}
              </span>
            </div>

            {/* Canvas grid box */}
            <div
              style={{
                minHeight: "340px",
                background: "#F8FAFC",
                border: "1.5px solid #E2E8F0",
                borderRadius: "10px",
                overflow: "auto",
                padding: "24px",
                boxSizing: "border-box",
              }}
            >
              {/* Row-based Layout */}
              <div
                style={{
                  minWidth: "max-content",
                  minHeight: "max-content",
                  margin: "auto",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                }}
              >
                {/* Column Headers */}
                <div style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
                  <div style={{ width: "36px", marginRight: "6px", flexShrink: 0 }} />
                  {Array.from({ length: cols }, (_, cIdx) => (
                    <div
                      key={`ch-${cIdx + 1}`}
                      style={{
                        width: "44px",
                        textAlign: "center",
                        fontSize: "11px",
                        fontWeight: 800,
                        color: "#64748B",
                        background: "#F1F5F9",
                        borderRadius: "4px",
                        padding: "2px 0",
                        marginRight: cIdx === cols - 1 ? "0px" : "8px",
                        flexShrink: 0,
                      }}
                    >
                      C{cIdx + 1}
                    </div>
                  ))}
                </div>

                {/* Rows & Seats */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {Array.from({ length: rows }, (_, rIdx) => {
                    const rowNum = rIdx + 1;
                    return (
                      <div key={`vr-${rowNum}`} style={{ display: "flex", alignItems: "center" }}>
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

                        {Array.from({ length: cols }, (_, cIdx) => {
                          const colNum = cIdx + 1;
                          const seatNumber = (rowNum - 1) * cols + colNum;
                          return (
                            <div
                              key={`seat-${rowNum}-${colNum}`}
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
                                marginRight: cIdx === cols - 1 ? "0px" : "8px",
                                flexShrink: 0,
                                boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)",
                                boxSizing: "border-box",
                              }}
                              title={`Row ${rowNum}, Column ${colNum} (Seat #${seatNumber})`}
                            >
                              <span>{seatNumber < 10 ? `0${seatNumber}` : seatNumber}</span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
