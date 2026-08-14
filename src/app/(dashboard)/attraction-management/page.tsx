"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  Plus,
  Upload,
  Clock,
  Pencil,
  Armchair,
  Trash2,
  ArrowLeft,
} from "lucide-react";
import { colors } from "@/lib/theme";
import { Attraction } from "@/types/admin";
import AttractionEmptyState from "@/components/attraction/AttractionEmptyState";
import AddEditAttractionForm from "@/components/attraction/AddEditAttractionForm";
import SeatAllocationModal from "@/components/modals/SeatAllocationModal";
import BulkUploadModal from "@/components/modals/BulkUploadModal";
import { useToast } from "@/components/ui/Toast";
import { confirmDelete } from "@/lib/notify";
import { SeatConfigData } from "@/components/modals/CreateSeatModal";

// ── SessionStorage key ─────────────────────────────────────────────────────
const SESSION_KEY = "attractions_data";

// ── Helpers ───────────────────────────────────────────────────────────────
function loadFromSession(): Attraction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Attraction[]) : [];
  } catch {
    return [];
  }
}

function saveToSession(data: Attraction[]) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
}

// ── Category badge color ───────────────────────────────────────────────────
const CATEGORY_COLOR: Record<string, string> = {
  Ride: "#F4BC43",
  Monument: "#F4BC43",
  Park: "#F4BC43",
  Museum: "#F4BC43",
  Fort: "#F4BC43",
  Show: "#F4BC43",
};

// ── Attraction Card ────────────────────────────────────────────────────────
interface AttractionCardProps {
  attraction: Attraction;
  onEdit: (attraction: Attraction) => void;
  onSeating: (attraction: Attraction) => void;
  onDelete: (attraction: Attraction) => void;
}

