"use client";

import React from "react";
import { colors, typography } from "@/lib/theme";

interface StatusToggleProps {
  value?: "Active" | "Inactive";
  status?: "Active" | "Inactive";
  onChange: (status: "Active" | "Inactive") => void;
  label?: string;
  required?: boolean;
  error?: string;
}

export function StatusToggle({
  value,
  status,
  onChange,
  label,
  required = false,
  error,
}: StatusToggleProps) {
  const currentStatus = value ?? status ?? "Active";
  const isActive = currentStatus === "Active";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {label && (
        <label
          style={{
            fontSize: "13px",
            fontWeight: 600,
            color: colors.text.primary,
            display: "block",
            fontFamily: typography.fontFamily.sans,
          }}
        >
          {label} {required && <span style={{ color: "#EF4444" }}>*</span>}
        </label>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <button
          type="button"
          onClick={() => onChange(isActive ? "Inactive" : "Active")}
          style={{
            position: "relative",
            width: "46px",
            height: "26px",
            borderRadius: "13px",
            background: isActive ? colors.status.success : "#CBD5E1",
            border: "none",
            cursor: "pointer",
            transition: "background 0.25s ease",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              position: "absolute",
              top: "3px",
              left: isActive ? "23px" : "3px",
              width: "20px",
              height: "20px",
              borderRadius: "50%",
              background: "#FFFFFF",
              boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
              transition: "left 0.25s ease",
            }}
          />
        </button>
        <span
          style={{
            fontSize: "13px",
            fontWeight: 700,
            color: isActive ? colors.status.success : colors.status.error,
            fontFamily: typography.fontFamily.sans,
          }}
        >
          {currentStatus}
        </span>
      </div>
      {error && (
        <span
          style={{
            fontSize: "12px",
            color: colors.status.error,
            marginTop: "2px",
            display: "block",
            fontFamily: typography.fontFamily.sans,
          }}
        >
          {error}
        </span>
      )}
    </div>
  );
}

export default StatusToggle;
