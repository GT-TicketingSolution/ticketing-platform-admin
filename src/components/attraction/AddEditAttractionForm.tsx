"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Upload, Plus, Trash2, X, Check, Armchair, ChevronDown, ChevronUp, Search, Loader2, GripVertical, Power } from "lucide-react";
import { Attraction } from "@/app/(dashboard)/attraction-management/types";
import { confirmDelete } from "@/lib/notify";
import { validateAttractionForm } from "@/app/(dashboard)/attraction-management/schema";
import { SeatConfigData } from "@/app/(dashboard)/seat-management/types";
import { useSeatLayouts } from "@/hooks/useSeatQueries";
import { useAttractionManagementList } from "@/hooks/useAttractionManagementQueries";

// ── Shared required asterisk
const Req = () => <span style={{ color: "#DC2626", marginLeft: "2px" }}>*</span>;

// ── Allocated seat item for dynamic sequence, reordering, and disable toggle
export interface AllocatedSeatItem {
  instanceId: string;
  layoutId: string;
  isDisabled?: boolean;
  suffix?: string;
}

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
  existingCategories = [],
}: {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (name: string, basePrice: string, image?: string, numberOfSeats?: string) => void;
  existingCategories?: string[];
}) {
  const [catName, setCatName] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [numberOfSeats, setNumberOfSeats] = useState("1");
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [priceErrorMsg, setPriceErrorMsg] = useState("");
  const [seatsErrorMsg, setSeatsErrorMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setCatName("");
      setBasePrice("");
      setNumberOfSeats("1");
      setImage(null);
      setError("");
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
    };
    reader.readAsDataURL(file);
  };

  const handleAdd = () => {
    const newErrors: Record<string, string> = {};
    const trimmedName = catName.trim();
    if (!trimmedName) {
      newErrors.name = "Category name is required.";
    } else if (trimmedName.length < 2) {
      newErrors.name = "Name must be at least 2 characters.";
    } else if (
      existingCategories.some(
        (existingName) => existingName.trim().toLowerCase() === trimmedName.toLowerCase()
      )
    ) {
      newErrors.name = "A visitor category with this name already exists.";
    }

    if (!basePrice.trim()) newErrors.basePrice = "Base price is required.";
    else if (isNaN(Number(basePrice)) || Number(basePrice) < 0) newErrors.basePrice = "Base price must be a non-negative number.";
    if (!numberOfSeats.trim()) newErrors.numberOfSeats = "Number of seats is required.";
    else if (isNaN(Number(numberOfSeats)) || Number(numberOfSeats) <= 0) newErrors.numberOfSeats = "Must be at least 1 seat.";

    if (Object.keys(newErrors).length > 0) {
      setError(newErrors.name || "");
      setPriceErrorMsg(newErrors.basePrice || "");
      setSeatsErrorMsg(newErrors.numberOfSeats || "");
      return;
    }
    onAdd(trimmedName, basePrice.trim(), image || "", numberOfSeats.trim());
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
                background: "#F8FAFC",
                border: "1.5px dashed #2372A5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {image ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={image} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <Upload size={22} color="#2372A5" />
              )}
            </div>
            <label
              htmlFor="cat-modal-img"
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "#2372A5",
                cursor: "pointer",
                padding: "2px 8px",
                border: "1px solid #2372A5",
                borderRadius: "4px",
              }}
            >
              {image ? "Change Image" : "Upload Image"}
            </label>
            <input id="cat-modal-img" type="file" accept="image/*" onChange={handleImageChange} style={{ display: "none" }} />
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
  { id: "adult", name: "Adult", image: "/Assets/Visitors/Adult.jpg", basePrice: "100.00", futurePrice: "00.00", effectiveFrom: "", numberOfSeats: "1" },
  { id: "child", name: "Child", image: "/Assets/Visitors/Child.jpg", basePrice: "50.00", futurePrice: "00.00", effectiveFrom: "", numberOfSeats: "1" },
  { id: "student", name: "Student", image: "/Assets/Visitors/Student.jpg", basePrice: "60.00", futurePrice: "00.00", effectiveFrom: "", numberOfSeats: "1" },
  { id: "senior", name: "Senior", image: "/Assets/Visitors/Senior.jpg", basePrice: "75.00", futurePrice: "00.00", effectiveFrom: "", numberOfSeats: "1" },
  { id: "foreigner", name: "Foreigner", image: "/Assets/Visitors/Foreigner.jpg", basePrice: "500.00", futurePrice: "00.00", effectiveFrom: "", numberOfSeats: "1" },
];

// ── Helper: derive category list from an existing Attraction's pricing ─────
function pricingToCategories(attraction: Attraction): CategoryItem[] {
  const pricing = attraction?.pricing || ({} as any);
  const seating = (attraction as any)?.seating || ({} as any);
  const base = [
    { id: "adult", name: "Adult", image: "/Assets/Visitors/Adult.jpg", price: pricing.adult, seats: seating.adult },
    { id: "child", name: "Child", image: "/Assets/Visitors/Child.jpg", price: pricing.child, seats: seating.child },
    { id: "student", name: "Student", image: "/Assets/Visitors/Student.jpg", price: pricing.student, seats: seating.student },
    { id: "senior", name: "Senior", image: "/Assets/Visitors/Senior.jpg", price: pricing.senior, seats: seating.senior },
    { id: "foreigner", name: "Foreigner", image: "/Assets/Visitors/Foreigner.jpg", price: pricing.foreigner, seats: seating.foreigner },
  ];
  return base.map((c) => ({
    id: c.id,
    name: c.name,
    image: c.image,
    basePrice: String(c.price != null ? c.price : "00.00"),
    futurePrice: "00.00",
    effectiveFrom: "",
    numberOfSeats:
      c.seats != null && Number(c.seats) >= 1 ? String(Number(c.seats)) : "1",
  }));
}

