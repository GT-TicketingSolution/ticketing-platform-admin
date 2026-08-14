"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  AlertTriangle,
  AlertCircle,
  Plus,
  Search,
  Filter,
  Calendar as CalendarIcon,
  RefreshCw,
  Clock,
  ChevronRight,
  TrendingUp,
  CheckCircle2,
  Boxes,
} from "lucide-react";
import { META_CONSTANTS } from "@/lib/metaConstant";
import AddCapacityModal, { AttractionInventoryItem } from "@/components/modals/AddCapacityModal";
import { useToast } from "@/components/ui/Toast";

// Initial mock data matching Figma exact specifications
const INITIAL_ATTRACTIONS: AttractionInventoryItem[] = [
  {
    id: "nahargarh-fort",
    name: "Nahargarh fort",
    dailyCap: 500,
    booked: 320,
    available: 180,
    status: "Available",
    alertText: "09:00 AM has only 2 seats left.",
    alertType: "warning",
    slots: [
      { time: "09:00 AM", booked: 98, capacity: 100, status: "Near Full" },
      { time: "10:30 AM", booked: 65, capacity: 100, status: "Available" },
      { time: "11:00 AM", booked: 52, capacity: 100, status: "Available" },
      { time: "02:00 PM", booked: 55, capacity: 100, status: "Available" },
      { time: "04:30 PM", booked: 50, capacity: 100, status: "Available" },
    ],
  },
  {
    id: "amber-fort-ropeway",
    name: "Amber Fort Ropeway",
    dailyCap: 200,
    booked: 195,
    available: 5,
    status: "Near Full",
    alertText: "09:00 AM & 10:30 AM slots are sold out.",
    alertType: "warning",
    slots: [
      { time: "09:00 AM", booked: 40, capacity: 40, status: "Full" },
      { time: "10:30 AM", booked: 40, capacity: 40, status: "Full" },
      { time: "11:00 AM", booked: 38, capacity: 40, status: "Near Full" },
      { time: "02:00 PM", booked: 39, capacity: 40, status: "Near Full" },
      { time: "04:30 PM", booked: 38, capacity: 40, status: "Near Full" },
    ],
  },
  {
    id: "city-palace",
    name: "City Palace",
    dailyCap: 400,
    booked: 280,
    available: 120,
    status: "Available",
    alertText: "11:00 AM has only 2 seats left.",
    alertType: "warning",
    slots: [
      { time: "09:00 AM", booked: 50, capacity: 80, status: "Available" },
      { time: "10:30 AM", booked: 60, capacity: 80, status: "Available" },
      { time: "11:00 AM", booked: 78, capacity: 80, status: "Near Full" },
      { time: "02:00 PM", booked: 46, capacity: 80, status: "Available" },
      { time: "04:30 PM", booked: 46, capacity: 80, status: "Available" },
    ],
  },
  {
    id: "jaipur-zoo",
    name: "Jaipur Zoo",
    dailyCap: 800,
    booked: 145,
    available: 655,
    status: "Available",
    slots: [
      { time: "09:00 AM", booked: 30, capacity: 160, status: "Available" },
      { time: "10:30 AM", booked: 35, capacity: 160, status: "Available" },
      { time: "11:00 AM", booked: 40, capacity: 160, status: "Available" },
      { time: "02:00 PM", booked: 20, capacity: 160, status: "Available" },
      { time: "04:30 PM", booked: 20, capacity: 160, status: "Available" },
    ],
  },
  {
    id: "albert-hall-museum",
    name: "Albert Hall Museum",
    dailyCap: 350,
    booked: 350,
    available: 0,
    status: "Full",
    alertText: "All 5 time slots are fully booked for today.",
    alertType: "danger",
    slots: [
      { time: "09:00 AM", booked: 70, capacity: 70, status: "Full" },
      { time: "10:30 AM", booked: 70, capacity: 70, status: "Full" },
      { time: "11:00 AM", booked: 70, capacity: 70, status: "Full" },
      { time: "02:00 PM", booked: 70, capacity: 70, status: "Full" },
      { time: "04:30 PM", booked: 70, capacity: 70, status: "Full" },
    ],
  },
  {
    id: "jal-mahal",
    name: "Jal Mahal View Point",
    dailyCap: 1000,
    booked: 210,
    available: 790,
    status: "Available",
    slots: [
      { time: "09:00 AM", booked: 50, capacity: 200, status: "Available" },
      { time: "10:30 AM", booked: 45, capacity: 200, status: "Available" },
      { time: "11:00 AM", booked: 40, capacity: 200, status: "Available" },
      { time: "02:00 PM", booked: 40, capacity: 200, status: "Available" },
      { time: "04:30 PM", booked: 35, capacity: 200, status: "Available" },
    ],
  },
];

