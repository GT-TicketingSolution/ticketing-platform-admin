"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check, X } from "lucide-react";
import { colors, typography } from "@/lib/theme";

interface MultiSelectDropdownProps {
  label: string;
  required?: boolean;
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  error?: string;
  closeOnSelectOption?: (option: string) => boolean;
  forceClose?: boolean;
}

export function MultiSelectDropdown({
  label,
  required,
  options,
  selected,
  onChange,
  placeholder = "Select options...",
  error,
  closeOnSelectOption,
  forceClose,
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuCoords, setMenuCoords] = useState<{
    top: number;
    left: number;
    width: number;
    openAbove: boolean;
  }>({ top: 0, left: 0, width: 0, openAbove: false });

  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (forceClose) {
      setIsOpen(false);
    }
  }, [forceClose]);

  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      // If space below is less than 240px and space above is sufficient, open upwards
      const openAbove = spaceBelow < 240 && rect.top > 240;
      setMenuCoords({
        top: openAbove ? rect.top - 6 : rect.bottom + 6,
        left: rect.left,
        width: rect.width,
        openAbove,
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      const handleScroll = (e: Event) => {
        // If scrolling inside the menu popover itself, keep it open
        if (menuRef.current && menuRef.current.contains(e.target as Node)) {
          return;
        }
        updatePosition();
      };
      window.addEventListener("scroll", handleScroll, true);
      window.addEventListener("resize", updatePosition);
      return () => {
        window.removeEventListener("scroll", handleScroll, true);
        window.removeEventListener("resize", updatePosition);
      };
    }
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOption = (option: string) => {
    const isSelected = selected.includes(option);
    const nextSelected = isSelected
      ? selected.filter((item) => item !== option)
      : [...selected, option];
    onChange(nextSelected);

    if (closeOnSelectOption && closeOnSelectOption(option)) {
      setIsOpen(false);
    }
  };

  const removeItem = (e: React.MouseEvent, option: string) => {
    e.stopPropagation();
    onChange(selected.filter((item) => item !== option));
  };

  return (
    <div style={{ position: "relative", width: "100%" }}>
      {/* Label */}
      <label
        style={{
          fontSize: "13px",
          fontWeight: 600,
          color: colors.text.primary,
          display: "block",
          marginBottom: "6px",
          fontFamily: typography.fontFamily.sans,
        }}
      >
        {label} {required && <span style={{ color: "#EF4444" }}>*</span>}
      </label>

      {/* Trigger Box */}
      <div
        ref={triggerRef}
        onClick={() => {
          setIsOpen((prev) => {
            const next = !prev;
            if (next) updatePosition();
            return next;
          });
        }}
        style={{
          minHeight: "42px",
          padding: "4px 12px",
          borderRadius: "8px",
          border: `1.5px solid ${error ? "#EF4444" : isOpen ? colors.brand.accent : "#CBD5E1"}`,
          background: "#FFFFFF",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
          cursor: "pointer",
          transition: "border-color 0.2s ease, box-shadow 0.2s ease",
          boxShadow: isOpen ? `0 0 0 3px rgba(35,114,165,0.12)` : "none",
          userSelect: "none",
        }}
      >
        {/* Selected Badges or Placeholder */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "6px",
            alignItems: "center",
            flex: 1,
            minWidth: 0,
            padding: "2px 0",
          }}
        >
          {selected.length === 0 ? (
            <span style={{ color: "#94A3B8", fontSize: "14px", fontFamily: typography.fontFamily.sans }}>
              {placeholder}
            </span>
          ) : (
            selected.map((item) => (
              <span
                key={item}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  background: "rgba(35,114,165,0.1)",
                  color: colors.brand.accent,
                  padding: "3px 8px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 600,
                  fontFamily: typography.fontFamily.sans,
                }}
              >
                {item}
                <X
                  size={13}
                  onClick={(e) => removeItem(e, item)}
                  style={{ cursor: "pointer", borderRadius: "50%", padding: "1px" }}
                />
              </span>
            ))
          )}
        </div>

        {/* Chevron Icon */}
        <ChevronDown
          size={18}
          color={colors.text.muted}
          style={{
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
            flexShrink: 0,
          }}
        />
      </div>

      {/* Validation Error */}
      {error && (
        <span
          style={{
            fontSize: "12px",
            color: "#EF4444",
            marginTop: "4px",
            display: "block",
            fontFamily: typography.fontFamily.sans,
          }}
        >
          {error}
        </span>
      )}

      {/* Popover Dropdown Menu — Rendered in Portal so modals never clip it */}
      {isOpen && mounted &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              top: `${menuCoords.top}px`,
              left: `${menuCoords.left}px`,
              width: `${menuCoords.width}px`,
              transform: menuCoords.openAbove ? "translateY(-100%)" : "none",
              zIndex: 99999,
              background: "#FFFFFF",
              borderRadius: "10px",
              border: "1px solid #E2E8F0",
              boxShadow: "0 14px 35px -4px rgba(0,0,0,0.18), 0 8px 14px -6px rgba(0,0,0,0.06)",
              overflow: "hidden",
            }}
          >
            <div style={{ maxHeight: "240px", overflowY: "auto", padding: "6px" }}>
              {options.length === 0 ? (
                <div style={{ padding: "12px", fontSize: "13px", color: colors.text.muted, textAlign: "center" }}>
                  No options available
                </div>
              ) : (
                options.map((opt) => {
                  const isSelected = selected.includes(opt);
                  return (
                    <div
                      key={opt}
                      onClick={() => toggleOption(opt)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "9px 12px",
                        borderRadius: "6px",
                        cursor: "pointer",
                        transition: "background 0.15s ease",
                        background: isSelected ? "rgba(35,114,165,0.08)" : "transparent",
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.background = "#F8FAFC";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = isSelected ? "rgba(35,114,165,0.08)" : "transparent";
                      }}
                    >
                      {/* Checkbox Icon */}
                      <div
                        style={{
                          width: "18px",
                          height: "18px",
                          borderRadius: "4px",
                          border: `2px solid ${isSelected ? colors.brand.accent : "#94A3B8"}`,
                          background: isSelected ? colors.brand.accent : "#FFFFFF",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "all 0.15s ease",
                          flexShrink: 0,
                        }}
                      >
                        {isSelected && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                      </div>

                      {/* Option Text */}
                      <span
                        style={{
                          fontSize: "13px",
                          fontWeight: isSelected ? 600 : 500,
                          color: isSelected ? colors.brand.accent : colors.text.primary,
                          fontFamily: typography.fontFamily.sans,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {opt}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

export default MultiSelectDropdown;
