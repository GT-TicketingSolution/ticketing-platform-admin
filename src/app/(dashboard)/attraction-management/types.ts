// ── API response type ────────────────────────────────────────────────────────
export interface AttractionManagement {
  id: string;           // management ID — used for PATCH/:id, DELETE/:id, PATCH/:id/seat
  attractionId: string; // underlying attraction ID
  name: string;
  category: string;
  image: string | null;
  timing: string | null;
  pricing: {
    adult: number;
    child: number;
    student: number;
    senior: number;
    foreigner: number;
  };
  hasSeating: boolean;
  description: string | null;
  status: string;
}

// ── Create payload ───────────────────────────────────────────────────────────
export interface CreateAttractionPayload {
  name: string;
  category: string;
  image?: string | null;
  description?: string | null;
  timing?: string | null;
  adultPrice?: number;
  childPrice?: number;
  studentPrice?: number;
  seniorPrice?: number;
  foreignerPrice?: number;
  hasSeating?: boolean;
}

// ── Update payload ───────────────────────────────────────────────────────────
export interface UpdateAttractionPayload {
  name?: string;
  category?: string;
  image?: string | null;
  description?: string | null;
  timing?: string | null;
  adultPrice?: number;
  childPrice?: number;
  studentPrice?: number;
  seniorPrice?: number;
  foreignerPrice?: number;
  hasSeating?: boolean;
}

// ── Bulk upload ──────────────────────────────────────────────────────────────
export interface BulkAttractionItem {
  attractionId: string;
  image?: string | null;
  description?: string | null;
  timing?: string | null;

  adultPrice?: number;
  childPrice?: number;
  studentPrice?: number;
  seniorPrice?: number;
  foreignerPrice?: number;

  hasSeating?: boolean;
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
    hasSeating: false,
    status: "Active",
    image: "/Assets/Attractions/Mahal.jpg",
    description: "Ancient heritage fortress",
  },
];
