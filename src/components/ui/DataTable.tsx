"use client";

import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { colors, typography } from "@/lib/theme";

export interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (item: T, index: number) => React.ReactNode;
  align?: "left" | "center" | "right";
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T, index: number) => string | number;
  pageSize?: number;
  emptyMessage?: string;
  showSNo?: boolean;
  onRowClick?: (item: T) => void;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  pageSize = 5,
  emptyMessage = "No records found.",
  showSNo = true,
  onRowClick,
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);

  // Total pages calculation
  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const activePage = Math.min(currentPage, totalPages);

  // Pagination slice
  const startIndex = (activePage - 1) * pageSize;
  const currentData = data.slice(startIndex, startIndex + pageSize);

  const handlePrev = () => {
    if (activePage > 1) setCurrentPage(activePage - 1);
  };

  const handleNext = () => {
    if (activePage < totalPages) setCurrentPage(activePage + 1);
  };

  return (
    <div
      style={{
        background: "#FFFFFF",
        borderRadius: "12px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
        overflow: "hidden",
        border: `1px solid ${colors.header.border}`,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Table Content */}
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            textAlign: "left",
            fontFamily: typography.fontFamily.sans,
            fontSize: "14px",
          }}
        >
          <thead>
            <tr
              style={{
                background: "#F8FAFC",
                borderBottom: `1px solid ${colors.header.border}`,
                color: colors.text.muted,
                fontSize: "12px",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              {showSNo && (
                <th style={{ padding: "14px 20px", width: "60px", textAlign: "center" }}>
                  S.NO
                </th>
              )}
              {columns.map((col, i) => (
                <th
                  key={i}
                  style={{
                    padding: "14px 20px",
                    textAlign: col.align || "left",
                    width: col.width,
                  }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currentData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (showSNo ? 1 : 0)}
                  style={{
                    padding: "36px 20px",
                    textAlign: "center",
                    color: colors.text.muted,
                    fontSize: "14px",
                  }}
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              currentData.map((item, idx) => {
                const sNo = startIndex + idx + 1;
                return (
                  <tr
                    key={keyExtractor(item, idx)}
                    onClick={() => onRowClick?.(item)}
                    style={{
                      borderBottom: `1px solid ${colors.header.border}`,
                      transition: "background 0.15s ease",
                      cursor: onRowClick ? "pointer" : "default",
                    }}
                    className="datatable-row-hover"
                  >
                    {showSNo && (
                      <td
                        style={{
                          padding: "14px 20px",
                          textAlign: "center",
                          color: colors.text.muted,
                          fontWeight: 600,
                          fontSize: "13px",
                        }}
                      >
                        {sNo}
                      </td>
                    )}
                    {columns.map((col, cIdx) => {
                      let cellContent: React.ReactNode = null;
                      if (col.cell) {
                        cellContent = col.cell(item, startIndex + idx);
                      } else if (col.accessorKey) {
                        cellContent = String(item[col.accessorKey] ?? "");
                      }
                      return (
                        <td
                          key={cIdx}
                          style={{
                            padding: "14px 20px",
                            textAlign: col.align || "left",
                            color: colors.text.primary,
                          }}
                        >
                          {cellContent}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      {data.length > 0 && (
        <div
          style={{
            padding: "14px 20px",
            borderTop: `1px solid ${colors.header.border}`,
            background: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
            fontSize: "13px",
            fontFamily: typography.fontFamily.sans,
            color: colors.text.muted,
          }}
        >
          {/* Summary text */}
          <div>
            Showing{" "}
            <strong style={{ color: colors.text.primary }}>
              {Math.min(startIndex + 1, data.length)}
            </strong>{" "}
            to{" "}
            <strong style={{ color: colors.text.primary }}>
              {Math.min(startIndex + pageSize, data.length)}
            </strong>{" "}
            of <strong style={{ color: colors.text.primary }}>{data.length}</strong> entries
          </div>

          {/* Page controls */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              onClick={handlePrev}
              disabled={activePage <= 1}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "6px 12px",
                borderRadius: "6px",
                border: `1px solid ${colors.header.border}`,
                background: activePage <= 1 ? "#F1F5F9" : "#FFFFFF",
                color: activePage <= 1 ? "#94A3B8" : colors.text.primary,
                fontWeight: 600,
                cursor: activePage <= 1 ? "not-allowed" : "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <ChevronLeft size={16} /> Previous
            </button>

            <span
              style={{
                padding: "4px 10px",
                borderRadius: "6px",
                background: colors.bg.page,
                fontWeight: 700,
                color: colors.sidebar.bg,
                fontSize: "13px",
              }}
            >
              Page {activePage} of {totalPages}
            </span>

            <button
              onClick={handleNext}
              disabled={activePage >= totalPages}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "6px 12px",
                borderRadius: "6px",
                border: `1px solid ${colors.header.border}`,
                background: activePage >= totalPages ? "#F1F5F9" : "#FFFFFF",
                color: activePage >= totalPages ? "#94A3B8" : colors.text.primary,
                fontWeight: 600,
                cursor: activePage >= totalPages ? "not-allowed" : "pointer",
                transition: "all 0.15s ease",
              }}
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      <style>{`
        .datatable-row-hover:hover {
          background: #F8FAFC !important;
        }
      `}</style>
    </div>
  );
}
