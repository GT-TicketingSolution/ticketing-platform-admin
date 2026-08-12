"use client";

import React, { useState, useEffect } from "react";
import { Upload, Plus, Trash2 } from "lucide-react";
import { Attraction } from "@/types/admin";

// ── Visitor category type 
export interface CategoryItem {
  id: string;
  name: string;
  /** local public path or data-URL from user upload */
  image: string;
  basePrice: string;
  futurePrice: string;
  effectiveFrom: string;
}

interface AddEditAttractionFormProps {
  attractionToEdit?: Attraction | null;
  onSave: (data: Partial<Attraction>) => void;
  onCancel: () => void;
}

// ── Default categories using local /Assets/Visitors/ images 
const DEFAULT_CATEGORIES: CategoryItem[] = [
  {
    id: "adult",
    name: "Adult",
    image: "/Assets/Visitors/Adult.jpg",
    basePrice: "100.00",
    futurePrice: "00.00",
    effectiveFrom: "",
  },
  {
    id: "child",
    name: "Child",
    image: "/Assets/Visitors/Child.jpg",
    basePrice: "50.00",
    futurePrice: "00.00",
    effectiveFrom: "",
  },
  {
    id: "student",
    name: "Student",
    image: "/Assets/Visitors/Student.jpg",
    basePrice: "60.00",
    futurePrice: "00.00",
    effectiveFrom: "",
  },
  {
    id: "foreigner",
    name: "Foreigner",
    image: "/Assets/Visitors/Foreigner.jpg",
    basePrice: "500.00",
    futurePrice: "00.00",
    effectiveFrom: "",
  },
];

// ── Helper: derive category list from an existing Attraction's pricing ─────
function pricingToCategories(attraction: Attraction): CategoryItem[] {
  const base = [
    { id: "adult", name: "Adult", image: "/Assets/Visitors/Adult.jpg", price: attraction.pricing.adult },
    { id: "child", name: "Child", image: "/Assets/Visitors/Child.jpg", price: attraction.pricing.child },
    { id: "student", name: "Student", image: "/Assets/Visitors/Student.jpg", price: attraction.pricing.student },
    { id: "foreigner", name: "Foreigner", image: "/Assets/Visitors/Foreigner.jpg", price: attraction.pricing.foreigner },
  ];
  return base.map((c) => ({
    id: c.id,
    name: c.name,
    image: c.image,
    basePrice: String(c.price ?? "00.00"),
    futurePrice: "00.00",
    effectiveFrom: "",
  }));
}

