"use client";

import React, { useState } from "react";
import { FileText, FileSpreadsheet } from "lucide-react";
import { colors, typography } from "@/lib/theme";

interface ExportButtonsProps {
  onExportPDF?: () => void;
  onExportExcel?: () => void;
  pdfLabel?: string;
  excelLabel?: string;
  disabled?: boolean;
  disabledTooltip?: string;
}

export default function ExportButtons({
  onExportPDF,
  onExportExcel,
  pdfLabel = "Export PDF",
  excelLabel = "Export Excel",
  disabled = false,
  disabledTooltip = "No records available to export in this module",
}: ExportButtonsProps) {
  const [hoveredButton, setHoveredButton] = useState<"pdf" | "excel" | null>(null);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        flexWrap: "wrap",
        position: "relative",
      }}
    >
      {onExportPDF && (
        <div
          style={{ position: "relative", display: "inline-flex" }}
          onMouseEnter={() => setHoveredButton("pdf")}
          onMouseLeave={() => setHoveredButton(null)}
        >
          <button
            type="button"
            onClick={disabled ? undefined : onExportPDF}
            disabled={disabled}
            style={{
              boxSizing: "border-box",
              height: "39px",
              padding: "0 18px",
              background: disabled ? "#F3F4F6" : "#FFFFFF",
              border: disabled ? "1px solid #D1D5DB" : "1px solid rgba(0, 0, 0, 0.41)",
              borderRadius: "5px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontFamily: typography.fontFamily.sans,
              fontWeight: 500,
              fontSize: "12px",
              color: disabled ? "#9CA3AF" : "#173F63",
              cursor: disabled ? "not-allowed" : "pointer",
              opacity: disabled ? 0.65 : 1,
              transition: "all 0.15s ease",
            }}
          >
            <FileText size={16} color={disabled ? "#9CA3AF" : "#173F63"} />
            <span>{pdfLabel}</span>
          </button>

          {/* Disabled Tooltip */}
          {disabled && hoveredButton === "pdf" && (
            <div
              style={{
                position: "absolute",
                bottom: "calc(100% + 8px)",
                left: "50%",
                transform: "translateX(-50%)",
                background: "#0F172A",
                color: "#F8FAFC",
                fontFamily: typography.fontFamily.sans,
                fontSize: "11px",
                fontWeight: 500,
                padding: "5px 10px",
                borderRadius: "6px",
                whiteSpace: "nowrap",
                pointerEvents: "none",
                zIndex: 1000,
                boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: "100%",
                  left: "50%",
                  transform: "translateX(-50%)",
                  borderWidth: "5px",
                  borderStyle: "solid",
                  borderColor: "#0F172A transparent transparent transparent",
                }}
              />
              {disabledTooltip}
            </div>
          )}
        </div>
      )}

      {onExportExcel && (
        <div
          style={{ position: "relative", display: "inline-flex" }}
          onMouseEnter={() => setHoveredButton("excel")}
          onMouseLeave={() => setHoveredButton(null)}
        >
          <button
            type="button"
            onClick={disabled ? undefined : onExportExcel}
            disabled={disabled}
            style={{
              boxSizing: "border-box",
              height: "39px",
              padding: "0 18px",
              background: disabled ? "#F3F4F6" : "#FFFFFF",
              border: disabled ? "1px solid #D1D5DB" : "1px solid rgba(0, 0, 0, 0.41)",
              borderRadius: "5px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontFamily: typography.fontFamily.sans,
              fontWeight: 500,
              fontSize: "12px",
              color: disabled ? "#9CA3AF" : "#173F63",
              cursor: disabled ? "not-allowed" : "pointer",
              opacity: disabled ? 0.65 : 1,
              transition: "all 0.15s ease",
            }}
          >
            <FileSpreadsheet size={16} color={disabled ? "#9CA3AF" : "#107C41"} />
            <span>{excelLabel}</span>
          </button>

          {/* Disabled Tooltip */}
          {disabled && hoveredButton === "excel" && (
            <div
              style={{
                position: "absolute",
                bottom: "calc(100% + 8px)",
                left: "50%",
                transform: "translateX(-50%)",
                background: "#0F172A",
                color: "#F8FAFC",
                fontFamily: typography.fontFamily.sans,
                fontSize: "11px",
                fontWeight: 500,
                padding: "5px 10px",
                borderRadius: "6px",
                whiteSpace: "nowrap",
                pointerEvents: "none",
                zIndex: 1000,
                boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: "100%",
                  left: "50%",
                  transform: "translateX(-50%)",
                  borderWidth: "5px",
                  borderStyle: "solid",
                  borderColor: "#0F172A transparent transparent transparent",
                }}
              />
              {disabledTooltip}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
