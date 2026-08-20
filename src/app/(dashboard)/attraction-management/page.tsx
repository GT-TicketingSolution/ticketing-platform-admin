"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  Plus,
  Upload,
  Clock,
  Pencil,
  Trash2,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { colors } from "@/lib/theme";
import { AttractionManagement } from "./types";
import type { CreateAttractionPayload, UpdateAttractionPayload } from "./types";
import AttractionEmptyState from "@/components/attraction/AttractionEmptyState";
import AddEditAttractionForm from "@/components/attraction/AddEditAttractionForm";
import BulkUploadModal from "@/components/modals/BulkUploadModal";
import { confirmDelete } from "@/lib/notify";
import {
  useAttractionManagementList,
  useCreateAttraction,
  useUpdateAttraction,
  useDeleteAttraction,
  useBulkUploadAttractions,
} from "@/hooks/useAttractionManagementQueries";

// ── Category badge color ──────────────────────────────────────────────────────
const CATEGORY_COLOR: Record<string, string> = {
  RIDE: "#F4BC43",
  Ride: "#F4BC43",
  MONUMENT: "#F4BC43",
  Monument: "#F4BC43",
  PARK: "#F4BC43",
  Park: "#F4BC43",
  MUSEUM: "#F4BC43",
  Museum: "#F4BC43",
  FORT: "#F4BC43",
  Fort: "#F4BC43",
  SHOW: "#F4BC43",
  Show: "#F4BC43",
  ATTRACTION: "#F4BC43",
  Attraction: "#F4BC43",
};

// ── Attraction Card ───────────────────────────────────────────────────────────
interface AttractionCardProps {
  attraction: AttractionManagement;
  onEdit: (a: AttractionManagement) => void;
  onDelete: (a: AttractionManagement) => void;
}

