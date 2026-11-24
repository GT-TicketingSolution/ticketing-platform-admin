"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Calendar, Info } from "lucide-react";
import { useModalBodyLock } from "@/hooks/useModalBodyLock";

export interface AssignReportAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (timing: {
    type: "date_range" | "custom_timing";
    startDate?: string;
    days?: number;
  }) => void;
  initialType?: "date_range" | "custom_timing";
  initialStartDate?: string;
  initialDays?: number;
}

export default function AssignReportAccessModal({
  isOpen,
  onClose,
  onConfirm,
  initialType = "custom_timing",
  initialStartDate = "",
  initialDays = 0,
}: AssignReportAccessModalProps) {
  useModalBodyLock(isOpen);
  const [mounted, setMounted] = useState(false);
  const [accessType, setAccessType] = useState<"date_range" | "custom_timing">(initialType);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [days, setDays] = useState<string>(String(initialDays));

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setAccessType(initialType);
      setStartDate(initialStartDate);
      setDays(String(initialDays));
    }
  }, [isOpen, initialType, initialStartDate, initialDays]);

  if (!isOpen || !mounted) return null;

  const handleConfirm = () => {
    const parsedDays = Number(days) || 24;
    onConfirm({
      type: accessType,
      startDate: accessType === "date_range" ? startDate : undefined,
      days: accessType === "custom_timing" ? parsedDays : undefined,
    });
    onClose();
  };

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100010,
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
          maxWidth: "540px",
          background: "#FFFFFF",
          borderRadius: "16px",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)",
          border: "1px solid #E2E8F0",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          padding: "24px 28px",
          gap: "20px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            {/* Amber bar chart icon box */}
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "16px",
                background: "#F4BC43",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                boxShadow: "0px 1px 2px rgba(0, 0, 0, 0.05)",
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            </div>
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "18px",
                  fontWeight: 700,
                  color: "#1E293B",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
              >
                Assign Report Access Timing
              </h2>
              <p
                style={{
                  margin: "3px 0 0",
                  fontSize: "13px",
                  color: "#64748B",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
              >
                Configure how far back staff can view reports.
              </p>
            </div>
          </div>

          {/* Close X */}
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
              e.currentTarget.style.background = "#E2E8F0";
              e.currentTarget.style.color = "#1E293B";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#F8FAFC";
              e.currentTarget.style.color = "#64748B";
            }}
          >
            <X size={16} strokeWidth={2.2} />
          </button>
        </div>

        {/* Section title */}
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: "14px",
              fontWeight: 700,
              color: "#1E293B",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            Custom Date Range
          </h3>
          <p
            style={{
              margin: "3px 0 0",
              fontSize: "12px",
              color: "#64748B",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            Set a specific start date to still now, or give access for a custom number of days.
          </p>
        </div>

        {/* Option 1: Set a Date Range */}
        <div
          onClick={() => setAccessType("date_range")}
          style={{
            border: accessType === "date_range" ? "1.5px solid #F59E0B" : "1px solid #E2E8F0",
            borderRadius: "12px",
            padding: "16px",
            background: accessType === "date_range" ? "#FFFDF5" : "#FFFFFF",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            transition: "all 0.15s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
            {/* Custom Radio Button */}
            <div
              style={{
                width: "18px",
                height: "18px",
                borderRadius: "50%",
                border: accessType === "date_range" ? "5px solid #1E293B" : "2px solid #CBD5E1",
                background: "#FFFFFF",
                flexShrink: 0,
                marginTop: "2px",
                transition: "all 0.15s ease",
              }}
            />
            <div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#1E293B" }}>
                Set a Start Date
              </div>
              <div style={{ fontSize: "12px", color: "#64748B", marginTop: "2px" }}>
                Give access between a specific start date to still now.
              </div>
            </div>
          </div>

          <div style={{ paddingLeft: "28px" }} onClick={(e) => e.stopPropagation()}>
            <label
              style={{
                display: "block",
                fontSize: "12px",
                fontWeight: 600,
                color: "#1E293B",
                marginBottom: "6px",
              }}
            >
              Start Date
            </label>
            <div style={{ position: "relative", width: "100%", maxWidth: "340px" }}>
              <input
                type={startDate ? "date" : "text"}
                placeholder="Select date"
                value={startDate}
                onFocus={(e) => (e.target.type = "date")}
                onBlur={(e) => {
                  if (!e.target.value) e.target.type = "text";
                }}
                onClick={(e) => {
                  try {
                    (e.currentTarget as any).showPicker?.();
                  } catch { }
                }}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  width: "100%",
                  height: "40px",
                  borderRadius: "8px",
                  border: "1px solid #E2E8F0",
                  padding: "0 36px 0 12px",
                  fontSize: "13px",
                  color: "#1E293B",
                  background: "#FFFFFF",
                  outline: "none",
                  position: "relative",
                }}
              />
              <Calendar
                size={16}
                color="#94A3B8"
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  pointerEvents: "none",
                }}
              />
            </div>
          </div>
        </div>

        {/* Option 2: Custom Access Timing */}
        <div
          onClick={() => setAccessType("custom_timing")}
          style={{
            border: accessType === "custom_timing" ? "1.5px solid #F59E0B" : "1px solid #E2E8F0",
            borderRadius: "12px",
            padding: "16px",
            background: accessType === "custom_timing" ? "#FFFDF5" : "#FFFFFF",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            transition: "all 0.15s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
            {/* Custom Radio Button */}
            <div
              style={{
                width: "18px",
                height: "18px",
                borderRadius: "50%",
                border: accessType === "custom_timing" ? "5px solid #1E293B" : "2px solid #CBD5E1",
                background: "#FFFFFF",
                flexShrink: 0,
                marginTop: "2px",
                transition: "all 0.15s ease",
              }}
            />
            <div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#1E293B" }}>
                Custom Access Timing
              </div>
              <div style={{ fontSize: "12px", color: "#64748B", marginTop: "2px" }}>
                Keep a continuous window that moves forward automatically each day.
              </div>
            </div>
          </div>

          <div
            style={{
              paddingLeft: "28px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Number input with Days badge */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                height: "40px",
                border: "1px solid #E2E8F0",
                borderRadius: "8px",
                padding: "0 8px 0 12px",
                background: "#FFFFFF",
                gap: "8px",
              }}
            >
              <input
                type="text"
                value={days}
                onChange={(e) => setDays(e.target.value.replace(/\D/g, ""))}
                style={{
                  width: "45px",
                  border: "none",
                  outline: "none",
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#1E293B",
                  background: "transparent",
                }}
              />
              <span
                style={{
                  background: "#FEF3C7",
                  color: "#D97706",
                  fontSize: "12px",
                  fontWeight: 600,
                  padding: "3px 8px",
                  borderRadius: "6px",
                }}
              >
                Days
              </span>
            </div>

            {/* Info note */}
            <div
              style={{
                flex: "1 1 220px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "#F8FAFC",
                border: "1px solid #E2E8F0",
                borderRadius: "8px",
                padding: "10px 14px",
                fontSize: "12px",
                color: "#475569",
              }}
            >
              <Info size={15} color="#64748B" style={{ flexShrink: 0 }} />
              <span>Give access to reports from the last {days || 24} days.</span>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "8px",
            paddingTop: "16px",
            borderTop: "1px solid #F1F5F9",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "10px 22px",
              borderRadius: "8px",
              border: "1px solid #E2E8F0",
              background: "#FFFFFF",
              color: "#1E293B",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            style={{
              padding: "10px 24px",
              borderRadius: "8px",
              border: "none",
              background: "#F4BC43",
              color: "#0F172A",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0px 1px 2px rgba(0, 0, 0, 0.05)",
            }}
          >
            Assign &amp; Confirm Access
          </button>
        </div>
      </div>

      <style>{`
        input[type="date"]::-webkit-calendar-picker-indicator {
          opacity: 0;
          cursor: pointer;
          position: absolute;
          right: 0;
          top: 0;
          width: 36px;
          height: 100%;
          margin: 0;
          padding: 0;
        }
      `}</style>
    </div>,
    document.body
  );
}
