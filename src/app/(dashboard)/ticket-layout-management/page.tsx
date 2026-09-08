"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import React from "react";
import {
  Ticket,
  Plus,
  Pencil,
  Trash2,
  Star,
  Search,
  RotateCcw,
  FileText,
  Filter,
} from "lucide-react";
import { colors, typography } from "@/lib/theme";
import { confirmDelete, showSuccessNotify } from "@/lib/notify";
import { TicketLayout } from "./data";
import { layoutsStore } from "./_store";
import { ReceiptPreview } from "./_components/Editor";
import StatusFilterSelect from "@/components/ui/StatusFilterSelect";

const LIST_PATH = "/ticket-layout-management";

type TypeFilter = "All" | "Draft" | "Published";
type StatusFilter = "All" | "Active" | "Inactive";

export default function TicketLayoutManagementPage() {
  const layouts = useSyncExternalStore(
    layoutsStore.subscribe,
    layoutsStore.getLayouts,
    layoutsStore.getLayouts,
  );
  const drafts = useSyncExternalStore(
    layoutsStore.subscribe,
    layoutsStore.getDrafts,
    layoutsStore.getDrafts,
  );

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("All");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = "Ticket Layout Management | Ticketing Solution";
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Combine all items into one unified list
  const allItems = useMemo<TicketLayout[]>(() => {
    const term = debouncedSearch.trim().toLowerCase();

    let combined: TicketLayout[] = [];

    if (typeFilter === "All" || typeFilter === "Published") {
      let pub = layouts;
      if (statusFilter === "Active") pub = pub.filter((l) => l.isActive);
      if (statusFilter === "Inactive") pub = pub.filter((l) => !l.isActive);
      if (term) pub = pub.filter((l) => l.name.toLowerCase().includes(term));
      combined = [...combined, ...pub];
    }

    if (typeFilter === "All" || typeFilter === "Draft") {
      let dft = drafts;
      // status filter doesn't apply to drafts (they have no active/inactive concept)
      if (term) dft = dft.filter((d) => d.name.toLowerCase().includes(term));
      combined = [...combined, ...dft];
    }

    return combined;
  }, [layouts, drafts, debouncedSearch, typeFilter, statusFilter]);

  const handleResetFilters = () => {
    setSearch("");
    setTypeFilter("All");
    setStatusFilter("All");
  };

  const isFiltering = Boolean(
    search.trim() || typeFilter !== "All" || statusFilter !== "All",
  );

  const handleSetDefault = (id: string) => {
    layoutsStore.setDefault(id);
    showSuccessNotify("Default template updated", "Saved");
  };

  const handleDelete = async (layout: TicketLayout) => {
    const confirmed = await confirmDelete(`ticket layout "${layout.name}"`);
    if (!confirmed) return;
    layoutsStore.removePublishedLayout(layout.id);
  };

  const handleDeleteDraft = async (draft: TicketLayout) => {
    const confirmed = await confirmDelete(`draft "${draft.name}"`);
    if (!confirmed) return;
    layoutsStore.removeDraft(draft.id);
  };

  const totalPublished = layouts.length;
  const totalDrafts = drafts.length;

  return (
    <div style={{ width: "100%" }}>
      {/* ── Page header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "20px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: typography.fontFamily.sans,
              fontSize: "20px",
              fontWeight: 800,
              color: "#011B2F",
              margin: "0 0 2px 0",
              letterSpacing: "-0.2px",
            }}
          >
            Ticket Layouts
          </h1>
          <p
            style={{
              fontFamily: typography.fontFamily.sans,
              fontSize: "13px",
              color: "#6B7280",
              margin: 0,
            }}
          >
            {totalPublished} published · {totalDrafts} draft
            {totalDrafts !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href={`${LIST_PATH}/new`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "#F4BC43",
            color: "#011B2F",
            border: "none",
            borderRadius: "8px",
            padding: "10px 18px",
            fontFamily: typography.fontFamily.sans,
            fontSize: "14px",
            fontWeight: typography.fontWeight.bold,
            cursor: "pointer",
            boxShadow: "0 2px 6px rgba(244, 188, 67, 0.3)",
            textDecoration: "none",
          }}
        >
          <Plus size={16} />
          New Layout
        </Link>
      </div>

      {/* ── Filter & Search Bar */}
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "12px",
          padding: "14px 20px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          border: `1px solid ${colors.header.border}`,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "16px",
          marginBottom: "20px",
        }}
      >
        {/* Filter Dropdowns */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <Filter size={16} color={colors.brand.accent} />
          <span
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: colors.text.muted,
              fontFamily: typography.fontFamily.sans,
            }}
          >
            Filter:
          </span>

          {/* Type Dropdown */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
            style={{
              height: "38px",
              borderRadius: "8px",
              border: `1px solid ${colors.header.border}`,
              padding: "0 12px",
              fontFamily: typography.fontFamily.sans,
              fontSize: "13px",
              fontWeight: 600,
              color: colors.brand.accent,
              outline: "none",
              cursor: "pointer",
              background: "#FFFFFF",
              minWidth: "140px",
            }}
          >
            <option value="All">All Layouts</option>
            <option value="Published">Published</option>
            <option value="Draft">Draft</option>
          </select>

          {/* Status Filter Dropdown */}
          <StatusFilterSelect
            value={statusFilter}
            onChange={(val) => setStatusFilter(val as StatusFilter)}
          />
        </div>

        {/* Search input */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            background: colors.bg.page,
            padding: "8px 14px",
            borderRadius: "8px",
            border: `1px solid ${colors.header.border}`,
            flex: 1,
            minWidth: "240px",
          }}
        >
          <Search size={18} color={colors.text.muted} />
          <input
            type="text"
            placeholder="Search layouts by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              border: "none",
              outline: "none",
              fontFamily: typography.fontFamily.sans,
              fontSize: "14px",
              background: "transparent",
              color: colors.text.primary,
            }}
          />
        </div>

        {/* Reset button */}
        {isFiltering && (
          <button
            type="button"
            onClick={handleResetFilters}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "transparent",
              border: `1px solid ${colors.header.border}`,
              borderRadius: "8px",
              padding: "8px 14px",
              fontSize: "13px",
              fontWeight: 600,
              color: colors.text.muted,
              cursor: "pointer",
              fontFamily: typography.fontFamily.sans,
              whiteSpace: "nowrap",
            }}
          >
            <RotateCcw size={14} />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* ── Unified cards grid ── */}
      {allItems.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="ticket-cards-grid">
          {allItems.map((item) =>
            item.isDraft ? (
              <DraftCard
                key={item.id}
                draft={item}
                onDelete={() => handleDeleteDraft(item)}
              />
            ) : (
              <LayoutCard
                key={item.id}
                layout={item}
                onDelete={() => handleDelete(item)}
                onSetDefault={() => handleSetDefault(item.id)}
              />
            ),
          )}
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Empty state
   ────────────────────────────────────────────────────────────────────────── */

function EmptyState() {
  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px dashed #E2E8F0",
        borderRadius: "12px",
        padding: "48px 24px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: "64px",
          height: "64px",
          borderRadius: "50%",
          background: "rgba(244, 188, 67, 0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 16px",
        }}
      >
        <Ticket size={28} color="#F4BC43" />
      </div>
      <h3
        style={{
          fontFamily: typography.fontFamily.sans,
          fontSize: "16px",
          fontWeight: typography.fontWeight.bold,
          color: "#011B2F",
          margin: "0 0 6px 0",
        }}
      >
        No layouts found
      </h3>
      <p
        style={{
          fontFamily: typography.fontFamily.sans,
          fontSize: "13px",
          color: "#6B7280",
          margin: "0 0 16px 0",
        }}
      >
        Create your first template to control the receipt design customers see
      </p>
      <Link
        href={`${LIST_PATH}/new`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          background: "#F4BC43",
          color: "#011B2F",
          border: "none",
          borderRadius: "8px",
          padding: "8px 16px",
          fontSize: "13px",
          fontWeight: typography.fontWeight.bold,
          cursor: "pointer",
          textDecoration: "none",
        }}
      >
        <Plus size={14} />
        Create Layout
      </Link>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Draft card
   ────────────────────────────────────────────────────────────────────────── */

