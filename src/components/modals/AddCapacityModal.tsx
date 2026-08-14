"use client";

import React, { useState, useEffect } from "react";
import { X, PlusCircle, Check } from "lucide-react";
import { typography } from "@/lib/theme";
import { useToast } from "@/components/ui/Toast";
import { validateAddCapacitySchema } from "@/app/(dashboard)/inventory/schema";


export interface AttractionInventoryItem {
  id: string;
  name: string;
  dailyCap: number;
  booked: number;
  available: number;
  status: "Available" | "Near Full" | "Full";
  alertText?: string;
  alertType?: "warning" | "danger";
  slots?: { time: string; booked: number; capacity: number; status: string }[];
}

interface AddCapacityModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedAttraction: AttractionInventoryItem | null;
  attractionsList: AttractionInventoryItem[];
  onUpdateCapacity: (attractionId: string, addedSeats: number, slotTime?: string) => void;
}

export default function AddCapacityModal({
  isOpen,
  onClose,
  selectedAttraction,
  attractionsList,
  onUpdateCapacity,
}: AddCapacityModalProps) {
  const { showToast } = useToast();
  const [targetId, setTargetId] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<string>("All Slots");
  const [addAmount, setAddAmount] = useState<number>(25);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errors, setErrors] = useState<{ targetId?: string; selectedSlot?: string; addedSeats?: string }>({});

  useEffect(() => {
    if (selectedAttraction) {
      setTargetId(selectedAttraction.id);
    } else if (attractionsList.length > 0) {
      setTargetId(attractionsList[0].id);
    }
    setErrors({});
  }, [selectedAttraction, attractionsList]);

  if (!isOpen) return null;

  const currentAttraction = attractionsList.find((a) => a.id === targetId) || selectedAttraction;

  const handleAddSeats = (e: React.FormEvent) => {
    e.preventDefault();
    const finalAmount = customAmount !== "" ? customAmount : addAmount;

    // Schema-based validation check
    const validation = validateAddCapacitySchema({
      targetId,
      selectedSlot,
      addedSeats: finalAmount,
    });

    if (!validation.isValid) {
      setErrors(validation.errors);
      const firstErr = Object.values(validation.errors)[0];
      if (firstErr) showToast(firstErr, "error");
      return;
    }

    setErrors({});
    const numSeats = typeof finalAmount === "number" ? finalAmount : parseInt(finalAmount, 10);

    setIsSubmitting(true);
    setTimeout(() => {
      onUpdateCapacity(targetId, numSeats, selectedSlot);
      showToast(
        `Added +${numSeats} seats to ${currentAttraction?.name || "attraction"} (${selectedSlot})`,
        "success"
      );
      setIsSubmitting(false);
      onClose();
      setCustomAmount("");
    }, 400);
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
                Add Inventory Capacity
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: "12px",
                  color: "#94A3B8",
                  fontFamily: typography.fontFamily.sans,
                }}
              >
                Increase available seating slots dynamically
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
        <form onSubmit={handleAddSeats} style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
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
              Select Attraction <span style={{ color: "#EF4444", fontWeight: 700 }}>*</span>
            </label>
            <select
              value={targetId}
              onChange={(e) => {
                setTargetId(e.target.value);
                if (errors.targetId) setErrors((prev) => ({ ...prev, targetId: undefined }));
              }}
              style={{
                width: "100%",
                padding: "11px 14px",
                borderRadius: "10px",
                border: errors.targetId ? "1.5px solid #EF4444" : "1px solid #A0A0A0",
                fontSize: "14px",
                fontWeight: 600,
                color: "#011B2F",
                fontFamily: typography.fontFamily.sans,
                backgroundColor: "#FFFFFF",
                outline: "none",
                cursor: "pointer",
              }}
            >
              {attractionsList.map((att) => (
                <option key={att.id} value={att.id}>
                  {att.name} (Available: {att.available} / Cap: {att.dailyCap})
                </option>
              ))}
            </select>
            {errors.targetId && (
              <span style={{ fontSize: "12px", color: "#EF4444", marginTop: "4px", display: "block" }}>
                {errors.targetId}
              </span>
            )}
          </div>

          {/* Current Status Box */}
          {currentAttraction && (
            <div
              style={{
                background: currentAttraction.status === "Full" ? "#FEF2F2" : currentAttraction.status === "Near Full" ? "#FFFBEB" : "#F0FDF4",
                border: `1px solid ${currentAttraction.status === "Full" ? "#FEE2E2" : currentAttraction.status === "Near Full" ? "#FEF3C7" : "#BBF7D0"}`,
                borderRadius: "12px",
                padding: "14px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <span
                  style={{
                    display: "block",
                    fontSize: "11px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    color: currentAttraction.status === "Full" ? "#DC2626" : currentAttraction.status === "Near Full" ? "#D97706" : "#166534",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  Current Live Capacity State
                </span>
                <span
                  style={{
                    fontSize: "14px",
                    fontWeight: 700,
                    color: "#011B2F",
                    fontFamily: typography.fontFamily.sans,
                  }}
                >
                  {currentAttraction.booked} booked out of {currentAttraction.dailyCap} total
                </span>
              </div>
              <div style={{ textAlign: "right" }}>
                <span
                  style={{
                    fontSize: "18px",
                    fontWeight: 700,
                    color: currentAttraction.available === 0 ? "#EF4444" : "#10B981",
                    fontFamily: "'DM Mono', monospace",
                  }}
                >
                  {currentAttraction.available} Left
                </span>
              </div>
            </div>
          )}

          {/* Time Slot Selection */}
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
              Time Slot Allocation <span style={{ color: "#EF4444", fontWeight: 700 }}>*</span>
            </label>
            <select
              value={selectedSlot}
              onChange={(e) => {
                setSelectedSlot(e.target.value);
                if (errors.selectedSlot) setErrors((prev) => ({ ...prev, selectedSlot: undefined }));
              }}
              style={{
                width: "100%",
                padding: "11px 14px",
                borderRadius: "10px",
                border: errors.selectedSlot ? "1.5px solid #EF4444" : "1px solid #A0A0A0",
                fontSize: "14px",
                fontWeight: 600,
                color: "#011B2F",
                fontFamily: typography.fontFamily.sans,
                backgroundColor: "#FFFFFF",
                outline: "none",
              }}
            >
              <option value="All Slots">All Slots (Distribute evenly)</option>
              <option value="09:00 AM">09:00 AM Slot</option>
              <option value="10:30 AM">10:30 AM Slot</option>
              <option value="11:00 AM">11:00 AM Slot</option>
              <option value="02:00 PM">02:00 PM Slot</option>
              <option value="04:30 PM">04:30 PM Slot</option>
            </select>
            {errors.selectedSlot && (
              <span style={{ fontSize: "12px", color: "#EF4444", marginTop: "4px", display: "block" }}>
                {errors.selectedSlot}
              </span>
            )}
          </div>

          {/* Preset Buttons & Custom Input */}
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
              Additional Seats Count <span style={{ color: "#EF4444", fontWeight: 700 }}>*</span>
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", marginBottom: "12px" }}>
              {presetAmounts.map((amt) => {
                const isSelected = !customAmount && addAmount === amt;
                return (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => {
                      setAddAmount(amt);
                      setCustomAmount("");
                      if (errors.addedSeats) setErrors((prev) => ({ ...prev, addedSeats: undefined }));
                    }}
                    style={{
                      padding: "10px",
                      borderRadius: "10px",
                      border: isSelected ? "2px solid #0C2A42" : "1px solid #A0A0A0",
                      background: isSelected ? "#0C2A42" : "#FFFFFF",
                      color: isSelected ? "#FFFFFF" : "#011B2F",
                      fontWeight: 700,
                      fontSize: "14px",
                      fontFamily: "'DM Mono', monospace",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    +{amt}
                  </button>
                );
              })}
            </div>

            {/* Custom Input */}
            <div>
              <input
                type="number"
                min="1"
                max="5000"
                placeholder="Or enter custom seat amount..."
                value={customAmount}
                onChange={(e) => {
                  setCustomAmount(e.target.value);
                  if (errors.addedSeats) setErrors((prev) => ({ ...prev, addedSeats: undefined }));
                }}
                style={{
                  width: "100%",
                  padding: "11px 14px",
                  borderRadius: "10px",
                  border: errors.addedSeats ? "1.5px solid #EF4444" : customAmount ? "2px solid #0C2A42" : "1px solid #A0A0A0",
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#011B2F",
                  fontFamily: typography.fontFamily.sans,
                  outline: "none",
                }}
              />
            </div>
            {errors.addedSeats && (
              <span style={{ fontSize: "12px", color: "#EF4444", marginTop: "4px", display: "block" }}>
                {errors.addedSeats}
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "10px" }}>
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
              disabled={isSubmitting}
              style={{
                padding: "10px 24px",
                borderRadius: "10px",
                border: "none",
                background: "#F4BC43",
                color: "#011B2F",
                fontSize: "14px",
                fontWeight: 700,
                fontFamily: typography.fontFamily.sans,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: "0 4px 12px rgba(244, 188, 67, 0.35)",
              }}
            >
              <Check size={18} />
              {isSubmitting ? "Updating..." : "Confirm & Add Capacity"}
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
