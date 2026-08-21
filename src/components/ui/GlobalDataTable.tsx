"use client";

import React from "react";
import { ChevronLeft, ChevronRight, FolderOpen, Loader2 } from "lucide-react";
import { colors, typography } from "@/lib/theme";

export interface GlobalColumn<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (item: T, index: number) => React.ReactNode;
  align?: "left" | "center" | "right";
  width?: string;
}

interface GlobalDataTableProps<T> {
  columns: GlobalColumn<T>[];
  data: T[];
  keyExtractor: (item: T, index: number) => string | number;
  pageSize?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  totalItems?: number;
  totalPages?: number;
  emptyMessage?: string | React.ReactNode;
  emptyIcon?: React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  isLoading?: boolean;
  showSNo?: boolean;
  sNoHeader?: string;
  itemLabel?: string;
  onRowClick?: (item: T) => void;
}

export function GlobalDataTable<T>({
  columns,
  data,
  keyExtractor,
  pageSize = 10,
  currentPage = 1,
  onPageChange,
  totalItems: propTotalItems,
  totalPages: propTotalPages,
  emptyMessage = "No records found matching current filters.",
  emptyIcon,
  emptyTitle,
  emptyDescription,
  emptyAction,
  isLoading = false,
  showSNo = true,
  sNoHeader = "S.No",
  itemLabel = "items",
  onRowClick,
}: GlobalDataTableProps<T>) {
  const isServerSide = propTotalItems !== undefined;
  const totalItems = isServerSide ? propTotalItems : data.length;
  const totalPages =
    propTotalPages !== undefined
      ? propTotalPages
      : Math.max(1, Math.ceil(totalItems / pageSize));
  const activePage = isServerSide ? currentPage : Math.min(currentPage, totalPages);

  const startIndex = (activePage - 1) * pageSize;
  const currentData = isServerSide ? data : data.slice(startIndex, startIndex + pageSize);

  const handlePageClick = (page: number) => {
    if (onPageChange && page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
  };

  // Build pagination numbers with ellipsis logic
  const buildPages = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | "...")[] = [];
    pages.push(1);
    if (activePage > 3) pages.push("...");
    for (
      let i = Math.max(2, activePage - 1);
      i <= Math.min(totalPages - 1, activePage + 1);
      i++
    ) {
      pages.push(i);
    }
    if (activePage < totalPages - 2) pages.push("...");
    pages.push(totalPages);
    return pages;
  };

  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid rgba(0, 0, 0, 0.22)",
        borderRadius: "5px",
        overflow: "hidden",
        boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
        display: "flex",
        flexDirection: "column",
        width: "100%",
      }}
    >
      <div style={{ overflowX: "auto", width: "100%" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            textAlign: "left",
            fontFamily: "'Inter', sans-serif",
            fontSize: "12px",
          }}
        >
          <thead>
            <tr
              style={{
                background: "rgba(179, 175, 175, 0.17)",
                borderBottom: "0.8px solid #F1F5F9",
                height: "40px",
                color: "#374151",
                fontWeight: 500,
              }}
            >
              {showSNo && (
                <th
                  style={{
                    padding: "0 16px",
                    width: "60px",
                    fontWeight: 500,
                    color: "#374151",
                    fontSize: "12px",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  {sNoHeader}
                </th>
              )}
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  style={{
                    padding: "0 16px",
                    textAlign: col.align || "left",
                    width: col.width,
                    fontWeight: 500,
                    color: "#374151",
                    fontSize: "12px",
                    fontFamily: "'Inter', sans-serif",
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
                    borderBottom: "1px solid rgba(179, 175, 175, 0.3)",
                    height: "44px",
                  }}
                >
                  {showSNo && (
                    <td style={{ padding: "0 16px" }}>
                      <div className="table-sk" style={{ height: "14px", width: "24px", borderRadius: "4px" }} />
                    </td>
                  )}
                  {columns.map((col, cIdx) => (
                    <td key={cIdx} style={{ padding: "0 16px" }}>
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
                const rawKey = keyExtractor ? keyExtractor(item, startIndex + idx) : undefined;
                const safeKey =
                  rawKey !== undefined && rawKey !== null && String(rawKey).trim() !== ""
                    ? String(rawKey)
                    : (item as any)?.id || (item as any)?._id || `row-${startIndex + idx}`;
                return (
                  <tr
                    key={safeKey}
                    onClick={() => onRowClick?.(item)}
                    style={{
                      borderBottom: "1px solid rgba(179, 175, 175, 0.5)",
                      height: "44px",
                      transition: "background 0.12s ease",
                      cursor: onRowClick ? "pointer" : "default",
                    }}
                    className="global-datatable-row"
                  >
                    {showSNo && (
                      <td
                        style={{
                          padding: "0 16px",
                          color: "#374151",
                          fontWeight: 500,
                          fontSize: "12px",
                          fontFamily: "'Inter', sans-serif",
                        }}
                      >
                        {sNo}
                      </td>
                    )}
                    {columns.map((col, cIdx) => {
                      let content: React.ReactNode = null;
                      if (col.cell) {
                        content = col.cell(item, startIndex + idx);
                      } else if (col.accessorKey) {
                        content = String(item[col.accessorKey] ?? "");
                      }

                      return (
                        <td
                          key={cIdx}
                          style={{
                            padding: "0 16px",
                            textAlign: col.align || "left",
                            color: "#374151",
                            fontWeight: 500,
                            fontSize: "12px",
                            fontFamily: "'Inter', sans-serif",
                          }}
                        >
                          {content}
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

      {/* Pagination Footer */}
      {!isLoading && totalItems > 0 && (
        <div
          style={{
            padding: "16px 20px",
            borderTop: "1px solid rgba(179, 175, 175, 0.5)",
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
              fontSize: "10px",
              color: "rgba(81, 82, 82, 0.69)",
            }}
          >
            Showing {startIndex + 1}–{Math.min(startIndex + pageSize, totalItems)} of{" "}
            {totalItems.toLocaleString()} {itemLabel}
          </span>

          {/* Page Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            {/* Previous */}
            <button
              disabled={activePage <= 1}
              onClick={() => handlePageClick(activePage - 1)}
              style={{
                height: "30px",
                padding: "0 10px",
                background: "#FFFFFF",
                border: "1px solid rgba(179, 175, 175, 0.75)",
                borderRadius: "4px",
                fontFamily: "'Inter', sans-serif",
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

            {/* Page Numbers */}
            {buildPages().map((page, i) =>
              page === "..." ? (
                <span
                  key={`ellipsis-${i}`}
                  style={{
                    padding: "0 4px",
                    fontSize: "10px",
                    color: "#374151",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  ···
                </span>
              ) : (
                <button
                  key={page}
                  onClick={() => handlePageClick(Number(page))}
                  style={{
                    width: "28px",
                    height: "30px",
                    background: page === activePage ? "#F4BC43" : "#FFFFFF",
                    border: "1px solid rgba(179, 175, 175, 0.75)",
                    borderRadius: "4px",
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 500,
                    fontSize: "10px",
                    color: "#374151",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {page}
                </button>
              )
            )}

            {/* Next */}
            <button
              disabled={activePage >= totalPages}
              onClick={() => handlePageClick(activePage + 1)}
              style={{
                height: "30px",
                padding: "0 10px",
                background: "#FFFFFF",
                border: "1px solid rgba(179, 175, 175, 0.75)",
                borderRadius: "4px",
                fontFamily: "'Inter', sans-serif",
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
        .global-datatable-row:hover {
          background: #F8FAFC !important;
        }
      `}</style>
    </div>
  );
}
