"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Upload, Plus, Trash2, X, Check, Armchair, ChevronDown, ChevronUp, Search, Loader2, GripVertical, Power, User, TrainFront, RotateCw, Pencil } from "lucide-react";
import { Attraction } from "@/app/(dashboard)/attraction-management/types";
import { confirmDelete, confirmRemoveRoute } from "@/lib/notify";
import { validateAttractionForm } from "@/app/(dashboard)/attraction-management/schema";
import { SeatConfigData } from "@/app/(dashboard)/seat-management/types";
import { useSeatLayouts } from "@/hooks/useSeatQueries";
import { useDeleteAttractionSeat } from "@/hooks/useAttractionManagementQueries";
import { useModalBodyLock } from "@/hooks/useModalBodyLock";
import AttractionImageCropper from "./AttractionImageCropper";
import AddEditVisitorCategoryModal from "./AddEditVisitorCategoryModal";
import ConfigureStationsModal, { StationItem } from "./ConfigureStationsModal";

// ── Shared required asterisk
const Req = () => <span style={{ color: "#DC2626", marginLeft: "2px" }}>*</span>;

// ── Allocated seat item for dynamic sequence, reordering, and disable toggle
export interface AllocatedSeatItem {
  instanceId: string;
  layoutId: string;
  /**
   * The `attraction_seats.id` (per-coach row id) when this allocation
   * already exists on the server. Undefined for new allocations that
   * have not been saved yet — in that case `layoutId` (the seat-layout
   * template id) is sent in the PATCH payload.
   */
  attractionSeatId?: string;
  /** Server-provided seat name e.g. "2S - A". When present, used as the
   * chip display name without recomputing a suffix. */
  serverName?: string;
  isDisabled?: boolean;
  suffix?: string;
}

// ── Visitor category type 
export interface CategoryItem {
  id: string;
  name: string;
  /** local public path or data-URL from user upload */
  image: string;
  /** Only set when user uploads a real image (data: URL or http/https URL). Used as imageLink in the API payload. */
  imageLink?: string | null;
  basePrice: string;
  futurePrice: string;
  futurePriceType?: "recurring" | "onetime";
  effectiveFrom: string;
  numberOfSeats: string;
  hsnCode?: string;
  sacCode?: string;
}

interface AddEditAttractionFormProps {
  attractionToEdit?: Attraction | null;
  existingAttractions?: Attraction[];
  onSave: (data: Partial<Attraction>) => void;
  onCancel: () => void;
  /** Called when user checks 'Requires seat allocation' — passes the partially-built attraction */
  onConfigureSeating?: (draft: Partial<Attraction>) => void;
  isSaving?: boolean;
}

// ── Preserved legacy AddVisitorCategoryModal (commented out - do not delete)
/*
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
  useModalBodyLock(isOpen);
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
        <div style={{ background: "#011B2F", padding: "16px 22px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Plus size={20} color="#F4BC43" />
            <span style={{ fontWeight: 700, fontSize: "16px", color: "#FFFFFF" }}>Add Visitor Category</span>
          </div>
          <button type="button" onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#FFFFFF", display: "flex" }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: "24px 22px", display: "flex", flexDirection: "column", gap: "16px" }}>
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
                <img src={image} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <User size={30} color="#2372A5" />
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
*/

// ── Visitor Category Avatar with Profile Icon Fallback 
function VisitorCategoryAvatar({ src, name, size = 44 }: { src?: string; name: string; size?: number }) {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [imgErr, setImgErr] = useState(false);

  useEffect(() => {
    setCurrentSrc(src);
    setImgErr(false);
  }, [src]);

  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: "50%",
        overflow: "hidden",
        border: "1.5px solid #E2E8F0",
        background: "#F8FAFC",
        flexShrink: 0,
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {currentSrc && !imgErr ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={currentSrc}
          alt={name}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          onError={() => {
            if (currentSrc.includes("Student.jpg")) {
              setCurrentSrc("/Assets/Visitors/Student.png");
            } else if (currentSrc.endsWith(".jpg")) {
              setCurrentSrc(currentSrc.replace(/\.jpg$/i, ".png"));
            } else {
              setImgErr(true);
            }
          }}
        />
      ) : (
        <div
          style={{
            width: "100%",
            height: "100%",
            background: "linear-gradient(135deg, #F1F5F9 0%, #E2E8F0 100%)",
            color: "#64748B",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <User size={Math.round(size * 0.55)} color="#64748B" />
        </div>
      )}
    </div>
  );
}

// ── Default categories using local /Assets/Visitors/ images 
const DEFAULT_CATEGORIES: CategoryItem[] = [
  { id: "adult", name: "Adult", image: "/Assets/Visitors/Adult.png", basePrice: "100.00", futurePrice: "+10%", futurePriceType: "recurring", effectiveFrom: "2027-01-01", numberOfSeats: "1" },
  { id: "child", name: "Child", image: "/Assets/Visitors/Child.png", basePrice: "60.00", futurePrice: "75.00", futurePriceType: "onetime", effectiveFrom: "2026-12-15", numberOfSeats: "1" },
  { id: "student", name: "Student", image: "/Assets/Visitors/Student.png", basePrice: "90.00", futurePrice: "+5%", futurePriceType: "recurring", effectiveFrom: "2027-01-01", numberOfSeats: "1" },
  { id: "senior", name: "Senior", image: "/Assets/Visitors/Senior.png", basePrice: "75.00", futurePrice: "00.00", futurePriceType: "recurring", effectiveFrom: "", numberOfSeats: "1" },
  { id: "foreigner", name: "Foreigner", image: "/Assets/Visitors/Foreigner.png", basePrice: "500.00", futurePrice: "00.00", futurePriceType: "recurring", effectiveFrom: "", numberOfSeats: "1" },
];

// ── Default image map per category name key 
const DEFAULT_CATEGORY_IMAGES: Record<string, string> = {
  adult: "/Assets/Visitors/Adult.png",
  child: "/Assets/Visitors/Child.png",
  student: "/Assets/Visitors/Student.png",
  senior: "/Assets/Visitors/Senior.png",
  foreigner: "/Assets/Visitors/Foreigner.png",
};

