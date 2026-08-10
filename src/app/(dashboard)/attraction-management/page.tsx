"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  Search,
  Plus,
  Upload,
  Clock,
  IndianRupee,
  Pencil,
  Armchair,
  Trash2,
} from "lucide-react";
import { colors, typography } from "@/lib/theme";
import { INITIAL_ATTRACTIONS, Attraction } from "@/types/admin";
import AddEditAttractionModal from "@/components/modals/AddEditAttractionModal";
import SeatingConfigModal from "@/components/modals/SeatingConfigModal";
import BulkUploadModal from "@/components/modals/BulkUploadModal";
import DeleteAttractionModal from "@/components/modals/DeleteAttractionModal";
import { useToast } from "@/components/ui/Toast";
import { confirmAdd, confirmDelete, showSuccessNotify } from "@/lib/notify";
import { filterAttractionsByRole } from "@/lib/managerAuth";
import { Shield, Building2 } from "lucide-react";

// Category badge color
const CATEGORY_COLOR: Record<string, string> = {
  Ride: "#F4BC43",
  Monument: "#F4BC43",
  Park: "#F4BC43",
  Museum: "#F4BC43",
  Mueseum: "#F4BC43",
  Fort: "#F4BC43",
  Show: "#F4BC43",
};

interface AttractionCardProps {
  attraction: Attraction;
  onEdit: (attraction: Attraction) => void;
  onSeating: (attraction: Attraction) => void;
  onDelete: (attraction: Attraction) => void;
}

function AttractionCard({
  attraction,
  onEdit,
  onSeating,
  onDelete,
}: AttractionCardProps) {
  const categoryColor = CATEGORY_COLOR[attraction.category] ?? "#F4BC43";
  const [imgError, setImgError] = useState(false);

  // Fallback map if image path is not specified
  const fallbackImageMap: Record<string, string> = {
    "ATR-001": "/Assets/Attraction/Toy_Train.jpg",
    "ATR-002": "/Assets/Attraction/Rope.jpg",
    "ATR-003": "/Assets/Attraction/Wax.jpg",
    "ATR-004": "/Assets/Attraction/Biological.jpg",
    "ATR-005": "/Assets/Attraction/Mahal.jpg",
    "ATR-006": "/Assets/Attraction/Fort.jpg",
  };

  const imageSrc =
    attraction.image || "";

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
        {/* Attraction Image (225px x 150px exact Figma ratio) */}
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
          {!imgError ? (
            <Image
              src={imageSrc}
              alt={attraction.name}
              fill
              sizes="(max-width: 768px) 100vw, 237px"
              style={{ objectFit: "cover", borderRadius: "8px" }}
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
                fontSize: "14px",
                fontWeight: 700,
              }}
            >
              {attraction.name}
            </div>
          )}
        </div>

        {/* Content Section */}
        <div style={{ padding: "10px 8px 4px 8px" }}>
          {/* Title */}
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

          {/* Category */}
          <span
            style={{
              display: "block",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 600,
              fontSize: "9px",
              lineHeight: "11px",
              color: categoryColor,
              marginTop: "4px",
            }}
          >
            {attraction.category}
          </span>

          {/* Timing */}
          <div style={{ display: "flex", alignItems: "center", gap: "5px", marginTop: "12px" }}>
            <Clock size={10} color="#515252" strokeWidth={2} />
            <span
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 600,
                fontSize: "9px",
                lineHeight: "11px",
                color: "rgba(81, 82, 82, 0.84)",
              }}
            >
              {attraction.timing}
            </span>
          </div>

          {/* Ticket Pricing */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: "4px", marginTop: "10px" }}>
            <span
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 600,
                fontSize: "9px",
                lineHeight: "11px",
                color: "#515252",
                marginTop: "1px",
              }}
            >
              ₹
            </span>
            <span
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 600,
                fontSize: "9px",
                lineHeight: "13px",
                color: "rgba(81, 82, 82, 0.84)",
              }}
            >
              Adult: ₹{attraction.pricing.adult} Child: ₹{attraction.pricing.child} Student: ₹{attraction.pricing.student}
              <br />
              Senior: ₹{attraction.pricing.senior} Foreigner: ₹{attraction.pricing.foreigner}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons Row matching exact Figma button outlines & colors */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          marginTop: "14px",
          padding: "0 4px 4px 4px",
        }}
      >
        {/* Edit Button */}
        <button
          onClick={() => onEdit(attraction)}
          style={{
            boxSizing: "border-box",
            flex: 1,
            height: "34px",
            background: "#FFFFFF",
            border: "1px solid #2372A5",
            borderRadius: "6px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "4px",
            cursor: "pointer",
            transition: "all 0.18s ease",
          }}
          className="btn-edit"
        >
          <Pencil size={13} color="#2372A5" strokeWidth={2} />
          <span
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 500,
              fontSize: "12px",
              lineHeight: "15px",
              color: "#2372A5",
            }}
          >
            Edit
          </span>
        </button>

        {/* Seating Button (Only for Rides or if hasSeating) */}
        {(attraction.category === "Ride" || attraction.hasSeating) && (
          <button
            onClick={() => onSeating(attraction)}
            style={{
              boxSizing: "border-box",
              flex: 1,
              height: "34px",
              background: "#FFFFFF",
              border: "1px solid #10B981",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "4px",
              cursor: "pointer",
              transition: "all 0.18s ease",
            }}
            className="btn-seating"
          >
            <Armchair size={13} color="#10B981" strokeWidth={2} />
            <span
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 500,
                fontSize: "12px",
                lineHeight: "15px",
                color: "#10B981",
              }}
            >
              Seating
            </span>
          </button>
        )}

        {/* Delete Button */}
        <button
          onClick={() => onDelete(attraction)}
          style={{
            boxSizing: "border-box",
            flex: 1,
            height: "34px",
            background: "#FFFFFF",
            border: "1px solid #DC2626",
            borderRadius: "6px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "4px",
            cursor: "pointer",
            transition: "all 0.18s ease",
          }}
          className="btn-delete"
        >
          <Trash2 size={13} color="#DC2626" strokeWidth={2} />
          <span
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 500,
              fontSize: "12px",
              lineHeight: "15px",
              color: "#DC2626",
            }}
          >
            Delete
          </span>
        </button>
      </div>
    </div>
  );
}

