export interface AttractionManagement {
  id: string;           // management ID — used for PATCH/:id, DELETE/:id, PATCH/:id/seat
  attractionId: string; // underlying attraction ID
  name: string;
  category: string;
  image: string | null;
  timing: string | null;
  duration?: string | null;
  durationMins?: number | null;
  pricing: {
    adult: number;
    child: number;
    student: number;
    senior: number;
    foreigner: number;
  };
  /** Per visitor-category seat counts (mirrors pricing keys) */
  seating: {
    adult: number;
    child: number;
    student: number;
    senior: number;
    foreigner: number;
  };
  hasSeating: boolean;
  description: string | null;
  status: string;
  seatLayoutId?: string | null;
  seatLayouts?: Array<{
    id: string;
    adminId?: string;
    name: string;
    rows?: number;
    cols?: number;
    hasAisle?: boolean;
    aisleAfterCol?: number;
    status?: string;
    createdAt?: string;
    updatedAt?: string;
    totalSeats?: number;
    /** How many times this layout is allocated (quantity semantics) */
    quantity?: number;
  }>;
  /**
   * Expanded allocation list for UI chips.
   * Same layout ID may appear multiple times (quantity).
   */
  seatLayoutIds?: string[];
  /**
   * Optional bookable time slots (future FE).
   * Current UI may ignore this key.
   * Each slot has its own Active/Inactive via `isActive`.
   */
  timeSlots?: AttractionTimeSlot[];
}

/** Per-slot Active/Inactive — independent of attraction status */
export interface AttractionTimeSlot {
  id: string;
  attractionId?: string;
  /** 24h time, e.g. "10:00:00" */
  slotTime: string;
  isActive: boolean;
}

/**
 * Optional create/update payload for future FE.
 * - Omit `timeSlots` → no change to existing slots
 * - Send `timeSlots` (incl. []) → sync slots for that attraction
 * Item keys: `id?`, `slotTime`, `isActive`
 */
export type AttractionTimeSlotPayloadItem = {
  id?: string;
  slotTime: string;
  isActive: boolean;
};

// ── Create payload ───────────────────────────────────────────────────────────
export interface CreateAttractionPayload {
  name: string;
  category: string;
  image?: string | null;
  description?: string | null;
  timing?: string | null;
  duration?: string | number | null;
  durationUnit?: string | null;
  adultPrice?: number;
  childPrice?: number;
  studentPrice?: number;
  seniorPrice?: number;
  foreignerPrice?: number;
  adultSeats: number;
  childSeats: number;
  studentSeats: number;
  seniorSeats: number;
  foreignerSeats: number;
  hasSeating?: boolean;
  seatLayoutIds?: string[];
  /** Optional — omit to leave slots untouched / empty on create */
  timeSlots?: AttractionTimeSlotPayloadItem[];
}

// ── Update payload ───────────────────────────────────────────────────────────
export interface UpdateAttractionPayload {
  name?: string;
  category?: string;
  image?: string | null;
  description?: string | null;
  timing?: string | null;
  duration?: string | number | null;
  durationUnit?: string | null;
  adultPrice?: number;
  childPrice?: number;
  studentPrice?: number;
  seniorPrice?: number;
  foreignerPrice?: number;
  adultSeats?: number;
  childSeats?: number;
  studentSeats?: number;
  seniorSeats?: number;
  foreignerSeats?: number;
  hasSeating?: boolean;
  seatLayoutIds?: string[];
  /** Optional — omit to leave existing slots untouched */
  timeSlots?: AttractionTimeSlotPayloadItem[];
}

// ── Bulk upload 
export interface BulkAttractionItem {
  name: string;
  type?: string;
  image?: string | null;
  description?: string | null;
  timing?: string | null;
  adultPrice?: number;
  childPrice?: number;
  studentPrice?: number;
  seniorPrice?: number;
  foreignerPrice?: number;
  hasSeating?: boolean;
  attractionName?: string;
}

export type BulkAttractionPayload = BulkAttractionItem[];

export interface BulkUploadResponse {
  message: string;
  data: Array<{
    id: string;
    attractionId: string;
  }>;
}

// ── Legacy UI type alias (for backward compat in other files) ────────────────
// This is intentionally minimal — the source of truth is AttractionManagement
export type Attraction = AttractionManagement;

export interface AttractionTicketPricing {
  adult: number;
  child: number;
  student: number;
  senior: number;
  foreigner: number;
}

// ── Mock attractions data (used in Ticket Booking & previews) ────────────────
export const INITIAL_ATTRACTIONS: Attraction[] = [
  {
    id: "ATR-001",
    attractionId: "ATR-001",
    name: "Toy Train",
    category: "Ride",
    timing: "09:00 AM - 06:00 PM",
    pricing: { adult: 100, child: 50, student: 60, senior: 75, foreigner: 500 },
    seating: { adult: 0, child: 0, student: 0, senior: 0, foreigner: 0 },
    hasSeating: true,
    status: "Active",
    image: "/Assets/Attractions/Toy_Train.jpg",
    description: "Scenic ride through the park",
  },
  {
    id: "ATR-002",
    attractionId: "ATR-002",
    name: "Ropeway",
    category: "Ride",
    timing: "09:00 AM - 06:00 PM",
    pricing: { adult: 200, child: 100, student: 80, senior: 150, foreigner: 600 },
    seating: { adult: 0, child: 0, student: 0, senior: 0, foreigner: 0 },
    hasSeating: true,
    status: "Active",
    image: "/Assets/Attractions/Rope.jpg",
    description: "Aerial cable car view",
  },
  {
    id: "ATR-003",
    attractionId: "ATR-003",
    name: "Wax Museum",
    category: "Museum",
    timing: "09:00 AM - 06:00 PM",
    pricing: { adult: 120, child: 60, student: 70, senior: 90, foreigner: 600 },
    seating: { adult: 0, child: 0, student: 0, senior: 0, foreigner: 0 },
    hasSeating: false,
    status: "Active",
    image: "/Assets/Attractions/Wax.jpg",
    description: "Celebrity wax statues",
  },
  {
    id: "ATR-004",
    attractionId: "ATR-004",
    name: "Biological Park",
    category: "Park",
    timing: "09:00 AM - 06:00 PM",
    pricing: { adult: 100, child: 50, student: 60, senior: 75, foreigner: 500 },
    seating: { adult: 0, child: 0, student: 0, senior: 0, foreigner: 0 },
    hasSeating: false,
    status: "Active",
    image: "/Assets/Attractions/Biological.jpg",
    description: "Flora and fauna sanctuary",
  },
  {
    id: "ATR-005",
    attractionId: "ATR-005",
    name: "Sheesh Mahal",
    category: "Monument",
    timing: "09:00 AM - 06:00 PM",
    pricing: { adult: 80, child: 40, student: 50, senior: 60, foreigner: 400 },
    seating: { adult: 0, child: 0, student: 0, senior: 0, foreigner: 0 },
    hasSeating: false,
    status: "Active",
    image: "/Assets/Attractions/Mahal.jpg",
    description: "Historic palace of mirrors",
  },
  {
    id: "ATR-006",
    attractionId: "ATR-006",
    name: "Fort Entry",
    category: "Fort",
    timing: "10:00 AM - 05:30 PM",
    pricing: { adult: 100, child: 50, student: 60, senior: 75, foreigner: 500 },
    seating: { adult: 0, child: 0, student: 0, senior: 0, foreigner: 0 },
    hasSeating: false,
    status: "Active",
    image: "/Assets/Attractions/Mahal.jpg",
    description: "Ancient heritage fortress",
  },
];