// ── Helper: build CategoryItem list from attraction.categories API array ────
function apiCategoriesToCategoryItems(apiCats: any[]): CategoryItem[] {
  if (!Array.isArray(apiCats) || apiCats.length === 0) return DEFAULT_CATEGORIES;
  return apiCats.map((c) => {
    const key = (c.name || "").toLowerCase().trim();
    const defaultImg = DEFAULT_CATEGORY_IMAGES[key] || "";
    let rawImage =
      c.imageLink && typeof c.imageLink === "string" && c.imageLink.trim()
        ? c.imageLink.trim()
        : c.image && typeof c.image === "string" && c.image.trim()
          ? c.image.trim()
          : defaultImg;
    if (rawImage && rawImage.includes("Student.jpg")) {
      rawImage = "/Assets/Visitors/Student.png";
    }
    const imageUrl = rawImage ? rawImage.replace(/\/Assests\//gi, "/Assets/") : defaultImg;
    return {
      id: c.id || key,
      name: c.name || "",
      image: imageUrl,
      imageLink:
        c.imageLink && typeof c.imageLink === "string" && c.imageLink.trim()
          ? c.imageLink.trim().replace(/\/Assests\//gi, "/Assets/")
          : null,
      basePrice:
        c.basePrice != null && !isNaN(Number(c.basePrice))
          ? Number(c.basePrice).toFixed(2)
          : "00.00",
      futurePrice:
        c.futurePrice != null && !isNaN(Number(c.futurePrice))
          ? Number(c.futurePrice).toFixed(2)
          : (c.futurePrice || "00.00"),
      futurePriceType: c.futurePriceType || "recurring",
      effectiveFrom: c.effectiveFrom || "",
      numberOfSeats:
        c.noOfSeats != null && Number(c.noOfSeats) >= 1
          ? String(Number(c.noOfSeats))
          : "1",
    };
  });
}

export default function AddEditAttractionForm({
  attractionToEdit,
  existingAttractions = [],
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
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryItem[]>(DEFAULT_CATEGORIES);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  // ── Operating hours (display-only, no booking enforcement) 
  const [openTime, setOpenTime] = useState("09:00");
  const [closeTime, setCloseTime] = useState("18:00");
  const [isRoundTrip, setIsRoundTrip] = useState<boolean>(false);
  const [isMultiStation, setIsMultiStation] = useState<boolean>(() => {
    if (attractionToEdit) {
      return (attractionToEdit as any).isMultiStation === true;
    }
    return false;
  });
  const [isConfigureStationsModalOpen, setIsConfigureStationsModalOpen] = useState<boolean>(false);
  const [configuredStations, setConfiguredStations] = useState<StationItem[]>([
    { id: "st-1", name: "Station 1" },
    { id: "st-2", name: "Station 2" },
    { id: "st-3", name: "Station 3" },
  ]);

  // ── Fetch active seat layouts from backend API.
  // The dropdown is populated from /api/admin/seats in BOTH create and edit modes
  // so the user can add more seat layouts when editing. Embedded
  // `attractionToEdit.seatLayouts` are still merged below in decoratedAllocatedSeats
  // so any layout referenced by this attraction but missing from the API stays visible.
  const { data: seatData, isLoading: isSeatsLoading } = useSeatLayouts();
  const deleteAttractionSeatMutation = useDeleteAttractionSeat();
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

  // ── Decorated allocated seats: resolve names from availableSeats OR embedded seatLayouts in the edit payload
  const decoratedAllocatedSeats = useMemo(() => {
    // Merge API-fetched seats with any seatLayouts already embedded in the attraction GET response
    const embeddedLayouts: SeatConfigData[] = Array.isArray(
      (attractionToEdit as any)?.seatLayouts
    )
      ? (attractionToEdit as any).seatLayouts.map((s: any) => ({
        id: s.id,
        name: s.name,
        rows: s.rows ?? 0,
        cols: s.cols ?? 0,
        hasAisle: !!s.hasAisle,
        aisleAfterCol: s.aisleAfterCol ?? null,
        status: s.status ?? "ACTIVE",
        totalSeats: (s.rows ?? 0) * (s.cols ?? 0),
      }))
      : [];

    // Combined source: prefer already-fetched seats, append any embedded ones not yet present
    const combinedSeats = [...availableSeats];
    embeddedLayouts.forEach((el) => {
      if (!combinedSeats.find((s) => s.id === el.id)) {
        combinedSeats.push(el);
      }
    });

    const totalCounts: Record<string, number> = {};
    allocatedSeats.forEach((item) => {
      totalCounts[item.layoutId] = (totalCounts[item.layoutId] || 0) + 1;
    });

    // Per-layout running counter for assigning sequential fallback suffixes
    const occurrenceCounters: Record<string, number> = {};

    return allocatedSeats.map((item, index) => {
      const seat = combinedSeats.find((s) => s.id === item.layoutId);
      const totalForThisLayout = totalCounts[item.layoutId] || 0;

      // Base layout template name 
      const baseName = seat
        ? seat.name
        : item.serverName
          ? item.serverName.replace(/\s*-\s*\d+$/, "").trim()
          : "Seat Layout";

      let suffix = item.suffix || "";
      let displayName = "";

      if (totalForThisLayout <= 1) {
        // Solitary layout: keep serverName if present (e.g. "50 seat"), or baseName
        displayName = item.serverName || baseName;
        suffix = "";
      } else {
        // Multiple instances of this layout template:
        // If serverName ALREADY ends with " - <number>" (like "2S - 1", "2S - 2"),
        // use that serverName directly to prevent duplicate suffixes like "2S - 1 - 1".
        const serverHasNumber = item.serverName && /\s*-\s*\d+$/.test(item.serverName);

        if (serverHasNumber) {
          displayName = item.serverName!;
          const match = item.serverName!.match(/\s*-\s*(\d+)$/);
          suffix = match ? ` - ${match[1]}` : "";
        } else {
          // If no number in serverName (e.g. "50 seat" or a newly added seat),
          // format with baseName + suffix (e.g. "50 seat - 1", "50 seat - 2")
          if (!suffix) {
            const occ = (occurrenceCounters[item.layoutId] || 0) + 1;
            occurrenceCounters[item.layoutId] = occ;
            suffix = ` - ${occ}`;
          }
          displayName = `${baseName}${suffix}`;
        }
      }

      return {
        ...item,
        index,
        seat,
        baseName,
        suffix,
        displayName,
        capacity: seat ? seat.rows * seat.cols : 0,
        rows: seat?.rows ?? 0,
        cols: seat?.cols ?? 0,
        hasAisle: !!seat?.hasAisle,
      };
    });
  }, [allocatedSeats, availableSeats, attractionToEdit]);

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

  // ── Populate form when editing 
  useEffect(() => {
    if (attractionToEdit) {
      setName(attractionToEdit.name || "");
      setDescription(attractionToEdit.description || "");
      setCategory(attractionToEdit.category || "");
      setStatus(normalizeStatus(attractionToEdit.status));

      // Extract layout IDs, handling both string array and object array formats
      const extractLayoutIds = (items: any[]): string[] => {
        return items
          .map((item) => {
            if (typeof item === "string") return item;
            if (item && typeof item === "object" && item.id) return item.id;
            return null;
          })
          .filter((id): id is string => id !== null);
      };

      const rawLayoutIds: string[] =
        (Array.isArray((attractionToEdit as any).seatLayoutIds) &&
          (attractionToEdit as any).seatLayoutIds.length > 0
          ? extractLayoutIds((attractionToEdit as any).seatLayoutIds)
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

      // ── PREFERRED SOURCE: attractionSeats[] from the GET response.
      // Each row has { id, seatLayoutId, name, seatOrder, isActive }.
      // We use seatOrder to drive the chip ordering and isActive to drive
      // the enabled/disabled badge. The `id` (attraction_seats.id) is what
      // gets sent back in the PATCH payload as seatLayoutIds[*].id.
      const attractionSeatRows: any[] = (attractionToEdit as any).attractionSeats;
      if (Array.isArray(attractionSeatRows) && attractionSeatRows.length > 0) {
        const sorted = [...attractionSeatRows].sort(
          (a, b) => Number(a.seatOrder ?? 0) - Number(b.seatOrder ?? 0)
        );
        setAllocatedSeats(
          sorted.map((row, idx) => {
            const rawName = row.name || "";
            const numMatch = rawName.match(/\s*-\s*(\d+)$/);
            const initialSuffix = numMatch ? ` - ${numMatch[1]}` : "";
            return {
              instanceId:
                row.id
                  ? `seat_${row.id}`
                  : `seat_${idx}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              layoutId: row.seatLayoutId,
              attractionSeatId: row.id,
              serverName: rawName || undefined,
              isDisabled: !row.isActive,
              suffix: initialSuffix,
            };
          })
        );
      } else {
        const existingAllocations: any[] = (attractionToEdit as any).seatAllocations;
        if (Array.isArray(existingAllocations) && existingAllocations.length > 0) {
          setAllocatedSeats(
            existingAllocations.map((a, idx) => ({
              instanceId: a.instanceId || `seat_${idx}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              layoutId: a.layoutId || a.id,
              isDisabled: !!a.isDisabled,
              suffix: a.suffix || (existingAllocations.filter((x: any) => (x.layoutId || x.id) === (a.layoutId || a.id)).length > 1 ? ` - ${(idx % 26) + 1}` : ""),
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
                suf = ` - ${(occ % 26) + 1}`;
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
      }

      setImagePreview(attractionToEdit.image || null);
      // Use categories array from GET response directly (includes basePrice, noOfSeats, imageLink)
      setCategories(apiCategoriesToCategoryItems((attractionToEdit as any).categories || []));
      // Parse existing duration string (e.g. "20min / trip" or "1hr / trip") or numeric value back to value + unit safely
      const durProp = (attractionToEdit as any).duration;
      const durMinsProp = (attractionToEdit as any).durationMins;
      const durUnitProp = (attractionToEdit as any).durationUnit;

      const rawDurStr = typeof durProp === "string" ? durProp : (durProp != null ? String(durProp) : (durMinsProp != null ? `${durMinsProp}min / trip` : ""));
      const hrMatch = rawDurStr.match(/(\d+(?:\.\d+)?)\s*(?:hr|hour)/i);
      const minMatch = rawDurStr.match(/(\d+(?:\.\d+)?)\s*(?:min|minute)/i);
      if (hrMatch) {
        setDurationValue(hrMatch[1]);
        setDurationUnit("hours");
      } else if (minMatch) {
        setDurationValue(minMatch[1]);
        setDurationUnit("minutes");
      } else {
        const cleanVal = rawDurStr.replace(/[^\d.]/g, "");
        setDurationValue(cleanVal);
        if (durUnitProp === "hours" || durUnitProp === "hrs" || durUnitProp === "hour") {
          setDurationUnit("hours");
        } else {
          setDurationUnit("minutes");
        }
      }

      // Parse timing string "HH:MM AM/PM - HH:MM AM/PM" back into 24-hour values
      if (attractionToEdit.timing && typeof attractionToEdit.timing === "string") {
        const parts = attractionToEdit.timing.split(" - ");
        if (parts.length === 2) {
          const to24 = (t: string) => {
            if (!t) return "09:00";
            const partsStr = t.trim().split(" ");
            const time = partsStr[0] || "";
            const meridiem = partsStr[1] || "";
            let [h, m] = time.split(":").map(Number);
            if (isNaN(h)) h = 9;
            if (isNaN(m)) m = 0;
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
      // setIsRoundTrip((attractionToEdit as any).isRoundTrip !== false);
      setIsMultiStation((attractionToEdit as any).isMultiStation === true);
      if (Array.isArray((attractionToEdit as any).stations) && (attractionToEdit as any).stations.length > 0) {
        setConfiguredStations((attractionToEdit as any).stations);
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
      setIsRoundTrip(false);
      setIsMultiStation(false);
      setConfiguredStations([
        { id: "st-1", name: "Station 1" },
        { id: "st-2", name: "Station 2" },
        { id: "st-3", name: "Station 3" },
      ]);
    }
  }, [attractionToEdit]);

  // ── Handlers ───────────────────────────────────────────────────────────
  const handleCategoryImageUpload = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setCategories((prev) =>
        prev.map((c) => (c.id === id ? { ...c, image: dataUrl, imageLink: dataUrl } : c))
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
        image: image || "",
        basePrice: basePrice || "00.00",
        futurePrice: "00.00",
        futurePriceType: "recurring",
        effectiveFrom: "",
        numberOfSeats: numberOfSeats && Number(numberOfSeats) >= 1 ? numberOfSeats : "1",
      },
    ]);
  };

  // Seat allocation actions
  const addSeatLayout = (layoutId: string) => {
    // Find all existing items of this layoutId
    const existingWithSameLayout = allocatedSeats.filter((s) => s.layoutId === layoutId);

    // Compute which numeric suffixes are already in use
    const usedNumbers = new Set(
      existingWithSameLayout
        .map((s) => {
          const str = s.suffix || "";
          const match = str.match(/-\s*(\d+)$/);
          if (match) return Number(match[1]);

          if (s.serverName) {
            const serverMatch = s.serverName.match(/\s*-\s*(\d+)$/);
            if (serverMatch) return Number(serverMatch[1]);
          }

          // If it was a solitary layout with no number (e.g. "50 seat"), it will be assigned 1
          return 1;
        })
        .filter((n) => Number.isFinite(n) && n > 0)
    );

    // Find the first unused number for the new item
    let nextNumber = 1;
    for (let i = 1; i <= 50; i++) {
      if (!usedNumbers.has(i)) {
        nextNumber = i;
        break;
      }
    }

    const newInstance: AllocatedSeatItem = {
      instanceId: `seat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      layoutId,
      isDisabled: false,
      suffix: ` - ${nextNumber}`,
    };

    setAllocatedSeats((prev) => {
      const updated = [...prev, newInstance].map((item) => {
        if (item.layoutId !== layoutId) return item;
        // If an existing item with the same layoutId has no numeric suffix
        // (for example, a previously solitary layout like "50 seat"),
        // give it "- 1" now that a sibling is added.
        const hasExistingNumber =
          (item.suffix && /-\s*\d+$/.test(item.suffix)) ||
          (item.serverName && /\s*-\s*\d+$/.test(item.serverName));

        if (!hasExistingNumber && item.instanceId !== newInstance.instanceId) {
          return { ...item, suffix: " - 1" };
        }
        return item;
      });
      return updated;
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
    setAllocatedSeats((prev) => {
      const updated = prev.map((s) => (s.instanceId === instanceId ? { ...s, isDisabled: !s.isDisabled } : s));
      if (updated.some((s) => !s.isDisabled)) {
        setFormErrors((errs) => {
          if (!errs.seatAllocation) return errs;
          const next = { ...errs };
          delete next.seatAllocation;
          return next;
        });
      }
      return updated;
    });
  };

  const removeAllocatedSeat = async (instanceId: string, displayName?: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const item = decoratedAllocatedSeats.find((s) => s.instanceId === instanceId);
    const label = displayName || item?.displayName || "this seat layout";
    const confirmed = await confirmDelete(`seat allocation "${label}"`);
    if (!confirmed) return;

    // If the seat already exists on the server (attractionSeatId is present),
    // call DELETE /api/admin/attraction-seats/:attractionSeatId
    if (item?.attractionSeatId) {
      try {
        await deleteAttractionSeatMutation.mutateAsync(item.attractionSeatId);
      } catch {
        // Error toast is handled by the mutation's onError — don't remove from local state
        return;
      }
    }

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

  const handleSubmit = async (e: React.FormEvent) => {
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
        "Seat allocation is required. Please select at least one seat layout.";
    } else if (activeAllocated.length === 0) {
      seatErrors.seatAllocation =
        "All allocated seat layouts are disabled. Please enable at least one or select another seat layout.";
    }

    for (const cat of categories) {
      const raw = (cat.numberOfSeats || "").trim();
      if (!raw) {
        seatErrors[`seats-${cat.id}`] = "No. of seats is required.";
      } else if (isNaN(Number(raw)) || !Number.isInteger(Number(raw)) || Number(raw) < 1) {
        seatErrors[`seats-${cat.id}`] = "Must be a whole number of at least 1.";
      }
    }

    const allErrors = { ...(validation.errors as Record<string, string>), ...seatErrors };

    if (!validation.success || Object.keys(seatErrors).length > 0) {
      setFormErrors(allErrors);
      const firstField = Object.keys(allErrors)[0];
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

    // Build seatLayoutIds as array of objects:
    // - Existing seats (loaded from attractionSeats) include attractionSeatId AND seatLayoutId.
    // - Newly added seats (added in this session without attractionSeatId) include seatLayoutId without attractionSeatId.
    const seatLayoutIdsAsObjects = decoratedAllocatedSeats.map((seat, index) => {
      const item: {
        attractionSeatId?: string;
        seatLayoutId: string;
        name: string;
        status: string;
        position: number;
      } = {
        ...(seat.attractionSeatId ? { attractionSeatId: seat.attractionSeatId } : {}),
        seatLayoutId: seat.layoutId,
        name: seat.displayName,
        status: seat.isDisabled ? "inactive" : "active",
        position: index + 1,
      };
      return item;
    });

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

    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        status,
        hasSeating: activeAllocated.length > 0,
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
        visitorCategories: categories.map((c) => ({
          ...c,
          imageLink: c.imageLink && c.imageLink.trim() ? c.imageLink.trim() : null,
        })),
        categories: categories.map((c) => ({
          ...c,
          imageLink: c.imageLink && c.imageLink.trim() ? c.imageLink.trim() : null,
        })),
        assignedSeatIds: activeLayoutIds,
        seatLayoutIds: seatLayoutIdsAsObjects,
        assignedSeatNames: assignedSeatNames,
        assignedSeatId: activeLayoutIds[0] || undefined,
        assignedSeatName: assignedSeatNames[0] || undefined,
        seatAllocations: decoratedAllocatedSeats.map((s) => ({
          instanceId: s.instanceId,
          layoutId: s.layoutId,
          attractionSeatId: s.attractionSeatId,
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
        isRoundTrip,
        isMultiStation,
        stations: configuredStations,
      } as any);
    } catch (err: any) {
      // If the API returned a duplicate-name conflict, show the error inline
      // below the name input rather than as a popup notification
      if (err?.code === "DUPLICATE_NAME") {
        setFormErrors((prev) => ({
          ...prev,
          name: "An attraction with this name already exists.",
        }));
        document
          .getElementById("field-name")
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }

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
      {/* ── Top Row: Basic Info (Left) + Status (Right) ─────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.15fr 0.85fr",
          gap: "24px",
          width: "100%",
        }}
        className="attraction-top-grid"
      >
        {/* Left Column: Basic Information Box */}
        <div style={{ minWidth: 0, height: "100%" }}>
          {/* Rectangle 171: Basic Information Box */}
          <div
            style={{
              boxSizing: "border-box",
              width: "100%",
              height: "100%",
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

              {/* Attraction Category - Type Only Field */}
              <div style={{ flex: "1 1 160px" }} id="field-category">
                <label style={{ display: "block", fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: "12px", color: "#374151", marginBottom: "7px" }}>
                  Category<Req />
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ride, Water Park, 3D Show"
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setFormErrors((p) => ({ ...p, category: "" }));
                  }}
                  style={{
                    boxSizing: "border-box",
                    width: "100%",
                    height: "38px",
                    background: "#FFFFFF",
                    border: formErrors.category ? "1.5px solid #DC2626" : "1.5px solid rgba(179, 175, 175, 0.51)",
                    borderRadius: "8px",
                    padding: "0 15px",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: 500,
                    fontSize: "12px",
                    color: "rgba(55, 65, 81, 0.89)",
                    outline: "none",
                  }}
                />
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
            <div className="desc-image-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", alignItems: "flex-start" }}>
              {/* Description */}
              <div id="field-description" style={{ minWidth: 0 }}>
                <label style={{ display: "block", fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: "12px", color: "#374151", marginBottom: "7px" }}>
                  Description
                  <span style={{ marginLeft: "4px", fontWeight: 400, fontSize: "11px", color: "#9CA3AF" }}>(Optional)</span>
                </label>
                <div style={{ position: "relative", width: "100%", maxWidth: "313px" }}>
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

              {/* Attraction Image Dropzone with In-Place Grab & Crop */}
              <div id="field-image" style={{ minWidth: 0 }}>
                <label style={{ display: "block", fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: "12px", color: "#374151", marginBottom: "7px" }}>
                  Attraction image
                  <span style={{ marginLeft: "4px", fontWeight: 400, fontSize: "11px", color: "#9CA3AF" }}>(Optional)</span>
                </label>
                <AttractionImageCropper
                  value={imagePreview}
                  onChange={(newImg) => setImagePreview(newImg)}
                  disabled={isSaving}
                />
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Status & Seat Allocation Card */}
        <div style={{ minWidth: 0, height: "100%" }}>
          <div
            style={{
              boxSizing: "border-box",
              width: "100%",
              height: "100%",
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
                    Allocated Seats ({decoratedAllocatedSeats.length}) — Grab to Reorder
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
                    minHeight: "230px",
                    maxHeight: "135px",
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
                    marginTop: "auto",
                    paddingTop: "14px",
                  }}
                >
                  <div
                    style={{
                      background: "#ECFDF5",
                      border: "1px solid #A7F3D0",
                      borderRadius: "8px",
                      padding: "10px 14px",
                      textAlign: "center",
                      color: "#065F46",
                      fontWeight: 700,
                      fontSize: "12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                    }}
                  >
                    <Check size={15} color="#059669" strokeWidth={2.5} />
                    <span>
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
      </div>

      {/* ── 2. Full-Width Multi-Station (Route) Card ── */}
      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid #E5E9F0",
          borderRadius: "16px",
          padding: "20px 24px",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
          boxSizing: "border-box",
          width: "100%",
        }}
      >
        {!isMultiStation ? (
          /* Default UI: Disabled / Unconfigured State matching uploaded image */
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <h3
                style={{
                  margin: 0,
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 600,
                  fontSize: "18px",
                  lineHeight: "26px",
                  color: "#0D2B43",
                }}
              >
                Multi-Station (Route)
              </h3>
              <p
                style={{
                  margin: 0,
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 400,
                  fontSize: "12px",
                  lineHeight: "16px",
                  color: "#6B7280",
                }}
              >
                Enable this option to configure multiple stations and their route sequence.
              </p>
            </div>

            {/* Toggle switch in OFF state */}
            <button
              type="button"
              role="switch"
              aria-checked={false}
              onClick={() => {
                setIsConfigureStationsModalOpen(true);
              }}
              style={{
                width: "44px",
                height: "24px",
                borderRadius: "9999px",
                background: "#D1D5DB",
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
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  background: "#FFFFFF",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                  transform: "translateX(0px)",
                  transition: "transform 0.2s ease",
                }}
              />
            </button>
          </div>
        ) : (
          /* Configured State */
          <>
            {/* Header */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px", width: "100%", marginBottom: "18px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <h3
                    style={{
                      margin: 0,
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontWeight: 600,
                      fontSize: "18px",
                      lineHeight: "28px",
                      color: "#0D2B43",
                    }}
                  >
                    Multi-Station (Route)
                  </h3>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "2px 10px",
                      background: "#DCFCE7",
                      borderRadius: "9999px",
                      fontFamily: "'Inter', sans-serif",
                      fontWeight: 600,
                      fontSize: "12px",
                      lineHeight: "16px",
                      color: "#22C55E",
                    }}
                  >
                    Enabled
                  </span>
                </div>

                {/* Action buttons (Edit & Delete) */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => setIsConfigureStationsModalOpen(true)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "6px 14px",
                      background: "#FFFFFF",
                      border: "1px solid #E2E8F0",
                      borderRadius: "8px",
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontWeight: 600,
                      fontSize: "12px",
                      color: "#0F172A",
                      cursor: "pointer",
                    }}
                  >
                    <Pencil size={13} color="#0F172A" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const confirmed = await confirmRemoveRoute();
                      if (confirmed) {
                        setIsMultiStation(false);
                      }
                    }}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "32px",
                      height: "32px",
                      background: "#FFF1F2",
                      border: "1px solid #FECDD3",
                      borderRadius: "8px",
                      color: "#E11D48",
                      cursor: "pointer",
                    }}
                    title="Remove Route Configuration"
                  >
                    <Trash2 size={14} color="#E11D48" />
                  </button>
                </div>
              </div>

              <p
                style={{
                  margin: 0,
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 400,
                  fontSize: "12px",
                  lineHeight: "16px",
                  color: "#6B7280",
                }}
              >
                Manage and view the station sequence and route for this attraction.
              </p>
            </div>

            {/* Toggle Bar: Round Trip (Cyclic Route) */}
            <div
              style={{
                background: "#EFF6FF",
                borderRadius: "12px",
                padding: "10px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                maxWidth: "270px",
                boxSizing: "border-box",
                marginBottom: "24px",
              }}
            >
              <span
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 600,
                  fontSize: "13px",
                  color: "#0D2B43",
                }}
              >
                Round Trip (Cyclic Route)
              </span>

              {/* Toggle switch */}
              <button
                type="button"
                role="switch"
                aria-checked={isRoundTrip}
                onClick={() => setIsRoundTrip(!isRoundTrip)}
                style={{
                  width: "44px",
                  height: "24px",
                  borderRadius: "9999px",
                  background: isRoundTrip ? "#22C55E" : "#D1D5DB",
                  border: "none",
                  cursor: "pointer",
                  position: "relative",
                  padding: "2px",
                  transition: "background-color 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  outline: "none",
                }}
              >
                <div
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    background: "#FFFFFF",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                    transform: isRoundTrip ? "translateX(20px)" : "translateX(0px)",
                    transition: "transform 0.2s ease",
                  }}
                />
              </button>
            </div>

            {/* Route Visualisation based on isRoundTrip */}
            {isRoundTrip ? (
              /* State 1: Cyclic Route Diagram (Matching Image 3) */
              <div
                style={{
                  boxSizing: "border-box",
                  width: "100%",
                  paddingTop: "24px",
                  position: "relative",
                  overflowX: "auto",
                }}
              >
                {/* Dashed Loop Container */}
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    minWidth: configuredStations.length > 6 ? `${configuredStations.length * 110}px` : "100%",
                    minHeight: "130px",
                    border: "2px dashed #2563EB",
                    borderRadius: "16px",
                    background: "#FFFFFF",
                    padding: "0 20px 16px 20px",
                    boxSizing: "border-box",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "flex-end",
                  }}
                >
                  {/* Station Nodes & Connecting Solid Line on Top Track */}
                  <div
                    style={{
                      position: "absolute",
                      top: "-20px",
                      left: "24px",
                      right: "24px",
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                    }}
                  >
                    {/* Solid connecting line behind nodes */}
                    <div
                      style={{
                        position: "absolute",
                        top: "18px",
                        left: "20px",
                        right: "20px",
                        height: "4px",
                        background: "#1E66F5",
                        zIndex: 1,
                      }}
                    />

                    {/* Dynamic Stations */}
                    {configuredStations.map((station, idx) => {
                      const isFirst = idx === 0;
                      return (
                        <div
                          key={station.id || idx}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            position: "relative",
                            zIndex: 2,
                            minWidth: "64px",
                          }}
                        >
                          {isFirst ? (
                            <div
                              style={{
                                width: "38px",
                                height: "38px",
                                borderRadius: "50%",
                                background: "#1E66F5",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                boxShadow: "0px 4px 6px -1px rgba(0, 0, 0, 0.1), 0px 2px 4px -2px rgba(0, 0, 0, 0.1)",
                              }}
                            >
                              <TrainFront size={18} color="#FFFFFF" strokeWidth={2.2} />
                            </div>
                          ) : (
                            <div
                              style={{
                                width: "22px",
                                height: "22px",
                                marginTop: "8px",
                                borderRadius: "50%",
                                background: "#FFFFFF",
                                border: "4px solid #1E66F5",
                                boxSizing: "border-box",
                              }}
                            />
                          )}
                          <span
                            style={{
                              marginTop: isFirst ? "8px" : "16px",
                              fontFamily: "'Inter', sans-serif",
                              fontWeight: 700,
                              fontSize: "13px",
                              lineHeight: "16px",
                              color: "#0D2B43",
                              textAlign: "center",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {station.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Cyclic Return Path Pill Indicator */}
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      background: "#EFF6FF",
                      border: "1px solid #BFDBFE",
                      borderRadius: "9999px",
                      padding: "6px 18px",
                      boxSizing: "border-box",
                      marginTop: "60px",
                    }}
                  >
                    <RotateCw size={13} color="#1D4ED8" strokeWidth={2.2} />
                    <span
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 500,
                        fontSize: "12px",
                        lineHeight: "16px",
                        color: "#1D4ED8",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Round Trip (Cyclic Route)
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* State 2: Linear One-Way Route Diagram (Matching Image 4) */
              <div
                style={{
                  boxSizing: "border-box",
                  width: "100%",
                  paddingTop: "24px",
                  paddingBottom: "16px",
                  position: "relative",
                  overflowX: "auto",
                }}
              >
                {/* Station Nodes & Connecting Solid Line on Linear Track */}
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    minWidth: configuredStations.length > 6 ? `${configuredStations.length * 110}px` : "100%",
                    padding: "0 24px",
                    boxSizing: "border-box",
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                  }}
                >
                  {/* Solid connecting line behind nodes */}
                  <div
                    style={{
                      position: "absolute",
                      top: "19px",
                      left: "44px",
                      right: "47px",
                      height: "4px",
                      background: "#1E66F5",
                      zIndex: 1,
                    }}
                  />

                  {/* Dynamic Stations */}
                  {configuredStations.map((station, idx) => {
                    const isFirst = idx === 0;
                    return (
                      <div
                        key={station.id || idx}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          position: "relative",
                          zIndex: 2,
                          minWidth: "64px",
                        }}
                      >
                        {isFirst ? (
                          <div
                            style={{
                              width: "38px",
                              height: "38px",
                              borderRadius: "50%",
                              background: "#1E66F5",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              boxShadow: "0px 4px 6px -1px rgba(0, 0, 0, 0.1), 0px 2px 4px -2px rgba(0, 0, 0, 0.1)",
                            }}
                          >
                            <TrainFront size={18} color="#FFFFFF" strokeWidth={2.2} />
                          </div>
                        ) : (
                          <div
                            style={{
                              width: "22px",
                              height: "22px",
                              marginTop: "8px",
                              borderRadius: "50%",
                              background: "#FFFFFF",
                              border: "4px solid #1E66F5",
                              boxSizing: "border-box",
                            }}
                          />
                        )}
                        <span
                          style={{
                            marginTop: isFirst ? "8px" : "16px",
                            fontFamily: "'Inter', sans-serif",
                            fontWeight: 700,
                            fontSize: "13px",
                            lineHeight: "16px",
                            color: "#0D2B43",
                            textAlign: "center",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {station.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
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
        {/* Header row with Title and + Add Visitor Category Button */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
          <h3 style={{ margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: "18px", color: "#011B2F" }}>
            Visitor Categories & Pricing
          </h3>
          <button
            type="button"
            onClick={handleAddCategory}
            style={{
              background: "#011B2F",
              color: "#FFFFFF",
              border: "none",
              borderRadius: "8px",
              padding: "9px 18px",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 600,
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
            Add Visitor Category
          </button>
        </div>

        {/* Scrollable / Responsive cards track */}
        <div
          className="visitor-categories-track"
          style={{
            display: "flex",
            alignItems: "stretch",
            gap: "20px",
            overflowX: "auto",
            paddingBottom: "16px",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          {categories.map((cat) => {
            const totalPrice = (Number(cat.basePrice || 0) * 1.18).toFixed(2);
            return (
              <div
                key={cat.id}
                className="visitor-category-card"
                style={{
                  boxSizing: "border-box",
                  flex: "0 0 calc((100% - 40px) / 3)",
                  minWidth: "260px",
                  background: "#FFFFFF",
                  border: "1px solid #E5E9F0",
                  borderRadius: "16px",
                  padding: "20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                }}
              >
                {/* Top: Avatar, Name & Edit Button */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <VisitorCategoryAvatar src={cat.image} name={cat.name} size={44} />
                    <span
                      style={{
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        fontWeight: 700,
                        fontSize: "16px",
                        color: "#011B2F",
                      }}
                    >
                      {cat.name}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setEditingCategory(cat)}
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "8px",
                      border: "1px solid #E2E8F0",
                      background: "#FFFFFF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                    title="Edit category"
                  >
                    <Pencil size={15} color="#64748B" />
                  </button>
                </div>

                {/* Row 1: Base Price (₹) & Total Price (i) */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid #E2E8F0",
                      borderRadius: "8px",
                      padding: "8px 12px",
                      boxSizing: "border-box",
                    }}
                  >
                    <div style={{ fontSize: "11px", fontWeight: 500, color: "#64748B", marginBottom: "2px" }}>
                      Base Price (₹)
                    </div>
                    <input
                      type="text"
                      value={cat.basePrice}
                      onChange={(e) => handleCategoryChange(cat.id, "basePrice", e.target.value.replace(/[^0-9.]/g, ""))}
                      style={{
                        width: "100%",
                        border: "none",
                        outline: "none",
                        background: "transparent",
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        fontWeight: 700,
                        fontSize: "16px",
                        color: "#011B2F",
                        padding: 0,
                      }}
                    />
                  </div>

                  <div
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid #E2E8F0",
                      borderRadius: "8px",
                      padding: "8px 12px",
                      boxSizing: "border-box",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", fontWeight: 500, color: "#64748B", marginBottom: "2px" }}>
                      <span>Total Price</span>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "12px",
                          height: "12px",
                          borderRadius: "50%",
                          background: "#E2E8F0",
                          color: "#64748B",
                          fontSize: "8.5px",
                          fontWeight: 700,
                        }}
                        title="Includes 18% GST"
                      >
                        i
                      </span>
                    </div>
                    <div
                      style={{
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        fontWeight: 700,
                        fontSize: "16px",
                        color: "#011B2F",
                      }}
                    >
                      {totalPrice}
                    </div>
                  </div>
                </div>

                {/* Row 2: Future Price & Effective Date */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid #E2E8F0",
                      borderRadius: "8px",
                      padding: "8px 12px",
                      boxSizing: "border-box",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "11px", fontWeight: 500, color: "#64748B", marginBottom: "2px" }}>
                        Future Price
                      </div>
                      <input
                        type="text"
                        value={cat.futurePrice}
                        onChange={(e) => handleCategoryChange(cat.id, "futurePrice", e.target.value)}
                        placeholder="00.00"
                        style={{
                          width: "100%",
                          border: "none",
                          outline: "none",
                          background: "transparent",
                          fontFamily: "'Plus Jakarta Sans', sans-serif",
                          fontWeight: 700,
                          fontSize: "14px",
                          color: "#011B2F",
                          padding: 0,
                          marginBottom: "4px",
                        }}
                      />
                    </div>
                    {cat.futurePriceType === "onetime" ? (
                      <span
                        style={{
                          alignSelf: "flex-start",
                          fontSize: "9.5px",
                          fontWeight: 600,
                          color: "#9333EA",
                          background: "#FAF5FF",
                          border: "1px solid #F3E8FF",
                          borderRadius: "4px",
                          padding: "1px 6px",
                        }}
                      >
                        📅 One Time
                      </span>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: "4px", flexWrap: "nowrap" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "3px",
                            fontSize: "9.5px",
                            fontWeight: 600,
                            color: "#2563EB",
                            background: "#EFF6FF",
                            border: "1px solid #DBEAFE",
                            borderRadius: "4px",
                            padding: "1px 6px",
                          }}
                        >
                          <RotateCw size={9} /> Recurring
                        </span>
                        <span style={{ fontSize: "9px", color: "#64748B", whiteSpace: "nowrap" }}>(of Base Price)</span>
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid #E2E8F0",
                      borderRadius: "8px",
                      padding: "8px 12px",
                      boxSizing: "border-box",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                  >
                    <div style={{ fontSize: "11px", fontWeight: 500, color: "#64748B", marginBottom: "2px" }}>
                      Effective From
                    </div>
                    <input
                      type="text"
                      placeholder="Select Date"
                      value={cat.effectiveFrom}
                      onFocus={(e) => { e.target.type = "date"; }}
                      onBlur={(e) => { if (!e.target.value) e.target.type = "text"; }}
                      onChange={(e) => handleCategoryChange(cat.id, "effectiveFrom", e.target.value)}
                      style={{
                        width: "100%",
                        border: "none",
                        outline: "none",
                        background: "transparent",
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        fontWeight: 600,
                        fontSize: "12px",
                        color: "#011B2F",
                        padding: 0,
                      }}
                    />
                  </div>
                </div>

                {/* Row 3: No. of Seats */}
                <div
                  id={`field-seats-${cat.id}`}
                  style={{
                    background: "#F0FDF4",
                    border: formErrors[`seats-${cat.id}`] ? "1.5px solid #DC2626" : "1px solid #86EFAC",
                    borderRadius: "8px",
                    padding: "8px 14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, fontSize: "12px", color: "#011B2F" }}>
                    No. of Seats<span style={{ color: "#DC2626" }}>*</span>
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="1"
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
                      width: "50px",
                      textAlign: "center",
                      border: "none",
                      outline: "none",
                      background: "transparent",
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontWeight: 700,
                      fontSize: "14px",
                      color: "#011B2F",
                      padding: 0,
                    }}
                  />
                </div>
                {formErrors[`seats-${cat.id}`] && (
                  <span style={{ fontSize: "10px", color: "#DC2626", marginTop: "-8px" }}>
                    {formErrors[`seats-${cat.id}`]}
                  </span>
                )}

                {/* Row 5: Delete button */}
                <button
                  type="button"
                  onClick={() => handleDeleteCategory(cat.id)}
                  style={{
                    width: "100%",
                    height: "36px",
                    background: "#FFFFFF",
                    border: "1px solid #FCA5A5",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#FEF2F2"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#FFFFFF"; }}
                >
                  <Trash2 size={13} color="#EF4444" />
                  <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, fontSize: "12px", color: "#EF4444" }}>
                    Delete
                  </span>
                </button>
              </div>
            );
          })}
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
        .visitor-categories-track::-webkit-scrollbar {
          height: 6px;
        }
        .visitor-categories-track::-webkit-scrollbar-track {
          background: #E2E8F0;
          border-radius: 9999px;
        }
        .visitor-categories-track::-webkit-scrollbar-thumb {
          background: #94A3B8;
          border-radius: 9999px;
        }
        .visitor-categories-track::-webkit-scrollbar-thumb:hover {
          background: #64748B;
        }
        @media (max-width: 900px) {
          .attraction-top-grid {
            grid-template-columns: 1fr !important;
          }
          .card-status-seating,
          .card-basic-info {
            height: auto !important;
          }
          .visitor-category-card {
            flex: 0 0 calc((100% - 20px) / 2) !important;
            min-width: 240px !important;
          }
        }
        @media (max-width: 640px) {
          .desc-image-grid {
            grid-template-columns: 1fr !important;
          }
          .visitor-category-card {
            flex: 0 0 100% !important;
            min-width: 220px !important;
          }
        }
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
      <AddEditVisitorCategoryModal
        isOpen={isAddCategoryModalOpen}
        category={null}
        onClose={() => setIsAddCategoryModalOpen(false)}
        // onAdd={handleAddCategoryConfirm}
        onSave={(newCat) => {
          setCategories((prev) => [...prev, newCat]);
          setIsAddCategoryModalOpen(false);
        }}
        existingCategories={categories.map((c) => c.name)}
      />

      {/* Edit Visitor Category Modal */}
      <AddEditVisitorCategoryModal
        isOpen={Boolean(editingCategory)}
        category={editingCategory}
        onClose={() => setEditingCategory(null)}
        onSave={(updatedCat) => {
          setCategories((prev) =>
            prev.map((c) => (c.id === updatedCat.id ? updatedCat : c))
          );
          setEditingCategory(null);
        }}
        existingCategories={categories
          .filter((c) => c.id !== editingCategory?.id)
          .map((c) => c.name)}
      />

      {/* Configure Stations Modal */}
      <ConfigureStationsModal
        isOpen={isConfigureStationsModalOpen}
        onClose={() => setIsConfigureStationsModalOpen(false)}
        initialMultiStation={isMultiStation}
        initialRoundTrip={isRoundTrip}
        initialStations={configuredStations}
        onSave={(config) => {
          setIsMultiStation(config.isMultiStation);
          setIsRoundTrip(config.isRoundTrip);
          setConfiguredStations(config.stations);
        }}
      />
    </form>
  );
}
