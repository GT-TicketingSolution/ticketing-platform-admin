"use client";

import React, { useState, useEffect } from "react";
import { Plus, Search, RotateCcw } from "lucide-react";
import { META_CONSTANTS } from "@/lib/metaConstant";
import { confirmDelete } from "@/lib/notify";
import SeatEmptyState from "@/components/seat/SeatEmptyState";
import SeatCard from "@/components/seat/SeatCard";
import CreateSeatModal from "@/components/modals/CreateSeatModal";
import ViewSeatModal from "@/components/modals/ViewSeatModal";
import {
  useSeatLayouts,
  useCreateSeatLayout,
  useUpdateSeatLayout,
  useDeleteSeatLayout,
} from "@/hooks/useSeatQueries";
import { SeatConfigData } from "./types";

export default function SeatManagementPage() {
  // Query / Filter State
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("All");

  // Modals State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState<boolean>(false);
  const [selectedSeat, setSelectedSeat] = useState<SeatConfigData | null>(null);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    document.title = META_CONSTANTS.seatManagement.fullTitle;
  }, []);

  // API Queries & Mutations
  const apiStatus =
    statusFilter === "Active" ? "ACTIVE" : statusFilter === "Inactive" ? "INACTIVE" : undefined;

  const {
    data: seatData,
    isLoading,
    isFetching,
  } = useSeatLayouts({
    search: debouncedSearch || undefined,
    status: apiStatus,
  });

  const createMutation = useCreateSeatLayout();
  const updateMutation = useUpdateSeatLayout();
  const deleteMutation = useDeleteSeatLayout();

  const items = seatData?.items ?? [];

  // Convert SeatLayoutItem to SeatConfigData for modals / cards
  const seatConfigItems: SeatConfigData[] = items.map((s) => ({
    id: s.id,
    name: s.name || "—",
    rows: s.rows ?? 0,
    cols: s.cols ?? 0,
    hasAisle: !!s.hasAisle,
    aisleAfterCol: s.aisleAfterCol ?? 0,
    status: s.status,
    totalSeats: s.totalSeats ?? (s.rows ?? 0) * (s.cols ?? 0),
    createdAt: s.createdAt,
  }));

  // Actions
  const handleSaveSeat = async (data: SeatConfigData) => {
    const statusPayload =
      String(data.status).toUpperCase() === "ACTIVE" ? "ACTIVE" : "INACTIVE";

    const finalRows = Math.max(1, data.rows || 1);
    const finalCols = Math.max(1, data.cols || 1);
    const hasAisleBackend = finalCols > 1 ? Boolean(data.hasAisle) : false;
    const aisleAfterColBackend = hasAisleBackend
      ? Math.min(
          finalCols - 1,
          Math.max(1, data.aislePosition || (data.aisleAfterCol > 0 ? data.aisleAfterCol : 1))
        )
      : 0;

    try {
      if (data.id) {
        // Edit existing
        await updateMutation.mutateAsync({
          seatId: data.id,
          data: {
            name: data.name.trim(),
            rows: finalRows,
            cols: finalCols,
            hasAisle: hasAisleBackend,
            aisleAfterCol: aisleAfterColBackend,
            status: statusPayload,
          },
        });
      } else {
        // Create new
        await createMutation.mutateAsync({
          name: data.name.trim(),
          rows: finalRows,
          cols: finalCols,
          hasAisle: hasAisleBackend,
          aisleAfterCol: aisleAfterColBackend,
          status: statusPayload,
        });
      }
      setSelectedSeat(null);
      setIsCreateModalOpen(false);
    } catch {
      // Error handled by mutation onError
    }
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
    if (!seat.id) return;
    const confirmed = await confirmDelete(`seat layout "${seat.name}"`);
    if (!confirmed) return;

    try {
      await deleteMutation.mutateAsync(seat.id);
    } catch {
      // Error handled by mutation onError
    }
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setDebouncedSearch("");
    setStatusFilter("All");
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const isFiltering = Boolean(searchTerm.trim() || statusFilter !== "All");

  return (
    <div style={{ width: "100%" }}>
      {/* ── Initial Empty State: If no seats exist in database and no search active ── */}
      {!isLoading && items.length === 0 && !isFiltering ? (
        <SeatEmptyState onCreateSeat={handleOpenCreate} />
      ) : (
        /* ── Main Data View ── */
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Top Bar with Title & Actions */}
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
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
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

            {/* Top Right Buttons */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
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

              {isFiltering && (
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

          {/* Loading State */}
          {isLoading && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
                gap: "18px",
              }}
            >
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  style={{
                    height: "355px",
                    borderRadius: "8px",
                    background: "#F3F4F6",
                    border: "1.5px solid #E5E7EB",
                  }}
                />
              ))}
            </div>
          )}

          {/* Cards Grid */}
          {!isLoading && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
                gap: "18px",
              }}
            >
              {seatConfigItems.map((seat) => (
                <SeatCard
                  key={seat.id}
                  seat={seat}
                  onView={handleView}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}

          {/* Empty Filtered Results */}
          {!isLoading && seatConfigItems.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: "48px 20px",
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
        isLoading={isSaving}
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


