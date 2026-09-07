"use client";

/**
 * Shared editor + receipt-preview components for the Ticket Layout
 * Management feature. The list page, the create page, and the edit page
 * all render <LayoutEditorBody /> which produces the same two-column
 * layout (form on the left, full-height preview on the right) and the
 * same footer action bar.
 *
 * The page-level component is responsible for:
 *   - supplying the initial draft value
 *   - wiring the primary / secondary action buttons to navigation
 */

import React, { useState } from "react";
import {
  GripVertical,
  Upload,
  PlusCircle,
  Save,
  FileText,
  Printer,
  Trash2,
  ArrowLeft,
} from "lucide-react";
import { typography } from "@/lib/theme";
import { showSuccessNotify } from "@/lib/notify";
import {
  BuiltInSectionKey,
  CustomSection,
  PRESET_PRESETS,
  DEFAULT_SECTION_ORDER,
  SECTION_LABELS,
  TicketLayout,
  TicketLayoutPreset,
  TicketLayoutSections,
} from "../data";

/* ──────────────────────────────────────────────────────────────────────────
   Demo data — used by the receipt preview regardless of layout state so
   the user always sees a realistic-looking receipt while editing.
   ────────────────────────────────────────────────────────────────────────── */

const DEMO_SAMPLE = {
  attractionName: "TRAIN",
  businessName: "VISHNU",
  cin: "U92490TZ2022PTC039656",
  gst: "33ABCDE1234F1Z5",
  invoice: "2026-27/272727000004",
  date: "07/09/2026",
  time: "05:52 PM",
  customer: "Guest",
  totalAmount: "₹177.00",
  payMode: "CASH",
  items: [
    { sNo: 1, name: "Adult", qty: 1, amount: "₹100.00" },
    { sNo: 2, name: "Child", qty: 1, amount: "₹50.00" },
  ],
  subTotal: "₹150.00",
  sgst: "₹13.50",
  cgst: "₹13.50",
  effectiveGst: "₹27.00",
  gstRoundOff: "₹0.00",
  roundOff: "+₹0.00",
  amountPayable: "₹177.00",
};

/* ──────────────────────────────────────────────────────────────────────────
   Receipt preview (also used on cards)
   ────────────────────────────────────────────────────────────────────────── */

function SampleQRCode({ size = 90 }: { size?: number }) {
  const cells = 25;
  const cellSize = size / cells;
  const rand = (i: number, j: number) => {
    const x = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };
  const isPos = (i: number, j: number) => {
    const inSquare = (r: number, c: number) =>
      i >= r && i < r + 7 && j >= c && j < c + 7;
    return inSquare(0, 0) || inSquare(0, cells - 7) || inSquare(cells - 7, 0);
  };
  const isPosSolid = (i: number, j: number) => {
    const inSquare = (r: number, c: number) =>
      i >= r && i < r + 7 && j >= c && j < c + 7;
    const inInner = (r: number, c: number) =>
      i >= r + 2 && i < r + 5 && j >= c + 2 && j < c + 5;
    const inBorder = (r: number, c: number) => {
      if (!inSquare(r, c)) return false;
      const onOuterRing =
        i === r || i === r + 6 || j === c || j === c + 6;
      const onInnerSquare = inInner(r, c);
      return onOuterRing || onInnerSquare;
    };
    return (
      inBorder(0, 0) || inBorder(0, cells - 7) || inBorder(cells - 7, 0)
    );
  };

  const rects: React.ReactElement[] = [];
  for (let i = 0; i < cells; i++) {
    for (let j = 0; j < cells; j++) {
      if (isPos(i, j) && !isPosSolid(i, j)) continue;
      let filled = false;
      if (isPos(i, j)) {
        filled = isPosSolid(i, j);
      } else {
        filled = rand(i, j) > 0.52;
      }
      if (filled) {
        rects.push(
          <rect
            key={`${i}-${j}`}
            x={j * cellSize}
            y={i * cellSize}
            width={cellSize}
            height={cellSize}
            fill="#011B2F"
          />,
        );
      }
    }
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ display: "inline-block", background: "#FFFFFF" }}
      aria-label="QR code"
    >
      <rect width={size} height={size} fill="#FFFFFF" />
      {rects}
    </svg>
  );
}