function DraftCard({
  draft,
  onDelete,
}: {
  draft: TicketLayout;
  onDelete: () => void;
}) {
  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1.5px dashed #F4BC43",
        borderRadius: "12px",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      {/* Preview thumbnail */}
      <div
        className="receipt-card-preview"
        style={{
          height: "280px",
          background: "#F8FAFC",
          padding: "12px 10px 10px",
          boxSizing: "border-box",
          position: "relative",
          overflowY: "auto",
          overflowX: "hidden",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          scrollbarWidth: "thin",
          scrollbarColor: "#CBD5E1 transparent",
        }}
      >
        <div
          style={{
            transform: "scale(0.58)",
            transformOrigin: "top center",
            width: "280px",
            flexShrink: 0,
            marginBottom: "-190px",
          }}
        >
          <ReceiptPreview layout={draft} />
        </div>
        <span
          style={{
            position: "absolute",
            top: "8px",
            right: "8px",
            background: "#F4BC43",
            color: "#011B2F",
            fontSize: "10px",
            fontWeight: 700,
            padding: "3px 8px",
            borderRadius: "4px",
            display: "flex",
            alignItems: "center",
            gap: "3px",
            letterSpacing: "0.4px",
            textTransform: "uppercase",
            zIndex: 2,
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <FileText size={9} fill="#011B2F" /> Draft
        </span>
      </div>

      {/* Card body */}
      <div style={{ padding: "12px 14px 14px", flex: 1, display: "flex", flexDirection: "column" }}>
        <h3
          style={{
            fontFamily: typography.fontFamily.sans,
            fontSize: "14px",
            fontWeight: typography.fontWeight.bold,
            color: "#011B2F",
            margin: "0 0 2px 0",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {draft.name || "Untitled Draft"}
        </h3>
        <p
          style={{
            fontSize: "11px",
            color: "#6B7280",
            margin: "0 0 10px 0",
            fontFamily: typography.fontFamily.sans,
          }}
        >
          {draft.preset} preset · stored locally
        </p>

        <div className="ticket-card-actions">
          <Link
            href={`${LIST_PATH}/draft/${draft.id}/edit`}
            style={iconLinkStyle("#173F63", "rgba(23, 63, 99, 0.08)")}
            title="Continue editing"
          >
            <Pencil size={12} />
            <span style={{ marginLeft: "4px", fontSize: "11px" }}>Continue</span>
          </Link>
          <button
            type="button"
            onClick={onDelete}
            style={iconButtonStyle("#DC2626", "rgba(220, 38, 38, 0.08)", true)}
            title="Discard draft"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Layout card
   ────────────────────────────────────────────────────────────────────────── */

function LayoutCard({
  layout,
  onDelete,
  onSetDefault,
}: {
  layout: TicketLayout;
  onDelete: () => void;
  onSetDefault: () => void;
}) {
  return (
    <div
      style={{
        background: "#FFFFFF",
        border: layout.isDefault ? "2px solid #F4BC43" : "1px solid #E2E8F0",
        borderRadius: "12px",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        transition: "transform 0.18s ease, box-shadow 0.18s ease",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 6px 16px rgba(0,0,0,0.08)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)";
      }}
    >
      {/* Preview thumbnail */}
      <div
        className="receipt-card-preview"
        style={{
          height: "280px",
          background: "#F8FAFC",
          padding: "12px 10px 10px",
          boxSizing: "border-box",
          position: "relative",
          overflowY: "auto",
          overflowX: "hidden",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          scrollbarWidth: "thin",
          scrollbarColor: "#CBD5E1 transparent",
        }}
      >
        <div
          style={{
            transform: "scale(0.58)",
            transformOrigin: "top center",
            width: "280px",
            flexShrink: 0,
            marginBottom: "-190px",
          }}
        >
          <ReceiptPreview layout={layout} />
        </div>
        {layout.isDefault && (
          <span
            style={{
              position: "absolute",
              top: "8px",
              right: "8px",
              background: "#F4BC43",
              color: "#011B2F",
              fontSize: "10px",
              fontWeight: 700,
              padding: "3px 8px",
              borderRadius: "4px",
              display: "flex",
              alignItems: "center",
              gap: "3px",
              letterSpacing: "0.4px",
              textTransform: "uppercase",
              zIndex: 2,
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
          >
            <Star size={9} fill="#011B2F" /> Default
          </span>
        )}
      </div>

      {/* Card body */}
      <div style={{ padding: "12px 14px 14px", flex: 1, display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "2px",
            gap: "6px",
          }}
        >
          <h3
            style={{
              fontFamily: typography.fontFamily.sans,
              fontSize: "14px",
              fontWeight: typography.fontWeight.bold,
              color: "#011B2F",
              margin: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              minWidth: 0,
            }}
          >
            {layout.name}
          </h3>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "10px",
              fontWeight: 700,
              padding: "3px 8px",
              borderRadius: "999px",
              background: layout.isActive
                ? "rgba(34, 197, 94, 0.14)"
                : "rgba(148, 163, 184, 0.22)",
              color: layout.isActive ? "#15803D" : "#475569",
              textTransform: "uppercase",
              letterSpacing: "0.3px",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                width: "5px",
                height: "5px",
                borderRadius: "50%",
                background: layout.isActive ? "#22C55E" : "#94A3B8",
              }}
            />
            {layout.isActive ? "Active" : "Inactive"}
          </span>
        </div>
        <p
          style={{
            fontSize: "11px",
            color: "#6B7280",
            margin: "0 0 10px 0",
            fontFamily: typography.fontFamily.sans,
          }}
        >
          {layout.preset} preset ·{" "}
          {Object.values(layout.sections).filter((v) => v === true).length +
            layout.customSections.filter((c) => c.enabled).length}{" "}
          sections
        </p>

        <div className="ticket-card-actions">
          <Link
            href={`${LIST_PATH}/${layout.id}/edit`}
            style={iconLinkStyle("#173F63", "rgba(23, 63, 99, 0.08)")}
            title="Edit"
          >
            <Pencil size={12} />
            <span style={{ marginLeft: "4px", fontSize: "11px" }}>Edit</span>
          </Link>
          {!layout.isDefault && (
            <button
              type="button"
              onClick={onSetDefault}
              style={iconButtonStyle("#B45309", "rgba(244, 188, 67, 0.15)")}
              title="Set as default"
            >
              <Star size={12} />
              <span style={{ marginLeft: "4px", fontSize: "11px" }}>
                Set Default
              </span>
            </button>
          )}
          <button
            type="button"
            onClick={onDelete}
            style={iconButtonStyle("#DC2626", "rgba(220, 38, 38, 0.08)", true)}
            title="Delete"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

function iconButtonStyle(
  color: string,
  bg: string,
  flexEnd: boolean = false,
): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    background: bg,
    color,
    border: "none",
    borderRadius: "6px",
    padding: "5px 10px",
    fontFamily: typography.fontFamily.sans,
    fontSize: "11px",
    fontWeight: 600,
    cursor: "pointer",
    marginLeft: flexEnd ? "auto" : undefined,
  };
}

function iconLinkStyle(color: string, bg: string): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    background: bg,
    color,
    borderRadius: "6px",
    padding: "5px 10px",
    fontFamily: typography.fontFamily.sans,
    fontSize: "11px",
    fontWeight: 600,
    textDecoration: "none",
  };
}
