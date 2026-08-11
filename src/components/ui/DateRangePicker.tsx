"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";

interface DateRangePickerProps {
  fromDate: string; // "YYYY-MM-DD"
  toDate: string; // "YYYY-MM-DD"
  onFromDateChange: (date: string) => void;
  onToDateChange: (date: string) => void;
  onClear?: () => void;
}

const MONTHS = [
  "January", "February", "March", "April",
  "May", "June", "July", "August",
  "September", "October", "November", "December",
];
const DAYS_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d} ${MONTHS[parseInt(m) - 1]?.slice(0, 3)} ${y}`;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function DateRangePicker({
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
  onClear,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selecting, setSelecting] = useState<"from" | "to">("from");
  const [hoverDate, setHoverDate] = useState<string>("");
  const [mounted, setMounted] = useState(false);

  // Internal draft state while dialog is open
  const [draftFrom, setDraftFrom] = useState(fromDate);
  const [draftTo, setDraftTo] = useState(toDate);

  const today = new Date();
  const todayStr = toDateStr(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  // Left calendar — independent state
  const [leftYear, setLeftYear] = useState(today.getFullYear());
  const [leftMonth, setLeftMonth] = useState(
    today.getMonth() === 0 ? 0 : today.getMonth() - 1
  );
  // Right calendar — independent state (starts at current month)
  const [rightYear, setRightYear] = useState(today.getFullYear());
  const [rightMonth, setRightMonth] = useState(today.getMonth());

  useEffect(() => setMounted(true), []);

  // Disability check:
  // 1. Future dates (strictly after today) are always disabled for both From and To
  // 2. When selecting "to", dates strictly before draftFrom are also disabled
  const isDisabled = (dateStr: string) => {
    if (dateStr > todayStr) return true;
    if (selecting === "to" && draftFrom && dateStr < draftFrom) return true;
    return false;
  };

  const openDialog = () => {
    setDraftFrom(fromDate);
    setDraftTo(toDate);
    setSelecting("from");
    setHoverDate("");
    setIsOpen(true);
  };

  const closeDialog = () => {
    setIsOpen(false);
    setHoverDate("");
  };

  const handleApply = () => {
    if (draftFrom) onFromDateChange(draftFrom);
    if (draftTo) onToDateChange(draftTo);
    closeDialog();
  };

  const handleClear = () => {
    setDraftFrom("");
    setDraftTo("");
    setSelecting("from");
    setHoverDate("");
    onClear?.();
  };

  const handleClearAndClose = () => {
    handleClear();
    closeDialog();
  };

  // Left calendar navigation
  const prevLeftMonth = () => {
    if (leftMonth === 0) { setLeftMonth(11); setLeftYear((y) => y - 1); }
    else setLeftMonth((m) => m - 1);
  };
  const nextLeftMonth = () => {
    if (leftMonth === 11) { setLeftMonth(0); setLeftYear((y) => y + 1); }
    else setLeftMonth((m) => m + 1);
  };

  // Right calendar navigation
  const prevRightMonth = () => {
    if (rightMonth === 0) { setRightMonth(11); setRightYear((y) => y - 1); }
    else setRightMonth((m) => m - 1);
  };
  const nextRightMonth = () => {
    if (rightMonth === 11) { setRightMonth(0); setRightYear((y) => y + 1); }
    else setRightMonth((m) => m + 1);
  };

  const handleDayClick = (dateStr: string) => {
    if (isDisabled(dateStr)) return;

    if (selecting === "from") {
      setDraftFrom(dateStr);
      // If previously selected To is now before new From or in the future, clear it
      if (draftTo && (dateStr > draftTo || draftTo > todayStr)) setDraftTo("");
      setSelecting("to");
    } else {
      // Only allow dates >= draftFrom and <= todayStr for To
      if (!draftFrom || dateStr < draftFrom || dateStr > todayStr) return;
      setDraftTo(dateStr);
      setSelecting("from");
    }
  };

  const isInRange = (dateStr: string) => {
    // When hovering during To selection, use hover date as preview end
    const effectiveTo =
      selecting === "to" && hoverDate && hoverDate >= draftFrom
        ? hoverDate
        : draftTo;
    if (!draftFrom || !effectiveTo) return false;
    return dateStr > draftFrom && dateStr < effectiveTo;
  };

  const isFromDay = (dateStr: string) => dateStr === draftFrom;
  const isToDay = (dateStr: string) => {
    const effectiveTo =
      selecting === "to" && hoverDate && hoverDate >= draftFrom
        ? hoverDate
        : draftTo;
    return dateStr === effectiveTo;
  };

  const renderCalendar = (
    year: number,
    month: number,
    onPrev: () => void,
    onNext: () => void,
    calendarType: "from" | "to"
  ) => {
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const cells: React.ReactNode[] = [];

    for (let i = 0; i < firstDay; i++) {
      cells.push(<div key={`empty-${i}`} style={{ width: 38, height: 38 }} />);
    }

    const effectiveTo =
      selecting === "to" && hoverDate && hoverDate >= draftFrom
        ? hoverDate
        : draftTo;

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = toDateStr(year, month, d);

      let isEndpoint = false;
      let inRange = false;
      let disabled = false;

      if (calendarType === "from") {
        // Left Calendar (From Date):
        // Disabled if future date (> today)
        disabled = dateStr > todayStr;
        // Only highlight draftFrom
        isEndpoint = dateStr === draftFrom;
        inRange = false;
      } else {
        // Right Calendar (To Date):
        // Disabled if future date OR before draftFrom
        disabled = dateStr > todayStr || (draftFrom ? dateStr < draftFrom : false);
        // Only highlight draftTo (or hover preview date)
        isEndpoint = dateStr === effectiveTo;
        // Range soft highlight on right calendar
        inRange = Boolean(
          draftFrom && effectiveTo && dateStr >= draftFrom && dateStr < effectiveTo
        );
      }

      const handleClick = () => {
        if (disabled) return;
        if (calendarType === "from") {
          setDraftFrom(dateStr);
          if (draftTo && (dateStr > draftTo || draftTo > todayStr)) setDraftTo("");
          setSelecting("to");
        } else {
          if (!draftFrom || dateStr < draftFrom || dateStr > todayStr) return;
          setDraftTo(dateStr);
        }
      };

      cells.push(
        <div
          key={dateStr}
          onMouseEnter={() => {
            if (!disabled && calendarType === "to") setHoverDate(dateStr);
          }}
          onMouseLeave={() => setHoverDate("")}
          onClick={handleClick}
          style={{
            width: 38,
            height: 38,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: isEndpoint ? "50%" : "2px",
            background: isEndpoint
              ? "#F4BC43"
              : inRange
              ? "rgba(244, 188, 67, 0.15)"
              : "transparent",
            color: disabled
              ? "rgba(176, 183, 195, 0.5)"
              : isEndpoint
              ? "#0C2A42"
              : "#374151",
            fontWeight: isEndpoint ? 700 : 500,
            fontSize: "13px",
            cursor: disabled ? "not-allowed" : "pointer",
            transition: "background 0.1s ease",
            userSelect: "none",
            fontFamily: "Inter, sans-serif",
            opacity: disabled ? 0.4 : 1,
            textDecoration: disabled ? "line-through" : "none",
          }}
        >
          {d}
        </div>
      );
    }

    return (
      <div style={{ flex: 1 }}>
        {/* Month Header — both prev & next on every calendar */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
        }}>
          <button
            onClick={onPrev}
            style={{
              width: 32, height: 32,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "#F8FAFC",
              border: "1px solid #E5E7EB",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            <ChevronLeft size={16} color="#374151" />
          </button>

          <span style={{
            fontFamily: "Inter, sans-serif",
            fontWeight: 700,
            fontSize: "14px",
            color: "#0C2A42",
          }}>
            {MONTHS[month]} {year}
          </span>

          <button
            onClick={onNext}
            style={{
              width: 32, height: 32,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "#F8FAFC",
              border: "1px solid #E5E7EB",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            <ChevronRight size={16} color="#374151" />
          </button>
        </div>

        {/* Day Labels */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 38px)",
          marginBottom: 6,
        }}>
          {DAYS_SHORT.map((d) => (
            <div key={d} style={{
              width: 38, height: 28,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "Inter, sans-serif",
              fontWeight: 600,
              fontSize: "11px",
              color: "rgba(55, 65, 81, 0.45)",
            }}>
              {d}
            </div>
          ))}
        </div>

        {/* Days */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 38px)",
          gap: "2px",
        }}>
          {cells}
        </div>
      </div>
    );
  };

  // Trigger button display text
  const hasRange = fromDate || toDate;
  const displayText =
    fromDate && toDate
      ? `${formatDisplayDate(fromDate)}  →  ${formatDisplayDate(toDate)}`
      : fromDate
      ? `From ${formatDisplayDate(fromDate)}`
      : "Select Date Range";

  const dialog = isOpen && mounted ? createPortal(
    <>
      {/* Backdrop */}
      <div
        onClick={closeDialog}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.45)",
          zIndex: 9998,
          animation: "drpBackdropIn 0.2s ease",
        }}
      />

      {/* Dialog Card */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 9999,
          background: "#FFFFFF",
          borderRadius: "16px",
          boxShadow: "0 24px 80px rgba(0, 0, 0, 0.22)",
          width: "660px",
          maxWidth: "95vw",
          overflow: "hidden",
          animation: "drpDialogIn 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        {/* Dialog Header */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 24px 16px",
          borderBottom: "1px solid rgba(179, 175, 175, 0.25)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Calendar size={18} color="#F4BC43" />
            <span style={{
              fontFamily: "Inter, sans-serif",
              fontWeight: 700,
              fontSize: "15px",
              color: "#0C2A42",
            }}>
              Select Date Range
            </span>
          </div>
          <button
            onClick={closeDialog}
            style={{
              background: "#F1F5F9",
              border: "none",
              borderRadius: "8px",
              width: 32, height: 32,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <X size={15} color="#374151" />
          </button>
        </div>

        {/* From / To Date Labels */}
        <div style={{
          display: "flex",
          gap: 12,
          padding: "16px 24px 0",
        }}>
          {/* From Box */}
          <div
            onClick={() => setSelecting("from")}
            style={{
              flex: 1,
              padding: "10px 14px",
              border: selecting === "from"
                ? "1.5px solid #F4BC43"
                : "1px solid #E5E7EB",
              borderRadius: "10px",
              background: selecting === "from" ? "rgba(244,188,67,0.06)" : "#F8FAFC",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <div style={{
              fontSize: "10px",
              fontWeight: 700,
              color: "rgba(55,65,81,0.45)",
              fontFamily: "Inter, sans-serif",
              textTransform: "uppercase",
              letterSpacing: "0.6px",
              marginBottom: 3,
            }}>
              From Date
            </div>
            <div style={{
              fontSize: "13px",
              fontWeight: 600,
              color: draftFrom ? "#0C2A42" : "#B0B7C3",
              fontFamily: "Inter, sans-serif",
            }}>
              {draftFrom ? formatDisplayDate(draftFrom) : "dd mmm yyyy"}
            </div>
          </div>

          {/* Arrow */}
          <div style={{
            display: "flex", alignItems: "center",
            color: "#C4C9D4", fontSize: 20,
            fontWeight: 300, paddingTop: 10,
          }}>
            →
          </div>

          {/* To Box */}
          <div
            onClick={() => draftFrom && setSelecting("to")}
            style={{
              flex: 1,
              padding: "10px 14px",
              border: selecting === "to"
                ? "1.5px solid #F4BC43"
                : "1px solid #E5E7EB",
              borderRadius: "10px",
              background: selecting === "to" ? "rgba(244,188,67,0.06)" : "#F8FAFC",
              cursor: draftFrom ? "pointer" : "default",
              transition: "all 0.15s ease",
            }}
          >
            <div style={{
              fontSize: "10px",
              fontWeight: 700,
              color: "rgba(55,65,81,0.45)",
              fontFamily: "Inter, sans-serif",
              textTransform: "uppercase",
              letterSpacing: "0.6px",
              marginBottom: 3,
            }}>
              To Date
            </div>
            <div style={{
              fontSize: "13px",
              fontWeight: 600,
              color: draftTo ? "#0C2A42" : "#B0B7C3",
              fontFamily: "Inter, sans-serif",
            }}>
              {draftTo ? formatDisplayDate(draftTo) : "dd mmm yyyy"}
            </div>
          </div>
        </div>

        {/* Hint text */}
        <div style={{
          padding: "8px 24px 0",
          fontFamily: "Inter, sans-serif",
          fontSize: "11px",
          fontWeight: 500,
          color: "#F4BC43",
        }}>
          {selecting === "from" ? "Click a date to set start" : "Click a date to set end"}
        </div>

        {/* Two Calendars */}
        <div style={{
          display: "flex",
          gap: 0,
          padding: "16px 24px 20px",
        }}>
          {renderCalendar(leftYear, leftMonth, prevLeftMonth, nextLeftMonth, "from")}

          {/* Divider */}
          <div style={{
            width: 1,
            background: "rgba(179, 175, 175, 0.25)",
            margin: "0 20px",
            alignSelf: "stretch",
          }} />

          {renderCalendar(rightYear, rightMonth, prevRightMonth, nextRightMonth, "to")}
        </div>

        {/* Dialog Footer */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 24px 20px",
          borderTop: "1px solid rgba(179, 175, 175, 0.25)",
        }}>
          <button
            onClick={handleClearAndClose}
            style={{
              background: "none",
              border: "1px solid #E5E7EB",
              borderRadius: "8px",
              padding: "8px 20px",
              fontFamily: "Inter, sans-serif",
              fontWeight: 500,
              fontSize: "13px",
              color: "#374151",
              cursor: "pointer",
              transition: "background 0.15s ease",
            }}
          >
            Clear
          </button>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={closeDialog}
              style={{
                background: "#F1F5F9",
                border: "1px solid #E5E7EB",
                borderRadius: "8px",
                padding: "8px 20px",
                fontFamily: "Inter, sans-serif",
                fontWeight: 500,
                fontSize: "13px",
                color: "#374151",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={!draftFrom || !draftTo}
              style={{
                background: draftFrom && draftTo ? "#F4BC43" : "#E5E7EB",
                border: "none",
                borderRadius: "8px",
                padding: "8px 24px",
                fontFamily: "Inter, sans-serif",
                fontWeight: 700,
                fontSize: "13px",
                color: draftFrom && draftTo ? "#0C2A42" : "#9CA3AF",
                cursor: draftFrom && draftTo ? "pointer" : "not-allowed",
                transition: "all 0.15s ease",
              }}
            >
              Apply Filter
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes drpBackdropIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes drpDialogIn {
          from { opacity: 0; transform: translate(-50%, -52%) scale(0.95); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>
    </>,
    document.body
  ) : null;

  return (
    <>
      {/* Trigger Button */}
      <div
        onClick={openDialog}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          height: "40px",
          padding: "0 14px",
          background: "#FFFFFF",
          border: (fromDate || toDate)
            ? "1.5px solid #F4BC43"
            : "0.5px solid rgba(179, 175, 175, 0.7)",
          borderRadius: "4px",
          cursor: "pointer",
          minWidth: 240,
          transition: "border-color 0.15s ease",
          boxSizing: "border-box",
        }}
      >
        <Calendar size={14} color={(fromDate || toDate) ? "#F4BC43" : "#A0A0A0"} />
        <span style={{
          fontFamily: "Inter, sans-serif",
          fontWeight: hasRange ? 600 : 500,
          fontSize: "12px",
          color: hasRange ? "#0C2A42" : "#A0A0A0",
          flex: 1,
          whiteSpace: "nowrap",
        }}>
          {displayText}
        </span>
        {hasRange && onClear && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              display: "flex",
              alignItems: "center",
            }}
          >
            <X size={13} color="#A0A0A0" />
          </button>
        )}
      </div>

      {dialog}
    </>
  );
}