export function ReceiptPreview({ layout }: { layout: TicketLayout }) {
  const fontMap = {
    sans: "Inter, system-ui, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    mono: "'Courier New', 'Courier', monospace",
  } as const;

  const renderCustom = (custom: CustomSection) => (
    <div
      key={custom.id}
      style={{
        borderBottom: "1px dashed #94A3B8",
        paddingBottom: "6px",
        marginBottom: "6px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: "9px",
          fontWeight: 700,
          color: "#475569",
          textTransform: "uppercase",
          marginBottom: "3px",
          letterSpacing: "0.4px",
        }}
      >
        {custom.title || "Custom Section"}
      </div>
      {custom.body ? (
        <div
          style={{
            fontSize: "9px",
            color: "#475569",
            whiteSpace: "pre-wrap",
          }}
        >
          {custom.body}
        </div>
      ) : null}
    </div>
  );

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "280px",
        background: "#FFFFFF",
        borderRadius: "8px",
        padding: "14px 16px",
        fontFamily: fontMap[layout.fontFamily],
        color: "#011B2F",
        boxSizing: "border-box",
        fontSize: "11px",
        lineHeight: 1.4,
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      }}
    >
      {layout.sectionOrder.map((key) => {
        if (typeof key === "string" && key.startsWith("custom:")) {
          const id = key.slice("custom:".length);
          const custom = layout.customSections.find((c) => c.id === id);
          if (!custom || !custom.enabled) return null;
          return renderCustom(custom);
        }
        const builtIn = key as BuiltInSectionKey;
        if (builtIn === "footer" || !layout.sections[builtIn]) return null;
        switch (builtIn) {
          case "summary":
            return <PreviewSummary key={key} />;
          case "header":
            return <PreviewHeader key={key} layout={layout} />;
          case "seats":
            return <PreviewSeats key={key} />;
          case "items":
            return <PreviewItems key={key} />;
          case "tax":
            return <PreviewTax key={key} />;
          case "qr":
            return <PreviewQR key={key} />;
          default:
            return null;
        }
      })}

      {layout.sections.footer && <PreviewFooter />}
    </div>
  );
}

function PreviewSummary() {
  return (
    <>
      <div
        style={{
          textAlign: "center",
          borderBottom: "1px dashed #94A3B8",
          paddingBottom: "8px",
          marginBottom: "8px",
        }}
      >
        <div
          style={{
            fontSize: "20px",
            fontWeight: 800,
            color: "#011B2F",
            letterSpacing: "0.5px",
          }}
        >
          {DEMO_SAMPLE.totalAmount}
        </div>
        <div
          style={{
            fontSize: "9px",
            fontWeight: 700,
            color: "#475569",
            marginTop: "2px",
            letterSpacing: "0.3px",
          }}
        >
          Total Amount Paid ({DEMO_SAMPLE.payMode})
        </div>
      </div>

      <div
        style={{
          borderBottom: "1px dashed #94A3B8",
          paddingBottom: "6px",
          marginBottom: "6px",
          fontSize: "10px",
          display: "flex",
          flexDirection: "column",
          gap: "2px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>
            <b>Invoice:</b> {DEMO_SAMPLE.invoice}
          </span>
          <span>
            <b>Bill To:</b> {DEMO_SAMPLE.customer}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>
            <b>Date:</b> {DEMO_SAMPLE.date}
          </span>
          <span>
            <b>Time:</b> {DEMO_SAMPLE.time}
          </span>
        </div>
      </div>
    </>
  );
}

function PreviewHeader({ layout }: { layout: TicketLayout }) {
  return (
    <div
      style={{
        textAlign: "center",
        borderBottom: "1px dashed #94A3B8",
        paddingBottom: "8px",
        marginBottom: "8px",
      }}
    >
      {layout.logoUrl ? (
        <img
          src={layout.logoUrl}
          alt="logo"
          style={{ height: "26px", marginBottom: "4px" }}
        />
      ) : null}
      <div
        style={{
          fontSize: "14px",
          fontWeight: 800,
          textTransform: "uppercase",
          color: "#011B2F",
          letterSpacing: "0.5px",
        }}
      >
        {DEMO_SAMPLE.attractionName}
      </div>
      <div
        style={{
          fontSize: "11px",
          fontWeight: 700,
          color: "#011B2F",
          marginTop: "1px",
        }}
      >
        {layout.businessName || DEMO_SAMPLE.businessName}
      </div>
      <div style={{ fontSize: "8px", color: "#475569", marginTop: "2px" }}>
        CIN: {DEMO_SAMPLE.cin}
      </div>
      <div style={{ fontSize: "8px", color: "#475569" }}>
        GST: {DEMO_SAMPLE.gst}
      </div>
    </div>
  );
}

function PreviewSeats() {
  return (
    <div
      style={{
        borderBottom: "1px dashed #94A3B8",
        paddingBottom: "6px",
        marginBottom: "6px",
      }}
    >
      <div
        style={{
          fontSize: "9px",
          fontWeight: 700,
          color: "#475569",
          textTransform: "uppercase",
          textAlign: "center",
          marginBottom: "4px",
          letterSpacing: "0.4px",
        }}
      >
        Seat Allocation
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "10px",
          fontWeight: 600,
        }}
      >
        <span>seat:</span>
        <span>Seat 2, 3</span>
      </div>
    </div>
  );
}

