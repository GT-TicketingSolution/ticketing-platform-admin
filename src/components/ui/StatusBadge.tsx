"use client";

import React from "react";
import { colors, typography } from "@/lib/theme";

interface StatusBadgeProps {
  status: "Active" | "Inactive" | string;
  size?: "sm" | "md";
}

// Statuses that represent a positive / successful outcome.
const SUCCESS_STATUSES = new Set([
  "ACTIVE",
  "SUCCESS",
  "SUCCESSFUL",
  "CONFIRMED",
  "PAID",
  "COMPLETED",
  "ISSUED",
]);

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const normalized = (status || "").toUpperCase();
  const isActive = SUCCESS_STATUSES.has(normalized);

  // Special neutral states (pending / in-progress) — amber.
  const isPending = normalized === "PENDING" || normalized === "PROCESSING";

  let bg: string;
  let color: string;

  if (isActive) {
    bg = "rgba(34,197,94,0.12)";
    color = colors.status.success;
  } else if (isPending) {
    bg = "rgba(245,158,11,0.12)";
    color = "#D97706";
  } else {
    bg = "rgba(239,68,68,0.12)";
    color = colors.status.error;
  }

  const fontSize = size === "sm" ? "11px" : "12px";
  const padding = size === "sm" ? "2px 8px" : "4px 12px";

  // Render the original status text so the API's value (e.g. "SUCCESSFUL") is
  // visible to the user instead of being replaced with a generic label.
  const displayStatus = status || (isActive ? "Active" : "Inactive");

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
        textTransform: "uppercase",
        letterSpacing: "0.02em",
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
