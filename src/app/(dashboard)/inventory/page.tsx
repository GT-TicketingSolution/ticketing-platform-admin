"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  AlertTriangle,
  Plus,
  Search,
  RotateCcw,
  Calendar,
  Boxes,
  SearchX,
  Edit2,
} from "lucide-react";
import { META_CONSTANTS } from "@/lib/metaConstant";
import AddCapacityModal from "@/components/modals/AddCapacityModal";
import { GlobalDataTable, GlobalColumn } from "@/components/ui/GlobalDataTable";
import {
  useInventoryList,
  InventoryItem,
  InventoryListParams,
} from "@/hooks/useInventoryQueries";
import { useAttractionManagementList } from "@/hooks/useAttractionManagementQueries";

const ITEMS_PER_PAGE = 10;

export default function InventoryPage() {
  // ── Search & Filter State ──────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [selectedAttractionId, setSelectedAttractionId] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);

  // ── Modal State ────────────────────────────────────────────────────────────
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  useEffect(() => {
    document.title = META_CONSTANTS.inventory.fullTitle;
  }, []);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, selectedAttractionId, statusFilter, dateFrom, dateTo]);

  // ── Live API Queries ───────────────────────────────────────────────────────
  const queryParams: InventoryListParams = {
    page: currentPage,
    limit: ITEMS_PER_PAGE,
    search: debouncedSearch || undefined,
    attractionId: selectedAttractionId !== "All" ? selectedAttractionId : undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  };

  const { data: inventoryData, isLoading, refetch } = useInventoryList(queryParams);
  const { data: attractionsData = [] } = useAttractionManagementList();

  const inventoryItems = inventoryData?.items ?? [];
  const pagination = inventoryData?.pagination ?? { page: 1, limit: ITEMS_PER_PAGE, total: 0, totalPages: 0 };

  // Attractions for filter dropdown & modal
  const attractionOptions = useMemo(() => {
    const list = Array.isArray(attractionsData)
      ? (attractionsData as any[]).map((a: any) => ({ id: a.id, name: a.name || "-" }))
      : [];
    return [{ id: "All", name: "All Attractions" }, ...list];
  }, [attractionsData]);

  // Client-side status filter applied if statusFilter !== "ALL"
  const filteredItems = useMemo(() => {
    if (statusFilter === "ALL") return inventoryItems;
    return inventoryItems.filter((item) => {
      const avail = item.availableCapacity ?? 0;
      const isFull = avail <= 0;
      const isNearFull = !isFull && avail <= 20;
      const isAvailable = avail > 20;

      if (statusFilter === "FULL") return isFull;
      if (statusFilter === "NEAR_FULL") return isNearFull;
      if (statusFilter === "AVAILABLE") return isAvailable;
      return true;
    });
  }, [inventoryItems, statusFilter]);

  // ── Dynamic Summary Statistics ─────────────────────────────────────────────
  const totalCapacity = useMemo(
    () => inventoryItems.reduce((acc, curr) => acc + (curr.totalCapacity || 0), 0),
    [inventoryItems]
  );
  const totalBooked = useMemo(
    () => inventoryItems.reduce((acc, curr) => acc + (curr.bookedCapacity || 0), 0),
    [inventoryItems]
  );
  const totalAvailable = useMemo(
    () => inventoryItems.reduce((acc, curr) => acc + (curr.availableCapacity || 0), 0),
    [inventoryItems]
  );
  const atRiskCount = useMemo(
    () => inventoryItems.filter((a) => (a.availableCapacity ?? 0) <= 0).length,
    [inventoryItems]
  );
  const utilizationRate = useMemo(
    () => (totalCapacity > 0 ? Math.round((totalBooked / totalCapacity) * 100) : 0),
    [totalCapacity, totalBooked]
  );

  // ── Dynamic Live Alerts ────────────────────────────────────────────────────
  const liveAlerts = useMemo(() => {
    return inventoryItems
      .filter((item) => (item.availableCapacity ?? 0) <= 20)
      .map((item) => {
        const avail = item.availableCapacity ?? 0;
        const isDanger = avail <= 0;
        return {
          id: item.id,
          name: item.attraction?.name || "-",
          date: item.capacityDate,
          alertType: isDanger ? ("danger" as const) : ("warning" as const),
          alertText: isDanger
            ? `Fully booked (0 seats remaining) for ${item.capacityDate !== "-" ? item.capacityDate : "selected date"}.`
            : `Only ${avail} seats remaining for ${item.capacityDate !== "-" ? item.capacityDate : "selected date"}.`,
        };
      });
  }, [inventoryItems]);

  const isFiltered =
    !!debouncedSearch ||
    selectedAttractionId !== "All" ||
    statusFilter !== "ALL" ||
    !!dateFrom ||
    !!dateTo;

  const handleResetFilters = () => {
    setSearchQuery("");
    setDebouncedSearch("");
    setSelectedAttractionId("All");
    setStatusFilter("ALL");
    setDateFrom("");
    setDateTo("");
    setCurrentPage(1);
  };

  const handleOpenAddCapacity = (item?: InventoryItem) => {
    setSelectedItem(item || null);
    setIsModalOpen(true);
  };

  // Helper date formatter
  const formatDateDisplay = (dateStr?: string) => {
    if (!dateStr || dateStr === "-") return "-";
    try {
      const parsed = new Date(dateStr);
      if (isNaN(parsed.getTime())) return dateStr;
      return parsed.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  // ── Table Columns Definition ───────────────────────────────────────────────
  const columns: GlobalColumn<InventoryItem>[] = [
    {
      header: "Attraction",
      cell: (item) => (
        <span style={{ fontWeight: 700, color: "#002A45", fontSize: "13px" }}>
          {item.attraction?.name || "-"}
        </span>
      ),
    },
    {
      header: "Date",
      align: "center",
      cell: (item) => (
        <span style={{ color: "#475569", fontWeight: 500 }}>
          {formatDateDisplay(item.capacityDate)}
        </span>
      ),
    },
    {
      header: "Daily Cap.",
      align: "center",
      cell: (item) => (
        <span
          style={{
            fontFamily: "'DM Mono', monospace",
            fontWeight: 600,
            fontSize: "13px",
            color: "#374151",
          }}
        >
          {item.totalCapacity !== undefined ? item.totalCapacity.toLocaleString() : "-"}
        </span>
      ),
    },
    {
      header: "Booked",
      align: "center",
      cell: (item) => {
        const avail = item.availableCapacity ?? 0;
        const isFull = avail <= 0;
        const color = isFull ? "#EF4444" : avail <= 20 ? "#F59E0B" : "#374151";
        return (
          <span
            style={{
              fontFamily: "'DM Mono', monospace",
              fontWeight: 600,
              fontSize: "13px",
              color,
            }}
          >
            {item.bookedCapacity !== undefined ? item.bookedCapacity.toLocaleString() : "-"}
          </span>
        );
      },
    },
    {
      header: "Available",
      align: "center",
      cell: (item) => {
        const avail = item.availableCapacity ?? 0;
        const isFull = avail <= 0;
        const color = isFull ? "#EF4444" : "#10B981";
        return (
          <span
            style={{
              fontFamily: "'DM Mono', monospace",
              fontWeight: 600,
              fontSize: "13px",
              color,
            }}
          >
            {item.availableCapacity !== undefined ? item.availableCapacity.toLocaleString() : "-"}
          </span>
        );
      },
    },
    {
      header: "Status",
      align: "center",
      cell: (item) => {
        const avail = item.availableCapacity ?? 0;
        const isFull = avail <= 0;
        const isNearFull = !isFull && avail <= 20;
        const statusText = isFull ? "Full" : isNearFull ? "Near Full" : "Available";

        const bg = isFull ? "#FEF2F2" : isNearFull ? "#FFFBEB" : "#F0FDF4";
        const color = isFull ? "#EF4444" : isNearFull ? "#F59E0B" : "#10B981";

        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "86px",
              height: "26px",
              borderRadius: "20px",
              background: bg,
              color,
              fontFamily: "'DM Mono', monospace",
              fontWeight: 600,
              fontSize: "11px",
            }}
          >
            {statusText}
          </span>
        );
      },
    },
    {
      header: "Actions",
      align: "center",
      cell: (item) => (
        <button
          type="button"
          onClick={() => handleOpenAddCapacity(item)}
          style={{
            background: "#FFFFFF",
            border: "1px solid #CBD5E1",
            borderRadius: "6px",
            padding: "5px 10px",
            fontSize: "11px",
            fontWeight: 600,
            color: "#0C2A42",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            transition: "all 0.15s ease",
          }}
          className="row-edit-btn"
        >
          <Edit2 size={12} />
          <span>Update</span>
        </button>
      ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", width: "100%", maxWidth: "1440px", margin: "0 auto" }}>

      {/* ── TOP STAT CARDS ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "18px",
          width: "100%",
        }}
      >
        {/* Card 1: Total Daily Capacity */}
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #A0A0A0",
            boxShadow: "-2px 4px 5.6px rgba(0, 0, 0, 0.25)",
            borderRadius: "20px",
            padding: "20px 22px",
            minHeight: "110px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            boxSizing: "border-box",
            transition: "transform 0.18s ease, box-shadow 0.18s ease",
          }}
          className="stat-card-hover"
        >
          <div
            style={{
              fontFamily: "'DM Mono', monospace",
              fontWeight: 500,
              fontSize: "26px",
              lineHeight: "26px",
              color: "#1E3A5F",
              marginBottom: "8px",
            }}
          >
            {isLoading ? "-" : totalCapacity.toLocaleString()}
          </div>
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 700,
              fontSize: "12px",
              lineHeight: "18px",
              color: "#374151",
              marginBottom: "2px",
            }}
          >
            Total Daily Capacity
          </div>
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 400,
              fontSize: "11px",
              lineHeight: "16px",
              color: "#94A3B8",
            }}
          >
            Current page inventory
          </div>
        </div>

        {/* Card 2: Seats Booked */}
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #A0A0A0",
            boxShadow: "-2px 4px 5.6px rgba(0, 0, 0, 0.25)",
            borderRadius: "20px",
            padding: "20px 22px",
            minHeight: "110px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            boxSizing: "border-box",
            transition: "transform 0.18s ease, box-shadow 0.18s ease",
          }}
          className="stat-card-hover"
        >
          <div
            style={{
              fontFamily: "'DM Mono', monospace",
              fontWeight: 500,
              fontSize: "26px",
              lineHeight: "26px",
              color: "#F59E0B",
              marginBottom: "8px",
            }}
          >
            {isLoading ? "-" : totalBooked.toLocaleString()}
          </div>
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 700,
              fontSize: "12px",
              lineHeight: "18px",
              color: "#374151",
              marginBottom: "2px",
            }}
          >
            Seats Booked
          </div>
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 400,
              fontSize: "11px",
              lineHeight: "16px",
              color: "#94A3B8",
            }}
          >
            {isLoading ? "-" : `${utilizationRate}% utilization rate`}
          </div>
        </div>

        {/* Card 3: Seats Available */}
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #A0A0A0",
            boxShadow: "-2px 4px 5.6px rgba(0, 0, 0, 0.25)",
            borderRadius: "20px",
            padding: "20px 22px",
            minHeight: "110px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            boxSizing: "border-box",
            transition: "transform 0.18s ease, box-shadow 0.18s ease",
          }}
          className="stat-card-hover"
        >
          <div
            style={{
              fontFamily: "'DM Mono', monospace",
              fontWeight: 500,
              fontSize: "26px",
              lineHeight: "26px",
              color: "#10B981",
              marginBottom: "8px",
            }}
          >
            {isLoading ? "-" : totalAvailable.toLocaleString()}
          </div>
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 700,
              fontSize: "12px",
              lineHeight: "18px",
              color: "#374151",
              marginBottom: "2px",
            }}
          >
            Seats Available
          </div>
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 400,
              fontSize: "11px",
              lineHeight: "16px",
              color: "#94A3B8",
            }}
          >
            Open for booking now
          </div>
        </div>

        {/* Card 4: Attractions at Risk */}
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #A0A0A0",
            boxShadow: "-2px 4px 5.6px rgba(0, 0, 0, 0.25)",
            borderRadius: "20px",
            padding: "20px 22px",
            minHeight: "110px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            boxSizing: "border-box",
            transition: "transform 0.18s ease, box-shadow 0.18s ease",
          }}
          className="stat-card-hover"
        >
          <div
            style={{
              fontFamily: "'DM Mono', monospace",
              fontWeight: 500,
              fontSize: "26px",
              lineHeight: "26px",
              color: "#EF4444",
              marginBottom: "8px",
            }}
          >
            {isLoading ? "-" : atRiskCount}
          </div>
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 700,
              fontSize: "12px",
              lineHeight: "18px",
              color: "#374151",
              marginBottom: "2px",
            }}
          >
            Attractions at Risk
          </div>
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 400,
              fontSize: "11px",
              lineHeight: "16px",
              color: "#94A3B8",
            }}
          >
            100% capacity reached
          </div>
        </div>
      </div>

      {/* ── CAPACITY ALERT BANNERS SECTION (Live Only) ── */}
      {liveAlerts.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%" }}>
          {liveAlerts.map((alert, idx) => {
            const isDanger = alert.alertType === "danger";
            const bgColor = isDanger ? "#FEF2F2" : "#FFFBEB";
            const borderColor = isDanger ? "#FEE2E2" : "#FEF3C7";
            const iconColor = isDanger ? "#DC2626" : "#D97706";
            const titleColor = isDanger ? "#DC2626" : "#D97706";
            const textColor = isDanger ? "#EF4444" : "#F59E0B";

            return (
              <div
                key={`alert-${alert.id}-${idx}`}
                style={{
                  boxSizing: "border-box",
                  width: "100%",
                  minHeight: "52px",
                  background: bgColor,
                  border: `1px solid ${borderColor}`,
                  borderRadius: "16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 20px",
                  gap: "14px",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <AlertTriangle size={18} color={iconColor} strokeWidth={2} />
                  <div style={{ fontSize: "13px", lineHeight: "18px", fontFamily: "'Inter', sans-serif" }}>
                    <strong style={{ fontWeight: 700, color: titleColor, marginRight: "6px" }}>
                      {alert.name}:
                    </strong>
                    <span style={{ fontWeight: 400, color: textColor }}>
                      {alert.alertText}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── FILTER & SEARCH CONTROLS ── */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          background: "#FFFFFF",
          padding: "18px 20px",
          borderRadius: "16px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          border: "1px solid #E5E7EB",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
          {/* Status Filter Badges */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            {[
              { id: "ALL", label: "All Status" },
              { id: "AVAILABLE", label: "Available" },
              { id: "NEAR_FULL", label: "Near Full" },
              { id: "FULL", label: "Full" },
            ].map((st) => {
              const active = statusFilter === st.id;
              return (
                <button
                  key={st.id}
                  onClick={() => setStatusFilter(st.id)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "20px",
                    border: active ? "1.5px solid #0C2A42" : "1px solid #E2E8F0",
                    background: active ? "#0C2A42" : "#F8FAFC",
                    color: active ? "#FFFFFF" : "#64748B",
                    fontSize: "12px",
                    fontWeight: 600,
                    fontFamily: "'Inter', sans-serif",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {st.label}
                </button>
              );
            })}
          </div>

          {/* Action Trigger */}
          <button
            onClick={() => handleOpenAddCapacity()}
            style={{
              padding: "9px 18px",
              borderRadius: "10px",
              background: "#F4BC43",
              color: "#011B2F",
              border: "none",
              fontWeight: 700,
              fontSize: "13px",
              fontFamily: "'Inter', sans-serif",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 2px 8px rgba(244, 188, 67, 0.3)",
            }}
          >
            <Plus size={16} />
            Set Daily Capacity
          </button>
        </div>

        {/* Filter Inputs Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "12px",
            alignItems: "flex-end",
          }}
        >
          {/* Search Box */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "11px", fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
              Search Attraction
            </label>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                border: "1px solid #CBD5E1",
                borderRadius: "8px",
                padding: "8px 12px",
                background: "#FFFFFF",
              }}
            >
              <Search size={16} color="#94A3B8" />
              <input
                type="text"
                placeholder="Search attraction name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  border: "none",
                  outline: "none",
                  width: "100%",
                  fontSize: "13px",
                  color: "#0F172A",
                }}
              />
            </div>
          </div>

          {/* Attraction Dropdown */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "11px", fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
              Attraction Filter
            </label>
            <select
              value={selectedAttractionId}
              onChange={(e) => setSelectedAttractionId(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid #CBD5E1",
                fontSize: "13px",
                color: "#0F172A",
                background: "#FFFFFF",
                outline: "none",
                cursor: "pointer",
                height: "37px",
              }}
            >
              {attractionOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date From */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "11px", fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
              Date From
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={{
                width: "100%",
                padding: "7px 12px",
                borderRadius: "8px",
                border: "1px solid #CBD5E1",
                fontSize: "13px",
                color: "#0F172A",
                outline: "none",
                boxSizing: "border-box",
                height: "37px",
              }}
            />
          </div>

          {/* Date To */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "11px", fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
              Date To
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={{
                width: "100%",
                padding: "7px 12px",
                borderRadius: "8px",
                border: "1px solid #CBD5E1",
                fontSize: "13px",
                color: "#0F172A",
                outline: "none",
                boxSizing: "border-box",
                height: "37px",
              }}
            />
          </div>

          {/* Reset Button */}
          {isFiltered && (
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button
                type="button"
                onClick={handleResetFilters}
                style={{
                  height: "37px",
                  padding: "0 16px",
                  borderRadius: "8px",
                  border: "1px solid #CBD5E1",
                  background: "#F8FAFC",
                  color: "#475569",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <RotateCcw size={14} />
                <span>Reset</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── INVENTORY DATA TABLE ── */}
      <GlobalDataTable
        columns={columns}
        data={filteredItems}
        keyExtractor={(item) => item.id}
        pageSize={ITEMS_PER_PAGE}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        totalItems={pagination.total}
        totalPages={pagination.totalPages}
        showSNo={true}
        sNoHeader="S.No"
        itemLabel="inventory records"
        isLoading={isLoading}
        emptyIcon={isFiltered ? <SearchX size={28} color="#0C2A42" /> : <Boxes size={28} color="#0C2A42" />}
        emptyTitle={isFiltered ? "No Matching Inventory Found" : "No Inventory Records"}
        emptyDescription={
          isFiltered
            ? "No inventory records match the current filter or date range. Try adjusting your search."
            : "No attraction daily capacity records have been configured yet. Click 'Set Daily Capacity' to get started."
        }
        emptyAction={
          isFiltered ? (
            <button
              onClick={handleResetFilters}
              style={{
                marginTop: "12px",
                padding: "8px 16px",
                background: "#0C2A42",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Clear Filters
            </button>
          ) : (
            <button
              onClick={() => handleOpenAddCapacity()}
              style={{
                marginTop: "12px",
                padding: "8px 16px",
                background: "#F4BC43",
                color: "#011B2F",
                border: "none",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              + Set Daily Capacity
            </button>
          )
        }
      />

      {/* ── ADD / UPDATE CAPACITY MODAL ── */}
      <AddCapacityModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedItem={selectedItem}
        attractionsList={attractionOptions.filter((a) => a.id !== "All")}
        onSuccess={() => refetch()}
      />

      {/* ── STYLES ── */}
      <style>{`
        .stat-card-hover:hover {
          transform: translateY(-2px);
          box-shadow: -2px 6px 12px rgba(0, 0, 0, 0.18) !important;
        }
        .row-edit-btn:hover {
          background: #0C2A42 !important;
          color: #FFFFFF !important;
          border-color: #0C2A42 !important;
        }
      `}</style>
    </div>
  );
}
