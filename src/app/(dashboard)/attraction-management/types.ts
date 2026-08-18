// Ticket pricing structure 
export interface AttractionTicketPricing {
  adult: number;
  child: number;
  student: number;
  senior: number;
  foreigner: number;
}

// Attraction entity 
export interface Attraction {
  id: string;
  name: string;
  category: "Ride" | "Monument" | "Park" | "Museum" | "Fort" | "Show";
  timing: string;
  pricing: AttractionTicketPricing;
  hasSeating: boolean;
  status: "Active" | "Inactive";
  image?: string;
  description?: string;
  assignedSeatId?: string;
  assignedSeatName?: string;
  assignedSeatIds?: string[];
  assignedSeatNames?: string[];
}

// Visitor category item in attraction form
export interface CategoryItem {
  id: string;
  name: string;
  image: string;
  basePrice: string;
  futurePrice: string;
  effectiveFrom: string;
  numberOfSeats: string;
}

// Mock attractions data
export const INITIAL_ATTRACTIONS: Attraction[] = [
  {
    id: "ATR-001",
    name: "Toy Train",
    category: "Ride",
    timing: "09:00 AM - 06:00 PM",
    pricing: { adult: 100, child: 50, student: 60, senior: 75, foreigner: 500 },
    hasSeating: true,
    status: "Active",
    image: "/Assets/Attractions/Toy_Train.jpg",
  },
  {
    id: "ATR-002",
    name: "Ropeway",
    category: "Ride",
    timing: "09:00 AM - 06:00 PM",
    pricing: { adult: 200, child: 100, student: 80, senior: 150, foreigner: 600 },
    hasSeating: true,
    status: "Active",
    image: "/Assets/Attractions/Rope.jpg",
  },
  {
    id: "ATR-003",
    name: "Wax Museum",
    category: "Museum",
    timing: "09:00 AM - 06:00 PM",
    pricing: { adult: 120, child: 60, student: 70, senior: 90, foreigner: 600 },
    hasSeating: false,
    status: "Active",
    image: "/Assets/Attractions/Wax.jpg",
  },
  {
    id: "ATR-004",
    name: "Biological Park",
    category: "Park",
    timing: "09:00 AM - 06:00 PM",
    pricing: { adult: 100, child: 50, student: 60, senior: 75, foreigner: 500 },
    hasSeating: false,
    status: "Active",
    image: "/Assets/Attractions/Biological.jpg",
  },
  {
    id: "ATR-005",
    name: "Sheesh Mahal",
    category: "Monument",
    timing: "09:00 AM - 06:00 PM",
    pricing: { adult: 80, child: 40, student: 50, senior: 60, foreigner: 400 },
    hasSeating: false,
    status: "Active",
    image: "/Assets/Attractions/Mahal.jpg",
  },
  {
    id: "ATR-006",
    name: "Fort Entry",
    category: "Fort",
    timing: "10:00 AM - 05:30 PM",
    pricing: { adult: 100, child: 50, student: 60, senior: 75, foreigner: 500 },
    hasSeating: false,
    status: "Active",
    image: "/Assets/Attractions/Mahal.jpg",
  },
];