function AttractionCard({ attraction, onEdit, onSeating, onDelete }: AttractionCardProps) {
  const categoryColor = CATEGORY_COLOR[attraction.category] ?? "#F4BC43";
  const [imgError, setImgError] = useState(false);

  return (
    <div
      style={{
        boxSizing: "border-box",
        width: "100%",
        maxWidth: "237px",
        minHeight: "355px",
        background: "#FFFFFF",
        border: "1.5px solid rgba(179, 175, 175, 0.51)",
        borderRadius: "8px",
        padding: "6px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        margin: "0 auto",
      }}
      className="attraction-card-item"
    >
      <div>
        {/* Attraction Image */}
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "150px",
            borderRadius: "8px",
            overflow: "hidden",
            background: "#F1F5F9",
          }}
        >
          {attraction.image && !imgError ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={attraction.image}
              alt={attraction.name}
              style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "8px" }}
              onError={() => setImgError(true)}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(135deg, #0C2A42 0%, #2372A5 100%)",
                color: "#FFFFFF",
                fontSize: "13px",
                fontWeight: 700,
                textAlign: "center",
                padding: "8px",
              }}
            >
              {attraction.name}
            </div>
          )}
        </div>

        {/* Content */}
        <div style={{ padding: "10px 8px 4px 8px" }}>
          <h3
            style={{
              margin: 0,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 700,
              fontSize: "13px",
              lineHeight: "16px",
              color: "#173F63",
            }}
          >
            {attraction.name}
          </h3>

          <span
            style={{
              display: "block",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 600,
              fontSize: "9px",
              color: categoryColor,
              marginTop: "4px",
            }}
          >
            {attraction.category}
          </span>

          <div style={{ display: "flex", alignItems: "center", gap: "5px", marginTop: "12px" }}>
            <Clock size={10} color="#515252" strokeWidth={2} />
            <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, fontSize: "9px", color: "rgba(81,82,82,0.84)" }}>
              {attraction.timing}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "flex-start", gap: "4px", marginTop: "10px" }}>
            <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, fontSize: "9px", color: "#515252", marginTop: "1px" }}>₹</span>
            <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, fontSize: "9px", lineHeight: "13px", color: "rgba(81,82,82,0.84)" }}>
              Adult: ₹{attraction.pricing.adult} Child: ₹{attraction.pricing.child} Student: ₹{attraction.pricing.student}
              <br />
              Senior: ₹{attraction.pricing.senior} Foreigner: ₹{attraction.pricing.foreigner}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "14px", padding: "0 4px 4px 4px" }}>
        <button
          onClick={() => onEdit(attraction)}
          style={{ boxSizing: "border-box", flex: 1, height: "34px", background: "#FFFFFF", border: "1px solid #2372A5", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", cursor: "pointer", transition: "all 0.18s ease" }}
          className="btn-edit"
        >
          <Pencil size={13} color="#2372A5" strokeWidth={2} />
          <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 500, fontSize: "12px", color: "#2372A5" }}>Edit</span>
        </button>

        {(attraction.category === "Ride" || attraction.hasSeating) && (
          <button
            onClick={() => onSeating(attraction)}
            style={{ boxSizing: "border-box", flex: 1, height: "34px", background: "#FFFFFF", border: "1px solid #10B981", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", cursor: "pointer", transition: "all 0.18s ease" }}
            className="btn-seating"
          >
            <Armchair size={13} color="#10B981" strokeWidth={2} />
            <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 500, fontSize: "12px", color: "#10B981" }}>Seating</span>
          </button>
        )}

        <button
          onClick={() => onDelete(attraction)}
          style={{ boxSizing: "border-box", flex: 1, height: "34px", background: "#FFFFFF", border: "1px solid #DC2626", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", cursor: "pointer", transition: "all 0.18s ease" }}
          className="btn-delete"
        >
          <Trash2 size={13} color="#DC2626" strokeWidth={2} />
          <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 500, fontSize: "12px", color: "#DC2626" }}>Delete</span>
        </button>
      </div>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function AttractionManagementPage() {
  const { showToast } = useToast();

  // ── State ────────────────────────────────────────────────────────────────
  const [attractions, setAttractions] = useState<Attraction[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "add" | "edit" | "empty">("empty");

  const [attractionToEdit, setAttractionToEdit] = useState<Attraction | null>(null);
  const [isSeatAllocOpen, setIsSeatAllocOpen] = useState(false);
  const [seatAllocAttraction, setSeatAllocAttraction] = useState<Attraction | null>(null);
  const [isBulkOpen, setIsBulkOpen] = useState(false);

  // ── Load from sessionStorage on mount ───────────────────────────────────
  useEffect(() => {
    document.title = "Attraction Management | Ticketing Platform";
    const stored = loadFromSession();
    setAttractions(stored);
    
    // Check if query params ask to open add form
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("action") === "add") {
        setViewMode("add");
        setHydrated(true);
        return;
      }
    }

    setViewMode(stored.length > 0 ? "list" : "empty");
    setHydrated(true);
  }, []);

  // ── Sync to sessionStorage whenever attractions change ──────────────────
  useEffect(() => {
    if (!hydrated) return;
    saveToSession(attractions);
    if (viewMode === "list" || viewMode === "empty") {
      setViewMode(attractions.length > 0 ? "list" : "empty");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attractions, hydrated]);

  // ── Filtered list ────────────────────────────────────────────────────────
  const filtered = attractions.filter(
    (a) =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleOpenAdd = () => {
    setAttractionToEdit(null);
    setViewMode("add");
  };

  const handleOpenEdit = (attraction: Attraction) => {
    setAttractionToEdit(attraction);
    setViewMode("edit");
  };

  const handleOpenSeating = (attraction: Attraction) => {
    setSeatAllocAttraction(attraction);
    setIsSeatAllocOpen(true);
  };

  const handleSeatAssigned = (seat: SeatConfigData) => {
    if (!seatAllocAttraction) return;
    const updated = attractions.map((a) =>
      a.id === seatAllocAttraction.id
        ? { ...a, assignedSeatId: seat.id, assignedSeatName: seat.name }
        : a
    );
    setAttractions(updated);
    showToast(`Seat layout "${seat.name}" assigned to "${seatAllocAttraction.name}"!`, "success");
  };

  const handleOpenDelete = async (attraction: Attraction) => {
    const confirmed = await confirmDelete(`attraction "${attraction.name}"`);
    if (!confirmed) return;

    setAttractions((prev) => prev.filter((a) => a.id !== attraction.id));
    showToast(`Attraction "${attraction.name}" deleted.`, "info");
  };

  const handleSaveAttraction = (data: Partial<Attraction>) => {
    if (viewMode === "edit" && attractionToEdit) {
      const updated = attractions.map((item) =>
        item.id === attractionToEdit.id ? ({ ...item, ...data } as Attraction) : item
      );
      setAttractions(updated);
      showToast("Attraction updated successfully!", "success");
      setViewMode("list");
    } else {
      const newAttraction: Attraction = {
        id: `ATR-${Date.now()}`,
        name: data.name || "New Attraction",
        category: (data.category as Attraction["category"]) || "Ride",
        timing: data.timing || "09:00 AM - 06:00 PM",
        pricing: data.pricing || { adult: 0, child: 0, student: 0, senior: 0, foreigner: 0 },
        hasSeating: data.hasSeating ?? false,
        status: data.status || "Active",
        image: data.image || "",
        description: data.description || "",
      };
      const updated = [newAttraction, ...attractions];
      setAttractions(updated);
      showToast(`Attraction "${newAttraction.name}" created successfully!`, "success");
      setViewMode("list");
    }
  };



  const handleBulkUploadSuccess = (count: number) => {
    showToast(`Successfully uploaded ${count} new attractions!`, "success");
  };

  // ── Render ─────────────────────────────────────────────────────────────
  if (!hydrated) return null; // Avoid SSR mismatch

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", boxSizing: "border-box" }}>

      {/* ── EMPTY STATE ─────────────────────────────────────────────── */}
      {viewMode === "empty" && (
        <AttractionEmptyState
          onAddAttraction={handleOpenAdd}
          onBulkUpload={() => setIsBulkOpen(true)}
        />
      )}



      {/* ── ADD / EDIT FORM VIEW ────────────────────────────────────── */}
      {(viewMode === "add" || viewMode === "edit") && (
        <div style={{ width: "100%", maxWidth: "1124px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <button
            onClick={() => setViewMode(attractions.length > 0 ? "list" : "empty")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 600,
              fontSize: "14px",
              color: "#0C2A42",
              width: "fit-content",
            }}
          >
            <ArrowLeft size={18} color="#0C2A42" />
            Back to Attractions
          </button>

          <AddEditAttractionForm
            attractionToEdit={viewMode === "edit" ? attractionToEdit : null}
            onSave={handleSaveAttraction}
            onCancel={() => setViewMode(attractions.length > 0 ? "list" : "empty")}
          />
        </div>
      )}

      {/* ── LIST VIEW ───────────────────────────────────────────────── */}
      {viewMode === "list" && (
        <div
          style={{
            boxSizing: "border-box",
            width: "100%",
            maxWidth: "1124px",
            minHeight: "893px",
            background: "#FFFFFF",
            border: "1px solid rgba(0, 0, 0, 0.43)",
            boxShadow: "0px 4px 14.5px -2px rgba(0, 0, 0, 0.25)",
            borderRadius: "38px",
            padding: "36px 36px 48px 36px",
            display: "flex",
            flexDirection: "column",
            gap: "24px",
          }}
          className="attraction-main-container"
        >
          {/* Top controls */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "20px" }}>
            {/* Search */}
            <div
              style={{
                boxSizing: "border-box",
                width: "100%",
                maxWidth: "413px",
                height: "40px",
                background: "#FFFFFF",
                border: "1.5px solid rgba(179, 175, 175, 0.51)",
                borderRadius: "4px",
                display: "flex",
                alignItems: "center",
                padding: "0 14px",
                gap: "10px",
              }}
            >
              <Search size={18} color="#B3AFAF" strokeWidth={2} />
              <input
                type="text"
                placeholder="Search Attraction........."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 700,
                  fontSize: "12px",
                  color: colors.text.primary,
                }}
              />
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
              {/* + Add Attraction */}
              <button
                onClick={handleOpenAdd}
                style={{
                  boxSizing: "border-box",
                  minWidth: "186px",
                  height: "51px",
                  background: "#0C2A42",
                  borderRadius: "10px",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  cursor: "pointer",
                  padding: "0 18px",
                  boxShadow: "0 4px 12px rgba(12, 42, 66, 0.2)",
                  transition: "background 0.18s ease, transform 0.18s ease",
                }}
                className="btn-add-attraction"
              >
                <Plus size={24} color="#FFFFFF" strokeWidth={2.8} />
                <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 500, fontSize: "16px", color: "#FFFFFF", whiteSpace: "nowrap" }}>
                  Add Attraction
                </span>
              </button>

              {/* Bulk Upload */}
              <button
                onClick={() => setIsBulkOpen(true)}
                style={{
                  boxSizing: "border-box",
                  minWidth: "186px",
                  height: "51px",
                  background: "#FFFFFF",
                  border: "2px solid #0C2A42",
                  borderRadius: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  cursor: "pointer",
                  padding: "0 18px",
                  transition: "background 0.18s ease, transform 0.18s ease",
                }}
                className="btn-bulk-upload"
              >
                <Upload size={20} color="#011B2F" strokeWidth={2} />
                <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 500, fontSize: "16px", color: "#011B2F", whiteSpace: "nowrap" }}>
                  Bulk Upload
                </span>
              </button>
            </div>
          </div>

          {/* Cards Grid or No results */}
          {filtered.length > 0 ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(237px, 1fr))",
                gap: "24px",
                width: "100%",
              }}
            >
              {filtered.map((attraction) => (
                <AttractionCard
                  key={attraction.id}
                  attraction={attraction}
                  onEdit={handleOpenEdit}
                  onSeating={handleOpenSeating}
                  onDelete={handleOpenDelete}
                />
              ))}
            </div>
          ) : (
            <div
              style={{
                background: "#F8FAFC",
                borderRadius: "16px",
                padding: "60px 20px",
                textAlign: "center",
                border: "1.5px dashed rgba(179,175,175,0.51)",
                margin: "20px 0",
              }}
            >
              <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: "15px", fontWeight: 600, color: colors.text.muted, margin: 0 }}>
                No attractions match your search.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Hover styles & responsive media queries ─────────────────── */}
      <style>{`
        .attraction-card-item:hover { transform: translateY(-3px); box-shadow: 0 10px 25px rgba(12,42,66,0.12); }
        .btn-edit:hover { background: #F0F7FF !important; }
        .btn-seating:hover { background: #ECFDF5 !important; }
        .btn-delete:hover { background: #FEF2F2 !important; }
        .btn-add-attraction:hover { background: #173F63 !important; transform: translateY(-1px); }
        .btn-bulk-upload:hover { background: #F0F4F8 !important; transform: translateY(-1px); }
        @media (max-width: 768px) {
          .attraction-main-container { padding: 20px 16px !important; border-radius: 20px !important; }
        }
      `}</style>

      {/* ── Modals ─────────────────────────────────────────────────── */}
      <SeatAllocationModal
        isOpen={isSeatAllocOpen}
        onClose={() => setIsSeatAllocOpen(false)}
        attractionName={seatAllocAttraction?.name ?? ""}
        currentSeatId={(seatAllocAttraction as (Attraction & { assignedSeatId?: string }))?.assignedSeatId}
        onSelect={handleSeatAssigned}
      />
      <BulkUploadModal
        isOpen={isBulkOpen}
        onClose={() => setIsBulkOpen(false)}
        onUploadSuccess={handleBulkUploadSuccess}
      />
    </div>
  );
}
