"use client";

import React from "react";
import { colors, typography } from "@/lib/theme";

interface StatusFilterSelectProps {
  value: string;
  onChange: (value: string) => void;
}

export function StatusFilterSelect({ value, onChange }: StatusFilterSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        height: "38px",
        borderRadius: "8px",
        border: `1px solid ${colors.header.border}`,
        padding: "0 12px",
        fontFamily: typography.fontFamily.sans,
        fontSize: "13px",
        fontWeight: 600,
        color:
          value === "Active"
            ? "#16a34a"
            : value === "Inactive"
            ? "#DC2626"
            : colors.brand.accent,
        outline: "none",
        cursor: "pointer",
        background: "#FFFFFF",
      }}
    >
      <option value="All">All Status</option>
      <option value="Active">Active</option>
      <option value="Inactive">Inactive</option>
    </select>
  );
}

export default StatusFilterSelect;
