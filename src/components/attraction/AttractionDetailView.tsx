"use client";

import React, { useMemo } from "react";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { AttractionManagement } from "@/app/(dashboard)/attraction-management/types";
import { useSeatLayouts } from "@/hooks/useSeatQueries";

interface AttractionDetailViewProps {
  attraction: AttractionManagement;
  onBack: () => void;
  onEdit: (attraction: AttractionManagement) => void;
  onDelete: (attraction: AttractionManagement) => void;
  canDelete: boolean;
}

// ── Castle Illustration Placeholder ──────────────────────────────────────────
function CastleIllustration({ width = 110, height = 70 }: { width?: number | string; height?: number | string }) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 120 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ overflow: "visible" }}
    >
      <path d="M20 20 C23 17 26 20 29 17 C32 20 35 17 38 20" stroke="#1E4D74" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      <path d="M74 13 C76 10 78 13 80 10 C82 13 84 10 86 13" stroke="#1E4D74" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      <path d="M78 28 C78 25 82 23 85 25 C88 22 93 23 96 26 C99 26 102 28 101 32 C99 33 80 33 78 28 Z" stroke="#1E4D74" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M5 76 C20 73 35 67 55 63 C75 59 95 65 115 76" stroke="#1E4D74" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M15 77 C30 70 50 65 65 64" stroke="#1E4D74" strokeWidth="1.1" strokeLinecap="round" />
      <path d="M72 64 C85 67 100 72 108 77" stroke="#1E4D74" strokeWidth="1.1" strokeLinecap="round" />
      <path d="M48 67 C55 66 62 66 70 68" stroke="#1E4D74" strokeWidth="1.1" strokeLinecap="round" />
      <path d="M26 68 L26 49 L29 49 L29 51 L31 51 L31 49 L33 49 L33 51 L35 51 L35 49 L38 49 L38 67" stroke="#1E4D74" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="29.5" y="55" width="2" height="3.5" rx="1" fill="#1E4D74" />
      <path d="M38 63 L44 63 L44 43 L47 43 L47 45 L49 45 L49 43 L52 43 L52 45 L54 45 L54 43 L57 43 L57 60" stroke="#1E4D74" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="47" y="49" width="2" height="4" rx="1" fill="#1E4D74" />
      <rect x="52" y="49" width="2" height="4" rx="1" fill="#1E4D74" />
      <path d="M57 60 L57 32 L55 32 L55 30 L67 30 L67 32 L65 32 L65 60" stroke="#1E4D74" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M61 30 L61 17 L68 20.5 L61 24" stroke="#1E4D74" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="59.5" y="36" width="3" height="5" rx="1.5" fill="#1E4D74" />
      <path d="M59 54 Q61 50 63 54 L63 60 L59 60 Z" stroke="#1E4D74" strokeWidth="1.3" fill="#1E4D74" fillOpacity="0.15" />
      <path d="M65 60 L65 43 L68 43 L68 45 L70 45 L70 43 L73 43 L73 45 L75 45 L75 43 L78 43 L78 63 L84 63" stroke="#1E4D74" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="68" y="49" width="2" height="4" rx="1" fill="#1E4D74" />
      <rect x="73" y="49" width="2" height="4" rx="1" fill="#1E4D74" />
      <path d="M84 67 L84 49 L87 49 L87 51 L89 51 L89 49 L91 49 L91 51 L93 51 L93 49 L96 49 L96 68" stroke="#1E4D74" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="89" y="55" width="2" height="3.5" rx="1" fill="#1E4D74" />
    </svg>
  );
}

// ── Visitor Category Avatar Helper ───────────────────────────────────────────
function getVisitorCategoryAvatar(name: string, customImage?: string | null): string {
  if (customImage && customImage.trim() && !customImage.includes("placeholder") && !customImage.startsWith("/")) {
    return customImage;
  }
  const clean = (name || "").toLowerCase().trim();
  if (clean.includes("adult")) return "/Assets/Visitors/Adult.png";
  if (clean.includes("child") || clean.includes("kid")) return "/Assets/Visitors/Child.png";
  if (clean.includes("student")) return "/Assets/Visitors/Student.png";
  if (clean.includes("senior")) return "/Assets/Visitors/Senior.png";
  if (clean.includes("foreign")) return "/Assets/Visitors/Foreigner.png";
  return "/Assets/Visitors/Adult.png";
}

