"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  ShoppingCart,
  Trash2,
  Check,
  Plus,
  Minus,
  Users,
  X,
} from "lucide-react";
import { Attraction, INITIAL_ATTRACTIONS } from "@/app/(dashboard)/attraction-management/types";
import CustomerInfoView from "./CustomerInfoView";

export const SIDEBAR_COLLAPSE_EVENT = "tbv:sidebar-collapse";

function normalizeAttractionImage(img?: string | null): string {
  if (!img) return "/Assets/Attractions/Toy_Train.jpg";
  return img.replace("/Assets/Attraction/", "/Assets/Attractions/");
}

function loadAttractions(): Attraction[] {
  if (typeof window === "undefined") return INITIAL_ATTRACTIONS;
  try {
    const raw = sessionStorage.getItem("attractions_data");
    const parsed = raw ? (JSON.parse(raw) as Attraction[]) : [];
    if (parsed.length > 0) {
      return parsed.map((a) => ({
        ...a,
        image: normalizeAttractionImage(a.image),
      }));
    }
    return INITIAL_ATTRACTIONS;
  } catch {
    return INITIAL_ATTRACTIONS;
  }
}

export type CategoryKey = "adult" | "child" | "senior" | "student" | "foreigner";

export interface VisitorCategoryMeta {
  key: CategoryKey;
  label: string;
  subLabel?: string;
  image: string;
  defaultPrice: number;
}

export const VISITOR_CATEGORIES: VisitorCategoryMeta[] = [
  { key: "adult", label: "Adult", subLabel: "General entry", image: "/Assets/Visitors/Adult.jpg", defaultPrice: 100 },
  { key: "child", label: "Child", subLabel: "5–12 yrs", image: "/Assets/Visitors/Child.jpg", defaultPrice: 50 },
  { key: "student", label: "Student", subLabel: "ID Required", image: "/Assets/Visitors/Student.jpg", defaultPrice: 60 },
  { key: "foreigner", label: "Foreigner", subLabel: "Passport verification", image: "/Assets/Visitors/Foreigner.jpg", defaultPrice: 500 },
  { key: "senior", label: "Senior Citizen", subLabel: "60+ yrs", image: "", defaultPrice: 75 },
];

interface CartEntry {
  attraction: Attraction;
  quantities: Record<CategoryKey, number>;
}

const EMPTY_QTY: Record<CategoryKey, number> = { adult: 0, child: 0, senior: 0, student: 0, foreigner: 0 };
const GST_RATE = 0.18;

function calcEntry(entry: CartEntry) {
  const subtotal = VISITOR_CATEGORIES.reduce(
    (s, c) => s + (entry.quantities[c.key] || 0) * (entry.attraction.pricing[c.key] ?? c.defaultPrice), 0
  );
  const gst = parseFloat((subtotal * GST_RATE).toFixed(2));
  const rawTotal = subtotal + gst;
  const rounded = Math.round(rawTotal);
  const roundOff = parseFloat((rounded - rawTotal).toFixed(2));
  const gstAdj = -parseFloat((gst - Math.floor(gst)).toFixed(2));
  return { subtotal, gst, gstAdj, roundOff, total: rounded };
}

function getAttractionBaseMetaDetails(attraction: Attraction) {
  const prices = Object.values(attraction.pricing).filter((p) => p > 0);
  const minP = Math.min(...prices);
  const adultP = attraction.pricing.adult || Math.max(...prices);

  let duration = "20min / trip";
  let seats = "24";
  let trips = 8;

  const lowerName = attraction.name.toLowerCase();
  if (lowerName.includes("ropeway")) {
    duration = "15min / trip";
    seats = "6";
    trips = 12;
  } else if (lowerName.includes("museum")) {
    duration = "45min / tour";
    seats = "50";
    trips = 6;
  } else if (lowerName.includes("park")) {
    duration = "60min / tour";
    seats = "100";
    trips = 4;
  } else if (lowerName.includes("mahal")) {
    duration = "30min / visit";
    seats = "40";
    trips = 8;
  } else if (lowerName.includes("fort")) {
    duration = "45min / tour";
    seats = "80";
    trips = 6;
  }

  return {
    baseRate: `₹${minP}–₹${adultP} / person`,
    duration,
    seats,
    defaultTrips: trips,
  };
}

