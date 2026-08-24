"use client";

import React, { useState, useRef, useEffect } from "react";
import { FileText, FileSpreadsheet, ChevronDown, Layers, Database, Loader2 } from "lucide-react";
import { typography } from "@/lib/theme";

export type ExportScope = "current" | "all";

interface ExportButtonsProps {
  onExportPDF?: () => void;
  onExportExcel?: () => void;
  onExportPDFScope?: (scope: ExportScope) => void | Promise<void>;
  onExportExcelScope?: (scope: ExportScope) => void | Promise<void>;
  pdfLabel?: string;
  excelLabel?: string;
  disabled?: boolean;
  disabledTooltip?: string;
  isExportingPDF?: boolean;
  isExportingExcel?: boolean;
}

export default function ExportButtons({
  onExportPDF,
  onExportExcel,
  onExportPDFScope,
  onExportExcelScope,
  pdfLabel = "Export PDF",
  excelLabel = "Export Excel",
  disabled = false,
  disabledTooltip = "No records available to export in this module",
  isExportingPDF = false,
  isExportingExcel = false,
}: ExportButtonsProps) {
  const [hoveredButton, setHoveredButton] = useState<"pdf" | "excel" | null>(null);
  const [openDropdown, setOpenDropdown] = useState<"pdf" | "excel" | null>(null);

  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const excelContainerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        openDropdown === "pdf" &&
        pdfContainerRef.current &&
        !pdfContainerRef.current.contains(target)
      ) {
        setOpenDropdown(null);
      }
      if (
        openDropdown === "excel" &&
        excelContainerRef.current &&
        !excelContainerRef.current.contains(target)
      ) {
        setOpenDropdown(null);
      }
    };

    if (openDropdown) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [openDropdown]);

  const handlePDFClick = () => {
    if (disabled || isExportingPDF) return;
    if (onExportPDFScope) {
      setOpenDropdown((prev) => (prev === "pdf" ? null : "pdf"));
    } else if (onExportPDF) {
      onExportPDF();
    }
  };

  const handleExcelClick = () => {
    if (disabled || isExportingExcel) return;
    if (onExportExcelScope) {
      setOpenDropdown((prev) => (prev === "excel" ? null : "excel"));
    } else if (onExportExcel) {
      onExportExcel();
    }
  };

  const handleSelectPDFScope = (scope: ExportScope) => {
    setOpenDropdown(null);
    if (onExportPDFScope) {
      onExportPDFScope(scope);
    }
  };

  const handleSelectExcelScope = (scope: ExportScope) => {
    setOpenDropdown(null);
    if (onExportExcelScope) {
      onExportExcelScope(scope);
    }
  };

  const hasPDF = Boolean(onExportPDF || onExportPDFScope);
  const hasExcel = Boolean(onExportExcel || onExportExcelScope);

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
      {/* ── PDF Button ── */}
      {hasPDF && (
        <div
          ref={pdfContainerRef}
          style={{ position: "relative", display: "inline-flex" }}
          onMouseEnter={() => setHoveredButton("pdf")}
          onMouseLeave={() => setHoveredButton(null)}
        >
          <button
            type="button"
            onClick={handlePDFClick}
            disabled={disabled || isExportingPDF}
            style={{
              boxSizing: "border-box",
              height: "39px",
              padding: "0 16px",
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
              cursor: disabled || isExportingPDF ? "not-allowed" : "pointer",
              opacity: disabled ? 0.65 : 1,
              transition: "all 0.15s ease",
            }}
          >
            {isExportingPDF ? (
              <Loader2 size={16} color="#173F63" className="animate-spin" />
            ) : (
              <FileText size={16} color={disabled ? "#9CA3AF" : "#173F63"} />
            )}
            <span>{isExportingPDF ? "Exporting..." : pdfLabel}</span>
            {onExportPDFScope && !isExportingPDF && (
              <ChevronDown
                size={14}
                color={disabled ? "#9CA3AF" : "#173F63"}
                style={{
                  transform: openDropdown === "pdf" ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s ease",
                }}
              />
            )}
          </button>

          {/* PDF Dropdown Menu */}
          {openDropdown === "pdf" && !disabled && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                right: 0,
                background: "#FFFFFF",
                borderRadius: "8px",
                border: "1px solid #E2E8F0",
                boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.15), 0 8px 10px -6px rgba(15, 23, 42, 0.1)",
                minWidth: "220px",
                width: "max-content",
                padding: "6px",
                zIndex: 1000,
                display: "flex",
                flexDirection: "column",
                gap: "2px",
              }}
            >
              <button
                type="button"
                onClick={() => handleSelectPDFScope("current")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "9px 12px",
                  borderRadius: "6px",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background 0.15s ease",
                  width: "100%",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#F1F5F9")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "6px",
                    background: "#EFF6FF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Layers size={15} color="#2563EB" />
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: typography.fontFamily.sans,
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#1E293B",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Current Page Data
                  </div>
                  <div
                    style={{
                      fontFamily: typography.fontFamily.sans,
                      fontSize: "10px",
                      color: "#64748B",
                      marginTop: "1px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Export records on this page
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectPDFScope("all")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "9px 12px",
                  borderRadius: "6px",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background 0.15s ease",
                  width: "100%",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#F1F5F9")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "6px",
                    background: "#FEF2F2",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Database size={15} color="#DC2626" />
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: typography.fontFamily.sans,
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#1E293B",
                      whiteSpace: "nowrap",
                    }}
                  >
                    All Page Data
                  </div>
                  <div
                    style={{
                      fontFamily: typography.fontFamily.sans,
                      fontSize: "10px",
                      color: "#64748B",
                      marginTop: "1px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Export all records (all data)
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* Disabled Tooltip */}
          {disabled && hoveredButton === "pdf" && (
            <div
              style={{
                position: "absolute",
                bottom: "calc(100% + 8px)",
                right: 0,
                background: "#0F172A",
                color: "#F8FAFC",
                fontFamily: typography.fontFamily.sans,
                fontSize: "11px",
                fontWeight: 500,
                padding: "6px 10px",
                borderRadius: "6px",
                whiteSpace: "normal",
                maxWidth: "220px",
                width: "max-content",
                pointerEvents: "none",
                zIndex: 1000,
                boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                lineHeight: "1.4",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: "100%",
                  right: "14px",
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

      {/* ── Excel Button ── */}
      {hasExcel && (
        <div
          ref={excelContainerRef}
          style={{ position: "relative", display: "inline-flex" }}
          onMouseEnter={() => setHoveredButton("excel")}
          onMouseLeave={() => setHoveredButton(null)}
        >
          <button
            type="button"
            onClick={handleExcelClick}
            disabled={disabled || isExportingExcel}
            style={{
              boxSizing: "border-box",
              height: "39px",
              padding: "0 16px",
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
              cursor: disabled || isExportingExcel ? "not-allowed" : "pointer",
              opacity: disabled ? 0.65 : 1,
              transition: "all 0.15s ease",
            }}
          >
            {isExportingExcel ? (
              <Loader2 size={16} color="#107C41" className="animate-spin" />
            ) : (
              <FileSpreadsheet size={16} color={disabled ? "#9CA3AF" : "#107C41"} />
            )}
            <span>{isExportingExcel ? "Exporting..." : excelLabel}</span>
            {onExportExcelScope && !isExportingExcel && (
              <ChevronDown
                size={14}
                color={disabled ? "#9CA3AF" : "#173F63"}
                style={{
                  transform: openDropdown === "excel" ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s ease",
                }}
              />
            )}
          </button>

          {/* Excel Dropdown Menu */}
          {openDropdown === "excel" && !disabled && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                right: 0,
                background: "#FFFFFF",
                borderRadius: "8px",
                border: "1px solid #E2E8F0",
                boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.15), 0 8px 10px -6px rgba(15, 23, 42, 0.1)",
                minWidth: "220px",
                width: "max-content",
                padding: "6px",
                zIndex: 1000,
                display: "flex",
                flexDirection: "column",
                gap: "2px",
              }}
            >
              <button
                type="button"
                onClick={() => handleSelectExcelScope("current")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "9px 12px",
                  borderRadius: "6px",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background 0.15s ease",
                  width: "100%",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#F1F5F9")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "6px",
                    background: "#F0FDF4",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Layers size={15} color="#16A34A" />
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: typography.fontFamily.sans,
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#1E293B",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Current Page Data
                  </div>
                  <div
                    style={{
                      fontFamily: typography.fontFamily.sans,
                      fontSize: "10px",
                      color: "#64748B",
                      marginTop: "1px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Export records on this page
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectExcelScope("all")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "9px 12px",
                  borderRadius: "6px",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background 0.15s ease",
                  width: "100%",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#F1F5F9")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "6px",
                    background: "#ECFDF5",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Database size={15} color="#059669" />
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: typography.fontFamily.sans,
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#1E293B",
                      whiteSpace: "nowrap",
                    }}
                  >
                    All Page Data
                  </div>
                  <div
                    style={{
                      fontFamily: typography.fontFamily.sans,
                      fontSize: "10px",
                      color: "#64748B",
                      marginTop: "1px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Export all records (all data)
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* Disabled Tooltip */}
          {disabled && hoveredButton === "excel" && (
            <div
              style={{
                position: "absolute",
                bottom: "calc(100% + 8px)",
                right: 0,
                background: "#0F172A",
                color: "#F8FAFC",
                fontFamily: typography.fontFamily.sans,
                fontSize: "11px",
                fontWeight: 500,
                padding: "6px 10px",
                borderRadius: "6px",
                whiteSpace: "normal",
                maxWidth: "220px",
                width: "max-content",
                pointerEvents: "none",
                zIndex: 1000,
                boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                lineHeight: "1.4",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: "100%",
                  right: "14px",
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

