"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { ChevronDown, Check } from "lucide-react";
import { colors, typography } from "@/lib/theme";

export interface AttractionFilterOption {
  id: string;
  name: string;
}

export interface AttractionFilterDropdownProps {
  label?: string;
  options: AttractionFilterOption[];
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  width?: string | number;
  align?: "left" | "right";
  className?: string;
  style?: React.CSSProperties;
}

export function AttractionFilterDropdown({
  label,
  options,
  selectedIds,
  onChange,
  placeholder = "All Attractions",
  disabled = false,
  width = "184px",
  align = "left",
  className,
  style,
}: AttractionFilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Clean options: filter out any "All" / "ALL" or empty items
  const cleanOptions = useMemo(() => {
    return options.filter(
      (opt) =>
        opt &&
        opt.id &&
        opt.id.toUpperCase() !== "ALL" &&
        opt.name &&
        opt.name.trim().toLowerCase() !== "all attractions"
    );
  }, [options]);

  const allIds = useMemo(() => cleanOptions.map((o) => o.id), [cleanOptions]);

  // Draft selection state inside the open popover
  const [draftIds, setDraftIds] = useState<string[]>([]);

  // Sync draft state with external selectedIds when opening or when selectedIds change
  useEffect(() => {
    setDraftIds(selectedIds);
  }, [selectedIds, isOpen]);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Is all selected in draft?
  const isAllDraftSelected =
    cleanOptions.length > 0 && draftIds.length === cleanOptions.length;

  const toggleSelectAll = () => {
    if (isAllDraftSelected) {
      setDraftIds([]);
    } else {
      setDraftIds(allIds);
    }
  };

  const toggleItem = (id: string) => {
    setDraftIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleClear = () => {
    setDraftIds([]);
  };

  const handleApply = () => {
    onChange(draftIds);
    setIsOpen(false);
  };

  // Determine button trigger label
  const triggerLabel = useMemo(() => {
    if (
      selectedIds.length === 0 ||
      (cleanOptions.length > 0 && selectedIds.length === cleanOptions.length)
    ) {
      return placeholder;
    }
    return `${selectedIds.length} Selected`;
  }, [selectedIds, cleanOptions.length, placeholder]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        position: "relative",
        userSelect: "none",
        ...style,
      }}
    >
      {label && (
        <label
          style={{
            fontFamily: typography.fontFamily.sans,
            fontWeight: 700,
            fontSize: "12px",
            color: "#475569",
            display: "block",
          }}
        >
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled || cleanOptions.length === 0}
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          height: "40px",
          width: typeof width === "number" ? `${width}px` : width,
          padding: "0 14px",
          background: "#FFFFFF",
          border: isOpen ? "1.5px solid #2563EB" : "1px solid #CBD5E1",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: disabled || cleanOptions.length === 0 ? "not-allowed" : "pointer",
          opacity: disabled || cleanOptions.length === 0 ? 0.6 : 1,
          outline: "none",
          transition: "border-color 0.15s ease",
          boxSizing: "border-box",
        }}
        title={triggerLabel}
      >
        <span
          style={{
            fontFamily: typography.fontFamily.sans,
            fontWeight: 600,
            fontSize: "13px",
            color: "#0F172A",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            paddingRight: "6px",
          }}
        >
          {triggerLabel}
        </span>
        <ChevronDown
          size={18}
          color="#64748B"
          style={{
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.15s ease",
            flexShrink: 0,
          }}
        />
      </button>

      {/* Popover Card */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            [align === "right" ? "right" : "left"]: 0,
            width: "290px",
            backgroundColor: "#FFFFFF",
            borderRadius: "16px",
            border: "1px solid #E2E8F0",
            boxShadow:
              "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
            padding: "16px",
            zIndex: 1050,
            boxSizing: "border-box",
          }}
        >
          {/* Top Banner: Select All */}
          <div
            onClick={toggleSelectAll}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "10px 14px",
              backgroundColor: "#EFF6FF",
              borderRadius: "8px",
              cursor: "pointer",
              transition: "background-color 0.15s ease",
            }}
          >
            {/* Custom Checkbox */}
            <div
              style={{
                width: "18px",
                height: "18px",
                borderRadius: "4px",
                border: isAllDraftSelected
                  ? "1.5px solid #2563EB"
                  : "1.5px solid #CBD5E1",
                backgroundColor: isAllDraftSelected ? "#2563EB" : "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "all 0.15s ease",
              }}
            >
              {isAllDraftSelected && (
                <Check size={13} color="#FFFFFF" strokeWidth={3} />
              )}
            </div>
            <span
              style={{
                fontFamily: typography.fontFamily.sans,
                fontSize: "14px",
                fontWeight: 700,
                color: "#0F172A",
              }}
            >
              Select All
            </span>
          </div>

          {/* Attraction Items List */}
          <div
            className="attraction-dropdown-list"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "4px",
              marginTop: "12px",
              maxHeight: "220px",
              overflowY: "auto",
              paddingRight: "4px",
            }}
          >
            {cleanOptions.map((opt) => {
              const isChecked = draftIds.includes(opt.id);
              return (
                <div
                  key={opt.id}
                  onClick={() => toggleItem(opt.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    backgroundColor: isChecked ? "#F8FAFC" : "transparent",
                    transition: "background-color 0.1s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isChecked) {
                      e.currentTarget.style.backgroundColor = "#F8FAFC";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isChecked) {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }
                  }}
                >
                  {/* Custom Checkbox */}
                  <div
                    style={{
                      width: "18px",
                      height: "18px",
                      borderRadius: "4px",
                      border: isChecked
                        ? "1.5px solid #2563EB"
                        : "1.5px solid #CBD5E1",
                      backgroundColor: isChecked ? "#2563EB" : "#FFFFFF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      transition: "all 0.15s ease",
                    }}
                  >
                    {isChecked && (
                      <Check size={13} color="#FFFFFF" strokeWidth={3} />
                    )}
                  </div>
                  <span
                    style={{
                      fontFamily: typography.fontFamily.sans,
                      fontSize: "14px",
                      fontWeight: isChecked ? 600 : 500,
                      color: "#0F172A",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={opt.name}
                  >
                    {opt.name}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Divider */}
          <div
            style={{
              height: "1px",
              backgroundColor: "#E2E8F0",
              margin: "14px 0",
            }}
          />

          {/* Action Buttons: Clear & Apply */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <button
              type="button"
              onClick={handleClear}
              style={{
                flex: 1,
                height: "38px",
                backgroundColor: "#FFFFFF",
                border: "1px solid #CBD5E1",
                borderRadius: "8px",
                fontFamily: typography.fontFamily.sans,
                fontSize: "14px",
                fontWeight: 600,
                color: "#0F172A",
                cursor: "pointer",
                transition: "background-color 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#F8FAFC";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#FFFFFF";
              }}
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleApply}
              style={{
                flex: 1,
                height: "38px",
                backgroundColor: "#FBB03B",
                border: "none",
                borderRadius: "8px",
                fontFamily: typography.fontFamily.sans,
                fontSize: "14px",
                fontWeight: 700,
                color: "#0F172A",
                cursor: "pointer",
                transition: "background-color 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#F59E0B";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#FBB03B";
              }}
            >
              Apply
            </button>
          </div>

          <style jsx global>{`
            .attraction-dropdown-list {
              scrollbar-width: thin;
              scrollbar-color: #CBD5E1 transparent;
            }
            .attraction-dropdown-list::-webkit-scrollbar {
              width: 5px;
            }
            .attraction-dropdown-list::-webkit-scrollbar-track {
              background: transparent;
              border-radius: 4px;
            }
            .attraction-dropdown-list::-webkit-scrollbar-thumb {
              background-color: #CBD5E1;
              border-radius: 4px;
            }
            .attraction-dropdown-list::-webkit-scrollbar-thumb:hover {
              background-color: #94A3B8;
            }
          `}</style>
        </div>
      )}
    </div>
  );
}

export default AttractionFilterDropdown;
