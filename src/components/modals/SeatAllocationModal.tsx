"use client";

import React, { useState, useEffect, useMemo } from "react";
import { X, Armchair, Check, Search, Loader2 } from "lucide-react";
import { SeatConfigData } from "@/components/modals/CreateSeatModal";
import { useSeatLayouts } from "@/hooks/useSeatQueries";

interface SeatAllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  attractionName: string;
  currentSeatId?: string;
  currentSeatIds?: string[];
  onSelect: (seat: SeatConfigData) => void;
  onSelectMultiple?: (seats: SeatConfigData[]) => void;
}

export default function SeatAllocationModal({
  isOpen,
  onClose,
  attractionName,
  currentSeatId,
  currentSeatIds,
  onSelect,
  onSelectMultiple,
}: SeatAllocationModalProps) {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data: seatData, isLoading: isSeatsLoading } = useSeatLayouts();
  const seats: SeatConfigData[] = useMemo(() => {
    if (!seatData?.items || !Array.isArray(seatData.items)) return [];
    return seatData.items.map((s) => ({
      id: s.id,
      name: s.name,
      rows: s.rows,
      cols: s.cols,
      hasAisle: s.hasAisle,
      aisleAfterCol: s.aisleAfterCol,
      status: s.status,
      totalSeats: s.totalSeats ?? s.rows * s.cols,
    }));
  }, [seatData]);

  useEffect(() => {
    if (!isOpen) return;
    const initial = currentSeatIds?.length
      ? currentSeatIds
      : currentSeatId
      ? [currentSeatId]
      : [];
    setSelectedIds(initial);
    setSearch("");
  }, [isOpen, currentSeatId, currentSeatIds]);

  if (!isOpen) return null;

  const filtered = seats.filter(
    (s) =>
      (s.status as string)?.toUpperCase() === "ACTIVE" &&
      s.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSeatSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleConfirm = () => {
    const selectedSeats = seats.filter((s) => selectedIds.includes(s.id!));
    if (selectedSeats.length > 0) {
      if (onSelectMultiple) {
        onSelectMultiple(selectedSeats);
      } else {
        onSelect(selectedSeats[0]);
      }
      onClose();
    }
  };

  // Mini grid thumbnail renderer
  const MiniGrid = ({ seat }: { seat: SeatConfigData }) => {
    const maxRows = Math.min(seat.rows, 6);
    const maxCols = Math.min(seat.cols, 8);
    const cellSize = 10;
    const gap = 3;

    const leftCols = seat.hasAisle
      ? Math.min(seat.aisleAfterCol, maxCols - 1)
      : maxCols;
    const rightCols = seat.hasAisle ? maxCols - leftCols : 0;

    return (
      <div
        style={{
          display: "inline-flex",
          alignItems: "stretch",
          gap: "2px",
          padding: "4px",
        }}
      >
        {/* Left group */}
        <div style={{ display: "flex", flexDirection: "column", gap: `${gap}px` }}>
          {Array.from({ length: maxRows }, (_, r) => (
            <div key={r} style={{ display: "flex", gap: `${gap}px` }}>
              {Array.from({ length: leftCols }, (_, c) => (
                <div
                  key={c}
                  style={{
                    width: `${cellSize}px`,
                    height: `${cellSize}px`,
                    background: "#FFFFFF",
                    border: "1px solid #0C2A42",
                    borderRadius: "2px",
                  }}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Aisle */}
        {seat.hasAisle && (
          <div
            style={{
              width: "10px",
              background: "rgba(229,231,235,0.6)",
              border: "1px dashed #9CA3AF",
              borderRadius: "2px",
              margin: "0 2px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          />
        )}

        {/* Right group */}
        {seat.hasAisle && rightCols > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: `${gap}px` }}>
            {Array.from({ length: maxRows }, (_, r) => (
              <div key={r} style={{ display: "flex", gap: `${gap}px` }}>
                {Array.from({ length: rightCols }, (_, c) => (
                  <div
                    key={c}
                    style={{
                      width: `${cellSize}px`,
                      height: `${cellSize}px`,
                      background: "#FFFFFF",
                      border: "1px solid #0C2A42",
                      borderRadius: "2px",
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(1, 27, 47, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9000,
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "660px",
          maxHeight: "88vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          overflow: "hidden",
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
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Armchair size={22} color="#F4BC43" />
            <div>
              <h2 style={{ margin: 0, fontWeight: 700, fontSize: "17px", color: "#FFFFFF" }}>
                Seat Allocation
              </h2>
              <p style={{ margin: 0, fontSize: "12px", color: "rgba(255,255,255,0.6)", marginTop: "2px" }}>
                {attractionName}
              </p>
            </div>
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

        {/* Search */}
        <div
          style={{
            padding: "16px 24px 12px 24px",
            borderBottom: "1px solid #F3F4F6",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "#F9FAFB",
              border: "1.5px solid #E5E7EB",
              borderRadius: "8px",
              padding: "0 12px",
              height: "38px",
            }}
          >
            <Search size={15} color="#9CA3AF" />
            <input
              type="text"
              placeholder="Search seat layouts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                background: "transparent",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 500,
                fontSize: "13px",
                color: "#011B2F",
              }}
            />
          </div>
        </div>

        {/* Seat List */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
          {isSeatsLoading ? (
            <div style={{ textAlign: "center", padding: "48px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
              <Loader2 size={28} color="#2372A5" style={{ animation: "spin 1s linear infinite" }} />
              <span style={{ fontSize: "13px", color: "#64748B", fontWeight: 500 }}>
                Loading seat layouts...
              </span>
            </div>
          ) : filtered.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "48px 20px",
              }}
            >
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "14px",
                  background: "#F3F4F6",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 14px auto",
                }}
              >
                <Armchair size={30} color="#9CA3AF" />
              </div>
              <p style={{ margin: "0 0 6px 0", fontWeight: 700, fontSize: "14px", color: "#374151" }}>
                {seats.length === 0 ? "No seat layouts created yet" : "No active seat layouts found"}
              </p>
              <p style={{ margin: 0, fontSize: "12px", color: "#9CA3AF" }}>
                {seats.length === 0
                  ? "Go to Seat Management to create a seat layout first."
                  : "Try a different search term or check Seat Management."}
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {filtered.map((seat) => {
                const isSelected = selectedIds.includes(seat.id!);
                return (
                  <div
                    key={seat.id}
                    onClick={() => toggleSeatSelection(seat.id!)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "16px",
                      padding: "14px 16px",
                      background: isSelected ? "#EFF6FF" : "#FAFAFA",
                      border: isSelected ? "2px solid #0C2A42" : "1.5px solid #E5E7EB",
                      borderRadius: "10px",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {/* Mini Grid Preview */}
                    <div
                      style={{
                        background: "#F3F4F6",
                        borderRadius: "8px",
                        padding: "6px",
                        flexShrink: 0,
                        minWidth: "80px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <MiniGrid seat={seat} />
                    </div>

                    {/* Seat Info */}
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: "14px", color: "#011B2F" }}>
                        {seat.name}
                      </p>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "5px" }}>
                        <span style={{ fontSize: "12px", color: "#6B7280", fontWeight: 500 }}>
                          {seat.rows} Rows × {seat.cols} Cols
                        </span>
                        <span style={{ fontSize: "11px", color: "#6B7280" }}>•</span>
                        <span style={{ fontSize: "12px", color: "#6B7280", fontWeight: 500 }}>
                          {seat.rows * seat.cols} Seats
                        </span>
                        {seat.hasAisle && (
                          <>
                            <span style={{ fontSize: "11px", color: "#6B7280" }}>•</span>
                            <span style={{ fontSize: "12px", color: "#059669", fontWeight: 600 }}>
                              Aisle
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Selection Indicator */}
                    <div
                      style={{
                        width: "22px",
                        height: "22px",
                        borderRadius: "6px",
                        background: isSelected ? "#0C2A42" : "#FFFFFF",
                        border: isSelected ? "2px solid #0C2A42" : "2px solid #D1D5DB",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        transition: "all 0.15s ease",
                      }}
                    >
                      {isSelected && <Check size={13} color="#FFFFFF" strokeWidth={3} />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid #F3F4F6",
            display: "flex",
            gap: "12px",
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              height: "42px",
              background: "#FFFFFF",
              border: "1.5px solid #D1D5DB",
              borderRadius: "8px",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 600,
              fontSize: "14px",
              color: "#4B5563",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={selectedIds.length === 0}
            style={{
              flex: 1,
              height: "42px",
              background: selectedIds.length > 0 ? "#0C2A42" : "#D1D5DB",
              border: "none",
              borderRadius: "8px",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 700,
              fontSize: "14px",
              color: selectedIds.length > 0 ? "#FFFFFF" : "#9CA3AF",
              cursor: selectedIds.length > 0 ? "pointer" : "not-allowed",
              transition: "all 0.15s ease",
            }}
          >
            {selectedIds.length > 1
              ? `Assign ${selectedIds.length} Seat Layouts`
              : "Assign Seat Layout"}
          </button>
        </div>
      </div>
    </div>
  );
}
