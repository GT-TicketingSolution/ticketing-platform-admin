"use client";

import React, { useState, useEffect } from "react";
import { X, PlusCircle, Check, Loader2 } from "lucide-react";
import { typography } from "@/lib/theme";
import { useToast } from "@/components/ui/Toast";
import { validateUpsertCapacitySchema } from "@/app/(dashboard)/inventory/schema";
import { useUpsertDailyCapacity, InventoryItem } from "@/hooks/useInventoryQueries";

interface AttractionOption {
  id: string;
  name: string;
}

interface AddCapacityModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItem?: InventoryItem | null;
  attractionsList: AttractionOption[];
  onSuccess?: () => void;
}

export default function AddCapacityModal({
  isOpen,
  onClose,
  selectedItem,
  attractionsList,
  onSuccess,
}: AddCapacityModalProps) {
  const { showToast } = useToast();
  const upsertMutation = useUpsertDailyCapacity();

  const [attractionId, setAttractionId] = useState<string>("");
  const [capacityDate, setCapacityDate] = useState<string>("");
  const [totalCapacity, setTotalCapacity] = useState<string>("");
  const [errors, setErrors] = useState<{ attractionId?: string; capacityDate?: string; totalCapacity?: string }>({});

  const todayStr = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (selectedItem) {
      setAttractionId(selectedItem.attraction?.id || "");
      setCapacityDate(selectedItem.capacityDate && selectedItem.capacityDate !== "-" ? selectedItem.capacityDate : todayStr);
      setTotalCapacity(String(selectedItem.totalCapacity ?? ""));
    } else {
      if (attractionsList.length > 0 && !attractionId) {
        setAttractionId(attractionsList[0].id);
      }
      setCapacityDate(todayStr);
      setTotalCapacity("");
    }
    setErrors({});
  }, [selectedItem, attractionsList, isOpen]);

  if (!isOpen) return null;

  const currentAttraction = attractionsList.find((a) => a.id === attractionId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateUpsertCapacitySchema({
      attractionId,
      capacityDate,
      totalCapacity,
    });

    if (!validation.isValid) {
      setErrors(validation.errors);
      const firstErr = Object.values(validation.errors)[0];
      if (firstErr) showToast(firstErr, "error");
      return;
    }

    setErrors({});
    const numCapacity = parseInt(String(totalCapacity), 10);

    try {
      await upsertMutation.mutateAsync({
        attractionId,
        capacityDate,
        totalCapacity: numCapacity,
      });
      onSuccess?.();
      onClose();
    } catch (err: any) {
      // Handled in mutation onError
    }
  };

  const handleAddPreset = (amount: number) => {
    const current = parseInt(totalCapacity || "0", 10) || 0;
    setTotalCapacity(String(current + amount));
    if (errors.totalCapacity) setErrors((prev) => ({ ...prev, totalCapacity: undefined }));
  };

  const presetAmounts = [10, 25, 50, 100];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(12, 42, 66, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "20px",
          width: "100%",
          maxWidth: "520px",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.25)",
          border: "1px solid rgba(160, 160, 160, 0.4)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: "modalFadeIn 0.2s ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "18px 24px",
            background: "#0C2A42",
            color: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "10px",
                background: "rgba(244, 188, 67, 0.2)",
                border: "1px solid #F4BC43",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#F4BC43",
              }}
            >
              <PlusCircle size={20} />
            </div>
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: "16px",
                  fontWeight: 700,
                  fontFamily: typography.fontFamily.sans,
                  color: "#FFFFFF",
                }}
              >
                {selectedItem ? "Update Daily Capacity" : "Set Daily Capacity"}
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: "12px",
                  color: "#94A3B8",
                  fontFamily: typography.fontFamily.sans,
                }}
              >
                Configure attraction capacity for a specific date
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "#FFFFFF",
              padding: "4px",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "18px" }}>
          {/* Target Attraction Selection */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: 700,
                color: "#011B2F",
                marginBottom: "8px",
                fontFamily: typography.fontFamily.sans,
              }}
            >
              Attraction <span style={{ color: "#EF4444", fontWeight: 700 }}>*</span>
            </label>
            <select
              value={attractionId}
              onChange={(e) => {
                setAttractionId(e.target.value);
                if (errors.attractionId) setErrors((prev) => ({ ...prev, attractionId: undefined }));
              }}
              style={{
                width: "100%",
                padding: "11px 14px",
                borderRadius: "10px",
                border: errors.attractionId ? "1.5px solid #EF4444" : "1px solid #A0A0A0",
                fontSize: "14px",
                fontWeight: 600,
                color: "#011B2F",
                fontFamily: typography.fontFamily.sans,
                backgroundColor: "#FFFFFF",
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="" disabled>Select an attraction</option>
              {attractionsList.map((att) => (
                <option key={att.id} value={att.id}>
                  {att.name}
                </option>
              ))}
            </select>
            {errors.attractionId && (
              <span style={{ fontSize: "12px", color: "#EF4444", marginTop: "4px", display: "block" }}>
                {errors.attractionId}
              </span>
            )}
          </div>

          {/* Capacity Date */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: 700,
                color: "#011B2F",
                marginBottom: "8px",
                fontFamily: typography.fontFamily.sans,
              }}
            >
              Capacity Date <span style={{ color: "#EF4444", fontWeight: 700 }}>*</span>
            </label>
            <input
              type="date"
              value={capacityDate}
              onChange={(e) => {
                setCapacityDate(e.target.value);
                if (errors.capacityDate) setErrors((prev) => ({ ...prev, capacityDate: undefined }));
              }}
              style={{
                width: "100%",
                padding: "11px 14px",
                borderRadius: "10px",
                border: errors.capacityDate ? "1.5px solid #EF4444" : "1px solid #A0A0A0",
                fontSize: "14px",
                fontWeight: 600,
                color: "#011B2F",
                fontFamily: typography.fontFamily.sans,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            {errors.capacityDate && (
              <span style={{ fontSize: "12px", color: "#EF4444", marginTop: "4px", display: "block" }}>
                {errors.capacityDate}
              </span>
            )}
          </div>

          {/* Total Capacity Field */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: 700,
                color: "#011B2F",
                marginBottom: "8px",
                fontFamily: typography.fontFamily.sans,
              }}
            >
              Total Daily Capacity <span style={{ color: "#EF4444", fontWeight: 700 }}>*</span>
            </label>
            <input
              type="number"
              min="0"
              max="50000"
              placeholder="e.g. 500"
              value={totalCapacity}
              onChange={(e) => {
                setTotalCapacity(e.target.value);
                if (errors.totalCapacity) setErrors((prev) => ({ ...prev, totalCapacity: undefined }));
              }}
              style={{
                width: "100%",
                padding: "11px 14px",
                borderRadius: "10px",
                border: errors.totalCapacity ? "1.5px solid #EF4444" : "1px solid #A0A0A0",
                fontSize: "14px",
                fontWeight: 600,
                color: "#011B2F",
                fontFamily: typography.fontFamily.sans,
                outline: "none",
                boxSizing: "border-box",
                marginBottom: "8px",
              }}
            />
            {errors.totalCapacity && (
              <span style={{ fontSize: "12px", color: "#EF4444", marginBottom: "8px", display: "block" }}>
                {errors.totalCapacity}
              </span>
            )}

            {/* Quick Add Presets */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px" }}>
              <span style={{ fontSize: "12px", color: "#64748B", fontWeight: 500 }}>Quick add:</span>
              {presetAmounts.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleAddPreset(amt)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "6px",
                    border: "1px solid #CBD5E1",
                    background: "#F8FAFC",
                    color: "#0C2A42",
                    fontWeight: 600,
                    fontSize: "12px",
                    fontFamily: "'DM Mono', monospace",
                    cursor: "pointer",
                  }}
                >
                  +{amt}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "12px" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "10px 20px",
                borderRadius: "10px",
                border: "1px solid #A0A0A0",
                background: "#FFFFFF",
                color: "#374151",
                fontSize: "14px",
                fontWeight: 600,
                fontFamily: typography.fontFamily.sans,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={upsertMutation.isPending}
              style={{
                padding: "10px 24px",
                borderRadius: "10px",
                border: "none",
                background: upsertMutation.isPending ? "#E5E7EB" : "#F4BC43",
                color: upsertMutation.isPending ? "#6B7280" : "#011B2F",
                fontSize: "14px",
                fontWeight: 700,
                fontFamily: typography.fontFamily.sans,
                cursor: upsertMutation.isPending ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: upsertMutation.isPending ? "none" : "0 4px 12px rgba(244, 188, 67, 0.35)",
              }}
            >
              {upsertMutation.isPending ? (
                <>
                  <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check size={18} />
                  <span>Save Capacity</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
      <style>{`
        @keyframes modalFadeIn {
          from { opacity: 0; transform: translateY(-12px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