export default function AttractionManagementPage() {
  const { showToast } = useToast();
  const [userRole, setUserRole] = useState<string>("Admin");

  useEffect(() => {
    document.title = "Attraction Management | Ticketing Platform";
    const savedRole = sessionStorage.getItem("userRole") ?? "Admin";
    setUserRole(savedRole);
    setAttractions(filterAttractionsByRole(INITIAL_ATTRACTIONS, savedRole));
  }, []);

  const [attractions, setAttractions] = useState<Attraction[]>(INITIAL_ATTRACTIONS);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal States
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [attractionToEdit, setAttractionToEdit] = useState<Attraction | null>(null);

  const [isSeatingOpen, setIsSeatingOpen] = useState(false);
  const [seatingAttraction, setSeatingAttraction] = useState<Attraction | null>(null);

  const [isBulkOpen, setIsBulkOpen] = useState(false);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [attractionToDelete, setAttractionToDelete] = useState<Attraction | null>(null);

  // Filtered attractions
  const filtered = attractions.filter(
    (a) =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handlers
  const handleOpenAdd = () => {
    setAttractionToEdit(null);
    setIsAddEditOpen(true);
  };

  const handleOpenEdit = (attraction: Attraction) => {
    setAttractionToEdit(attraction);
    setIsAddEditOpen(true);
  };

  const handleOpenSeating = (attraction: Attraction) => {
    setSeatingAttraction(attraction);
    setIsSeatingOpen(true);
  };

  const handleOpenDelete = (attraction: Attraction) => {
    setAttractionToDelete(attraction);
    setIsDeleteOpen(true);
  };

  const handleSaveAttraction = (data: Partial<Attraction>) => {
    if (attractionToEdit) {
      setAttractions((prev) =>
        prev.map((item) =>
          item.id === attractionToEdit.id ? { ...item, ...data } as Attraction : item
        )
      );
      showToast("Attraction updated successfully!", "success");
    } else {
      const newAttraction: Attraction = {
        id: `ATR-${String(attractions.length + 1).padStart(3, "0")}`,
        name: data.name || "New Attraction",
        category: (data.category as Attraction["category"]) || "Ride",
        timing: data.timing || "09:00 AM - 06:00 PM",
        pricing: data.pricing || { adult: 100, child: 50, student: 60, senior: 75, foreigner: 500 },
        hasSeating: data.hasSeating ?? false,
        status: data.status || "Active",
        image: data.image || "/Assets/Attraction/Toy_Train.jpg",
      };
      setAttractions((prev) => [newAttraction, ...prev]);
      showToast(`Attraction "${newAttraction.name}" created successfully!`, "success");
    }
  };

  const handleDeleteConfirm = () => {
    if (!attractionToDelete) return;
    const id = attractionToDelete.id;
    const target = attractions.find((a) => a.id === id);
    if (target) {
      setAttractions((prev) => prev.filter((item) => item.id !== id));
      showToast(`Attraction "${target.name}" has been deleted.`, "info");
    }
    setIsDeleteOpen(false);
    setAttractionToDelete(null);
  };

  const handleBulkUploadSuccess = (count: number) => {
    showToast(`Successfully uploaded ${count} new attractions!`, "success");
  };

  return (
    <div style={{ display: "flex", justifyContent: "center", width: "100%", boxSizing: "border-box" }}>
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
  
        {/* Top Controls Row: Search Input + Action Buttons */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "20px",
          }}
        >
          {/* Search Box - Rectangle 59 */}
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
                lineHeight: "15px",
                color: colors.text.primary,
              }}
            />
          </div>

          {/* Buttons Group: Add Attraction + Bulk Upload */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            {/* + Add Attraction - Rectangle 173 */}
            <button
              // onClick={handleOpenAdd}
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
              <span
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 500,
                  fontSize: "16px",
                  lineHeight: "20px",
                  color: "#FFFFFF",
                  whiteSpace: "nowrap",
                }}
              >
                Add Attraction
              </span>
            </button>

            {/* Bulk Upload - Rectangle 174 */}
            <button
              // onClick={() => setIsBulkOpen(true)}
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
              <span
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 500,
                  fontSize: "16px",
                  lineHeight: "20px",
                  color: "#011B2F",
                  whiteSpace: "nowrap",
                }}
              >
                Bulk Upload
              </span>
            </button>
          </div>
        </div>

        {/* Attraction Cards Grid */}
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
            <p
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: "15px",
                fontWeight: 600,
                color: colors.text.muted,
                margin: 0,
              }}
            >
              No attractions match your search query.
            </p>
          </div>
        )}
      </div>

      {/* Scoped Hover Effects & Media Queries for responsiveness */}
      <style>{`
        .attraction-card-item:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 25px rgba(12, 42, 66, 0.12);
        }
        .btn-edit:hover {
          background: #F0F7FF !important;
        }
        .btn-seating:hover {
          background: #ECFDF5 !important;
        }
        .btn-delete:hover {
          background: #FEF2F2 !important;
        }
        .btn-add-attraction:hover {
          background: #173F63 !important;
          transform: translateY(-1px);
        }
        .btn-bulk-upload:hover {
          background: #F0F4F8 !important;
          transform: translateY(-1px);
        }
        @media (max-width: 768px) {
          .attraction-main-container {
            padding: 20px 16px !important;
            border-radius: 20px !important;
          }
        }
      `}</style>

      {/* Interactive Modals */}
      <AddEditAttractionModal
        isOpen={isAddEditOpen}
        onClose={() => setIsAddEditOpen(false)}
        attractionToEdit={attractionToEdit}
        onSave={handleSaveAttraction}
      />

      <SeatingConfigModal
        isOpen={isSeatingOpen}
        onClose={() => setIsSeatingOpen(false)}
        attraction={seatingAttraction}
      />

      <BulkUploadModal
        isOpen={isBulkOpen}
        onClose={() => setIsBulkOpen(false)}
        onUploadSuccess={handleBulkUploadSuccess}
      />

      <DeleteAttractionModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        attraction={attractionToDelete}
        onConfirmDelete={handleDeleteConfirm}
      />
    </div>
  );
}
