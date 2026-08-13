"use client";

import React, { useState, useEffect, useRef } from "react";
import { Upload, Plus, Trash2, X } from "lucide-react";
import { Attraction } from "@/types/admin";
import { confirmDelete } from "@/lib/notify";
import { validateAttractionForm } from "@/app/(dashboard)/attraction-management/schema";

// ── Shared required asterisk ─────────────────────────────────────────────────
const Req = () => <span style={{ color: "#DC2626", marginLeft: "2px" }}>*</span>;

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
  /** Called when user checks 'Requires seat allocation' — passes the partially-built attraction */
  onConfigureSeating?: (draft: Partial<Attraction>) => void;
}

// ── Add Visitor Category Modal ──────────────────────────────────────────────
function AddVisitorCategoryModal({
  isOpen,
  onClose,
  onAdd,
}: {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (name: string, basePrice: string, image?: string) => void;
}) {
  const [catName, setCatName] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [imageError, setImageError] = useState(false);
  const [priceErrorMsg, setPriceErrorMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setCatName("");
      setBasePrice("");
      setImage(null);
      setError("");
      setImageError(false);
      setPriceErrorMsg("");
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImage(ev.target?.result as string);
      setImageError(false);
    };
    reader.readAsDataURL(file);
  };

  const handleAdd = () => {
    const newErrors: Record<string, string> = {};
    if (!image) newErrors.image = "Category image is required.";
    if (!catName.trim()) newErrors.name = "Category name is required.";
    else if (catName.trim().length < 2) newErrors.name = "Name must be at least 2 characters.";
    if (!basePrice.trim()) newErrors.basePrice = "Base price is required.";
    else if (isNaN(Number(basePrice)) || Number(basePrice) < 0) newErrors.basePrice = "Base price must be a non-negative number.";

    if (Object.keys(newErrors).length > 0) {
      setError(newErrors.name || "");
      setPriceErrorMsg(newErrors.basePrice || "");
      setImageError(!!newErrors.image);
      return;
    }
    onAdd(catName.trim(), basePrice.trim(), image || "");
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0,
        backgroundColor: "rgba(1, 27, 47, 0.55)",
        backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1100, padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#FFFFFF", borderRadius: "14px",
          width: "100%", maxWidth: "440px",
          boxShadow: "0 20px 50px rgba(0,0,0,0.18)",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ background: "#011B2F", padding: "16px 22px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Plus size={20} color="#F4BC43" />
            <span style={{ fontWeight: 700, fontSize: "16px", color: "#FFFFFF" }}>Add Visitor Category</span>
          </div>
          <button type="button" onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#FFFFFF", display: "flex" }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "24px 22px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Category Image Upload */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "72px",
                height: "72px",
                borderRadius: "50%",
                overflow: "hidden",
                border: imageError ? "2px dashed #DC2626" : "2px dashed #2372A5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: imageError ? "#FEF2F2" : "#F8FAFC",
                position: "relative",
              }}
            >
              {image ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={image} alt="Category preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <Upload size={24} color={imageError ? "#DC2626" : "#2372A5"} />
              )}
            </div>
            <label
              htmlFor="modal-cat-img-upload"
              style={{
                boxSizing: "border-box",
                padding: "4px 12px",
                background: "#FFFFFF",
                border: imageError ? "1.5px dashed #DC2626" : "1.5px dashed #2372A5",
                borderRadius: "6px",
                cursor: "pointer",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 600,
                fontSize: "11px",
                color: imageError ? "#DC2626" : "#2372A5",
              }}
            >
              {image ? "Change Image" : "Upload Category Image"}
            </label>
            <input
              id="modal-cat-img-upload"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              style={{ display: "none" }}
            />
            {imageError && !error && <span style={{ fontSize: "11px", color: "#DC2626" }}>Category image is required.</span>}
          </div>

          <div>
            <label style={{ display: "block", fontWeight: 700, fontSize: "12px", color: "#374151", marginBottom: "6px" }}>
              Category Name<Req />
            </label>
            <input
              ref={inputRef}
              type="text"
              placeholder="e.g. Senior Citizen"
              value={catName}
              onChange={(e) => { setCatName(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              style={{
                width: "100%", height: "40px", boxSizing: "border-box",
                border: error ? "1.5px solid #DC2626" : "1.5px solid rgba(179,175,175,0.51)",
                borderRadius: "8px", padding: "0 14px",
                fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 500, fontSize: "13px",
                color: "#011B2F", outline: "none",
              }}
            />
            {error && <span style={{ display: "block", marginTop: "4px", fontSize: "11px", color: "#DC2626" }}>{error}</span>}
          </div>

          <div>
            <label style={{ display: "block", fontWeight: 700, fontSize: "12px", color: "#374151", marginBottom: "6px" }}>
              Base Price (₹)<Req />
            </label>
            <input
              type="text"
              placeholder="e.g. 150.00"
              value={basePrice}
              onChange={(e) => { setBasePrice(e.target.value.replace(/[^0-9.]/g, "")); setPriceErrorMsg(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              style={{
                width: "100%", height: "40px", boxSizing: "border-box",
                border: priceErrorMsg ? "1.5px solid #DC2626" : "1.5px solid rgba(179,175,175,0.51)",
                borderRadius: "8px", padding: "0 14px",
                fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 500, fontSize: "13px",
                color: "#011B2F", outline: "none",
              }}
            />
            {priceErrorMsg && <span style={{ display: "block", marginTop: "4px", fontSize: "11px", color: "#DC2626" }}>{priceErrorMsg}</span>}
          </div>

          {/* Footer buttons */}
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "4px" }}>
            <button
              type="button" onClick={onClose}
              style={{
                height: "40px", padding: "0 20px",
                background: "#FFFFFF", border: "1.5px solid rgba(179,175,175,0.51)",
                borderRadius: "8px", cursor: "pointer",
                fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, fontSize: "13px", color: "#011B2F",
              }}
            >
              Cancel
            </button>
            <button
              type="button" onClick={handleAdd}
              style={{
                height: "40px", padding: "0 24px",
                background: "#F4BC43", border: "none",
                borderRadius: "8px", cursor: "pointer",
                fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: "13px", color: "#011B2F",
                boxShadow: "0 4px 12px rgba(244,188,67,0.3)",
              }}
            >
              Add Category
            </button>
          </div>
        </div>
      </div>
    </div>
  );
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
  onConfigureSeating,
}: AddEditAttractionFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"Active" | "Inactive">("Active");
  const [requiresSeating, setRequiresSeating] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryItem[]>(DEFAULT_CATEGORIES);
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

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
    setIsAddCategoryModalOpen(true);
  };

  const handleAddCategoryConfirm = (catName: string, basePrice: string, image?: string) => {
    setCategories((prev) => [
      ...prev,
      {
        id: `cat_${Date.now()}`,
        name: catName,
        image: image || "/Assets/Visitors/Adult.jpg",
        basePrice: basePrice || "00.00",
        futurePrice: "00.00",
        effectiveFrom: "",
      },
    ]);
  };

  const handleDeleteCategory = async (id: string) => {
    if (categories.length <= 1) return; // silently prevent deleting last one
    const cat = categories.find((c) => c.id === id);
    const confirmed = await confirmDelete(`visitor category "${cat?.name || "this category"}"`); 
    if (!confirmed) return;
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  // When seat allocation is toggled on — optionally open SeatLayoutConfigPage
  const handleSeatingToggle = () => {
    const next = !requiresSeating;
    setRequiresSeating(next);
    if (next && onConfigureSeating) {
      onConfigureSeating({
        name: name.trim() || "New Attraction",
        description,
        status,
        hasSeating: true,
        category: "Ride",
        timing: "09:00 AM - 06:00 PM",
        image: imagePreview || "",
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // ── Schema-based validation ────────────────────────────────────────
    const validation = validateAttractionForm({
      name: name.trim(),
      description: description.trim(),
      image: imagePreview,
      status,
      hasSeating: requiresSeating,
    });

    if (!validation.success) {
      setFormErrors(validation.errors);
      // Scroll to first error
      const firstField = Object.keys(validation.errors)[0];
      document.getElementById(`field-${firstField}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setFormErrors({});

    const getPriceByName = (n: string) => {
      const cat = categories.find((c) => c.name.toLowerCase() === n.toLowerCase());
      return cat ? parseFloat(cat.basePrice) || 0 : 0;
    };

    onSave({
      name: name.trim(),
      description: description.trim(),
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
          <div style={{ marginBottom: "20px" }} id="field-name">
            <label style={{ display: "block", fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: "12px", color: "#374151", marginBottom: "7px" }}>
              Attraction Name<Req />
            </label>
            <input
              type="text"
              placeholder="e.g. toy train"
              value={name}
              onChange={(e) => { setName(e.target.value); setFormErrors((p) => ({ ...p, name: "" })); }}
              style={{
                boxSizing: "border-box",
                width: "100%",
                maxWidth: "313px",
                height: "38px",
                background: "#FFFFFF",
                border: formErrors.name ? "1.5px solid #DC2626" : "1.5px solid rgba(179, 175, 175, 0.51)",
                borderRadius: "8px",
                padding: "0 15px",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 500,
                fontSize: "12px",
                color: "rgba(55, 65, 81, 0.89)",
                outline: "none",
              }}
            />
            {formErrors.name && <span style={{ display: "block", marginTop: "4px", fontSize: "11px", color: "#DC2626" }}>{formErrors.name}</span>}
          </div>

          {/* Description + Attraction Image Row */}
          <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", alignItems: "flex-start" }}>
            {/* Description */}
            <div style={{ flex: "1 1 260px" }} id="field-description">
              <label style={{ display: "block", fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: "12px", color: "#374151", marginBottom: "7px" }}>
                Description<Req />
              </label>
              <div style={{ position: "relative", maxWidth: "313px" }}>
                <textarea
                  placeholder="Enter attraction description......"
                  maxLength={500}
                  value={description}
                  onChange={(e) => { setDescription(e.target.value); setFormErrors((p) => ({ ...p, description: "" })); }}
                  style={{
                    boxSizing: "border-box",
                    width: "100%",
                    height: "176px",
                    background: "#FFFFFF",
                    border: formErrors.description ? "1.5px solid #DC2626" : "1.5px solid rgba(179, 175, 175, 0.51)",
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
              {formErrors.description && <span style={{ display: "block", marginTop: "4px", fontSize: "11px", color: "#DC2626" }}>{formErrors.description}</span>}
            </div>

            {/* Attraction Image Dropzone */}
            <div style={{ flex: "1 1 260px" }} id="field-image">
              <label style={{ display: "block", fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: "12px", color: "#374151", marginBottom: "7px" }}>
                Attraction image<Req />
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
              {formErrors.image && <span style={{ display: "block", marginTop: "4px", fontSize: "11px", color: "#DC2626" }}>{formErrors.image}</span>}
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
            Attraction Status<Req />
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
            onClick={handleSeatingToggle}
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
          {attractionToEdit ? "Save" : "Add"}
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

      {/* Add Visitor Category Modal */}
      <AddVisitorCategoryModal
        isOpen={isAddCategoryModalOpen}
        onClose={() => setIsAddCategoryModalOpen(false)}
        onAdd={handleAddCategoryConfirm}
      />
    </form>
  );
}
