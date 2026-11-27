"use client";

import React, { useState, useEffect } from "react";
import { X, GripVertical, Trash2 } from "lucide-react";
import { useModalBodyLock } from "@/hooks/useModalBodyLock";

export interface StationItem {
  id: string;
  name: string;
  enabled?: boolean;
}

interface ConfigureStationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: {
    isMultiStation: boolean;
    isRoundTrip: boolean;
    stations: StationItem[];
  }) => void;
  initialMultiStation?: boolean;
  initialRoundTrip?: boolean;
  initialStations?: StationItem[];
}

export default function ConfigureStationsModal({
  isOpen,
  onClose,
  onSave,
  initialMultiStation = false,
  initialRoundTrip = false,
  initialStations,
}: ConfigureStationsModalProps) {
  useModalBodyLock(isOpen);

  const defaultStations: StationItem[] = [
    { id: "st-1", name: "Station", enabled: true },
    { id: "st-2", name: "Station", enabled: true },
    { id: "st-3", name: "Station", enabled: true },
  ];

  const [multiStationStatus, setMultiStationStatus] = useState<boolean>(initialMultiStation);
  const [roundTrip, setRoundTrip] = useState<boolean>(initialRoundTrip);
  const [stations, setStations] = useState<StationItem[]>(
    initialStations && initialStations.length > 0
      ? initialStations.map((s) => ({ ...s, enabled: s.enabled !== false }))
      : defaultStations
  );
  const [stationCountInput, setStationCountInput] = useState<string>(() =>
    String(initialStations && initialStations.length > 0 ? initialStations.length : 3)
  );
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMultiStationStatus(initialMultiStation);
      setRoundTrip(initialRoundTrip);
      const cur =
        initialStations && initialStations.length > 0
          ? initialStations.map((s) => ({ ...s, enabled: s.enabled !== false }))
          : defaultStations;
      setStations(cur);
      setStationCountInput(String(cur.length));
    }
  }, [isOpen, initialMultiStation, initialRoundTrip, initialStations]);

  // Keep stationCountInput in sync when stations array changes (e.g. deleted or reordered)
  useEffect(() => {
    setStationCountInput(String(stations.length));
  }, [stations.length]);

  if (!isOpen) return null;

  const handleStationCountChange = (count: number) => {
    if (count < 2) count = 2;
    if (count > 20) count = 20;
    if (count === stations.length) return;

    if (count > stations.length) {
      const added: StationItem[] = [];
      for (let i = stations.length + 1; i <= count; i++) {
        added.push({ id: `st-${Date.now()}-${i}`, name: `Station ${i}`, enabled: true });
      }
      setStations([...stations, ...added]);
    } else {
      setStations(stations.slice(0, count));
    }
  };

  const handleNameChange = (id: string, newName: string) => {
    setStations((prev) =>
      prev.map((st) => (st.id === id ? { ...st, name: newName } : st))
    );
  };

  const handleToggleStationEnabled = (id: string) => {
    setStations((prev) =>
      prev.map((st) =>
        st.id === id ? { ...st, enabled: st.enabled === false ? true : false } : st
      )
    );
  };

  const handleDeleteStation = (id: string) => {
    if (stations.length <= 2) {
      alert("At least 2 stations are required for a multi-station route.");
      return;
    }
    const filtered = stations.filter((st) => st.id !== id);
    // Re-sequence default names ("Station X") according to row sequence
    const updated = filtered.map((st, idx) => {
      const isDefaultName = !st.name || /^Station\s*\d+$/i.test(st.name.trim());
      return {
        ...st,
        name: isDefaultName ? `Station ${idx + 1}` : st.name,
      };
    });
    setStations(updated);
    setStationCountInput(String(updated.length));
  };

  // Drag & drop handlers
  const handleDragStart = (e: React.DragEvent, idx: number) => {
    setDraggedIdx(idx);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === idx) return;
    const next = [...stations];
    const draggedItem = next[draggedIdx];
    next.splice(draggedIdx, 1);
    next.splice(idx, 0, draggedItem);
    setDraggedIdx(idx);
    setStations(next);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
  };

  const handleSave = () => {
    onSave({
      isMultiStation: multiStationStatus,
      isRoundTrip: roundTrip,
      stations: stations.map((s, idx) => ({
        ...s,
        name: s.name.trim() || `Station ${idx + 1}`,
        enabled: s.enabled !== false,
      })),
    });
    onClose();
  };

  return (
    <div
      className="configure-stations-modal-overlay"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.6)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1200,
        padding: "16px",
      }}
    >
      <div
        className="configure-stations-modal-dialog"
        style={{
          background: "#FFFFFF",
          border: "1px solid #F3F4F6",
          boxShadow: "0px 25px 50px -12px rgba(0, 0, 0, 0.25)",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "620px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          boxSizing: "border-box",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Fixed Header ── */}
        <div
          className="configure-stations-header"
          style={{
            padding: "24px 28px 16px",
            borderBottom: "1px solid #F1F5F9",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            position: "relative",
            flexShrink: 0,
          }}
        >
          <div style={{ paddingRight: "36px" }}>
            <h2
              style={{
                margin: 0,
                fontWeight: 600,
                fontSize: "20px",
                lineHeight: "26px",
                letterSpacing: "-0.475px",
                color: "#172B3A",
              }}
            >
              Configure Stations
            </h2>
            <p
              style={{
                margin: "4px 0 0 0",
                fontWeight: 500,
                fontSize: "12px",
                lineHeight: "20px",
                color: "#6B7280",
              }}
            >
              Add and manage multiple stations for this attraction. You can rename, reorder, or remove stations.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "9999px",
              border: "none",
              background: "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#9CA3AF",
              transition: "background 0.15s ease",
            }}
            title="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Scrollable Body ── */}
        <div
          className="configure-stations-body"
          style={{
            padding: "20px 28px",
            display: "flex",
            flexDirection: "column",
            gap: "18px",
            overflowY: "auto",
            flex: 1,
            boxSizing: "border-box",
          }}
        >
          {/* Top Multi-Station Status Toggle Box */}
          <div
            style={{
              background: "#EFF6FF",
              border: "1px solid #DBEAFE",
              borderRadius: "12px",
              padding: "10px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              maxWidth: "270px",
              boxSizing: "border-box",
            }}
          >
            <span
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 500,
                fontSize: "13px",
                lineHeight: "20px",
                color: "#172B3A",
              }}
            >
              Multi-Station Status
            </span>

            <button
              type="button"
              role="switch"
              aria-checked={multiStationStatus}
              onClick={() => setMultiStationStatus(!multiStationStatus)}
              style={{
                width: "36px",
                height: "20px",
                borderRadius: "9999px",
                background: multiStationStatus ? "#22C55E" : "#D1D5DB",
                border: "none",
                cursor: "pointer",
                position: "relative",
                padding: "2px",
                transition: "background-color 0.2s ease",
                display: "flex",
                alignItems: "center",
                outline: "none",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: "16px",
                  height: "16px",
                  borderRadius: "50%",
                  background: "#FFFFFF",
                  boxShadow: "0px 1px 3px rgba(0,0,0,0.2)",
                  transform: multiStationStatus ? "translateX(16px)" : "translateX(0px)",
                  transition: "transform 0.2s ease",
                }}
              />
            </button>
          </div>

          {/* Number of Stations + Round Trip Toggle */}
          <div
            className="stations-config-row"
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              gap: "16px",
              flexWrap: "wrap",
              width: "100%",
            }}
          >
            {/* Number of Stations Input */}
            <div className="stations-count-field" style={{ flex: "1 1 240px" }}>
              <label
                style={{
                  display: "block",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 700,
                  fontSize: "12px",
                  lineHeight: "20px",
                  color: "#172B3A",
                  marginBottom: "6px",
                }}
              >
                Number of Stations <span style={{ color: "#EA4335" }}>*</span>
              </label>

              <input
                type="text"
                inputMode="numeric"
                value={stationCountInput}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, "");
                  setStationCountInput(raw);
                  const val = parseInt(raw, 10);
                  if (!isNaN(val) && val >= 2 && val <= 20) {
                    handleStationCountChange(val);
                  }
                }}
                onBlur={() => {
                  const val = parseInt(stationCountInput, 10);
                  if (isNaN(val) || val < 2) {
                    const fallback = Math.max(2, stations.length);
                    setStationCountInput(String(fallback));
                    handleStationCountChange(fallback);
                  } else if (val > 20) {
                    setStationCountInput("20");
                    handleStationCountChange(20);
                  } else {
                    handleStationCountChange(val);
                  }
                }}
                placeholder="3"
                style={{
                  boxSizing: "border-box",
                  width: "100%",
                  height: "44px",
                  background: "#FFFFFF",
                  border: "1px solid #D1D5DB",
                  borderRadius: "8px",
                  padding: "0 14px",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "#172B3A",
                  outline: "none",
                  boxShadow: "0px 1px 2px rgba(0, 0, 0, 0.05)",
                }}
              />
            </div>

            {/* Round Trip (Cyclic Route) Toggle */}
            <div
              className="round-trip-toggle-box"
              style={{
                boxSizing: "border-box",
                background: "rgba(239, 246, 255, 0.4)",
                border: "1px solid #DBEAFE",
                borderRadius: "12px",
                padding: "0 16px",
                height: "44px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "14px",
                flex: "1 1 240px",
              }}
            >
              <span
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 500,
                  fontSize: "13px",
                  lineHeight: "20px",
                  color: "#172B3A",
                }}
              >
                Round Trip (Cyclic Route)
              </span>

              <button
                type="button"
                role="switch"
                aria-checked={roundTrip}
                onClick={() => setRoundTrip(!roundTrip)}
                style={{
                  width: "36px",
                  height: "20px",
                  borderRadius: "9999px",
                  background: roundTrip ? "#22C55E" : "#D1D5DB",
                  border: "none",
                  cursor: "pointer",
                  position: "relative",
                  padding: "2px",
                  transition: "background-color 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  outline: "none",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: "16px",
                    height: "16px",
                    borderRadius: "50%",
                    background: "#FFFFFF",
                    boxShadow: "0px 1px 3px rgba(0,0,0,0.2)",
                    transform: roundTrip ? "translateX(16px)" : "translateX(0px)",
                    transition: "transform 0.2s ease",
                  }}
                />
              </button>
            </div>
          </div>

          {/* Stations List Section */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 600,
                  fontSize: "14px",
                  color: "#111827",
                }}
              >
                Stations
              </span>
              <span
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "12px",
                  color: "#6B7280",
                }}
              >
                Reorder to set the station sequence
              </span>
            </div>

            {/* List container */}
            <div
              className="stations-list-scrollable"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                width: "100%",
                background: "#FFFFFF",
                border: "1px solid #E5E7EB",
                borderRadius: "12px",
                padding: "12px",
                boxSizing: "border-box",
                maxHeight: "280px",
                overflowY: "auto",
              }}
            >
              {stations.map((st, idx) => {
                const isEnabled = st.enabled !== false;
                return (
                  <div
                    key={st.id || idx}
                    draggable
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDragEnd={handleDragEnd}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      width: "100%",
                      boxSizing: "border-box",
                      opacity: isEnabled ? 1 : 0.45,
                      transition: "opacity 0.2s ease",
                    }}
                  >
                    {/* Grip Icon */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: isEnabled ? "grab" : "not-allowed",
                        color: "#9CA3AF",
                        flexShrink: 0,
                      }}
                      title="Drag to reorder"
                    >
                      <GripVertical size={18} />
                    </div>

                    {/* Sequence Number Badge */}
                    <div
                      style={{
                        width: "36px",
                        height: "40px",
                        border: "1px solid #E5E7EB",
                        borderRadius: "8px",
                        background: "#FFFFFF",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        fontSize: "14px",
                        fontWeight: 600,
                        color: "#1F2937",
                        flexShrink: 0,
                      }}
                    >
                      {idx + 1}
                    </div>

                    {/* Station Name Input */}
                    <input
                      type="text"
                      value={st.name}
                      disabled={!isEnabled}
                      onChange={(e) => handleNameChange(st.id, e.target.value)}
                      placeholder={`Station ${idx + 1}`}
                      style={{
                        flex: 1,
                        height: "40px",
                        border: "1px solid #E5E7EB",
                        borderRadius: "8px",
                        padding: "0 14px",
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        fontSize: "14px",
                        fontWeight: 500,
                        color: isEnabled ? "#111827" : "#9CA3AF",
                        background: isEnabled ? "#FFFFFF" : "#F9FAFB",
                        outline: "none",
                        cursor: isEnabled ? "text" : "not-allowed",
                        boxSizing: "border-box",
                        minWidth: "80px",
                      }}
                    />

                    {/* Enable/Disable Station Toggle (Before Delete Button) */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isEnabled}
                      onClick={() => handleToggleStationEnabled(st.id)}
                      style={{
                        width: "36px",
                        height: "20px",
                        borderRadius: "9999px",
                        background: isEnabled ? "#22C55E" : "#D1D5DB",
                        border: "none",
                        cursor: "pointer",
                        position: "relative",
                        padding: "2px",
                        transition: "background-color 0.2s ease",
                        display: "flex",
                        alignItems: "center",
                        outline: "none",
                        flexShrink: 0,
                      }}
                      title={isEnabled ? "Disable station" : "Enable station"}
                    >
                      <div
                        style={{
                          width: "16px",
                          height: "16px",
                          borderRadius: "50%",
                          background: "#FFFFFF",
                          boxShadow: "0px 1px 3px rgba(0,0,0,0.2)",
                          transform: isEnabled ? "translateX(16px)" : "translateX(0px)",
                          transition: "transform 0.2s ease",
                        }}
                      />
                    </button>

                    {/* Delete Station Button */}
                    <button
                      type="button"
                      onClick={() => handleDeleteStation(st.id)}
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "8px",
                        border: "1px solid #EF4444",
                        background: "#FFFFFF",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        flexShrink: 0,
                        transition: "background-color 0.15s ease",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#FEF2F2")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#FFFFFF")}
                      title="Delete Station"
                    >
                      <Trash2 size={16} color="#EF4444" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Fixed Footer ── */}
        <div
          className="configure-stations-footer"
          style={{
            borderTop: "1px solid #F1F5F9",
            padding: "16px 28px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            flexShrink: 0,
            background: "#FFFFFF",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              boxSizing: "border-box",
              padding: "10px 24px",
              height: "42px",
              background: "#FFFFFF",
              border: "1px solid #D1D5DB",
              borderRadius: "8px",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 500,
              fontSize: "14px",
              color: "#172B3A",
              cursor: "pointer",
              transition: "background 0.15s ease",
            }}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            style={{
              boxSizing: "border-box",
              padding: "10px 28px",
              height: "42px",
              background: "#F4BC43",
              boxShadow: "0px 1px 2px rgba(0, 0, 0, 0.05)",
              border: "none",
              borderRadius: "8px",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 600,
              fontSize: "14px",
              color: "#0D2B43",
              cursor: "pointer",
              transition: "filter 0.15s ease",
            }}
          >
            Save Stations
          </button>
        </div>
      </div>

      <style jsx global>{`
        .stations-list-scrollable::-webkit-scrollbar {
          width: 5px;
        }
        .stations-list-scrollable::-webkit-scrollbar-thumb {
          background: #CBD5E1;
          border-radius: 9999px;
        }
        .stations-list-scrollable::-webkit-scrollbar-track {
          background: transparent;
        }
        @media (max-width: 640px) {
          .configure-stations-modal-overlay {
            padding: 10px !important;
          }
          .configure-stations-modal-dialog {
            max-height: 95vh !important;
            border-radius: 12px !important;
          }
          .configure-stations-header {
            padding: 18px 18px 14px !important;
          }
          .configure-stations-header h2 {
            font-size: 18px !important;
          }
          .configure-stations-body {
            padding: 14px 18px !important;
            gap: 14px !important;
          }
          .stations-config-row {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 12px !important;
          }
          .stations-count-field,
          .round-trip-toggle-box {
            flex: none !important;
            width: 100% !important;
          }
          .configure-stations-footer {
            padding: 14px 18px !important;
          }
        }
      `}</style>
    </div>
  );
}
