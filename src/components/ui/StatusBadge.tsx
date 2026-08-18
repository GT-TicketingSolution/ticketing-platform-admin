"use client";

import React from "react";
import { colors, typography } from "@/lib/theme";

interface StatusBadgeProps {
  status: "Active" | "Inactive" | string;
  size?: "sm" | "md";
}

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const normalized = (status || "").toUpperCase();
  const isActive = normalized === "ACTIVE";
  const isSuspended = normalized === "SUSPENDED" || normalized === "PENDING";
  
  const bg = isActive
    ? "rgba(34,197,94,0.12)"
    : isSuspended
    ? "rgba(245,158,11,0.12)"
    : "rgba(239,68,68,0.12)";
  const color = isActive
    ? colors.status.success
    : isSuspended
    ? "#D97706"
    : colors.status.error;
  const fontSize = size === "sm" ? "11px" : "12px";
  const padding = size === "sm" ? "2px 8px" : "4px 12px";

  const displayStatus =
    normalized === "ACTIVE"
      ? "Active"
      : normalized === "DISABLED"
      ? "Disabled"
      : normalized === "SUSPENDED"
      ? "Suspended"
      : status;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        background: bg,
        color: color,
        padding: padding,
        borderRadius: "12px",
        fontSize: fontSize,
        fontWeight: 700,
        fontFamily: typography.fontFamily.sans,
      }}
    >
      <span
        style={{
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          background: color,
          flexShrink: 0,
        }}
      />
      {displayStatus}
    </span>
  );
}

export default StatusBadge;
