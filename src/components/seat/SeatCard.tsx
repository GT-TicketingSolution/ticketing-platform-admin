"use client";

import React from "react";
import { Eye, Pencil, Trash2, Armchair, CheckCircle2, XCircle } from "lucide-react";
import { SeatConfigData } from "../modals/CreateSeatModal";

import { decodeAisle } from "@/app/(dashboard)/seat-management/types";

interface SeatCardProps {
  seat: SeatConfigData;
  onView: (seat: SeatConfigData) => void;
  onEdit: (seat: SeatConfigData) => void;
  onDelete: (seat: SeatConfigData) => void;
}

export default function SeatCard({ seat, onView, onEdit, onDelete }: SeatCardProps) {
  const rows = Math.max(1, seat.rows || 1);
  const cols = Math.max(1, seat.cols || 1);
  const totalSeats = rows * cols;
  const isSingleSeat = rows === 1 && cols === 1;

  const { hasAisle, aisleType, aislePosition } = decodeAisle(
    seat.hasAisle,
    seat.aisleAfterCol ?? 0
  );

  // Mini preview calculation (cap rows/cols for the 150px thumbnail)
  const previewRows = Math.min(rows, 5);
  const previewCols = Math.min(cols, 6);

  return (
    <div
      style={{
        boxSizing: "border-box",
        width: "100%",
        maxWidth: "237px",
        minHeight: "355px",
        background: "#FFFFFF",
        border: "1.5px solid rgba(179, 175, 175, 0.51)",
        borderRadius: "8px",
        padding: "6px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        margin: "0 auto",
      }}
      className="seat-card-item"
    >
      <div>
        {/* Top: Mini Seat Layout Preview */}
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "150px",
            borderRadius: "8px",
            overflow: "hidden",
            background: "linear-gradient(135deg, #011B2F 0%, #0C2A42 100%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "8px",
            boxSizing: "border-box",
          }}
        >
          {/* Visual Mini Seat Grid */}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px", margin: "auto" }}>
            {/* Horizontal Aisle at Start (Position 0) */}
            {hasAisle && aisleType === "HORIZONTAL" && aislePosition === 0 && (
              <div
                style={{
                  width: "100%",
                  height: "4px",
                  borderBottom: "1px dashed rgba(255,255,255,0.6)",
                  margin: "1px 0",
                }}
              />
            )}

            {Array.from({ length: previewRows }, (_, rIdx) => {
              const rowNum = rIdx + 1;
              const isHorizontalAisle =
                hasAisle &&
                aisleType === "HORIZONTAL" &&
                aislePosition === rowNum;

              return (
                <React.Fragment key={`mini-r-${rIdx}`}>
                  <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                    {/* Vertical Aisle at Start (Position 0) */}
                    {hasAisle && aisleType === "VERTICAL" && aislePosition === 0 && (
                      <div
                        style={{
                          width: "4px",
                          height: "14px",
                          borderRight: "1px dashed rgba(255,255,255,0.6)",
                          margin: "0 2px",
                        }}
                      />
                    )}

                    {Array.from({ length: previewCols }, (_, cIdx) => {
                      const colNum = cIdx + 1;
                      const isVerticalAisle =
                        hasAisle &&
                        aisleType === "VERTICAL" &&
                        aislePosition === colNum;

                      return (
                        <React.Fragment key={`mini-c-${rIdx}-${cIdx}`}>
                          <div
                            style={{
                              width: isSingleSeat ? "32px" : "18px",
                              height: isSingleSeat ? "24px" : "14px",
                              background: "#F4BC43",
                              borderRadius: "2px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: isSingleSeat ? "9px" : "7px",
                              fontWeight: 800,
                              color: "#011B2F",
                            }}
                          >
                            {isSingleSeat ? "01" : ""}
                          </div>
                          {isVerticalAisle && (
                            <div
                              style={{
                                width: "6px",
                                height: "14px",
                                borderRight: "1px dashed rgba(255,255,255,0.5)",
                                margin: "0 2px",
                              }}
                            />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>

                  {/* Horizontal Aisle after this row */}
                  {isHorizontalAisle && (
                    <div
                      style={{
                        width: "100%",
                        height: "4px",
                        borderBottom: "1px dashed rgba(255,255,255,0.5)",
                        margin: "1px 0",
                      }}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Subtitle tag */}
          <div
            style={{
              position: "absolute",
              bottom: "6px",
              left: "6px",
              right: "6px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "9px",
              color: "#FFFFFF",
              fontWeight: 600,
              background: "rgba(0,0,0,0.5)",
              padding: "2px 6px",
              borderRadius: "4px",
            }}
          >
            <span>{isSingleSeat ? "Single Seat" : `${rows}R × ${cols}C`}</span>
            <span>{totalSeats} {totalSeats === 1 ? "Seat" : "Seats"}</span>
          </div>
        </div>

        {/* Content Details */}
        <div style={{ padding: "10px 8px 4px 8px" }}>
          {/* Name of the seat */}
          <h3
            style={{
              margin: 0,
              fontWeight: 700,
              fontSize: "13px",
              lineHeight: "16px",
              color: "#173F63",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={seat.name}
          >
            {seat.name}
          </h3>

          {/* Status badge */}
          <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "4px" }}>
            {String(seat.status || "").toUpperCase() === "ACTIVE" ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "3px",
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "#059669",
                  background: "#ECFDF5",
                  padding: "1px 6px",
                  borderRadius: "4px",
                }}
              >
                <CheckCircle2 size={10} />
                Active
              </span>
            ) : (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "3px",
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "#DC2626",
                  background: "#FEE2E2",
                  padding: "1px 6px",
                  borderRadius: "4px",
                }}
              >
                <XCircle size={10} />
                Inactive
              </span>
            )}
          </div>

          {/* Row & Column details */}
          <div style={{ marginTop: "8px", fontSize: "10px", color: "rgba(81,82,82,0.88)", lineHeight: "14px" }}>
            <span style={{ fontWeight: 600 }}>Rows:</span> {rows} &bull; <span style={{ fontWeight: 600 }}>Cols:</span> {cols}
          </div>

          {/* Aisle details */}
          <div style={{ marginTop: "4px", fontSize: "10px", color: "rgba(81,82,82,0.88)", lineHeight: "14px" }}>
            <span style={{ fontWeight: 600 }}>Aisle:</span>{" "}
            {hasAisle
              ? `${aisleType === "VERTICAL" ? "Vertical" : "Horizontal"} (${
                  aislePosition === 0
                    ? "Start"
                    : aisleType === "VERTICAL"
                      ? `Col C${aislePosition}`
                      : `Row R${aislePosition}`
                })`
              : "No Aisle"}
          </div>
        </div>
      </div>

      {/* Action Buttons: View, Edit, Delete */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
          marginTop: "12px",
          padding: "0 4px 4px 4px",
        }}
      >
        {/* View */}
        <button
          type="button"
          onClick={() => onView(seat)}
          style={{
            boxSizing: "border-box",
            flex: 1,
            height: "30px",
            background: "#FFFFFF",
            border: "1px solid #0C2A42",
            borderRadius: "5px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "3px",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
          className="btn-view"
          title="View Seat Layout"
        >
          <Eye size={12} color="#0C2A42" strokeWidth={2} />
          <span style={{ fontWeight: 600, fontSize: "11px", color: "#0C2A42" }}>View</span>
        </button>

        {/* Edit */}
        <button
          type="button"
          onClick={() => onEdit(seat)}
          style={{
            boxSizing: "border-box",
            flex: 1,
            height: "30px",
            background: "#FFFFFF",
            border: "1px solid #2372A5",
            borderRadius: "5px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "3px",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
          className="btn-edit"
          title="Edit Seat Layout"
        >
          <Pencil size={12} color="#2372A5" strokeWidth={2} />
          <span style={{ fontWeight: 600, fontSize: "11px", color: "#2372A5" }}>Edit</span>
        </button>

        {/* Delete */}
        <button
          type="button"
          onClick={() => onDelete(seat)}
          style={{
            boxSizing: "border-box",
            flex: 1,
            height: "30px",
            background: "#FFFFFF",
            border: "1px solid #DC2626",
            borderRadius: "5px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "3px",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
          className="btn-delete"
          title="Delete Seat Layout"
        >
          <Trash2 size={12} color="#DC2626" strokeWidth={2} />
          <span style={{ fontWeight: 600, fontSize: "11px", color: "#DC2626" }}>Delete</span>
        </button>
      </div>

      <style>{`
        .seat-card-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
        }
        .btn-view:hover {
          background: #0C2A42 !important;
        }
        .btn-view:hover span, .btn-view:hover svg {
          color: #FFFFFF !important;
          stroke: #FFFFFF !important;
        }
        .btn-edit:hover {
          background: #2372A5 !important;
        }
        .btn-edit:hover span, .btn-edit:hover svg {
          color: #FFFFFF !important;
          stroke: #FFFFFF !important;
        }
        .btn-delete:hover {
          background: #DC2626 !important;
        }
        .btn-delete:hover span, .btn-delete:hover svg {
          color: #FFFFFF !important;
          stroke: #FFFFFF !important;
        }
      `}</style>
    </div>
  );
}