function AttractionCard({ attraction, onEdit, onDelete }: AttractionCardProps) {
  const categoryColor = CATEGORY_COLOR[attraction.category] ?? "#F4BC43";
  const [imgError, setImgError] = useState(false);

  const p = attraction.pricing ?? { adult: 0, child: 0, student: 0, senior: 0, foreigner: 0 };

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
        {/* Image */}
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
            // eslint-disable-next-line @next/next/no-img-element
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
            <span style={{ fontWeight: 600, fontSize: "9px", color: "rgba(81,82,82,0.84)" }}>
              {attraction.timing ?? "—"}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "flex-start", gap: "4px", marginTop: "10px" }}>
            <span style={{ fontWeight: 600, fontSize: "9px", color: "#515252", marginTop: "1px" }}>₹</span>
            <span style={{ fontWeight: 600, fontSize: "9px", lineHeight: "13px", color: "rgba(81,82,82,0.84)" }}>
              Adult: ₹{p.adult ?? 0} Child: ₹{p.child ?? 0} Student: ₹{p.student ?? 0}
              <br />
              Senior: ₹{p.senior ?? 0} Foreigner: ₹{p.foreigner ?? 0}
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
          <span style={{ fontWeight: 500, fontSize: "12px", color: "#2372A5" }}>Edit</span>
        </button>

        <button
          onClick={() => onDelete(attraction)}
          style={{ boxSizing: "border-box", flex: 1, height: "34px", background: "#FFFFFF", border: "1px solid #DC2626", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", cursor: "pointer", transition: "all 0.18s ease" }}
          className="btn-delete"
        >
          <Trash2 size={13} color="#DC2626" strokeWidth={2} />
          <span style={{ fontWeight: 500, fontSize: "12px", color: "#DC2626" }}>Delete</span>
        </button>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function AttractionManagementPage() {
  // ── Queries / Mutations ─────────────────────────────────────────────────
  const { data: attractions = [], isLoading, isError } = useAttractionManagementList();
  const createMutation = useCreateAttraction();
  const updateMutation = useUpdateAttraction();
  const deleteMutation = useDeleteAttraction();
  const bulkMutation = useBulkUploadAttractions();

  // ── UI State ────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "add" | "edit">("list");
  const [attractionToEdit, setAttractionToEdit] = useState<AttractionManagement | null>(null);
  const [isBulkOpen, setIsBulkOpen] = useState(false);

  useEffect(() => {
    document.title = "Attraction Management | Ticketing Solution";
  }, []);

  // ── Derived ─────────────────────────────────────────────────────────────
  const filtered = attractions.filter(
    (a) =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const showEmptyState = !isLoading && !isError && attractions.length === 0 && viewMode === "list";

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleOpenAdd = () => {
    setAttractionToEdit(null);
    setViewMode("add");
  };

  const handleOpenEdit = (attraction: AttractionManagement) => {
    setAttractionToEdit(attraction);
    setViewMode("edit");
  };

  const handleOpenDelete = async (attraction: AttractionManagement) => {
    const confirmed = await confirmDelete(`attraction "${attraction.name}"`);
    if (!confirmed) return;
    deleteMutation.mutate(attraction.id);
  };

  // Called from AddEditAttractionForm — data is Partial<Attraction> shape
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSaveAttraction = async (data: any) => {
    try {
      const selectedSeats: string[] = data.assignedSeatIds ?? data.seatLayoutIds ?? [];
      const hasSeating = Boolean(data.hasSeating ?? (selectedSeats.length > 0));

      if (viewMode === "edit" && attractionToEdit) {
        const payload: UpdateAttractionPayload = {
          name: data.name,
          category: data.category,
          image: data.image ?? null,
          description: data.description ?? null,
          timing: data.timing ?? null,
          adultPrice: data.pricing?.adult ?? data.adultPrice ?? 0,
          childPrice: data.pricing?.child ?? data.childPrice ?? 0,
          studentPrice: data.pricing?.student ?? data.studentPrice ?? 0,
          seniorPrice: data.pricing?.senior ?? data.seniorPrice ?? 0,
          foreignerPrice: data.pricing?.foreigner ?? data.foreignerPrice ?? 0,
          hasSeating,
          seatLayoutIds: selectedSeats,
        };
        await updateMutation.mutateAsync({ id: attractionToEdit.id, data: payload });
      } else {
        const payload: CreateAttractionPayload = {
          name: data.name,
          category: data.category,
          image: data.image ?? null,
          description: data.description ?? null,
          timing: data.timing ?? null,
          adultPrice: data.pricing?.adult ?? data.adultPrice ?? 0,
          childPrice: data.pricing?.child ?? data.childPrice ?? 0,
          studentPrice: data.pricing?.student ?? data.studentPrice ?? 0,
          seniorPrice: data.pricing?.senior ?? data.seniorPrice ?? 0,
          foreignerPrice: data.pricing?.foreigner ?? data.foreignerPrice ?? 0,
          hasSeating,
          seatLayoutIds: selectedSeats,
        };
        await createMutation.mutateAsync(payload);
      }
      setViewMode("list");
    } catch {
      // Handled by onError in mutation; keep form open
    }
  };

  const handleBulkUploadSuccess = (count: number) => {
    // count passed from BulkUploadModal (currently unused but kept for future API wiring)
    void count;
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", boxSizing: "border-box" }}>

      {/* ── ADD / EDIT FORM ──────────────────────────────────────────── */}
      {(viewMode === "add" || viewMode === "edit") && (
        <div style={{ width: "100%", maxWidth: "1124px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <button
            onClick={() => setViewMode("list")}
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
            attractionToEdit={viewMode === "edit" ? (attractionToEdit as any) : null}
            onSave={handleSaveAttraction}
            onCancel={() => setViewMode("list")}
            isSaving={isSaving}
          />
        </div>
      )}

      {/* ── EMPTY STATE ──────────────────────────────────────────────── */}
      {showEmptyState && viewMode === "list" && (
        <AttractionEmptyState
          onAddAttraction={handleOpenAdd}
          onBulkUpload={() => setIsBulkOpen(true)}
        />
      )}

      {/* ── LOADING SKELETON STATE ────────────────────────────────────── */}
      {isLoading && viewMode === "list" && (
        <div
          style={{
            boxSizing: "border-box",
            width: "100%",
            maxWidth: "1124px",
            background: "#FFFFFF",
            border: "1px solid rgba(0, 0, 0, 0.43)",
            borderRadius: "20px",
            padding: "24px",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
              gap: "20px",
            }}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div
                key={i}
                style={{
                  boxSizing: "border-box",
                  width: "100%",
                  maxWidth: "237px",
                  minHeight: "355px",
                  background: "#FFFFFF",
                  border: "1.5px solid rgba(179, 175, 175, 0.3)",
                  borderRadius: "8px",
                  padding: "6px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  margin: "0 auto",
                }}
              >
                <div>
                  <div className="attr-sk" style={{ width: "100%", height: "150px", borderRadius: "8px", marginBottom: "8px" }} />
                  <div className="attr-sk" style={{ width: "70%", height: "18px", borderRadius: "4px", marginBottom: "8px" }} />
                  <div className="attr-sk" style={{ width: "40%", height: "14px", borderRadius: "4px", marginBottom: "12px" }} />
                  <div className="attr-sk" style={{ width: "90%", height: "12px", borderRadius: "4px", marginBottom: "6px" }} />
                  <div className="attr-sk" style={{ width: "80%", height: "12px", borderRadius: "4px" }} />
                </div>
                <div style={{ display: "flex", gap: "6px", marginTop: "12px" }}>
                  <div className="attr-sk" style={{ height: "30px", flex: 1, borderRadius: "6px" }} />
                  <div className="attr-sk" style={{ height: "30px", flex: 1, borderRadius: "6px" }} />
                  <div className="attr-sk" style={{ height: "30px", flex: 1, borderRadius: "6px" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── ERROR STATE ──────────────────────────────────────────────── */}
      {isError && viewMode === "list" && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "400px", width: "100%" }}>
          <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: "15px", color: "#DC2626", fontWeight: 600 }}>
            Failed to load attractions. Please try again.
          </p>
        </div>
      )}

      {/* ── LIST VIEW ────────────────────────────────────────────────── */}
      {!isLoading && !isError && attractions.length > 0 && viewMode === "list" && (
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

          {/* Cards Grid or No-search-results */}
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

      {/* ── Saving overlay ───────────────────────────────────────────── */}
      {isSaving && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.15)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
          <Loader2 size={40} color="#2372A5" style={{ animation: "spin 1s linear infinite" }} />
        </div>
      )}

      {/* ── Hover styles ─────────────────────────────────────────────── */}
      <style>{`
        @keyframes attrShimmer {
          0%   { background-position: -600px 0; }
          100% { background-position: 600px 0; }
        }
        .attr-sk {
          background: linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%);
          background-size: 600px 100%;
          animation: attrShimmer 1.4s infinite linear;
        }
        .attraction-card-item:hover { transform: translateY(-3px); box-shadow: 0 10px 25px rgba(12,42,66,0.12); }
        .btn-edit:hover { background: #F0F7FF !important; }
        .btn-delete:hover { background: #FEF2F2 !important; }
        .btn-add-attraction:hover { background: #173F63 !important; transform: translateY(-1px); }
        .btn-bulk-upload:hover { background: #F0F4F8 !important; transform: translateY(-1px); }
        @media (max-width: 768px) {
          .attraction-main-container { padding: 20px 16px !important; border-radius: 20px !important; }
        }
      `}</style>

      {/* ── Modals ───────────────────────────────────────────────────── */}
      <BulkUploadModal
        isOpen={isBulkOpen}
        onClose={() => setIsBulkOpen(false)}
        onUploadSuccess={handleBulkUploadSuccess}
      />
    </div>
  );
}
