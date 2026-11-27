"use client";

import React, { useState, useEffect } from "react";
import { Plus, Search, RotateCcw } from "lucide-react";
import { META_CONSTANTS } from "@/lib/metaConstant";
import { confirmDelete } from "@/lib/notify";
import { canPerformRoleAction } from "@/lib/auth/role-actions";
import { useProfileQuery } from "@/hooks/useAuthQueries";
import SeatEmptyState from "@/components/seat/SeatEmptyState";
import SeatCard from "@/components/seat/SeatCard";
import SeatDetailView from "@/components/seat/SeatDetailView";
import AddEditSeatForm from "@/components/seat/AddEditSeatForm";
import {
  useSeatLayouts,
  useCreateSeatLayout,
  useUpdateSeatLayout,
  useDeleteSeatLayout,
  type SeatQueryParams,
} from "@/hooks/useSeatQueries";
import { useSyncParamsToUrl, useInitFromUrl } from "@/hooks/useUrlSync";
import { SeatConfigData } from "./types";

export default function SeatManagementPage() {
  // Query / Filter State
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("All");

  useInitFromUrl({
    search: (v) => { setSearchTerm(v); setDebouncedSearch(v); },
    status: (v) => setStatusFilter(v === "ACTIVE" ? "Active" : v === "INACTIVE" ? "Inactive" : v),
  });

  // Page View Mode State ("list" | "create" | "edit" | "view")
  const [viewMode, setViewMode] = useState<"list" | "create" | "edit" | "view">("list");
  const [selectedSeat, setSelectedSeat] = useState<SeatConfigData | null>(null);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 350);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Page title
  useEffect(() => {
    document.title = META_CONSTANTS.seatManagement.fullTitle;
  }, []);

  // API status filter
  const apiStatus =
    statusFilter === "Active"
      ? "ACTIVE"
      : statusFilter === "Inactive"
        ? "INACTIVE"
        : undefined;

  const seatQueryParams: SeatQueryParams = {
    search: debouncedSearch || undefined,
    status: apiStatus,
  };

  useSyncParamsToUrl(seatQueryParams);

  // Queries
  const {
    data: seatData,
    isLoading,
    isFetching,
  } = useSeatLayouts(seatQueryParams);

  // Mutations
  const createMutation = useCreateSeatLayout();
  const updateMutation = useUpdateSeatLayout();
  const deleteMutation = useDeleteSeatLayout();

  const { data: profileData } = useProfileQuery();
  const canManageSeats = canPerformRoleAction(
    (profileData?.profile || (profileData as any)?.data?.profile)?.role,
    "SEAT_LAYOUT_MANAGE",
  );

  const items = seatData?.items ?? [];

  // Convert API SeatLayoutItem -> SeatConfigData
  const seatConfigItems: SeatConfigData[] = items.map((s) => ({
    id: s.id,
    name: s.name || "—",
    rows: s.rows ?? 0,
    cols: s.cols ?? 0,

    hasAisle: !!s.hasAisle,

    aisleType: s.aisleType,
    aisleDirection: s.aisleDirection,
    aislePosition: s.aislePosition,

    aisleAfterCol: s.aisleAfterCol ?? null,
    aisleAfterRow: s.aisleAfterRow ?? null,

    status: s.status,

    totalSeats: s.totalSeats ?? (s.rows ?? 0) * (s.cols ?? 0),

    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  }));

  // ============================================================
  // SAVE / CREATE / UPDATE
  // ============================================================

  const handleSaveSeat = async (data: SeatConfigData) => {
    const statusPayload =
      String(data.status).toUpperCase() === "ACTIVE" ? "ACTIVE" : "INACTIVE";

    const finalRows = Math.max(1, data.rows || 1);
    const finalCols = Math.max(1, data.cols || 1);

    const hasAisle = Boolean(data.hasAisle);

    /*
     * When aisle is disabled, positions are explicitly sent as null.
     *
     * Vertical:
     *   aisleAfterCol = selected column
     *   aisleAfterRow = null
     *
     * Horizontal:
     *   aisleAfterRow = selected row
     *   aisleAfterCol = null
     */
    const aisleDirection = hasAisle
      ? data.aisleDirection || "VERTICAL"
      : "VERTICAL";

    const aisleAfterCol =
      hasAisle && aisleDirection === "VERTICAL"
        ? (data.aisleAfterCol ?? null)
        : null;

    const aisleAfterRow =
      hasAisle && aisleDirection === "HORIZONTAL"
        ? (data.aisleAfterRow ?? null)
        : null;

    try {
      // ========================================================
      // UPDATE EXISTING
      // ========================================================

      if (data.id) {
        await updateMutation.mutateAsync({
          seatId: data.id,

          data: {
            name: data.name.trim(),

            rows: finalRows,

            cols: finalCols,

            hasAisle,

            aisleDirection,

            aisleAfterCol,

            aisleAfterRow,

            status: statusPayload,
          },
        });
      }

      // ========================================================
      // CREATE NEW
      // ========================================================
      else {
        await createMutation.mutateAsync({
          name: data.name.trim(),

          rows: finalRows,

          cols: finalCols,

          hasAisle,

          aisleDirection,

          aisleAfterCol,

          aisleAfterRow,

          status: statusPayload,
        });
      }

      setSelectedSeat(null);
      setViewMode("list");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      // Error is handled inside the mutation.
    }
  };

  // ============================================================
  // OPEN CREATE
  // ============================================================

  const handleOpenCreate = () => {
    setSelectedSeat(null);
    setViewMode("create");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ============================================================
  // VIEW
  // ============================================================

  const handleView = (seat: SeatConfigData) => {
    setSelectedSeat(seat);
    setViewMode("view");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ============================================================
  // EDIT
  // ============================================================

  const handleEdit = (seat: SeatConfigData) => {
    setSelectedSeat(seat);
    setViewMode("edit");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ============================================================
  // DELETE
  // ============================================================

  const handleDelete = async (seat: SeatConfigData) => {
    if (!seat.id) return;

    const confirmed = await confirmDelete(`seat layout "${seat.name}"`);

    if (!confirmed) return;

    try {
      await deleteMutation.mutateAsync(seat.id);
      if (viewMode === "view" || (selectedSeat && selectedSeat.id === seat.id)) {
        setSelectedSeat(null);
        setViewMode("list");
      }
    } catch {
      // Error is handled inside the mutation.
    }
  };

  // ============================================================
  // RESET FILTERS
  // ============================================================

  const handleResetFilters = () => {
    setSearchTerm("");
    setDebouncedSearch("");
    setStatusFilter("All");
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const isFiltering = Boolean(searchTerm.trim() || statusFilter !== "All");

  return (
    <div style={{ width: "100%" }}>
      {/* ======================================================
          VIEW MODE (FULL PAGE)
      ====================================================== */}
      {viewMode === "view" && selectedSeat && (
        <SeatDetailView
          seat={seatConfigItems.find((s) => s.id === selectedSeat.id) || selectedSeat}
          onBack={() => {
            setViewMode("list");
            setSelectedSeat(null);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          onEdit={(seat) => {
            handleEdit(seat);
          }}
          onDelete={async (seat) => {
            await handleDelete(seat);
          }}
          canManage={canManageSeats}
        />
      )}

      {/* ======================================================
          CREATE / EDIT MODE (FULL PAGE)
      ====================================================== */}
      {(viewMode === "create" || viewMode === "edit") && (
        <AddEditSeatForm
          initialData={viewMode === "edit" ? selectedSeat : null}
          onSave={handleSaveSeat}
          onCancel={() => {
            if (viewMode === "create" || !selectedSeat) {
              setViewMode("list");
              setSelectedSeat(null);
            } else {
              setViewMode("view");
            }
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          isLoading={isSaving}
        />
      )}

      {/* ======================================================
          LISTING MODE
      ====================================================== */}
      {viewMode === "list" && (
        <>
          {/* ======================================================
              INITIAL EMPTY STATE
          ====================================================== */}

          {!isLoading && items.length === 0 && !isFiltering ? (
            <SeatEmptyState onCreateSeat={canManageSeats ? handleOpenCreate : undefined} />
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "20px",
              }}
            >
          {/* ==================================================
              HEADER
          ================================================== */}

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
                Configure attraction coaches, rows & columns, and movable
                aisles.
              </p>
            </div>

            {/* Create Button */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              {canManageSeats && (
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
              )}
            </div>
          </div>

          {/* ==================================================
              FILTER BAR
          ================================================== */}

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
            {/* Search */}
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

            {/* Status + Reset */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
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

          {/* ==================================================
              LOADING STATE
          ================================================== */}

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

          {/* ==================================================
              CARDS
          ================================================== */}

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
                  onEdit={canManageSeats ? handleEdit : undefined}
                  onDelete={canManageSeats ? handleDelete : undefined}
                />
              ))}
            </div>
          )}

          {/* ==================================================
              EMPTY FILTERED RESULTS
          ================================================== */}

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
    </>
  )}
</div>
);
}
