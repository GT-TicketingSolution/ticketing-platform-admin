"use client";

import React, { useState } from "react";
import { X, Armchair, Check, Plus, Trash2 } from "lucide-react";
import { typography } from "@/lib/theme";
import { Attraction } from "@/types/admin";

interface SeatingConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  attraction: Attraction | null;
}

export default function SeatingConfigModal({
  isOpen,
  onClose,
  attraction,
}: SeatingConfigModalProps) {
  const [totalCoaches, setTotalCoaches] = useState(4);
  const [seatsPerCoach, setSeatsPerCoach] = useState(12);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen || !attraction) return null;

  const totalCapacity = totalCoaches * seatsPerCoach;

  const handleSave = () => {
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(12, 42, 66, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "20px",
          width: "100%",
          maxWidth: "520px",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.25)",
          border: "1px solid rgba(179, 175, 175, 0.4)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 24px",
            background: "#10B981",
            color: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Armchair size={22} color="#FFFFFF" />
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, fontFamily: typography.fontFamily.sans }}>
                Seating Configuration
              </h3>
              <p style={{ margin: 0, fontSize: "12px", opacity: 0.9, fontFamily: typography.fontFamily.sans }}>
                {attraction.name} ({attraction.category})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "#FFFFFF",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
          <div
            style={{
              background: "#ECFDF5",
              border: "1px solid #A7F3D0",
              borderRadius: "10px",
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span style={{ fontSize: "13px", color: "#065F46", fontWeight: 600, fontFamily: typography.fontFamily.sans }}>
              Total Calculated Capacity:
            </span>
            <strong style={{ fontSize: "18px", color: "#047857", fontFamily: typography.fontFamily.sans }}>
              {totalCapacity} Seats
            </strong>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#011B2F",
                  marginBottom: "6px",
                  fontFamily: typography.fontFamily.sans,
                }}
              >
                Number of Coaches / Compartments
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={totalCoaches}
                onChange={(e) => setTotalCoaches(Number(e.target.value))}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1.5px solid rgba(179, 175, 175, 0.51)",
                  fontSize: "14px",
                  fontWeight: 600,
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#011B2F",
                  marginBottom: "6px",
                  fontFamily: typography.fontFamily.sans,
                }}
              >
                Seats per Coach
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={seatsPerCoach}
                onChange={(e) => setSeatsPerCoach(Number(e.target.value))}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1.5px solid rgba(179, 175, 175, 0.51)",
                  fontSize: "14px",
                  fontWeight: 600,
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          {/* Grid visual preview */}
          <div>
            <span
              style={{
                display: "block",
                fontSize: "12px",
                fontWeight: 700,
                color: "#011B2F",
                marginBottom: "8px",
                fontFamily: typography.fontFamily.sans,
              }}
            >
              Coach Layout Preview
            </span>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(28px, 1fr))",
                gap: "6px",
                maxHeight: "130px",
                overflowY: "auto",
                background: "#F8FAFC",
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid #E2E8F0",
              }}
            >
              {Array.from({ length: Math.min(totalCapacity, 60) }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    height: "28px",
                    background: "#10B981",
                    color: "#FFFFFF",
                    fontSize: "10px",
                    fontWeight: 700,
                    borderRadius: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: typography.fontFamily.sans,
                  }}
                >
                  S{i + 1}
                </div>
              ))}
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
            <button
              onClick={onClose}
              style={{
                padding: "10px 20px",
                borderRadius: "8px",
                border: "1.5px solid rgba(179, 175, 175, 0.51)",
                background: "#FFFFFF",
                color: "#011B2F",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              style={{
                padding: "10px 24px",
                borderRadius: "8px",
                border: "none",
                background: "#10B981",
                color: "#FFFFFF",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              {savedSuccess ? <Check size={16} /> : null}
              {savedSuccess ? "Saved Capacity!" : "Save Configuration"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