function PreviewItems() {
  return (
    <div
      style={{
        borderBottom: "1px dashed #94A3B8",
        paddingBottom: "6px",
        marginBottom: "6px",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "26px 1fr 30px 56px",
          fontSize: "9px",
          fontWeight: 700,
          color: "#011B2F",
          borderBottom: "1px solid #E2E8F0",
          paddingBottom: "3px",
          marginBottom: "3px",
        }}
      >
        <span>S.No.</span>
        <span>Category / Item</span>
        <span style={{ textAlign: "right" }}>Qty</span>
        <span style={{ textAlign: "right" }}>Amount</span>
      </div>
      {DEMO_SAMPLE.items.map((it) => (
        <div
          key={it.sNo}
          style={{
            display: "grid",
            gridTemplateColumns: "26px 1fr 30px 56px",
            fontSize: "10px",
            color: "#011B2F",
            padding: "2px 0",
          }}
        >
          <span>{it.sNo}</span>
          <span>{it.name}</span>
          <span style={{ textAlign: "right" }}>{it.qty}</span>
          <span style={{ textAlign: "right" }}>{it.amount}</span>
        </div>
      ))}
    </div>
  );
}

function PreviewTax() {
  return (
    <div
      style={{
        borderBottom: "1px dashed #94A3B8",
        paddingBottom: "6px",
        marginBottom: "6px",
        fontSize: "10px",
        lineHeight: "1.7",
      }}
    >
      <TaxLine label="Sub-Total" value={DEMO_SAMPLE.subTotal} />
      <TaxLine label="SGST (9%)" value={DEMO_SAMPLE.sgst} />
      <TaxLine label="CGST (9%)" value={DEMO_SAMPLE.cgst} />
      <TaxLine label="Effective GST (18%)" value={DEMO_SAMPLE.effectiveGst} />
      <TaxLine label="GST Round Off" value={DEMO_SAMPLE.gstRoundOff} />
      <TaxLine label="Round Off" value={DEMO_SAMPLE.roundOff} />
      <TaxLine
        label="Amount Payable (₹)"
        value={DEMO_SAMPLE.amountPayable}
        bold
      />
    </div>
  );
}

function PreviewQR() {
  return (
    <div
      style={{
        textAlign: "center",
        paddingTop: "4px",
        paddingBottom: "4px",
      }}
    >
      <SampleQRCode size={90} />
      <div
        style={{
          fontSize: "8px",
          color: "#475569",
          marginTop: "4px",
          fontWeight: 700,
          letterSpacing: "0.3px",
        }}
      >
        SCAN FOR ENTRY
      </div>
    </div>
  );
}

