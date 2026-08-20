"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Upload, Plus, Trash2, X, Check, Armchair, ChevronDown, Search, Loader2 } from "lucide-react";
import { Attraction } from "@/app/(dashboard)/attraction-management/types";
import { confirmDelete } from "@/lib/notify";
import { validateAttractionForm } from "@/app/(dashboard)/attraction-management/schema";
import { SeatConfigData } from "@/app/(dashboard)/seat-management/types";
import { useSeatLayouts } from "@/hooks/useSeatQueries";

// ── Shared required asterisk
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
  numberOfSeats: string;
}

interface AddEditAttractionFormProps {
  attractionToEdit?: Attraction | null;
  onSave: (data: Partial<Attraction>) => void;
  onCancel: () => void;
  /** Called when user checks 'Requires seat allocation' — passes the partially-built attraction */
  onConfigureSeating?: (draft: Partial<Attraction>) => void;
  isSaving?: boolean;
}

// ── Add Visitor Category Modal
function AddVisitorCategoryModal({
  isOpen,
  onClose,
  onAdd,
}: {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (name: string, basePrice: string, image?: string, numberOfSeats?: string) => void;
}) {
  const [catName, setCatName] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [numberOfSeats, setNumberOfSeats] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [imageError, setImageError] = useState(false);
  const [priceErrorMsg, setPriceErrorMsg] = useState("");
  const [seatsErrorMsg, setSeatsErrorMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setCatName("");
      setBasePrice("");
      setNumberOfSeats("");
      setImage(null);
      setError("");
      setImageError(false);
      setPriceErrorMsg("");
      setSeatsErrorMsg("");
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
    if (!numberOfSeats.trim()) newErrors.numberOfSeats = "Number of seats is required.";
    else if (isNaN(Number(numberOfSeats)) || Number(numberOfSeats) <= 0) newErrors.numberOfSeats = "Must be at least 1 seat.";

    if (Object.keys(newErrors).length > 0) {
      setError(newErrors.name || "");
      setPriceErrorMsg(newErrors.basePrice || "");
      setSeatsErrorMsg(newErrors.numberOfSeats || "");
      setImageError(!!newErrors.image);
      return;
    }
    onAdd(catName.trim(), basePrice.trim(), image || "", numberOfSeats.trim());
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

          <div>
            <label style={{ display: "block", fontWeight: 700, fontSize: "12px", color: "#374151", marginBottom: "6px" }}>
              Number of Seats<Req />
            </label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="e.g. 10"
              value={numberOfSeats}
              onChange={(e) => { setNumberOfSeats(e.target.value.replace(/\D/g, "")); setSeatsErrorMsg(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              style={{
                width: "100%", height: "40px", boxSizing: "border-box",
                border: seatsErrorMsg ? "1.5px solid #DC2626" : "1.5px solid rgba(179,175,175,0.51)",
                borderRadius: "8px", padding: "0 14px",
                fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 500, fontSize: "13px",
                color: "#011B2F", outline: "none",
              }}
            />
            {seatsErrorMsg && <span style={{ display: "block", marginTop: "4px", fontSize: "11px", color: "#DC2626" }}>{seatsErrorMsg}</span>}
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
  { id: "adult", name: "Adult", image: "/Assets/Visitors/Adult.jpg", basePrice: "100.00", futurePrice: "00.00", effectiveFrom: "", numberOfSeats: "" },
  { id: "child", name: "Child", image: "/Assets/Visitors/Child.jpg", basePrice: "50.00", futurePrice: "00.00", effectiveFrom: "", numberOfSeats: "" },
  { id: "student", name: "Student", image: "/Assets/Visitors/Student.jpg", basePrice: "60.00", futurePrice: "00.00", effectiveFrom: "", numberOfSeats: "" },
  { id: "foreigner", name: "Foreigner", image: "/Assets/Visitors/Foreigner.jpg", basePrice: "500.00", futurePrice: "00.00", effectiveFrom: "", numberOfSeats: "" },
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
    numberOfSeats: "",
  }));
}

export default function AddEditAttractionForm({
  attractionToEdit,
  onSave,
  onCancel,
  onConfigureSeating,
  isSaving = false,
}: AddEditAttractionFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Ride");
  const [status, setStatus] = useState<"Active" | "Inactive">("Active");
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [isSeatDropdownOpen, setIsSeatDropdownOpen] = useState(false);
  const seatDropdownRef = useRef<HTMLDivElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryItem[]>(DEFAULT_CATEGORIES);
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  // ── Operating hours (display-only, no booking enforcement) 
  const [openTime, setOpenTime] = useState("09:00");
  const [closeTime, setCloseTime] = useState("18:00");

  // ── Fetch active seat layouts from backend API ────────────────────────────
  const { data: seatData, isLoading: isSeatsLoading } = useSeatLayouts();
  const availableSeats: SeatConfigData[] = useMemo(() => {
    if (!seatData?.items || !Array.isArray(seatData.items)) return [];
    return seatData.items
      .map((s) => ({
        id: s.id,
        name: s.name,
        rows: s.rows,
        cols: s.cols,
        hasAisle: s.hasAisle,
        aisleAfterCol: s.aisleAfterCol,
        status: s.status,
        totalSeats: s.totalSeats ?? s.rows * s.cols,
      }))
      .filter((s) => (s.status as string)?.toUpperCase() === "ACTIVE");
  }, [seatData]);

  // ── Close Seat Dropdown on outside click 
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (seatDropdownRef.current && !seatDropdownRef.current.contains(event.target as Node)) {
        setIsSeatDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Helper to normalize status ──────────────────────────────────────────
  const normalizeStatus = (s: string | undefined): "Active" | "Inactive" => {
    if (!s) return "Active";
    return s.toUpperCase() === "INACTIVE" ? "Inactive" : "Active";
  };

  // ── Populate form when editing ──────────────────────────────────────────
  useEffect(() => {
    if (attractionToEdit) {
      setName(attractionToEdit.name || "");
      setDescription(attractionToEdit.description || "");
      setCategory(attractionToEdit.category || "Ride");
      setStatus(normalizeStatus(attractionToEdit.status));
      const assignedIds =
        (attractionToEdit as Attraction & { assignedSeatIds?: string[] }).assignedSeatIds || [];
      setSelectedSeatIds(assignedIds);
      setImagePreview(attractionToEdit.image || null);
      setCategories(pricingToCategories(attractionToEdit));
      // Parse timing string "HH:MM AM/PM - HH:MM AM/PM" back into 24-hour values
      if (attractionToEdit.timing) {
        const parts = attractionToEdit.timing.split(" - ");
        if (parts.length === 2) {
          const to24 = (t: string) => {
            const [time, meridiem] = t.trim().split(" ");
            let [h, m] = time.split(":").map(Number);
            if (meridiem === "PM" && h !== 12) h += 12;
            if (meridiem === "AM" && h === 12) h = 0;
            return `${String(h).padStart(2, "0")}:${String(m ?? 0).padStart(2, "0")}`;
          };
          setOpenTime(to24(parts[0]));
          setCloseTime(to24(parts[1]));
        }
      } else {
        setOpenTime("09:00");
        setCloseTime("18:00");
      }
    } else {
      // Reset for new attraction
      setName("");
      setDescription("");
      setCategory("Ride");
      setStatus("Active");
      setSelectedSeatIds([]);
      setImagePreview(null);
      setCategories(DEFAULT_CATEGORIES);
      setOpenTime("09:00");
      setCloseTime("18:00");
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

  const handleAddCategoryConfirm = (catName: string, basePrice: string, image?: string, numberOfSeats?: string) => {
    setCategories((prev) => [
      ...prev,
      {
        id: `cat_${Date.now()}`,
        name: catName,
        image: image || "/Assets/Visitors/Adult.jpg",
        basePrice: basePrice || "00.00",
        futurePrice: "00.00",
        effectiveFrom: "",
        numberOfSeats: numberOfSeats || "",
      },
    ]);
  };

  const toggleSeatId = (id: string) => {
    setSelectedSeatIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const removeSelectedSeat = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedSeatIds((prev) => prev.filter((s) => s !== id));
  };

  const clearAllSeats = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedSeatIds([]);
  };

  const handleDeleteCategory = async (id: string) => {
    if (categories.length <= 1) return; // silently prevent deleting last one
    const cat = categories.find((c) => c.id === id);
    const confirmed = await confirmDelete(`visitor category "${cat?.name || "this category"}"`);
    if (!confirmed) return;
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // ── Schema-based validation ────────────────────────────────────────
    const validation = validateAttractionForm({
      name: name.trim(),
      description: description.trim(),
      image: imagePreview,
      status,
      hasSeating: selectedSeatIds.length > 0,
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

    const assignedSeatsList = availableSeats.filter((s) => selectedSeatIds.includes(s.id!));
    const assignedSeatNames = assignedSeatsList.map((s) => s.name);

    // Build display-only timing string from the two time inputs
    const to12 = (t: string) => {
      const [hStr, mStr] = t.split(":");
      let h = parseInt(hStr, 10);
      const m = mStr ?? "00";
      const meridiem = h >= 12 ? "PM" : "AM";
      if (h > 12) h -= 12;
      if (h === 0) h = 12;
      return `${String(h).padStart(2, "0")}:${m} ${meridiem}`;
    };
    const timingString = `${to12(openTime)} - ${to12(closeTime)}`;

    onSave({
      name: name.trim(),
      description: description.trim(),
      status,
      hasSeating: selectedSeatIds.length > 0,
      category: category.trim() || "Ride",
      timing: timingString,
      image: imagePreview || "",
      pricing: {
        adult: getPriceByName("adult"),
        child: getPriceByName("child"),
        student: getPriceByName("student"),
        senior: getPriceByName("senior"),
        foreigner: getPriceByName("foreigner"),
      },
      visitorCategories: categories,
      assignedSeatIds: selectedSeatIds,
      assignedSeatNames: assignedSeatNames,
      assignedSeatId: selectedSeatIds[0] || undefined,
      assignedSeatName: assignedSeatNames[0] || undefined,
    } as Partial<Attraction> & { visitorCategories: CategoryItem[]; assignedSeatIds: string[]; assignedSeatNames: string[] });
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

          {/* Attraction Name + Category — side by side row */}
          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", marginBottom: "20px", alignItems: "flex-start" }}>
            {/* Attraction Name */}
            <div style={{ flex: "1 1 200px" }} id="field-name">
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

            {/* Attraction Category */}
            <div style={{ flex: "1 1 160px" }} id="field-category">
              <label style={{ display: "block", fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: "12px", color: "#374151", marginBottom: "7px" }}>
                Category<Req />
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{
                  boxSizing: "border-box",
                  width: "100%",
                  height: "38px",
                  background: "#FFFFFF",
                  border: "1.5px solid rgba(179, 175, 175, 0.51)",
                  borderRadius: "8px",
                  padding: "0 12px",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 500,
                  fontSize: "12px",
                  color: "rgba(55, 65, 81, 0.89)",
                  outline: "none",
                  cursor: "pointer",
                  appearance: "auto",
                }}
              >
                <option value="Ride">Ride</option>
                <option value="Museum">Museum</option>
                <option value="Park">Park</option>
                <option value="Monument">Monument</option>
                <option value="Fort">Fort</option>
                <option value="Show">Show</option>
                <option value="ATTRACTION">Attraction</option>
                {category && !["Ride", "Museum", "Park", "Monument", "Fort", "Show", "ATTRACTION"].includes(category) && (
                  <option value={category}>{category}</option>
                )}
              </select>
            </div>
          </div>

          {/* Operating Hours — display-only, no booking enforcement */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: "12px", color: "#374151", marginBottom: "7px" }}>
              Operating Hours
              <span style={{ marginLeft: "6px", fontFamily: "'Inter', sans-serif", fontWeight: 400, fontSize: "11px", color: "#9CA3AF" }}>
                (display only — does not restrict bookings)
              </span>
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              {/* Open Time */}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 400, fontSize: "11px", color: "#6B7280" }}>Opens at</span>
                <input
                  type="time"
                  id="attraction-open-time"
                  value={openTime}
                  onChange={(e) => setOpenTime(e.target.value)}
                  style={{
                    boxSizing: "border-box",
                    width: "130px",
                    height: "38px",
                    background: "#FFFFFF",
                    border: "1.5px solid rgba(179, 175, 175, 0.51)",
                    borderRadius: "8px",
                    padding: "0 10px",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: 500,
                    fontSize: "12px",
                    color: "#374151",
                    outline: "none",
                    cursor: "pointer",
                  }}
                />
              </div>
              <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, fontSize: "14px", color: "#9CA3AF", marginTop: "18px" }}>—</span>
              {/* Close Time */}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 400, fontSize: "11px", color: "#6B7280" }}>Closes at</span>
                <input
                  type="time"
                  id="attraction-close-time"
                  value={closeTime}
                  onChange={(e) => setCloseTime(e.target.value)}
                  style={{
                    boxSizing: "border-box",
                    width: "130px",
                    height: "38px",
                    background: "#FFFFFF",
                    border: "1.5px solid rgba(179, 175, 175, 0.51)",
                    borderRadius: "8px",
                    padding: "0 10px",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: 500,
                    fontSize: "12px",
                    color: "#374151",
                    outline: "none",
                    cursor: "pointer",
                  }}
                />
              </div>
              {/* Live preview */}
              {openTime && closeTime && (
                <div
                  style={{
                    marginTop: "18px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "#F0F9FF",
                    border: "1px solid #BAE6FD",
                    borderRadius: "6px",
                    padding: "4px 10px",
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2372A5" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: "11px", fontWeight: 600, color: "#0369A1" }}>
                    {(() => {
                      const to12 = (t: string) => {
                        const [hStr, mStr] = t.split(":");
                        let h = parseInt(hStr, 10);
                        const m = mStr ?? "00";
                        const mer = h >= 12 ? "PM" : "AM";
                        if (h > 12) h -= 12;
                        if (h === 0) h = 12;
                        return `${String(h).padStart(2, "0")}:${m} ${mer}`;
                      };
                      return `${to12(openTime)} – ${to12(closeTime)}`;
                    })()}
                  </span>
                </div>
              )}
            </div>
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

          {/* Seat Allocation Section - Multi-select Dropdown */}
          <div style={{ marginTop: "4px" }} ref={seatDropdownRef}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Armchair size={18} color="#0C2A42" />
                <h3 style={{ margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: "16px", color: "#0C2A42" }}>
                  Seat Allocation
                </h3>
              </div>
              {selectedSeatIds.length > 0 && (
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "#059669",
                    background: "#ECFDF5",
                    border: "1px solid #A7F3D0",
                    borderRadius: "12px",
                    padding: "2px 8px",
                  }}
                >
                  {selectedSeatIds.length} Selected
                </span>
              )}
            </div>

            <label style={{ display: "block", fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: "12px", color: "#374151", marginBottom: "6px" }}>
              Select Seat Layouts (Multiple)
            </label>

            {/* Custom Multi-Select Dropdown Container */}
            <div style={{ position: "relative", width: "100%" }}>
              {/* Trigger Input/Box */}
              <div
                onClick={() => setIsSeatDropdownOpen((prev) => !prev)}
                style={{
                  minHeight: "44px",
                  boxSizing: "border-box",
                  width: "100%",
                  background: "#FFFFFF",
                  border: isSeatDropdownOpen ? "1.5px solid #0C2A42" : "1.5px solid rgba(179, 175, 175, 0.51)",
                  borderRadius: "8px",
                  padding: "6px 12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "8px",
                  cursor: "pointer",
                  boxShadow: isSeatDropdownOpen ? "0 0 0 3px rgba(12, 42, 66, 0.12)" : "none",
                  transition: "all 0.18s ease",
                  userSelect: "none",
                }}
              >
                {/* Selected Chips or Placeholder */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center", flex: 1, minWidth: 0 }}>
                  {selectedSeatIds.length === 0 ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#9CA3AF" }}>
                      <Armchair size={15} color="#9CA3AF" />
                      <span style={{ fontSize: "12px", fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 500 }}>
                        {availableSeats.length === 0 ? "No seat layouts available" : "Select seat layout(s)..."}
                      </span>
                    </div>
                  ) : (
                    selectedSeatIds.map((id) => {
                      const seat = availableSeats.find((s) => s.id === id);
                      const name = seat ? seat.name : id;
                      const seatCount = seat ? seat.rows * seat.cols : null;
                      return (
                        <span
                          key={id}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            background: "#EFF6FF",
                            border: "1px solid #BFDBFE",
                            color: "#1E40AF",
                            padding: "3px 8px",
                            borderRadius: "6px",
                            fontSize: "11px",
                            fontWeight: 600,
                            fontFamily: "'Plus Jakarta Sans', sans-serif",
                          }}
                        >
                          <Armchair size={12} color="#1E40AF" />
                          <span>{name}</span>
                          {seatCount !== null && (
                            <span style={{ fontSize: "10px", color: "#3B82F6", fontWeight: 500 }}>
                              ({seatCount}s)
                            </span>
                          )}
                          <span
                            onClick={(e) => removeSelectedSeat(e, id)}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                              marginLeft: "2px",
                              borderRadius: "50%",
                              padding: "1px",
                              color: "#6B7280",
                              transition: "color 0.15s ease",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = "#DC2626")}
                            onMouseLeave={(e) => (e.currentTarget.style.color = "#6B7280")}
                          >
                            <X size={12} strokeWidth={2.5} />
                          </span>
                        </span>
                      );
                    })
                  )}
                </div>

                {/* Right controls: Clear all + Chevron */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                  {selectedSeatIds.length > 0 && (
                    <button
                      type="button"
                      onClick={clearAllSeats}
                      title="Clear all selections"
                      style={{
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        color: "#9CA3AF",
                        padding: "2px",
                        display: "flex",
                        alignItems: "center",
                        fontSize: "11px",
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        fontWeight: 600,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#DC2626")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "#9CA3AF")}
                    >
                      Clear
                    </button>
                  )}
                  <ChevronDown
                    size={16}
                    color="#6B7280"
                    style={{
                      transform: isSeatDropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.2s ease",
                    }}
                  />
                </div>
              </div>

              {/* Popover Dropdown Menu — Seat Data List Alone */}
              {isSeatDropdownOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 6px)",
                    left: 0,
                    right: 0,
                    zIndex: 200,
                    background: "#FFFFFF",
                    borderRadius: "10px",
                    border: "1.5px solid #E2E8F0",
                    boxShadow: "0 14px 35px rgba(12, 42, 66, 0.16)",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Options List */}
                  <div style={{ maxHeight: "220px", overflowY: "auto", padding: "6px" }}>
                    {isSeatsLoading ? (
                      <div style={{ padding: "24px 14px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                        <Loader2 size={22} color="#2372A5" style={{ animation: "spin 1s linear infinite" }} />
                        <span style={{ fontSize: "12px", fontFamily: "'Plus Jakarta Sans', sans-serif", color: "#64748B", fontWeight: 500 }}>
                          Loading seat layouts...
                        </span>
                      </div>
                    ) : availableSeats.length === 0 ? (
                      <div style={{ padding: "20px 14px", textAlign: "center" }}>
                        <Armchair size={22} color="#9CA3AF" style={{ margin: "0 auto 6px auto", display: "block" }} />
                        <p style={{ margin: "0 0 4px 0", fontSize: "12px", fontWeight: 700, color: "#374151" }}>
                          No seat layouts created
                        </p>
                        <p style={{ margin: 0, fontSize: "11px", color: "#9CA3AF" }}>
                          Please create a layout in Seat Management first.
                        </p>
                      </div>
                    ) : (
                      availableSeats.map((seat) => {
                        const isSelected = selectedSeatIds.includes(seat.id!);
                        return (
                          <div
                            key={seat.id}
                            onClick={() => toggleSeatId(seat.id!)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                              padding: "8px 10px",
                              borderRadius: "6px",
                              cursor: "pointer",
                              transition: "all 0.15s ease",
                              background: isSelected ? "#EFF6FF" : "transparent",
                              marginBottom: "2px",
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) e.currentTarget.style.background = "#F8FAFC";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = isSelected ? "#EFF6FF" : "transparent";
                            }}
                          >
                            {/* Checkbox */}
                            <div
                              style={{
                                width: "18px",
                                height: "18px",
                                borderRadius: "4px",
                                border: `2px solid ${isSelected ? "#0C2A42" : "#CBD5E1"}`,
                                background: isSelected ? "#0C2A42" : "#FFFFFF",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                                transition: "all 0.15s ease",
                              }}
                            >
                              {isSelected && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                            </div>

                            <Armchair size={15} color={isSelected ? "#0C2A42" : "#9CA3AF"} style={{ flexShrink: 0 }} />

                            {/* Label & Details */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                                <span
                                  style={{
                                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                                    fontWeight: isSelected ? 700 : 600,
                                    fontSize: "12px",
                                    color: isSelected ? "#0C2A42" : "#1E293B",
                                  }}
                                >
                                  {seat.name}
                                </span>
                                {seat.hasAisle && (
                                  <span
                                    style={{
                                      fontSize: "9px",
                                      fontWeight: 700,
                                      color: "#059669",
                                      background: "#ECFDF5",
                                      padding: "1px 5px",
                                      borderRadius: "4px",
                                    }}
                                  >
                                    Aisle
                                  </span>
                                )}
                              </div>
                              <p style={{ margin: "2px 0 0 0", fontSize: "11px", color: "#64748B" }}>
                                {seat.rows}R × {seat.cols}C &nbsp;•&nbsp; {seat.rows * seat.cols} seats
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Selected Layouts Summary */}
            {selectedSeatIds.length > 0 && (
              <div
                style={{
                  marginTop: "8px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 10px",
                  background: "#F0FDF4",
                  border: "1px solid #BBF7D0",
                  borderRadius: "6px",
                }}
              >
                <Check size={14} color="#16A34A" strokeWidth={2.5} />
                <span
                  style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: 600,
                    fontSize: "11px",
                    color: "#15803D",
                  }}
                >
                  {selectedSeatIds.length} seat layout{selectedSeatIds.length > 1 ? "s" : ""} allocated ({availableSeats.filter((s) => selectedSeatIds.includes(s.id!)).reduce((sum, s) => sum + s.rows * s.cols, 0)} total seats capacity)
                </span>
              </div>
            )}
          </div>
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

              {/* Number of Seats (Required) */}
              <div style={{ width: "100%", textAlign: "center" }}>
                <span style={{ display: "block", fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, fontSize: "10px", color: "#011B2F", marginBottom: "4px" }}>
                  No. of Seats<span style={{ color: "#DC2626" }}>*</span>
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g. 10"
                  value={cat.numberOfSeats}
                  onChange={(e) => handleCategoryChange(cat.id, "numberOfSeats", e.target.value.replace(/\D/g, ""))}
                  style={{
                    boxSizing: "border-box",
                    width: "144px",
                    height: "24px",
                    background: cat.numberOfSeats ? "#F0FDF4" : "#FFF7ED",
                    border: cat.numberOfSeats
                      ? "1.5px solid #10B981"
                      : "1.5px solid #FCA5A5",
                    borderRadius: "4px",
                    textAlign: "center",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: 700,
                    fontSize: "10px",
                    color: "#011B2F",
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
          disabled={isSaving}
          style={{
            boxSizing: "border-box",
            minWidth: "153px",
            height: "48px",
            background: isSaving ? "#E5E7EB" : "#F4BC43",
            borderRadius: "8px",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            cursor: isSaving ? "not-allowed" : "pointer",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 700,
            fontSize: "14px",
            color: isSaving ? "#6B7280" : "#011B2F",
            boxShadow: isSaving ? "none" : "0 4px 12px rgba(244, 188, 67, 0.3)",
            transition: "all 0.18s ease",
          }}
          className="btn-form-save"
        >
          {isSaving ? (
            <>
              <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
              <span>{attractionToEdit ? "Saving..." : "Adding..."}</span>
            </>
          ) : (
            <span>{attractionToEdit ? "Save" : "Add"}</span>
          )}
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
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
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