// ── Castle Sketch Illustration Component ──────────────────────────────────────
function CastleIllustration() {
  return (
    <svg
      width="105"
      height="64"
      viewBox="0 0 120 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ overflow: "visible" }}
    >
      {/* Birds */}
      <path
        d="M20 20 C23 17 26 20 29 17 C32 20 35 17 38 20"
        stroke="#1E4D74"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M74 13 C76 10 78 13 80 10 C82 13 84 10 86 13"
        stroke="#1E4D74"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
      />

      {/* Cloud */}
      <path
        d="M78 28 C78 25 82 23 85 25 C88 22 93 23 96 26 C99 26 102 28 101 32 C99 33 80 33 78 28 Z"
        stroke="#1E4D74"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Hill base contours */}
      <path
        d="M5 76 C20 73 35 67 55 63 C75 59 95 65 115 76"
        stroke="#1E4D74"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M15 77 C30 70 50 65 65 64"
        stroke="#1E4D74"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      <path
        d="M72 64 C85 67 100 72 108 77"
        stroke="#1E4D74"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      <path
        d="M48 67 C55 66 62 66 70 68"
        stroke="#1E4D74"
        strokeWidth="1.1"
        strokeLinecap="round"
      />

      {/* Left Tower Outer */}
      <path
        d="M26 68 L26 49 L29 49 L29 51 L31 51 L31 49 L33 49 L33 51 L35 51 L35 49 L38 49 L38 67"
        stroke="#1E4D74"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="29.5" y="55" width="2" height="3.5" rx="1" fill="#1E4D74" />

      {/* Left Inner Wall */}
      <path
        d="M38 63 L44 63 L44 43 L47 43 L47 45 L49 45 L49 43 L52 43 L52 45 L54 45 L54 43 L57 43 L57 60"
        stroke="#1E4D74"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="47" y="49" width="2" height="4" rx="1" fill="#1E4D74" />
      <rect x="52" y="49" width="2" height="4" rx="1" fill="#1E4D74" />

      {/* Main Center Tower */}
      <path
        d="M57 60 L57 32 L55 32 L55 30 L67 30 L67 32 L65 32 L65 60"
        stroke="#1E4D74"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Flagpole & Flag */}
      <path d="M61 30 L61 17 L68 20.5 L61 24" stroke="#1E4D74" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="59.5" y="36" width="3" height="5" rx="1.5" fill="#1E4D74" />
      <path d="M59 54 Q61 50 63 54 L63 60 L59 60 Z" stroke="#1E4D74" strokeWidth="1.3" fill="#1E4D74" fillOpacity="0.15" />

      {/* Right Inner Wall */}
      <path
        d="M65 60 L65 43 L68 43 L68 45 L70 45 L70 43 L73 43 L73 45 L75 45 L75 43 L78 43 L78 63 L84 63"
        stroke="#1E4D74"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="68" y="49" width="2" height="4" rx="1" fill="#1E4D74" />
      <rect x="73" y="49" width="2" height="4" rx="1" fill="#1E4D74" />

      {/* Right Tower Outer */}
      <path
        d="M84 67 L84 49 L87 49 L87 51 L89 51 L89 49 L91 49 L91 51 L93 51 L93 49 L96 49 L96 68"
        stroke="#1E4D74"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="89" y="55" width="2" height="3.5" rx="1" fill="#1E4D74" />
    </svg>
  );
}

// ── Initial Grid Card Component (No Price display per user request) ───────────
function GridAttractionCard({
  attraction,
  onSelect,
}: {
  attraction: Attraction;
  onSelect: () => void;
}) {
  const [imgErr, setImgErr] = useState(false);
  const imageSrc = normalizeAttractionImage(attraction.image);

  return (
    <div
      onClick={onSelect}
      className="tbv-grid-card"
      style={{
        background: "#FFFFFF",
        border: "1.5px solid rgba(179,175,175,0.35)",
        borderRadius: "14px",
        cursor: "pointer",
        overflow: "hidden",
        boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
        transition: "all 0.2s cubic-bezier(0.4,0,0.2,1)",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      {/* Cover Image */}
      <div
        style={{
          width: "100%",
          height: "145px",
          background: "linear-gradient(135deg,#0C2A42 0%,#2372A5 100%)",
          position: "relative",
          flexShrink: 0,
          overflow: "hidden",
        }}
      >
        {imageSrc && !imgErr ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageSrc}
            alt={attraction.name}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={() => setImgErr(true)}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#FFFFFF",
              fontSize: "28px",
              fontWeight: 800,
              opacity: 0.6,
            }}
          >
            {attraction.name.slice(0, 2).toUpperCase()}
          </div>
        )}
      </div>

      {/* Info Body */}
      <div style={{ padding: "12px 14px 14px" }}>
        <h4
          style={{
            margin: "0 0 3px",
            fontSize: "13.5px",
            fontWeight: 800,
            color: "#011B2F",
            letterSpacing: "-0.2px",
          }}
        >
          {attraction.name}
        </h4>
        <p style={{ margin: "0 0 6px", fontSize: "11px", fontWeight: 600, color: "#64748B" }}>
          {attraction.category}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <div
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: "#22C55E",
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: "10.5px", fontWeight: 600, color: "#22C55E" }}>Available</span>
        </div>
      </div>
    </div>
  );
}

// ── Vertical Compact Attraction Card (Column 1) ──────────────────────────────
function VerticalAttractionCard({
  attraction,
  isSelected,
  isActive,
  onSetActive,
}: {
  attraction: Attraction;
  isSelected: boolean;
  isActive: boolean;
  onSetActive: () => void;
}) {
  const [imgErr, setImgErr] = useState(false);
  const imageSrc = normalizeAttractionImage(attraction.image);

  return (
    <div
      onClick={onSetActive}
      className="attraction-vert-card"
      style={{
        width: "100%",
        background: "#FFFFFF",
        border:
          isActive || isSelected
            ? "2px solid #F4BC43"
            : "1.5px solid rgba(179,175,175,0.35)",
        borderRadius: "10px",
        padding: "8px 10px",
        cursor: "pointer",
        position: "relative",
        boxShadow:
          isActive || isSelected
            ? "0 3px 12px rgba(244,188,67,0.2)"
            : "0 1px 3px rgba(0,0,0,0.03)",
        transition: "all 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        boxSizing: "border-box",
      }}
    >
      {/* Thumbnail */}
      <div
        style={{
          width: "42px",
          height: "42px",
          borderRadius: "6px",
          overflow: "hidden",
          background: "linear-gradient(135deg,#0C2A42 0%,#2372A5 100%)",
          position: "relative",
          flexShrink: 0,
        }}
      >
        {imageSrc && !imgErr ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageSrc}
            alt={attraction.name}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={() => setImgErr(true)}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: "10px",
              fontWeight: 700,
            }}
          >
            {attraction.name.slice(0, 3)}
          </div>
        )}
      </div>

      {/* Name and Category */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "2px" }}>
        <h4
          style={{
            margin: 0,
            fontSize: "12px",
            fontWeight: 700,
            color: "#011B2F",
            lineHeight: "15px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {attraction.name}
        </h4>
        <p style={{ margin: 0, fontSize: "10px", fontWeight: 600, color: "#64748B" }}>
          {attraction.category}
        </p>
      </div>
    </div>
  );
}