function PreviewFooter() {
  return (
    <div
      style={{
        textAlign: "center",
        marginTop: "6px",
        fontSize: "9px",
        color: "#475569",
        fontWeight: 700,
        letterSpacing: "0.4px",
        borderTop: "1px dashed #94A3B8",
        paddingTop: "6px",
      }}
    >
      THANKS FOR VISIT
      <div
        style={{
          fontSize: "7px",
          color: "#94A3B8",
          fontWeight: 500,
          marginTop: "2px",
          letterSpacing: "0.1px",
          lineHeight: 1.3,
        }}
      >
        Please present this QR code at the entrance gate.
        <br />
        Keep this ticket safe.
      </div>
    </div>
  );
}

function TaxLine({
  label,
  value,
  bold = false,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        fontWeight: bold ? 700 : 500,
        color: "#011B2F",
        borderTop: bold ? "1px solid #E2E8F0" : "none",
        paddingTop: bold ? "3px" : 0,
      }}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Editor body — shared between Create and Edit pages
   ────────────────────────────────────────────────────────────────────────── */

export type EditorAction = {
  /** Primary button (e.g. "Create Layout" or "Save Layout"). */
  primaryLabel: string;
  /** Secondary button — typically "Save Draft" on the Create page. */
  secondaryLabel?: string;
  /**
   * Click handlers. Each receives the editor's current draft so the page
   * can validate and persist without lifting state out of the editor.
   */
  onPrimary: (draft: TicketLayout) => void;
  onSecondary?: (draft: TicketLayout) => void;
};

export type LayoutEditorBodyProps = {
  initialDraft: TicketLayout;
  errors?: Partial<Record<"name" | "preset", string>>;
  actions: EditorAction;
};