export default function AddEditAttractionForm({
  attractionToEdit,
  onSave,
  onCancel,
  onConfigureSeating,
  isSaving = false,
}: AddEditAttractionFormProps) {
  // ── Castle Sketch Illustration Component ──────────────────────────────────────
  function CastleIllustration({ width = 105, height = 64 }: { width?: number | string; height?: number | string }) {
    return (
      <svg
        width={width}
        height={height}
        viewBox="0 0 120 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ overflow: "visible" }}
      >
        {/* Birds */}
        <path d="M20 20 C23 17 26 20 29 17 C32 20 35 17 38 20" stroke="#1E4D74" strokeWidth="1.2" strokeLinecap="round" fill="none" />
        <path d="M74 13 C76 10 78 13 80 10 C82 13 84 10 86 13" stroke="#1E4D74" strokeWidth="1.2" strokeLinecap="round" fill="none" />
        {/* Cloud */}
        <path d="M78 28 C78 25 82 23 85 25 C88 22 93 23 96 26 C99 26 102 28 101 32 C99 33 80 33 78 28 Z" stroke="#1E4D74" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        {/* Hill base contours */}
        <path d="M5 76 C20 73 35 67 55 63 C75 59 95 65 115 76" stroke="#1E4D74" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M15 77 C30 70 50 65 65 64" stroke="#1E4D74" strokeWidth="1.1" strokeLinecap="round" />
        <path d="M72 64 C85 67 100 72 108 77" stroke="#1E4D74" strokeWidth="1.1" strokeLinecap="round" />
        <path d="M48 67 C55 66 62 66 70 68" stroke="#1E4D74" strokeWidth="1.1" strokeLinecap="round" />
        {/* Left Tower Outer */}
        <path d="M26 68 L26 49 L29 49 L29 51 L31 51 L31 49 L33 49 L33 51 L35 51 L35 49 L38 49 L38 67" stroke="#1E4D74" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="29.5" y="55" width="2" height="3.5" rx="1" fill="#1E4D74" />
        {/* Left Inner Wall */}
        <path d="M38 63 L44 63 L44 43 L47 43 L47 45 L49 45 L49 43 L52 43 L52 45 L54 45 L54 43 L57 43 L57 60" stroke="#1E4D74" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="47" y="49" width="2" height="4" rx="1" fill="#1E4D74" />
        <rect x="52" y="49" width="2" height="4" rx="1" fill="#1E4D74" />
        {/* Main Center Tower */}
        <path d="M57 60 L57 32 L55 32 L55 30 L67 30 L67 32 L65 32 L65 60" stroke="#1E4D74" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M61 30 L61 17 L68 20.5 L61 24" stroke="#1E4D74" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="59.5" y="36" width="3" height="5" rx="1.5" fill="#1E4D74" />
        <path d="M59 54 Q61 50 63 54 L63 60 L59 60 Z" stroke="#1E4D74" strokeWidth="1.3" fill="#1E4D74" fillOpacity="0.15" />
        {/* Right Inner Wall */}
        <path d="M65 60 L65 43 L68 43 L68 45 L70 45 L70 43 L73 43 L73 45 L75 45 L75 43 L78 43 L78 63 L84 63" stroke="#1E4D74" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="68" y="49" width="2" height="4" rx="1" fill="#1E4D74" />
        <rect x="73" y="49" width="2" height="4" rx="1" fill="#1E4D74" />
        {/* Right Tower Outer */}
        <path d="M84 67 L84 49 L87 49 L87 51 L89 51 L89 49 L91 49 L91 51 L93 51 L93 49 L96 49 L96 68" stroke="#1E4D74" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="89" y="55" width="2" height="3.5" rx="1" fill="#1E4D74" />
      </svg>
    );
  }

  const [durationValue, setDurationValue] = useState("");
  const [durationUnit, setDurationUnit] = useState<"minutes" | "hours">("minutes");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState<"Active" | "Inactive">("Active");
  const [allocatedSeats, setAllocatedSeats] = useState<AllocatedSeatItem[]>([]);
  const [isSeatDropdownOpen, setIsSeatDropdownOpen] = useState(false);
  const [seatSearchQuery, setSeatSearchQuery] = useState("");
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const seatDropdownRef = useRef<HTMLDivElement>(null);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryItem[]>(DEFAULT_CATEGORIES);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  // ── Operating hours (display-only, no booking enforcement) 
  const [openTime, setOpenTime] = useState("09:00");
  const [closeTime, setCloseTime] = useState("18:00");

  // ── Fetch active attractions to extract categories purely from backend ───
  const { data: attractionManagementData = [] } = useAttractionManagementList();
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    if (Array.isArray(attractionManagementData)) {
      attractionManagementData.forEach((item) => {
        if (item.category && typeof item.category === "string" && item.category.trim()) {
          set.add(item.category.trim());
        }
      });
    }
    return Array.from(set);
  }, [attractionManagementData]);

  const filteredCategories = useMemo(() => {
    const q = category.trim().toLowerCase();
    if (!q) return availableCategories;
    return availableCategories.filter((c) => c.toLowerCase().includes(q));
  }, [availableCategories, category]);

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

  const filteredAvailableSeats = useMemo(() => {
    const q = seatSearchQuery.trim().toLowerCase();
    if (!q) return availableSeats;
    return availableSeats.filter((s) => s.name.toLowerCase().includes(q));
  }, [availableSeats, seatSearchQuery]);

  // ── Decorated allocated seats: maintain fixed suffix on instances (Garo - A, Garo - B) even when reordered
  const decoratedAllocatedSeats = useMemo(() => {
    const totalCounts: Record<string, number> = {};
    allocatedSeats.forEach((item) => {
      totalCounts[item.layoutId] = (totalCounts[item.layoutId] || 0) + 1;
    });

    return allocatedSeats.map((item, index) => {
      const seat = availableSeats.find((s) => s.id === item.layoutId);
      const baseName = seat ? seat.name : "Seat Layout";
      const totalForThisLayout = totalCounts[item.layoutId] || 0;

      // Use the instance's own assigned suffix, or fallback if multiple exist
      let suffix = item.suffix || "";
      if (!suffix && totalForThisLayout > 1) {
        suffix = ` - ${String.fromCharCode(65 + (index % 26))}`;
      } else if (totalForThisLayout <= 1) {
        suffix = "";
      }

      return {
        ...item,
        index,
        seat,
        baseName,
        suffix,
        displayName: `${baseName}${suffix}`,
        capacity: seat ? seat.rows * seat.cols : 0,
        rows: seat?.rows ?? 0,
        cols: seat?.cols ?? 0,
        hasAisle: !!seat?.hasAisle,
      };
    });
  }, [allocatedSeats, availableSeats]);

  // ── Close Seat & Category Dropdowns on outside click 
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (seatDropdownRef.current && !seatDropdownRef.current.contains(event.target as Node)) {
        setIsSeatDropdownOpen(false);
      }
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setIsCategoryDropdownOpen(false);
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

  // ── Populate form when editing 
  useEffect(() => {
    if (attractionToEdit) {
      setName(attractionToEdit.name || "");
      setDescription(attractionToEdit.description || "");
      setCategory(attractionToEdit.category || "");
      setStatus(normalizeStatus(attractionToEdit.status));

      const rawLayoutIds: string[] =
        (Array.isArray((attractionToEdit as any).seatLayoutIds) &&
          (attractionToEdit as any).seatLayoutIds.length > 0
          ? (attractionToEdit as any).seatLayoutIds
          : null) ||
        (attractionToEdit as any).assignedSeatIds ||
        ((attractionToEdit as any).seatLayouts &&
          Array.isArray((attractionToEdit as any).seatLayouts) &&
          (attractionToEdit as any).seatLayouts.length > 0
          ? (attractionToEdit as any).seatLayouts.flatMap((l: any) => {
            const qty = Math.max(1, Number(l.quantity) || 1);
            return Array.from({ length: qty }, () => l.id);
          })
          : null) ||
        ((attractionToEdit as any).seatLayoutId
          ? [(attractionToEdit as any).seatLayoutId]
          : []) ||
        [];

      const existingAllocations: any[] = (attractionToEdit as any).seatAllocations;
      if (Array.isArray(existingAllocations) && existingAllocations.length > 0) {
        setAllocatedSeats(
          existingAllocations.map((a, idx) => ({
            instanceId: a.instanceId || `seat_${idx}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            layoutId: a.layoutId || a.id,
            isDisabled: !!a.isDisabled,
            suffix: a.suffix || (existingAllocations.filter((x: any) => (x.layoutId || x.id) === (a.layoutId || a.id)).length > 1 ? ` - ${String.fromCharCode(65 + (idx % 26))}` : ""),
          }))
        );
      } else {
        const counts: Record<string, number> = {};
        rawLayoutIds.forEach((id) => (counts[id] = (counts[id] || 0) + 1));
        const currentOccs: Record<string, number> = {};

        setAllocatedSeats(
          rawLayoutIds.map((id, idx) => {
            let suf = "";
            if (counts[id] > 1) {
              const occ = currentOccs[id] || 0;
              currentOccs[id] = occ + 1;
              suf = ` - ${String.fromCharCode(65 + (occ % 26))}`;
            }
            return {
              instanceId: `seat_${idx}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              layoutId: id,
              isDisabled: false,
              suffix: suf,
            };
          })
        );
      }

      setImagePreview(attractionToEdit.image || null);
      setCategories(pricingToCategories(attractionToEdit));
      // Parse existing duration string (e.g. "20min / trip" or "1hr / trip") back to value + unit
      const rawDur: string = (attractionToEdit as any).duration || ((attractionToEdit as any).durationMins ? `${(attractionToEdit as any).durationMins}min / trip` : "");
      const hrMatch = rawDur.match(/(\d+(?:\.\d+)?)\s*hr/);
      const minMatch = rawDur.match(/(\d+(?:\.\d+)?)\s*min/);
      if (hrMatch) { setDurationValue(hrMatch[1]); setDurationUnit("hours"); }
      else if (minMatch) { setDurationValue(minMatch[1]); setDurationUnit("minutes"); }
      else { setDurationValue(rawDur.replace(/[^\d.]/g, "") || ""); setDurationUnit("minutes"); }

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
      setCategory("");
      setStatus("Active");
      setAllocatedSeats([]);
      setImagePreview(null);
      setCategories(DEFAULT_CATEGORIES);
      setOpenTime("09:00");
      setCloseTime("18:00");
      setDurationValue("");
      setDurationUnit("minutes");
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
        numberOfSeats: numberOfSeats && Number(numberOfSeats) >= 1 ? numberOfSeats : "1",
      },
    ]);
  };

  // Seat allocation actions
  const addSeatLayout = (layoutId: string) => {
    // Find all existing items of this layoutId to find next available letter
    const existingWithSameLayout = allocatedSeats.filter((s) => s.layoutId === layoutId);
    const usedLetters = new Set(
      existingWithSameLayout
        .map((s) => s.suffix?.replace(/[^A-Z]/g, ""))
        .filter(Boolean)
    );

    let nextLetter = "A";
    for (let i = 0; i < 26; i++) {
      const char = String.fromCharCode(65 + i);
      if (!usedLetters.has(char)) {
        nextLetter = char;
        break;
      }
    }

    const newInstance: AllocatedSeatItem = {
      instanceId: `seat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      layoutId,
      isDisabled: false,
      suffix: ` - ${nextLetter}`,
    };

    setAllocatedSeats((prev) => {
      // Ensure the first item also has "- A" if this is the 2nd item added
      return [...prev, newInstance].map((item) => {
        if (item.layoutId === layoutId && !item.suffix) {
          return { ...item, suffix: " - A" };
        }
        return item;
      });
    });

    setFormErrors((prev) => {
      if (!prev.seatAllocation) return prev;
      const next = { ...prev };
      delete next.seatAllocation;
      return next;
    });
  };

  const toggleSeatDisabled = (instanceId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setAllocatedSeats((prev) =>
      prev.map((s) => (s.instanceId === instanceId ? { ...s, isDisabled: !s.isDisabled } : s))
    );
  };

  const removeAllocatedSeat = async (instanceId: string, displayName?: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const item = decoratedAllocatedSeats.find((s) => s.instanceId === instanceId);
    const label = displayName || item?.displayName || "this seat layout";
    const confirmed = await confirmDelete(`seat allocation "${label}"`);
    if (!confirmed) return;
    setAllocatedSeats((prev) => prev.filter((s) => s.instanceId !== instanceId));
  };

  const clearAllSeats = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = await confirmDelete("all allocated seat layouts");
    if (!confirmed) return;
    setAllocatedSeats([]);
  };

  const moveSeat = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= allocatedSeats.length || fromIndex === toIndex) return;
    setAllocatedSeats((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const moveSeatUp = (index: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    moveSeat(index, index - 1);
  };

  const moveSeatDown = (index: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    moveSeat(index, index + 1);
  };

  // Drag-and-drop grab handlers for real-time suffix update
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", `${index}`);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    const sourceIndex = draggedIndex !== null ? draggedIndex : Number(e.dataTransfer.getData("text/plain"));
    if (!isNaN(sourceIndex) && sourceIndex !== targetIndex && sourceIndex >= 0 && sourceIndex < allocatedSeats.length) {
      setAllocatedSeats((prev) => {
        const next = [...prev];
        const [moved] = next.splice(sourceIndex, 1);
        next.splice(targetIndex, 0, moved);
        return next;
      });
    }

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDeleteCategory = async (id: string) => {
    if (categories.length <= 1) return; // silently prevent deleting last one
    const cat = categories.find((c) => c.id === id);
    const confirmed = await confirmDelete(`visitor category "${cat?.name || "this category"}"`);
    if (!confirmed) return;
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  const handleAddCategory = () => {
    setIsAddCategoryModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const activeAllocated = decoratedAllocatedSeats.filter((s) => !s.isDisabled);

    // ── Schema-based validation ────────────────────────────────────────
    const validation = validateAttractionForm({
      name: name.trim(),
      category: category.trim(),
      description: description.trim(),
      image: imagePreview,
      status,
      hasSeating: activeAllocated.length > 0,
    });

    const seatErrors: Record<string, string> = {};

    if (allocatedSeats.length === 0) {
      seatErrors.seatAllocation =
        "Seat allocation is required. Select at least one seat layout.";
    } else if (activeAllocated.length === 0) {
      seatErrors.seatAllocation =
        "All allocated seat layouts are disabled. Please enable at least one.";
    }

    for (const cat of categories) {
      const raw = (cat.numberOfSeats || "").trim();
      if (!raw) {
        seatErrors[`seats-${cat.id}`] = "No. of seats is required.";
      } else if (isNaN(Number(raw)) || !Number.isInteger(Number(raw)) || Number(raw) < 1) {
        seatErrors[`seats-${cat.id}`] = "Must be a whole number of at least 1.";
      }
    }

    if (!validation.success || Object.keys(seatErrors).length > 0) {
      setFormErrors({ ...validation.errors, ...seatErrors });
      const firstField =
        Object.keys(validation.errors)[0] || Object.keys(seatErrors)[0];
      document
        .getElementById(`field-${firstField}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setFormErrors({});

    const getPriceByName = (n: string) => {
      const cat = categories.find((c) => c.name.toLowerCase() === n.toLowerCase());
      return cat ? parseFloat(cat.basePrice) || 0 : 0;
    };

    const getSeatsByName = (n: string) => {
      const cat = categories.find((c) => c.name.toLowerCase() === n.toLowerCase());
      const parsed = cat ? parseInt(cat.numberOfSeats, 10) : NaN;
      return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1;
    };

    const activeLayoutIds = activeAllocated.map((s) => s.layoutId);
    const assignedSeatNames = activeAllocated.map((s) => s.displayName);

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
      hasSeating: true,
      category: category.trim(),
      timing: timingString,
      image: imagePreview || "",
      pricing: {
        adult: getPriceByName("adult"),
        child: getPriceByName("child"),
        student: getPriceByName("student"),
        senior: getPriceByName("senior"),
        foreigner: getPriceByName("foreigner"),
      },
      seating: {
        adult: getSeatsByName("adult"),
        child: getSeatsByName("child"),
        student: getSeatsByName("student"),
        senior: getSeatsByName("senior"),
        foreigner: getSeatsByName("foreigner"),
      },
      adultSeats: getSeatsByName("adult"),
      childSeats: getSeatsByName("child"),
      studentSeats: getSeatsByName("student"),
      seniorSeats: getSeatsByName("senior"),
      foreignerSeats: getSeatsByName("foreigner"),
      visitorCategories: categories,
      assignedSeatIds: activeLayoutIds,
      seatLayoutIds: activeLayoutIds,
      assignedSeatNames: assignedSeatNames,
      assignedSeatId: activeLayoutIds[0] || undefined,
      assignedSeatName: assignedSeatNames[0] || undefined,
      seatAllocations: decoratedAllocatedSeats.map((s) => ({
        instanceId: s.instanceId,
        layoutId: s.layoutId,
        displayName: s.displayName,
        baseName: s.baseName,
        suffix: s.suffix,
        isDisabled: !!s.isDisabled,
      })),
      baseRate: calculatedBaseRate !== "—" ? calculatedBaseRate : (minCategoryPrice > 0 ? `₹${minCategoryPrice} / person` : "₹0 / person"),
      minPrice: minCategoryPrice,
      duration: durationValue.trim() ? Number(durationValue.trim()) : null,
      durationUnit: durationUnit,
      formattedDuration: effectiveDuration,
    } as any);
  };

  // Base Rate is automatically calculated as minimum price across categories
  const minCategoryPrice = useMemo(() => {
    const prices = categories
      .map((c) => parseFloat(c.basePrice) || 0)
      .filter((p) => p > 0);
    if (!prices.length) return 0;
    return Math.min(...prices);
  }, [categories]);

  const calculatedBaseRate = useMemo(() => {
    if (minCategoryPrice <= 0) return "—";
    return `₹${minCategoryPrice} / person`;
  }, [minCategoryPrice]);

  const effectiveDuration = durationValue.trim()
    ? durationUnit === "hours"
      ? `${durationValue.trim()} hr / trip`
      : `${durationValue.trim()} min / trip`
    : "—";

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

            {/* Attraction Category - Typable & Dropdown Select */}
            <div style={{ flex: "1 1 160px", position: "relative" }} id="field-category" ref={categoryDropdownRef}>
              <label style={{ display: "block", fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: "12px", color: "#374151", marginBottom: "7px" }}>
                Category<Req />
              </label>
              <div style={{ position: "relative", width: "100%" }}>
                <input
                  type="text"
                  placeholder="Type or select category..."
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setIsCategoryDropdownOpen(true);
                  }}
                  onFocus={() => setIsCategoryDropdownOpen(true)}
                  style={{
                    boxSizing: "border-box",
                    width: "100%",
                    height: "38px",
                    background: "#FFFFFF",
                    border: "1.5px solid rgba(179, 175, 175, 0.51)",
                    borderRadius: "8px",
                    padding: "0 34px 0 12px",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: 500,
                    fontSize: "12px",
                    color: "rgba(55, 65, 81, 0.89)",
                    outline: "none",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setIsCategoryDropdownOpen((prev) => !prev)}
                  tabIndex={-1}
                  style={{
                    position: "absolute",
                    right: "8px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#6B7280",
                  }}
                >
                  <ChevronDown
                    size={16}
                    style={{
                      transform: isCategoryDropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.2s ease",
                    }}
                  />
                </button>

                {/* Dropdown Menu */}
                {isCategoryDropdownOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 4px)",
                      left: 0,
                      right: 0,
                      zIndex: 250,
                      background: "#FFFFFF",
                      borderRadius: "8px",
                      border: "1.5px solid rgba(179, 175, 175, 0.51)",
                      boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                      maxHeight: "180px",
                      overflowY: "auto",
                    }}
                  >
                    {filteredCategories.length > 0 ? (
                      filteredCategories.map((c) => (
                        <div
                          key={c}
                          onClick={() => {
                            setCategory(c);
                            setIsCategoryDropdownOpen(false);
                            setFormErrors((p) => ({ ...p, category: "" }));
                          }}
                          style={{
                            padding: "8px 14px",
                            fontFamily: "'Plus Jakarta Sans', sans-serif",
                            fontSize: "12px",
                            fontWeight: 500,
                            color: "#011B2F",
                            cursor: "pointer",
                            background: category.toLowerCase() === c.toLowerCase() ? "#F0F7FF" : "#FFFFFF",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "#F8FAFC")}
                          onMouseLeave={(e) =>
                          (e.currentTarget.style.background =
                            category.toLowerCase() === c.toLowerCase() ? "#F0F7FF" : "#FFFFFF")
                          }
                        >
                          <span>{c}</span>
                          {category.toLowerCase() === c.toLowerCase() && (
                            <Check size={14} color="#2372A5" />
                          )}
                        </div>
                      ))
                    ) : (
                      <div
                        style={{
                          padding: "10px 14px",
                          fontFamily: "'Plus Jakarta Sans', sans-serif",
                          fontSize: "12px",
                          color: "#6B7280",
                        }}
                      >
                        No categories found. Type to use custom category.
                      </div>
                    )}
                  </div>
                )}
              </div>
              {formErrors.category && (
                <span style={{ display: "block", marginTop: "4px", fontSize: "11px", color: "#DC2626" }}>
                  {formErrors.category}
                </span>
              )}
            </div>
          </div>

          {/* ── Operating Hours (Display only) ── */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: "12px", color: "#374151", marginBottom: "7px" }}>
              Operating Hours (Display only)
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              {/* Open time */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "11px", fontFamily: "'Plus Jakarta Sans', sans-serif", color: "#6B7280", fontWeight: 500 }}>
                  Open:
                </span>
                <input
                  type="time"
                  value={openTime}
                  onChange={(e) => setOpenTime(e.target.value)}
                  style={{
                    boxSizing: "border-box",
                    height: "38px",
                    background: "#FFFFFF",
                    border: "1.5px solid rgba(179, 175, 175, 0.51)",
                    borderRadius: "8px",
                    padding: "0 10px",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: 500,
                    fontSize: "12px",
                    color: "rgba(55, 65, 81, 0.89)",
                    outline: "none",
                  }}
                />
              </div>

              <span style={{ color: "#9CA3AF", fontSize: "14px" }}>—</span>

              {/* Close time */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "11px", fontFamily: "'Plus Jakarta Sans', sans-serif", color: "#6B7280", fontWeight: 500 }}>
                  Close:
                </span>
                <input
                  type="time"
                  value={closeTime}
                  onChange={(e) => setCloseTime(e.target.value)}
                  style={{
                    boxSizing: "border-box",
                    height: "38px",
                    background: "#FFFFFF",
                    border: "1.5px solid rgba(179, 175, 175, 0.51)",
                    borderRadius: "8px",
                    padding: "0 10px",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: 500,
                    fontSize: "12px",
                    color: "rgba(55, 65, 81, 0.89)",
                    outline: "none",
                  }}
                />
              </div>

              {/* Formatted preview pill */}
              {openTime && closeTime && (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "4px 10px",
                    background: "#EFF6FF",
                    border: "1px solid #BFDBFE",
                    borderRadius: "20px",
                    marginLeft: "4px",
                  }}
                >
                  <span style={{ fontSize: "11px", fontWeight: 600, color: "#1D4ED8", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {(() => {
                      const to12 = (t: string) => {
                        const [hStr, mStr] = t.split(":");
                        let h = parseInt(hStr, 10);
                        const m = mStr ?? "00";
                        const meridiem = h >= 12 ? "PM" : "AM";
                        if (h > 12) h -= 12;
                        if (h === 0) h = 12;
                        return `${h}:${m} ${meridiem}`;
                      };
                      return `${to12(openTime)} – ${to12(closeTime)}`;
                    })()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ── Average Trip Duration ── */}
          <div style={{ marginBottom: "20px" }} id="field-duration">
            <label style={{ display: "block", fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: "12px", color: "#374151", marginBottom: "4px" }}>
              Average Trip Duration
            </label>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <input
                type="number"
                min="1"
                placeholder="e.g. 20"
                value={durationValue}
                onChange={(e) => setDurationValue(e.target.value)}
                style={{
                  boxSizing: "border-box",
                  flex: 0.3,
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
              <select
                value={durationUnit}
                onChange={(e) => setDurationUnit(e.target.value as "minutes" | "hours")}
                style={{
                  boxSizing: "border-box",
                  width: "110px",
                  height: "38px",
                  background: "#FFFFFF",
                  border: "1.5px solid rgba(179, 175, 175, 0.51)",
                  borderRadius: "8px",
                  padding: "0 10px",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 600,
                  fontSize: "12px",
                  color: "#374151",
                  cursor: "pointer",
                  outline: "none",
                  appearance: "auto",
                }}
              >
                <option value="minutes">Minutes</option>
                <option value="hours">Hours</option>
              </select>
            </div>
            {durationValue.trim() && (
              <p style={{ margin: "5px 0 0 0", fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 500, fontSize: "10.5px", color: "#6B7280" }}>
                Preview: <strong style={{ color: "#173F63" }}>{effectiveDuration}</strong>
              </p>
            )}
          </div>

          {/* Description + Attraction Image Row */}
          <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", alignItems: "flex-start" }}>
            {/* Description */}
            <div style={{ flex: "1 1 260px" }} id="field-description">
              <label style={{ display: "block", fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: "12px", color: "#374151", marginBottom: "7px" }}>
                Description
                <span style={{ marginLeft: "4px", fontWeight: 400, fontSize: "11px", color: "#9CA3AF" }}>(Optional)</span>
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
            <div style={{ flex: "1 1 260px" }} id="field-image">
              <label style={{ display: "block", fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: "12px", color: "#374151", marginBottom: "7px" }}>
                Attraction image
                <span style={{ marginLeft: "4px", fontWeight: 400, fontSize: "11px", color: "#9CA3AF" }}>(Optional)</span>
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
                    <div style={{ position: "absolute", bottom: "8px", right: "8px", display: "flex", gap: "6px", zIndex: 2 }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setImagePreview(null);
                        }}
                        style={{
                          background: "rgba(220, 38, 38, 0.85)",
                          color: "#FFFFFF",
                          fontSize: "10px",
                          fontWeight: 600,
                          padding: "4px 8px",
                          borderRadius: "4px",
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        Remove
                      </button>
                      <label
                        htmlFor="attraction-image-upload"
                        style={{
                          background: "rgba(12,42,66,0.85)",
                          color: "#FFFFFF",
                          fontSize: "10px",
                          fontWeight: 600,
                          padding: "4px 8px",
                          borderRadius: "4px",
                          cursor: "pointer",
                        }}
                      >
                        Change
                      </label>
                    </div>
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
            flex: "1 1 340px",
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
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "22px" }}>
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

          {/* ── Seat Allocation Section ── */}
          <div style={{ marginTop: "0px", display: "flex", flexDirection: "column", flex: 1 }} id="field-seatAllocation">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Armchair size={18} color="#0C2A42" />
                <h3 style={{ margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: "16px", color: "#0C2A42" }}>
                  Seat Allocation<Req />
                </h3>
              </div>
              {allocatedSeats.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
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
                    {decoratedAllocatedSeats.filter((s) => !s.isDisabled).length} Active
                  </span>
                  {decoratedAllocatedSeats.some((s) => s.isDisabled) && (
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        color: "#6B7280",
                        background: "#F3F4F6",
                        border: "1px solid #E5E7EB",
                        borderRadius: "12px",
                        padding: "2px 8px",
                      }}
                    >
                      {decoratedAllocatedSeats.filter((s) => s.isDisabled).length} Disabled
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* 1. First Dropdown: Select Seat Layouts */}
            <div style={{ marginBottom: "12px" }} ref={seatDropdownRef}>
              <label style={{ display: "block", fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: "12px", color: "#374151", marginBottom: "6px" }}>
                Select Seat Layout (Dropdown)<Req />
              </label>

              <div style={{ position: "relative", width: "100%" }}>
                {/* Trigger */}
                <div
                  onClick={() => setIsSeatDropdownOpen((prev) => !prev)}
                  style={{
                    minHeight: "38px",
                    boxSizing: "border-box",
                    width: "100%",
                    background: "#FFFFFF",
                    border: formErrors.seatAllocation
                      ? "1.5px solid #DC2626"
                      : isSeatDropdownOpen
                        ? "1.5px solid #0C2A42"
                        : "1.5px solid rgba(179, 175, 175, 0.51)",
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
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#4B5563" }}>
                    <Armchair size={15} color="#2372A5" />
                    <span style={{ fontSize: "12px", fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 500 }}>
                      {availableSeats.length === 0 ? "No seat layouts available" : "Click to select seat layout..."}
                    </span>
                  </div>
                  <ChevronDown
                    size={16}
                    color="#6B7280"
                    style={{
                      transform: isSeatDropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.2s ease",
                    }}
                  />
                </div>

                {/* Dropdown Menu with Vertical Scroll */}
                {isSeatDropdownOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 6px)",
                      left: 0,
                      right: 0,
                      zIndex: 300,
                      background: "#FFFFFF",
                      borderRadius: "10px",
                      border: "1.5px solid #E2E8F0",
                      boxShadow: "0 14px 35px rgba(12, 42, 66, 0.18)",
                      overflow: "hidden",
                      display: "flex",
                      flexDirection: "column",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Search box inside dropdown */}
                    <div style={{ padding: "8px", borderBottom: "1px solid #F1F5F9" }}>
                      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                        <Search size={14} color="#9CA3AF" style={{ position: "absolute", left: "10px" }} />
                        <input
                          type="text"
                          placeholder="Search seat layouts..."
                          value={seatSearchQuery}
                          onChange={(e) => setSeatSearchQuery(e.target.value)}
                          style={{
                            width: "100%",
                            height: "32px",
                            padding: "0 10px 0 30px",
                            borderRadius: "6px",
                            border: "1px solid #E2E8F0",
                            fontSize: "12px",
                            fontFamily: "'Plus Jakarta Sans', sans-serif",
                            outline: "none",
                          }}
                        />
                      </div>
                    </div>

                    {/* Scrollable Layouts List */}
                    <div style={{ maxHeight: "200px", overflowY: "auto", padding: "6px" }} className="seat-scroll-container">
                      {isSeatsLoading ? (
                        <div style={{ padding: "20px 14px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                          <Loader2 size={20} color="#2372A5" style={{ animation: "spin 1s linear infinite" }} />
                          <span style={{ fontSize: "12px", fontFamily: "'Plus Jakarta Sans', sans-serif", color: "#64748B" }}>
                            Loading seat layouts...
                          </span>
                        </div>
                      ) : filteredAvailableSeats.length === 0 ? (
                        <div style={{ padding: "16px 12px", textAlign: "center" }}>
                          <p style={{ margin: "0 0 2px 0", fontSize: "12px", fontWeight: 600, color: "#374151" }}>
                            No matching layouts found
                          </p>
                        </div>
                      ) : (
                        filteredAvailableSeats.map((seat) => {
                          const currentCount = allocatedSeats.filter((s) => s.layoutId === seat.id).length;
                          return (
                            <div
                              key={seat.id}
                              onClick={() => {
                                addSeatLayout(seat.id!);
                                setIsSeatDropdownOpen(false);
                              }}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: "10px",
                                padding: "8px 10px",
                                borderRadius: "6px",
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                                background: currentCount > 0 ? "#F0F7FF" : "transparent",
                                marginBottom: "3px",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = "#E0EDFF";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = currentCount > 0 ? "#F0F7FF" : "transparent";
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                                <Armchair size={15} color="#2372A5" style={{ flexShrink: 0 }} />
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                    <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, fontSize: "12px", color: "#0C2A42" }}>
                                      {seat.name}
                                    </span>
                                    {seat.hasAisle && (
                                      <span style={{ fontSize: "9px", fontWeight: 700, color: "#059669", background: "#ECFDF5", padding: "1px 5px", borderRadius: "4px" }}>
                                        Aisle
                                      </span>
                                    )}
                                  </div>
                                  <p style={{ margin: "1px 0 0 0", fontSize: "10px", color: "#64748B" }}>
                                    {seat.rows}R × {seat.cols}C • {seat.rows * seat.cols} seats
                                  </p>
                                </div>
                              </div>

                              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                                {currentCount > 0 && (
                                  <span style={{ fontSize: "10px", fontWeight: 700, color: "#2563EB", background: "#DBEAFE", padding: "1px 6px", borderRadius: "10px" }}>
                                    {currentCount} selected
                                  </span>
                                )}
                                <span style={{ fontSize: "11px", fontWeight: 700, color: "#0E4E7A", background: "#E0F2FE", padding: "2px 6px", borderRadius: "4px" }}>
                                  + Select
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 2. Second Dropdown / List: Allocated Seats & Sequence (with Grab / Drag & Drop & Disable) */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                <label style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: "12px", color: "#374151" }}>
                  Allocated Seats ({decoratedAllocatedSeats.length}) — Grab to Reorder<Req />
                </label>
                {allocatedSeats.length > 0 && (
                  <button
                    type="button"
                    onClick={clearAllSeats}
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      color: "#9CA3AF",
                      fontSize: "11px",
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontWeight: 600,
                      padding: 0,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#DC2626")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#9CA3AF")}
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* Scrollable Allocated Seats Box with vertical scroll */}
              <div
                style={{
                  minHeight: "130px",
                  maxHeight: "220px",
                  overflowY: "auto",
                  border: "1.5px solid #E2E8F0",
                  borderRadius: "8px",
                  padding: "6px",
                  background: allocatedSeats.length === 0 ? "#F8FAFC" : "#FFFFFF",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
                className="seat-scroll-container"
              >
                {allocatedSeats.length === 0 ? (
                  <div style={{ margin: "auto", textAlign: "center", padding: "16px" }}>
                    <Armchair size={24} color="#94A3B8" style={{ margin: "0 auto 6px auto", display: "block" }} />
                    <p style={{ margin: "0 0 2px 0", fontSize: "12px", fontWeight: 600, color: "#64748B" }}>
                      No seat layouts selected yet
                    </p>
                    <p style={{ margin: 0, fontSize: "11px", color: "#94A3B8" }}>
                      Select seat layouts from the dropdown above to allocate.
                    </p>
                  </div>
                ) : (
                  decoratedAllocatedSeats.map((item, index) => {
                    const isDragging = draggedIndex === index;
                    const isOver = dragOverIndex === index;
                    const isFirst = index === 0;
                    const isLast = index === decoratedAllocatedSeats.length - 1;

                    return (
                      <div
                        key={item.instanceId}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                        onDrop={(e) => handleDrop(e, index)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "8px",
                          padding: "8px 10px",
                          borderRadius: "6px",
                          background: item.isDisabled
                            ? "#F3F4F6"
                            : isOver
                              ? "#DBEAFE"
                              : "#F8FAFC",
                          border: isOver
                            ? "1.5px dashed #2563EB"
                            : item.isDisabled
                              ? "1px solid #E5E7EB"
                              : "1px solid #E2E8F0",
                          opacity: isDragging ? 0.4 : item.isDisabled ? 0.65 : 1,
                          transition: "background 0.15s ease, border 0.15s ease",
                          cursor: "grab",
                        }}
                        title="Grab and drag to reorder sequence"
                      >
                        {/* Left: Sequence Badge + Grab Handle + Up/Down arrows + Icon + Name & Details */}
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0, flex: 1 }}>
                          {/* Order index badge */}
                          <span
                            style={{
                              fontSize: "10px",
                              fontWeight: 800,
                              color: "#0E4E7A",
                              background: "#E0F2FE",
                              border: "1px solid #BAE6FD",
                              borderRadius: "4px",
                              padding: "2px 5px",
                              minWidth: "20px",
                              textAlign: "center",
                              flexShrink: 0,
                            }}
                            title={`Position #${index + 1}`}
                          >
                            #{index + 1}
                          </span>

                          {/* Grab handle */}
                          <span
                            style={{
                              color: item.isDisabled ? "#9CA3AF" : "#64748B",
                              display: "flex",
                              alignItems: "center",
                              cursor: "grab",
                              flexShrink: 0,
                            }}
                            title="Grab to drag & reorder"
                          >
                            <GripVertical size={16} />
                          </span>

                          {/* Move Up / Down Buttons */}
                          <div style={{ display: "flex", flexDirection: "column", gap: "1px", flexShrink: 0 }}>
                            <button
                              type="button"
                              disabled={isFirst}
                              onClick={(e) => moveSeatUp(index, e)}
                              title="Move seat up"
                              style={{
                                background: "transparent",
                                border: "none",
                                padding: 0,
                                cursor: isFirst ? "default" : "pointer",
                                opacity: isFirst ? 0.25 : 0.8,
                                color: "#0C2A42",
                                display: "flex",
                                alignItems: "center",
                              }}
                            >
                              <ChevronUp size={12} strokeWidth={2.5} />
                            </button>
                            <button
                              type="button"
                              disabled={isLast}
                              onClick={(e) => moveSeatDown(index, e)}
                              title="Move seat down"
                              style={{
                                background: "transparent",
                                border: "none",
                                padding: 0,
                                cursor: isLast ? "default" : "pointer",
                                opacity: isLast ? 0.25 : 0.8,
                                color: "#0C2A42",
                                display: "flex",
                                alignItems: "center",
                              }}
                            >
                              <ChevronDown size={12} strokeWidth={2.5} />
                            </button>
                          </div>

                          <Armchair
                            size={16}
                            color={item.isDisabled ? "#9CA3AF" : "#0E4E7A"}
                            style={{ flexShrink: 0, marginLeft: "2px" }}
                          />

                          <div style={{ minWidth: 0, marginLeft: "2px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                              <span
                                style={{
                                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                                  fontWeight: 700,
                                  fontSize: "12px",
                                  color: item.isDisabled ? "#6B7280" : "#0C2A42",
                                  textDecoration: item.isDisabled ? "line-through" : "none",
                                }}
                              >
                                {item.displayName}
                              </span>

                              {item.isDisabled ? (
                                <span
                                  style={{
                                    fontSize: "9px",
                                    fontWeight: 700,
                                    color: "#6B7280",
                                    background: "#E5E7EB",
                                    padding: "1px 5px",
                                    borderRadius: "4px",
                                  }}
                                >
                                  Disabled
                                </span>
                              ) : (
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
                                  Active
                                </span>
                              )}
                            </div>
                            <p style={{ margin: "2px 0 0 0", fontSize: "10px", color: "#64748B" }}>
                              {item.rows}R × {item.cols}C • {item.capacity} seats capacity
                            </p>
                          </div>
                        </div>

                        {/* Right: Toggle Disable/Enable & Remove */}
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                          {/* Disable / Enable Toggle Button */}
                          <button
                            type="button"
                            onClick={(e) => toggleSeatDisabled(item.instanceId, e)}
                            title={item.isDisabled ? "Enable this seat layout" : "Disable this seat layout"}
                            style={{
                              border: "none",
                              background: item.isDisabled ? "#E5E7EB" : "#DCFCE7",
                              color: item.isDisabled ? "#6B7280" : "#15803D",
                              borderRadius: "4px",
                              padding: "3px 7px",
                              fontSize: "10px",
                              fontWeight: 700,
                              fontFamily: "'Plus Jakarta Sans', sans-serif",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                              transition: "all 0.15s ease",
                            }}
                          >
                            <Power size={11} strokeWidth={2.5} />
                            <span>{item.isDisabled ? "Enable" : "Disable"}</span>
                          </button>

                          {/* Delete / Remove Button */}
                          <button
                            type="button"
                            onClick={(e) => removeAllocatedSeat(item.instanceId, item.displayName, e)}
                            title="Remove layout"
                            style={{
                              background: "transparent",
                              border: "none",
                              cursor: "pointer",
                              color: "#9CA3AF",
                              padding: "3px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              borderRadius: "4px",
                              transition: "color 0.15s ease",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = "#DC2626")}
                            onMouseLeave={(e) => (e.currentTarget.style.color = "#9CA3AF")}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Selected Layouts Summary */}
            {allocatedSeats.length > 0 && (
              <div
                style={{
                  marginTop: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "6px 10px",
                  background: "#F0FDF4",
                  border: "1px solid #BBF7D0",
                  borderRadius: "6px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Check size={14} color="#16A34A" strokeWidth={2.5} />
                  <span
                    style={{
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontWeight: 600,
                      fontSize: "11px",
                      color: "#15803D",
                    }}
                  >
                    {decoratedAllocatedSeats.filter((s) => !s.isDisabled).length} active seat layout{decoratedAllocatedSeats.filter((s) => !s.isDisabled).length > 1 ? "s" : ""} allocated ({decoratedAllocatedSeats.filter((s) => !s.isDisabled).reduce((sum, s) => sum + s.capacity, 0)} total seats capacity)
                  </span>
                </div>
              </div>
            )}

            {formErrors.seatAllocation && (
              <span
                style={{
                  display: "block",
                  marginTop: "6px",
                  fontSize: "11px",
                  color: "#DC2626",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 500,
                }}
              >
                {formErrors.seatAllocation}
              </span>
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
                {cat.image ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={cat.image}
                    alt={cat.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      background: "linear-gradient(135deg, #0C2A42 0%, #2372A5 100%)",
                      color: "#FFFFFF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: "18px",
                    }}
                  >
                    {cat.name ? cat.name.charAt(0).toUpperCase() : "C"}
                  </div>
                )}
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
              <div style={{ width: "100%", textAlign: "center" }} id={`field-seats-${cat.id}`}>
                <span style={{ display: "block", fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, fontSize: "10px", color: "#011B2F", marginBottom: "4px" }}>
                  No. of Seats<span style={{ color: "#DC2626" }}>*</span>
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g. 10"
                  value={cat.numberOfSeats}
                  onChange={(e) => {
                    handleCategoryChange(cat.id, "numberOfSeats", e.target.value.replace(/\D/g, ""));
                    setFormErrors((prev) => {
                      if (!prev[`seats-${cat.id}`]) return prev;
                      const next = { ...prev };
                      delete next[`seats-${cat.id}`];
                      return next;
                    });
                  }}
                  style={{
                    boxSizing: "border-box",
                    width: "144px",
                    height: "24px",
                    background: formErrors[`seats-${cat.id}`]
                      ? "#FEF2F2"
                      : cat.numberOfSeats
                        ? "#F0FDF4"
                        : "#FFF7ED",
                    border: formErrors[`seats-${cat.id}`]
                      ? "1.5px solid #DC2626"
                      : cat.numberOfSeats
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
                {formErrors[`seats-${cat.id}`] && (
                  <span
                    style={{
                      display: "block",
                      marginTop: "4px",
                      fontSize: "9px",
                      color: "#DC2626",
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontWeight: 500,
                    }}
                  >
                    {formErrors[`seats-${cat.id}`]}
                  </span>
                )}
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
        existingCategories={categories.map((c) => c.name)}
      />
    </form>
  );
}