export default function AddEditAttractionForm({
  attractionToEdit,
  onSave,
  onCancel,
}: AddEditAttractionFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"Active" | "Inactive">("Active");
  const [requiresSeating, setRequiresSeating] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryItem[]>(DEFAULT_CATEGORIES);

  // ── Populate form when editing ──────────────────────────────────────────
  useEffect(() => {
    if (attractionToEdit) {
      setName(attractionToEdit.name || "");
      setDescription(attractionToEdit.description || "");
      setStatus(attractionToEdit.status || "Active");
      setRequiresSeating(attractionToEdit.hasSeating ?? false);
      setImagePreview(attractionToEdit.image || null);
      setCategories(pricingToCategories(attractionToEdit));
    } else {
      // Reset for new attraction
      setName("");
      setDescription("");
      setStatus("Active");
      setRequiresSeating(false);
      setImagePreview(null);
      setCategories(DEFAULT_CATEGORIES);
    }
  }, [attractionToEdit]);

  // ── Handlers ───────────────────────────────────────────────────────────
  const handleAttractionImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleCategoryImageUpload = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCategories((prev) =>
        prev.map((c) => (c.id === id ? { ...c, image: ev.target?.result as string } : c))
      );
    };
    reader.readAsDataURL(file);
  };

  const handleCategoryChange = (id: string, field: keyof CategoryItem, value: string) => {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  };

  const handleAddCategory = () => {
    const namePrompt = prompt("Enter new category name (e.g. Senior Citizen):");
    if (!namePrompt?.trim()) return;
    setCategories((prev) => [
      ...prev,
      {
        id: `cat_${Date.now()}`,
        name: namePrompt.trim(),
        image: "/Assets/Visitors/Adult.jpg",
        basePrice: "00.00",
        futurePrice: "00.00",
        effectiveFrom: "",
      },
    ]);
  };

  const handleDeleteCategory = (id: string) => {
    if (categories.length <= 1) {
      alert("At least one visitor category is required.");
      return;
    }
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const getPriceByName = (n: string) => {
      const cat = categories.find((c) => c.name.toLowerCase() === n.toLowerCase());
      return cat ? parseFloat(cat.basePrice) || 0 : 0;
    };

    onSave({
      name: name.trim() || "New Attraction",
      description,
      status,
      hasSeating: requiresSeating,
      category: "Ride",
      timing: "09:00 AM - 06:00 PM",
      image: imagePreview || "",
      pricing: {
        adult: getPriceByName("adult"),
        child: getPriceByName("child"),
        student: getPriceByName("student"),
        senior: getPriceByName("senior"),
        foreigner: getPriceByName("foreigner"),
      },
      // Store categories for future use
      visitorCategories: categories,
    } as Partial<Attraction> & { visitorCategories: CategoryItem[] });
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <form
      onSubmit={handleSubmit}
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      {/* ── Top Row: Basic Info + Status ─────────────────────────────── */}
      <div style={{ display: "flex", gap: "32px", width: "100%", flexWrap: "wrap" }}>
        {/* Rectangle 171: Basic Information Box */}
        <div
          style={{
            boxSizing: "border-box",
            flex: "1 1 600px",
            minHeight: "373px",
            background: "#FFFFFF",
            border: "0.5px solid rgba(0, 0, 0, 0.43)",
            boxShadow: "0px 4px 11.9px -6px rgba(0, 0, 0, 0.32)",
            borderRadius: "15px",
            padding: "24px 31px",
            display: "flex",
            flexDirection: "column",
          }}
          className="card-basic-info"
        >
          <h3 style={{ margin: "0 0 20px 0", fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: "18px", color: "#0C2A42" }}>
            Basic Information
          </h3>

          {/* Attraction Name */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: "12px", color: "#374151", marginBottom: "7px" }}>
              Attraction Name*
            </label>
            <input
              type="text"
              required
              placeholder="e.g. toy train"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                boxSizing: "border-box",
                width: "100%",
                maxWidth: "313px",
                height: "38px",
                background: "#FFFFFF",
                border: "1.5px solid rgba(179, 175, 175, 0.51)",
                borderRadius: "8px",
                padding: "0 15px",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 500,
                fontSize: "12px",
                color: "rgba(55, 65, 81, 0.89)",
                outline: "none",
              }}
            />
          </div>

          {/* Description + Attraction Image Row */}
          <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", alignItems: "flex-start" }}>
            {/* Description */}
            <div style={{ flex: "1 1 260px" }}>
              <label style={{ display: "block", fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: "12px", color: "#374151", marginBottom: "7px" }}>
                Description*
              </label>
              <div style={{ position: "relative", maxWidth: "313px" }}>
                <textarea
                  placeholder="Enter attraction description......"
                  maxLength={500}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{
                    boxSizing: "border-box",
                    width: "100%",
                    height: "176px",
                    background: "#FFFFFF",
                    border: "1.5px solid rgba(179, 175, 175, 0.51)",
                    borderRadius: "8px",
                    padding: "12px 15px 28px 15px",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: 500,
                    fontSize: "12px",
                    color: "rgba(55, 65, 81, 0.89)",
                    outline: "none",
                    resize: "none",
                  }}
                />
                <span
                  style={{
                    position: "absolute",
                    right: "12px",
                    bottom: "10px",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: 500,
                    fontSize: "10px",
                    color: "rgba(107, 114, 128, 0.68)",
                  }}
                >
                  {description.length}/500
                </span>
              </div>
            </div>

            {/* Attraction Image Dropzone */}
            <div style={{ flex: "1 1 260px" }}>
              <label style={{ display: "block", fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: "12px", color: "#374151", marginBottom: "7px" }}>
                Attraction image*
              </label>
              <div
                style={{
                  boxSizing: "border-box",
                  width: "100%",
                  maxWidth: "313px",
                  height: "176px",
                  background: "#FFFFFF",
                  border: "1.5px solid rgba(179, 175, 175, 0.51)",
                  borderRadius: "8px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "12px",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {imagePreview ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imagePreview}
                      alt="Preview"
                      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                    />
                    <label
                      htmlFor="attraction-image-upload"
                      style={{
                        position: "absolute",
                        bottom: "8px",
                        right: "8px",
                        background: "rgba(12,42,66,0.85)",
                        color: "#FFFFFF",
                        fontSize: "10px",
                        padding: "4px 8px",
                        borderRadius: "4px",
                        cursor: "pointer",
                        zIndex: 2,
                      }}
                    >
                      Change
                    </label>
                  </>
                ) : (
                  <>
                    <Upload size={24} color="#2372A5" strokeWidth={1.8} />
                    <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 500, fontSize: "10px", color: "#011B2F", marginTop: "8px" }}>
                      Drag & Drop Image here
                    </span>
                    <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 500, fontSize: "10px", color: "#011B2F", margin: "2px 0 6px 0" }}>
                      or
                    </span>
                    <label
                      htmlFor="attraction-image-upload"
                      style={{
                        boxSizing: "border-box",
                        width: "88px",
                        height: "28px",
                        border: "2px solid #2372A5",
                        borderRadius: "8px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        fontWeight: 500,
                        fontSize: "10px",
                        color: "#2372A5",
                        background: "transparent",
                      }}
                    >
                      Browse File
                    </label>
                    <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 500, fontSize: "10px", color: "rgba(107,114,128,0.68)", marginTop: "8px" }}>
                      JPG, PNG or WEBP (Max. 5MB)
                    </span>
                  </>
                )}
                <input
                  id="attraction-image-upload"
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleAttractionImageUpload}
                  style={{ display: "none" }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Rectangle 172: Status & Seat Allocation Box */}
        <div
          style={{
            boxSizing: "border-box",
            flex: "1 1 300px",
            minHeight: "373px",
            background: "#FFFFFF",
            border: "0.5px solid rgba(0, 0, 0, 0.43)",
            boxShadow: "0px 4px 11.9px -6px rgba(0, 0, 0, 0.32)",
            borderRadius: "15px",
            padding: "24px 28px",
            display: "flex",
            flexDirection: "column",
          }}
          className="card-status-seating"
        >
          {/* Status Section */}
          <h3 style={{ margin: "0 0 16px 0", fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: "18px", color: "#0C2A42" }}>
            Status
          </h3>
          <label style={{ display: "block", fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: "12px", color: "#374151", marginBottom: "10px" }}>
            Attraction Status*
          </label>

          {/* Active / Inactive toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "40px" }}>
            {(["Active", "Inactive"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                style={{
                  boxSizing: "border-box",
                  width: "120px",
                  height: "38px",
                  background: "#FFFFFF",
                  border: status === s ? "1.5px solid #011B2F" : "1.5px solid rgba(179, 175, 175, 0.51)",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  cursor: "pointer",
                  transition: "all 0.18s ease",
                }}
              >
                <div
                  style={{
                    width: "12px",
                    height: "12px",
                    borderRadius: "50%",
                    background: status === s ? "#173F63" : "transparent",
                    border: status === s ? "1px solid #173F63" : "1px solid #A0A0A0",
                  }}
                />
                <span
                  style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: 700,
                    fontSize: "14px",
                    color: status === s ? "#0C2A42" : "#A0A0A0",
                  }}
                >
                  {s}
                </span>
              </button>
            ))}
          </div>

          {/* Seat Allocation Section */}
          <h3 style={{ margin: "0 0 16px 0", fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: "18px", color: "#0C2A42" }}>
            Seat Allocation
          </h3>
          <label
            onClick={() => setRequiresSeating((p) => !p)}
            style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", userSelect: "none" }}
          >
            <div
              style={{
                width: "20px",
                height: "20px",
                borderRadius: "4px",
                background: requiresSeating ? "#0C2A42" : "#FFFFFF",
                border: requiresSeating ? "1px solid #0C2A42" : "1.5px solid rgba(179,175,175,0.8)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {requiresSeating && (
                <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                  <path d="M1 5L4.5 8.5L11 1.5" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: "14px", letterSpacing: "0.02em", color: "#374151" }}>
              Requires seat allocation
            </span>
          </label>
        </div>
      </div>

      {/* ── Rectangle 205: Visitor Categories & Pricing ──────────────── */}
      <div
        style={{
          boxSizing: "border-box",
          width: "100%",
          minHeight: "447px",
          background: "#FFFFFF",
          border: "0.5px solid rgba(0, 0, 0, 0.43)",
          boxShadow: "0px 4px 11.9px -6px rgba(0, 0, 0, 0.32)",
          borderRadius: "15px",
          padding: "24px 31px",
          display: "flex",
          flexDirection: "column",
        }}
        className="card-categories-pricing"
      >
        <h3 style={{ margin: "0 0 24px 0", fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: "18px", color: "#0C2A42" }}>
          Visitor Categories & Pricing
        </h3>

        {/* Scrollable cards row */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "20px", overflowX: "auto", paddingBottom: "12px" }}>
          {categories.map((cat) => (
            <div
              key={cat.id}
              style={{
                boxSizing: "border-box",
                width: "176px",
                flexShrink: 0,
                background: "#FFFFFF",
                border: "1.5px solid rgba(179, 175, 175, 0.51)",
                borderRadius: "4px",
                padding: "12px 10px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "10px",
              }}
            >
              {/* Category Name */}
              <span
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 700,
                  fontSize: "14px",
                  letterSpacing: "0.07em",
                  color: "#011B2F",
                  textAlign: "center",
                }}
              >
                {cat.name}
              </span>

              {/* Avatar Circle - uses local /Assets/Visitors/ images */}
              <div
                style={{
                  width: "69px",
                  height: "69px",
                  borderRadius: "50%",
                  overflow: "hidden",
                  border: "1px solid #E2E8F0",
                  flexShrink: 0,
                  position: "relative",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cat.image}
                  alt={cat.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>

              {/* Upload Image Button */}
              <label
                htmlFor={`cat-img-${cat.id}`}
                style={{
                  boxSizing: "border-box",
                  width: "143px",
                  height: "25px",
                  background: "#FFFFFF",
                  border: "1.5px dashed #2372A5",
                  borderRadius: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 500,
                  fontSize: "10px",
                  color: "#2372A5",
                }}
              >
                Upload Image
              </label>
              <input
                id={`cat-img-${cat.id}`}
                type="file"
                accept="image/*"
                onChange={(e) => handleCategoryImageUpload(cat.id, e)}
                style={{ display: "none" }}
              />

              {/* Base Price */}
              <div style={{ width: "100%", textAlign: "center" }}>
                <span style={{ display: "block", fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 500, fontSize: "10px", color: "#011B2F", marginBottom: "4px" }}>
                  Base Price (₹)*
                </span>
                <input
                  type="text"
                  value={cat.basePrice}
                  onChange={(e) => handleCategoryChange(cat.id, "basePrice", e.target.value.replace(/[^0-9.]/g, ""))}
                  style={{
                    boxSizing: "border-box",
                    width: "144px",
                    height: "21px",
                    background: "#FFFFFF",
                    border: "1.5px solid rgba(179, 175, 175, 0.51)",
                    borderRadius: "4px",
                    textAlign: "center",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: 500,
                    fontSize: "9px",
                    color: "rgba(55, 65, 81, 0.84)",
                    outline: "none",
                  }}
                />
              </div>

              {/* Future Price */}
              <div style={{ width: "100%", textAlign: "center" }}>
                <span style={{ display: "block", fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 500, fontSize: "10px", color: "#011B2F", marginBottom: "4px" }}>
                  Future Price (₹)
                </span>
                <input
                  type="text"
                  value={cat.futurePrice}
                  onChange={(e) => handleCategoryChange(cat.id, "futurePrice", e.target.value.replace(/[^0-9.]/g, ""))}
                  style={{
                    boxSizing: "border-box",
                    width: "144px",
                    height: "21px",
                    background: "#FFFFFF",
                    border: "1.5px solid rgba(179, 175, 175, 0.51)",
                    borderRadius: "4px",
                    textAlign: "center",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: 500,
                    fontSize: "9px",
                    color: "rgba(55, 65, 81, 0.84)",
                    outline: "none",
                  }}
                />
              </div>

              {/* Effective From */}
              <div style={{ width: "100%", textAlign: "center" }}>
                <span style={{ display: "block", fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 500, fontSize: "10px", color: "#011B2F", marginBottom: "4px" }}>
                  Effective From
                </span>
                <input
                  type="text"
                  placeholder="Select Date"
                  value={cat.effectiveFrom}
                  onFocus={(e) => { e.target.type = "date"; }}
                  onBlur={(e) => { if (!e.target.value) e.target.type = "text"; }}
                  onChange={(e) => handleCategoryChange(cat.id, "effectiveFrom", e.target.value)}
                  style={{
                    boxSizing: "border-box",
                    width: "144px",
                    height: "21px",
                    background: "#FFFFFF",
                    border: "1.5px solid rgba(179, 175, 175, 0.51)",
                    borderRadius: "4px",
                    textAlign: "center",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: 500,
                    fontSize: "9px",
                    color: "rgba(55, 65, 81, 0.84)",
                    outline: "none",
                  }}
                />
              </div>

              {/* Delete button */}
              <button
                type="button"
                onClick={() => handleDeleteCategory(cat.id)}
                style={{
                  boxSizing: "border-box",
                  width: "144px",
                  height: "31px",
                  background: "#FFFFFF",
                  border: "1px solid #DC2626",
                  borderRadius: "6px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  cursor: "pointer",
                  transition: "all 0.18s ease",
                }}
              >
                <Trash2 size={13} color="#DC2626" />
                <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 500, fontSize: "12px", color: "#DC2626" }}>
                  Delete
                </span>
              </button>
            </div>
          ))}

          {/* + Add Visitor Category dashed card */}
          <button
            type="button"
            onClick={handleAddCategory}
            style={{
              boxSizing: "border-box",
              width: "176px",
              minHeight: "356px",
              background: "#FFFFFF",
              border: "1.5px dashed #2372A5",
              borderRadius: "4px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "14px",
              cursor: "pointer",
              flexShrink: 0,
              transition: "all 0.18s ease",
            }}
            className="btn-add-category-card"
          >
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "50%",
                border: "2px solid #2372A5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Plus size={24} color="#2372A5" strokeWidth={2.5} />
            </div>
            <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, fontSize: "12px", textAlign: "center", letterSpacing: "0.02em", color: "#173F63" }}>
              Add Visitor Category
            </span>
          </button>
        </div>
      </div>

      {/* ── Form Action Bar ────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", marginTop: "12px" }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            boxSizing: "border-box",
            width: "124px",
            height: "48px",
            background: "#FFFFFF",
            border: "0.5px solid #002A45",
            borderRadius: "4px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 700,
            fontSize: "14px",
            color: "#011B2F",
            transition: "all 0.18s ease",
          }}
          className="btn-form-cancel"
        >
          Cancel
        </button>

        <button
          type="submit"
          style={{
            boxSizing: "border-box",
            width: "153px",
            height: "48px",
            background: "#F4BC43",
            borderRadius: "8px",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 700,
            fontSize: "14px",
            color: "#011B2F",
            boxShadow: "0 4px 12px rgba(244, 188, 67, 0.3)",
            transition: "all 0.18s ease",
          }}
          className="btn-form-save"
        >
          Save
        </button>
      </div>

      <style>{`
        .btn-add-category-card:hover { background: #F0F7FF !important; transform: translateY(-2px); }
        .btn-form-cancel:hover { background: #F8FAFC !important; }
        .btn-form-save:hover { background: #E5AC32 !important; transform: translateY(-1px); }
        @media (max-width: 768px) {
          .card-basic-info, .card-status-seating, .card-categories-pricing {
            padding: 16px !important;
            border-radius: 12px !important;
          }
        }
      `}</style>
    </form>
  );
}
