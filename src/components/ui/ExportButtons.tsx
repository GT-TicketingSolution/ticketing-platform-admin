"use client";

import React from "react";
import { FileText, FileSpreadsheet } from "lucide-react";
import { typography } from "@/lib/theme";

interface ExportButtonsProps {
  onExportPDF?: () => void;
  onExportExcel?: () => void;
  pdfLabel?: string;
  excelLabel?: string;
  disabled?: boolean;
}

export default function ExportButtons({
  onExportPDF,
  onExportExcel,
  pdfLabel = "Export PDF",
  excelLabel = "Export Excel",
  disabled = false,
}: ExportButtonsProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        flexWrap: "wrap",
      }}
    >
      {onExportPDF && (
        <button
          type="button"
          onClick={onExportPDF}
          disabled={disabled}
          style={{
            boxSizing: "border-box",
            height: "39px",
            padding: "0 18px",
            background: "#FFFFFF",
            border: "1px solid rgba(0, 0, 0, 0.41)",
            borderRadius: "5px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontFamily: typography.fontFamily.sans,
            fontWeight: 500,
            fontSize: "12px",
            color: "#173F63",
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.6 : 1,
            transition: "all 0.15s ease",
          }}
        >
          <FileText size={16} color="#173F63" />
          <span>{pdfLabel}</span>
        </button>
      )}

      {onExportExcel && (
        <button
          type="button"
          onClick={onExportExcel}
          disabled={disabled}
          style={{
            boxSizing: "border-box",
            height: "39px",
            padding: "0 18px",
            background: "#FFFFFF",
            border: "1px solid rgba(0, 0, 0, 0.41)",
            borderRadius: "5px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontFamily: typography.fontFamily.sans,
            fontWeight: 500,
            fontSize: "12px",
            color: "#173F63",
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.6 : 1,
            transition: "all 0.15s ease",
          }}
        >
          <FileSpreadsheet size={16} color="#107C41" />
          <span>{excelLabel}</span>
        </button>
      )}
    </div>
  );
}
