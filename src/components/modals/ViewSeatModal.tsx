"use client";

import React from "react";
import { X, Armchair, CheckCircle, XCircle } from "lucide-react";
import { SeatConfigData } from "./CreateSeatModal";

interface ViewSeatModalProps {
  isOpen: boolean;
  onClose: () => void;
  seat: SeatConfigData | null;
  onEdit?: () => void;
}

export default function ViewSeatModal({
  isOpen,
  onClose,
  seat,
  onEdit,
}: ViewSeatModalProps) {
  if (!isOpen || !seat) return null;

  const totalSeats = seat.rows * seat.cols;

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
          maxWidth: "680px",
          maxHeight: "90vh",
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
        <div style={{ padding: "20px 24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "18px" }}>
          {/* Metadata badges */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
              gap: "12px",
              background: "#F9FAFB",
              padding: "14px",
              borderRadius: "10px",
              border: "1px solid #E5E7EB",
            }}
          >
            <div>
              <span style={{ fontSize: "11px", color: "#6B7280", fontWeight: 600, display: "block" }}>
                Total Capacity
              </span>
              <strong style={{ fontSize: "15px", color: "#011B2F" }}>{totalSeats} Seats</strong>
            </div>
            <div>
              <span style={{ fontSize: "11px", color: "#6B7280", fontWeight: 600, display: "block" }}>
                Grid Format
              </span>
              <strong style={{ fontSize: "15px", color: "#011B2F" }}>
                {seat.rows} Rows × {seat.cols} Cols
              </strong>
            </div>
            <div>
              <span style={{ fontSize: "11px", color: "#6B7280", fontWeight: 600, display: "block" }}>
                Aisle
              </span>
              <strong style={{ fontSize: "13px", color: "#011B2F" }}>
                {seat.hasAisle ? `Yes (After Col ${seat.aisleAfterCol})` : "No Aisle"}
              </strong>
            </div>
            <div>
              <span style={{ fontSize: "11px", color: "#6B7280", fontWeight: 600, display: "block" }}>
                Status
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: seat.status === "Active" ? "#059669" : "#DC2626",
                }}
              >
                {seat.status === "Active" ? <CheckCircle size={14} /> : <XCircle size={14} />}
                {seat.status}
              </span>
            </div>
          </div>

          {/* Full Interactive Grid Preview */}
          <div
            style={{
              background: "#FFFFFF",
              border: "1.5px solid #E5E7EB",
              borderRadius: "10px",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              overflow: "auto",
              maxHeight: "360px",
            }}
          >
            <div style={{ display: "inline-flex", flexDirection: "column", gap: "8px" }}>
              {Array.from({ length: seat.rows }, (_, rIdx) => {
                const rowNum = rIdx + 1;
                return (
                  <div key={`view-row-${rowNum}`} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ width: "22px", fontSize: "11px", fontWeight: 700, color: "#9CA3AF", textAlign: "right" }}>
                      R{rowNum}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      {Array.from({ length: seat.cols }, (_, cIdx) => {
                        const colNum = cIdx + 1;
                        const seatNumber = rIdx * seat.cols + colNum;
                        const isAfterThisCol = seat.hasAisle && seat.aisleAfterCol === colNum;

                        return (
                          <React.Fragment key={`view-seat-${rowNum}-${colNum}`}>
                            <div
                              style={{
                                width: "42px",
                                height: "36px",
                                background: "#011B2F",
                                borderRadius: "6px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "11px",
                                fontWeight: 700,
                                color: "#FFFFFF",
                              }}
                            >
                              {seatNumber < 10 ? `0${seatNumber}` : seatNumber}
                            </div>

                            {isAfterThisCol && (
                              <div
                                style={{
                                  width: "50px",
                                  height: "36px",
                                  background: "rgba(229, 231, 235, 0.6)",
                                  border: "1.5px dashed #9CA3AF",
                                  borderRadius: "4px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "9px",
                                  fontWeight: 800,
                                  color: "#4B5563",
                                  letterSpacing: "0.5px",
                                }}
                              >
                                AISLE
                              </div>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
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
                onClose();
                onEdit();
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