export default function AttractionDetailView({
  attraction,
  onBack,
  onEdit,
  onDelete,
  canDelete,
}: AttractionDetailViewProps) {
  const { data: seatData } = useSeatLayouts();

  const isAttractionActive = String(attraction.status || "ACTIVE").toUpperCase() === "ACTIVE";

  const hasValidImage = Boolean(attraction.image && attraction.image.trim() !== "");

  // Duration display
  const durationVal = attraction.duration || attraction.durationMins || "20";
  const durationUnit = (attraction as any).durationUnit || "Minutes";
  const durationDisplay = `${durationVal} ${durationUnit}`;

  // Multi-station count / badge text
  const stationsCount =
    (attraction as any).noOfStations ??
    (attraction as any).stationCount ??
    (Array.isArray((attraction as any).stations) ? (attraction as any).stations.length : null) ??
    ((attraction as any).isMultiStation ? 4 : null);
  const stationsBadgeText = stationsCount ? `No. of Stations: ${stationsCount}` : "No. of Stations: 4";

  // Allocated seats list
  const allocatedSeatsList = useMemo(() => {
    if (Array.isArray(attraction.attractionSeats) && attraction.attractionSeats.length > 0) {
      return attraction.attractionSeats.map((as, idx) => {
        const layout = seatData?.items?.find((s) => s.id === as.seatLayoutId);
        const rows = layout?.rows ?? 12;
        const cols = layout?.cols ?? 3;
        const capacity = layout?.totalSeats ?? rows * cols;
        return {
          id: as.id || `seat-${idx}`,
          name: as.name || `Coach (डब्बा) – ${idx + 1}`,
          rows,
          cols,
          capacity,
          isActive: as.isActive !== false,
        };
      });
    }

    const rawSeats = (attraction as any).seatLayoutIds ?? (attraction as any).assignedSeatIds ?? [];
    if (Array.isArray(rawSeats) && rawSeats.length > 0) {
      return rawSeats.map((item: any, idx: number) => {
        const layoutId = typeof item === "string" ? item : (item.seatLayoutId || item.id || item.layoutId);
        const layout = seatData?.items?.find((s) => s.id === layoutId);
        const rows = layout?.rows ?? 12;
        const cols = layout?.cols ?? 3;
        const capacity = layout?.totalSeats ?? rows * cols;
        const name =
          typeof item === "object" && item.name
            ? item.name
            : layout?.name
              ? `${layout.name} – ${idx + 1}`
              : `Coach (डब्बा) – ${idx + 1}`;
        const isActive =
          typeof item === "object" && item.status
            ? String(item.status).toLowerCase() === "active"
            : true;
        return {
          id: `seat-${idx}`,
          name,
          rows,
          cols,
          capacity,
          isActive,
        };
      });
    }

    if (Array.isArray(attraction.seatLayouts) && attraction.seatLayouts.length > 0) {
      return attraction.seatLayouts.flatMap((layout: any, lIdx: number) => {
        const qty = Math.max(1, Number(layout.quantity) || 1);
        const rows = layout.rows ?? 12;
        const cols = layout.cols ?? 3;
        const capacity = layout.totalSeats ?? rows * cols;
        return Array.from({ length: qty }, (_, qIdx) => ({
          id: `${layout.id}-${lIdx}-${qIdx}`,
          name: qty > 1 ? `${layout.name || "Coach (डब्बा)"} – ${qIdx + 1}` : layout.name || "Coach (डब्बा)",
          rows,
          cols,
          capacity,
          isActive: String(layout.status || "ACTIVE").toUpperCase() === "ACTIVE",
        }));
      });
    }

    return [];
  }, [attraction, seatData]);

  const activeSeatsCount = allocatedSeatsList.filter((s) => s.isActive).length;
  const totalCapacity = allocatedSeatsList
    .filter((s) => s.isActive)
    .reduce((acc, curr) => acc + curr.capacity, 0);

  // Visitor Categories List
  const visitorCategoriesList = useMemo(() => {
    if (Array.isArray(attraction.categories) && attraction.categories.length > 0) {
      return attraction.categories
        .filter((c: any) => c && typeof c.name === "string" && c.name.trim() !== "")
        .map((c: any) => ({
          name: c.name.trim(),
          basePrice: Number(c.basePrice ?? c.price ?? 0),
          noOfSeats: Number(c.noOfSeats ?? c.seats ?? 1),
          imageLink: c.imageLink ?? c.image ?? null,
        }));
    }

    const list: Array<{ name: string; basePrice: number; noOfSeats: number; imageLink: string | null }> = [];
    const pr = attraction.pricing || ({} as any);
    const st = attraction.seating || ({} as any);
    if (pr.adult !== undefined) list.push({ name: "Adult", basePrice: pr.adult, noOfSeats: st.adult || 1, imageLink: null });
    if (pr.child !== undefined) list.push({ name: "Child", basePrice: pr.child, noOfSeats: st.child || 1, imageLink: null });
    if (pr.student !== undefined) list.push({ name: "Student", basePrice: pr.student, noOfSeats: st.student || 1, imageLink: null });
    if (pr.senior !== undefined) list.push({ name: "Senior", basePrice: pr.senior, noOfSeats: st.senior || 1, imageLink: null });
    if (pr.foreigner !== undefined) list.push({ name: "Foreigner", basePrice: pr.foreigner, noOfSeats: st.foreigner || 1, imageLink: null });
    return list;
  }, [attraction]);

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "1124px",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        boxSizing: "border-box",
      }}
    >
      {/* ── Top Header Bar (Back button on left, Edit & Delete on right) ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
          width: "100%",
        }}
      >
        <button
          type="button"
          onClick={onBack}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 700,
            fontSize: "14px",
            color: "#0C2A42",
            padding: "6px 0",
          }}
        >
          <ArrowLeft size={18} color="#0C2A42" strokeWidth={2.5} />
          <span>Back to Attractions</span>
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            type="button"
            onClick={() => onEdit(attraction)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 22px",
              borderRadius: "8px",
              border: "1.5px solid #0C2A42",
              background: "#FFFFFF",
              color: "#0C2A42",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            className="btn-detail-edit"
          >
            <Pencil size={15} color="#0C2A42" strokeWidth={2} />
            <span>Edit</span>
          </button>

          {canDelete && (
            <button
              type="button"
              onClick={() => onDelete(attraction)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 22px",
                borderRadius: "8px",
                border: "1.5px solid #FCA5A5",
                background: "#FFFFFF",
                color: "#DC2626",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              className="btn-detail-delete"
            >
              <Trash2 size={15} color="#DC2626" strokeWidth={2} />
              <span>Delete</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Top 2-Column Grid: Basic Information (Left) & Status (Right) ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.15fr 0.85fr",
          gap: "24px",
          width: "100%",
        }}
        className="attraction-top-grid"
      >
        {/* Left Column: Basic Information */}
        <div
          style={{
            background: "#FFFFFF",
            borderRadius: "20px",
            border: "1px solid #E2E8F0",
            padding: "26px 28px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: "18px",
              fontWeight: 800,
              color: "#0C2A42",
            }}
          >
            Basic Information
          </h3>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "20px",
              flexWrap: "wrap",
            }}
          >
            {/* Left Fields */}
            <div
              style={{
                flex: 1,
                minWidth: "220px",
                display: "flex",
                flexDirection: "column",
                gap: "18px",
              }}
            >
              {/* Attraction Name & Category */}
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "16px" }}>
                <div>
                  <div style={{ fontSize: "12px", color: "#64748B", fontWeight: 500, marginBottom: "4px" }}>
                    Attraction Name
                  </div>
                  <div style={{ fontSize: "16px", fontWeight: 700, color: "#0C2A42", wordBreak: "break-word" }}>
                    {attraction.name}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "12px", color: "#64748B", fontWeight: 500, marginBottom: "6px" }}>
                    Category
                  </div>
                  <span
                    style={{
                      display: "inline-block",
                      background: "#FEF3C7",
                      color: "#B45309",
                      padding: "3px 14px",
                      borderRadius: "9999px",
                      fontSize: "12px",
                      fontWeight: 700,
                    }}
                  >
                    {attraction.category}
                  </span>
                </div>
              </div>

              {/* Operating Hours */}
              <div>
                <div style={{ fontSize: "12px", color: "#64748B", fontWeight: 500, marginBottom: "4px" }}>
                  Operating Hours
                </div>
                <div style={{ fontSize: "15px", fontWeight: 700, color: "#0C2A42" }}>
                  {attraction.timing || "09:00 AM – 06:00 PM"}
                </div>
              </div>

              {/* Average Trip Duration & Multi-Station */}
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "16px", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: "12px", color: "#64748B", fontWeight: 500, marginBottom: "4px" }}>
                    Average Trip Duration
                  </div>
                  <div style={{ fontSize: "15px", fontWeight: 700, color: "#0C2A42" }}>
                    {durationDisplay}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "12px", color: "#64748B", fontWeight: 500, marginBottom: "6px" }}>
                    Multi-Station
                  </div>
                  <span
                    style={{
                      display: "inline-block",
                      background: "#EFF6FF",
                      color: "#2563EB",
                      padding: "4px 12px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: 600,
                    }}
                  >
                    {stationsBadgeText}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div>
                <div style={{ fontSize: "12px", color: "#64748B", fontWeight: 500, marginBottom: "4px" }}>
                  Description
                </div>
                <div style={{ fontSize: "14px", color: "#334155", fontWeight: 500, lineHeight: "1.5" }}>
                  {attraction.description && attraction.description.trim() ? attraction.description : "—"}
                </div>
              </div>
            </div>

            {/* Right Thumbnail Image */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", alignSelf: "flex-start" }}>
              <div style={{ fontSize: "12px", color: "#64748B", fontWeight: 500 }}>
                Attraction image
              </div>
              <div
                style={{
                  width: "140px",
                  height: "185px",
                  borderRadius: "14px",
                  overflow: "hidden",
                  border: "1px solid #E2E8F0",
                  background: "#F8FAFC",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
                }}
              >
                {hasValidImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={attraction.image!}
                    alt={attraction.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <CastleIllustration width={100} height={65} />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Status Card */}
        <div
          style={{
            background: "#FFFFFF",
            borderRadius: "20px",
            border: "1px solid #E2E8F0",
            padding: "26px 28px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            gap: "18px",
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: "18px",
              fontWeight: 800,
              color: "#0C2A42",
            }}
          >
            Status
          </h3>

          {/* Attraction Status row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "14px", fontWeight: 700, color: "#0C2A42" }}>
              Attraction Status
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: isAttractionActive ? "#ECFDF5" : "#FEF2F2",
                color: isAttractionActive ? "#059669" : "#DC2626",
                padding: "4px 14px",
                borderRadius: "9999px",
                fontSize: "12px",
                fontWeight: 700,
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  backgroundColor: isAttractionActive ? "#10B981" : "#EF4444",
                }}
              />
              {isAttractionActive ? "Active" : "Inactive"}
            </span>
          </div>

          <div style={{ height: "1px", background: "#F1F5F9" }} />

          {/* Seat Allocation Header */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0C2A42" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 9V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3" />
                  <path d="M3 16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2z" />
                  <path d="M5 18v3" />
                  <path d="M19 18v3" />
                </svg>
                <span style={{ fontSize: "15px", fontWeight: 700, color: "#0C2A42" }}>
                  Seat Allocation
                </span>
              </div>

              <span
                style={{
                  background: "#ECFDF5",
                  color: "#059669",
                  padding: "3px 12px",
                  borderRadius: "9999px",
                  fontSize: "12px",
                  fontWeight: 700,
                }}
              >
                {activeSeatsCount} Active
              </span>
            </div>

            <div style={{ fontSize: "12px", fontWeight: 600, color: "#64748B", marginBottom: "12px" }}>
              Allocated Seats ({allocatedSeatsList.length})
            </div>

            {/* Seats list */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                maxHeight: "220px",
                overflowY: "auto",
                paddingRight: "2px",
              }}
            >
              {allocatedSeatsList.length > 0 ? (
                allocatedSeatsList.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      border: "1px solid #E2E8F0",
                      background: "#F8FAFC",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div
                        style={{
                          background: "#EFF6FF",
                          color: "#2563EB",
                          fontWeight: 800,
                          fontSize: "12px",
                          padding: "4px 8px",
                          borderRadius: "6px",
                          minWidth: "28px",
                          textAlign: "center",
                        }}
                      >
                        #{idx + 1}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "13px", color: "#0C2A42" }}>
                          {item.name}
                        </div>
                        <div style={{ fontSize: "11px", color: "#64748B", fontWeight: 500, marginTop: "2px" }}>
                          {item.rows}R × {item.cols}C - {item.capacity} seats capacity
                        </div>
                      </div>
                    </div>

                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        background: item.isActive ? "#ECFDF5" : "#FEF2F2",
                        color: item.isActive ? "#059669" : "#DC2626",
                        padding: "3px 10px",
                        borderRadius: "9999px",
                        fontSize: "11px",
                        fontWeight: 700,
                      }}
                    >
                      <span
                        style={{
                          width: "5px",
                          height: "5px",
                          borderRadius: "50%",
                          backgroundColor: item.isActive ? "#10B981" : "#EF4444",
                        }}
                      />
                      {item.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                ))
              ) : (
                <div
                  style={{
                    padding: "20px",
                    textAlign: "center",
                    color: "#94A3B8",
                    fontSize: "13px",
                    background: "#F8FAFC",
                    borderRadius: "10px",
                    border: "1px dashed #CBD5E1",
                  }}
                >
                  No seat layouts allocated for this attraction
                </div>
              )}
            </div>

            {/* Green Capacity Banner */}
            {allocatedSeatsList.length > 0 && (
              <div
                style={{
                  marginTop: "12px",
                  background: "#ECFDF5",
                  border: "1px solid #A7F3D0",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  textAlign: "center",
                  color: "#065F46",
                  fontWeight: 700,
                  fontSize: "12px",
                }}
              >
                {activeSeatsCount} active seat layouts allocated ({totalCapacity} total seats capacity)
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom Full-Width Card: Visitor Categories & Pricing ── */}
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "20px",
          border: "1px solid #E2E8F0",
          padding: "26px 28px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          width: "100%",
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: "18px",
            fontWeight: 800,
            color: "#0C2A42",
          }}
        >
          Visitor Categories & Pricing
        </h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "18px",
            width: "100%",
          }}
        >
          {visitorCategoriesList.map((cat, idx) => (
            <div
              key={idx}
              style={{
                background: "#FFFFFF",
                border: "1px solid #E2E8F0",
                borderRadius: "16px",
                padding: "16px 12px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "12px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                boxSizing: "border-box",
                transition: "transform 0.15s ease, box-shadow 0.15s ease",
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  fontSize: "14px",
                  color: "#0C2A42",
                  textAlign: "center",
                }}
              >
                {cat.name}
              </div>

              <div
                style={{
                  width: "74px",
                  height: "74px",
                  borderRadius: "50%",
                  overflow: "hidden",
                  border: "2px solid #F1F5F9",
                  background: "#F8FAFC",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getVisitorCategoryAvatar(cat.name, cat.imageLink)}
                  alt={cat.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (target.src.includes(".png")) {
                      target.src = target.src.replace(".png", ".jpg").replace("Senior.jpg", "senior.jpg");
                    } else {
                      target.src = "/Assets/Visitors/Adult.png";
                    }
                  }}
                />
              </div>

              {/* Base Price Box */}
              <div
                style={{
                  width: "100%",
                  background: "#EFF6FF",
                  borderRadius: "8px",
                  padding: "8px 10px",
                  textAlign: "center",
                  boxSizing: "border-box",
                }}
              >
                <div style={{ fontSize: "11px", fontWeight: 500, color: "#64748B", marginBottom: "2px" }}>
                  Base Price
                </div>
                <div style={{ fontSize: "15px", fontWeight: 800, color: "#0C2A42" }}>
                  ₹{Number(cat.basePrice).toFixed(2)}
                </div>
              </div>

              {/* No. of Seats Box */}
              <div
                style={{
                  width: "100%",
                  background: "#F0FDF4",
                  borderRadius: "8px",
                  padding: "8px 10px",
                  textAlign: "center",
                  boxSizing: "border-box",
                }}
              >
                <div style={{ fontSize: "11px", fontWeight: 500, color: "#64748B", marginBottom: "2px" }}>
                  No. of Seats
                </div>
                <div style={{ fontSize: "15px", fontWeight: 800, color: "#0C2A42" }}>
                  {cat.noOfSeats}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .btn-detail-edit:hover {
          background: #F0F4F8 !important;
          transform: translateY(-1px);
        }
        .btn-detail-delete:hover {
          background: #FEF2F2 !important;
          transform: translateY(-1px);
        }
        @media (max-width: 900px) {
          .attraction-top-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
