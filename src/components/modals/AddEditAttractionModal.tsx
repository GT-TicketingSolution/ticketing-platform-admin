"use client";

import React, { useState, useEffect } from "react";
import { X, Landmark } from "lucide-react";
import { typography } from "@/lib/theme";
import { Attraction, AttractionTicketPricing } from "@/types/admin";

interface AddEditAttractionModalProps {
  isOpen: boolean;
  onClose: () => void;
  attractionToEdit?: Attraction | null;
  onSave: (attractionData: Partial<Attraction>) => void;
}

export default function AddEditAttractionModal({
  isOpen,
  onClose,
  attractionToEdit,
  onSave,
}: AddEditAttractionModalProps) {
  const isEditing = Boolean(attractionToEdit);

  const [name, setName] = useState("");
  const [category, setCategory] = useState<Attraction["category"]>("Ride");
  const [timing, setTiming] = useState("09:00 AM - 06:00 PM");
  const [hasSeating, setHasSeating] = useState(false);
  const [status, setStatus] = useState<"Active" | "Inactive">("Active");
  const [image, setImage] = useState("");

  const [pricing, setPricing] = useState<AttractionTicketPricing>({
    adult: 100,
    child: 50,
    student: 60,
    senior: 75,
    foreigner: 500,
  });

  useEffect(() => {
    if (attractionToEdit) {
      setName(attractionToEdit.name);
      setCategory(attractionToEdit.category);
      setTiming(attractionToEdit.timing);
      setHasSeating(attractionToEdit.hasSeating);
      setStatus(attractionToEdit.status);
      setImage(attractionToEdit.image || "");
      setPricing(attractionToEdit.pricing);
    } else {
      setName("");
      setCategory("Ride");
      setTiming("09:00 AM - 06:00 PM");
      setHasSeating(true);
      setStatus("Active");
      setImage("/Assets/Attraction/Toy_Train.jpg");
      setPricing({ adult: 100, child: 50, student: 60, senior: 75, foreigner: 500 });
    }
  }, [attractionToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: attractionToEdit?.id,
      name,
      category,
      timing,
      hasSeating: category === "Ride" ? hasSeating : false,
      status,
      image,
      pricing,
    });
    onClose();
  };

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
          maxWidth: "560px",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.25)",
          border: "1px solid rgba(179, 175, 175, 0.4)",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid #E5E7EB",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#0C2A42",
            color: "#FFFFFF",
            borderTopLeftRadius: "20px",
            borderTopRightRadius: "20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Landmark size={22} color="#F4BC43" />
            <h2
              style={{
                fontFamily: typography.fontFamily.sans,
                fontWeight: 700,
                fontSize: "18px",
                color: "#FFFFFF",
                margin: 0,
              }}
            >
              {isEditing ? "Edit Attraction" : "Add New Attraction"}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "4px",
              borderRadius: "50%",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "18px" }}>
          {/* Name */}
          <div>
            <label
              style={{
                display: "block",
                fontFamily: typography.fontFamily.sans,
                fontSize: "13px",
                fontWeight: 700,
                color: "#011B2F",
                marginBottom: "6px",
              }}
            >
              Attraction Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Royal Palace Ride"
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "8px",
                border: "1.5px solid rgba(179, 175, 175, 0.51)",
                fontSize: "14px",
                fontFamily: typography.fontFamily.sans,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Category & Timing */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <label
                style={{
                  display: "block",
                  fontFamily: typography.fontFamily.sans,
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#011B2F",
                  marginBottom: "6px",
                }}
              >
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => {
                  const cat = e.target.value as Attraction["category"];
                  setCategory(cat);
                  if (cat === "Ride") setHasSeating(true);
                  else setHasSeating(false);
                }}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1.5px solid rgba(179, 175, 175, 0.51)",
                  fontSize: "14px",
                  fontFamily: typography.fontFamily.sans,
                  outline: "none",
                  boxSizing: "border-box",
                  background: "#FFFFFF",
                }}
              >
                <option value="Ride">Ride</option>
                <option value="Monument">Monument</option>
                <option value="Park">Park</option>
                <option value="Museum">Museum</option>
                <option value="Fort">Fort</option>
                <option value="Show">Show</option>
              </select>
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontFamily: typography.fontFamily.sans,
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#011B2F",
                  marginBottom: "6px",
                }}
              >
                Operating Hours *
              </label>
              <input
                type="text"
                required
                value={timing}
                onChange={(e) => setTiming(e.target.value)}
                placeholder="e.g. 09:00 AM - 06:00 PM"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1.5px solid rgba(179, 175, 175, 0.51)",
                  fontSize: "14px",
                  fontFamily: typography.fontFamily.sans,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          {/* Pricing Grid */}
          <div>
            <label
              style={{
                display: "block",
                fontFamily: typography.fontFamily.sans,
                fontSize: "13px",
                fontWeight: 700,
                color: "#011B2F",
                marginBottom: "8px",
              }}
            >
              Ticket Pricing (₹) *
            </label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "10px",
                background: "#F8FAFC",
                padding: "14px",
                borderRadius: "10px",
                border: "1px solid #E2E8F0",
              }}
            >
              {(["adult", "child", "student", "senior", "foreigner"] as const).map((type) => (
                <div key={type}>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "#64748B",
                      textTransform: "capitalize",
                      display: "block",
                      marginBottom: "4px",
                    }}
                  >
                    {type}
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={pricing[type]}
                    onChange={(e) =>
                      setPricing((p) => ({ ...p, [type]: Number(e.target.value) }))
                    }
                    style={{
                      width: "100%",
                      padding: "6px 10px",
                      borderRadius: "6px",
                      border: "1px solid #CBD5E1",
                      fontSize: "13px",
                      fontWeight: 600,
                      fontFamily: typography.fontFamily.sans,
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Image Path Selection */}
          <div>
            <label
              style={{
                display: "block",
                fontFamily: typography.fontFamily.sans,
                fontSize: "13px",
                fontWeight: 700,
                color: "#011B2F",
                marginBottom: "6px",
              }}
            >
              Image Asset
            </label>
            <select
              value={image}
              onChange={(e) => setImage(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "8px",
                border: "1.5px solid rgba(179, 175, 175, 0.51)",
                fontSize: "14px",
                fontFamily: typography.fontFamily.sans,
                outline: "none",
                boxSizing: "border-box",
                background: "#FFFFFF",
              }}
            >
              <option value="/Assets/Attraction/Toy_Train.jpg">Toy Train (/Assets/Attraction/Toy_Train.jpg)</option>
              <option value="/Assets/Attraction/Rope.jpg">Ropeway (/Assets/Attraction/Rope.jpg)</option>
              <option value="/Assets/Attraction/Wax.jpg">Wax Museum (/Assets/Attraction/Wax.jpg)</option>
              <option value="/Assets/Attraction/Biological.jpg">Biological Park (/Assets/Attraction/Biological.jpg)</option>
              <option value="/Assets/Attraction/Mahal.jpg">Sheesh Mahal (/Assets/Attraction/Mahal.jpg)</option>
              <option value="/Assets/Attraction/Fort.jpg">Fort Entry (/Assets/Attraction/Fort.jpg)</option>
            </select>
          </div>

          {/* Seating toggle (for Ride category) */}
          {category === "Ride" && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px" }}>
              <input
                type="checkbox"
                id="hasSeating"
                checked={hasSeating}
                onChange={(e) => setHasSeating(e.target.checked)}
                style={{ width: "16px", height: "16px", cursor: "pointer" }}
              />
              <label htmlFor="hasSeating" style={{ fontSize: "13px", fontWeight: 600, color: "#011B2F", cursor: "pointer" }}>
                Enable Seating Management Button (for Rides)
              </label>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "12px" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "10px 20px",
                borderRadius: "8px",
                border: "1.5px solid rgba(179, 175, 175, 0.51)",
                background: "#FFFFFF",
                color: "#011B2F",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: "10px 24px",
                borderRadius: "8px",
                border: "none",
                background: "#0C2A42",
                color: "#FFFFFF",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(12, 42, 66, 0.25)",
              }}
            >
              {isEditing ? "Save Changes" : "Create Attraction"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