// ── Visitor Category Card (Column 2) ──────────────────────────────────────────
function VisitorCategoryCard({
  category,
  isSelected,
  onToggle,
  price,
}: {
  category: VisitorCategoryMeta;
  isSelected: boolean;
  onToggle: () => void;
  price?: number;
}) {
  const [imgErr, setImgErr] = useState(false);

  return (
    <div
      onClick={onToggle}
      className="visitor-category-card"
      style={{
        width: "100%",
        background: isSelected ? "rgba(244,188,67,0.08)" : "#FFFFFF",
        border: isSelected ? "2px solid #F4BC43" : "1.5px solid rgba(179,175,175,0.4)",
        borderRadius: "10px",
        padding: "12px 10px 10px",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: "8px",
        position: "relative",
        boxShadow: isSelected
          ? "0 3px 12px rgba(244,188,67,0.2)"
          : "0 1px 3px rgba(0,0,0,0.03)",
        transition: "all 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
        userSelect: "none",
        boxSizing: "border-box",
      }}
    >
      <h4
        style={{
          margin: 0,
          fontWeight: 700,
          fontSize: "12.5px",
          color: isSelected ? "#002A45" : "#173F63",
          letterSpacing: "-0.2px",
        }}
      >
        {category.label}
      </h4>

      {/* Circular Avatar Photo */}
      <div
        style={{
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          border: isSelected ? "2.5px solid #F4BC43" : "2px solid #E2E8F0",
          overflow: "hidden",
          background: "#F8FAFC",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
        }}
      >
        {category.image && !imgErr ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={category.image}
            alt={category.label}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={() => setImgErr(true)}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              background: "linear-gradient(135deg,#CBD5E1 0%,#94A3B8 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#FFFFFF",
              fontWeight: 800,
              fontSize: "16px",
            }}
          >
            {category.label.charAt(0)}
          </div>
        )}
      </div>

      {/* Price & Subtitle */}
      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        {price !== undefined && (
          <span style={{ fontSize: "11.5px", fontWeight: 700, color: "#173F63" }}>
            ₹{price}{" "}
            <span style={{ fontSize: "9.5px", fontWeight: 500, color: "#64748B" }}>/ person</span>
          </span>
        )}
        {category.subLabel && (
          <span style={{ fontSize: "9.5px", fontWeight: 600, color: "#94A3B8" }}>
            {category.subLabel}
          </span>
        )}
      </div>

      {/* Checkmark indicator */}
      {isSelected && (
        <div
          style={{
            position: "absolute",
            top: "6px",
            right: "6px",
            width: "16px",
            height: "16px",
            borderRadius: "50%",
            background: "#F4BC43",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Check size={10} color="#002A45" strokeWidth={3} />
        </div>
      )}
    </div>
  );
}

// ── Manually Editable Stepper Component (No brackets, editable input) ─────────
function Stepper({
  value,
  onDec,
  onInc,
  onChange,
}: {
  value: number;
  onDec: () => void;
  onInc: () => void;
  onChange: (val: number) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", userSelect: "none" }}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDec();
        }}
        aria-label="Decrease quantity"
        style={{
          width: "28px",
          height: "28px",
          background: "#FFFFFF",
          border: "1px solid rgba(179,175,175,0.4)",
          borderRadius: "5px 0 0 5px",
          cursor: "pointer",
          fontWeight: 700,
          fontSize: "13px",
          color: "#173F63",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.15s ease",
        }}
      >
        <Minus size={12} strokeWidth={2.5} />
      </button>

      {/* Editable input without square brackets */}
      <input
        type="number"
        min={0}
        value={value === 0 ? "" : value}
        placeholder="0"
        onChange={(e) => {
          const val = parseInt(e.target.value, 10);
          onChange(isNaN(val) ? 0 : Math.max(0, val));
        }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "36px",
          height: "28px",
          padding: "0 2px",
          background: "#FFFFFF",
          borderTop: "1px solid rgba(179,175,175,0.4)",
          borderBottom: "1px solid rgba(179,175,175,0.4)",
          borderLeft: "none",
          borderRight: "none",
          textAlign: "center",
          fontWeight: 700,
          fontSize: "12px",
          color: "#173F63",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          outline: "none",
          boxSizing: "border-box",
        }}
      />

      <button
        onClick={(e) => {
          e.stopPropagation();
          onInc();
        }}
        aria-label="Increase quantity"
        style={{
          width: "28px",
          height: "28px",
          background: "#FFFFFF",
          border: "1px solid rgba(179,175,175,0.4)",
          borderRadius: "0 5px 5px 0",
          cursor: "pointer",
          fontWeight: 700,
          fontSize: "13px",
          color: "#173F63",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.15s ease",
        }}
      >
        <Plus size={12} strokeWidth={2.5} />
      </button>
    </div>
  );
}