export default function InventoryPage() {
  const { showToast } = useToast();
  const [attractions, setAttractions] = useState<AttractionInventoryItem[]>(INITIAL_ATTRACTIONS);
  const [selectedAttraction, setSelectedAttraction] = useState<AttractionInventoryItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [activeTabAttractionId, setActiveTabAttractionId] = useState<string>("nahargarh-fort");

  useEffect(() => {
    document.title = META_CONSTANTS.inventory.fullTitle;
  }, []);

  // Compute overall summary statistics dynamically
  const totalCapacity = useMemo(
    () => attractions.reduce((acc, curr) => acc + curr.dailyCap, 0),
    [attractions]
  );
  const totalBooked = useMemo(
    () => attractions.reduce((acc, curr) => acc + curr.booked, 0),
    [attractions]
  );
  const totalAvailable = useMemo(
    () => attractions.reduce((acc, curr) => acc + curr.available, 0),
    [attractions]
  );
  const atRiskCount = useMemo(
    () => attractions.filter((a) => a.available === 0 || a.status === "Full").length,
    [attractions]
  );
  const utilizationRate = useMemo(
    () => (totalCapacity > 0 ? Math.round((totalBooked / totalCapacity) * 100) : 0),
    [totalCapacity, totalBooked]
  );

  // Filtered list for the main capacity table
  const filteredAttractions = useMemo(() => {
    return attractions.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "ALL"
          ? true
          : statusFilter === "AVAILABLE"
            ? item.status === "Available"
            : statusFilter === "NEAR_FULL"
              ? item.status === "Near Full"
              : statusFilter === "FULL"
                ? item.status === "Full"
                : true;
      return matchesSearch && matchesStatus;
    });
  }, [attractions, searchQuery, statusFilter]);

  // Banners list (only items with alertText)
  const alertBanners = useMemo(() => {
    return attractions.filter((a) => a.alertText);
  }, [attractions]);

  // Handler to open modal for specific attraction
  const handleOpenAddCapacity = (attraction?: AttractionInventoryItem) => {
    setSelectedAttraction(attraction || null);
    setIsModalOpen(true);
  };

  // Handler when capacity is updated
  const handleUpdateCapacity = (attractionId: string, addedSeats: number) => {
    setAttractions((prev) =>
      prev.map((item) => {
        if (item.id === attractionId) {
          const newDailyCap = item.dailyCap + addedSeats;
          const newAvailable = item.available + addedSeats;
          let newStatus: "Available" | "Near Full" | "Full" = "Available";

          if (newAvailable <= 0) {
            newStatus = "Full";
          } else if (newAvailable <= 20) {
            newStatus = "Near Full";
          } else {
            newStatus = "Available";
          }

          // If capacity is added, resolve critical alerts if capacity is high enough
          let updatedAlert = item.alertText;
          let updatedType = item.alertType;
          if (newAvailable > 15 && item.status === "Full") {
            updatedAlert = undefined;
            updatedType = undefined;
          }

          // Also update individual slot capacities proportionally
          const updatedSlots = item.slots?.map((slot) => ({
            ...slot,
            capacity: slot.capacity + Math.ceil(addedSeats / (item.slots?.length || 5)),
            status: slot.booked >= slot.capacity ? "Full" : "Available",
          }));

          return {
            ...item,
            dailyCap: newDailyCap,
            available: newAvailable,
            status: newStatus,
            alertText: updatedAlert,
            alertType: updatedType,
            slots: updatedSlots,
          };
        }
        return item;
      })
    );
  };

  // Selected attraction detail for slot view on desktop
  const activeDetailAttraction =
    attractions.find((a) => a.id === activeTabAttractionId) || attractions[0];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", width: "100%", maxWidth: "1440px", margin: "0 auto" }}>

      {/* ── TOP STAT CARDS (4 Cards matching Figma specs) ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(247px, 1fr))",
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
            {totalCapacity.toLocaleString()}
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
            Across all attractions
          </div>
        </div>

        {/* Card 2: Seats Booked Today */}
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
            {totalBooked.toLocaleString()}
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
            Seats Booked Today
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
            {utilizationRate}% utilization rate
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
            {totalAvailable.toLocaleString()}
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
            {atRiskCount}
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

      {/* ── CAPACITY ALERT BANNERS SECTION (Matching Figma specs exactly) ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%" }}>
        {alertBanners.map((attraction) => {
          const isDanger = attraction.alertType === "danger";
          const bgColor = isDanger ? "#FEF2F2" : "#FFFBEB";
          const borderColor = isDanger ? "#FEE2E2" : "#FEF3C7";
          const iconColor = isDanger ? "#DC2626" : "#D97706";
          const titleColor = isDanger ? "#DC2626" : "#D97706";
          const textColor = isDanger ? "#EF4444" : "#F59E0B";

          return (
            <div
              key={`alert-${attraction.id}`}
              style={{
                boxSizing: "border-box",
                width: "100%",
                minHeight: "59px",
                background: bgColor,
                border: `1px solid ${borderColor}`,
                borderRadius: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 24px",
                gap: "16px",
                flexWrap: "wrap",
                transition: "all 0.15s ease",
              }}
            >
              {/* Alert Left Icon + Message */}
              <div style={{ display: "flex", alignItems: "center", gap: "14px", flex: 1, minWidth: "260px" }}>
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "20px",
                    height: "20px",
                    flexShrink: 0,
                  }}
                >
                  <AlertTriangle size={18} color={iconColor} strokeWidth={2} />
                </span>

                <div style={{ fontSize: "14px", lineHeight: "18px", fontFamily: "'Inter', sans-serif" }}>
                  <strong style={{ fontWeight: 700, color: titleColor, marginRight: "6px" }}>
                    {attraction.name}:
                  </strong>
                  <span style={{ fontWeight: 400, color: textColor }}>
                    {attraction.alertText}
                  </span>
                </div>
              </div>

              {/* Alert Right Action Button: Add Capacity */}
              {/* <button
                type="button"
                onClick={() => handleOpenAddCapacity(attraction)}
                style={{
                  boxSizing: "border-box",
                  width: "98px",
                  height: "33px",
                  background: "#FFFFFF",
                  border: "0.8px solid #A0A0A0",
                  boxShadow: "0px 1px 5.6px rgba(0, 0, 0, 0.25)",
                  borderRadius: "20px",
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 600,
                  fontSize: "11px",
                  lineHeight: "16px",
                  textAlign: "center",
                  color: "#374151",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "4px",
                  transition: "background 0.15s ease, transform 0.15s ease",
                  flexShrink: 0,
                }}
                className="add-cap-btn"
              >
                Add Capacity
              </button> */}
            </div>
          );
        })}
      </div>

      {/* ── MAIN CONTENT CONTAINER (Capacity Table + Live Slot Monitor) ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "20px", width: "100%" }}>

        {/* Controls Bar: Filter Tabs & Add Capacity Global Trigger */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            flexWrap: "wrap",
            background: "#FFFFFF",
            padding: "16px 20px",
            borderRadius: "20px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            border: "1px solid #E5E7EB",
          }}
        >
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
              borderRadius: "12px",
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
            Add Capacity
          </button>
        </div>

        {/* Split Grid Layout for Desktop & Collapsible for Mobile/Tablet */}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: "24px" }} className="inventory-grid-container">

          {/* ── ATTRACTION CAPACITY TABLE CARD (Matching Figma specification) ── */}
          <div
            style={{
              boxSizing: "border-box",
              width: "100%",
              background: "#FFFFFF",
              boxShadow: "1px -1px 4px rgba(0, 0, 0, 0.25), 0px 4px 4px rgba(0, 0, 0, 0.25)",
              borderRadius: "20px",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Table Header Section */}
            <div style={{ padding: "20px 24px 16px 24px", borderBottom: "1px solid #F1F5F9" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <h3
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontWeight: 700,
                      fontSize: "14px",
                      lineHeight: "21px",
                      color: "#002A45",
                      margin: 0,
                    }}
                  >
                    Attraction Capacity — Today
                  </h3>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "2px" }}>
                    <span
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: "#10B981",
                        boxShadow: "0 0 8px rgba(16, 185, 129, 0.6)",
                        display: "inline-block",
                      }}
                    />
                    <p
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 400,
                        fontSize: "11px",
                        lineHeight: "16px",
                        color: "#94A3B8",
                        margin: 0,
                      }}
                    >
                      Sunday, 16 Jun 2024 · Live inventory
                    </p>
                  </div>
                </div>

                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#0C2A42",
                    background: "#F0F4F8",
                    padding: "4px 10px",
                    borderRadius: "12px",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  {filteredAttractions.length} Attractions
                </span>
              </div>
            </div>

            {/* Responsive Table Scroll Wrapper */}
            <div style={{ overflowX: "auto", width: "100%" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr
                    style={{
                      background: "#F8FAFC",
                      borderBottom: "0.8px solid #F1F5F9",
                      height: "36px",
                    }}
                  >
                    <th
                      style={{
                        padding: "10px 18px",
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 700,
                        fontSize: "10px",
                        lineHeight: "15px",
                        letterSpacing: "0.5px",
                        textTransform: "uppercase",
                        color: "#94A3B8",
                        width: "24%",
                      }}
                    >
                      Attraction
                    </th>
                    <th
                      style={{
                        padding: "10px 18px",
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 700,
                        fontSize: "10px",
                        lineHeight: "15px",
                        letterSpacing: "0.5px",
                        textTransform: "uppercase",
                        color: "#94A3B8",
                        textAlign: "center",
                      }}
                    >
                      Daily Cap.
                    </th>
                    <th
                      style={{
                        padding: "10px 18px",
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 700,
                        fontSize: "10px",
                        lineHeight: "15px",
                        letterSpacing: "0.5px",
                        textTransform: "uppercase",
                        color: "#94A3B8",
                        textAlign: "center",
                      }}
                    >
                      Booked
                    </th>
                    <th
                      style={{
                        padding: "10px 18px",
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 700,
                        fontSize: "10px",
                        lineHeight: "15px",
                        letterSpacing: "0.5px",
                        textTransform: "uppercase",
                        color: "#94A3B8",
                        textAlign: "center",
                      }}
                    >
                      Available
                    </th>
                    <th
                      style={{
                        padding: "10px 18px",
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 700,
                        fontSize: "10px",
                        lineHeight: "15px",
                        letterSpacing: "0.5px",
                        textTransform: "uppercase",
                        color: "#94A3B8",
                        textAlign: "center",
                      }}
                    >
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAttractions.map((attraction, idx) => {
                    const isSelectedTab = activeTabAttractionId === attraction.id;
                    const bookedColor =
                      attraction.status === "Full"
                        ? "#EF4444"
                        : attraction.status === "Near Full"
                          ? "#F59E0B"
                          : "#10B981";
                    const availableColor =
                      attraction.status === "Full" ? "#EF4444" : "#10B981";

                    return (
                      <tr
                        key={attraction.id}
                        onClick={() => setActiveTabAttractionId(attraction.id)}
                        style={{
                          borderBottom:
                            idx === filteredAttractions.length - 1
                              ? "none"
                              : "1px solid #F1F5F9",
                          background: isSelectedTab ? "#F8FAFC" : "transparent",
                          cursor: "pointer",
                          transition: "background 0.15s ease",
                        }}
                        className="table-row-hover"
                      >
                        {/* Attraction Name */}
                        <td
                          style={{
                            padding: "14px 18px",
                            fontFamily: "'Inter', sans-serif",
                            fontWeight: 700,
                            fontSize: "12px",
                            lineHeight: "20px",
                            color: attraction.id === "albert-hall-museum" ? "#0F172A" : "#002A45",
                          }}
                        >
                          {attraction.name}
                        </td>

                        {/* Daily Capacity */}
                        <td
                          style={{
                            padding: "14px 18px",
                            fontFamily: "'DM Mono', monospace",
                            fontWeight: 500,
                            fontSize: "14px",
                            lineHeight: "21px",
                            textAlign: "center",
                            color: "#374151",
                          }}
                        >
                          {attraction.dailyCap.toLocaleString()}
                        </td>

                        {/* Booked */}
                        <td
                          style={{
                            padding: "14px 18px",
                            fontFamily: "'DM Mono', monospace",
                            fontWeight: 500,
                            fontSize: "14px",
                            lineHeight: "21px",
                            textAlign: "center",
                            color: bookedColor,
                          }}
                        >
                          {attraction.booked.toLocaleString()}
                        </td>

                        {/* Available */}
                        <td
                          style={{
                            padding: "14px 18px",
                            fontFamily: "'DM Mono', monospace",
                            fontWeight: 500,
                            fontSize: "14px",
                            lineHeight: "21px",
                            textAlign: "center",
                            color: availableColor,
                          }}
                        >
                          {attraction.available.toLocaleString()}
                        </td>

                        {/* Status Badge */}
                        <td style={{ padding: "14px 18px", textAlign: "center" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: "89px",
                              height: attraction.status === "Near Full" ? "26px" : "28px",
                              borderRadius: "20px",
                              background:
                                attraction.status === "Available"
                                  ? "#F0FDF4"
                                  : attraction.status === "Near Full"
                                    ? "#FFFBEB"
                                    : "#FEF2F2",
                              color:
                                attraction.status === "Available"
                                  ? "#10B981"
                                  : attraction.status === "Near Full"
                                    ? "#F59E0B"
                                    : "#EF4444",
                              fontFamily: "'DM Mono', monospace",
                              fontWeight: 500,
                              fontSize: "12px",
                              lineHeight: "21px",
                              textAlign: "center",
                            }}
                          >
                            {attraction.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ── ADD CAPACITY MODAL ── */}
      <AddCapacityModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedAttraction={selectedAttraction}
        attractionsList={attractions}
        onUpdateCapacity={handleUpdateCapacity}
      />

      {/* ── SCOPED COMPONENT STYLES ── */}
      <style>{`
        .stat-card-hover:hover {
          transform: translateY(-2px);
          box-shadow: -2px 6px 12px rgba(0, 0, 0, 0.18) !important;
        }
        .add-cap-btn:hover {
          background: #0C2A42 !important;
          color: #FFFFFF !important;
          border-color: #0C2A42 !important;
        }
        .table-row-hover:hover {
          background: #F8FAFC !important;
        }
        .row-add-btn:hover {
          background: #F4BC43 !important;
          border-color: #F4BC43 !important;
          color: #011B2F !important;
        }
      `}</style>
    </div>
  );
}
