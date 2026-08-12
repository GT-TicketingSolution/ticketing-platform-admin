// ─── Ticket pricing structure ────────────────────────────────────────────────
export interface AttractionTicketPricing {
  adult: number;
  child: number;
  student: number;
  senior: number;
  foreigner: number;
}

// ─── Attraction entity ────────────────────────────────────────────────────────
export interface Attraction {
  id: string;
  name: string;
  category: "Ride" | "Monument" | "Park" | "Museum" | "Fort" | "Show";
  timing: string;
  pricing: AttractionTicketPricing;
  hasSeating: boolean;
  status: "Active" | "Inactive";
  image?: string;
}

// ─── Per-attraction module permissions ───────────────────────────────────────
export interface AttractionPermission {
  attractionId: string;
  /** Which of the 4 sub-modules this manager can use within this attraction */
  modules: string[];
}

// ─── Manager entity ──────────────────────────────────────────────────────────
export interface ManagerUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  attraction: string;
  joinedDate: string;
  status: "Active" | "Inactive";
  totalBookings: number;
  revenueGenerated: number;
  /** Master toggle — if false the manager has no attraction access at all */
  attractionManagementEnabled: boolean;
  /** Master toggle — if enabled manager can create and manage counter staff */
  staffCreationEnabled?: boolean;
  /** System-level module UI permissions (Bookings, Transactions, Invoices, Inventory / Capacity, Reports, Staff Management) */
  allowedModules?: string[];
  /** Granular permissions: per attraction + which sub-modules are allowed */
  attractionPermissions: AttractionPermission[];
}

export interface StaffUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string[];
  assignedAttraction: string[];
  joinedDate: string;
  status: "Active" | "Inactive";
  ticketsIssued: number;
}

// ─── Mock attractions ─────────────────────────────────────────────────────────
export const INITIAL_ATTRACTIONS: Attraction[] = [
  {
    id: "ATR-001",
    name: "Toy Train",
    category: "Ride",
    timing: "09:00 AM - 06:00 PM",
    pricing: { adult: 100, child: 50, student: 60, senior: 75, foreigner: 500 },
    hasSeating: true,
    status: "Active",
    image: "/Assets/Attraction/Toy_Train.jpg",
  },
  {
    id: "ATR-002",
    name: "Ropeway",
    category: "Ride",
    timing: "09:00 AM - 06:00 PM",
    pricing: { adult: 200, child: 100, student: 80, senior: 150, foreigner: 600 },
    hasSeating: true,
    status: "Active",
    image: "/Assets/Attraction/Rope.jpg",
  },
  {
    id: "ATR-003",
    name: "Wax Museum",
    category: "Museum",
    timing: "09:00 AM - 06:00 PM",
    pricing: { adult: 120, child: 60, student: 70, senior: 90, foreigner: 600 },
    hasSeating: false,
    status: "Active",
    image: "/Assets/Attraction/Wax.jpg",
  },
  {
    id: "ATR-004",
    name: "Biological Park",
    category: "Park",
    timing: "09:00 AM - 06:00 PM",
    pricing: { adult: 100, child: 50, student: 60, senior: 75, foreigner: 500 },
    hasSeating: false,
    status: "Active",
    image: "/Assets/Attraction/Biological.jpg",
  },
  {
    id: "ATR-005",
    name: "Sheesh Mahal",
    category: "Monument",
    timing: "09:00 AM - 06:00 PM",
    pricing: { adult: 80, child: 40, student: 50, senior: 60, foreigner: 400 },
    hasSeating: false,
    status: "Active",
    image: "/Assets/Attraction/Mahal.jpg",
  },
  {
    id: "ATR-006",
    name: "Fort Entry",
    category: "Fort",
    timing: "10:00 AM - 05:30 PM",
    pricing: { adult: 100, child: 50, student: 60, senior: 75, foreigner: 500 },
    hasSeating: false,
    status: "Active",
    image: "/Assets/Attraction/Fort.jpg",
  },
];