export function LayoutEditorBody({
  initialDraft,
  errors = {},
  actions,
}: LayoutEditorBodyProps) {
  const [draft, setDraft] = useState<TicketLayout>(initialDraft);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid #E2E8F0",
        borderRadius: "12px",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
          gap: 0,
          alignItems: "stretch",
        }}
      >
        {/* ── Editor column ── */}
        <div
          style={{
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "18px",
            minWidth: 0,
            borderRight: "1px solid #E2E8F0",
          }}
        >
          <EditorFields
            draft={draft}
            setDraft={setDraft}
            errors={errors}
            draggingIndex={draggingIndex}
            setDraggingIndex={setDraggingIndex}
          />
        </div>

        {/* ── Live preview column ── */}
        <div
          style={{
            background: "#F8FAFC",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            alignItems: "stretch",
            minWidth: 0,
            // Cap to the available viewport so the page never has to scroll
            // past the receipt itself; the receipt scrolls inside this
            // column if it's ever very long.
            maxHeight: "calc(100vh - 260px)",
            overflow: "hidden",
            position: "sticky",
            top: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              fontSize: "11px",
              fontWeight: 700,
              color: "#64748B",
              textTransform: "uppercase",
              letterSpacing: "0.6px",
              marginBottom: "16px",
              flexShrink: 0,
            }}
          >
            <Printer size={12} />
            Live Preview
          </div>
          <div
            style={{
              flex: 1,
              minHeight: 0,
              width: "100%",
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "center",
              overflow: "auto",
              padding: "4px 6px 8px 6px",
            }}
          >
            <ReceiptPreview layout={draft} />
          </div>
        </div>
      </div>

      {/* ── Action footer — always visible, never pushed off-screen ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: "10px",
          padding: "16px 24px",
          borderTop: "1px solid #E2E8F0",
          background: "#FAFBFC",
        }}
      >
        {actions.secondaryLabel && actions.onSecondary && (
          <button
            type="button"
            onClick={() => actions.onSecondary?.(draft)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "10px 20px",
              background: "rgba(244, 188, 67, 0.15)",
              border: "1.5px solid #F4BC43",
              borderRadius: "8px",
              color: "#92400E",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <FileText size={14} />
            {actions.secondaryLabel}
          </button>
        )}
        <button
          type="button"
          onClick={() => actions.onPrimary(draft)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "10px 20px",
            background: "#F4BC43",
            border: "none",
            borderRadius: "8px",
            color: "#011B2F",
            fontSize: "13px",
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 2px 6px rgba(244, 188, 67, 0.3)",
          }}
        >
          <Save size={14} />
          {actions.primaryLabel}
        </button>
      </div>
    </div>
  );
}

type EditorFieldsProps = {
  draft: TicketLayout;
  setDraft: React.Dispatch<React.SetStateAction<TicketLayout>>;
  errors?: Partial<Record<"name" | "preset", string>>;
  draggingIndex: number | null;
  setDraggingIndex: (n: number | null) => void;
};

function EditorFields({
  draft,
  setDraft,
  errors = {},
  draggingIndex,
  setDraggingIndex,
}: EditorFieldsProps) {
  const applyPreset = (preset: TicketLayoutPreset) => {
    const p = PRESET_PRESETS[preset];
    setDraft((prev) => ({
      ...prev,
      preset,
      fontFamily: p.fontFamily,
      sections: { ...p.sections },
      sectionOrder: [...p.sectionOrder],
    }));
  };

  const updateSection = (key: keyof TicketLayoutSections, value: boolean) => {
    setDraft((prev) => ({
      ...prev,
      sections: { ...prev.sections, [key]: value },
    }));
  };

  const reorderSection = (fromIndex: number, toIndex: number) => {
    setDraft((prev) => {
      const next = [...prev.sectionOrder];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return { ...prev, sectionOrder: next };
    });
  };

  const resetToDefaultOrder = () => {
    setDraft((prev) => ({
      ...prev,
      sectionOrder: [...DEFAULT_SECTION_ORDER],
    }));
  };

  const addCustomSection = () => {
    setDraft((prev) => {
      const id = `custom_${Date.now()}`;
      const newSection: CustomSection = {
        id,
        title: "New Section",
        body: "",
        enabled: true,
      };
      return {
        ...prev,
        customSections: [...prev.customSections, newSection],
        sectionOrder: [...prev.sectionOrder, `custom:${id}` as string],
      };
    });
  };

  const updateCustomSection = (
    id: string,
    patch: Partial<CustomSection>,
  ) => {
    setDraft((prev) => ({
      ...prev,
      customSections: prev.customSections.map((c) =>
        c.id === id ? { ...c, ...patch } : c,
      ),
    }));
  };

  const removeCustomSection = (id: string) => {
    setDraft((prev) => ({
      ...prev,
      customSections: prev.customSections.filter((c) => c.id !== id),
      sectionOrder: prev.sectionOrder.filter(
        (k) => !(typeof k === "string" && k === `custom:${id}`),
      ),
    }));
  };

  const draggableKeys = draft.sectionOrder.filter((k) => k !== "footer");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <Field label="Layout Name" required error={errors.name}>
        <input
          type="text"
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          placeholder="e.g. Summer Promo, Diwali Special"
          style={fieldInputStyle}
        />
      </Field>

      <Field label="Preset" required error={errors.preset}>
        <div style={{ display: "flex", gap: "8px" }}>
          {(["Classic", "Modern", "Minimal"] as TicketLayoutPreset[]).map(
            (preset) => {
              const isActive = draft.preset === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    background: isActive ? "#011B2F" : "#FFFFFF",
                    color: isActive ? "#FFFFFF" : "#011B2F",
                    border: `1.5px solid ${isActive ? "#011B2F" : "#E2E8F0"}`,
                    borderRadius: "8px",
                    fontFamily: typography.fontFamily.sans,
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {preset}
                </button>
              );
            },
          )}
        </div>
      </Field>

      <Field label="Business Name (shown under the attraction)">
        <input
          type="text"
          value={draft.businessName}
          onChange={(e) =>
            setDraft({ ...draft, businessName: e.target.value })
          }
          style={fieldInputStyle}
        />
      </Field>

      <Field label="Business Logo (paste a hosted image URL)">
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <input
            type="text"
            value={draft.logoUrl ?? ""}
            placeholder="https://example.com/logo.png"
            onChange={(e) =>
              setDraft({ ...draft, logoUrl: e.target.value || null })
            }
            style={{ ...fieldInputStyle, flex: 1 }}
          />
          <button
            type="button"
            onClick={() => {
              showSuccessNotify(
                "Logo upload will be enabled with the backend",
                "Coming soon",
              );
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "0 14px",
              height: "38px",
              background: "#F1F5F9",
              color: "#011B2F",
              border: "1px solid #E2E8F0",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            <Upload size={13} />
            Upload
          </button>
        </div>
      </Field>

      <Field label="Status">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "8px 12px",
            border: "1.5px solid #E2E8F0",
            borderRadius: "8px",
            background: "#FFFFFF",
            height: "38px",
            boxSizing: "border-box",
          }}
        >
          <ToggleSwitch
            checked={draft.isActive}
            onChange={(v) => setDraft({ ...draft, isActive: v })}
            titleOn="Deactivate layout"
            titleOff="Activate layout"
          />
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "13px",
              fontWeight: 700,
              color: draft.isActive ? "#15803D" : "#475569",
              letterSpacing: "0.2px",
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: draft.isActive ? "#22C55E" : "#94A3B8",
              }}
            />
            {draft.isActive ? "Active" : "Inactive"}
          </span>
        </div>
      </Field>

      <Field label="Font Family">
        <select
          value={draft.fontFamily}
          onChange={(e) =>
            setDraft({
              ...draft,
              fontFamily: e.target.value as TicketLayout["fontFamily"],
            })
          }
          style={fieldInputStyle}
        >
          <option value="sans">Sans-serif (clean & modern)</option>
          <option value="serif">Serif (classic & formal)</option>
          <option value="mono">Monospace (POS / receipt)</option>
        </select>
      </Field>

      <Field label="Sections (drag to reorder)">
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "6px",
          }}
        >
          {draggableKeys.map((key) => {
            const i = draggableKeys.indexOf(key);
            const isOn = !!draft.sections[key as keyof TicketLayoutSections];
            const isDragging = draggingIndex === i;

            // Custom section rows render a slightly different card with
            // inline title + body fields.
            if (
              typeof key === "string" &&
              key.startsWith("custom:")
            ) {
              const id = key.slice("custom:".length);
              const custom = draft.customSections.find((c) => c.id === id);
              if (!custom) return null;
              return (
                <div
                  key={custom.id}
                  draggable
                  onDragStart={(e) => {
                    setDraggingIndex(i);
                    if (e.dataTransfer) {
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", String(i));
                    }
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const from = parseInt(
                      e.dataTransfer?.getData("text/plain") ?? "0",
                      10,
                    );
                    const fromKey = draggableKeys[from];
                    const toKey = draggableKeys[i];
                    if (fromKey && toKey && fromKey !== toKey) {
                      reorderSection(
                        draft.sectionOrder.indexOf(fromKey),
                        draft.sectionOrder.indexOf(toKey),
                      );
                    }
                    setDraggingIndex(null);
                  }}
                  onDragEnd={() => setDraggingIndex(null)}
                  style={{
                    padding: "10px",
                    background: isDragging
                      ? "#EFF6FF"
                      : custom.enabled
                      ? "#FFFFFF"
                      : "#F8FAFC",
                    border: `1.5px dashed ${
                      isDragging ? "#3B82F6" : "#A78BFA"
                    }`,
                    borderRadius: "8px",
                    cursor: "grab",
                    opacity: isDragging ? 0.5 : 1,
                    transition: "border-color 0.15s, background 0.15s",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "6px",
                    }}
                  >
                    <GripVertical
                      size={14}
                      color="#94A3B8"
                      style={{ flexShrink: 0 }}
                    />
                    <span
                      style={{
                        flex: 1,
                        fontSize: "11px",
                        fontWeight: 700,
                        color: "#7C3AED",
                        textTransform: "uppercase",
                        letterSpacing: "0.3px",
                      }}
                    >
                      Custom
                    </span>
                    <ToggleSwitch
                      checked={custom.enabled}
                      onChange={(v) =>
                        updateCustomSection(custom.id, { enabled: v })
                      }
                      titleOn="Disable section"
                      titleOff="Enable section"
                    />
                    <button
                      type="button"
                      onClick={() => removeCustomSection(custom.id)}
                      title="Remove custom section"
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#DC2626",
                        cursor: "pointer",
                        padding: "2px 4px",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={custom.title}
                    placeholder="Section title (e.g. Promotions, Notes)"
                    onChange={(e) =>
                      updateCustomSection(custom.id, {
                        title: e.target.value,
                      })
                    }
                    style={{
                      ...fieldInputStyle,
                      marginBottom: "6px",
                      height: "32px",
                      fontSize: "12px",
                    }}
                  />
                  <textarea
                    value={custom.body}
                    placeholder="Body text shown inside this section"
                    onChange={(e) =>
                      updateCustomSection(custom.id, {
                        body: e.target.value,
                      })
                    }
                    rows={2}
                    style={{
                      ...fieldInputStyle,
                      height: "auto",
                      padding: "8px 12px",
                      fontSize: "12px",
                      resize: "vertical",
                      fontFamily: typography.fontFamily.sans,
                    }}
                  />
                </div>
              );
            }

            // Built-in section row
            return (
              <div
                key={key}
                draggable
                onDragStart={(e) => {
                  setDraggingIndex(i);
                  if (e.dataTransfer) {
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", String(i));
                  }
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const from = parseInt(
                    e.dataTransfer?.getData("text/plain") ?? "0",
                    10,
                  );
                  const fromKey = draggableKeys[from];
                  const toKey = draggableKeys[i];
                  if (fromKey && toKey && fromKey !== toKey) {
                    reorderSection(
                      draft.sectionOrder.indexOf(fromKey),
                      draft.sectionOrder.indexOf(toKey),
                    );
                  }
                  setDraggingIndex(null);
                }}
                onDragEnd={() => setDraggingIndex(null)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 10px",
                  background: isDragging
                    ? "#EFF6FF"
                    : isOn
                    ? "#FFFFFF"
                    : "#F8FAFC",
                  border: `1.5px solid ${
                    isDragging ? "#3B82F6" : isOn ? "#E2E8F0" : "#F1F5F9"
                  }`,
                  borderRadius: "8px",
                  cursor: "grab",
                  opacity: isDragging ? 0.5 : 1,
                  transition: "border-color 0.15s, background 0.15s",
                }}
              >
                <GripVertical
                  size={14}
                  color="#94A3B8"
                  style={{ flexShrink: 0 }}
                />
                <span
                  style={{
                    flex: 1,
                    fontSize: "12px",
                    fontWeight: 600,
                    color: isOn ? "#011B2F" : "#94A3B8",
                    textDecoration: isOn ? "none" : "line-through",
                  }}
                >
                  {SECTION_LABELS[key as BuiltInSectionKey] ?? key}
                </span>
                <ToggleSwitch
                  checked={isOn}
                  onChange={(v) =>
                    updateSection(key as keyof TicketLayoutSections, v)
                  }
                  titleOn="Disable section"
                  titleOff="Enable section"
                />
              </div>
            );
          })}

          {/* Locked footer row */}
          {(() => {
            const isOn = !!draft.sections.footer;
            return (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 10px",
                  background: isOn ? "#FFFFFF" : "#F8FAFC",
                  border: `1.5px dashed ${isOn ? "#CBD5E1" : "#F1F5F9"}`,
                  borderRadius: "8px",
                  cursor: "not-allowed",
                  opacity: 0.92,
                }}
              >
                <span
                  style={{
                    flexShrink: 0,
                    fontSize: "11px",
                    color: "#94A3B8",
                    fontWeight: 700,
                    width: "14px",
                    textAlign: "center",
                  }}
                  title="Footer is locked to the bottom"
                >
                  🔒
                </span>
                <span
                  style={{
                    flex: 1,
                    fontSize: "12px",
                    fontWeight: 600,
                    color: isOn ? "#011B2F" : "#94A3B8",
                    textDecoration: isOn ? "none" : "line-through",
                  }}
                >
                  {SECTION_LABELS.footer}
                </span>
                <ToggleSwitch
                  checked={isOn}
                  onChange={(v) => updateSection("footer", v)}
                  titleOn="Disable footer"
                  titleOff="Enable footer"
                />
              </div>
            );
          })()}

          <button
            type="button"
            onClick={addCustomSection}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              marginTop: "4px",
              padding: "8px",
              background: "transparent",
              border: "1.5px dashed #A78BFA",
              borderRadius: "8px",
              color: "#7C3AED",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <PlusCircle size={14} />
            Add Custom Section
          </button>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: "6px",
          }}
        >
          <button
            type="button"
            onClick={resetToDefaultOrder}
            style={{
              fontSize: "11px",
              fontWeight: 600,
              color: "#64748B",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "2px 4px",
              textDecoration: "underline",
            }}
          >
            Reset order
          </button>
        </div>
      </Field>
    </div>
  );
}

