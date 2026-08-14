"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Plus, Search, RotateCcw } from "lucide-react";
import { META_CONSTANTS } from "@/lib/metaConstant";
import { useToast } from "@/components/ui/Toast";
import { confirmDelete } from "@/lib/notify";
import SeatEmptyState from "@/components/seat/SeatEmptyState";
import SeatCard from "@/components/seat/SeatCard";
import CreateSeatModal, { SeatConfigData } from "@/components/modals/CreateSeatModal";
import ViewSeatModal from "@/components/modals/ViewSeatModal";

const SEAT_STORAGE_KEY = "seat_layouts_data";

export default function SeatManagementPage() {
  const { showToast } = useToast();

  // State: seats list (initial is empty to show empty state only within viewport)
  const [seats, setSeats] = useState<SeatConfigData[]>([]);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  // Filters State
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("All");

  // Modals State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState<boolean>(false);
  const [selectedSeat, setSelectedSeat] = useState<SeatConfigData | null>(null);

  useEffect(() => {
    document.title = META_CONSTANTS.seatManagement.fullTitle;
    try {
      const stored = localStorage.getItem(SEAT_STORAGE_KEY);
      if (stored) {
        setSeats(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
    setIsLoaded(true);
  }, []);

  const saveSeatsToStorage = (updated: SeatConfigData[]) => {
    setSeats(updated);
    try {
      localStorage.setItem(SEAT_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  // Filtered Seats
  const filteredSeats = useMemo(() => {
    return seats.filter((seat) => {
      const matchesSearch =
        seat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `${seat.rows}x${seat.cols}`.includes(searchTerm);

      const matchesStatus =
        statusFilter === "All" || seat.status.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [seats, searchTerm, statusFilter]);

  // Actions
  const handleSaveSeat = (data: SeatConfigData) => {
    if (data.id) {
      // Edit
      const updated = seats.map((s) => (s.id === data.id ? { ...data } : s));
      saveSeatsToStorage(updated);
      showToast(`Seat layout "${data.name}" updated successfully!`, "success");
    } else {
      // Create new
      const newSeat: SeatConfigData = {
        ...data,
        id: `SEAT-${Date.now()}`,
      };
      const updated = [...seats, newSeat];
      saveSeatsToStorage(updated);
      showToast(`Seat layout "${data.name}" created successfully!`, "success");
    }

    setSelectedSeat(null);
    setIsCreateModalOpen(false);
  };

  const handleOpenCreate = () => {
    setSelectedSeat(null);
    setIsCreateModalOpen(true);
  };

  const handleView = (seat: SeatConfigData) => {
    setSelectedSeat(seat);
    setIsViewModalOpen(true);
  };

  const handleEdit = (seat: SeatConfigData) => {
    setSelectedSeat(seat);
    setIsCreateModalOpen(true);
  };

  const handleDelete = async (seat: SeatConfigData) => {
    const confirmed = await confirmDelete(`seat layout "${seat.name}"`);
    if (!confirmed) return;

    const updated = seats.filter((s) => s.id !== seat.id);
    saveSeatsToStorage(updated);
    showToast(`Seat layout "${seat.name}" has been deleted.`, "info");
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setStatusFilter("All");
  };

  if (!isLoaded) return null;

  return (
    <div style={{ width: "100%" }}>
      {/* ── If No Seats Added Yet: Show ONLY the Empty State in Viewport (Matching Attraction Management Image 1) ── */}
      {seats.length === 0 ? (
        <SeatEmptyState onCreateSeat={handleOpenCreate} />
      ) : (
        /* ── Once Data is Listed: Show Header with + Create Seat in Top-Right & Filter Bar & Cards Grid ── */
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Top Bar with Title + Create Seat in top right */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "14px",
            }}
          >
            <div>
              <h1
                style={{
                  margin: 0,
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 800,
                  fontSize: "24px",
                  lineHeight: "30px",
                  color: "#011B2F",
                }}
              >
                Seat Management
              </h1>
              <p
                style={{
                  margin: "4px 0 0 0",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 500,
                  fontSize: "13px",
                  color: "#6B7280",
                }}
              >
                Configure attraction coaches, rows &amp; columns, and movable aisles.
              </p>
            </div>

            {/* Top Right: Create Seat Button */}
            <button
              type="button"
              onClick={handleOpenCreate}
              style={{
                height: "42px",
                padding: "0 22px",
                background: "#0C2A42",
                border: "none",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 600,
                fontSize: "14px",
                color: "#FFFFFF",
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(12, 42, 66, 0.25)",
                transition: "all 0.18s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#173F63";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#0C2A42";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <Plus size={18} color="#FFFFFF" strokeWidth={2.5} />
              <span>Create Seat</span>
            </button>
          </div>

          {/* Filters Bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "14px",
              background: "#FFFFFF",
              padding: "14px 18px",
              borderRadius: "8px",
              border: "1px solid rgba(179, 175, 175, 0.4)",
            }}
          >
            {/* Search Input */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "#FFFFFF",
                border: "1.5px solid rgba(179, 175, 175, 0.51)",
                borderRadius: "4px",
                padding: "0 12px",
                height: "38px",
                flex: 1,
                minWidth: "240px",
                maxWidth: "380px",
                boxSizing: "border-box",
              }}
            >
              <Search size={16} color="#B3AFAF" />
              <input
                type="text"
                placeholder="Search seat name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: "100%",
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 600,
                  fontSize: "12px",
                  color: "#011B2F",
                }}
              />
            </div>

            {/* Status Filter & Reset */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span
                  style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: 600,
                    fontSize: "11px",
                    color: "rgba(81, 82, 82, 0.75)",
                  }}
                >
                  Status:
                </span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{
                    height: "38px",
                    padding: "0 12px",
                    background: "#FFFFFF",
                    border: "0.5px solid #B3AFAF",
                    borderRadius: "4px",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: 600,
                    fontSize: "12px",
                    color: "#173F63",
                    cursor: "pointer",
                    outline: "none",
                  }}
                >
                  <option value="All">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              {(searchTerm || statusFilter !== "All") && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  style={{
                    height: "38px",
                    padding: "0 12px",
                    borderRadius: "4px",
                    border: "0.5px solid rgba(179, 175, 175, 0.66)",
                    background: "#FFFFFF",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: 600,
                    fontSize: "12px",
                    color: "#173F63",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <RotateCcw size={14} />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>

          {/* Cards Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
              gap: "18px",
            }}
          >
            {filteredSeats.map((seat) => (
              <SeatCard
                key={seat.id}
                seat={seat}
                onView={handleView}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>

          {filteredSeats.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: "40px",
                background: "#FFFFFF",
                borderRadius: "8px",
                border: "1px solid #E5E7EB",
                color: "#6B7280",
                fontSize: "13px",
              }}
            >
              No seat layouts match your search criteria.
            </div>
          )}
        </div>
      )}

      {/* ── Create / Edit Seat Dialog Box ── */}
      <CreateSeatModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setSelectedSeat(null);
        }}
        initialData={selectedSeat}
        onSave={handleSaveSeat}
      />

      {/* ── View Seat Dialog Box ── */}
      <ViewSeatModal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedSeat(null);
        }}
        seat={selectedSeat}
        onEdit={() => {
          setIsViewModalOpen(false);
          setIsCreateModalOpen(true);
        }}
      />
    </div>
  );
}