// ─── Mock managers ────────────────────────────────────────────────────────────
export const INITIAL_MANAGERS: ManagerUser[] = [
  {
    id: "MGR-101",
    name: "Rajesh Kumar",
    email: "rajesh.kumar@gmail.com",
    phone: "9876543210",
    attraction: "Toy Train, Ropeway",
    joinedDate: "2024-01-15",
    status: "Active",
    totalBookings: 1420,
    revenueGenerated: 425000,
    attractionManagementEnabled: true,
    staffCreationEnabled: true,
    allowedModules: ["Bookings", "Transactions", "Invoices", "Inventory / Capacity", "Reports", "Staff Management"],
    attractionPermissions: [
      { attractionId: "ATR-001", modules: ["Counter Assignment", "Customer Management", "Complimentary Passes", "User Management", "CCTV Monitoring"] },
      { attractionId: "ATR-002", modules: ["Counter Assignment", "Customer Management", "CCTV Monitoring"] },
    ],
  },
  {
    id: "MGR-102",
    name: "Anita Sharma",
    email: "anita.sharma@gmail.com",
    phone: "9812345678",
    attraction: "Wax Museum",
    joinedDate: "2024-02-10",
    status: "Active",
    totalBookings: 1180,
    revenueGenerated: 380000,
    attractionManagementEnabled: true,
    staffCreationEnabled: true,
    allowedModules: ["Bookings", "Transactions", "Invoices", "Inventory / Capacity", "Reports"],
    attractionPermissions: [
      { attractionId: "ATR-003", modules: ["Counter Assignment", "Customer Management", "Complimentary Passes"] },
    ],
  },
  {
    id: "MGR-103",
    name: "Vikram Mehta",
    email: "vikram.mehta@gmail.com",
    phone: "9988776655",
    attraction: "Sheesh Mahal",
    joinedDate: "2024-03-01",
    status: "Active",
    totalBookings: 950,
    revenueGenerated: 295000,
    attractionManagementEnabled: true,
    staffCreationEnabled: false,
    allowedModules: ["Bookings", "Transactions", "Reports"],
    attractionPermissions: [
      { attractionId: "ATR-005", modules: ["CCTV Monitoring"] },
    ],
  },
  {
    id: "MGR-104",
    name: "Pooja Verma",
    email: "pooja.verma@gmail.com",
    phone: "9765432109",
    attraction: "Biological Park, Fort Entry",
    joinedDate: "2024-04-18",
    status: "Inactive",
    totalBookings: 860,
    revenueGenerated: 240000,
    attractionManagementEnabled: true,
    staffCreationEnabled: true,
    allowedModules: ["Bookings", "Inventory / Capacity", "Reports"],
    attractionPermissions: [
      { attractionId: "ATR-004", modules: ["Counter Assignment", "Complimentary Passes", "User Management"] },
      { attractionId: "ATR-006", modules: ["Customer Management"] },
    ],
  },
  {
    id: "MGR-105",
    name: "Suresh Joshi",
    email: "suresh.joshi@gmail.com",
    phone: "9654321098",
    attraction: "Main Entrance",
    joinedDate: "2024-05-22",
    status: "Inactive",
    totalBookings: 720,
    revenueGenerated: 198000,
    attractionManagementEnabled: false,
    staffCreationEnabled: false,
    allowedModules: ["Bookings", "Transactions"],
    attractionPermissions: [],
  },
  {
    id: "MGR-106",
    name: "Deepak Patel",
    email: "deepak.patel@gmail.com",
    phone: "9543210987",
    attraction: "Main Entrance",
    joinedDate: "2024-06-11",
    status: "Inactive",
    totalBookings: 430,
    revenueGenerated: 115000,
    attractionManagementEnabled: false,
    staffCreationEnabled: false,
    allowedModules: ["Bookings"],
    attractionPermissions: [],
  },
  {
    id: "MGR-107",
    name: "Sunil Saxena",
    email: "sunil.saxena@gmail.com",
    phone: "9432109876",
    attraction: "Toy Train",
    joinedDate: "2024-07-05",
    status: "Inactive",
    totalBookings: 310,
    revenueGenerated: 85000,
    attractionManagementEnabled: false,
    staffCreationEnabled: false,
    allowedModules: ["Bookings"],
    attractionPermissions: [],
  },
];

export const INITIAL_STAFF: StaffUser[] = [
  {
    id: "STF-201",
    name: "Rohan Gupta",
    email: "rohan.g@gmail.com",
    phone: "9123456789",
    role: ["Counter Operator"],
    assignedAttraction: ["Toy Train"],
    joinedDate: "2024-02-01",
    status: "Active",
    ticketsIssued: 3850,
  },
  {
    id: "STF-202",
    name: "Kavita Singh",
    email: "kavita.s@gmail.com",
    phone: "9234567890",
    role: ["Validator"],
    assignedAttraction: ["Ropeway"],
    joinedDate: "2024-02-15",
    status: "Active",
    ticketsIssued: 2940,
  },
  {
    id: "STF-203",
    name: "Amit Trivedi",
    email: "amit.t@gmail.com",
    phone: "9345678901",
    role: ["Counter Operator", "Supervisor"],
    assignedAttraction: ["Wax Museum"],
    joinedDate: "2024-03-10",
    status: "Active",
    ticketsIssued: 2410,
  },
  {
    id: "STF-204",
    name: "Sneha Reddi",
    email: "sneha.r@gmail.com",
    phone: "9456789012",
    role: ["Counter Operator"],
    assignedAttraction: ["Sheesh Mahal"],
    joinedDate: "2024-04-05",
    status: "Inactive",
    ticketsIssued: 1520,
  },
  {
    id: "STF-205",
    name: "Manoj Sen",
    email: "manoj.s@gmail.com",
    phone: "9567890123",
    role: ["Counter Operator"],
    assignedAttraction: ["Fort Entry"],
    joinedDate: "2024-05-12",
    status: "Inactive",
    ticketsIssued: 980,
  },
  {
    id: "STF-206",
    name: "Priya Nair",
    email: "priya.nair@gmail.com",
    phone: "9678901234",
    role: ["Helpdesk"],
    assignedAttraction: ["Wax Museum", "Fort Entry"],
    joinedDate: "2024-06-01",
    status: "Inactive",
    ticketsIssued: 640,
  },
  {
    id: "STF-207",
    name: "Vikas Chawla",
    email: "vikas.chawla@gmail.com",
    phone: "9789012345",
    role: ["Supervisor"],
    assignedAttraction: ["Biological Park"],
    joinedDate: "2024-06-20",
    status: "Inactive",
    ticketsIssued: 410,
  },
];