function ToggleSwitch({
  checked,
  onChange,
  titleOn,
  titleOff,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  titleOn: string;
  titleOff: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      title={checked ? titleOn : titleOff}
      style={{
        width: "36px",
        height: "20px",
        borderRadius: "10px",
        border: "none",
        background: checked ? "#22C55E" : "#CBD5E1",
        cursor: "pointer",
        position: "relative",
        transition: "background 0.2s",
        flexShrink: 0,
        padding: 0,
      }}
    >
      <span
        style={{
          display: "block",
          width: "16px",
          height: "16px",
          borderRadius: "50%",
          background: "#FFFFFF",
          position: "absolute",
          top: "2px",
          left: checked ? "18px" : "2px",
          transition: "left 0.2s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }}
      />
    </button>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Field + page header — small helpers reused by every page
   ────────────────────────────────────────────────────────────────────────── */

export function Field({
  label,
  required = false,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
          fontSize: "12px",
          fontWeight: 700,
          color: "#475569",
          textTransform: "uppercase",
          letterSpacing: "0.4px",
          marginBottom: "6px",
        }}
      >
        <span>{label}</span>
        {required && (
          <span
            aria-hidden
            style={{ color: "#DC2626", fontSize: "13px", lineHeight: 1 }}
          >
            *
          </span>
        )}
      </label>
      {children}
      {error && (
        <span
          style={{
            fontSize: "12px",
            color: "#DC2626",
            marginTop: "4px",
            display: "block",
          }}
        >
          {error}
        </span>
      )}
    </div>
  );
}

export const fieldInputStyle: React.CSSProperties = {
  width: "100%",
  height: "38px",
  padding: "0 12px",
  border: "1px solid #E2E8F0",
  borderRadius: "8px",
  background: "#FFFFFF",
  fontFamily: typography.fontFamily.sans,
  fontSize: "13px",
  color: "#011B2F",
  outline: "none",
  boxSizing: "border-box",
};

/**
 * Page header shared by the Create and Edit pages. Renders a back-link
 * plus the page title and an optional subtitle.
 */
export function EditorPageHeader({
  title,
  subtitle,
  backHref,
}: {
  title: string;
  subtitle?: string;
  backHref: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "14px",
        marginBottom: "20px",
        flexWrap: "wrap",
        maxWidth: "1200px",
      }}
    >
      <a
        href={backHref}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          background: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: "8px",
          padding: "8px 14px",
          color: "#011B2F",
          textDecoration: "none",
          fontSize: "13px",
          fontWeight: 600,
          fontFamily: typography.fontFamily.sans,
        }}
      >
        <ArrowLeft size={14} />
        Back
      </a>
      <div style={{ minWidth: 0 }}>
        <h1
          style={{
            fontFamily: typography.fontFamily.sans,
            fontSize: "22px",
            fontWeight: typography.fontWeight.bold,
            color: "#011B2F",
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            style={{
              fontFamily: typography.fontFamily.sans,
              fontSize: "12px",
              color: "#6B7280",
              margin: "4px 0 0 0",
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
