"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { BarChart2, Clock, X, Check } from "lucide-react";
import { typography } from "@/lib/theme";

interface ReportTimingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (hours: number) => void;
  currentHours?: number | string;
  targetLabel?: string;
}

const PRESET_OPTIONS = [
  { label: "24 Hours (1 Day)", hours: 24 },
  { label: "48 Hours (2 Days)", hours: 48 },
  { label: "3 Days (72h)", hours: 72 },
  { label: "7 Days (1 Week)", hours: 168 },
  { label: "14 Days", hours: 336 },
  { label: "30 Days (1 Month)", hours: 720 },
];

export default function ReportTimingModal({
  isOpen,
  onClose,
  onApply,
  currentHours,
  targetLabel,
}: ReportTimingModalProps) {
  const [mounted, setMounted] = useState(false);
  const [unit, setUnit] = useState<"hours" | "days">("hours");
  const [inputValue, setInputValue] = useState<string>("24");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    setMounted(true);
  }, []);

  // When opening, initialize from currentHours if provided, otherwise default to 24 hours
  useEffect(() => {
    if (isOpen) {
      const parsed = Number(currentHours);
      if (parsed && !isNaN(parsed) && parsed > 0) {
        setInputValue(String(parsed));
        setUnit("hours");
      } else {
        setInputValue("24");
        setUnit("hours");
      }
      setError("");
    }
  }, [isOpen, currentHours]);

  if (!isOpen || !mounted) return null;

  // Calculate total hours from inputValue and unit
  const numValue = Number(inputValue) || 0;
  const totalHours = unit === "days" ? numValue * 24 : numValue;
  const daysEquivalent = (totalHours / 24).toFixed(1).replace(/\.0$/, "");

  const handleSelectPreset = (hours: number) => {
    setError("");
    if (unit === "days") {
      setInputValue(String(hours / 24));
    } else {
      setInputValue(String(hours));
    }
  };

  const handleApply = () => {
    if (!inputValue || numValue <= 0 || !Number.isInteger(numValue)) {
      setError("Please enter a valid positive whole number greater than 0.");
      return;
    }

    if (totalHours > 8760) {
      setError("Report access duration cannot exceed 365 days (8760 hours).");
      return;
    }

    onApply(totalHours);
  };

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100005,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        background: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "520px",
          background: "#FFFFFF",
          borderRadius: "16px",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
          border: "1px solid #E2E8F0",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid #F1F5F9",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: "#F4BC43",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 10px rgba(244, 188, 67, 0.35)",
                flexShrink: 0,
              }}
            >
              <BarChart2 size={22} color="#0C2A42" strokeWidth={2.2} />
            </div>
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: "17px",
                  fontWeight: 700,
                  color: "#0F172A",
                  fontFamily: typography.fontFamily.sans,
                }}
              >
                Assign Report Access Timing
              </h3>
              <p
                style={{
                  margin: "2px 0 0 0",
                  fontSize: "13px",
                  color: "#64748B",
                  fontFamily: typography.fontFamily.sans,
                }}
              >
                {targetLabel
                  ? `Configure past report viewing window for ${targetLabel}`
                  : "Specify the past duration for staff report viewing"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              border: "1px solid #E2E8F0",
              background: "#F8FAFC",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#64748B",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#F1F5F9";
              e.currentTarget.style.color = "#0F172A";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#F8FAFC";
              e.currentTarget.style.color = "#64748B";
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Quick Presets */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "12px",
                fontWeight: 700,
                color: "#475569",
                marginBottom: "8px",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Quick Presets
            </label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "8px",
              }}
            >
              {PRESET_OPTIONS.map((opt) => {
                const isSelected = totalHours === opt.hours;
                return (
                  <button
                    key={opt.hours}
                    type="button"
                    onClick={() => handleSelectPreset(opt.hours)}
                    style={{
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: `1.5px solid ${isSelected ? "#F4BC43" : "#E2E8F0"}`,
                      background: isSelected ? "rgba(244, 188, 67, 0.12)" : "#FFFFFF",
                      color: isSelected ? "#0C2A42" : "#334155",
                      fontSize: "12px",
                      fontWeight: isSelected ? 700 : 500,
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "2px",
                      transition: "all 0.15s ease",
                      boxShadow: isSelected ? "0 2px 6px rgba(244, 188, 67, 0.2)" : "none",
                    }}
                  >
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Duration Input */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "12px",
                fontWeight: 700,
                color: "#475569",
                marginBottom: "8px",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Custom Access Timing
            </label>
            <div style={{ display: "flex", gap: "10px" }}>
              <div style={{ flex: 1, position: "relative" }}>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value);
                    setError("");
                  }}
                  placeholder="Enter duration"
                  style={{
                    width: "100%",
                    height: "44px",
                    padding: "0 14px",
                    borderRadius: "8px",
                    border: `1.5px solid ${error ? "#EF4444" : "#CBD5E1"}`,
                    fontSize: "15px",
                    fontWeight: 600,
                    color: "#0F172A",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => {
                    if (!error) e.currentTarget.style.borderColor = "#F4BC43";
                  }}
                  onBlur={(e) => {
                    if (!error) e.currentTarget.style.borderColor = "#CBD5E1";
                  }}
                />
              </div>

              {/* Unit Selector: Hours or Days */}
              <div
                style={{
                  display: "flex",
                  borderRadius: "8px",
                  border: "1.5px solid #CBD5E1",
                  background: "#F8FAFC",
                  padding: "3px",
                  height: "44px",
                  boxSizing: "border-box",
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (unit !== "hours") {
                      setUnit("hours");
                      if (numValue > 0) setInputValue(String(numValue * 24));
                    }
                  }}
                  style={{
                    padding: "0 14px",
                    borderRadius: "6px",
                    border: "none",
                    background: unit === "hours" ? "#F4BC43" : "transparent",
                    color: unit === "hours" ? "#0C2A42" : "#64748B",
                    fontWeight: unit === "hours" ? 700 : 500,
                    fontSize: "13px",
                    cursor: "pointer",
                    boxShadow: unit === "hours" ? "0 1px 4px rgba(244,188,67,0.3)" : "none",
                    transition: "all 0.15s ease",
                  }}
                >
                  Hours
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (unit !== "days") {
                      setUnit("days");
                      if (numValue > 0) {
                        const d = Math.max(1, Math.round(numValue / 24));
                        setInputValue(String(d));
                      }
                    }
                  }}
                  style={{
                    padding: "0 14px",
                    borderRadius: "6px",
                    border: "none",
                    background: unit === "days" ? "#F4BC43" : "transparent",
                    color: unit === "days" ? "#0C2A42" : "#64748B",
                    fontWeight: unit === "days" ? 700 : 500,
                    fontSize: "13px",
                    cursor: "pointer",
                    boxShadow: unit === "days" ? "0 1px 4px rgba(244,188,67,0.3)" : "none",
                    transition: "all 0.15s ease",
                  }}
                >
                  Days
                </button>
              </div>
            </div>

            {error && (
              <span style={{ fontSize: "12px", color: "#EF4444", marginTop: "4px", display: "block" }}>
                {error}
              </span>
            )}
          </div>

          {/* Live Preview Box */}
          <div
            style={{
              padding: "14px 16px",
              borderRadius: "10px",
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "#DCFCE7",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Check size={18} color="#16A34A" />
            </div>
            <div>
              <div style={{ fontSize: "12px", color: "#64748B", fontWeight: 500 }}>
                Effective Access Window
              </div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A", marginTop: "2px" }}>
                Past {totalHours} Hours{" "}
                <span style={{ fontSize: "13px", fontWeight: 500, color: "#64748B" }}>
                  ({daysEquivalent} {Number(daysEquivalent) === 1 ? "day" : "days"})
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid #F1F5F9",
            background: "#FAFAFA",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: "12px",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "10px 18px",
              borderRadius: "8px",
              border: "1px solid #CBD5E1",
              background: "#FFFFFF",
              color: "#475569",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#F1F5F9")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#FFFFFF")}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleApply}
            style={{
              padding: "10px 22px",
              borderRadius: "8px",
              border: "none",
              background: "#F4BC43",
              color: "#0C2A42",
              fontSize: "14px",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(244, 188, 67, 0.35)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.92")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            <Check size={16} color="#0C2A42" strokeWidth={2.5} />
            Assign &amp; Confirm Access
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
