"use client";

import React, { useState } from "react";
import { ChevronLeft, ChevronRight, FolderOpen, Loader2 } from "lucide-react";
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
  emptyMessage?: string | React.ReactNode;
  emptyIcon?: React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  isLoading?: boolean;
  showSNo?: boolean;
  onRowClick?: (item: T) => void;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  pageSize = 5,
  emptyMessage = "No records found.",
  emptyIcon,
  emptyTitle,
  emptyDescription,
  emptyAction,
  isLoading = false,
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
            {isLoading ? (
              Array.from({ length: pageSize > 8 ? 8 : Math.max(5, pageSize) }).map((_, rIdx) => (
                <tr
                  key={`skeleton-row-${rIdx}`}
                  style={{
                    borderBottom: `1px solid ${colors.header.border}`,
                    height: "48px",
                  }}
                >
                  {showSNo && (
                    <td style={{ padding: "14px 20px", textAlign: "center" }}>
                      <div className="table-sk" style={{ height: "14px", width: "24px", margin: "0 auto", borderRadius: "4px" }} />
                    </td>
                  )}
                  {columns.map((col, cIdx) => (
                    <td key={cIdx} style={{ padding: "14px 20px" }}>
                      <div
                        className="table-sk"
                        style={{
                          height: "14px",
                          width: cIdx === 0 ? "75%" : cIdx % 2 === 1 ? "55%" : "65%",
                          borderRadius: "4px",
                        }}
                      />
                    </td>
                  ))}
                </tr>
              ))
            ) : currentData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (showSNo ? 1 : 0)}
                  style={{
                    padding: "48px 20px",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      maxWidth: "420px",
                      margin: "0 auto",
                    }}
                  >
                    <div
                      style={{
                        width: "52px",
                        height: "52px",
                        borderRadius: "50%",
                        background: "rgba(35, 114, 165, 0.08)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: "4px",
                      }}
                    >
                      {emptyIcon || <FolderOpen size={26} color={colors.brand.accent} />}
                    </div>
                    <div
                      style={{
                        fontSize: "15px",
                        fontWeight: 600,
                        color: colors.text.primary,
                        fontFamily: typography.fontFamily.sans,
                      }}
                    >
                      {emptyTitle || (typeof emptyMessage === "string" ? emptyMessage : "No records found")}
                    </div>
                    {emptyDescription && (
                      <div
                        style={{
                          fontSize: "13px",
                          color: colors.text.muted,
                          fontFamily: typography.fontFamily.sans,
                          lineHeight: "1.5",
                        }}
                      >
                        {emptyDescription}
                      </div>
                    )}
                    {emptyAction && (
                      <div style={{ marginTop: "6px" }}>
                        {emptyAction}
                      </div>
                    )}
                    {!emptyTitle && !emptyDescription && typeof emptyMessage !== "string" && emptyMessage}
                  </div>
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

      {!isLoading && data.length > 0 && (
        <div
          style={{
            padding: "16px 20px",
            borderTop: "1px solid rgba(179, 175, 175, 0.4)",
            background: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          {/* Showing Count */}
          <span
            style={{
              fontFamily: typography.fontFamily.sans,
              fontWeight: 600,
              fontSize: "11px",
              color: "rgba(81, 82, 82, 0.69)",
            }}
          >
            Showing {Math.min(startIndex + 1, data.length)}–{Math.min(startIndex + pageSize, data.length)} of {data.length}
          </span>

          {/* Pagination Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            {/* Previous Button */}
            <button
              disabled={activePage <= 1}
              onClick={handlePrev}
              style={{
                height: "30px",
                padding: "0 12px",
                background: "#FFFFFF",
                border: "1px solid rgba(179, 175, 175, 0.75)",
                borderRadius: "4px",
                fontFamily: "Inter, sans-serif",
                fontWeight: 500,
                fontSize: "10px",
                color: activePage <= 1 ? "#A0A0A0" : "#374151",
                cursor: activePage <= 1 ? "not-allowed" : "pointer",
                opacity: activePage <= 1 ? 0.5 : 1,
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <ChevronLeft size={12} />
              <span>Previous</span>
            </button>

            {/* Page Number Buttons */}
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
              const isActive = page === activePage;
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  style={{
                    width: "28px",
                    height: "30px",
                    background: isActive ? "#F4BC43" : "#FFFFFF",
                    border: "1px solid rgba(179, 175, 175, 0.75)",
                    borderRadius: "4px",
                    fontFamily: "Inter, sans-serif",
                    fontWeight: 500,
                    fontSize: "10px",
                    color: "#374151",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.12s ease",
                  }}
                >
                  {page}
                </button>
              );
            })}

            {/* Next Button */}
            <button
              disabled={activePage >= totalPages}
              onClick={handleNext}
              style={{
                height: "30px",
                padding: "0 12px",
                background: "#FFFFFF",
                border: "1px solid rgba(179, 175, 175, 0.75)",
                borderRadius: "4px",
                fontFamily: "Inter, sans-serif",
                fontWeight: 500,
                fontSize: "10px",
                color: activePage >= totalPages ? "#A0A0A0" : "#374151",
                cursor: activePage >= totalPages ? "not-allowed" : "pointer",
                opacity: activePage >= totalPages ? 0.5 : 1,
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <span>Next</span>
              <ChevronRight size={12} />
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes tableShimmer {
          0%   { background-position: -600px 0; }
          100% { background-position: 600px 0; }
        }
        .table-sk {
          background: linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%);
          background-size: 600px 100%;
          animation: tableShimmer 1.4s infinite linear;
        }
        .datatable-row-hover:hover {
          background: #F8FAFC !important;
        }
      `}</style>
    </div>
  );
}
