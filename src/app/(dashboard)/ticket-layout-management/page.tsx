"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  Ticket,
  Plus,
  Pencil,
  Trash2,
  Star,
  Search,
  RotateCcw,
  FileText,
} from "lucide-react";
import { typography } from "@/lib/theme";
import { confirmDelete, showSuccessNotify } from "@/lib/notify";
import { TicketLayout } from "./data";
import { layoutsStore } from "./_store";
import { ReceiptPreview } from "./_components/Editor";

const LIST_PATH = "/ticket-layout-management";

export default function TicketLayoutManagementPage() {
  // Subscribe to the in-memory store. useSyncExternalStore gives us
  // tear-free reads of the published + draft arrays.
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

  // Filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Active" | "Inactive">(
    "All",
  );

  // Page title
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = "Ticket Layout Management | Ticketing Solution";
    }
  }, []);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const filteredLayouts = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    return layouts.filter((l) => {
      if (statusFilter === "Active" && !l.isActive) return false;
      if (statusFilter === "Inactive" && l.isActive) return false;
      if (term && !l.name.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [layouts, debouncedSearch, statusFilter]);

  const filteredDrafts = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    if (!term) return drafts;
    return drafts.filter((d) => d.name.toLowerCase().includes(term));
  }, [drafts, debouncedSearch]);

  const isFiltering = Boolean(search.trim() || statusFilter !== "All");

  const handleResetFilters = () => {
    setSearch("");
    setStatusFilter("All");
  };

  const handleSetDefault = (id: string) => {
    layoutsStore.setDefault(id);
    showSuccessNotify("Default template updated", "Saved");
  };

  const handleToggleActive = (id: string) => {
    layoutsStore.toggleActive(id);
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
         <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "18px",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            position: "relative",
            flex: "1 1 280px",
            minWidth: "220px",
            maxWidth: "380px",
          }}
        >
          <Search
            size={16}
            color="#94A3B8"
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
            }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search layouts..."
            style={{
              width: "100%",
              height: "40px",
              padding: "0 12px 0 38px",
              border: "1px solid #E2E8F0",
              borderRadius: "8px",
              background: "#FFFFFF",
              fontFamily: typography.fontFamily.sans,
              fontSize: "13px",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as "All" | "Active" | "Inactive")
          }
          style={{
            height: "40px",
            padding: "0 12px",
            border: "1px solid #E2E8F0",
            borderRadius: "8px",
            background: "#FFFFFF",
            fontFamily: typography.fontFamily.sans,
            fontSize: "13px",
            color: "#011B2F",
            cursor: "pointer",
            minWidth: "130px",
          }}
        >
          <option value="All">All Status</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
        {isFiltering && (
          <button
            type="button"
            onClick={handleResetFilters}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "transparent",
              border: "1px solid #E2E8F0",
              borderRadius: "8px",
              padding: "0 14px",
              height: "40px",
              fontSize: "13px",
              color: "#6B7280",
              cursor: "pointer",
            }}
          >
            <RotateCcw size={14} />
            Reset
          </button>
        )}
        <div style={{ marginLeft: "auto", fontSize: "12px", color: "#6B7280" }}>
          {filteredLayouts.length} layout{filteredLayouts.length === 1 ? "" : "s"}
        </div>
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

      {/* ── Filter row ── */}
      {/* <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "18px",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            position: "relative",
            flex: "1 1 280px",
            minWidth: "220px",
            maxWidth: "380px",
          }}
        >
          <Search
            size={16}
            color="#94A3B8"
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
            }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search layouts..."
            style={{
              width: "100%",
              height: "40px",
              padding: "0 12px 0 38px",
              border: "1px solid #E2E8F0",
              borderRadius: "8px",
              background: "#FFFFFF",
              fontFamily: typography.fontFamily.sans,
              fontSize: "13px",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as "All" | "Active" | "Inactive")
          }
          style={{
            height: "40px",
            padding: "0 12px",
            border: "1px solid #E2E8F0",
            borderRadius: "8px",
            background: "#FFFFFF",
            fontFamily: typography.fontFamily.sans,
            fontSize: "13px",
            color: "#011B2F",
            cursor: "pointer",
            minWidth: "130px",
          }}
        >
          <option value="All">All Status</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
        {isFiltering && (
          <button
            type="button"
            onClick={handleResetFilters}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "transparent",
              border: "1px solid #E2E8F0",
              borderRadius: "8px",
              padding: "0 14px",
              height: "40px",
              fontSize: "13px",
              color: "#6B7280",
              cursor: "pointer",
            }}
          >
            <RotateCcw size={14} />
            Reset
          </button>
        )}
        <div style={{ marginLeft: "auto", fontSize: "12px", color: "#6B7280" }}>
          {filteredLayouts.length} layout{filteredLayouts.length === 1 ? "" : "s"}
        </div>
      </div> */}

      {/* ── Drafts section ── */}
      {drafts.length > 0 && (
        <section style={{ marginBottom: "28px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "12px",
            }}
          >
            <FileText size={16} color="#F4BC43" />
            <h2
              style={{
                margin: 0,
                fontSize: "14px",
                fontWeight: 700,
                color: "#011B2F",
                textTransform: "uppercase",
                letterSpacing: "0.4px",
              }}
            >
              Saved Drafts
            </h2>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                background: "rgba(244, 188, 67, 0.18)",
                color: "#92400E",
                padding: "2px 8px",
                borderRadius: "10px",
              }}
            >
              {filteredDrafts.length}
            </span>
          </div>
          {filteredDrafts.length === 0 ? (
            <p
              style={{
                fontSize: "12px",
                color: "#6B7280",
                margin: 0,
                fontStyle: "italic",
              }}
            >
              No drafts match your search.
            </p>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: "16px",
              }}
            >
              {filteredDrafts.map((draft) => (
                <DraftCard
                  key={draft.id}
                  draft={draft}
                  onDelete={() => handleDeleteDraft(draft)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Cards grid ── */}
      <section>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "12px",
          }}
        >
          <Ticket size={16} color="#011B2F" />
          <h2
            style={{
              margin: 0,
              fontSize: "14px",
              fontWeight: 700,
              color: "#011B2F",
              textTransform: "uppercase",
              letterSpacing: "0.4px",
            }}
          >
            Published Layouts
          </h2>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 700,
              background: "#F1F5F9",
              color: "#475569",
              padding: "2px 8px",
              borderRadius: "10px",
            }}
          >
            {filteredLayouts.length}
          </span>
        </div>

        {filteredLayouts.length === 0 ? (
          <EmptyState />
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "16px",
            }}
          >
            {filteredLayouts.map((layout) => (
              <LayoutCard
                key={layout.id}
                layout={layout}
                onDelete={() => handleDelete(layout)}
                onSetDefault={() => handleSetDefault(layout.id)}
                onToggleActive={() => handleToggleActive(layout.id)}
              />
            ))}
          </div>
        )}
      </section>
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
        No ticket layouts yet
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
      <div
        style={{
          height: "300px",
          background: "#F1F5F9",
          padding: "12px",
          boxSizing: "border-box",
          position: "relative",
          overflow: "hidden",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
        }}
      >
        <ReceiptPreview layout={draft} />
        <span
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
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
          }}
        >
          <FileText size={10} fill="#011B2F" /> Draft
        </span>
      </div>

      <div style={{ padding: "14px 16px", flex: 1 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "4px",
          }}
        >
          <h3
            style={{
              fontFamily: typography.fontFamily.sans,
              fontSize: "15px",
              fontWeight: typography.fontWeight.bold,
              color: "#011B2F",
              margin: 0,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: "180px",
            }}
          >
            {draft.name || "Untitled Draft"}
          </h3>
        </div>
        <p
          style={{
            fontSize: "12px",
            color: "#6B7280",
            margin: "0 0 12px 0",
            fontFamily: typography.fontFamily.sans,
          }}
        >
          {draft.preset} preset · stored locally
        </p>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            borderTop: "1px solid #F1F5F9",
            paddingTop: "10px",
            flexWrap: "wrap",
          }}
        >
          <Link
            href={`${LIST_PATH}/draft/${draft.id}/edit`}
            style={iconLinkStyle("#173F63", "rgba(23, 63, 99, 0.08)")}
            title="Continue editing"
          >
            <Pencil size={13} />
            <span style={{ marginLeft: "4px", fontSize: "12px" }}>Continue</span>
          </Link>
          <button
            type="button"
            onClick={onDelete}
            style={iconButtonStyle(
              "#DC2626",
              "rgba(220, 38, 38, 0.08)",
              true,
            )}
            title="Discard draft"
          >
            <Trash2 size={13} />
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
  onToggleActive,
}: {
  layout: TicketLayout;
  onDelete: () => void;
  onSetDefault: () => void;
  onToggleActive: () => void;
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
      <div
        style={{
          height: "300px",
          background: "#F1F5F9",
          padding: "12px",
          boxSizing: "border-box",
          position: "relative",
          overflow: "hidden",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
        }}
      >
        <ReceiptPreview layout={layout} />
        {layout.isDefault && (
          <span
            style={{
              position: "absolute",
              top: "10px",
              right: "10px",
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
            }}
          >
            <Star size={10} fill="#011B2F" /> Default
          </span>
        )}
      </div>

      <div style={{ padding: "14px 16px", flex: 1 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "4px",
          }}
        >
          <h3
            style={{
              fontFamily: typography.fontFamily.sans,
              fontSize: "15px",
              fontWeight: typography.fontWeight.bold,
              color: "#011B2F",
              margin: 0,
            }}
          >
            {layout.name}
          </h3>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              fontSize: "11px",
              fontWeight: 700,
              padding: "4px 10px",
              borderRadius: "999px",
              background: layout.isActive
                ? "rgba(34, 197, 94, 0.14)"
                : "rgba(148, 163, 184, 0.22)",
              color: layout.isActive ? "#15803D" : "#475569",
              textTransform: "uppercase",
              letterSpacing: "0.4px",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: layout.isActive ? "#22C55E" : "#94A3B8",
              }}
            />
            {layout.isActive ? "Active" : "Inactive"}
          </span>
        </div>
        <p
          style={{
            fontSize: "12px",
            color: "#6B7280",
            margin: "0 0 12px 0",
            fontFamily: typography.fontFamily.sans,
          }}
        >
          {layout.preset} preset ·{" "}
          {Object.values(layout.sections).filter((v) => v === true).length +
            layout.customSections.filter((c) => c.enabled).length}{" "}
          sections
        </p>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            borderTop: "1px solid #F1F5F9",
            paddingTop: "10px",
            flexWrap: "wrap",
          }}
        >
          <Link
            href={`${LIST_PATH}/${layout.id}/edit`}
            style={iconLinkStyle("#173F63", "rgba(23, 63, 99, 0.08)")}
            title="Edit"
          >
            <Pencil size={13} />
            <span style={{ marginLeft: "4px", fontSize: "12px" }}>Edit</span>
          </Link>
          {!layout.isDefault && (
            <button
              type="button"
              onClick={onSetDefault}
              style={iconButtonStyle("#F4BC43", "rgba(244, 188, 67, 0.18)")}
              title="Set as default"
            >
              <Star size={13} />
              <span style={{ marginLeft: "4px", fontSize: "12px" }}>
                Set Default
              </span>
            </button>
          )}
          <button
            type="button"
            onClick={onToggleActive}
            style={iconButtonStyle(
              layout.isActive ? "#15803D" : "#475569",
              layout.isActive
                ? "rgba(34, 197, 94, 0.18)"
                : "rgba(148, 163, 184, 0.22)",
            )}
            title={layout.isActive ? "Deactivate" : "Activate"}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: layout.isActive ? "#22C55E" : "#94A3B8",
                marginRight: "4px",
                flexShrink: 0,
              }}
            />
            {layout.isActive ? "Active" : "Inactive"}
          </button>
          <button
            type="button"
            onClick={onDelete}
            style={iconButtonStyle(
              "#DC2626",
              "rgba(220, 38, 38, 0.08)",
              true,
            )}
            title="Delete"
          >
            <Trash2 size={13} />
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
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
    marginLeft: flexEnd ? "auto" : undefined,
  };
}

function iconLinkStyle(
  color: string,
  bg: string,
): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    background: bg,
    color,
    borderRadius: "6px",
    padding: "5px 10px",
    fontFamily: typography.fontFamily.sans,
    fontSize: "12px",
    fontWeight: 600,
    textDecoration: "none",
  };
}