// ── Main Ticket Booking Component ─────────────────────────────────────────────
export default function TicketBookingView() {
  const [allAttractions, setAllAttractions] = useState<Attraction[]>([]);

  // Mode: "grid" = initial available attractions, "booking" = selection view, "customer-info" = full separate page
  const [mode, setMode] = useState<"grid" | "booking" | "customer-info">("grid");

  // Multi-selected attractions (Set of IDs) - Initially EMPTY
  const [selectedAttractionIds, setSelectedAttractionIds] = useState<Set<string>>(new Set());

  // Focused attraction for visitor categories panel
  const [activeAttractionId, setActiveAttractionId] = useState<string | null>(null);

  // Per-attraction visitor categories: Map<attractionId, Set<CategoryKey>> - Initially EMPTY
  const [attractionCategories, setAttractionCategories] = useState<Map<string, Set<CategoryKey>>>(new Map());

  // Cart state
  const [cart, setCart] = useState<CartEntry[]>([]);

  // Available trips counter per attraction (decrements on booking)
  const [availableTripsMap, setAvailableTripsMap] = useState<Record<string, number>>({});

  useEffect(() => {
    document.title = "Ticket Booking | Ticketing Solution";
    const attractions = loadAttractions().filter((a) => a.status === "Active");
    setAllAttractions(attractions);
    // Initialize available trips map
    const tripsInit: Record<string, number> = {};
    attractions.forEach((a) => {
      tripsInit[a.id] = getAttractionBaseMetaDetails(a).defaultTrips;
    });
    setAvailableTripsMap(tripsInit);
  }, []);

  // Sync sidebar collapse state
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent(SIDEBAR_COLLAPSE_EVENT, { detail: { collapsed: mode === "booking" || mode === "customer-info" } })
      );
    }
  }, [mode]);

  // Restore sidebar on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent(SIDEBAR_COLLAPSE_EVENT, { detail: { collapsed: false } })
        );
      }
    };
  }, []);

  const activeAttraction = useMemo(
    () => allAttractions.find((a) => a.id === activeAttractionId) || null,
    [allAttractions, activeAttractionId]
  );

  const selectedAttractionsList = useMemo(
    () => allAttractions.filter((a) => selectedAttractionIds.has(a.id)),
    [allAttractions, selectedAttractionIds]
  );

  // Helper to get selected categories for a given attraction
  const getCategoriesForAttraction = useCallback(
    (attractionId: string): Set<CategoryKey> => {
      return attractionCategories.get(attractionId) || new Set();
    },
    [attractionCategories]
  );

  // Total count of categories selected across all attractions
  const totalSelectedCategoriesCount = useMemo(() => {
    let count = 0;
    attractionCategories.forEach((set) => {
      count += set.size;
    });
    return count;
  }, [attractionCategories]);

  // Clicking an attraction card on the initial grid immediately selects it and enters booking mode
  function handleSelectGridAttraction(id: string) {
    setSelectedAttractionIds(new Set([id]));
    setActiveAttractionId(id);
    setMode("booking");
  }

  // Toggle category selection for active attraction
  function handleToggleCategory(key: CategoryKey) {
    if (!activeAttractionId || !activeAttraction) return;

    setAttractionCategories((prev) => {
      const next = new Map(prev);
      const current = new Set(next.get(activeAttractionId) || []);

      if (current.has(key)) {
        // Deselect -> remove from cart
        current.delete(key);
        setCart((prevCart) => {
          const idx = prevCart.findIndex((e) => e.attraction.id === activeAttractionId);
          if (idx < 0) return prevCart;
          const baseQty = { ...prevCart[idx].quantities };
          baseQty[key] = 0;
          const hasAny = Object.values(baseQty).some((v) => v > 0);
          if (!hasAny) return prevCart.filter((_, i) => i !== idx);
          return prevCart.map((e, i) => (i === idx ? { ...e, quantities: baseQty } : e));
        });
      } else {
        // Select -> add with quantity 1
        current.add(key);
        setCart((prevCart) => {
          const idx = prevCart.findIndex((e) => e.attraction.id === activeAttractionId);
          const baseQty: Record<CategoryKey, number> =
            idx >= 0 ? { ...prevCart[idx].quantities } : { ...EMPTY_QTY };
          if (!baseQty[key] || baseQty[key] === 0) {
            baseQty[key] = 1;
          }
          const newEntry: CartEntry = { attraction: activeAttraction, quantities: baseQty };
          if (idx >= 0) {
            return prevCart.map((e, i) => (i === idx ? newEntry : e));
          }
          return [...prevCart, newEntry];
        });
      }

      next.set(activeAttractionId, current);
      return next;
    });
  }

  // Toggle attraction selection in booking column 1
  function handleToggleAttractionSelect(id: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setSelectedAttractionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        if (activeAttractionId === id) {
          const remaining = Array.from(next);
          setActiveAttractionId(remaining[0] || null);
        }
        setAttractionCategories((prevCats) => {
          const nm = new Map(prevCats);
          nm.delete(id);
          return nm;
        });
        setCart((prevCart) => prevCart.filter((e) => e.attraction.id !== id));
      } else {
        next.add(id);
        setActiveAttractionId(id);
      }
      return next;
    });
  }

  // Set explicit quantity (typed in or from stepper buttons)
  function setQuantity(key: CategoryKey, explicitValue: number, attractionOverride?: Attraction) {
    const targetAttraction = attractionOverride || activeAttraction;
    if (!targetAttraction) return;

    setCart((prev) => {
      const idx = prev.findIndex((e) => e.attraction.id === targetAttraction.id);
      const baseQty: Record<CategoryKey, number> =
        idx >= 0 ? { ...prev[idx].quantities } : { ...EMPTY_QTY };
      const newVal = Math.max(0, explicitValue);
      baseQty[key] = newVal;

      const newEntry: CartEntry = { attraction: targetAttraction, quantities: baseQty };
      const hasAny = Object.values(baseQty).some((v) => v > 0);

      // If quantity is 0, remove this category from the middle panel selection
      if (newVal === 0) {
        setAttractionCategories((prevCats) => {
          const nm = new Map(prevCats);
          const cats = new Set(nm.get(targetAttraction.id) || []);
          cats.delete(key);
          nm.set(targetAttraction.id, cats);
          return nm;
        });
      }

      if (idx >= 0) {
        if (!hasAny) return prev.filter((_, i) => i !== idx);
        return prev.map((e, i) => (i === idx ? newEntry : e));
      } else {
        if (!hasAny) return prev;
        return [...prev, newEntry];
      }
    });

    setSelectedAttractionIds((prev) => new Set([...prev, targetAttraction.id]));
  }

  // Remove entire attraction from cart
  function removeCartEntry(attractionId: string) {
    setCart((prev) => prev.filter((e) => e.attraction.id !== attractionId));
    setAttractionCategories((prev) => {
      const next = new Map(prev);
      next.delete(attractionId);
      return next;
    });
  }

  // Clear entire cart
  function handleClearCart() {
    setCart([]);
    setAttractionCategories(new Map());
  }

  const hasCartItems = cart.some((e) => Object.values(e.quantities).some((v) => v > 0));
  const totalCartAmount = cart.reduce((sum, e) => sum + calcEntry(e).total, 0);

  const bookingSummary = cart.map((e) => ({
    attractionName: e.attraction.name,
    passengers: VISITOR_CATEGORIES.filter((c) => (e.quantities[c.key] || 0) > 0).map((c) => ({
      label: c.label,
      qty: e.quantities[c.key],
    })),
    totalAmount: calcEntry(e).total,
  }));

  // ── 3. FULL SEPARATE PAGE: CUSTOMER INFORMATION ──────────────────────────────
  if (mode === "customer-info") {
    return (
      <CustomerInfoView
        bookingSummary={bookingSummary}
        onBack={() => setMode("booking")}
        onContinue={(customer) => {
          // Decrement available trips for each attraction in cart
          setAvailableTripsMap((prev) => {
            const next = { ...prev };
            cart.forEach((e) => {
              const cur = next[e.attraction.id] ?? 0;
              next[e.attraction.id] = Math.max(0, cur - 1);
            });
            return next;
          });
          setCart([]);
          setAttractionCategories(new Map());
          setSelectedAttractionIds(new Set());
          setMode("grid");
        }}
      />
    );
  }

  // ── 1. INITIAL FULL-PAGE GRID VIEW (No Search Bar, No Price per user request) ──
  if (mode === "grid") {
    return (
      <div
        style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          width: "100%",
          boxSizing: "border-box",
          paddingBottom: "24px",
        }}
      >
        {/* Section Heading */}
        <div style={{ marginBottom: "18px" }}>
          <h2
            style={{
              margin: 0,
              fontSize: "18px",
              fontWeight: 800,
              color: "#011B2F",
              letterSpacing: "-0.3px",
            }}
          >
            Assigned Attractions
          </h2>
        </div>

        {/* Attractions Grid */}
        <div className="tbv-initial-grid">
          {allAttractions.map((attraction) => (
            <GridAttractionCard
              key={attraction.id}
              attraction={attraction}
              onSelect={() => handleSelectGridAttraction(attraction.id)}
            />
          ))}
        </div>

        {/* Grid Styles */}
        <style jsx global>{`
          .tbv-initial-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 20px;
          }
          .tbv-grid-card:hover {
            transform: translateY(-2px);
            border-color: #f4bc43 !important;
            box-shadow: 0 8px 24px rgba(244, 188, 67, 0.2) !important;
          }
        `}</style>
      </div>
    );
  }

  // ── 2. BOOKING SELECTION VIEW ────────────────────────────────────────────────
  const selectedCategoryKeysForActive = activeAttractionId
    ? getCategoriesForAttraction(activeAttractionId)
    : new Set<CategoryKey>();

  const showBillingColumn = totalSelectedCategoriesCount > 0;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* Top Bar with Back button */}
      <div style={{ marginBottom: "12px", display: "flex", alignItems: "center", gap: "12px" }}>
        <button
          onClick={() => {
            setMode("grid");
            setSelectedAttractionIds(new Set());
            setActiveAttractionId(null);
            setAttractionCategories(new Map());
            setCart([]);
          }}
          className="tbv-back-btn"
          style={{
            background: "#FFFFFF",
            border: "1.5px solid #CBD5E1",
            borderRadius: "8px",
            padding: "6px 14px",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 700,
            fontSize: "12px",
            color: "#173F63",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
            transition: "all 0.15s ease",
          }}
        >
          ← Back to Attractions
        </button>
        <span style={{ fontSize: "11.5px", fontWeight: 700, color: "#64748B" }}>
          {selectedAttractionIds.size} Attraction{selectedAttractionIds.size !== 1 ? "s" : ""} Selected
        </span>
      </div>

      {/* Dynamic Grid Layout */}
      <div
        className={
          showBillingColumn ? "tbv-layout-three-col" : "tbv-layout-two-col"
        }
      >
        {/* ── COLUMN 1: ATTRACTIONS (Vertical Compact List) ── */}
        <div
          style={{
            background: "#FFFFFF",
            borderRadius: "12px",
            padding: "16px 12px",
            border: "1px solid rgba(179,175,175,0.3)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            height: "calc(100vh - 145px)",
            boxSizing: "border-box",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "6px",
              flexShrink: 0,
              paddingBottom: "2px",
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: "14px",
                fontWeight: 800,
                color: "#011B2F",
                letterSpacing: "-0.2px",
              }}
            >
              Attractions
            </h3>
            <span
              style={{
                background: selectedAttractionIds.size > 0 ? "rgba(244,188,67,0.15)" : "#F1F5F9",
                color: selectedAttractionIds.size > 0 ? "#173F63" : "#64748B",
                fontSize: "10px",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "20px",
                border: selectedAttractionIds.size > 0 ? "1px solid rgba(244,188,67,0.4)" : "1px solid #E2E8F0",
              }}
            >
              {selectedAttractionIds.size} Selected
            </span>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              flex: 1,
              overflowY: "auto",
              padding: "4px 2px 8px 2px",
            }}
            className="tbv-scroll-col"
          >
            {allAttractions.map((attraction) => {
              const isSelected = selectedAttractionIds.has(attraction.id);
              const isActive = activeAttractionId === attraction.id;
              return (
                <VerticalAttractionCard
                  key={attraction.id}
                  attraction={attraction}
                  isSelected={isSelected}
                  isActive={isActive}
                  onSetActive={() => {
                    if (isActive && isSelected) {
                      // Clicking active+selected => deselect it
                      handleToggleAttractionSelect(attraction.id);
                    } else if (!isSelected) {
                      setSelectedAttractionIds((prev) => new Set([...prev, attraction.id]));
                      setActiveAttractionId(attraction.id);
                    } else {
                      // Already selected but not active – just switch active
                      setActiveAttractionId(attraction.id);
                    }
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* ── COLUMN 2: VISITOR CATEGORIES (For Active Attraction) ── */}
        <div
          style={{
            background: "#FFFFFF",
            borderRadius: "12px",
            padding: "16px 18px",
            border: "1px solid rgba(179,175,175,0.3)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            height: "calc(100vh - 145px)",
            boxSizing: "border-box",
            overflow: "hidden",
          }}
        >
          {activeAttraction && (() => {
            const meta = getAttractionBaseMetaDetails(activeAttraction);
            return (
              <div
                style={{
                  flexShrink: 0,
                  paddingBottom: "12px",
                  borderBottom: "1px solid #E2E8F0",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: "16px",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", flex: 1, minWidth: 0 }}>
                    <h2
                      style={{
                        margin: 0,
                        fontSize: "20px",
                        fontWeight: 800,
                        color: "#011B2F",
                        letterSpacing: "-0.3px",
                      }}
                    >
                      {activeAttraction.name}
                    </h2>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "16px",
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          background: "#F1F5F9",
                          color: "#475569",
                          fontSize: "11px",
                          fontWeight: 600,
                          padding: "2.5px 7px",
                          borderRadius: "4px",
                          alignSelf: "flex-start",
                        }}
                      >
                        {activeAttraction.category}
                      </span>

                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "3px",
                          fontSize: "11.5px",
                          color: "#64748B",
                        }}
                      >
                        <div>
                          <span>Base Rate: </span>
                          <span style={{ color: "#0E4E7A", fontWeight: 700 }}>{meta.baseRate}</span>
                        </div>
                        <div>
                          <span>Duration: </span>
                          <span style={{ color: "#0E4E7A", fontWeight: 700 }}>{meta.duration}</span>
                        </div>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "3px",
                          fontSize: "11.5px",
                          color: "#64748B",
                          marginLeft: "8px",
                        }}
                      >
                        <div>
                          <span>Seats per trip: </span>
                          <span style={{ color: "#0E4E7A", fontWeight: 700 }}>{meta.seats}</span>
                        </div>
                        <div>
                          <span>Available trips today: </span>
                          <span style={{ color: availableTripsMap[activeAttraction.id] === 0 ? "#EF4444" : "#0E4E7A", fontWeight: 700 }}>
                            {availableTripsMap[activeAttraction.id] ?? meta.defaultTrips}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Castle Sketch Illustration */}
                  <div
                    style={{
                      flexShrink: 0,
                      width: "105px",
                      height: "64px",
                      display: "flex",
                      alignItems: "flex-end",
                      justifyContent: "flex-end",
                    }}
                  >
                    <CastleIllustration />
                  </div>
                </div>
              </div>
            );
          })()}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "6px",
              flexShrink: 0,
            }}
          >
            <div>
              <h3
                style={{
                  margin: "0 0 3px",
                  fontSize: "14.5px",
                  fontWeight: 800,
                  color: "#011B2F",
                  letterSpacing: "-0.2px",
                }}
              >
                Visitor Categories {activeAttraction ? `(${activeAttraction.name})` : ""}
              </h3>
              <p style={{ margin: 0, fontSize: "11px", fontWeight: 600, color: "#64748B" }}>
                {activeAttraction
                  ? "Click cards to select visitor categories for this attraction"
                  : "Select an attraction from the left list"}
              </p>
            </div>

            {activeAttraction && (
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  onClick={() => {
                    VISITOR_CATEGORIES.forEach((c) => {
                      if (!selectedCategoryKeysForActive.has(c.key)) {
                        handleToggleCategory(c.key);
                      }
                    });
                  }}
                  style={{
                    background: "transparent",
                    border: "1px solid #CBD5E1",
                    borderRadius: "5px",
                    padding: "3px 9px",
                    fontSize: "10.5px",
                    fontWeight: 700,
                    color: "#173F63",
                    cursor: "pointer",
                  }}
                >
                  All
                </button>
                {selectedCategoryKeysForActive.size > 0 && (
                  <button
                    onClick={() => {
                      selectedCategoryKeysForActive.forEach((k) => handleToggleCategory(k));
                    }}
                    style={{
                      background: "transparent",
                      border: "1px solid #CBD5E1",
                      borderRadius: "5px",
                      padding: "3px 9px",
                      fontSize: "10.5px",
                      fontWeight: 700,
                      color: "#64748B",
                      cursor: "pointer",
                    }}
                  >
                    Clear
                  </button>
                )}
              </div>
            )}
          </div>

          {!activeAttraction ? (
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                gap: "10px",
                background: "rgba(248,250,252,0.6)",
                borderRadius: "10px",
                border: "1.5px dashed #CBD5E1",
                padding: "20px",
              }}
            >
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "50%",
                  background: "rgba(244,188,67,0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Users size={22} color="#F4BC43" />
              </div>
              <h4 style={{ margin: 0, fontSize: "13.5px", fontWeight: 700, color: "#173F63" }}>
                No Attraction Selected
              </h4>
              <p style={{ margin: 0, fontSize: "11px", fontWeight: 500, color: "#64748B" }}>
                Please select an attraction from the left list to view categories
              </p>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: showBillingColumn
                  ? "repeat(auto-fill, minmax(125px, 1fr))"
                  : "repeat(auto-fill, minmax(150px, 1fr))",
                gap: "12px",
                flex: 1,
                overflowY: "auto",
                padding: "4px 2px 8px 2px",
                alignContent: "start",
              }}
              className="tbv-scroll-col"
            >
              {VISITOR_CATEGORIES.map((category) => {
                const isSelected = selectedCategoryKeysForActive.has(category.key);
                const price = activeAttraction.pricing[category.key] ?? category.defaultPrice;
                return (
                  <VisitorCategoryCard
                    key={category.key}
                    category={category}
                    isSelected={isSelected}
                    price={price}
                    onToggle={() => handleToggleCategory(category.key)}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* ── COLUMN 3: CATEGORIES & QUANTITY + CART & BILLING ── */}
        {showBillingColumn && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              height: "calc(100vh - 145px)",
              overflow: "hidden",
              padding: "2px 2px 8px 2px",
              boxSizing: "border-box",
            }}
          >
            {/* Categories & Quantity Card */}
            <div
              style={{
                background: "#FFFFFF",
                border: "1.5px solid rgba(179,175,175,0.45)",
                borderRadius: "12px",
                padding: "12px 14px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
                flex: "0 1 auto",
                maxHeight: "40%",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              <h3
                style={{
                  margin: "0 0 8px",
                  fontWeight: 800,
                  fontSize: "13.5px",
                  color: "#011B2F",
                  flexShrink: 0,
                }}
              >
                Categories &amp; Quantity
              </h3>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  overflowY: "auto",
                  flex: 1,
                  minHeight: 0,
                  paddingRight: "2px",
                }}
                className="tbv-scroll-col"
              >
                {selectedAttractionsList.map((attr) => {
                  const cats = getCategoriesForAttraction(attr.id);
                  const cartEntry = cart.find((e) => e.attraction.id === attr.id);
                  const visibleCats = VISITOR_CATEGORIES.filter((c) => cats.has(c.key));

                  if (visibleCats.length === 0) return null;

                  return (
                    <div key={attr.id}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: "6px",
                          paddingBottom: "5px",
                          borderBottom: "1.5px solid rgba(226,232,240,0.8)",
                        }}
                      >
                        <span style={{ fontSize: "12px", fontWeight: 800, color: "#173F63" }}>
                          {attr.name}
                        </span>
                        <button
                          onClick={() => setActiveAttractionId(attr.id)}
                          style={{
                            background: activeAttractionId === attr.id ? "rgba(244,188,67,0.15)" : "transparent",
                            border: "1px solid rgba(244,188,67,0.4)",
                            borderRadius: "4px",
                            padding: "2px 8px",
                            fontSize: "10px",
                            fontWeight: 700,
                            color: "#173F63",
                            cursor: "pointer",
                          }}
                        >
                          {activeAttractionId === attr.id ? "Active" : "Switch"}
                        </button>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        {visibleCats.map((cat, idx) => {
                          const qty = cartEntry?.quantities[cat.key] || 0;
                          const price = attr.pricing[cat.key] ?? cat.defaultPrice;
                          const lineTotal = qty * price;

                          return (
                            <div
                              key={cat.key}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "6px 2px",
                                borderBottom:
                                  idx < visibleCats.length - 1
                                    ? "1px solid rgba(226,232,240,0.7)"
                                    : "none",
                                gap: "8px",
                              }}
                            >
                              <div style={{ flex: 1, minWidth: "85px" }}>
                                <p style={{ margin: 0, fontWeight: 700, fontSize: "11.5px", color: "#011B2F" }}>
                                  {cat.label}
                                </p>
                                <p style={{ margin: "1px 0 0", fontWeight: 600, fontSize: "10px", color: "#64748B" }}>
                                  ₹{price} / person
                                </p>
                              </div>

                              <Stepper
                                value={qty}
                                onDec={() => setQuantity(cat.key, qty - 1, attr)}
                                onInc={() => setQuantity(cat.key, qty + 1, attr)}
                                onChange={(newQty) => setQuantity(cat.key, newQty, attr)}
                              />

                              <div style={{ width: "48px", textAlign: "right" }}>
                                <span
                                  style={{
                                    fontWeight: 800,
                                    fontSize: "11.5px",
                                    color: lineTotal > 0 ? "#011B2F" : "#94A3B8",
                                  }}
                                >
                                  ₹{lineTotal}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Cart & Billing Card */}
            <div
              style={{
                background: "#FFFFFF",
                border: "1.5px solid rgba(179,175,175,0.45)",
                borderRadius: "12px",
                padding: "12px 14px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
                flex: 1,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                  flexShrink: 0,
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontWeight: 800,
                    fontSize: "13.5px",
                    color: "#011B2F",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <ShoppingCart size={15} color="#011B2F" /> Cart &amp; Billing
                </h3>
                {cart.length > 0 && (
                  <button
                    onClick={handleClearCart}
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "3px",
                      color: "#64748B",
                      fontSize: "10px",
                      fontWeight: 600,
                      padding: "2px 5px",
                      borderRadius: "4px",
                    }}
                  >
                    <Trash2 size={11} color="#64748B" /> Clear
                  </button>
                )}
              </div>

              {/* Inside Content: Scrollable Cart List */}
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  minHeight: 0,
                  paddingRight: "2px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
                className="tbv-scroll-col"
              >
                {cart.length === 0 ? (
                  <p
                    style={{
                      fontSize: "11px",
                      color: "#94A3B8",
                      fontWeight: 600,
                      textAlign: "center",
                      padding: "20px 0",
                      margin: "auto 0",
                    }}
                  >
                    No items in cart yet.
                  </p>
                ) : (
                  cart.map((entry) => {
                    const calc = calcEntry(entry);
                    const activeItemCategories = VISITOR_CATEGORIES.filter(
                      (c) => (entry.quantities[c.key] || 0) > 0
                    );

                    return (
                      <div
                        key={entry.attraction.id}
                        style={{
                          background: "rgba(248,250,252,0.7)",
                          border: "1px solid rgba(179,175,175,0.4)",
                          borderRadius: "8px",
                          padding: "10px 12px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom: "6px",
                          }}
                        >
                          <span style={{ fontWeight: 800, fontSize: "12px", color: "#011B2F" }}>
                            {entry.attraction.name}
                          </span>
                          <button
                            onClick={() => removeCartEntry(entry.attraction.id)}
                            title="Remove Attraction"
                            style={{
                              background: "transparent",
                              border: "none",
                              cursor: "pointer",
                              padding: "2px",
                              display: "flex",
                              alignItems: "center",
                              color: "#64748B",
                            }}
                          >
                            <Trash2 size={12} color="#64748B" />
                          </button>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                          {activeItemCategories.map((c) => {
                            const qty = entry.quantities[c.key];
                            const price = entry.attraction.pricing[c.key] ?? c.defaultPrice;
                            return (
                              <div
                                key={c.key}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  fontSize: "10.5px",
                                  color: "#334155",
                                  fontWeight: 600,
                                }}
                              >
                                <span>
                                  {c.label} × {qty}
                                </span>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                  <span style={{ fontWeight: 700 }}>₹{qty * price}</span>
                                  <button
                                    onClick={() => {
                                      setQuantity(c.key, 0, entry.attraction);
                                    }}
                                    title="Remove item"
                                    style={{
                                      background: "transparent",
                                      border: "none",
                                      cursor: "pointer",
                                      color: "#94A3B8",
                                      padding: "0 2px",
                                      display: "flex",
                                      alignItems: "center",
                                    }}
                                  >
                                    <X size={11} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}

                          <div
                            style={{
                              borderTop: "1px solid rgba(179,175,175,0.4)",
                              marginTop: "5px",
                              paddingTop: "5px",
                              display: "flex",
                              flexDirection: "column",
                              gap: "3px",
                              fontSize: "10.5px",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <span style={{ color: "#64748B", fontWeight: 600 }}>Subtotal</span>
                              <span style={{ fontWeight: 700, color: "#1E293B" }}>₹{calc.subtotal}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <span style={{ color: "#64748B", fontWeight: 600 }}>GST (18%)</span>
                              <span style={{ fontWeight: 700, color: "#1E293B" }}>₹{calc.gst.toFixed(2)}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <span style={{ color: "#94A3B8", fontWeight: 500, fontSize: "9px" }}>
                                Round-off GST Adj.
                              </span>
                              <span style={{ color: "#94A3B8", fontWeight: 500, fontSize: "9px" }}>
                                ₹{calc.gstAdj.toFixed(2)}
                              </span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <span style={{ color: "#64748B", fontWeight: 600 }}>Round-Off</span>
                              <span style={{ fontWeight: 700, color: "#1E293B" }}>₹{calc.roundOff.toFixed(2)}</span>
                            </div>
                          </div>

                          <div
                            style={{
                              borderTop: "1px solid rgba(179,175,175,0.4)",
                              marginTop: "3px",
                              paddingTop: "4px",
                              display: "flex",
                              justifyContent: "space-between",
                              fontSize: "11.5px",
                            }}
                          >
                            <span style={{ fontWeight: 800, color: "#011B2F" }}>Total Amount</span>
                            <span style={{ fontWeight: 800, color: "#011B2F" }}>₹{calc.total.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Fixed Bottom Section (Inside Viewport) */}
              <div
                style={{
                  flexShrink: 0,
                  marginTop: "8px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  paddingTop: "6px",
                }}
              >
                {cart.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 10px",
                      background: "rgba(244,188,67,0.12)",
                      border: "1.5px solid rgba(244,188,67,0.5)",
                      borderRadius: "7px",
                      fontSize: "12px",
                      fontWeight: 800,
                      color: "#011B2F",
                    }}
                  >
                    <span>Grand Total ({cart.length} Attraction{cart.length > 1 ? "s" : ""})</span>
                    <span>₹{totalCartAmount.toFixed(2)}</span>
                  </div>
                )}

                <button
                  onClick={() => {
                    if (hasCartItems) setMode("customer-info");
                  }}
                  disabled={!hasCartItems}
                  className="tbv-checkout-btn"
                  style={{
                    width: "100%",
                    height: "40px",
                    background: hasCartItems ? "#F4BC43" : "#E2E8F0",
                    border: "none",
                    borderRadius: "7px",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: 800,
                    fontSize: "12px",
                    color: hasCartItems ? "#002A45" : "#94A3B8",
                    cursor: hasCartItems ? "pointer" : "not-allowed",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    boxShadow: hasCartItems ? "0 4px 12px rgba(244,188,67,0.25)" : "none",
                    transition: "all 0.2s cubic-bezier(0.4,0,0.2,1)",
                  }}
                >
                  <ShoppingCart size={14} strokeWidth={2.4} />
                  Process To Checkout
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Responsive Layout Styles */}
      <style jsx global>{`
        .tbv-layout-two-col {
          display: grid;
          grid-template-columns: minmax(260px, 1fr) minmax(0, 3fr);
          gap: 16px;
          align-items: start;
          width: 100%;
        }

        .tbv-layout-three-col {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 2fr) minmax(0, 2fr);
          gap: 16px;
          align-items: start;
          width: 100%;
        }

        .attraction-vert-card:hover {
          border-color: #f4bc43 !important;
        }

        .visitor-category-card:hover {
          border-color: #f4bc43 !important;
        }

        .tbv-checkout-btn:hover:not(:disabled) {
          background: #e5af36 !important;
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(244, 188, 67, 0.35) !important;
        }

        .tbv-back-btn:hover {
          background: #f8fafc !important;
          border-color: #94a3b8 !important;
        }

        .tbv-scroll-col::-webkit-scrollbar {
          width: 4px;
        }
        .tbv-scroll-col::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .tbv-scroll-col::-webkit-scrollbar-track {
          background: transparent;
        }

        @media (max-width: 1100px) {
          .tbv-layout-three-col {
            grid-template-columns: 1fr 1fr;
          }
          .tbv-layout-two-col {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 680px) {
          .tbv-layout-three-col,
          .tbv-layout-two-col {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
