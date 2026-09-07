/**
 * Ticket Layout Management — Mock Data (Stub)
 *
 * Stand-in for the future backend API (e.g. GET /admin/ticket-layouts).
 * When the real endpoint is ready, replace these imports with TanStack
 * Query hooks just like useSeatLayouts in seat-management.
 *
 * The shape mirrors what a real TicketLayout record would look like in
 * the database so the UI doesn't have to change when the API is wired in.
 */

export type TicketLayoutPreset = "Classic" | "Modern" | "Minimal";

export type BuiltInSectionKey =
  | "header"
  | "summary"
  | "seats"
  | "items"
  | "tax"
  | "qr"
  | "footer";

export type SectionKey = BuiltInSectionKey | string; // string covers "custom:<id>"

export interface TicketLayoutSections {
  header: boolean;
  summary: boolean;
  seats: boolean;
  items: boolean;
  tax: boolean;
  qr: boolean;
  footer: boolean;
  // Custom sections are tracked by id; we expose them as a Record for easy
  // toggle lookup. They live outside the boolean map but the UI uses the
  // same enable/disable affordance.
  [key: string]: boolean | undefined;
}

/** User-defined section appended to a layout. */
export interface CustomSection {
  id: string; // e.g. "custom_<timestamp>"
  title: string; // shown in the receipt
  body: string; // free-text body rendered in the receipt
  enabled: boolean;
}

export interface TicketLayout {
  id: string;
  name: string;
  preset: TicketLayoutPreset;
  isActive: boolean;
  isDefault: boolean;
  isDraft: boolean; // true while the layout only exists as a local draft
  businessName: string;
  logoUrl: string | null;
  fontFamily: "sans" | "serif" | "mono";
  sections: TicketLayoutSections;
  sectionOrder: SectionKey[];
  customSections: CustomSection[];
  createdAt: string;
  updatedAt: string;
}

export const SECTION_LABELS: Record<BuiltInSectionKey, string> = {
  header: "Header (logo, business)",
  summary: "Amount & Invoice Details",
  seats: "Seat Allocation",
  items: "Items Table",
  tax: "Tax Breakdown",
  qr: "QR Code",
  footer: "Footer / Thanks",
};

export const DEFAULT_SECTION_ORDER: BuiltInSectionKey[] = [
  "header",
  "summary",
  "seats",
  "items",
  "tax",
  "qr",
  "footer",
];

export const PRESET_PRESETS: Record<
  TicketLayoutPreset,
  Pick<TicketLayout, "fontFamily" | "sections" | "sectionOrder">
> = {
  Classic: {
    fontFamily: "sans",
    sections: {
      header: true,
      summary: true,
      seats: true,
      items: true,
      tax: true,
      qr: true,
      footer: true,
    },
    sectionOrder: [
      "header",
      "summary",
      "seats",
      "items",
      "tax",
      "qr",
      "footer",
    ],
  },
  Modern: {
    fontFamily: "sans",
    sections: {
      header: true,
      summary: true,
      seats: true,
      items: true,
      tax: true,
      qr: true,
      footer: false,
    },
    sectionOrder: [
      "header",
      "summary",
      "seats",
      "items",
      "tax",
      "qr",
      "footer",
    ],
  },
  Minimal: {
    fontFamily: "sans",
    sections: {
      header: true,
      summary: true,
      seats: false,
      items: true,
      tax: false,
      qr: true,
      footer: false,
    },
    sectionOrder: ["header", "summary", "items", "qr"],
  },
};

export const MOCK_TICKET_LAYOUTS: TicketLayout[] = [
  {
    id: "tpl_classic_001",
    name: "Classic Receipt",
    preset: "Classic",
    isActive: true,
    isDefault: true,
    isDraft: false,
    businessName: "VISHNU",
    logoUrl: null,
    fontFamily: "sans",
    sections: PRESET_PRESETS.Classic.sections,
    sectionOrder: [...PRESET_PRESETS.Classic.sectionOrder],
    customSections: [],
    createdAt: "2026-08-12T10:30:00Z",
    updatedAt: "2026-09-04T14:22:00Z",
  },
  {
    id: "tpl_modern_002",
    name: "Modern Cyan",
    preset: "Modern",
    isActive: true,
    isDefault: false,
    isDraft: false,
    businessName: "VISHNU",
    logoUrl: null,
    fontFamily: "sans",
    sections: PRESET_PRESETS.Modern.sections,
    sectionOrder: [...PRESET_PRESETS.Modern.sectionOrder],
    customSections: [],
    createdAt: "2026-08-25T09:00:00Z",
    updatedAt: "2026-09-01T11:00:00Z",
  },
  {
    id: "tpl_minimal_003",
    name: "Minimal B&W",
    preset: "Minimal",
    isActive: false,
    isDefault: false,
    isDraft: false,
    businessName: "VISHNU",
    logoUrl: null,
    fontFamily: "sans",
    sections: PRESET_PRESETS.Minimal.sections,
    sectionOrder: [...PRESET_PRESETS.Minimal.sectionOrder],
    customSections: [],
    createdAt: "2026-09-02T16:45:00Z",
    updatedAt: "2026-09-02T16:45:00Z",
  },
];

/* ──────────────────────────────────────────────────────────────────────────
   Local-storage helpers
   Drafts are persisted as an array of TicketLayout objects so we can show
   multiple in-progress drafts in the cards grid and edit any of them later.
   ────────────────────────────────────────────────────────────────────────── */

const DRAFT_STORAGE_KEY = "ticketLayoutDrafts.v1";

export function loadDrafts(): TicketLayout[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as TicketLayout[]) : [];
  } catch {
    return [];
  }
}

export function saveDrafts(drafts: TicketLayout[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(drafts));
  } catch {
    // Ignore quota errors — drafts are best-effort
  }
}